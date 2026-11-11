#!/usr/bin/env node
/*
 * MedTech Repair Lab – automatische Prüfungen (ohne Abhängigkeiten)
 *
 *   node tests/check.js
 *
 * 1. index.html bindet alle Inhaltsdateien ein (und nur existierende).
 * 2. Alle Skripte laden fehlerfrei; Registry-Validierung ohne Probleme.
 * 3. Querverweise (Geräte ↔ Ersatzteile ↔ Messgeräte ↔ Wissen ↔ Fälle).
 * 4. Determinismus: alle Fixtures liefern bei gleicher Eingabe gleiche Werte.
 * 5. Erreichbarkeit: jeder in Diagnosebaum, Hypothesen und Funktionsprüfungen
 *    benötigte Befund ist durch Untersuchungen tatsächlich erzeugbar.
 * 6. Musterlösung: jeder Fall lässt sich mit den "richtigen" Antworten
 *    vollständig mit 100 Punkten abschließen.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let failures = 0;
let warnings = 0;
const fail = (m) => {
  failures++;
  console.log('  ✖ ' + m);
};
const warn = (m) => {
  warnings++;
  console.log('  ⚠ ' + m);
};
const ok = (m) => console.log('  ✔ ' + m);

/* ---------- 1. index.html ---------- */
console.log('\n[1] index.html und Dateien');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = Array.from(html.matchAll(/<script src="([^"]+)"><\/script>/g)).map((m) => m[1]);
scripts.forEach((s) => {
  if (!fs.existsSync(path.join(ROOT, s))) fail('Skript fehlt: ' + s);
});
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}
const allJs = walk(path.join(ROOT, 'js')).map((f) => path.relative(ROOT, f).split(path.sep).join('/'));
allJs.forEach((f) => {
  if (!scripts.includes(f)) fail('Datei nicht in index.html eingebunden: ' + f);
});
ok(scripts.length + ' Skripte eingebunden');

