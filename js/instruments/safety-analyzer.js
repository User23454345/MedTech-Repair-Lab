/*
 * Sicherheitsanalysator (Wiederholungsprüfung nach IEC 62353 / DIN EN 62353)
 *
 * Fixture: {
 *   title, hint,
 *   deviceName, protectionClass: 'I'|'II', detachableCord: bool,
 *   appliedParts: [{id, name, type:'B'|'BF'|'CF'}],
 *   values(ctx) -> {pe: Ω, insulation: MΩ, equipmentLeakage: µA, applied: {id: µA}},
 *   onResult?(results, ctx), controls?: [...]
 * }
 *
 * Grenzwerte: Auszug IEC 62353 (Alternativ-/Ersatzableitstromverfahren),
 * zur Orientierung im Lernkontext. Maßgeblich sind die aktuell gültige
 * Norm sowie die Vorgaben des Herstellers.
 */
(function (g) {
  'use strict';
  const MTRL = g.MTRL;
  const { h, clear } = MTRL.dom;
  const fmt = MTRL.util.fmt;

  const LIMITS = {
    pe: () => 0.3, // Ω, Gerät inkl. Netzleitung (bis 3 m): 0,3 Ω (Gerät allein 0,2 Ω, abnehmbare Leitung allein 0,1 Ω)
    equipmentLeakage: (fx) => (fx.protectionClass === 'I' ? 1000 : 500), // µA, Ersatzableitstrom
    applied: (type) => (type === 'CF' ? 50 : type === 'BF' ? 5000 : null), // µA, Ersatz-Patientenableitstrom
  };

  MTRL.safetyLimits = LIMITS;

  /** Prüfschritte für eine Fixture (rein, ohne DOM – auch für Tests). */
  MTRL.safetyTests = function (fixture) {
    const tests = [{ id: 'visual', name: 'Sichtprüfung', unit: '' }];
    if (fixture.protectionClass === 'I') tests.push({ id: 'pe', name: 'Schutzleiterwiderstand', unit: 'Ω', limit: LIMITS.pe(fixture), cmp: '≤' });
    tests.push({ id: 'insulation', name: 'Isolationswiderstand (500 V DC)', unit: 'MΩ', limit: null, info: 'kein Normgrenzwert – Herstellervorgabe/Vergleich mit Vorwerten (Lernmodell: Plausibilität ≥ 2 MΩ)' });
    tests.push({ id: 'equipmentLeakage', name: 'Geräteableitstrom (Ersatzverfahren)', unit: 'µA', limit: LIMITS.equipmentLeakage(fixture), cmp: '≤' });
    (fixture.appliedParts || []).forEach((ap) => {
      const lim = LIMITS.applied(ap.type);
      tests.push({ id: 'ap:' + ap.id, name: `Patientenableitstrom ${ap.name} (Typ ${ap.type})`, unit: 'µA', limit: lim, cmp: '≤', info: lim === null ? 'Typ B: hier keine separate Messung bewertet' : '' });
    });
    return tests;
  };
  MTRL.safetyValue = function (fixture, test, ctx) {
    const v = fixture.values(ctx);
    if (test.id === 'visual') return v.visual === false ? 'Mängel' : 'ohne Befund';
    if (test.id.startsWith('ap:')) return v.applied[test.id.slice(3)];
    return v[test.id];
  };
  MTRL.safetyEvaluate = function (test, val) {
    if (test.id === 'visual') return val === 'ohne Befund';
    if (test.limit === null || test.limit === undefined) {
      if (test.id === 'insulation') return val >= 2;
      return true;
    }
    if (!isFinite(val)) return false;
    return val <= test.limit;
  };
  /** Kompletter Prüfablauf ohne Oberfläche: {ok, results} */
  MTRL.safetyRun = function (fixture, ctx) {
    const results = {};
    MTRL.safetyTests(fixture).forEach((t) => {
      const val = MTRL.safetyValue(fixture, t, ctx);
      results[t.id] = { val, ok: MTRL.safetyEvaluate(t, val) };
    });
    return { ok: Object.values(results).every((r) => r.ok), results };
  };

  MTRL.registerInstrument({
    id: 'safety-analyzer',
    name: 'Sicherheitsanalysator',
    short: 'STK',
    icon: '⚡',
    category: 'Elektrische Sicherheit',
    description: 'Führt die elektrische Sicherheitsprüfung nach IEC 62353 durch: Schutzleiterwiderstand, Isolationswiderstand, Geräte- und Patientenableitströme.',
    principle:
      '<p>Die <b>Wiederholungsprüfung</b> (vor Inbetriebnahme, nach Instandsetzung, wiederkehrend) erfolgt nach <b>IEC 62353</b>. Typische Schritte: <b>Sichtprüfung</b> → <b>Schutzleiterwiderstand</b> (nur Schutzklasse I) → <b>Isolationswiderstand</b> (optional, Herstellervorgabe beachten) → <b>Geräteableitstrom</b> → <b>Patientenableitstrom</b> der Anwendungsteile → <b>Funktionsprüfung</b> → <b>Bewertung &amp; Dokumentation</b>.</p>' +
      '<p>Anwendungsteile werden nach Schutzgrad klassifiziert: <b>B</b> (Body), <b>BF</b> (Body Floating, galvanisch getrennt), <b>CF</b> (Cardiac Floating, für direkten Herzkontakt geeignet – strengste Grenzwerte).</p>' +
      '<p class="muted">Grenzwerte hier: Auszug für das Ersatzableitstromverfahren, zur Orientierung. Maßgeblich sind die aktuelle Norm, Herstellerangaben und die Festlegungen des Betreibers.</p>',
    safety: 'Reale Prüfungen nur durch Elektrofachkräfte bzw. befähigte Personen mit geeigneten, kalibrierten Prüfgeräten. Bei der Isolationsmessung liegt eine Prüfspannung von typ. 500 V DC an.',
    render(container, fixture, ctx) {
      const results = {};
      const table = h('table.result-table');
      const verdict = h('div.sa-verdict');
      const lcd = h('div.sa-lcd', h('div.sa-lcd-label', 'Bereit'), h('div.sa-lcd-value', '—'));
      let running = false;

      const tests = MTRL.safetyTests(fixture);
      const valueFor = (test) => MTRL.safetyValue(fixture, test, ctx);
      const evaluate = MTRL.safetyEvaluate;
      function fmtVal(test, val) {
        if (test.id === 'visual') return val;
        if (!isFinite(val)) return test.id === 'insulation' ? '> 500' : 'OL';
        if (test.unit === 'Ω') return fmt(val, 3);
        if (test.unit === 'MΩ') return val >= 500 ? '> 500' : fmt(val, 1);
        return fmt(val, val < 10 ? 1 : 0);
      }

      function renderTable() {
        clear(table);
        table.appendChild(h('thead', h('tr', h('th', 'Prüfschritt'), h('th', 'Messwert'), h('th', 'Grenzwert'), h('th', 'Ergebnis'), h('th', ''))));
        const tb = h('tbody');
        tests.forEach((t) => {
          const r = results[t.id];
          tb.appendChild(
            h(
              'tr',
              h('td', t.name, t.info ? h('div.muted.small', t.info) : null),
              h('td.mono', r ? fmtVal(t, r.val) + (t.unit && t.id !== 'visual' ? ' ' + t.unit : '') : '—'),
              h('td.mono', t.limit ? `${t.cmp} ${fmt(t.limit, t.unit === 'Ω' ? 1 : 0)} ${t.unit}` : '—'),
              h('td', r ? MTRL.inst.badge(r.ok) : MTRL.inst.badge(null)),
              h('td', h('button.btn.small', { type: 'button', disabled: running ? true : null, on: { click: () => run(t) } }, r ? 'Wiederholen' : 'Messen'))
            )
          );
        });
        table.appendChild(tb);
        const done = tests.every((t) => results[t.id]);
        clear(verdict);
        if (done) {
          const ok = tests.every((t) => results[t.id].ok);
          verdict.appendChild(h('div.sa-final.' + (ok ? 'ok' : 'fail'), ok ? '✔ Gesamtbewertung: bestanden – keine sicherheitstechnischen Mängel festgestellt' : '✖ Gesamtbewertung: NICHT bestanden – Gerät nicht freigeben, kennzeichnen und Ursache klären'));
          if (fixture.onResult) fixture.onResult({ ok, results }, ctx);
        } else {
          verdict.appendChild(h('div.muted', `${tests.filter((t) => results[t.id]).length} von ${tests.length} Prüfschritten durchgeführt.`));
        }
      }

      function run(test) {
        running = true;
        renderTable();
        lcd.querySelector('.sa-lcd-label').textContent = test.name;
        const valEl = lcd.querySelector('.sa-lcd-value');
        let n = 0;
        const final = valueFor(test);
        const id = setInterval(() => {
          n++;
          if (n < 6 && test.id !== 'visual' && isFinite(final)) {
            valEl.textContent = fmtVal(test, final * (0.85 + n * 0.03)) + ' ' + test.unit;
          } else if (n < 6) {
            valEl.textContent = '…';
          } else {
            clearInterval(id);
            valEl.textContent = fmtVal(test, final) + (test.unit && test.id !== 'visual' ? ' ' + test.unit : '');
            results[test.id] = { val: final, ok: evaluate(test, final) };
            running = false;
            renderTable();
          }
        }, 160);
      }

      const runAll = h('button.btn.primary', { type: 'button', on: { click: async () => {
        for (const t of tests) {
          if (results[t.id]) continue;
          run(t);
          await new Promise((r) => setTimeout(r, 1100));
        }
      } } }, 'Prüfablauf automatisch starten');

      const info = h(
        'div.sa-device',
        h('div', h('b', 'Prüfling: '), fixture.deviceName),
        h('div', h('b', 'Schutzklasse: '), fixture.protectionClass, fixture.protectionClass === 'I' ? (fixture.detachableCord ? ' (abnehmbare Netzleitung)' : ' (festes Netzkabel)') : ''),
        h('div', h('b', 'Anwendungsteile: '), (fixture.appliedParts || []).map((a) => `${a.name} (${a.type})`).join(', ') || 'keine')
      );

      const body = h('div.sa', h('div.sa-body', h('div.sa-brand', 'SICHERHEITSANALYSATOR · IEC 62353 · TRAINING'), lcd, info, runAll), table, verdict);
      const side = MTRL.inst.renderControls(fixture, ctx, () => {
        Object.keys(results).forEach((k) => delete results[k]);
        renderTable();
      });
      container.appendChild(MTRL.inst.frame(this, fixture, body, side));
      renderTable();
    },
  });
})(window);
