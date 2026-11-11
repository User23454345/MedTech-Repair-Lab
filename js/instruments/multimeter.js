/*
 * Virtuelles Digitalmultimeter
 * Fixture: {
 *   title, hint, modes?: ['ohm','continuity','diode','vdc'],
 *   points: [{id,label,group}],
 *   defaults?: {mode, red, black},
 *   controls?: [...],
 *   measure(mode, red, black, ctx, tick) -> {text, unit, value, beep?, note?}
 *   diagram?(ctx, red, black) -> HTML (SVG)
 * }
 */
(function (g) {
  'use strict';
  const MTRL = g.MTRL;
  const { h, clear } = MTRL.dom;

  const MODES = {
    vdc: { label: 'V⎓', title: 'Gleichspannung' },
    ohm: { label: 'Ω', title: 'Widerstand' },
    continuity: { label: '·)))', title: 'Durchgangsprüfung' },
    diode: { label: '→|', title: 'Diodentest' },
  };

  MTRL.registerInstrument({
    id: 'multimeter',
    name: 'Digitalmultimeter',
    short: 'DMM',
    icon: '🔌',
    category: 'Elektrische Grundmessung',
    description: 'Misst Spannung, Widerstand, Durchgang und Diodenflussspannung. Grundwerkzeug für Kabel-, Sensor- und Versorgungsprüfungen.',
    principle:
      '<p>Im <b>Widerstandsbereich</b> speist das Multimeter einen kleinen Messstrom ein und berechnet R = U / I. Eine unterbrochene Leitung zeigt „OL“ (Overload, Bereich überschritten). Die <b>Durchgangsprüfung</b> piept unterhalb einer Schwelle (typisch einige 10 Ω). Im <b>Diodentest</b> wird ca. 1 mA eingeprägt und die Flussspannung angezeigt – so lassen sich z. B. LEDs und Photodioden in Sensoren prüfen.</p>' +
      '<p><b>Wichtig:</b> Widerstands- und Durchgangsmessungen nur an spannungsfreien Prüflingen. Das Gerät muss vom Netz getrennt und – falls vorhanden – Akkus entfernt bzw. Kondensatoren nach Herstellervorgabe entladen sein.</p>',
    safety: 'Messungen an netzbetriebenen oder Hochspannungsbaugruppen (z. B. Defibrillator) sind realen, qualifizierten Fachkräften nach Herstellerunterlagen vorbehalten. In dieser Simulation besteht keine Gefahr.',
    render(container, fixture, ctx) {
      const modes = fixture.modes || ['vdc', 'ohm', 'continuity', 'diode'];
      const d = fixture.defaults || {};
      const st = { mode: d.mode || modes[0], red: d.red || '', black: d.black || '', tick: 0, hold: false };

      const lcdValue = h('div.lcd-value', '----');
      const lcdUnit = h('div.lcd-unit', '');
      const lcdFlags = h('div.lcd-flags');
      const note = h('div.dmm-note');
      const diagram = h('div.dmm-diagram');
      const lcd = h('div.lcd', lcdFlags, h('div.lcd-main', lcdValue, lcdUnit));

      const pointOpts = [{ value: '', label: '– nicht angeschlossen –' }].concat(
        fixture.points.map((p) => ({ value: p.id, label: p.label, group: p.group }))
      );

      const redSel = MTRL.dom.select(pointOpts, st.red, (v) => {
        st.red = v;
        update(true);
      }, { 'aria-label': 'Rote Messspitze' });
      const blackSel = MTRL.dom.select(pointOpts, st.black, (v) => {
        st.black = v;
        update(true);
      }, { 'aria-label': 'Schwarze Messspitze' });

      const modeSel = MTRL.dom.segmented(
        modes.map((m) => ({ value: m, label: MODES[m].label, title: MODES[m].title })),
        st.mode,
        (v) => {
          st.mode = v;
          update(true);
        },
        'dial'
      );

      const holdBtn = h('button.btn.small', { type: 'button', on: { click: () => { st.hold = !st.hold; holdBtn.classList.toggle('active', st.hold); update(true); } } }, 'HOLD');
      const swapBtn = h('button.btn.small', { type: 'button', on: { click: () => { const t = st.red; st.red = st.black; st.black = t; redSel.value = st.red; blackSel.value = st.black; update(true); } } }, 'Messspitzen tauschen');

      let last = null;
      function update(force) {
        if (st.hold && !force) return;
        const r =
          st.hold && last
            ? last
            : st.red && st.black
            ? fixture.measure(st.mode, st.red, st.black, ctx, st.tick)
            : { text: st.mode === 'vdc' ? '0,00' : 'OL', unit: st.mode === 'vdc' || st.mode === 'diode' ? 'V' : 'Ω' };
        last = r;
        lcdValue.textContent = r.text;
        lcdUnit.textContent = r.unit || '';
        clear(lcdFlags);
        lcdFlags.appendChild(h('span', 'AUTO'));
        lcdFlags.appendChild(h('span', MODES[st.mode].title.toUpperCase()));
        if (st.hold) lcdFlags.appendChild(h('span.on', 'HOLD'));
        if (r.beep) lcdFlags.appendChild(h('span.on.beep', '🔊 Piep'));
        lcd.classList.toggle('beeping', !!r.beep);
        note.innerHTML = r.note ? r.note : '';
        if (fixture.diagram) diagram.innerHTML = fixture.diagram(ctx, st.red, st.black);
      }

      const body = h(
        'div.dmm',
        h('div.dmm-body', h('div.dmm-brand', 'DMM 4½ · TRAINING'), lcd, h('div.dmm-btnrow', holdBtn), modeSel,
          h('div.dmm-jacks',
            h('label.jack.red', h('span.jack-dot'), h('span', 'Rot (V Ω →|)'), redSel),
            h('label.jack.black', h('span.jack-dot'), h('span', 'Schwarz (COM)'), blackSel)
          ),
          swapBtn
        ),
        note
      );
      const controls = MTRL.inst.renderControls(fixture, ctx, () => update(true));
      container.appendChild(MTRL.inst.frame(this, fixture, body, h('div', controls, diagram)));
      update(true);
      MTRL.inst.every(body, 450, () => {
        st.tick++;
        update(false);
      });
    },
  });
})(window);
