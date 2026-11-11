/*
 * Virtuelles 2-Kanal-Oszilloskop
 * Fixture: {
 *   title, hint,
 *   testpoints: [{id,label,desc}],
 *   sample(tpId, t /* s *\/, ctx) -> Volt,
 *   defaults?: {ch1, ch2, vdiv1, vdiv2, tdiv},
 *   onView?(settings, ctx) – z. B. um Befunde zu vergeben
 *   controls?: [...]
 * }
 */
(function (g) {
  'use strict';
  const MTRL = g.MTRL;
  const { h } = MTRL.dom;
  const fmt = MTRL.util.fmt;

  const VDIV = [0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5];
  const TDIV = [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5];

  function fmtV(v) {
    if (Math.abs(v) < 0.01) return fmt(v * 1000, Math.abs(v) < 0.001 ? 2 : 1) + ' mV';
    if (Math.abs(v) < 1) return fmt(v * 1000, 0) + ' mV';
    return fmt(v, 2) + ' V';
  }
  function fmtT(t) {
    if (t < 1e-3) return fmt(t * 1e6, 0) + ' µs';
    if (t < 1) return fmt(t * 1e3, t < 0.01 ? 1 : 0) + ' ms';
    return fmt(t, 1) + ' s';
  }

  MTRL.registerInstrument({
    id: 'oscilloscope',
    name: 'Oszilloskop',
    short: 'OSZI',
    icon: '〰',
    category: 'Signalanalyse',
    description: 'Zeigt zeitlich veränderliche Spannungen als Kurve. Ideal, um Signalwege Stufe für Stufe zu verfolgen (Treiber → Sensor → Verstärker → Wandler).',
    principle:
      '<p>Das Oszilloskop stellt die Spannung (vertikal, <b>V/div</b>) über der Zeit (horizontal, <b>Zeit/div</b>) dar. Der <b>Trigger</b> sorgt dafür, dass periodische Signale stehend angezeigt werden. Mit zwei Kanälen lassen sich Ursache und Wirkung vergleichen, z. B. LED-Ansteuerung (Kanal 1) und Photodiodensignal (Kanal 2).</p>' +
      '<p>Vorgehen bei der Signalverfolgung: am Anfang der Kette beginnen und Stufe für Stufe weitergehen, bis das Signal „verschwindet“ – dazwischen liegt der Fehler.</p>',
    safety: 'Reale Messungen in geöffneten Geräten nur durch qualifiziertes Personal und nur an vom Hersteller dokumentierten Messpunkten. Massebezug beachten (netzgeerdete Oszilloskope!).',
    render(container, fixture, ctx) {
      const d = fixture.defaults || {};
      const tps = fixture.testpoints;
      const st = {
        ch1: d.ch1 || '',
        ch2: d.ch2 || '',
        vdiv1: d.vdiv1 || 1,
        vdiv2: d.vdiv2 || 0.5,
        tdiv: d.tdiv || 0.001,
        run: true,
        t: 0,
      };
      const W = 560;
      const H = 360;
      const canvas = h('canvas.scope-canvas', { role: 'img', 'aria-label': 'Oszilloskop-Anzeige' });
      const c2d = MTRL.dom.setupCanvas(canvas, W, H);
      const meas = h('div.scope-meas');
      const info = h('div.scope-info');

      const tpOpts = [{ value: '', label: '– aus –' }].concat(tps.map((t) => ({ value: t.id, label: t.label })));
      const notify = () => {
        if (fixture.onView) fixture.onView(Object.assign({}, st), ctx);
        info.innerHTML = [st.ch1, st.ch2]
          .filter(Boolean)
          .map((id, i) => {
            const tp = tps.find((x) => x.id === id);
            return `<div><span class="ch${i === 0 && st.ch1 ? 1 : 2}">CH${i === 0 && st.ch1 ? 1 : 2}</span> <b>${MTRL.util.esc(tp.label)}</b> – ${MTRL.util.esc(tp.desc || '')}</div>`;
          })
          .join('');
      };

      const controls = h(
        'div.scope-controls',
        h('div.scope-ch.ch1',
          h('div.ch-title', 'CH1'),
          MTRL.dom.select(tpOpts, st.ch1, (v) => { st.ch1 = v; notify(); }, { 'aria-label': 'Kanal 1 Messpunkt' }),
          MTRL.dom.select(VDIV.map((v) => ({ value: String(v), label: fmtV(v) + '/div' })), String(st.vdiv1), (v) => { st.vdiv1 = Number(v); notify(); }, { 'aria-label': 'Kanal 1 V/div' })
        ),
        h('div.scope-ch.ch2',
          h('div.ch-title', 'CH2'),
          MTRL.dom.select(tpOpts, st.ch2, (v) => { st.ch2 = v; notify(); }, { 'aria-label': 'Kanal 2 Messpunkt' }),
          MTRL.dom.select(VDIV.map((v) => ({ value: String(v), label: fmtV(v) + '/div' })), String(st.vdiv2), (v) => { st.vdiv2 = Number(v); notify(); }, { 'aria-label': 'Kanal 2 V/div' })
        ),
        h('div.scope-ch',
          h('div.ch-title', 'Horizontal'),
          MTRL.dom.select(TDIV.map((v) => ({ value: String(v), label: fmtT(v) + '/div' })), String(st.tdiv), (v) => { st.tdiv = Number(v); notify(); }, { 'aria-label': 'Zeitbasis' }),
          h('button.btn.small', { type: 'button', on: { click: (e) => { st.run = !st.run; e.target.textContent = st.run ? 'STOP' : 'RUN'; e.target.classList.toggle('active', !st.run); } } }, 'STOP')
        )
      );

      function sampleWindow(tp, t0, span, n) {
        const out = new Array(n);
        for (let i = 0; i < n; i++) out[i] = fixture.sample(tp, t0 + (span * i) / (n - 1), ctx);
        return out;
      }

      function triggerStart(tNow, span) {
        // Software-Trigger: steigende Flanke auf CH1 (bzw. CH2) bei Mittelwert
        const tp = st.ch1 || st.ch2;
        if (!tp) return tNow;
        const N = 400;
        const pre = sampleWindow(tp, tNow - 2 * span, 2 * span, N);
        let mn = Infinity;
        let mx = -Infinity;
        pre.forEach((v) => {
          mn = Math.min(mn, v);
          mx = Math.max(mx, v);
        });
        if (mx - mn < 1e-3) return tNow - span;
        const lvl = mn + (mx - mn) * 0.5;
        for (let i = 1; i < N / 2; i++) {
          if (pre[i - 1] < lvl && pre[i] >= lvl) return tNow - 2 * span + (2 * span * i) / (N - 1);
        }
        return tNow - span;
      }

      function draw() {
        c2d.fillStyle = '#04110c';
        c2d.fillRect(0, 0, W, H);
        MTRL.inst.grid(c2d, W, H, 10, 8, '#2f7d5b', true);
        const span = st.tdiv * 10;
        const t0 = triggerStart(st.t, span);
        const n = 500;
        const stats = [];
        [
          [st.ch1, st.vdiv1, '#ffd23f'],
          [st.ch2, st.vdiv2, '#38d6ff'],
        ].forEach(([tp, vdiv, col], idx) => {
          if (!tp) return;
          const s = sampleWindow(tp, t0, span, n);
          c2d.save();
          c2d.strokeStyle = col;
          c2d.lineWidth = 1.6;
          c2d.shadowColor = col;
          c2d.shadowBlur = 4;
          c2d.beginPath();
          s.forEach((v, i) => {
            const x = (i / (n - 1)) * W;
            let y = H / 2 - (v / vdiv) * (H / 8);
            y = Math.max(-2, Math.min(H + 2, y));
            if (i === 0) c2d.moveTo(x, y);
            else c2d.lineTo(x, y);
          });
          c2d.stroke();
          c2d.restore();
          // Kanalmarke
          c2d.fillStyle = col;
          c2d.font = '12px ui-monospace, monospace';
          c2d.fillText('CH' + (idx + 1), 6, 16 + idx * 16);
          // Messwerte
          let mn = Infinity;
          let mx = -Infinity;
          let sum = 0;
          s.forEach((v) => {
            mn = Math.min(mn, v);
            mx = Math.max(mx, v);
            sum += v;
          });
          const mean = sum / n;
          let crossings = 0;
          const lvl = (mn + mx) / 2;
          for (let i = 1; i < n; i++) if (s[i - 1] < lvl && s[i] >= lvl) crossings++;
          const freq = mx - mn > 0.002 && crossings >= 2 ? crossings / span : null;
          stats.push({ idx, col, vpp: mx - mn, mean, freq });
        });
        c2d.fillStyle = '#9fe8c4';
        c2d.font = '12px ui-monospace, monospace';
        c2d.fillText(fmtT(st.tdiv) + '/div', W - 90, H - 8);
        meas.innerHTML = stats
          .map(
            (s) =>
              `<div class="m-row"><span style="color:${s.col}">CH${s.idx + 1}</span> Vss ${fmtV(s.vpp)} · Mittel ${fmtV(s.mean)} · f ${s.freq ? (s.freq >= 1000 ? fmt(s.freq / 1000, 2) + ' kHz' : fmt(s.freq, 1) + ' Hz') : '—'}</div>`
          )
          .join('') || '<div class="muted">Kein Kanal aktiv – Messpunkt wählen.</div>';
      }

      const body = h('div.scope', h('div.scope-screen', canvas), meas, controls, info);
      const side = MTRL.inst.renderControls(fixture, ctx, () => notify());
      container.appendChild(MTRL.inst.frame(this, fixture, body, side));
      notify();
      MTRL.dom.animate(canvas, (dt) => {
        if (st.run) st.t += dt;
        draw();
      });
    },
  });
})(window);
