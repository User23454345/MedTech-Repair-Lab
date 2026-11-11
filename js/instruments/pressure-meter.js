/*
 * Digitales Referenz-Druckmessgerät (Manometer) mit Druckerzeuger
 * Für statische Druckprüfung (z. B. NIBP-Messtechnische Kontrolle),
 * Dichtheitsprüfung und Vakuummessung (Absaugung).
 *
 * Fixture: {
 *   title, hint, unit:'mmHg'|'kPa'|'mbar', vacuum?:bool,
 *   setpoints: [Zahlen], tolerance: Zahl (± in unit),
 *   deviceLabel: 'Anzeige Prüfling',
 *   deviceReading(ref, ctx) -> Zahl | null,
 *   leak?: {pressure, duration (s), limit (unit pro min), rate(ctx) -> unit/min}
 *   vacuumMax?(ctx) -> Zahl (für Absaugung: erreichbarer Unterdruck)
 *   onResult?(kind, data, ctx), controls?: [...]
 * }
 */
(function (g) {
  'use strict';
  const MTRL = g.MTRL;
  const { h, clear } = MTRL.dom;
  const fmt = MTRL.util.fmt;

  function gaugeSVG(value, max, unit, label) {
    const a0 = -220;
    const a1 = 40;
    const ang = a0 + (Math.min(Math.abs(value), max) / max) * (a1 - a0);
    const rad = (d) => (d * Math.PI) / 180;
    let ticks = '';
    for (let i = 0; i <= 10; i++) {
      const a = rad(a0 + (i / 10) * (a1 - a0));
      const r1 = 70;
      const r2 = i % 2 === 0 ? 58 : 63;
      ticks += `<line x1="${90 + r1 * Math.cos(a)}" y1="${90 + r1 * Math.sin(a)}" x2="${90 + r2 * Math.cos(a)}" y2="${90 + r2 * Math.sin(a)}" stroke="#cfd8dc" stroke-width="${i % 2 === 0 ? 2 : 1}"/>`;
      if (i % 2 === 0) {
        const r3 = 47;
        ticks += `<text x="${90 + r3 * Math.cos(a)}" y="${94 + r3 * Math.sin(a)}" fill="#cfd8dc" font-size="9" text-anchor="middle">${Math.round((i / 10) * max)}</text>`;
      }
    }
    const na = rad(ang);
    return `<svg viewBox="0 0 180 180" class="gauge" role="img" aria-label="${label}: ${fmt(value, 0)} ${unit}">
      <circle cx="90" cy="90" r="84" fill="#1d2329" stroke="#56636e" stroke-width="4"/>
      ${ticks}
      <line x1="90" y1="90" x2="${90 + 62 * Math.cos(na)}" y2="${90 + 62 * Math.sin(na)}" stroke="#ff5a4e" stroke-width="3" stroke-linecap="round"/>
      <circle cx="90" cy="90" r="6" fill="#ff5a4e"/>
      <text x="90" y="140" fill="#e8f1f5" font-size="16" text-anchor="middle" font-family="ui-monospace,monospace">${fmt(value, unit === 'kPa' ? 1 : 0)}</text>
      <text x="90" y="156" fill="#9fb0bb" font-size="10" text-anchor="middle">${unit}</text>
    </svg>`;
  }

  /** Statische Druckprüfung ohne Oberfläche (rein). */
  MTRL.pressureStatic = function (fixture, ctx) {
    const lim = fixture.maxReachable ? fixture.maxReachable(ctx) : Infinity;
    const results = {};
    fixture.setpoints.forEach((sp) => {
      const ref = Math.min(sp, lim);
      const dv = fixture.deviceReading(ref, ctx);
      const reached = Math.abs(ref - sp) < 0.5;
      const dev = dv === null ? null : dv - ref;
      results[sp] = { ref, reached, dv, dev, ok: reached && dv !== null && Math.abs(dev) <= fixture.tolerance };
    });
    return { ok: fixture.setpoints.every((sp) => results[sp].ok), results };
  };
  MTRL.pressureLeak = function (fixture, ctx) {
    const L = fixture.leak;
    const rate = L.rate(ctx);
    const drop = (rate * L.duration) / 60;
    const perMin = rate;
    return { drop, perMin, ok: perMin <= L.limit };
  };

  MTRL.registerInstrument({
    id: 'pressure-meter',
    name: 'Druckmessgerät',
    short: 'DRUCK',
    icon: '⏲',
    category: 'Pneumatik / Hydraulik',
    description: 'Kalibriertes Referenzmanometer mit Pumpe: statische Druckvergleichsmessung, Dichtheitsprüfung und Unterdruckmessung.',
    principle:
      '<p>Für die <b>statische Druckprüfung</b> wird das Referenzmanometer über ein T-Stück parallel zum Drucksensor des Prüflings an ein geschlossenes Volumen angeschlossen. Der Prüfling wird in den Service-/Kalibriermodus versetzt (Ventile geschlossen). Bei mehreren Druckstufen vergleicht man Referenz- und Geräteanzeige.</p>' +
      '<p>Die <b>Dichtheitsprüfung</b> beobachtet den Druckabfall bei abgeschalteter Pumpe über eine definierte Zeit. Ein zu starker Abfall deutet auf Undichtigkeiten in Schläuchen, Steckverbindern, Manschette oder Ventilen hin.</p>',
    safety: 'Referenzmessgeräte müssen rückführbar kalibriert sein. Prüfdrücke nur im vom Hersteller freigegebenen Bereich anwenden.',
    render(container, fixture, ctx) {
      const unit = fixture.unit || 'mmHg';
      const vac = !!fixture.vacuum;
      const max = fixture.max || (vac ? 1000 : 300);
      const st = { ref: 0, results: {}, leak: null, busy: false };
      const gauge = h('div.gauge-wrap');
      const devDisp = h('div.dev-disp');
      const table = h('table.result-table');
      const leakBox = h('div.leak-box');
      const chartCanvas = h('canvas.leak-canvas');
      const chart = MTRL.dom.setupCanvas(chartCanvas, 360, 140);

      function show() {
        gauge.innerHTML = gaugeSVG(vac ? -st.ref : st.ref, max, unit, 'Referenz');
        const dv = fixture.deviceReading(st.ref, ctx);
        devDisp.innerHTML = `<div class="dd-label">${MTRL.util.esc(fixture.deviceLabel || 'Anzeige Prüfling')}</div><div class="dd-val">${dv === null ? '---' : fmt(dv, unit === 'kPa' ? 1 : 0)}</div><div class="dd-unit">${unit}</div>`;
      }

      function rampTo(target, cb) {
        st.busy = true;
        const start = st.ref;
        let i = 0;
        const id = setInterval(() => {
          i++;
          st.ref = start + ((target - start) * i) / 12;
          show();
          if (i >= 12) {
            clearInterval(id);
            st.ref = target;
            st.busy = false;
            show();
            cb && cb();
          }
        }, 60);
      }

      function record(sp) {
        const ref = st.ref; // tatsächlich erreichter Referenzdruck
        const dv = fixture.deviceReading(ref, ctx);
        const reached = Math.abs(ref - sp) < 0.5;
        const dev = dv === null ? null : dv - ref;
        st.results[sp] = { ref, reached, dv, dev, ok: reached && dv !== null && Math.abs(dev) <= fixture.tolerance };
        renderTable();
      }
      const reachable = (sp) => Math.min(sp, fixture.maxReachable ? fixture.maxReachable(ctx) : Infinity);

      function renderTable() {
        clear(table);
        table.appendChild(h('thead', h('tr', h('th', 'Referenz'), h('th', 'Prüfling'), h('th', 'Abweichung'), h('th', `Toleranz ±${fixture.tolerance} ${unit}`))));
        const tb = h('tbody');
        fixture.setpoints.forEach((sp) => {
          const r = st.results[sp];
          tb.appendChild(h('tr',
            h('td.mono', `${vac ? '−' : ''}${fmt(sp, 0)} ${unit}`, r && !r.reached ? h('div.small.bad-text', `nicht erreicht (max. ${fmt(r.ref, 0)})`) : null),
            h('td.mono', r ? (r.dv === null ? '---' : fmt(r.dv, unit === 'kPa' ? 1 : 0)) : '—'),
            h('td.mono', r && r.dev !== null ? (r.dev > 0 ? '+' : '') + fmt(r.dev, unit === 'kPa' ? 1 : 0) : '—'),
            h('td', r ? MTRL.inst.badge(r.ok) : MTRL.inst.badge(null))
          ));
        });
        table.appendChild(tb);
        const all = fixture.setpoints.every((sp) => st.results[sp]);
        if (all && fixture.onResult) fixture.onResult('static', { ok: fixture.setpoints.every((sp) => st.results[sp].ok), results: st.results }, ctx);
      }

      const spButtons = h('div.preset-row', fixture.setpoints.map((sp) =>
        h('button.btn.small', { type: 'button', on: { click: () => { if (!st.busy) rampTo(reachable(sp), () => record(sp)); } } }, `${vac ? '−' : ''}${fmt(sp, 0)}`)
      ));

      let leakUI = null;
      if (fixture.leak) {
        const L = fixture.leak;
        const startBtn = h('button.btn', { type: 'button', on: { click: () => {
          if (st.busy) return;
          rampTo(L.pressure, () => {
            st.busy = true;
            const rate = fixture.leak.rate(ctx); // unit/min
            const pts = [];
            let i = 0;
            const N = 60;
            const id = setInterval(() => {
              const tSec = (i / N) * L.duration;
              st.ref = L.pressure - (rate * tSec) / 60;
              pts.push(st.ref);
              show();
              drawLeak(pts, L);
              i++;
              if (i > N) {
                clearInterval(id);
                st.busy = false;
                const drop = L.pressure - st.ref;
                const perMin = (drop / L.duration) * 60;
                const ok = perMin <= L.limit;
                st.leak = { drop, perMin, ok };
                clear(leakBox);
                leakBox.appendChild(h('div', `Druckabfall in ${L.duration} s: `, h('b', `${fmt(drop, 1)} ${unit}`), ` → ${fmt(perMin, 1)} ${unit}/min `, MTRL.inst.badge(ok, 'dicht', 'undicht'), h('span.muted', ` (Grenze ≤ ${L.limit} ${unit}/min)`)));
                if (fixture.onResult) fixture.onResult('leak', st.leak, ctx);
              }
            }, 70);
          });
        } } }, `Dichtheitsprüfung (${L.pressure} ${unit}, ${L.duration} s)`);
        leakUI = h('div.leak', h('div.fc-title', 'Dichtheitsprüfung'), startBtn, chartCanvas, leakBox);
      }

      function drawLeak(pts, L) {
        chart.fillStyle = '#0b1418';
        chart.fillRect(0, 0, 360, 140);
        MTRL.inst.grid(chart, 360, 140, 6, 4, '#2a4a57');
        chart.strokeStyle = '#ffd23f';
        chart.lineWidth = 2;
        chart.beginPath();
        const lo = L.pressure * 0.8;
        pts.forEach((p, i) => {
          const x = (i / 60) * 360;
          const y = 140 - ((p - lo) / (L.pressure - lo)) * 120;
          if (i === 0) chart.moveTo(x, y);
          else chart.lineTo(x, y);
        });
        chart.stroke();
      }

      const ventBtn = h('button.btn.small', { type: 'button', on: { click: () => { if (!st.busy) rampTo(0); } } }, 'Entlüften (0)');
      const body = h('div.pm',
        h('div.pm-row', h('div.pm-ref', h('div.sa-brand', 'REFERENZMANOMETER · TRAINING'), gauge), h('div.pm-dev', devDisp)),
        h('div.fc-title', vac ? 'Unterdruck-Stufen anfahren und vergleichen' : 'Druckstufen anfahren und vergleichen'),
        spButtons, ventBtn, table, leakUI
      );
      const side = MTRL.inst.renderControls(fixture, ctx, () => { st.results = {}; renderTable(); show(); });
      container.appendChild(MTRL.inst.frame(this, fixture, body, side));
      show();
      renderTable();
    },
  });
})(window);
