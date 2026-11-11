/*
 * Infusionspumpen-Prüfgerät (Infusion Device Analyzer)
 *
 * Fixture: {
 *   title, hint, pumpLabel,
 *   rates: [ml/h …], duration: Minuten (simuliert), tolerance: Anteil (z. B. 0.05),
 *   flow(rate, tMin, ctx) -> momentaner Flow (ml/h),
 *   occlusion?(ctx) -> {alarmPressure: mmHg|null, limit: mmHg, maxAllowed: mmHg},
 *   onResult?(kind, data, ctx), controls?: [...]
 * }
 */
(function (g) {
  'use strict';
  const MTRL = g.MTRL;
  const { h, clear } = MTRL.dom;
  const fmt = MTRL.util.fmt;

  /** Förderratenprüfung ohne Oberfläche (rein): integriert den Flow wie die Anzeige. */
  MTRL.pumpFlowRun = function (fixture, rate, ctx) {
    const dur = fixture.duration || 60;
    const N = 120;
    let vol = 0;
    const samples = [];
    for (let i = 0; i <= N; i++) {
      const tMin = (i / N) * dur;
      const f = fixture.flow(rate, tMin, ctx);
      samples.push(f);
      vol += (f * (dur / N)) / 60;
    }
    const expected = (rate * dur) / 60;
    const dev = (vol - expected) / expected;
    return { rate, vol, expected, mean: (vol / dur) * 60, dev, ok: Math.abs(dev) <= (fixture.tolerance || 0.05), samples };
  };
  MTRL.pumpOcclusionEval = function (o) {
    const alarmed = o.alarmPressure !== null;
    return alarmed && o.alarmPressure <= o.maxAllowed && o.alarmPressure >= (o.minAllowed || 0);
  };

  MTRL.registerInstrument({
    id: 'pump-analyzer',
    name: 'Pumpenprüfgerät',
    short: 'IDA',
    icon: '💧',
    category: 'Pneumatik / Hydraulik',
    description: 'Misst Förderrate, gefördertes Volumen und Okklusionsdruck von Infusions- und Spritzenpumpen.',
    principle:
      '<p>Die Pumpe fördert in das Prüfgerät, das das Volumen (z. B. über Füllhöhe oder Wägung) zeitlich erfasst. Daraus ergeben sich <b>mittlere Förderrate</b> und <b>Abweichung</b> vom Sollwert. Kurzzeitige Schwankungen (z. B. durch Peristaltik oder Spindelsteigung) zeigt der Flowverlauf.</p>' +
      '<p>Beim <b>Okklusionstest</b> wird der Ausgang verschlossen; der Druck steigt, bis die Pumpe Okklusionsalarm gibt. Der Alarmdruck muss in dem vom Hersteller angegebenen Bereich der gewählten Druckstufe liegen.</p>' +
      '<p class="muted">Genauigkeitsangaben (z. B. ±5 %) und Prüfbedingungen (Einlaufzeit, Spritzentyp, Infusionsset) sind herstellerspezifisch. Hier: Lernmodell mit Beispieltoleranz.</p>',
    safety: 'Nur freigegebene Infusionssets/Spritzen verwenden. Prüfflüssigkeit (meist destilliertes Wasser) nie für Patienten verwenden.',
    render(container, fixture, ctx) {
      const st = { rate: fixture.rates[0], busy: false };
      const W = 420;
      const H = 170;
      const canvas = h('canvas.flow-canvas', { role: 'img', 'aria-label': 'Flowverlauf' });
      const c2d = MTRL.dom.setupCanvas(canvas, W, H);
      const result = h('div.pa-result');
      const occBox = h('div.pa-result');
      const lcd = h('div.sa-lcd', h('div.sa-lcd-label', 'Bereit'), h('div.sa-lcd-value', '—'));

      function background(maxY, label) {
        c2d.fillStyle = '#071015';
        c2d.fillRect(0, 0, W, H);
        MTRL.inst.grid(c2d, W, H, 6, 4, '#2a4a57');
        c2d.fillStyle = '#9fb0bb';
        c2d.font = '11px system-ui, sans-serif';
        c2d.fillText(label, 4, 12);
        c2d.fillText(fmt(maxY, 0), W - 36, 12);
      }

      function runFlow() {
        if (st.busy) return;
        st.busy = true;
        const rate = st.rate;
        const dur = fixture.duration || 60;
        const N = 120;
        const maxY = rate * 1.5;
        background(maxY, 'Flow (ml/h) über ' + dur + ' min');
        // Sollwert-Linie
        c2d.strokeStyle = '#4caf50';
        c2d.setLineDash([4, 4]);
        c2d.beginPath();
        c2d.moveTo(0, H - (rate / maxY) * H);
        c2d.lineTo(W, H - (rate / maxY) * H);
        c2d.stroke();
        c2d.setLineDash([]);
        let vol = 0;
        let i = 0;
        let prev = null;
        const id = setInterval(() => {
          const tMin = (i / N) * dur;
          const f = fixture.flow(rate, tMin, ctx);
          vol += (f * (dur / N)) / 60;
          const x = (i / N) * W;
          const y = H - (Math.max(0, f) / maxY) * H;
          c2d.strokeStyle = '#ffd23f';
          c2d.lineWidth = 1.6;
          c2d.beginPath();
          c2d.moveTo(prev ? prev[0] : x, prev ? prev[1] : y);
          c2d.lineTo(x, y);
          c2d.stroke();
          prev = [x, y];
          lcd.querySelector('.sa-lcd-label').textContent = `Förderratenprüfung ${fmt(rate, 0)} ml/h · t = ${fmt(tMin, 0)} min`;
          lcd.querySelector('.sa-lcd-value').textContent = `${fmt(vol, 2)} ml`;
          i++;
          if (i > N) {
            clearInterval(id);
            st.busy = false;
            const ref = MTRL.pumpFlowRun(fixture, rate, ctx);
            vol = ref.vol;
            const expected = ref.expected;
            const mean = ref.mean;
            const dev = ref.dev;
            const ok = ref.ok;
            clear(result);
            result.appendChild(
              h('div', `Soll: ${fmt(expected, 2)} ml · Ist: `, h('b', `${fmt(vol, 2)} ml`), ` · mittlere Rate ${fmt(mean, 1)} ml/h · Abweichung `, h('b', `${dev > 0 ? '+' : ''}${fmt(dev * 100, 1)} %`), ' ', MTRL.inst.badge(ok), h('span.muted', ` (Toleranz ±${fmt((fixture.tolerance || 0.05) * 100, 0)} %)`))
            );
            if (fixture.onResult) fixture.onResult('flow', { rate, vol, dev, ok }, ctx);
          }
        }, 45);
      }

      function runOcclusion() {
        if (st.busy || !fixture.occlusion) return;
        st.busy = true;
        const o = fixture.occlusion(ctx);
        const maxP = Math.max(o.maxAllowed * 1.4, 1000);
        background(maxP, 'Druck (mmHg) bei verschlossenem Ausgang');
        // Grenzbereich
        c2d.fillStyle = 'rgba(76,175,80,0.15)';
        const yHi = H - (o.maxAllowed / maxP) * H;
        const yLo = H - ((o.minAllowed || 0) / maxP) * H;
        c2d.fillRect(0, yHi, W, yLo - yHi);
        let p = 0;
        let i = 0;
        const target = o.alarmPressure === null ? maxP * 0.98 : o.alarmPressure;
        let prev = null;
        const id = setInterval(() => {
          p = Math.min(target, p + target / 70 + 2);
          const x = (i / 90) * W;
          const y = H - (p / maxP) * H;
          c2d.strokeStyle = '#ff7043';
          c2d.lineWidth = 2;
          c2d.beginPath();
          c2d.moveTo(prev ? prev[0] : x, prev ? prev[1] : y);
          c2d.lineTo(x, y);
          c2d.stroke();
          prev = [x, y];
          lcd.querySelector('.sa-lcd-label').textContent = 'Okklusionstest';
          lcd.querySelector('.sa-lcd-value').textContent = `${fmt(p, 0)} mmHg`;
          i++;
          if (p >= target || i > 90) {
            clearInterval(id);
            st.busy = false;
            const alarmed = o.alarmPressure !== null;
            const ok = MTRL.pumpOcclusionEval(o);
            clear(occBox);
            occBox.appendChild(
              h('div', alarmed ? `Okklusionsalarm bei ` : 'KEIN Okklusionsalarm bis ', h('b', `${fmt(alarmed ? o.alarmPressure : p, 0)} mmHg`), ` · zulässiger Bereich ${fmt(o.minAllowed || 0, 0)}–${fmt(o.maxAllowed, 0)} mmHg (Stufe „${o.levelLabel || 'mittel'}“) `, MTRL.inst.badge(ok))
            );
            if (fixture.onResult) fixture.onResult('occlusion', { ok, o }, ctx);
          }
        }, 40);
      }

      const ctrl = h('div.sim-panel',
        h('div.sim-brand', (fixture.pumpLabel || 'PRÜFLING: PUMPE').toUpperCase()),
        h('div.sim-row', h('span', 'Förderrate'), MTRL.dom.segmented(fixture.rates.map((r) => ({ value: r, label: fmt(r, 0) + ' ml/h' })), st.rate, (v) => { st.rate = v; })),
        h('button.btn.primary', { type: 'button', on: { click: runFlow } }, 'Förderratenprüfung starten'),
        fixture.occlusion ? h('button.btn', { type: 'button', on: { click: runOcclusion } }, 'Okklusionstest starten') : null
      );
      const body = h('div.pa', h('div.sim', ctrl, h('div.flow-screen', h('div.sa-brand', 'PUMPENPRÜFGERÄT · TRAINING'), lcd, canvas)), result, occBox);
      const side = MTRL.inst.renderControls(fixture, ctx, () => { clear(result); clear(occBox); });
      container.appendChild(MTRL.inst.frame(this, fixture, body, side));
      background(st.rate * 1.5, 'Flow (ml/h)');
    },
  });
})(window);
