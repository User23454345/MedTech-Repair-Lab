/*
 * Gasflow-/Beatmungsanalysator mit Testlunge
 *
 * Fixture: {
 *   title, hint,
 *   defaults: {vt, rate, peep, fio2},
 *   measure(settings, ctx) -> {
 *     ref:    {vt, rate, peep, ppeak, fio2},   // Analysator (Referenz)
 *     device: {vt, rate, peep, ppeak, fio2},   // Anzeige des Beatmungsgeräts
 *     alarms: [{text, level}]
 *   },
 *   tolerances: {vt: {rel, abs}, peep: {abs}, fio2: {abs}, rate: {abs}},
 *   onResult?(data, ctx), controls?: [...]
 * }
 */
(function (g) {
  'use strict';
  const MTRL = g.MTRL;
  const { h, clear } = MTRL.dom;
  const fmt = MTRL.util.fmt;

  const DEFAULT_TOL = { vt: { rel: 0.1, abs: 10 }, peep: { abs: 2 }, fio2: { abs: 3 }, rate: { abs: 1 } };
  /** Bewertung (rein): Abgabe (Einstellung vs. Analysator) und Gerätemessung (Analysator vs. Anzeige). */
  MTRL.flowCheck = function (fixture, s, m) {
    const tol = fixture.tolerances || DEFAULT_TOL;
    const within = (key, set, val) => {
      if (val === null || val === undefined) return false;
      const t = tol[key];
      if (!t) return true;
      const lim = Math.max(t.abs || 0, (t.rel || 0) * set);
      return Math.abs(val - set) <= lim;
    };
    const keys = ['vt', 'rate', 'peep', 'ppeak', 'fio2'];
    const rows = keys.map((k) => {
      const set = s[k];
      const ref = m.ref[k];
      const dev = m.device[k];
      return { k, set, ref, dev, okDeliver: set === undefined ? null : within(k, set, ref), okMeasure: within(k, ref, dev) };
    });
    return { rows, allOk: rows.every((r) => r.okDeliver !== false && r.okMeasure) };
  };

  MTRL.registerInstrument({
    id: 'flow-analyzer',
    name: 'Durchflussmessgerät / Beatmungsanalysator',
    short: 'FLOW',
    icon: '🌬',
    category: 'Pneumatik / Hydraulik',
    description: 'Misst Flow, Volumen, Drücke und O₂-Konzentration zwischen Beatmungsgerät und Testlunge – Referenz für die Funktionsprüfung von Beatmungsgeräten.',
    principle:
      '<p>Der Analysator wird zwischen Y-Stück und <b>Testlunge</b> (definierte Compliance und Resistance) geschaltet. Er misst den Flow (z. B. über Differenzdruck an einem Strömungswiderstand) und integriert ihn zum <b>Tidalvolumen</b>. Zusätzlich werden <b>Spitzendruck</b>, <b>PEEP</b>, <b>Frequenz</b> und <b>FiO₂</b> erfasst.</p>' +
      '<p>Vergleicht man die Referenzwerte mit den Einstellungen und der Anzeige des Beatmungsgeräts, lassen sich Fehler eingrenzen: Weichen nur die <i>angezeigten</i> Werte ab, liegt der Fehler eher in der Messung des Geräts (z. B. Flowsensor). Weicht die <i>tatsächliche Abgabe</i> ab, liegt er eher in Gasdosierung, Ventilen oder Leckagen.</p>' +
      '<p class="muted">Volumenangaben sind auf Bezugsbedingungen (z. B. BTPS/ATP) bezogen – Einstellung am Analysator muss zum Gerät passen.</p>',
    safety: 'Funktionsprüfungen am Beatmungsgerät nie am Patienten. Nach Prüfung Gerät gemäß Hygieneplan aufbereiten und Patientenschlauchsystem erneuern.',
    render(container, fixture, ctx) {
      const s = Object.assign({ vt: 500, rate: 12, peep: 5, fio2: 40 }, fixture.defaults || {});
      const W = 420;
      const H = 220;
      const canvas = h('canvas.flow-canvas', { role: 'img', 'aria-label': 'Druck- und Flowkurve' });
      const c2d = MTRL.dom.setupCanvas(canvas, W, H);
      const table = h('table.result-table');
      const alarms = h('div.mon-msgs');
      let m = fixture.measure(s, ctx);
      const changed = () => {
        m = fixture.measure(s, ctx);
        renderTable();
      };

      function renderTable() {
        clear(table);
        table.appendChild(h('thead', h('tr', h('th', 'Parameter'), h('th', 'Einstellung'), h('th', 'Analysator (Referenz)'), h('th', 'Anzeige Gerät'), h('th', 'Abgabe'), h('th', 'Gerätemessung'))));
        const meta = { vt: ['VT', 'ml', 0], rate: ['Frequenz', '/min', 0], peep: ['PEEP', 'mbar', 1], ppeak: ['Ppeak', 'mbar', 1], fio2: ['FiO₂', '%', 0] };
        const chk = MTRL.flowCheck(fixture, s, m);
        const allOk = chk.allOk;
        const tb = h('tbody');
        chk.rows.forEach((r) => {
          const [lbl, u, dg] = meta[r.k];
          tb.appendChild(h('tr',
            h('td', lbl),
            h('td.mono', r.set === undefined ? '—' : fmt(r.set, dg) + ' ' + u),
            h('td.mono', r.ref === null || r.ref === undefined ? '---' : fmt(r.ref, dg) + ' ' + u),
            h('td.mono', r.dev === null || r.dev === undefined ? '---' : fmt(r.dev, dg) + ' ' + u),
            h('td', r.okDeliver === null ? MTRL.inst.badge(null) : MTRL.inst.badge(r.okDeliver)),
            h('td', MTRL.inst.badge(r.okMeasure))
          ));
        });
        table.appendChild(tb);
        clear(alarms);
        (m.alarms || []).forEach((a) => alarms.appendChild(h('span.msg.' + (a.level || 'med'), a.text)));
        if (!m.alarms || !m.alarms.length) alarms.appendChild(h('span.msg.none', 'Keine Alarme am Beatmungsgerät'));
        if (fixture.onResult) fixture.onResult({ ok: allOk, settings: Object.assign({}, s), m }, ctx);
      }

      // Kurven aus den Referenzwerten abgeleitet (volumenkontrolliert, Testlunge C = 50 ml/mbar, R = 5 mbar/(l/s))
      let t = 0;
      function curves(time) {
        const period = 60 / s.rate;
        const ti = period / 3; // I:E = 1:2
        const ph = time % period;
        const vt = m.ref.vt / 1000; // l
        const peep = m.ref.peep;
        const ppeak = m.ref.ppeak;
        let flow;
        let p;
        if (ph < ti) {
          flow = vt / ti; // l/s konstant (volumenkontrolliert)
          p = peep + (ppeak - peep) * (0.35 + 0.65 * (ph / ti));
        } else {
          const tau = 0.4;
          flow = -(vt / tau) * Math.exp(-(ph - ti) / tau);
          p = peep + (ppeak - peep) * 0.35 * Math.exp(-(ph - ti) / 0.08) + 0;
        }
        return { flow, p };
      }
      let x = 0;
      let prevP = null;
      let prevF = null;
      c2d.fillStyle = '#071015';
      c2d.fillRect(0, 0, W, H);
      MTRL.dom.animate(canvas, (dt) => {
        const steps = Math.max(1, Math.round(dt * 60));
        for (let i = 0; i < steps; i++) {
          const ts = t + (i / steps) * dt;
          const c = curves(ts);
          c2d.fillStyle = '#071015';
          c2d.fillRect(x + 1, 0, 10, H);
          const yP = 100 - (c.p / 40) * 90;
          const yF = 165 - (c.flow / 1.5) * 50;
          c2d.lineWidth = 1.6;
          c2d.strokeStyle = '#ffd23f';
          c2d.beginPath();
          c2d.moveTo(x - 1, prevP === null ? yP : prevP);
          c2d.lineTo(x, yP);
          c2d.stroke();
          c2d.strokeStyle = '#38d6ff';
          c2d.beginPath();
          c2d.moveTo(x - 1, prevF === null ? yF : prevF);
          c2d.lineTo(x, yF);
          c2d.stroke();
          prevP = yP;
          prevF = yF;
          x++;
          if (x >= W) {
            x = 0;
            prevP = prevF = null;
          }
        }
        t += dt;
        c2d.fillStyle = '#071015';
        c2d.fillRect(0, 0, 130, 14);
        c2d.fillRect(0, 118, 130, 14);
        c2d.font = '11px system-ui, sans-serif';
        c2d.fillStyle = '#ffd23f';
        c2d.fillText('Paw (mbar)', 4, 11);
        c2d.fillStyle = '#38d6ff';
        c2d.fillText('Flow (l/s)', 4, 129);
      });

      const ctrl = h('div.sim-panel',
        h('div.sim-brand', 'BEATMUNGSGERÄT – EINSTELLUNG (VC-CMV)'),
        MTRL.dom.stepper('Tidalvolumen', s.vt, { min: 200, max: 1000, step: 50, unit: 'ml' }, (v) => { s.vt = v; changed(); }),
        MTRL.dom.stepper('Frequenz', s.rate, { min: 6, max: 30, step: 1, unit: '/min' }, (v) => { s.rate = v; changed(); }),
        MTRL.dom.stepper('PEEP', s.peep, { min: 0, max: 20, step: 1, unit: 'mbar' }, (v) => { s.peep = v; changed(); }),
        MTRL.dom.stepper('FiO₂', s.fio2, { min: 21, max: 100, step: 5, unit: '%' }, (v) => { s.fio2 = v; changed(); }),
        h('div.muted.small', 'Testlunge: C = 50 ml/mbar, R = 5 mbar/(l/s)')
      );
      const body = h('div.flow', h('div.sim', ctrl, h('div.flow-screen', h('div.sa-brand', 'ANALYSATOR · TRAINING'), canvas, alarms)), table);
      const side = MTRL.inst.renderControls(fixture, ctx, changed);
      container.appendChild(MTRL.inst.frame(this, fixture, body, side));
      renderTable();
    },
  });
})(window);
