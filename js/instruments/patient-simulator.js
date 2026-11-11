/*
 * Multiparameter-Patientensimulator (inkl. SpO2-Funktionstester)
 * Fixture: {
 *   title, hint,
 *   params: ['spo2','hr','perf','resp','nibp','temp'] (Teilmenge),
 *   defaults?: {...settings},
 *   presets?: [{label, settings}],
 *   display(settings, ctx) -> getFrame-kompatibles Objekt (waves/values/messages)
 *   onSettings?(settings, ctx)
 *   controls?: [...]
 * }
 */
(function (g) {
  'use strict';
  const MTRL = g.MTRL;
  const { h } = MTRL.dom;

  const PARAMS = {
    spo2: { label: 'SpO₂', unit: '%', min: 50, max: 100, step: 1 },
    hr: { label: 'Herzfrequenz', unit: '/min', min: 30, max: 240, step: 5 },
    resp: { label: 'Atemfrequenz', unit: '/min', min: 0, max: 60, step: 2 },
    temp: { label: 'Temperatur', unit: '°C', min: 33, max: 42, step: 0.5, digits: 1 },
  };

  MTRL.registerInstrument({
    id: 'patient-simulator',
    name: 'Patientensimulator',
    short: 'SIM',
    icon: '🫀',
    category: 'Funktionsprüfung',
    description: 'Erzeugt definierte physiologische Signale (SpO₂, Herzfrequenz, Perfusion, NIBP, Temperatur, Atmung). So lässt sich der Monitor reproduzierbar prüfen – unabhängig von Patient oder Anwendung.',
    principle:
      '<p>Ein <b>SpO₂-Funktionstester</b> ersetzt den Finger: Er empfängt die Rot-/Infrarot-Lichtimpulse des Sensors und moduliert sie so, wie es ein durchbluteter Finger mit der eingestellten Sättigung täte. Damit prüft man die <b>Funktion der gesamten Messkette</b> (Sensor, Kabel, Modul, Anzeige, Alarme).</p>' +
      '<p><b>Grenze:</b> Ein Funktionstester ist kein Kalibriernormal für die Genauigkeit des Oximeters. Die Kalibrierkurve (R-Wert → SpO₂) ist herstellerspezifisch; der Tester muss zur Gerätekurve passen bzw. nach Herstellervorgabe ausgewählt werden.</p>',
    safety: 'Simulatoren werden anstelle des Patienten angeschlossen – nie gleichzeitig am Patienten verwenden.',
    render(container, fixture, ctx) {
      const params = fixture.params || ['spo2', 'hr', 'perf'];
      const settings = Object.assign({ spo2: 97, hr: 75, perf: 'normal', resp: 15, temp: 37, nibp: '120/80' }, fixture.defaults || {});
      const fire = () => {
        if (fixture.onSettings) fixture.onSettings(Object.assign({}, settings), ctx);
      };

      const ctrl = h('div.sim-panel', h('div.sim-brand', 'PATIENTENSIMULATOR · TRAINING'));
      params.forEach((p) => {
        if (PARAMS[p]) {
          const def = PARAMS[p];
          ctrl.appendChild(MTRL.dom.stepper(def.label, settings[p], { min: def.min, max: def.max, step: def.step, unit: def.unit, digits: def.digits || 0 }, (v) => { settings[p] = v; fire(); }));
        } else if (p === 'perf') {
          ctrl.appendChild(h('div.sim-row', h('span', 'Perfusion'), MTRL.dom.segmented([
            { value: 'high', label: 'hoch' }, { value: 'normal', label: 'normal' }, { value: 'low', label: 'niedrig' },
          ], settings.perf, (v) => { settings.perf = v; fire(); })));
        } else if (p === 'nibp') {
          ctrl.appendChild(h('div.sim-row', h('span', 'NIBP-Vorgabe'), MTRL.dom.segmented([
            { value: '90/60', label: '90/60' }, { value: '120/80', label: '120/80' }, { value: '150/100', label: '150/100' }, { value: '200/150', label: '200/150' },
          ], settings.nibp, (v) => { settings.nibp = v; fire(); })));
        }
      });
      if (fixture.presets) {
        ctrl.appendChild(h('div.sim-row', h('span', 'Prüfpunkte'), h('div.preset-row', fixture.presets.map((pr) =>
          h('button.btn.small', { type: 'button', on: { click: () => { Object.assign(settings, pr.settings); container.innerHTML = ''; MTRL.instruments.get('patient-simulator').render(container, Object.assign({}, fixture, { defaults: Object.assign({}, settings) }), ctx); fire(); } } }, pr.label)
        ))));
      }

      const monHost = h('div.sim-monitor');
      const body = h('div.sim', ctrl, h('div.sim-cable', { 'aria-hidden': 'true' }, '⟶ Prüfling ⟶'), monHost);
      const side = MTRL.inst.renderControls(fixture, ctx, () => fire());
      container.appendChild(MTRL.inst.frame(this, fixture, body, side));
      MTRL.ui.monitorDisplay(monHost, (t) => fixture.display(settings, ctx, t), { title: fixture.monitorTitle || 'Prüfling: Monitoranzeige' });
      fire();
    },
  });
})(window);