/* ---------- 2. Laden ---------- */
console.log('\n[2] Laden und Registry-Validierung');
const sandbox = {
  console: { log() {}, warn() {}, error: console.error },
  setTimeout,
  clearTimeout,
  setInterval: () => 0,
  clearInterval() {},
  requestAnimationFrame: () => 0,
  devicePixelRatio: 1,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.document = {
  readyState: 'loading',
  addEventListener() {},
  getElementById: () => null,
  createElement: () => ({}),
};
vm.createContext(sandbox);
const UI_ONLY = /js\/ui\/(views|case-view|app)\.js$/;
for (const s of scripts) {
  if (UI_ONLY.test(s)) continue;
  try {
    vm.runInContext(fs.readFileSync(path.join(ROOT, s), 'utf8'), sandbox, { filename: s });
  } catch (e) {
    fail(`Fehler beim Laden von ${s}: ${e.message}`);
  }
}
const MTRL = sandbox.MTRL;
if (!MTRL) {
  console.log('MTRL nicht geladen – Abbruch');
  process.exit(1);
}
MTRL.problems.forEach((p) => fail('Validierung: ' + p));
ok(`${MTRL.devices.size} Geräte, ${MTRL.cases.size} Fälle, ${MTRL.instruments.size} Messgeräte, ${MTRL.sandboxes.size} Übungsaufbauten, ${MTRL.parts.size} Ersatzteile, ${MTRL.knowledge.size} Wissensartikel`);

/* ---------- 3. Querverweise ---------- */
console.log('\n[3] Querverweise');
MTRL.devices.forEach((d) => {
  (d.wearParts || []).forEach((p) => {
    if (!MTRL.parts.has(p)) fail(`Gerät ${d.id}: Ersatzteil ${p} existiert nicht`);
  });
  (d.instruments || []).forEach((i) => {
    if (!MTRL.instruments.has(i)) fail(`Gerät ${d.id}: Messgerät ${i} existiert nicht`);
  });
  ['components', 'signalPath', 'faults', 'functionChecks', 'safety'].forEach((k) => {
    if (!Array.isArray(d[k]) || !d[k].length) fail(`Gerät ${d.id}: ${k} leer`);
  });
  (d.faults || []).forEach((f, i) => {
    if (!f.symptom || !Array.isArray(f.causes) || !Array.isArray(f.checks)) fail(`Gerät ${d.id}: Fehlerbild ${i} unvollständig`);
  });
});
MTRL.parts.forEach((p) => {
  if (!Array.isArray(p.devices) || !p.devices.length) fail(`Teil ${p.id}: keine Geräte`);
  (p.devices || []).forEach((d) => {
    if (!MTRL.devices.has(d)) fail(`Teil ${p.id}: Gerät ${d} existiert nicht`);
  });
});
MTRL.knowledge.forEach((a) => {
  (a.related || []).forEach((r) => {
    if (!MTRL.knowledge.has(r)) fail(`Wissen ${a.id}: verwandter Artikel ${r} existiert nicht`);
  });
  (a.sections || []).forEach((s, i) => {
    if (!s.title || !s.html) fail(`Wissen ${a.id}: Abschnitt ${i} unvollständig`);
  });
});
MTRL.sandboxes.forEach((s) => {
  if (!MTRL.instruments.has(s.instrument)) fail(`Übungsaufbau ${s.id}: Messgerät ${s.instrument} existiert nicht`);
});
MTRL.instruments.forEach((i) => {
  if (!Array.from(MTRL.sandboxes.values()).some((s) => s.instrument === i.id)) warn(`Messgerät ${i.id} hat keinen Übungsaufbau`);
});
MTRL.cases.forEach((c) => {
  if (!MTRL.devices.has(c.deviceId)) fail(`Fall ${c.id}: Gerät ${c.deviceId} existiert nicht`);
  c.investigations.forEach((inv) => {
    if (inv.type === 'instrument' && !MTRL.instruments.has(inv.instrument)) fail(`Fall ${c.id}: Messgerät ${inv.instrument} existiert nicht`);
  });
  (c.diagnosis.functionChecks || []).forEach((fc) => {
    if (fc.investigation && !c.investigations.some((i) => i.id === fc.investigation)) fail(`Fall ${c.id}: Funktionsprüfung ${fc.id} verweist auf unbekannte Untersuchung`);
  });
});
if (!failures) ok('Querverweise in Ordnung');

/* ---------- Exerciser: treibt Fixtures wie ein Nutzer ---------- */

function controlCombos(fixture, ctx) {
  const ctrls = fixture.controls || [];
  let combos = [[]];
  ctrls.forEach((c) => {
    const vals = c.type === 'select' ? c.options.map((o) => o.value) : [false, true];
    const next = [];
    combos.forEach((cb) => vals.forEach((v) => next.push(cb.concat([[c, v]]))));
    combos = next;
  });
  if (combos.length > 64) combos = combos.slice(0, 64);
  return combos;
}

function applyCombo(combo, ctx) {
  combo.forEach(([c, v]) => c.set(ctx, v));
}

/** Führt alle sinnvollen Bedienhandlungen an einer Fixture aus. Liefert Signatur (für Determinismus). */
function exercise(instId, fixture, ctx) {
  const sig = [];
  const push = (v) => sig.push(typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : JSON.stringify(v));
  const states = controlCombos(fixture, ctx);
  const base = JSON.parse(JSON.stringify(ctx.state));
  states.forEach((combo) => {
    // Zustand der Fixture-Steuerung zurücksetzen, aber erarbeitete Daten (z. B. Messlisten) behalten
    Object.keys(base).forEach((k) => {
      if (typeof base[k] !== 'object') ctx.state[k] = base[k];
    });
    applyCombo(combo, ctx);
    switch (instId) {
      case 'multimeter': {
        const modes = fixture.modes || ['vdc', 'ohm', 'continuity', 'diode'];
        const pts = fixture.points.map((p) => p.id);
        for (const mode of modes)
          for (const a of pts)
            for (const b of pts) {
              if (a === b) continue;
              for (let tick = 0; tick < 7; tick++) {
                const r = fixture.measure(mode, a, b, ctx, tick);
                if (!r || typeof r.text !== 'string') throw new Error(`Multimeter liefert kein Ergebnis für ${mode} ${a}-${b}`);
                push(r.text + r.unit);
              }
            }
        break;
      }
      case 'oscilloscope': {
        for (const tp of fixture.testpoints) {
          for (let i = 0; i < 200; i++) {
            const v = fixture.sample(tp.id, i * 0.00731, ctx);
            if (typeof v !== 'number' || !isFinite(v)) throw new Error(`Oszilloskop ${tp.id}: ungültiger Wert`);
            push(v);
          }
          if (fixture.onView) fixture.onView({ ch1: tp.id, ch2: '', vdiv1: 1, vdiv2: 1, tdiv: 0.001 }, ctx);
        }
        break;
      }
      case 'patient-simulator': {
        const settingsList = [Object.assign({ spo2: 97, hr: 75, perf: 'normal', resp: 15, temp: 37, nibp: '120/80' }, fixture.defaults || {})];
        (fixture.presets || []).forEach((p) => settingsList.push(Object.assign({}, settingsList[0], p.settings)));
        [85, 90, 97].forEach((v) => settingsList.push(Object.assign({}, settingsList[0], { spo2: v })));
        settingsList.forEach((s) => {
          if (fixture.onSettings) fixture.onSettings(Object.assign({}, s), ctx);
          for (let i = 0; i < 12; i++) {
            const f = fixture.display(s, ctx, i * 0.37);
            if (!f || !Array.isArray(f.values) || !Array.isArray(f.waves)) throw new Error('Simulator-Anzeige ungültig');
            f.values.forEach((v) => push(v.value));
            f.waves.forEach((w) => push(w.fn(i * 0.37)));
            (f.messages || []).forEach((m) => push(m.text));
          }
        });
        break;
      }
      case 'ecg-simulator': {
        ['sinus', 'vf', 'asys', 'cal', 'sine10'].forEach((rh) => {
          [60, 120].forEach((hr) => {
            const s = { rhythm: rh, hr, amp: 1, axis: 60 };
            if (fixture.onSettings) fixture.onSettings(Object.assign({}, s), ctx);
            for (let i = 0; i < 40; i++) {
              const t = i * 0.051;
              const r = fixture.process(MTRL.ecgElectrodes(s, t), s, ctx, t);
              r.leads.forEach((l) => push(l.mv === null ? 'off' : l.mv));
              push(r.hr);
            }
          });
        });
        break;
      }
      case 'safety-analyzer': {
        const r = MTRL.safetyRun(fixture, ctx);
        push(r);
        if (fixture.onResult) fixture.onResult(r, ctx);
        break;
      }
      case 'pressure-meter': {
        const r = MTRL.pressureStatic(fixture, ctx);
        push(r);
        if (fixture.onResult) fixture.onResult('static', r, ctx);
        if (fixture.leak) {
          const l = MTRL.pressureLeak(fixture, ctx);
          push(l);
          if (fixture.onResult) fixture.onResult('leak', l, ctx);
        }
        break;
      }
      case 'flow-analyzer': {
        const variants = [Object.assign({ vt: 500, rate: 12, peep: 5, fio2: 40 }, fixture.defaults || {})];
        variants.push(Object.assign({}, variants[0], { vt: 400, rate: 16, peep: 8, fio2: 60 }));
        (fixture.presets || []).forEach((p) => variants.push(Object.assign({}, variants[0], p.settings)));
        variants.forEach((s) => {
          const m = fixture.measure(s, ctx);
          const chk = MTRL.flowCheck(fixture, s, m);
          push(m);
          if (fixture.onResult) fixture.onResult({ ok: chk.allOk, settings: s, m }, ctx);
        });
        break;
      }
      case 'pump-analyzer': {
        fixture.rates.forEach((rate) => {
          const r = MTRL.pumpFlowRun(fixture, rate, ctx);
          push(r.vol);
          if (fixture.onResult) fixture.onResult('flow', { rate, vol: r.vol, dev: r.dev, ok: r.ok }, ctx);
        });
        if (fixture.occlusion) {
          const o = fixture.occlusion(ctx);
          const okk = MTRL.pumpOcclusionEval(o);
          push(o);
          if (fixture.onResult) fixture.onResult('occlusion', { ok: okk, o }, ctx);
        }
        break;
      }
      default:
        throw new Error('Unbekanntes Messgerät ' + instId);
    }
  });
  return sig.join('|');
}

/* ---------- 4. Determinismus der Übungsaufbauten ---------- */
console.log('\n[4] Übungsaufbauten: Determinismus und Laufzeitfehler');
MTRL.sandboxes.forEach((sb) => {
  try {
    const run = () => {
      const state = sb.createState ? sb.createState() : {};
      const ctx = { state, repaired: false, addFinding: () => false, hasFinding: () => false, save() {}, sandbox: true };
      const fx = typeof sb.fixture === 'function' ? sb.fixture(ctx) : sb.fixture;
      return exercise(sb.instrument, fx, ctx);
    };
    const a = run();
    const b = run();
    if (a !== b) fail(`Übungsaufbau ${sb.id}: nicht deterministisch`);
    else ok(`Übungsaufbau ${sb.id}`);
  } catch (e) {
    fail(`Übungsaufbau ${sb.id}: ${e.message}`);
  }
});

/* ---------- 5./6. Fälle ---------- */
console.log('\n[5] Fälle: Erreichbarkeit der Befunde und Musterlösung');

function runInvestigations(session, phaseFilter) {
  const sigs = [];
  session.def.investigations
    .filter((inv) => phaseFilter((inv.phase || 'diagnose')))
    .forEach((inv) => {
      if (inv.type === 'action') {
        const r = session.runAction(inv);
        sigs.push(r.html || '');
      } else {
        session.spend(inv);
        const ctx = session.context();
        const fx = typeof inv.fixture === 'function' ? inv.fixture(ctx) : inv.fixture;
        sigs.push(exercise(inv.instrument, fx, ctx));
      }
    });
  return sigs.join('#');
}

MTRL.cases.forEach((c) => {
  console.log(`  Fall ${c.id}`);
  try {
    // Speicher im Test nicht persistieren
    MTRL.progress.reset();
    const s1 = new MTRL.CaseSession(c, null);
    const sigA = runInvestigations(s1, (p) => p !== 'verify');
    const s2 = new MTRL.CaseSession(c, null);
    const sigB = runInvestigations(s2, (p) => p !== 'verify');
    if (sigA !== sigB) fail(`${c.id}: Untersuchungen nicht deterministisch`);

    const have = new Set(s1.findings.map((f) => f.id));
    const need = new Set();
    Object.values(c.diagnosis.tree.nodes).forEach((n) => n.answers.filter((a) => a.correct).forEach((a) => (a.requires || []).forEach((r) => need.add(r))));
    c.hypotheses.forEach((h) => (h.evidence || []).forEach((e) => need.add(e)));
    need.forEach((id) => {
      if (!have.has(id)) fail(`${c.id}: benötigter Befund „${id}“ ist durch keine Untersuchung erzeugbar`);
    });
    const minF = c.minFindingsForCauses || 4;
    if (have.size < minF) fail(`${c.id}: nur ${have.size} Befunde erzeugbar, benötigt ${minF}`);
    const defined = MTRL.findingIndex(c);
    defined.forEach((f, id) => {
      if (!have.has(id) && !id.startsWith('fc_')) warn(`${c.id}: Befund „${id}“ wird nie erzeugt`);
    });

    // Musterlösung
    const s = s1;
    if (s.gateMessage('investigate')) fail(`${c.id}: Untersuchung nicht abschließbar: ${s.gateMessage('investigate')}`);
    c.hypotheses.forEach((h) => s.setVerdict(h.id, h.expected));
    const hr = s.checkHypotheses();
    if (!hr.allAnswered || hr.res.some((r) => !r.ok)) fail(`${c.id}: Hypothesenprüfung mit Musterlösung fehlgeschlagen`);
    let guard = 0;
    while (!s.treeDone && guard++ < 50) {
      const nid = s.currentTreeNode();
      const node = c.diagnosis.tree.nodes[nid];
      const idx = node.answers.findIndex((a) => a.correct);
      if (idx < 0) {
        fail(`${c.id}: Knoten ${nid} hat keine richtige Antwort`);
        break;
      }
      const r = s.answerTree(nid, idx);
      if (!r.ok) {
        fail(`${c.id}: Diagnosebaum ${nid}: ${r.message}`);
        break;
      }
    }
    const rc = c.diagnosis.rootCauses.find((r) => r.correct);
    s.chooseRootCause(rc.id);
    const goodActions = c.diagnosis.repairActions.filter((a) => a.verdict === 'correct' || a.verdict === 'good');
    if (!goodActions.some((a) => a.completes)) fail(`${c.id}: keine abschließende Instandsetzungsmaßnahme`);
    goodActions.forEach((a) => s.applyRepair(a.id));
    if (!s.repairDone) fail(`${c.id}: Instandsetzung nicht abgeschlossen`);
    runInvestigations(s, (p) => p === 'verify');
    s.functionChecks().forEach((fc) => {
      if (!s.hasFinding(fc.passFinding)) fail(`${c.id}: Funktionsprüfung ${fc.id} nach Musterlösung nicht bestanden (${fc.passFinding})`);
    });
    if (s.gateMessage('diagnosis')) fail(`${c.id}: Diagnose-Schritt nicht abschließbar: ${s.gateMessage('diagnosis')}`);
    c.documentation.fields.forEach((f) => {
      if (f.type === 'select' || f.type === 'multi') {
        const vals = f.options.map((o) => o.value);
        const corr = f.type === 'multi' ? f.correct : [f.correct];
        corr.forEach((v) => {
          if (!vals.includes(v)) fail(`${c.id}: Dokumentationsfeld ${f.id}: richtige Option ${v} fehlt`);
        });
        s.setDoc(f.id, f.correct);
      } else s.setDoc(f.id, 'Musterlösung Test-Eintrag');
    });
    const dr = s.checkDoc();
    if (dr.some((r) => !r.ok)) fail(`${c.id}: Dokumentation mit Musterlösung fehlerhaft`);
    c.quiz.forEach((q, i) => s.answerQuiz(i, q.correct));
    s.checkQuiz();
    const sc = s.score();
    if (sc.total !== 100) fail(`${c.id}: Musterlösung ergibt ${sc.total}/100 Punkte (${sc.parts.map((p) => p.label + ' ' + p.pts).join(', ')})`);
    else ok(`${c.id}: ${have.size} Befunde erzeugbar, Musterlösung 100/100`);

    // Falsche Antworten werden abgelehnt
    const s3 = new MTRL.CaseSession(c, null);
    const n0 = c.diagnosis.tree.nodes[c.diagnosis.tree.start];
    const wrong = n0.answers.findIndex((a) => !a.correct);
    if (wrong >= 0 && s3.answerTree(c.diagnosis.tree.start, wrong).ok) fail(`${c.id}: falsche Antwort im Diagnosebaum wurde akzeptiert`);
    const right = n0.answers.findIndex((a) => a.correct);
    if ((n0.answers[right].requires || []).length && s3.answerTree(c.diagnosis.tree.start, right).ok) fail(`${c.id}: Antwort ohne Befund wurde akzeptiert`);
  } catch (e) {
    fail(`${c.id}: Ausnahme ${e.stack}`);
  }
});

/* ---------- Fall-spezifische Physik-Prüfungen (Referenzfall) ---------- */
console.log('\n[6] Referenzfall: physikalische Plausibilität');
if (MTRL.__test && MTRL.__test.pmSpo2) {
  const T = MTRL.__test.pmSpo2;
  const near = (a, b, tol, m) => (Math.abs(a - b) <= tol ? ok(m) : fail(`${m}: ${a} ≠ ${b}`));
  near(T.adapterNet('original', false, 0).resistance('A-S1', 'A-M1'), 0.32, 1e-6, 'Ader 1 Durchgang 0,32 Ω');
  const r3 = T.adapterNet('original', false, 0).resistance('A-S3', 'A-M3');
  r3 === Infinity ? ok('Ader 3 im Originalkabel offen (OL)') : fail('Ader 3 sollte offen sein');
  near(T.adapterNet('test', false, 0).resistance('A-S3', 'A-M3'), 0.47, 1e-6, 'Ader 3 im Testkabel durchgängig');
  const sn = T.sensorNet();
  near(sn.diodeTest('S-P1', 'S-P2'), 1.72 + 1.1e-3, 1e-3, 'Diodentest rote LED ≈ 1,72 V');
  near(sn.diodeTest('S-P2', 'S-P1'), 1.18 + 1.1e-3, 1e-3, 'Diodentest IR-LED ≈ 1,18 V');
  sn.diodeTest('S-P4', 'S-P3') === Infinity ? ok('Photodiode in Sperrrichtung OL') : fail('Photodiode Sperrrichtung');
  near(sn.resistance('S-P6', 'S-P7'), 6811.1, 0.01, 'Kodierwiderstand 6,81 kΩ (+ Leitungen)');
  const n2 = new MTRL.Netlist().R('a', 'b', 100).R('a', 'b', 100);
  near(n2.resistance('a', 'b'), 50, 1e-9, 'Netzwerk-Solver: Parallelschaltung 100 Ω ∥ 100 Ω = 50 Ω');
}

console.log(`\nErgebnis: ${failures} Fehler, ${warnings} Warnungen\n`);
process.exit(failures ? 1 : 0);
