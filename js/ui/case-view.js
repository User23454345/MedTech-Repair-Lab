/*
 * MedTech Repair Lab – Ansicht eines Reparaturfalls (9 Lernschritte)
 */
(function (g) {
  'use strict';
  const MTRL = g.MTRL;
  const { h, clear } = MTRL.dom;
  const fmt = MTRL.util.fmt;

  MTRL.views.caseView = function (id) {
    const session = MTRL.openCase(id);
    if (!session) return h('div.panel', h('h2', 'Fall nicht gefunden'), h('a.btn', { href: '#/faelle' }, 'Zur Übersicht'));
    const def = session.def;
    const device = MTRL.devices.get(def.deviceId);

    const stepper = h('ol.stepper');
    const content = h('div.case-content');
    const sidebar = h('aside.case-side');
    const header = h('div.case-head');
    const root = h('div.case', { dataset: { title: def.title } }, header, stepper, h('div.case-layout', content, sidebar));

    let lastFindingCount = session.findings.length;
    let sideTimer = null;
    session.onChange(() => {
      if (session.findings.length > lastFindingCount) {
        const nf = session.findings.slice(lastFindingCount);
        nf.forEach((f) => MTRL.dom.toast('🧾 Neuer Befund: ' + session.findingText(f.id), 'ok'));
        lastFindingCount = session.findings.length;
      }
      clearTimeout(sideTimer);
      sideTimer = setTimeout(() => {
        renderSidebar();
        renderHeader();
      }, 60);
    });

    function renderHeader() {
      clear(header);
      const sc = session.score();
      header.appendChild(h('a.back', { href: '#/faelle' }, '← Reparaturfälle'));
      header.appendChild(
        h('div.case-title-row',
          h('div', h('div.case-device', (device ? device.icon + ' ' + device.name : def.deviceId) + ' · Servicefall'), h('h1', def.title)),
          h('div.case-meters',
            h('div.meter', h('span', 'Servicezeit'), h('b', fmt(session.minutes, 0) + ' min')),
            h('div.meter', h('span', 'Befunde'), h('b', String(session.findings.length))),
            h('div.meter', h('span', 'Punkte'), h('b', sc.total + ' / 100'))
          )
        )
      );
    }

    function renderStepper() {
      clear(stepper);
      MTRL.CASE_STEPS.forEach((s, i) => {
        const allowed = session.stepAllowed(i);
        const cls = (i === session.stepIndex ? 'current ' : '') + (i < session.maxStep ? 'done ' : '') + (allowed ? '' : 'locked');
        stepper.appendChild(
          h('li', { class: cls },
            h('button', { type: 'button', disabled: !allowed, 'aria-current': i === session.stepIndex ? 'step' : null, on: { click: () => { if (session.goStep(i)) render(); } } },
              h('span.n', String(i + 1)), h('span.t', s.title)))
        );
      });
    }

    function renderSidebar() {
      clear(sidebar);
      const showLog = session.stepIndex >= 3;
      sidebar.appendChild(
        h('div.panel.log-panel',
          h('h3', '🧾 Befundprotokoll'),
          !showLog ? h('p.muted', 'Befunde erscheinen hier, sobald du mit der Untersuchung beginnst.') : null,
          showLog && !session.findings.length ? h('p.muted', 'Noch keine Befunde. Wähle eine Untersuchung.') : null,
          showLog ? h('ol.findings', session.findings.map((f) => {
            const fd = MTRL.findingIndex(def).get(f.id);
            return h('li', h('span.f-cat', fd ? fd.cat : ''), h('span.f-text', session.findingText(f.id)));
          })) : null
        )
      );
      if (session.stepIndex >= 5) {
        const sc = session.score();
        sidebar.appendChild(h('div.panel', h('h3', 'Bewertung'), h('table.plain.small', h('tbody', sc.parts.map((p) => h('tr', h('td', p.label), h('td.mono', p.pts + '/' + p.max)))))));
      }
      sidebar.appendChild(MTRL.ui.disclaimer(true));
    }

    function nav(stepId) {
      const msg = session.gateMessage(stepId);
      const last = session.stepIndex === MTRL.CASE_STEPS.length - 1;
      return h('div.step-nav',
        session.stepIndex > 0 ? h('button.btn', { type: 'button', on: { click: () => { session.goStep(session.stepIndex - 1); render(); } } }, '← Zurück') : h('span'),
        msg ? h('span.gate', '🔒 ' + msg) : h('span'),
        !last ? h('button.btn.primary', { type: 'button', disabled: !!msg, on: { click: () => { session.unlockNext(); render(); g.scrollTo({ top: root.offsetTop - 10, behavior: 'smooth' }); } } }, 'Weiter: ' + MTRL.CASE_STEPS[session.stepIndex + 1].title + ' →') : h('span')
      );
    }

    /* ---------- Schritt-Renderer ---------- */
    const STEP = {};

    STEP.situation = () => {
      const t = def.situation.ticket;
      return h('div',
        h('h2', '1 · Ausgangssituation'),
        h('div.ticket',
          h('div.ticket-head', '📋 Instandsetzungsauftrag'),
          h('table.plain', h('tbody', Object.entries(t).map(([k, v]) => h('tr', h('th', k), h('td', v)))))
        ),
        h('div.prose', { html: def.situation.html }),
        def.situation.checklist ? h('div.panel', h('h3', 'Eingangsprüfung des Auftrags'), h('ul.checklist.done', def.situation.checklist.map((c) => h('li', c)))) : null,
        nav('situation')
      );
    };

    STEP.symptom = () => {
      const monHost = h('div.symptom-monitor');
      const el = h('div',
        h('h2', '2 · Fehlerbeschreibung'),
        h('div.prose', { html: def.symptom.html }),
        monHost,
        def.symptom.observations ? h('div.panel', h('h3', 'Erste Beobachtungen'), h('ul', def.symptom.observations.map((o) => h('li', o)))) : null,
        nav('symptom')
      );
      if (def.symptom.display) {
        setTimeout(() => MTRL.ui.monitorDisplay(monHost, (t) => def.symptom.display(session.state, t), { title: def.symptom.displayTitle || 'Anzeige am Gerät (Fehlerbild)' }), 0);
      } else if (def.symptom.render) {
        setTimeout(() => def.symptom.render(monHost, session.context()), 0);
      }
      return el;
    };

    STEP.basics = () =>
      h('div',
        h('h2', '3 · Technische Grundlagen'),
        h('p.lead', 'Diese Grundlagen brauchst du, um Befunde richtig zu deuten. Du kannst jederzeit hierher zurückkehren.'),
        def.basics.map((b, i) => h('details.basic', { open: i === 0 }, h('summary', b.title), h('div.prose', { html: b.html }))),
        device ? h('p', 'Mehr zum Gerät: ', h('a', { href: '#/geraete/' + device.id }, device.name + ' in der Gerätebibliothek')) : null,
        nav('basics')
      );

    let bench = null; // aktuell geöffnete Untersuchung
    function openInvestigation(inv, host) {
      clear(host);
      bench = inv.id;
      const head = h('div.bench-head', h('h3', (inv.icon || '') + ' ' + inv.title), h('button.btn.small', { type: 'button', on: { click: () => { clear(host); bench = null; } } }, 'Schließen'));
      host.appendChild(head);
      if (inv.type === 'action') {
        const res = session.runAction(inv);
        host.appendChild(h('div.bench-result.prose', { html: res.html || '' }));
      } else {
        session.spend(inv);
        session.save();
        const inst = MTRL.instruments.get(inv.instrument);
        const fx = typeof inv.fixture === 'function' ? inv.fixture(session.context()) : inv.fixture;
        const wrap = h('div.bench-instrument');
        host.appendChild(wrap);
        inst.render(wrap, fx, session.context());
      }
      host.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function investigationGrid(list, host) {
      const cats = new Map();
      list.forEach((inv) => {
        const c = inv.category || 'Untersuchung';
        if (!cats.has(c)) cats.set(c, []);
        cats.get(c).push(inv);
      });
      return h('div.inv-grid', list.map((inv) => {
        const runs = session.investigationsRun[inv.id] || 0;
        return h('button.inv-card' + (runs ? '.done' : ''), { type: 'button', on: { click: () => openInvestigation(inv, host) } },
          h('span.inv-icon', { 'aria-hidden': 'true' }, inv.icon || '🔧'),
          h('span.inv-body', h('b', inv.title), h('small', inv.desc || ''), h('span.inv-meta', (inv.category || '') + ' · ' + (inv.minutes || 5) + ' min' + (inv.type === 'instrument' ? ' · ' + MTRL.instruments.get(inv.instrument).name : ''))),
          runs ? h('span.inv-check', { 'aria-label': 'durchgeführt' }, '✓') : null
        );
      }));
    }

    STEP.investigate = () => {
      const host = h('div.bench');
      const list = def.investigations.filter((i) => (i.phase || 'diagnose') !== 'verify');
      const grid = investigationGrid(list, host);
      session.onChange(() => {
        if (!grid.isConnected) return;
        // Häkchen aktualisieren, ohne die Werkbank neu aufzubauen
        grid.querySelectorAll('.inv-card').forEach((b, i) => b.classList.toggle('done', !!session.investigationsRun[list[i].id]));
      });
      return h('div',
        h('h2', '4 · Untersuchung'),
        h('p.lead', 'Wähle Untersuchungen und Messungen. Jede Untersuchung kostet Servicezeit – gehe systematisch vor: vom Einfachen zum Aufwendigen, von der Anamnese zur Messung. Befunde werden automatisch protokolliert.'),
        grid,
        host,
        nav('investigate')
      );
    };

    STEP.causes = () => {
      const rows = h('div.hyp-list');
      const result = h('div');
      const labels = { confirmed: 'bestätigt', open: 'offen', excluded: 'ausgeschlossen' };
      function draw(feedback) {
        clear(rows);
        def.hypotheses.forEach((hy) => {
          const fb = feedback && feedback.find((r) => r.h.id === hy.id);
          rows.appendChild(
            h('div.hyp' + (fb ? (fb.ok ? '.ok' : '.bad') : ''),
              h('div.hyp-text', hy.text),
              MTRL.dom.segmented(
                ['confirmed', 'open', 'excluded'].map((v) => ({ value: v, label: labels[v] })),
                session.hypothesisVerdicts[hy.id] || 'open',
                (v) => { session.setVerdict(hy.id, v); }
              ),
              fb ? h('div.hyp-fb',
                h('b', fb.ok ? '✔ Richtig. ' : '✖ Nicht zutreffend – erwartet: ' + labels[hy.expected] + '. '),
                hy.explain,
                fb.missing.length ? h('div.muted', 'Belegende Befunde, die du noch nicht erhoben hast: ' + fb.missing.map((m) => '„' + session.findingText(m) + '“').join(', ')) : null
              ) : null
            )
          );
        });
      }
      draw(session.hypothesesChecked ? session.checkHypotheses().res : null);
      const checkBtn = h('button.btn.primary', { type: 'button', on: { click: () => {
        const r = session.checkHypotheses();
        if (!r.allAnswered) {
          MTRL.dom.toast('Bitte jede mögliche Ursache als „bestätigt“ oder „ausgeschlossen“ bewerten.', 'warn');
          return;
        }
        draw(r.res);
        const okN = r.res.filter((x) => x.ok).length;
        clear(result);
        result.appendChild(h('div.callout.' + (okN === r.res.length ? 'ok' : 'info'), `${okN} von ${r.res.length} Ursachen richtig bewertet.` + (session.hypFirstScore !== null ? ' (Für die Punktwertung zählt die erste vollständige Bewertung.)' : '')));
        render();
      } } }, 'Einschätzung prüfen');
      return h('div',
        h('h2', '5 · Mögliche Ursachen'),
        h('p.lead', 'Bewerte jede mögliche Ursache anhand deiner Befunde: Ist sie durch Befunde bestätigt oder ausgeschlossen? Fehlen dir Belege, kehre zur Untersuchung zurück.'),
        rows, h('div.row-actions', checkBtn), result,
        nav('causes')
      );
    };

    STEP.diagnosis = () => {
      const el = h('div', h('h2', '6 · Diagnose'));
      // a) Diagnosebaum
      const tree = def.diagnosis.tree;
      const treeBox = h('div.panel.tree');
      treeBox.appendChild(h('h3', 'a) Diagnosebaum'));
      const path = h('ol.tree-path');
      session.treePath.forEach((p) => {
        const n = tree.nodes[p.node];
        path.appendChild(h('li', h('span.q', n.question), h('span.a', '→ ' + n.answers[p.answer].label)));
      });
      treeBox.appendChild(path);
      const cur = session.currentTreeNode();
      const fb = h('div.tree-fb', { 'aria-live': 'polite' });
      if (cur) {
        const n = tree.nodes[cur];
        treeBox.appendChild(h('div.tree-q', h('b', n.question), n.help ? h('p.muted', n.help) : null,
          h('div.tree-answers', n.answers.map((a, i) => h('button.btn', { type: 'button', on: { click: () => {
            const r = session.answerTree(cur, i);
            if (r.ok) render();
            else {
              clear(fb);
              fb.appendChild(h('div.callout.' + (r.missing ? 'info' : 'bad'), r.message, r.missing ? h('div', h('button.btn.small', { type: 'button', on: { click: () => { session.goStep(3); render(); } } }, '→ zur Untersuchung')) : null));
            }
          } } }, a.label)))));
        treeBox.appendChild(fb);
      } else {
        treeBox.appendChild(h('div.callout.ok', '✔ Diagnosebaum vollständig durchlaufen. ', h('button.btn.small', { type: 'button', on: { click: () => { session.resetTree(); render(); } } }, 'Erneut durchlaufen')));
      }
      el.appendChild(treeBox);

      // b) Grundursache
      if (session.treeDone) {
        const rcBox = h('div.panel', h('h3', 'b) Technische Grundursache bestimmen'));
        const rcFb = h('div');
        def.diagnosis.rootCauses.forEach((rc) => {
          const tried = session.rootCauseAttempts.includes(rc.id);
          rcBox.appendChild(h('button.choice' + (tried ? (rc.correct ? '.ok' : '.bad') : ''), { type: 'button', disabled: session.rootCauseSolved && !rc.correct ? true : null, on: { click: () => {
            const r = session.chooseRootCause(rc.id);
            if (r.ok) render();
            else {
              clear(rcFb);
              rcFb.appendChild(h('div.callout.bad', r.rc.feedback));
              renderHeader();
              setTimeout(() => render(), 1600);
            }
          } } }, rc.text, tried ? h('small', rc.feedback) : null));
        });
        rcBox.appendChild(rcFb);
        el.appendChild(rcBox);
      }

      // c) Instandsetzung
      if (session.rootCauseSolved) {
        const raBox = h('div.panel', h('h3', 'c) Instandsetzungsmaßnahmen festlegen'), h('p.muted', 'Wähle die Maßnahmen, die du durchführen würdest. Achtung: „Tausch auf Verdacht“ und unzulässige Eingriffe kosten Punkte.'));
        def.diagnosis.repairActions.forEach((a) => {
          const done = session.repairActions.includes(a.id);
          const cls = done ? (a.verdict === 'wrong' ? '.bad' : a.verdict === 'neutral' ? '.neutral' : '.ok') : '';
          raBox.appendChild(h('button.choice' + cls, { type: 'button', disabled: done ? true : null, on: { click: () => { session.applyRepair(a.id); render(); } } }, a.text, done ? h('small', a.feedback) : null));
        });
        el.appendChild(raBox);
      }

      // d) Funktionsprüfungen
      if (session.repairDone) {
        const fcBox = h('div.panel', h('h3', 'd) Funktionsprüfungen nach der Instandsetzung'), h('p.muted', 'Ein Gerät darf erst nach bestandenen Prüfungen freigegeben werden.'));
        const host = h('div.bench');
        session.functionChecks().forEach((fc) => {
          const ok = session.hasFinding(fc.passFinding);
          const inv = def.investigations.find((i) => i.id === fc.investigation);
          fcBox.appendChild(h('div.fc-item' + (ok ? '.ok' : ''),
            h('span.fc-state', ok ? '✔' : '○'),
            h('span.fc-title', fc.title),
            inv ? h('button.btn.small', { type: 'button', on: { click: () => openInvestigation(inv, host) } }, ok ? 'erneut öffnen' : 'Prüfung durchführen') : null));
        });
        fcBox.appendChild(host);
        el.appendChild(fcBox);
      }
      el.appendChild(nav('diagnosis'));
      return el;
    };

    STEP.explanation = () =>
      h('div',
        h('h2', '7 · Erklärung'),
        h('div.prose', { html: def.explanation.html }),
        h('div.panel', h('h3', 'Dein Diagnoseweg'), h('ol.findings', session.findings.map((f) => h('li', h('span.f-text', session.findingText(f.id)), h('span.muted', ' · ' + f.source))))),
        nav('explanation')
      );

    STEP.documentation = () => {
      const D = def.documentation;
      const form = h('div.doc-form');
      const out = h('div');
      D.fields.forEach((f) => {
        let input;
        if (f.type === 'select') {
          input = h('div.radio-list', f.options.map((o) => h('label.radio', h('input', { type: 'radio', name: 'doc-' + f.id, value: o.value, checked: session.doc[f.id] === o.value, on: { change: () => session.setDoc(f.id, o.value) } }), h('span', o.label))));
        } else if (f.type === 'multi') {
          input = h('div.radio-list', f.options.map((o) => h('label.radio', h('input', { type: 'checkbox', value: o.value, checked: (session.doc[f.id] || []).includes(o.value), on: { change: (e) => {
            const cur = new Set(session.doc[f.id] || []);
            if (e.target.checked) cur.add(o.value);
            else cur.delete(o.value);
            session.setDoc(f.id, Array.from(cur));
          } } }), h('span', o.label))));
        } else {
          input = h('textarea', { rows: 2, placeholder: f.placeholder || '', value: session.doc[f.id] || '', on: { input: (e) => session.setDoc(f.id, e.target.value) } });
        }
        form.appendChild(h('fieldset.doc-field', { id: 'doc-' + f.id }, h('legend', f.label), input, h('div.doc-fb')));
      });
      const check = h('button.btn.primary', { type: 'button', on: { click: () => {
        const res = session.checkDoc();
        res.forEach((r) => {
          const fs = form.querySelector('#doc-' + r.f.id);
          fs.classList.toggle('bad', !r.ok);
          fs.classList.toggle('ok', r.ok);
          fs.querySelector('.doc-fb').textContent = r.ok ? '' : r.msg;
        });
        clear(out);
        if (session.docChecked) {
          out.appendChild(report());
          render();
        } else MTRL.dom.toast('Bericht unvollständig – bitte markierte Felder prüfen.', 'warn');
      } } }, 'Bericht prüfen');
      return h('div',
        h('h2', '8 · Dokumentation'),
        h('p.lead', D.intro || ''),
        form, h('div.row-actions', check), out,
        session.docChecked ? report() : null,
        nav('documentation')
      );
    };

    function report() {
      const D = def.documentation;
      const label = (f) => {
        const v = session.doc[f.id];
        if (f.type === 'select') return (f.options.find((o) => o.value === v) || {}).label || '';
        if (f.type === 'multi') return (v || []).map((x) => (f.options.find((o) => o.value === x) || {}).label).join('; ');
        return v || '';
      };
      const t = def.situation.ticket;
      const rep = h('div.report',
        h('div.report-head', h('b', 'Instandsetzungsbericht'), h('span', 'Übungsdokument – MedTech Repair Lab')),
        h('table.plain', h('tbody',
          Object.entries(t).filter(([k]) => ['Auftrag', 'Gerät', 'Inventarnummer', 'Standort'].includes(k)).map(([k, v]) => h('tr', h('th', k), h('td', v))),
          D.fields.map((f) => h('tr', h('th', f.label), h('td', label(f)))),
          h('tr', h('th', 'Servicezeit (simuliert)'), h('td', fmt(session.minutes, 0) + ' min')),
          h('tr', h('th', 'Befunde'), h('td', h('ul', session.findings.map((f) => h('li', session.findingText(f.id))))))
        )),
        h('button.btn.small.noprint', { type: 'button', on: { click: () => g.print() } }, '🖨 Drucken / als PDF speichern')
      );
      return rep;
    }

    STEP.quiz = () => {
      const qs = def.quiz;
      const wrap = h('div.quiz');
      qs.forEach((q, qi) => {
        const ans = session.quizAnswers[qi];
        wrap.appendChild(h('fieldset.quiz-q' + (session.quizChecked ? (ans === q.correct ? '.ok' : '.bad') : ''),
          h('legend', `${qi + 1}. ${q.q}`),
          q.options.map((o, oi) => h('label.radio' + (session.quizChecked && oi === q.correct ? '.correct' : ''),
            h('input', { type: 'radio', name: 'q' + qi, checked: ans === oi, disabled: session.quizChecked ? true : null, on: { change: () => session.answerQuiz(qi, oi) } }),
            h('span', o))),
          session.quizChecked ? h('div.quiz-explain', q.explain) : null));
      });
      const sc = session.score();
      return h('div',
        h('h2', '9 · Abschlusstest'),
        h('p.lead', 'Prüfe dein Verständnis. Nach dem Auswerten werden die richtigen Antworten mit Begründung angezeigt.'),
        wrap,
        !session.quizChecked
          ? h('div.row-actions', h('button.btn.primary', { type: 'button', on: { click: () => {
              if (Object.keys(session.quizAnswers).length < qs.length) {
                if (!g.confirm('Noch nicht alle Fragen beantwortet. Trotzdem auswerten?')) return;
              }
              session.checkQuiz();
              render();
            } } }, 'Test auswerten'))
          : h('div.final',
              h('h3', '🏁 Fall abgeschlossen'),
              h('div.final-score', h('span.big', String(sc.total)), h('span', '/ 100 Punkte')),
              h('table.plain', h('tbody', sc.parts.map((p) => h('tr', h('td', p.label), h('td.mono', p.pts + ' / ' + p.max))))),
              h('p', `Servicezeit (simuliert): ${fmt(session.minutes, 0)} min · ${session.findings.length} Befunde · ${Object.keys(session.investigationsRun).length} Untersuchungen`),
              h('div.row-actions',
                h('a.btn', { href: '#/faelle' }, 'Zur Fallübersicht'),
                h('button.btn', { type: 'button', on: { click: () => { if (g.confirm('Fall komplett neu starten?')) { const p = MTRL.progress.load(); delete p.cases[def.id]; MTRL.progress.save(p); MTRL.navigate('#/fall/' + def.id); } } } }, 'Fall neu starten')
              )
            ),
        nav('quiz')
      );
    };

    function render() {
      renderHeader();
      renderStepper();
      clear(content);
      const step = MTRL.CASE_STEPS[session.stepIndex];
      content.appendChild(STEP[step.id]());
      renderSidebar();
    }

    render();
    return root;
  };
})(window);
