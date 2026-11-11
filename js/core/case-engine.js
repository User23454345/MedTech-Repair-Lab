/*
 * MedTech Repair Lab – Fall-Engine
 * ------------------------------------------------------------
 * Verwaltet den Ablauf eines Reparaturfalls: Simulationszustand,
 * Befundprotokoll, Hypothesen, Diagnosebaum, Instandsetzung,
 * Funktionsprüfungen, Dokumentation, Abschlusstest und Bewertung.
 *
 * Fehlerfälle sind vollständig deterministisch: Der Zustand
 * (state) ist ein serialisierbares Objekt; alle Messwerte werden
 * aus diesem Zustand berechnet. Gleicher Zustand → gleiches Ergebnis.
 */
(function (g) {
  'use strict';
  const MTRL = g.MTRL;

  class CaseSession {
    constructor(def, saved) {
      this.def = def;
      const s = saved || {};
      this.state = s.state || def.createState();
      this.findings = s.findings || []; // [{id, order, minute, source}]
      this.log = s.log || []; // freie Protokolleinträge [{minute, text}]
      this.minutes = s.minutes || 0;
      this.investigationsRun = s.investigationsRun || {}; // id -> Anzahl
      this.stepIndex = s.stepIndex || 0;
      this.maxStep = s.maxStep || 0;
      this.hypothesisVerdicts = s.hypothesisVerdicts || {}; // id -> 'confirmed'|'excluded'|'open'
      this.hypothesesChecked = s.hypothesesChecked || false;
      this.hypFirstScore = typeof s.hypFirstScore === 'number' ? s.hypFirstScore : null;
      this.treePath = s.treePath || []; // [{node, answer}]
      this.treeDone = s.treeDone || false;
      this.rootCauseAttempts = s.rootCauseAttempts || [];
      this.rootCauseSolved = s.rootCauseSolved || false;
      this.repairActions = s.repairActions || []; // gewählte Aktions-IDs (Reihenfolge)
      this.repairDone = s.repairDone || false;
      this.doc = s.doc || {};
      this.docChecked = s.docChecked || false;
      this.docAttempts = s.docAttempts || 0;
      this.quizAnswers = s.quizAnswers || {};
      this.quizChecked = s.quizChecked || false;
      this.completed = s.completed || false;
      this.listeners = [];
    }

    /* ---------- Persistenz ---------- */
    serialize() {
      return {
        state: this.state,
        findings: this.findings,
        log: this.log,
        minutes: this.minutes,
        investigationsRun: this.investigationsRun,
        stepIndex: this.stepIndex,
        maxStep: this.maxStep,
        hypothesisVerdicts: this.hypothesisVerdicts,
        hypothesesChecked: this.hypothesesChecked,
        hypFirstScore: this.hypFirstScore,
        treePath: this.treePath,
        treeDone: this.treeDone,
        rootCauseAttempts: this.rootCauseAttempts,
        rootCauseSolved: this.rootCauseSolved,
        repairActions: this.repairActions,
        repairDone: this.repairDone,
        doc: this.doc,
        docChecked: this.docChecked,
        docAttempts: this.docAttempts,
        quizAnswers: this.quizAnswers,
        quizChecked: this.quizChecked,
        completed: this.completed,
        score: this.score(),
      };
    }
    save() {
      MTRL.progress.setCase(this.def.id, this.serialize());
      this.listeners.forEach((fn) => fn(this));
    }
    onChange(fn) {
      this.listeners.push(fn);
    }

    /* ---------- Befunde ---------- */
    hasFinding(id) {
      return this.findings.some((f) => f.id === id);
    }
    addFinding(id, source) {
      if (this.hasFinding(id)) return false;
      const def = MTRL.findingIndex(this.def).get(id);
      if (!def) {
        if (g.console) g.console.warn('Unbekannter Befund: ' + id);
        return false;
      }
      this.findings.push({ id, order: this.findings.length + 1, minute: this.minutes, source: source || '' });
      this.save();
      return true;
    }
    findingText(id) {
      const f = MTRL.findingIndex(this.def).get(id);
      return f ? f.text : id;
    }
    addLog(text) {
      this.log.push({ minute: this.minutes, text });
    }

    /* ---------- Untersuchungen ---------- */
    availableInvestigations() {
      return this.def.investigations.filter((inv) => {
        const phase = inv.phase || 'diagnose';
        if (phase === 'verify') return this.repairDone;
        return true;
      });
    }
    /** Führt eine Aktions-Untersuchung aus und gibt {html, findings} zurück. */
    runAction(inv) {
      const ctx = this.context();
      const res = inv.run(ctx) || {};
      this.spend(inv, res);
      (res.findings || []).forEach((f) => this.addFinding(f, inv.title));
      this.save();
      return res;
    }
    spend(inv) {
      const first = !this.investigationsRun[inv.id];
      this.investigationsRun[inv.id] = (this.investigationsRun[inv.id] || 0) + 1;
      if (first) {
        this.minutes += inv.minutes || 5;
        this.addLog(`${inv.title}`);
      }
    }
    /** Kontextobjekt für Fixtures und Aktionen. */
    context() {
      const self = this;
      return {
        state: this.state,
        repaired: this.repairDone,
        addFinding: (id, src) => self.addFinding(id, src),
        hasFinding: (id) => self.hasFinding(id),
        save: () => self.save(),
        session: self,
      };
    }

    /* ---------- Schritte ---------- */
    stepAllowed(i) {
      return i <= this.maxStep;
    }
    goStep(i) {
      if (!this.stepAllowed(i)) return false;
      this.stepIndex = i;
      this.save();
      return true;
    }
    unlockNext() {
      this.maxStep = Math.max(this.maxStep, this.stepIndex + 1);
      this.stepIndex = Math.min(this.stepIndex + 1, MTRL.CASE_STEPS.length - 1);
      this.save();
    }
    /** Voraussetzungen, um den aktuellen Schritt zu verlassen. */
    gateMessage(stepId) {
      const d = this.def;
      switch (stepId) {
        case 'investigate': {
          const need = d.minFindingsForCauses || 4;
          if (this.findings.length < need) return `Sammle mindestens ${need} Befunde, bevor du die Ursachen bewertest (aktuell ${this.findings.length}).`;
          return null;
        }
        case 'causes':
          return this.hypothesesChecked ? null : 'Bewerte alle möglichen Ursachen und prüfe deine Einschätzung.';
        case 'diagnosis':
          if (!this.treeDone) return 'Durchlaufe zuerst den Diagnosebaum.';
          if (!this.rootCauseSolved) return 'Bestimme die technische Grundursache.';
          if (!this.repairDone) return 'Lege die Instandsetzungsmaßnahme fest.';
          if (!this.functionChecksPassed()) return 'Führe alle Funktionsprüfungen nach der Instandsetzung durch.';
          return null;
        case 'documentation':
          return this.docChecked ? null : 'Vervollständige und prüfe den Instandsetzungsbericht.';
        default:
          return null;
      }
    }

    /* ---------- Hypothesen ---------- */
    setVerdict(hid, v) {
      this.hypothesisVerdicts[hid] = v;
      this.hypothesesChecked = false;
      this.save();
    }
    checkHypotheses() {
      const res = this.def.hypotheses.map((h) => {
        const given = this.hypothesisVerdicts[h.id] || 'open';
        const ok = given === h.expected;
        const missing = (h.evidence || []).filter((e) => !this.hasFinding(e));
        return { h, given, ok, missing };
      });
      const allAnswered = res.every((r) => r.given !== 'open');
      if (allAnswered) {
        this.hypothesesChecked = true;
        if (this.hypFirstScore === null) this.hypFirstScore = this.hypothesisScore();
        this.hypothesisResult = res;
        this.save();
      }
      return { res, allAnswered };
    }
    hypothesisScore() {
      const hs = this.def.hypotheses;
      if (!hs.length) return 1;
      return hs.filter((h) => this.hypothesisVerdicts[h.id] === h.expected).length / hs.length;
    }

    /* ---------- Diagnosebaum ---------- */
    currentTreeNode() {
      const tree = this.def.diagnosis.tree;
      if (this.treeDone) return null;
      if (!this.treePath.length) return tree.start;
      const last = this.treePath[this.treePath.length - 1];
      const node = tree.nodes[last.node];
      const ans = node.answers[last.answer];
      return ans.next || null;
    }
    /**
     * Antwort im Diagnosebaum geben. Liefert {ok, message}.
     * Eine Antwort wird nur akzeptiert, wenn sie fachlich zum Befund passt
     * (correct) und die dafür nötigen Befunde erhoben wurden (requires).
     */
    answerTree(nodeId, answerIndex) {
      const node = this.def.diagnosis.tree.nodes[nodeId];
      const ans = node.answers[answerIndex];
      const missing = (ans.requires || []).filter((r) => !this.hasFinding(r));
      if (!ans.correct) {
        return { ok: false, message: ans.feedback || 'Diese Antwort passt nicht zu den erhobenen Befunden.' };
      }
      if (missing.length) {
        return {
          ok: false,
          missing,
          message: 'Die Antwort ist plausibel, aber noch nicht belegt. Es fehlt: ' + missing.map((m) => '„' + this.findingText(m) + '“').join(', '),
        };
      }
      this.treePath.push({ node: nodeId, answer: answerIndex });
      if (!ans.next) this.treeDone = true;
      this.save();
      return { ok: true, message: ans.feedback || '' };
    }
    resetTree() {
      this.treePath = [];
      this.treeDone = false;
      this.save();
    }

    /* ---------- Grundursache ---------- */
    chooseRootCause(id) {
      const rc = this.def.diagnosis.rootCauses.find((r) => r.id === id);
      if (this.rootCauseSolved) return { ok: true, rc };
      this.rootCauseAttempts.push(id);
      if (rc.correct) this.rootCauseSolved = true;
      this.save();
      return { ok: !!rc.correct, rc };
    }

    /* ---------- Instandsetzung ---------- */
    applyRepair(actionId) {
      const a = this.def.diagnosis.repairActions.find((x) => x.id === actionId);
      if (!a || this.repairActions.includes(actionId)) return a;
      this.repairActions.push(actionId);
      this.minutes += a.minutes || 5;
      this.addLog('Maßnahme: ' + a.text);
      if (typeof a.apply === 'function') a.apply(this.state);
      if (a.completes) this.repairDone = true;
      this.save();
      return a;
    }
    repairScore() {
      const acts = this.def.diagnosis.repairActions;
      let s = 1;
      this.repairActions.forEach((id) => {
        const a = acts.find((x) => x.id === id);
        if (a && a.verdict === 'wrong') s -= 0.34;
      });
      return Math.max(0, s);
    }
    functionChecks() {
      return this.def.diagnosis.functionChecks || [];
    }
    functionChecksPassed() {
      return this.functionChecks().every((fc) => this.hasFinding(fc.passFinding));
    }

    /* ---------- Dokumentation ---------- */
    setDoc(field, value) {
      this.doc[field] = value;
      this.docChecked = false;
      this.save();
    }
    checkDoc() {
      const res = this.def.documentation.fields.map((f) => {
        const v = this.doc[f.id];
        let ok = true;
        let msg = '';
        if (f.type === 'select') {
          ok = v === f.correct;
          msg = ok ? '' : f.hint || 'Bitte prüfen.';
        } else if (f.type === 'multi') {
          // optional: Werte, die je nach gewähltem Untersuchungsweg zutreffen können (z. B. optional genutzte Messgeräte)
          const sel = new Set(v || []);
          const need = new Set(f.correct || []);
          const allowed = new Set([...(f.correct || []), ...(f.optional || [])]);
          ok = [...need].every((x) => sel.has(x)) && [...sel].every((x) => allowed.has(x));
          msg = ok ? '' : f.hint || 'Auswahl unvollständig oder fehlerhaft.';
        } else if (f.type === 'text') {
          ok = !f.required || (typeof v === 'string' && v.trim().length >= (f.minLength || 3));
          msg = ok ? '' : 'Bitte ausfüllen.';
        }
        return { f, ok, msg };
      });
      const okCount = res.filter((r) => r.ok).length;
      this.docScore = okCount / res.length;
      if (res.every((r) => r.ok)) {
        this.docChecked = true;
        this.minutes += 10;
      }
      this.docAttempts = (this.docAttempts || 0) + 1;
      this.save();
      return res;
    }

    /* ---------- Abschlusstest ---------- */
    answerQuiz(qi, oi) {
      if (this.quizChecked) return;
      this.quizAnswers[qi] = oi;
      this.save();
    }
    checkQuiz() {
      this.quizChecked = true;
      this.completed = true;
      this.save();
      return this.quizScore();
    }
    quizScore() {
      const qs = this.def.quiz;
      return qs.filter((q, i) => this.quizAnswers[i] === q.correct).length / qs.length;
    }

    /* ---------- Bewertung ---------- */
    score() {
      const parts = [];
      const rcWrong = this.rootCauseAttempts.filter((id) => {
        const rc = this.def.diagnosis.rootCauses.find((r) => r.id === id);
        return rc && !rc.correct;
      }).length;
      parts.push({ label: 'Ursachenbewertung', max: 20, pts: this.hypFirstScore !== null ? Math.round(20 * this.hypFirstScore) : 0 });
      parts.push({ label: 'Diagnose (Grundursache)', max: 30, pts: this.rootCauseSolved ? Math.max(0, 30 - rcWrong * 10) : 0 });
      parts.push({ label: 'Instandsetzung ohne Tausch auf Verdacht', max: 15, pts: this.repairDone ? Math.round(15 * this.repairScore()) : 0 });
      parts.push({ label: 'Funktionsprüfungen', max: 10, pts: this.functionChecksPassed() && this.repairDone ? 10 : 0 });
      parts.push({ label: 'Dokumentation', max: 10, pts: this.docChecked ? Math.max(5, 10 - ((this.docAttempts || 1) - 1) * 2) : 0 });
      parts.push({ label: 'Abschlusstest', max: 15, pts: this.quizChecked ? Math.round(15 * this.quizScore()) : 0 });
      const total = parts.reduce((s, p) => s + p.pts, 0);
      return { parts, total, max: 100 };
    }
  }

  MTRL.CaseSession = CaseSession;

  MTRL.openCase = function (id, fresh) {
    const def = MTRL.cases.get(id);
    if (!def) return null;
    const saved = fresh ? null : MTRL.progress.getCase(id);
    return new CaseSession(def, saved);
  };
})(typeof window !== 'undefined' ? window : globalThis);
