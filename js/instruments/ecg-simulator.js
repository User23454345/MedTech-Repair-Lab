/*
 * EKG-Simulator mit EKG-Schreiber-Darstellung
 * Erzeugt Elektrodenpotentiale (RA, LA, LL) aus einem Herzvektor.
 * Die Fixture bestimmt, was der Prüfling daraus macht (z. B. Kabelbruch,
 * vertauschte Elektroden).
 *
 * Fixture: {
 *   title, hint,
 *   process(electrodes {RA,LA,LL} in mV | null, settings, ctx, t) -> {
 *     leads: [{label, mv:number|null, off?:bool}], hr:number|null, messages:[]
 *   }
 *   onSettings?(settings, ctx), controls?: [...]
 * }
 */
(function (g) {
  'use strict';
  const MTRL = g.MTRL;
  const { h, clear } = MTRL.dom;
  const U = MTRL.util;

  const RHYTHMS = [
    { value: 'sinus', label: 'Sinusrhythmus' },
    { value: 'vf', label: 'Kammerflimmern (VF)' },
    { value: 'asys', label: 'Asystolie' },
    { value: 'cal', label: 'Kalibrierimpuls 1 mV' },
    { value: 'sine10', label: 'Sinus 10 Hz (Frequenzgang)' },
  ];

  /** Herzsignal (Projektion auf Ableitung II, mV) */
  function heartSignal(settings, t) {
    const amp = settings.amp;
    switch (settings.rhythm) {
      case 'sinus': {
        const period = 60 / settings.hr;
        const phase = (t % period) / period;
        return amp * U.ecgShape(phase);
      }
      case 'vf':
        return amp * 0.45 * (Math.sin(2 * Math.PI * 4.7 * t) * 0.7 + Math.sin(2 * Math.PI * 6.3 * t + 1) * 0.4 + U.smoothNoise(3, t) * 0.2);
      case 'asys':
        return 0;
      case 'cal':
        return (t % 2) < 1 ? amp : 0; // 0,5 Hz Rechteck: 1 s an / 1 s aus
      case 'sine10':
        return amp * Math.sin(2 * Math.PI * 10 * t);
      default:
        return 0;
    }
  }

  /** Elektrodenpotentiale für Herzachse 60° (Ableitung II maximal). */
  MTRL.ecgElectrodes = function (settings, t) {
    const s = heartSignal(settings, t);
    const axis = (settings.axis || 60) * (Math.PI / 180);
    const I = s * Math.cos(axis - 0);
    const II = s * Math.cos(axis - Math.PI / 3);
    const RA = -(I + II) / 3;
    return { RA, LA: I + RA, LL: II + RA };
  };

  /** Standard-Verarbeitung eines fehlerfreien 3-Kanal-EKGs (Einthoven). */
  MTRL.ecgStandardLeads = function (e) {
    return [
      { label: 'I', mv: e.LA - e.RA },
      { label: 'II', mv: e.LL - e.RA },
      { label: 'III', mv: e.LL - e.LA },
    ];
  };

  MTRL.ecgRate = function (settings) {
    if (settings.rhythm === 'sinus') return settings.hr;
    return null;
  };

  MTRL.registerInstrument({
    id: 'ecg-simulator',
    name: 'EKG-Simulator',
    short: 'EKG-SIM',
    icon: '💓',
    category: 'Funktionsprüfung',
    description: 'Liefert normierte EKG-Signale (Sinusrhythmus, Kammerflimmern, Asystolie, Kalibrier- und Sinussignale) an die Elektrodenanschlüsse eines EKG-Geräts, Monitors oder Defibrillators.',
    principle:
      '<p>Der Simulator erzeugt an den Elektrodenanschlüssen <b>RA, LA, LL</b> (und RL als Bezug) definierte Potentiale. Daraus bildet das Gerät die Ableitungen nach <b>Einthoven</b>: I = LA − RA, II = LL − RA, III = LL − LA. Mit Kalibrierimpuls (1 mV) und Sinussignalen lassen sich <b>Verstärkung</b> (10 mm/mV) und <b>Frequenzgang</b> prüfen; mit VF/Asystolie die <b>Alarmierung</b> und die Rhythmuserkennung.</p>',
    safety: 'Für Defibrillatoren sind spezielle Defibrillator-Analysatoren mit Lastwiderstand nötig. Niemals einen Defibrillator in einen EKG-Simulator ohne entsprechende Schutzbeschaltung entladen.',
    render(container, fixture, ctx) {
      const settings = Object.assign({ rhythm: 'sinus', hr: 60, amp: 1, axis: 60 }, fixture.defaults || {});
      const fire = () => fixture.onSettings && fixture.onSettings(Object.assign({}, settings), ctx);
      const W = 560;
      const laneH = 90;
      const canvas = h('canvas.ecg-canvas', { role: 'img', 'aria-label': 'EKG-Ausdruck' });
      const lanes = 3;
      const H = laneH * lanes;
      const c2d = MTRL.dom.setupCanvas(canvas, W, H);
      const readout = h('div.ecg-readout');

      const ctrl = h(
        'div.sim-panel',
        h('div.sim-brand', 'EKG-SIMULATOR · TRAINING'),
        h('label.sim-row', h('span', 'Signal'), MTRL.dom.select(RHYTHMS, settings.rhythm, (v) => { settings.rhythm = v; fire(); })),
        MTRL.dom.stepper('Herzfrequenz', settings.hr, { min: 30, max: 240, step: 10, unit: '/min' }, (v) => { settings.hr = v; fire(); }),
        h('div.sim-row', h('span', 'Amplitude (II)'), MTRL.dom.segmented([
          { value: 0.5, label: '0,5 mV' }, { value: 1, label: '1 mV' }, { value: 2, label: '2 mV' },
        ], settings.amp, (v) => { settings.amp = v; fire(); }))
      );

      // EKG-Papier: 25 mm/s, 10 mm/mV; 1 mm = 4 px
      const PX_MM = 4;
      const SPEED = 25 * PX_MM; // px/s
      let x = 0;
      let t = 0;
      const prev = new Array(lanes).fill(null);
      function paper() {
        c2d.fillStyle = '#fff6f4';
        c2d.fillRect(0, 0, W, H);
        c2d.strokeStyle = '#f3b9b0';
        c2d.lineWidth = 0.5;
        for (let xx = 0; xx < W; xx += PX_MM) {
          c2d.globalAlpha = xx % (5 * PX_MM) === 0 ? 0.9 : 0.35;
          c2d.beginPath(); c2d.moveTo(xx + 0.5, 0); c2d.lineTo(xx + 0.5, H); c2d.stroke();
        }
        for (let yy = 0; yy < H; yy += PX_MM) {
          c2d.globalAlpha = yy % (5 * PX_MM) === 0 ? 0.9 : 0.35;
          c2d.beginPath(); c2d.moveTo(0, yy + 0.5); c2d.lineTo(W, yy + 0.5); c2d.stroke();
        }
        c2d.globalAlpha = 1;
      }
      paper();
      let lastInfo = -1;

      MTRL.dom.animate(canvas, (dt) => {
        const steps = Math.max(1, Math.round(dt * SPEED));
        let res = null;
        for (let s = 0; s < steps; s++) {
          const ts = t + (s / steps) * dt;
          const e = MTRL.ecgElectrodes(settings, ts);
          res = fixture.process(e, settings, ctx, ts);
          // Bereich vor dem Schreiber "neu" machen
          if (x === 0) paper();
          res.leads.slice(0, lanes).forEach((ld, i) => {
            const mid = i * laneH + laneH / 2;
            const yv = ld.mv === null || ld.off ? null : mid - ld.mv * 10 * PX_MM;
            c2d.strokeStyle = '#1b1b1b';
            c2d.lineWidth = 1.3;
            if (yv !== null) {
              c2d.beginPath();
              c2d.moveTo(x - 1, prev[i] === null ? yv : prev[i]);
              c2d.lineTo(x, Math.max(i * laneH + 2, Math.min((i + 1) * laneH - 2, yv)));
              c2d.stroke();
            } else if (x % 8 < 4) {
              c2d.fillStyle = '#c0392b';
              c2d.fillRect(x, mid, 1, 1);
            }
            prev[i] = yv;
            if (x === 0) {
              c2d.fillStyle = '#333';
              c2d.font = 'bold 12px system-ui, sans-serif';
              c2d.fillText(ld.label + (ld.off ? '  (Elektrode ab)' : ''), 6, i * laneH + 14);
            }
          });
          x += 1;
          if (x >= W) {
            x = 0;
            prev.fill(null);
          }
        }
        t += dt;
        if (res && Math.floor(t) !== lastInfo) {
          lastInfo = Math.floor(t);
          clear(readout);
          readout.appendChild(h('div.ecg-hr', 'HF (Gerät): ', h('b', res.hr ? String(res.hr) + ' /min' : '---')));
          (res.messages || []).forEach((m) => readout.appendChild(h('span.msg.' + (m.level || 'info'), m.text)));
          readout.appendChild(h('div.muted', '25 mm/s · 10 mm/mV'));
        }
      });

      const body = h('div.sim', ctrl, h('div.sim-cable', { 'aria-hidden': 'true' }, '⟶ RA · LA · LL · RL ⟶'), h('div.ecg-paper', canvas, readout));
      const side = MTRL.inst.renderControls(fixture, ctx, () => fire());
      container.appendChild(MTRL.inst.frame(this, fixture, body, side));
      fire();
    },
  });
})(window);
