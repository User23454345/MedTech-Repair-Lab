/*
 * Servicefall VENT-01: Beatmungsgerät meldet zu niedriges Atemminutenvolumen
 * ------------------------------------------------------------------
 * Definierter Fehler (deterministisch):
 *   Der exspiratorische Flowsensor (Hitzdraht-Prinzip im Lernmodell) ist durch
 *   eingetrocknetes Medikamentenaerosol/Sekret und Kondensat verunreinigt. Er
 *   misst den Ausatemflow ca. 22 % zu niedrig. Die TATSÄCHLICHE Abgabe des
 *   Geräts ist korrekt – es handelt sich um einen MESSFEHLER, nicht um eine
 *   Leckage und nicht um einen Einstellungsfehler.
 *
 * Alle Messwerte werden aus dem Zustand (state) berechnet:
 *   state.flowSensor: 'original' | 'test' | 'new'   (exspiratorischer Flowsensor)
 *   state.circuit:    'original' | 'new'            (Patientenschlauchsystem)
 *   state.disconnect: Testlunge am Y-Stück diskonnektiert (nur Alarmprüfung)
 *
 * Physik (Lernmodell): Testlunge C = 50 ml/mbar, R = 5 mbar/(l/s), volumen-
 * kontrolliert mit konstantem Flow, I:E = 1:2:
 *   Ppeak = PEEP + VT/C + R · V̇insp,   τ = R · C = 0,25 s
 * Schlauchsystem-Leckage über Leitwert G (ml/(min·mbar)): Q = G · p,
 * Druckabfall im geschlossenen System dp/dt = Q / C_Schlauch.
 *
 * Hinweis: Servicemenü, Meldetexte, Grenzwerte und Toleranzen sind FIKTIV
 * (Lernmodell) und entsprechen keinem realen Hersteller.
 */
(function () {
  'use strict';
  const U = MTRL.util;
  const fmt = U.fmt;

  /* ======================= Lernmodell: Parameter ======================= */
  const C_LUNG = 50; // ml/mbar – Testlunge
  const R_LUNG = 5; // mbar/(l/s) – Testlunge
  const TAU = (R_LUNG * C_LUNG) / 1000; // s – Zeitkonstante der passiven Exspiration (0,25 s)
  const C_CIRC = 1.5; // ml/mbar – Kompressionsvolumen des Schlauchsystems (Lernmodell)
  const LEAK_G = { original: 0.12, new: 0.09 }; // ml/(min·mbar) – Leckleitwert Schlauchsystem (dicht)
  const STATION = { vt: 450, rate: 14, peep: 8, fio2: 40 }; // Einstellung laut ärztlicher Anordnung
  const ALARM_STATION = { vteLow: 380, mvLow: 5.0 }; // Alarmgrenzen auf Station (plausibel gewählt)
  const TOL = { vt: { rel: 0.1, abs: 15 }, rate: { abs: 1 }, peep: { abs: 1.5 }, ppeak: { abs: 2 }, fio2: { abs: 3 } }; // Beispieltoleranzen (Lernmodell)
  const CAL_RANGE = 0.1; // ±10 %: Korrekturbereich der Flowsensor-Kalibrierung (fiktiv)

  /** Empfindlichkeitsfaktor des exspiratorischen Flowsensors. */
  function sensorGain(kind, flowInsp) {
    if (kind === 'original') return 0.79 - 0.03 * flowInsp; // Ablagerungen isolieren den Hitzdraht → misst zu wenig
    if (kind === 'test') return 1.0;
    return 0.998; // neuer Sensor nach Kalibrierung
  }
  const sensorOffset = (kind) => (kind === 'test' ? 2 : kind === 'new' ? 1 : 0); // ml

  /**
   * Ein Atemzyklus an der Testlunge.
   * Liefert tatsächliche Abgabe (Referenz) und Anzeige des Geräts.
   */
  function breath(s, st) {
    const T = 60 / s.rate;
    const ti = T / 3; // I:E = 1:2
    const flowInsp = s.vt / 1000 / ti; // l/s, konstanter Flow (VC)
    const g = LEAK_G[st.circuit === 'new' ? 'new' : 'original'];
    const pMean = s.peep + s.vt / C_LUNG / 3; // grobe Näherung des mittleren Drucks
    const leakMl = (g * pMean * T) / 60; // Volumenverlust pro Atemzug (praktisch vernachlässigbar)
    const vtDel = s.vt - leakMl;
    const ppeak = s.peep + vtDel / C_LUNG + R_LUNG * flowInsp;
    const ref = { vt: vtDel, rate: s.rate, peep: s.peep + 0.1, ppeak, fio2: s.fio2 + 0.5 };
    const k = sensorGain(st.flowSensor, flowInsp);
    const vti = Math.round(vtDel * 1.004 + 1); // interner inspiratorischer Flowsensor – in Ordnung
    const vte = Math.round(vtDel * k + sensorOffset(st.flowSensor));
    const mv = (vte * s.rate) / 1000;
    const leakPct = Math.max(0, ((vti - vte) / vti) * 100);
    const device = { vt: vte, rate: s.rate, peep: s.peep, ppeak: ppeak + 0.3, fio2: s.fio2 };
    return { T, ti, flowInsp, k, ref, device, vti, vte, mv, leakPct };
  }

  /** Alarmlogik im Prüfaufbau (Lernmodell): Grenzen an die Einstellung gekoppelt (80 %). */
  function testAlarms(s, b) {
    const alarms = [];
    if (b.vte < 0.8 * s.vt) alarms.push({ text: '!! VTe NIEDRIG', level: 'high' });
    if (b.mv < (0.8 * s.vt * s.rate) / 1000) alarms.push({ text: '!! ATEMMINUTENVOLUMEN NIEDRIG', level: 'high' });
    if (b.leakPct > 15) alarms.push({ text: 'Leckage hoch (berechnet ' + fmt(b.leakPct, 0) + ' %)', level: 'med' });
    return alarms;
  }

  /** Messung für den Beatmungsanalysator. */
  function measure(s, st, allowDisconnect) {
    if (allowDisconnect && st.disconnect) {
      // Testlunge am Y-Stück abgezogen: kein Volumen am Analysator, Gerät erkennt Diskonnektion
      return {
        ref: { vt: 0, rate: 0, peep: 0, ppeak: 0, fio2: 20.9 },
        device: { vt: 0, rate: s.rate, peep: 0.2, ppeak: 0.6, fio2: s.fio2 },
        alarms: [
          { text: '!!! DISKONNEKTION', level: 'high' },
          { text: '!! ATEMMINUTENVOLUMEN NIEDRIG', level: 'high' },
          { text: '!! PEEP NIEDRIG', level: 'high' },
        ],
      };
    }
    const b = breath(s, st);
    return { ref: b.ref, device: b.device, alarms: testAlarms(s, b) };
  }

  const flowOk = (set, val, t) => Math.abs(val - set) <= Math.max(t.abs || 0, (t.rel || 0) * set);

  function ensure(st, key) {
    if (!Array.isArray(st[key])) st[key] = [];
    return st[key];
  }

  /* ======================= Geräteanzeige (Fehlerbild) ======================= */

  function ventFrame(st, s) {
    const b = breath(s, st);
    const alarmVte = b.vte < ALARM_STATION.vteLow;
    const alarmMv = b.mv < ALARM_STATION.mvLow;
    const pAt = (ph) => {
      if (ph < b.ti) return s.peep + R_LUNG * b.flowInsp + (b.flowInsp * ph * 1000) / C_LUNG;
      return s.peep + (b.ref.ppeak - s.peep) * 0.12 * Math.exp(-(ph - b.ti) / 0.08);
    };
    const flowAt = (ph) => {
      if (ph < b.ti) return b.flowInsp;
      // Exspirationsflow aus Sicht des Geräts = tatsächlicher Flow × Sensorfaktor
      return -(b.ref.vt / 1000 / TAU) * Math.exp(-(ph - b.ti) / TAU) * b.k;
    };
    const waves = [
      { id: 'paw', label: 'Paw', color: '#ffd23f', fn: (t) => U.clamp((pAt(t % b.T) / 25) * 1.6 - 0.8, -1, 1) },
      { id: 'flow', label: 'Flow', color: '#38d6ff', fn: (t) => U.clamp(flowAt(t % b.T) / 1.8, -1, 1) },
    ];
    const values = [
      { id: 'ppeak', label: 'Ppeak', value: fmt(b.device.ppeak, 0), unit: 'mbar', color: '#ffd23f' },
      { id: 'peep', label: 'PEEP', value: fmt(b.device.peep, 0), unit: 'mbar', color: '#ffd23f' },
      { id: 'vti', label: 'VTi', value: String(b.vti), unit: 'ml', color: '#38d6ff' },
      { id: 'vte', label: 'VTe', value: String(b.vte), unit: 'ml', color: '#38d6ff', alarm: alarmVte, sub: 'Grenze < ' + ALARM_STATION.vteLow },
      { id: 'mv', label: 'MV', value: fmt(b.mv, 1), unit: 'l/min', color: '#38d6ff', alarm: alarmMv, sub: 'Grenze < ' + fmt(ALARM_STATION.mvLow, 1) },
      { id: 'f', label: 'f', value: String(s.rate), unit: '/min', color: '#f5f5f5' },
      { id: 'fio2', label: 'FiO₂', value: String(b.device.fio2), unit: '%', color: '#f5f5f5' },
    ];
    const messages = [];
    if (alarmMv) messages.push({ text: '!! ATEMMINUTENVOLUMEN NIEDRIG', level: 'high' });
    if (alarmVte) messages.push({ text: '!! VTe NIEDRIG', level: 'high' });
    if (b.leakPct > 15) messages.push({ text: 'Leckage ' + fmt(b.leakPct, 0) + ' % (berechnet)', level: 'med' });
    return { waves, values, messages };
  }

  /* ======================= Fixtures ======================= */

  const sensorControl = {
    id: 'flowSensor',
    type: 'select',
    label: 'Exspiratorischer Flowsensor im Prüfaufbau',
    options: [
      { value: 'original', label: 'Original-Flowsensor des Geräts' },
      { value: 'test', label: 'Bekannt guter Testsensor (Werkstatt, kalibriert)' },
    ],
    help: 'Tausch nach Gebrauchsanweisung (Handschuhe – Sensor ist potenziell kontaminiert). Nach dem Einsetzen führt das Gerät die vorgesehene Sensorprüfung durch.',
    get: (ctx) => ctx.state.flowSensor,
    set: (ctx, v) => {
      ctx.state.flowSensor = v;
    },
    visible: (ctx) => !ctx.repaired,
  };
  const circuitControl = {
    id: 'circuit',
    type: 'select',
    label: 'Patientenschlauchsystem',
    options: [
      { value: 'original', label: 'Original-Schlauchsystem (von Station)' },
      { value: 'new', label: 'Neues Schlauchsystem (originalverpackt)' },
    ],
    get: (ctx) => ctx.state.circuit,
    set: (ctx, v) => {
      ctx.state.circuit = v;
    },
  };
  const disconnectControl = {
    id: 'disconnect',
    type: 'toggle',
    label: 'Alarmprüfung: Testlunge am Y-Stück diskonnektieren',
    help: 'Prüft, ob das Gerät eine Diskonnektion erkennt und akustisch/optisch alarmiert.',
    get: (ctx) => ctx.state.disconnect,
    set: (ctx, v) => {
      ctx.state.disconnect = v;
    },
  };

  function flowFixture(verify) {
    const fx = {
      title: verify
        ? 'Funktionsprüfung nach Instandsetzung – Beatmungsgerät IV-3 (Lernmodell) mit neuem Flowsensor an Analysator und Testlunge'
        : 'Prüfling: Beatmungsgerät IV-3 (Lernmodell) · Beatmungsanalysator · Testlunge (C = 50 ml/mbar, R = 5 mbar/(l/s))',
      defaults: verify ? { vt: 500, rate: 12, peep: 5, fio2: 40 } : Object.assign({}, STATION),
      tolerances: TOL,
      hint: verify
        ? 'Prüfe die Beatmung bei <b>mindestens zwei unterschiedlichen Einstellungen</b> (z. B. VT 500 ml/f 12 und VT 400 ml/f 16). Alle Werte müssen in beiden Spalten „i. O.“ sein. Führe danach die <b>Alarmprüfung</b> (Diskonnektion) durch. Toleranzen: Beispielwerte im Lernmodell – reale Toleranzen nach Herstellerunterlagen.'
        : 'Der Analysator sitzt zwischen Y-Stück und Testlunge und misst die <b>tatsächlich abgegebenen</b> Werte (Referenz). Vergleiche drei Größen: <b>Einstellung</b> → <b>Analysator</b> (stimmt die Abgabe?) → <b>Anzeige Gerät</b> (stimmt die Gerätemessung? Angezeigt wird das exspiratorische VTe). Nutze die Auswahl rechts für <b>Tauschtests</b> und prüfe mehr als eine Einstellung. Toleranzen und Alarmgrenzen im Prüfaufbau: Beispielwerte (Lernmodell). <br><span class="warn-inline">⚠ Prüfungen nie am Patienten.</span>',
      controls: verify ? [disconnectControl] : [sensorControl, circuitControl],
      measure: (s, ctx) => measure(s, ctx.state, verify),
      onResult(data, ctx) {
        const st = ctx.state;
        const s = data.settings;
        const m = data.m;
        if (verify) {
          if (!ctx.repaired || st.flowSensor !== 'new') return;
          if (st.disconnect) {
            if (m.alarms.some((a) => a.text.indexOf('DISKONNEKTION') >= 0)) ctx.addFinding('fc_alarm_ok', 'Beatmungsanalysator (Alarmprüfung)');
            return;
          }
          if (data.ok) {
            const pts = ensure(st, 'verifyPoints');
            const key = s.vt + '/' + s.rate;
            if (!pts.includes(key)) pts.push(key);
            if (pts.length >= 2) ctx.addFinding('fc_flow_ok', 'Beatmungsanalysator');
          }
          return;
        }
        if (ctx.repaired) return;
        const deliveryOk = flowOk(s.vt, m.ref.vt, TOL.vt) && flowOk(s.peep, m.ref.peep, TOL.peep) && flowOk(s.fio2, m.ref.fio2, TOL.fio2);
        const rel = (m.device.vt - m.ref.vt) / m.ref.vt;
        const pressOk = flowOk(m.ref.peep, m.device.peep, TOL.peep) && flowOk(m.ref.ppeak, m.device.ppeak, TOL.ppeak) && flowOk(m.ref.fio2, m.device.fio2, TOL.fio2) && m.ref.rate === m.device.rate;
        if (st.flowSensor === 'original') {
          if (deliveryOk) ctx.addFinding('f_flow_delivery_ok', 'Beatmungsanalysator');
          if (pressOk) ctx.addFinding('f_flow_pressures_ok', 'Beatmungsanalysator');
          if (rel < -0.15) {
            if (st.circuit === 'original') {
              ctx.addFinding('f_flow_device_low', 'Beatmungsanalysator');
              const pts = ensure(st, 'flowPoints');
              const key = s.vt + '/' + s.rate;
              if (!pts.includes(key)) pts.push(key);
              if (pts.length >= 2) ctx.addFinding('f_flow_proportional', 'Beatmungsanalysator');
            } else {
              ctx.addFinding('f_swap_circuit_no_change', 'Beatmungsanalysator (Tauschtest)');
            }
          }
        } else if (st.flowSensor === 'test' && Math.abs(rel) <= 0.05 && deliveryOk) {
          ctx.addFinding('f_swap_sensor_ok', 'Beatmungsanalysator (Tauschtest)');
        }
      },
    };
    return fx;
  }

  const pressureFixture = {
    title: 'Prüfling: Beatmungsgerät IV-3 (Lernmodell) im Servicemodus, Schlauchsystem am Y-Stück verschlossen, Referenzmanometer über T-Stück',
    unit: 'mbar',
    max: 80,
    setpoints: [10, 20, 30, 40, 50],
    tolerance: 2,
    deviceLabel: 'Anzeige Atemwegsdruck (Paw) am Beatmungsgerät',
    hint:
      '<b>1. Statische Druckprüfung:</b> Druckstufen anfahren und die Paw-Anzeige des Geräts mit dem Referenzmanometer vergleichen (Toleranz ±2 mbar – Beispielwert im Lernmodell). <b>2. Dichtheitsprüfung:</b> Schlauchsystem auf 50 mbar bringen und den Druckabfall beobachten (Grenze ≤ 10 mbar/min – Beispielwert). Der Druckabfall ergibt sich aus Leckflow und Kompressionsvolumen: dp/dt = Q<sub>Leck</sub> / C<sub>Schlauch</sub>.<br><span class="warn-inline">⚠ Servicemodus und Prüfdrücke im Lernmodell fiktiv – real nur nach Herstellerunterlagen.</span>',
    controls: [circuitControl],
    deviceReading: (ref) => Math.round(ref * 1.008 + 0.3),
    leak: {
      pressure: 50,
      duration: 60,
      limit: 10,
      rate: (ctx) => (LEAK_G[ctx.state.circuit === 'new' ? 'new' : 'original'] * 50) / C_CIRC, // mbar/min
    },
    onResult(kind, data, ctx) {
      if (ctx.repaired) return;
      if (kind === 'static' && data.ok) ctx.addFinding('f_pressure_sensor_ok', 'Druckmessgerät');
      if (kind === 'leak' && data.ok && ctx.state.circuit === 'original') ctx.addFinding('f_circuit_tight', 'Druckmessgerät (Dichtheit)');
    },
  };

  /** Gerätecheck/Selbsttest (Gerätefunktion, Lernmodell) – Ergebnis hängt vom eingesetzten Sensor ab. */
  function deviceCheck(st) {
    const kind = st.flowSensor;
    const leakMlMin = LEAK_G[st.circuit === 'new' ? 'new' : 'original'] * 50;
    const kRef = sensorGain(kind, 0.5); // Prüfflow 0,5 l/s (fiktiv)
    const dev = (kRef - 1) * 100;
    const calOk = Math.abs(kRef - 1) <= CAL_RANGE;
    const sensorName = kind === 'original' ? 'Original-Flowsensor' : kind === 'test' ? 'Werkstatt-Testsensor' : 'neuer Flowsensor';
    const html =
      '<table class="plain"><tbody>' +
      '<tr><td>Interne Gasversorgung / Ventile</td><td>bestanden</td></tr>' +
      '<tr><td>Drucksensoren (Nullpunkt)</td><td>bestanden</td></tr>' +
      `<tr><td>Dichtheit Schlauchsystem</td><td><b>bestanden</b> – Leckage ${fmt(leakMlMin, 1)} ml/min bei 50 mbar</td></tr>` +
      `<tr><td>Compliance Schlauchsystem</td><td>${fmt(C_CIRC, 1)} ml/mbar (wird bei der Volumenberechnung kompensiert)</td></tr>` +
      `<tr><td>Exspiratorischer Flowsensor (${sensorName})</td><td>${calOk ? '<b>Kalibrierung bestanden</b>' : '<b>Kalibrierung NICHT bestanden</b>'} – Abweichung zum internen Referenzflow ${dev > 0 ? '+' : ''}${fmt(dev, 1)} % (Korrekturbereich ±${fmt(CAL_RANGE * 100, 0)} %)</td></tr>` +
      '<tr><td>O₂-Sensor</td><td>bestanden (21 % / 100 %)</td></tr>' +
      '</tbody></table>' +
      `<p>${calOk ? 'Gerätecheck <b>bestanden</b>.' : 'Gerätecheck <b>mit Einschränkung</b>: Meldung „Exspiratorischen Flowsensor prüfen/ersetzen“.'}</p>` +
      '<p class="muted">Ablauf und Meldetexte des Gerätechecks sind herstellerspezifisch; hier: fiktives Lernmodell. Der interne Referenzflow stammt vom inspiratorischen Flowsensor/Dosierventil.</p>';
    return { html, calOk };
  }

  /* ======================= Fallbeschreibung ======================= */

  MTRL.registerCase({
    id: 'vent-flow-sensor-drift',
    deviceId: 'ventilator',
    title: 'Beatmungsgerät meldet zu niedriges Atemminutenvolumen',
    short: 'VTe/MV zu niedrig',
    difficulty: 'Fortgeschritten',
    duration: '35–50 min',
    tags: ['Sensorfehler', 'Messabweichung', 'Fehlalarm', 'Abgrenzung Leckage', 'Beatmungsanalysator'],
    summary:
      'Ein Intensiv-Beatmungsgerät alarmiert wiederholt „Atemminutenvolumen niedrig“, das angezeigte VTe liegt deutlich unter dem eingestellten Tidalvolumen – der Patient ist jedoch klinisch stabil. Gibt das Gerät zu wenig ab, gibt es eine Leckage – oder misst es nur falsch?',
    minFindingsForCauses: 6,

    situation: {
      ticket: {
        'Auftrag': 'IH-2026-0532 (Übungsauftrag)',
        'Gerät': 'Intensiv-Beatmungsgerät IV-3 (generisches Lernmodell)',
        'Inventarnummer': 'MT-05218',
        'Standort': 'Intensivstation 1, Bett 3',
        'Meldende Person': 'Fachpflegekraft Intensiv, Spätdienst; Rücksprache mit Stationsarzt',
        'Priorität': 'hoch – Patient wurde auf Ersatzgerät umgestellt',
        'Meldetext': '„Ständig Alarm Atemminutenvolumen niedrig, VTe viel niedriger als eingestellt, Gerät zeigt Leckage an. Patient ist aber stabil, Sättigung und BGA gut. Cuff haben wir kontrolliert.“',
      },
      html:
        '<p>Auf Anordnung des Stationsarztes wurde der Patient auf ein Ersatzgerät umgestellt. Das Beatmungsgerät kam mit dem verwendeten <b>Patientenschlauchsystem</b> (inkl. Wasserfalle), aber ohne Befeuchter in die Medizintechnik. Ein <b>Aufbereitungsnachweis</b> (Wischdesinfektion der Oberflächen) liegt bei; das Schlauchsystem ist als „kontaminiert“ gekennzeichnet und im Beutel verpackt.</p>' +
        '<p>Deine Aufgabe: Klären, ob das Gerät <b>zu wenig abgibt</b> (Gefahr für den Patienten), ob eine <b>Leckage</b> vorliegt oder ob nur die <b>Messung</b> falsch ist. Danach fachgerecht instand setzen, prüfen, dokumentieren und freigeben.</p>',
      checklist: [
        'Patientenversorgung gesichert? – Ja, Ersatzgerät im Einsatz.',
        'Aufbereitungsnachweis vorhanden? – Ja (Oberflächen); Schlauchsystem und Flowsensor gelten weiterhin als potenziell kontaminiert → Schutzhandschuhe.',
        'Gerät eindeutig identifiziert (Inventarnummer, Typ, Seriennummer)? – Ja.',
        'Zubehör mitgeliefert? – Schlauchsystem mit Wasserfalle; Befeuchter verblieb auf Station.',
        'Prüfmittel verfügbar und kalibriert? – Beatmungsanalysator, Testlunge, Referenzmanometer: Kalibrierung gültig.',
      ],
    },

    symptom: {
      html:
        '<p>In der Werkstatt wird das Gerät mit dem <b>Original-Schlauchsystem</b> an eine <b>Testlunge</b> angeschlossen und mit den Stationseinstellungen betrieben: <b>VC-CMV, VT 450 ml, f 14/min, PEEP 8 mbar, FiO₂ 40 %</b>. Nach kurzer Zeit erscheinen dieselben Alarme wie auf Station.</p>' +
        '<p>Auffällig: Das <b>inspiratorische</b> Volumen (VTi) passt zur Einstellung, das <b>exspiratorische</b> Volumen (VTe) ist deutlich kleiner. In der Flowkurve ist die Fläche unter dem Exspirationsflow sichtbar kleiner als die unter dem Inspirationsflow. Das Gerät berechnet daraus eine „Leckage“ von über 20 %.</p>',
      displayTitle: 'Beatmungsgerät IV-3 (Lernmodell) – Probebeatmung an Testlunge',
      display: (st) => {
        const shown = Object.assign({}, st, { flowSensor: st.flowSensor === 'new' ? 'new' : 'original', circuit: st.circuit });
        return ventFrame(shown, STATION);
      },
      observations: [
        'VTi entspricht der Einstellung, VTe ist um rund ein Fünftel kleiner.',
        'Atemwegsdruck, PEEP und FiO₂ werden plausibel angezeigt.',
        'Laut Station ist der Patient klinisch stabil – ein Widerspruch zum Alarm.',
        'Die „Leckage“-Anzeige wird vom Gerät aus der Differenz VTi − VTe berechnet.',
      ],
    },

    basics: [
      {
        title: 'Grundbegriffe der maschinellen Beatmung',
        html:
          '<ul><li><b>Tidalvolumen (VT)</b>: Volumen eines Atemzugs. <b>VTi</b> = inspiratorisch abgegeben, <b>VTe</b> = exspiratorisch gemessen.</li>' +
          '<li><b>Atemminutenvolumen (MV)</b> = VTe · Atemfrequenz (z. B. 450 ml · 14/min = 6,3 l/min).</li>' +
          '<li><b>PEEP</b>: positiver endexspiratorischer Druck – hält die Alveolen offen.</li>' +
          '<li><b>Ppeak</b>: Spitzendruck am Ende der Inspiration.</li>' +
          '<li><b>FiO₂</b>: inspiratorische Sauerstofffraktion.</li>' +
          '<li><b>VC-CMV</b> (volumenkontrolliert, kontrolliert mandatorisch): Das Gerät gibt ein festes Volumen mit konstantem Flow ab; der Druck ergibt sich aus Lungeneigenschaften.</li></ul>',
      },
      {
        title: 'Testlunge: Compliance, Resistance und Spitzendruck',
        html:
          '<p>Eine Testlunge bildet die Lunge mit zwei Größen nach: <b>Compliance C</b> (Dehnbarkeit, ml/mbar) und <b>Resistance R</b> (Strömungswiderstand, mbar/(l/s)). Bei konstantem Inspirationsflow V̇ gilt näherungsweise:</p>' +
          '<p class="formula">Ppeak = PEEP + VT / C + R · V̇</p>' +
          '<p>Beispiel (VT 450 ml, f 14/min, I:E 1:2 → Ti ≈ 1,43 s, V̇ ≈ 0,31 l/s; C = 50 ml/mbar, R = 5 mbar/(l/s)): Ppeak ≈ 8 + 9 + 1,6 ≈ 18,6 mbar. Die passive Ausatmung folgt einer e-Funktion mit der <b>Zeitkonstante τ = R · C</b> = 0,25 s.</p>' +
          '<p>Weil C und R bekannt und konstant sind, liefert die Testlunge <b>reproduzierbare</b> Bedingungen – anders als ein Patient. Prüfungen am Beatmungsgerät werden deshalb nie am Patienten durchgeführt.</p>',
      },
      {
        title: 'Flowmessung im Beatmungsgerät',
        html:
          '<p>Verbreitete Messprinzipien:</p>' +
          '<ul><li><b>Hitzdraht-Anemometer</b>: Ein beheizter, sehr dünner Draht wird vom Gasstrom gekühlt. Die Heizleistung, die nötig ist, um seine Temperatur konstant zu halten, steigt mit dem Flow. <b>Ablagerungen</b> (eingetrocknetes Sekret, Medikamentenaerosol) wirken wie eine <b>Wärmeisolation</b> – der Draht gibt weniger Wärme ab, der Flow wird <b>zu niedrig</b> gemessen. Kondensat kann die Messung zusätzlich instabil machen.</li>' +
          '<li><b>Differenzdruck-Prinzip</b> (Pneumotachograph, Blende/Klappe): Der Druckabfall über einem definierten Strömungswiderstand ist ein Maß für den Flow. Feuchtigkeit und Ablagerungen verändern den Widerstand bzw. verlegen die Druckmessleitungen.</li></ul>' +
          '<p>Viele Geräte haben einen <b>internen inspiratorischen</b> Flowsensor (geschützt, trocken) und einen <b>exspiratorischen</b> Flowsensor, der das feuchte, ggf. mit Sekret und Aerosol belastete Ausatemgas misst. Der exspiratorische Sensor ist deshalb ein typisches <b>Verschleiß- bzw. Aufbereitungsteil</b>. Er wird über eine <b>Gerätefunktion</b> nach Herstellervorgabe kalibriert – Abweichungen außerhalb des Korrekturbereichs lassen sich nicht „wegkalibrieren“.</p>',
      },
      {
        title: 'Abgabefehler oder Messfehler? – Der Dreier-Vergleich',
        html:
          '<p>Mit einem Beatmungsanalysator an der Testlunge vergleicht man <b>drei</b> Werte: Einstellung, <b>tatsächliche Abgabe</b> (Analysator = Referenz) und <b>Anzeige des Geräts</b>.</p>' +
          '<table class="plain"><thead><tr><th>Befund</th><th>Einstellung ↔ Analysator</th><th>Analysator ↔ Anzeige</th><th>Typische Ursache</th></tr></thead><tbody>' +
          '<tr><td><b>Messfehler</b></td><td>stimmt</td><td>weicht ab</td><td>Flowsensor verschmutzt, feucht, nicht kalibriert</td></tr>' +
          '<tr><td><b>Leckage</b></td><td>VT an der Lunge zu klein, PEEP fällt ab</td><td>VTe stimmt meist mit dem Analysator überein</td><td>Schlauchsystem, Wasserfalle, Exspirationsventil, (am Patienten: Cuff)</td></tr>' +
          '<tr><td><b>Abgabefehler</b></td><td>weicht ab</td><td>VTi zeigt evtl. trotzdem Sollwert</td><td>Dosierventil, Inspirationsventil, Gasversorgung</td></tr>' +
          '<tr><td><b>Einstellungsfehler</b></td><td>stimmt mit der (falschen) Einstellung</td><td>stimmt</td><td>Einstellung/Alarmgrenzen passen nicht zur Anordnung</td></tr>' +
          '</tbody></table>' +
          '<p>Wichtig: Die vom Gerät angezeigte „Leckage“ wird häufig nur aus <b>VTi − VTe</b> berechnet. Misst der exspiratorische Sensor zu wenig, sieht das für das Gerät genauso aus wie eine echte Leckage!</p>',
      },
      {
        title: 'Systematische Fehlersuche am Beatmungsgerät',
        html:
          '<ol><li><b>Patientensicherheit zuerst</b>: Ersatzgerät, Prüfung nur an Testlunge.</li>' +
          '<li><b>Anamnese und Einstellungen</b>: Was wurde gemeldet? Passt die Einstellung zur ärztlichen Anordnung? Klinischer Zustand?</li>' +
          '<li><b>Gerätecheck/Selbsttest</b> nach Gebrauchsanweisung (Dichtheit, Sensoren).</li>' +
          '<li><b>Dreier-Vergleich mit Analysator</b> bei mehreren Einstellungen.</li>' +
          '<li><b>Tauschtests mit bekannt guten Teilen</b> (Flowsensor, Schlauchsystem) – eine Änderung nach der anderen.</li>' +
          '<li>Erst dann instand setzen, danach Funktions- und Alarmprüfung.</li></ol>' +
          '<div class="callout warn">Flowsensoren und Schlauchsysteme sind potenziell kontaminiert: Handschuhe, Aufbereitung nach Hygieneplan und Herstellerangaben.</div>',
      },
    ],

    findings: [
      { id: 'f_user_patient_stable', text: 'Station: Patient klinisch stabil (SpO₂ 96 %, BGA im Normbereich, seitengleiche Thoraxbewegung) trotz MV-Alarm', cat: 'Anamnese' },
      { id: 'f_user_nebulizer', text: 'Station: Alarme seit ca. 2 Tagen, seit Beginn einer Medikamentenvernebelung; Exspirationsfilter war nicht eingesetzt', cat: 'Anamnese' },
      { id: 'f_visual_sensor_deposits', text: 'Sichtprüfung: exspiratorischer Flowsensor mit weißlich-bräunlichen Ablagerungen und Kondensattropfen', cat: 'Sichtprüfung' },
      { id: 'f_visual_circuit_ok', text: 'Sichtprüfung: Schlauchsystem, Konnektoren und Wasserfalle ohne Risse, fest verbunden', cat: 'Sichtprüfung' },
      { id: 'f_visual_housing_ok', text: 'Sichtprüfung: Gehäuse, Bedienteil, Netz- und Gasanschlüsse ohne Befund', cat: 'Sichtprüfung' },
      { id: 'f_settings_ok', text: 'Einstellungen entsprechen der ärztlichen Anordnung; Alarmgrenzen plausibel (VTe < 380 ml, MV < 5,0 l/min)', cat: 'Einstellungen' },
      { id: 'f_vti_vte_gap', text: 'Gerätewerte an Testlunge: VTi ≈ Einstellung, VTe ca. 22 % niedriger', cat: 'Einstellungen' },
      { id: 'f_leak_calc_high', text: 'Gerät zeigt „Leckage“ > 20 % – berechnet aus VTi − VTe, keine unabhängige Messung', cat: 'Einstellungen' },
      { id: 'f_log_pattern', text: 'Ereignisprotokoll: letzter Gerätecheck vor 5 Tagen bestanden; MV-/VTe-Alarme erst seit 2 Tagen, zunehmend', cat: 'Protokoll' },
      { id: 'f_selftest_leak_ok', text: 'Gerätecheck: Dichtheit des Schlauchsystems bestanden', cat: 'Gerätecheck' },
      { id: 'f_selftest_flowsensor_fail', text: 'Gerätecheck: Kalibrierung des exspiratorischen Flowsensors nicht bestanden (Abweichung außerhalb des Korrekturbereichs)', cat: 'Gerätecheck' },
      { id: 'f_flow_delivery_ok', text: 'Analysator: tatsächlich abgegebenes VT, PEEP und FiO₂ entsprechen der Einstellung (Abgabe korrekt)', cat: 'Messung' },
      { id: 'f_flow_pressures_ok', text: 'Analysator: Druck-, PEEP-, Frequenz- und FiO₂-Anzeige des Geräts stimmen mit der Referenz überein', cat: 'Messung' },
      { id: 'f_flow_device_low', text: 'Analysator: Geräteanzeige VTe ca. 22 % niedriger als die Referenz (Gerätemessung fehlerhaft)', cat: 'Messung' },
      { id: 'f_flow_proportional', text: 'Analysator: Abweichung bei verschiedenen Einstellungen relativ gleich (≈ −22 %) – typisch für Empfindlichkeitsfehler des Sensors', cat: 'Messung' },
      { id: 'f_swap_circuit_no_change', text: 'Tauschtest: neues Schlauchsystem → VTe weiterhin ca. 22 % zu niedrig', cat: 'Tauschtest' },
      { id: 'f_swap_sensor_ok', text: 'Tauschtest: bekannt guter Flowsensor → VTe stimmt mit Analysator überein, keine Alarme', cat: 'Tauschtest' },
      { id: 'f_pressure_sensor_ok', text: 'Statische Druckprüfung: Paw-Anzeige innerhalb Toleranz (Drucksensorik i. O.)', cat: 'Messung' },
      { id: 'f_circuit_tight', text: 'Druckabfallprüfung: Original-Schlauchsystem dicht (ca. 4 mbar/min bei 50 mbar)', cat: 'Messung' },
      { id: 'fc_flow_ok', text: 'Funktionsprüfung: Abgabe und Gerätemessung bei ≥ 2 Einstellungen innerhalb Toleranz', cat: 'Freigabe' },
      { id: 'fc_alarm_ok', text: 'Funktionsprüfung: Diskonnektions- und MV-Alarm werden korrekt ausgelöst', cat: 'Freigabe' },
      { id: 'fc_selftest_ok', text: 'Gerätecheck mit neuem Flowsensor bestanden (inkl. Flowsensor-Kalibrierung)', cat: 'Freigabe' },
      { id: 'fc_final_ok', text: 'Abschluss: Probebeatmung ohne Alarm, Aufbereitung, Sichtprüfung und Kennzeichnung i. O.', cat: 'Freigabe' },
    ],

    investigations: [
      {
        id: 'inv_interview',
        type: 'action',
        category: 'Anamnese',
        icon: '💬',
        title: 'Rücksprache mit der Station',
        minutes: 4,
        desc: 'Klinischer Zustand, Beginn der Alarme, Veränderungen in der Therapie, bisherige Maßnahmen.',
        run: () => ({
          html:
            '<p><b>Fachpflegekraft:</b> „Der Patient ist stabil, Sättigung 96 %, die Blutgasanalyse war heute Mittag völlig in Ordnung, der Thorax hebt sich gleichmäßig. Trotzdem ging alle paar Minuten der Alarm Minutenvolumen niedrig los. Wir haben den Cuffdruck gemessen und alle Schlauchverbindungen nachgedrückt – keine Änderung.“</p>' +
            '<p><b>Frage:</b> Seit wann? Hat sich etwas geändert? – „Seit vorgestern. Da haben wir mit der Inhalation (Vernebelung) angefangen, viermal täglich. Einen extra Filter vor dem Exspirationsteil hatten wir nicht drin. Kondenswasser hatten wir auch ziemlich viel im Schlauch.“</p>' +
            '<p><b>Stationsarzt:</b> „Klinisch sehe ich keinen Hinweis auf eine Hypoventilation. Ich vermute ein Messproblem, wollte aber sicher sein – deshalb das Ersatzgerät.“</p>',
          findings: ['f_user_patient_stable', 'f_user_nebulizer'],
        }),
      },
      {
        id: 'inv_visual',
        type: 'action',
        category: 'Sichtprüfung',
        icon: '🔍',
        title: 'Sichtprüfung von Gerät, Schlauchsystem und Flowsensor',
        minutes: 6,
        desc: 'Gehäuse, Anschlüsse, Schlauchsystem und Wasserfalle; exspiratorischen Flowsensor nach Gebrauchsanweisung entnehmen und begutachten (Handschuhe).',
        run: () => ({
          html:
            '<ul><li>Gehäuse, Bedienteil, Display, Netzkabel, O₂- und Druckluftanschluss: <b>ohne Befund</b>.</li>' +
            '<li>Schlauchsystem: keine Risse, Konnektoren fest, Wasserfalle dicht verschlossen; im Exspirationsschenkel <b>reichlich Kondensat</b>.</li>' +
            '<li><b>Exspiratorischer Flowsensor</b> (entnommen gemäß Gebrauchsanweisung): im Strömungskanal <b>weißlich-bräunliche, krustige Ablagerungen</b> und Kondensattropfen am Messelement. Gehäuse unbeschädigt.</li></ul>' +
            '<div class="figure"><svg viewBox="0 0 360 100" role="img" aria-label="Skizze verschmutzter Flowsensor"><rect x="20" y="30" width="320" height="40" rx="8" fill="#37474f"/><rect x="30" y="40" width="300" height="20" rx="4" fill="#102027"/><line x1="180" y1="40" x2="180" y2="60" stroke="#ffb74d" stroke-width="2"/><circle cx="176" cy="46" r="4" fill="#bcaaa4"/><circle cx="184" cy="54" r="3" fill="#bcaaa4"/><circle cx="160" cy="56" r="3" fill="#90caf9"/><circle cx="205" cy="45" r="2.5" fill="#90caf9"/><circle cx="180" cy="50" r="22" fill="none" stroke="#ff7043" stroke-width="2" stroke-dasharray="4 3"/><text x="180" y="92" fill="#ff7043" font-size="11" text-anchor="middle">Ablagerungen/Kondensat am Messelement (Lernmodell)</text><text x="40" y="22" fill="#cfd8dc" font-size="10">Gasstrom →</text></svg></div>' +
            '<p class="muted">Messelement nicht berühren und nicht mit Druckluft ausblasen – es ist sehr empfindlich.</p>',
          findings: ['f_visual_sensor_deposits', 'f_visual_circuit_ok', 'f_visual_housing_ok'],
        }),
      },
      {
        id: 'inv_settings',
        type: 'action',
        category: 'Einstellungen',
        icon: '🎛️',
        title: 'Einstellungen, Alarmgrenzen und Messwerte am Gerät prüfen',
        minutes: 4,
        desc: 'Einstellung mit der ärztlichen Anordnung abgleichen; Messwerte an der Testlunge ablesen.',
        run: (ctx) => {
          const st = Object.assign({}, ctx.state, { flowSensor: ctx.state.flowSensor === 'new' ? 'new' : ctx.state.flowSensor });
          const b = breath(STATION, st);
          const expMv = (STATION.vt * STATION.rate) / 1000;
          const fault = b.leakPct > 15;
          return {
            html:
              '<table class="plain"><thead><tr><th>Parameter</th><th>Anordnung</th><th>Eingestellt</th><th>Angezeigt (Testlunge)</th></tr></thead><tbody>' +
              `<tr><td>Modus</td><td>VC-CMV</td><td>VC-CMV</td><td>—</td></tr>` +
              `<tr><td>VT</td><td>450 ml</td><td>450 ml</td><td>VTi <b>${b.vti} ml</b> · VTe <b>${b.vte} ml</b></td></tr>` +
              `<tr><td>Frequenz</td><td>14/min</td><td>14/min</td><td>${STATION.rate}/min</td></tr>` +
              `<tr><td>MV</td><td>(≈ ${fmt(expMv, 1)} l/min)</td><td>—</td><td><b>${fmt(b.mv, 1)} l/min</b></td></tr>` +
              `<tr><td>PEEP</td><td>8 mbar</td><td>8 mbar</td><td>${fmt(b.device.peep, 0)} mbar</td></tr>` +
              `<tr><td>FiO₂</td><td>40 %</td><td>40 %</td><td>${b.device.fio2} %</td></tr>` +
              `<tr><td>Leckage (berechnet)</td><td>—</td><td>—</td><td><b>${fmt(b.leakPct, 0)} %</b></td></tr>` +
              `<tr><td>Alarmgrenzen</td><td colspan="2">VTe &lt; ${ALARM_STATION.vteLow} ml, MV &lt; ${fmt(ALARM_STATION.mvLow, 1)} l/min, Ppeak &gt; 35 mbar</td><td>—</td></tr>` +
              '</tbody></table>' +
              '<p>Einstellungen und Alarmgrenzen entsprechen der Anordnung und sind plausibel gewählt. ' +
              (fault
                ? 'Das inspiratorische Volumen passt, das <b>exspiratorische</b> ist deutlich kleiner. Die angezeigte „Leckage“ ist keine eigene Messung, sondern die <b>Differenz VTi − VTe</b>.</p>'
                : 'Mit dem aktuell eingesetzten Sensor stimmen VTi und VTe überein.</p>'),
            findings: fault ? ['f_settings_ok', 'f_vti_vte_gap', 'f_leak_calc_high'] : ['f_settings_ok'],
          };
        },
      },
      {
        id: 'inv_log',
        type: 'action',
        category: 'Protokoll',
        icon: '📜',
        title: 'Ereignis- und Alarmprotokoll auslesen',
        minutes: 4,
        desc: 'Alarmhistorie und Gerätecheck-Ergebnisse der letzten Tage auswerten.',
        run: () => ({
          html:
            '<table class="plain mono"><thead><tr><th>Zeitpunkt</th><th>Ereignis</th></tr></thead><tbody>' +
            '<tr><td>vor 5 Tagen</td><td>Gerätecheck bestanden (Flowsensor-Kalibrierung −1,8 %)</td></tr>' +
            '<tr><td>vor 2 Tagen 08:10</td><td>Vernebelung gestartet (Ereignis vom Bedienteil)</td></tr>' +
            '<tr><td>vor 2 Tagen 15:42</td><td>VTe niedrig · 2×</td></tr>' +
            '<tr><td>gestern</td><td>MV niedrig · 14× · Leckage hoch · 9×</td></tr>' +
            '<tr><td>heute</td><td>MV niedrig · 31× · VTe niedrig · 27×</td></tr>' +
            '</tbody></table><p>Keine Meldungen zu Gasversorgung, Ventilen, Druckbegrenzung oder Elektronik. Der Fehler begann <b>zeitgleich mit der Vernebelung</b> und nimmt zu – passend zu sich anlagernden Rückständen.</p>' +
            '<p class="muted">Protokollinhalte und Meldetexte: fiktives Lernmodell.</p>',
          findings: ['f_log_pattern'],
        }),
      },
      {
        id: 'inv_selftest',
        type: 'action',
        category: 'Gerätecheck',
        icon: '🛠️',
        title: 'Gerätecheck/Selbsttest durchführen (Gerätefunktion)',
        minutes: 6,
        desc: 'Gerätecheck nach Gebrauchsanweisung mit verschlossenem Y-Stück: Dichtheit, Schlauchcompliance, Sensorprüfung und Flowsensor-Kalibrierung.',
        run: (ctx) => {
          const r = deviceCheck(ctx.state);
          const findings = ['f_selftest_leak_ok'];
          if (ctx.state.flowSensor === 'original') findings.push('f_selftest_flowsensor_fail');
          return { html: r.html, findings };
        },
      },
      {
        id: 'inv_flow',
        type: 'instrument',
        instrument: 'flow-analyzer',
        category: 'Messung',
        icon: '🌬',
        title: 'Beatmungsanalysator an Testlunge (inkl. Tauschtests)',
        minutes: 12,
        desc: 'Einstellung, tatsächliche Abgabe und Gerätemessung vergleichen; Flowsensor und Schlauchsystem gegen bekannt gute Teile tauschen.',
        fixture: () => flowFixture(false),
      },
      {
        id: 'inv_pressure',
        type: 'instrument',
        instrument: 'pressure-meter',
        category: 'Messung',
        icon: '⏲',
        title: 'Druckanzeige und Dichtheit des Schlauchsystems (Referenzmanometer)',
        minutes: 10,
        desc: 'Statische Druckprüfung der Paw-Anzeige und Druckabfallprüfung des verschlossenen Schlauchsystems.',
        fixture: () => pressureFixture,
      },
      /* ---------- Prüfungen nach der Instandsetzung ---------- */
      {
        id: 'inv_verify_flow',
        type: 'instrument',
        instrument: 'flow-analyzer',
        phase: 'verify',
        category: 'Freigabe',
        icon: '✅',
        title: 'Funktionsprüfung mit Beatmungsanalysator nach Instandsetzung (inkl. Alarmprüfung)',
        minutes: 12,
        desc: 'Mindestens zwei Einstellungen prüfen, anschließend Diskonnektionsalarm auslösen.',
        fixture: () => flowFixture(true),
      },
      {
        id: 'inv_verify_selftest',
        type: 'action',
        phase: 'verify',
        category: 'Freigabe',
        icon: '🛠️',
        title: 'Gerätecheck mit neuem Flowsensor',
        minutes: 6,
        desc: 'Gerätecheck inkl. Flowsensor-Kalibrierung nach Gebrauchsanweisung wiederholen.',
        run: (ctx) => {
          if (ctx.state.flowSensor !== 'new') return { html: '<p>Bitte zuerst die Instandsetzung durchführen.</p>', findings: [] };
          const r = deviceCheck(ctx.state);
          return { html: r.html, findings: r.calOk ? ['fc_selftest_ok'] : [] };
        },
      },
      {
        id: 'inv_verify_final',
        type: 'action',
        phase: 'verify',
        category: 'Freigabe',
        icon: '🏁',
        title: 'Probebeatmung, Aufbereitung und abschließende Sichtprüfung',
        minutes: 15,
        desc: 'Probebeatmung über 10 min mit Stationseinstellungen, Aufbereitung nach Hygieneplan, Kennzeichnung.',
        run: (ctx) => {
          const st = ctx.state;
          if (st.flowSensor !== 'new') return { html: '<p>Bitte zuerst die Instandsetzung durchführen.</p>', findings: [] };
          const b = breath(STATION, Object.assign({}, st, { disconnect: false }));
          return {
            html:
              `<p>Probebeatmung an der Testlunge mit Stationseinstellungen über 10 min: VTi <b>${b.vti} ml</b>, VTe <b>${b.vte} ml</b>, MV <b>${fmt(b.mv, 1)} l/min</b>, Ppeak ${fmt(b.device.ppeak, 0)} mbar, PEEP ${fmt(b.device.peep, 0)} mbar, berechnete Leckage ${fmt(b.leakPct, 0)} % – <b>keine Alarme</b>.</p>` +
              '<p>Das in der Werkstatt verwendete Schlauchsystem wird verworfen; das Gerät wird nach Hygieneplan aufbereitet und mit neuem, originalverpacktem Schlauchsystem und Filtern bereitgestellt. Sichtprüfung i. O., Prüfstatus aktualisiert, Eintrag im Medizinproduktebuch.</p>',
            findings: ['fc_final_ok'],
          };
        },
      },
    ],

    hypotheses: [
      { id: 'h_patient', text: 'Tatsächliche Hypoventilation des Patienten (klinisches Problem)', expected: 'excluded', evidence: ['f_user_patient_stable', 'f_flow_delivery_ok'], explain: 'Der Patient war klinisch stabil mit normaler BGA, und der Analysator zeigt an der Testlunge eine korrekte Abgabe.' },
      { id: 'h_settings', text: 'Einstellungsfehler (VT, Frequenz oder Alarmgrenzen falsch gewählt)', expected: 'excluded', evidence: ['f_settings_ok', 'f_flow_delivery_ok'], explain: 'Einstellungen entsprechen der Anordnung, die Alarmgrenzen sind plausibel, und das Gerät gibt genau das Eingestellte ab.' },
      { id: 'h_leak_circuit', text: 'Leckage im Patientenschlauchsystem oder an der Wasserfalle', expected: 'excluded', evidence: ['f_circuit_tight', 'f_swap_circuit_no_change'], explain: 'Die Druckabfallprüfung zeigt ein dichtes System, und ein neues Schlauchsystem ändert nichts.' },
      { id: 'h_leak_patient', text: 'Leckage am Patienten (Tubus/Cuff)', expected: 'excluded', evidence: ['f_flow_device_low', 'f_flow_delivery_ok'], explain: 'Die Abweichung tritt auch an der dichten Testlunge auf – ganz ohne Patient. Eine Cuffleckage kann es dort nicht geben.' },
      { id: 'h_flowsensor', text: 'Exspiratorischer Flowsensor misst falsch (verschmutzt/feucht)', expected: 'confirmed', evidence: ['f_flow_device_low', 'f_swap_sensor_ok'], explain: 'Die Gerätemessung weicht vom Analysator ab, bei korrekter Abgabe; mit bekannt gutem Sensor stimmt alles. Gerätecheck und Sichtprüfung stützen den Befund.' },
      { id: 'h_delivery', text: 'Gasdosierung/Inspirationsventil gibt zu wenig Volumen ab', expected: 'excluded', evidence: ['f_flow_delivery_ok'], explain: 'Der Analysator misst an der Testlunge das eingestellte Volumen – die Abgabe ist korrekt.' },
      { id: 'h_exp_valve', text: 'Exspirationsventil/Membran undicht', expected: 'excluded', evidence: ['f_flow_delivery_ok', 'f_selftest_leak_ok'], explain: 'Ein undichtes Exspirationsventil würde Volumen und PEEP an der Lunge verringern und im Gerätecheck auffallen – beides ist nicht der Fall.' },
      { id: 'h_pressure', text: 'Drucksensorik des Geräts fehlerhaft', expected: 'excluded', evidence: ['f_pressure_sensor_ok', 'f_flow_pressures_ok'], explain: 'Statische Druckprüfung und Analysatorvergleich zeigen korrekte Druckwerte. Die Volumenmessung ist ohnehin unabhängig von der Drucksensorik.' },
    ],

    diagnosis: {
      tree: {
        start: 'n_patient',
        nodes: {
          n_patient: {
            question: 'Gibt es klinische Hinweise auf eine tatsächliche Minderbeatmung des Patienten?',
            answers: [
              { label: 'Nein – Patient stabil, BGA und SpO₂ unauffällig', correct: true, requires: ['f_user_patient_stable'], next: 'n_settings', feedback: 'Richtig: Der Widerspruch zwischen Alarm und Klinik ist ein erster Hinweis auf ein Messproblem. Trotzdem gilt: erst beweisen, dann freigeben.' },
              { label: 'Ja – der Patient war hypoventiliert', correct: false, feedback: 'Laut Station und Stationsarzt gab es keine klinischen Hinweise auf eine Hypoventilation.' },
            ],
          },
          n_settings: {
            question: 'Passen Einstellungen und Alarmgrenzen zur ärztlichen Anordnung?',
            answers: [
              { label: 'Ja – Einstellung und Alarmgrenzen sind plausibel', correct: true, requires: ['f_settings_ok'], next: 'n_delivery', feedback: 'Richtig: Ein Einstellungsfehler scheidet aus.' },
              { label: 'Nein – die MV-Alarmgrenze war zu hoch eingestellt', correct: false, feedback: 'Die Grenze von 5,0 l/min liegt deutlich unter dem erwarteten MV von 6,3 l/min – sie ist sinnvoll gewählt.' },
            ],
          },
          n_delivery: {
            question: 'Was misst der Analysator an der Testlunge im Vergleich zur Einstellung?',
            answers: [
              { label: 'Abgegebenes VT, PEEP und FiO₂ entsprechen der Einstellung', correct: true, requires: ['f_flow_delivery_ok'], next: 'n_device', feedback: 'Richtig: Das Gerät gibt korrekt ab. Ein Abgabefehler und eine relevante Leckage sind damit sehr unwahrscheinlich.' },
              { label: 'Das abgegebene VT ist deutlich zu klein', correct: false, feedback: 'Vergleiche Spalte „Einstellung“ mit „Analysator (Referenz)“: Die Abgabe liegt innerhalb der Toleranz.' },
            ],
          },
          n_device: {
            question: 'Und wie verhält sich die Geräteanzeige (VTe) zum Analysator?',
            answers: [
              { label: 'VTe ist um ca. 22 % zu niedrig – bei verschiedenen Einstellungen gleichbleibend relativ', correct: true, requires: ['f_flow_device_low', 'f_flow_proportional'], next: 'n_leak', feedback: 'Richtig: Die Gerätemessung ist fehlerhaft. Ein konstanter relativer Fehler deutet auf eine veränderte Sensorempfindlichkeit hin.' },
              { label: 'VTe stimmt mit dem Analysator überein', correct: false, feedback: 'Mit dem Original-Flowsensor weicht die Geräteanzeige deutlich vom Analysator ab.' },
              { label: 'VTe schwankt zufällig um den richtigen Wert', correct: false, feedback: 'Die Abweichung ist systematisch (immer zu niedrig) und reproduzierbar.' },
            ],
          },
          n_leak: {
            question: 'Ist das Schlauchsystem dicht?',
            answers: [
              { label: 'Ja – Druckabfallprüfung bestanden', correct: true, requires: ['f_circuit_tight'], next: 'n_swap', feedback: 'Richtig: Die vom Gerät angezeigte „Leckage“ ist nur aus VTi − VTe berechnet – kein echtes Leck.' },
              { label: 'Nein – das Schlauchsystem ist undicht', correct: false, feedback: 'Die Druckabfallprüfung mit dem Referenzmanometer zeigt ein dichtes System.' },
            ],
          },
          n_swap: {
            question: 'Welcher Tauschtest beseitigt die Abweichung?',
            answers: [
              { label: 'Bekannt guter exspiratorischer Flowsensor – neues Schlauchsystem ändert nichts', correct: true, requires: ['f_swap_sensor_ok', 'f_swap_circuit_no_change'], feedback: 'Richtig: Der Fehler ist auf den exspiratorischen Flowsensor eingegrenzt und durch Tauschtest belegt.' },
              { label: 'Neues Schlauchsystem', correct: false, feedback: 'Mit neuem Schlauchsystem bleibt VTe zu niedrig.' },
              { label: 'Keiner – der Fehler liegt in der Elektronik', correct: false, feedback: 'Mit dem Testsensor misst dasselbe Gerät korrekt; die Elektronik arbeitet.' },
            ],
          },
        },
      },
      rootCauses: [
        { id: 'rc_flowsensor', correct: true, text: 'Exspiratorischer Flowsensor durch Ablagerungen (Medikamentenaerosol/Sekret) und Kondensat verunreinigt – misst ca. 22 % zu wenig; die tatsächliche Abgabe ist korrekt (Messfehler mit Fehlalarmen)', feedback: 'Korrekt. Belegt durch Dreier-Vergleich mit Analysator, Tauschtest und Gerätecheck; die Vorgeschichte (Vernebelung ohne Exspirationsfilter) erklärt die Entstehung.' },
        { id: 'rc_circuit_leak', correct: false, text: 'Leckage im Patientenschlauchsystem', feedback: 'Nein: Druckabfallprüfung bestanden, und ein neues Schlauchsystem ändert nichts.' },
        { id: 'rc_cuff', correct: false, text: 'Cuffleckage am Patienten', feedback: 'Nein: Der Fehler tritt auch an der Testlunge auf.' },
        { id: 'rc_settings', correct: false, text: 'Falsch eingestellte Alarmgrenzen', feedback: 'Nein: Die Grenzen sind plausibel; der Messwert selbst ist falsch.' },
        { id: 'rc_insp_valve', correct: false, text: 'Inspirationsventil/Gasdosierung gibt zu wenig ab', feedback: 'Nein: Der Analysator bestätigt die korrekte Abgabe.' },
        { id: 'rc_software', correct: false, text: 'Software-/Berechnungsfehler der Volumenberechnung', feedback: 'Nein: Mit bekannt gutem Sensor rechnet dieselbe Software korrekt.' },
      ],
      repairActions: [
        { id: 'ra_replace_sensor', verdict: 'correct', completes: true, minutes: 10, text: 'Exspiratorischen Flowsensor gegen neuen, freigegebenen Sensor (Originalersatzteil laut Herstellerliste) tauschen und anschließend über die Gerätefunktion gemäß Gebrauchsanweisung kalibrieren', feedback: 'Richtig: Ein Verschleiß-/Zubehörteil wird nach Herstellervorgabe ersetzt; die Kalibrierung erfolgt ausschließlich über die vorgesehene Gerätefunktion. Charge/Seriennummer dokumentieren.', apply: (st) => { st.flowSensor = 'new'; st.disconnect = false; } },
        { id: 'ra_old_sensor', verdict: 'good', minutes: 3, text: 'Alten Sensor als kontaminiert kennzeichnen; Wiederaufbereitung nur, wenn vom Hersteller für diesen Sensortyp freigegeben – sonst entsorgen', feedback: 'Gut: Ob und wie ein Flowsensor aufbereitet werden darf, legt allein der Hersteller fest.' },
        { id: 'ra_new_circuit', verdict: 'good', minutes: 5, text: 'Gerät nach Hygieneplan aufbereiten und mit neuem Patientenschlauchsystem und Filtern bereitstellen', feedback: 'Gut: Das gebrauchte Schlauchsystem ist kontaminiert und wird nach Hygieneplan ersetzt – kein Tausch auf Verdacht, sondern Routine bei der Rückgabe.', apply: (st) => { st.circuit = 'new'; } },
        { id: 'ra_inform', verdict: 'good', minutes: 3, text: 'Station informieren: bei Vernebelung Herstellerangaben zu Exspirationsfiltern beachten, Kondensat regelmäßig aus Wasserfallen entleeren', feedback: 'Gut: Ohne Ursachenvermeidung tritt der Fehler beim nächsten Patienten wieder auf.' },
        { id: 'ra_lower_alarm', verdict: 'wrong', minutes: 1, text: 'MV- und VTe-Alarmgrenzen absenken, damit der Alarm nicht mehr auftritt', feedback: 'Gefährlich: Alarme sind Schutzfunktionen. Die Messung bleibt falsch – eine echte Hypoventilation würde nicht mehr erkannt.' },
        { id: 'ra_clean_wire', verdict: 'wrong', minutes: 10, text: 'Messelement mit Wattestäbchen reinigen bzw. mit Druckluft ausblasen', feedback: 'Nicht zulässig: Das Messelement kann beschädigt werden; Reinigung/Aufbereitung nur nach Herstellerangaben.' },
        { id: 'ra_calibrate_only', verdict: 'wrong', minutes: 5, text: 'Nur erneut kalibrieren und Gerät zurückgeben', feedback: 'Nicht zielführend: Die Abweichung liegt außerhalb des Korrekturbereichs, die Kalibrierung schlägt fehl. Die Ursache (Ablagerungen) bliebe bestehen.' },
        { id: 'ra_replace_valve', verdict: 'wrong', minutes: 45, text: 'Inspirationsventil bzw. Gasdosiereinheit tauschen', feedback: 'Tausch auf Verdacht: Die Abgabe ist nachweislich korrekt. Zudem Eingriff in den Gasweg – nur durch Herstellerservice.' },
        { id: 'ra_replace_membrane', verdict: 'neutral', minutes: 5, text: 'Exspirationsventil-Membran vorsorglich tauschen', feedback: 'Nicht erforderlich: Gerätecheck und Analysator zeigen keine Undichtigkeit. Wartungsintervalle der Membran nach Herstellervorgabe.' },
      ],
      functionChecks: [
        { id: 'fc_flow', title: 'Beatmungsparameter mit Analysator bei ≥ 2 Einstellungen', passFinding: 'fc_flow_ok', investigation: 'inv_verify_flow' },
        { id: 'fc_alarm', title: 'Alarmprüfung (Diskonnektion / MV niedrig)', passFinding: 'fc_alarm_ok', investigation: 'inv_verify_flow' },
        { id: 'fc_selftest', title: 'Gerätecheck inkl. Flowsensor-Kalibrierung', passFinding: 'fc_selftest_ok', investigation: 'inv_verify_selftest' },
        { id: 'fc_final', title: 'Probebeatmung, Aufbereitung und Sichtprüfung', passFinding: 'fc_final_ok', investigation: 'inv_verify_final' },
      ],
    },

    explanation: {
      html:
        '<h3>Was ist passiert?</h3>' +
        '<p>Während der Medikamentenvernebelung gelangte Aerosol mit der Ausatemluft ungefiltert zum <b>exspiratorischen Flowsensor</b>. Zusammen mit Sekretpartikeln und viel Kondensat bildeten sich <b>Ablagerungen am Messelement</b>. Beim Hitzdraht-Prinzip wirken sie wie eine Wärmeisolation: Der Draht gibt bei gleichem Flow weniger Wärme ab, die Elektronik interpretiert das als <b>kleineren Flow</b>. Der Sensor misst dadurch rund <b>22 % zu wenig</b> – über alle Einstellungen nahezu gleich (Empfindlichkeitsfehler).</p>' +
        '<h3>Warum zeigte das Gerät genau dieses Fehlerbild?</h3>' +
        '<ul><li><b>VTi</b> stammt vom geschützten inneren Sensor und stimmt – das Gerät gibt korrekt ab.</li>' +
        '<li><b>VTe</b> und damit das <b>MV</b> (= VTe · f) sind zu niedrig → Alarme „VTe niedrig“ und „MV niedrig“.</li>' +
        '<li>Die angezeigte <b>„Leckage“</b> ist nur die berechnete Differenz VTi − VTe – das Gerät kann eine echte Leckage nicht von einem Messfehler unterscheiden.</li>' +
        '<li>Der Patient war <b>tatsächlich korrekt beatmet</b> – daher klinisch stabil.</li></ul>' +
        '<h3>Warum war dieses Vorgehen sinnvoll?</h3>' +
        '<ol><li><b>Anamnese</b>: Widerspruch Alarm ↔ Klinik und zeitlicher Zusammenhang mit der Vernebelung.</li>' +
        '<li><b>Einstellungen prüfen</b>: Einstellungsfehler ausgeschlossen.</li>' +
        '<li><b>Dreier-Vergleich am Analysator</b>: Abgabe korrekt, Messung falsch – damit sind Abgabefehler und Leckage (bei der auch der Analysator zu wenig sähe) praktisch ausgeschlossen.</li>' +
        '<li><b>Dichtheitsprüfung</b> und <b>Tauschtest Schlauchsystem</b>: eine echte Leckage sicher ausgeschlossen.</li>' +
        '<li><b>Tauschtest Flowsensor</b>: Ursache eingegrenzt und belegt; Gerätecheck und Sichtprüfung bestätigen.</li></ol>' +
        '<h3>Warum nicht einfach kalibrieren oder Alarmgrenzen anpassen?</h3>' +
        '<p>Eine Kalibrierung gleicht nur kleine Abweichungen innerhalb eines vom Hersteller festgelegten Bereichs aus. Ein verschmutzter Sensor liegt außerhalb und würde zudem weiter driften. Alarmgrenzen abzusenken, „repariert“ nichts, sondern schaltet eine <b>Schutzfunktion</b> aus – eine echte Hypoventilation bliebe unbemerkt.</p>' +
        '<h3>Vorbeugung</h3>' +
        '<ul><li>Bei Vernebelung Herstellerangaben zu <b>Exspirationsfiltern</b> und Filterwechsel beachten.</li>' +
        '<li>Kondensat regelmäßig aus Schlauchsystem und Wasserfallen entfernen; Befeuchtung nach Herstellerangaben.</li>' +
        '<li>Flowsensor-Aufbereitung bzw. -Wechsel nach Herstellervorgabe, Gerätecheck vor jedem Patienten.</li>' +
        '<li>Plötzlich auftretende VTi/VTe-Differenzen bei stabilem Patienten an die Medizintechnik melden – nicht durch Alarmanpassung „lösen“.</li></ul>' +
        '<div class="callout warn"><b>Lernsimulation vs. reale Servicearbeit:</b> Gerätecheck, Meldetexte, Messwerte, Toleranzen und Korrekturbereiche sind fiktiv. Reale Prüf- und Instandsetzungsschritte richten sich nach den Unterlagen des Herstellers, der Qualifikation des Personals und den geltenden Vorschriften (u. a. MPDG, MPBetreibV, IEC 62353). Eingriffe in Gasversorgung, Sauerstoffpfad, Druckbegrenzung und Alarmsystem sind dem qualifizierten Herstellerservice vorbehalten.</div>',
    },

    documentation: {
      intro: 'Erstelle den Instandsetzungsbericht. Bei Beatmungsgeräten (Anlage 1 MPBetreibV) gehört der Eintrag zusätzlich ins Medizinproduktebuch.',
      fields: [
        {
          id: 'symptom',
          label: 'Fehlerbeschreibung (Befund)',
          type: 'select',
          options: [
            { value: 'a', label: 'Beatmungsgerät undicht' },
            { value: 'b', label: 'Alarme „MV/VTe niedrig“ und berechnete Leckage > 20 %; VTe ca. 22 % unter VTi bzw. Einstellung bei klinisch stabilem Patienten; reproduzierbar an Testlunge' },
            { value: 'c', label: 'Gerät alarmiert ständig' },
          ],
          correct: 'b',
          hint: 'Beschreibe den Befund konkret und überprüfbar – nicht pauschal und nicht mit einer Vermutung.',
        },
        {
          id: 'cause',
          label: 'Festgestellte Ursache',
          type: 'select',
          options: [
            { value: 'a', label: 'Leckage im Schlauchsystem' },
            { value: 'b', label: 'Exspiratorischer Flowsensor durch Ablagerungen/Kondensat verunreinigt, misst ca. 22 % zu wenig; Abgabe korrekt. Nachweis: Analysatorvergleich, Tauschtest, Gerätecheck' },
            { value: 'c', label: 'Vermutlich Sensor' },
          ],
          correct: 'b',
          hint: 'Ursache und Nachweis gehören zusammen.',
        },
        {
          id: 'action',
          label: 'Durchgeführte Maßnahme',
          type: 'select',
          options: [
            { value: 'a', label: 'Alarmgrenzen angepasst' },
            { value: 'b', label: 'Exspiratorischen Flowsensor gegen Originalersatzteil getauscht und über Gerätefunktion kalibriert; Altteil gekennzeichnet; Gerät aufbereitet, neues Schlauchsystem; Station zu Exspirationsfiltern bei Vernebelung informiert' },
            { value: 'c', label: 'Flowsensor mit Druckluft gereinigt' },
          ],
          correct: 'b',
        },
        {
          id: 'part',
          label: 'Verwendetes Ersatzteil',
          type: 'select',
          options: [
            { value: 'a', label: 'Kein Ersatzteil' },
            { value: 'b', label: 'Exspiratorischer Flowsensor, Originalersatzteil laut Herstellerliste (Artikel-Nr./Charge eintragen)' },
            { value: 'c', label: 'Universal-Flowsensor eines Fremdanbieters' },
          ],
          correct: 'b',
          hint: 'Nur vom Hersteller freigegebene Teile – Rückverfolgbarkeit sicherstellen.',
        },
        {
          id: 'checks',
          label: 'Durchgeführte Prüfungen nach Instandsetzung',
          type: 'multi',
          options: [
            { value: 'visual', label: 'Sichtprüfung' },
            { value: 'selftest', label: 'Gerätecheck inkl. Flowsensor-Kalibrierung (Gerätefunktion)' },
            { value: 'flow', label: 'Beatmungsparameter mit Analysator an Testlunge (≥ 2 Einstellungen)' },
            { value: 'alarm', label: 'Alarmprüfung (Diskonnektion / MV niedrig)' },
            { value: 'mtk', label: 'Messtechnische Kontrolle' },
            { value: 'o2cal', label: 'Austausch und Kalibrierung des O₂-Sensors' },
          ],
          correct: ['visual', 'selftest', 'flow', 'alarm'],
          hint: 'Nur tatsächlich durchgeführte Prüfungen dokumentieren. Für Beatmungsgeräte ist keine messtechnische Kontrolle vorgesehen; der O₂-Sensor war nicht betroffen.',
        },
        {
          id: 'equipment',
          label: 'Verwendete Prüfmittel (mit Inventar-Nr. und Kalibrierstatus)',
          type: 'multi',
          options: [
            { value: 'flow', label: 'Beatmungsanalysator' },
            { value: 'lung', label: 'Testlunge (C = 50 ml/mbar, R = 5 mbar/(l/s))' },
            { value: 'press', label: 'Referenzmanometer mit Druckerzeuger' },
            { value: 'spo2', label: 'SpO₂-Simulator' },
          ],
          correct: ['flow', 'lung', 'press'],
          hint: 'Alle für Fehlersuche und Prüfung eingesetzten Prüfmittel aufführen.',
        },
        {
          id: 'release',
          label: 'Ergebnis / Freigabe',
          type: 'select',
          options: [
            { value: 'a', label: 'Gerät funktionsfähig, Prüfungen bestanden – freigegeben, Prüfstatus und Medizinproduktebuch aktualisiert, Rückgabe an Station' },
            { value: 'b', label: 'Gerät freigegeben, Alarmprüfung wird auf Station nachgeholt' },
            { value: 'c', label: 'Gerät gesperrt' },
          ],
          correct: 'a',
        },
        { id: 'remark', label: 'Bemerkungen / Empfehlungen', type: 'text', required: true, minLength: 10, placeholder: 'z. B. Empfehlung Exspirationsfilter bei Vernebelung …' },
        { id: 'tech', label: 'Prüfer/in (Name, Kürzel)', type: 'text', required: true, minLength: 2, placeholder: 'Name, Kürzel' },
      ],
    },

    quiz: [
      { q: 'Einstellung VT 450 ml, Analysator misst 449 ml, das Gerät zeigt VTe 350 ml. Was folgt daraus?', options: ['Das Gerät gibt zu wenig ab', 'Die Abgabe ist korrekt, die Gerätemessung (VTe) ist fehlerhaft', 'Das Schlauchsystem ist undicht', 'Der Analysator ist defekt'], correct: 1, explain: 'Einstellung ↔ Analysator stimmt (Abgabe korrekt), Analysator ↔ Anzeige weicht ab (Messfehler).' },
      { q: 'Woran erkennt man an der Testlunge eine echte Leckage im Unterschied zu einem Messfehler des exspiratorischen Flowsensors?', options: ['An einer höheren FiO₂', 'Bei einer Leckage misst auch der Analysator an der Lunge zu wenig Volumen und der PEEP fällt ab', 'Bei einer Leckage ist VTi kleiner als VTe', 'Gar nicht – beides sieht gleich aus'], correct: 1, explain: 'Eine Leckage verringert die tatsächlich an der Lunge ankommende Abgabe; ein Messfehler verändert nur die Anzeige.' },
      { q: 'Warum zeigte das Gerät „Leckage > 20 %“ an, obwohl das System dicht war?', options: ['Weil das Gerät eine eigene Leckagemessung hat, die defekt war', 'Weil die Leckage aus VTi − VTe berechnet wird und VTe zu niedrig gemessen wurde', 'Weil der PEEP zu hoch war', 'Weil die Testlunge undicht war'], correct: 1, explain: 'Die berechnete Leckage beruht auf der Differenz der Volumina – ein zu niedriges VTe erscheint als Leckage.' },
      { q: 'Wie berechnet sich das Atemminutenvolumen bei VTe = 350 ml und f = 14/min?', options: ['3,5 l/min', '4,9 l/min', '6,3 l/min', '25 l/min'], correct: 1, explain: 'MV = VTe · f = 0,35 l · 14/min = 4,9 l/min.' },
      { q: 'Testlunge C = 50 ml/mbar, R = 5 mbar/(l/s), VT 500 ml, PEEP 5 mbar, konstanter Flow 0,3 l/s. Welcher Spitzendruck ist zu erwarten?', options: ['ca. 10 mbar', 'ca. 16,5 mbar', 'ca. 25 mbar', 'ca. 55 mbar'], correct: 1, explain: 'Ppeak = PEEP + VT/C + R · V̇ = 5 + 10 + 1,5 = 16,5 mbar.' },
      { q: 'Warum messen Ablagerungen auf einem Hitzdraht-Flowsensor einen zu niedrigen Flow?', options: ['Sie erhöhen den elektrischen Widerstand der Zuleitung', 'Sie isolieren den Draht thermisch – er gibt weniger Wärme ab, was als geringerer Flow interpretiert wird', 'Sie verringern den Gasfluss tatsächlich um 22 %', 'Sie verändern die Sauerstoffkonzentration'], correct: 1, explain: 'Das Hitzdraht-Prinzip misst die Wärmeabgabe an den Gasstrom. Eine Isolationsschicht verringert sie.' },
      { q: 'Wie wird ein exspiratorischer Flowsensor fachgerecht kalibriert?', options: ['Mit einem Schraubendreher am Potentiometer im Gerät', 'Über die dafür vorgesehene Gerätefunktion nach Gebrauchsanweisung bzw. Herstellervorgabe', 'Durch Anpassen der Alarmgrenzen', 'Gar nicht, Flowsensoren sind wartungsfrei'], correct: 1, explain: 'Kalibrierungen erfolgen nur auf dem vom Hersteller vorgesehenen Weg – Abweichungen außerhalb des Korrekturbereichs erfordern einen Sensortausch.' },
      { q: 'Warum ist das Absenken der MV-Alarmgrenze keine zulässige „Reparatur“?', options: ['Weil es zu lange dauert', 'Weil Alarme Schutzfunktionen sind und eine echte Hypoventilation dann nicht mehr erkannt würde', 'Weil Alarmgrenzen nur der Hersteller ändern darf', 'Weil es die Akkulaufzeit verkürzt'], correct: 1, explain: 'Die Ursache bleibt bestehen und die Schutzwirkung des Alarms geht verloren.' },
      { q: 'Warum erfolgen Fehlersuche und Funktionsprüfung an einer Testlunge und nicht am Patienten?', options: ['Weil Testlungen billiger sind', 'Weil Compliance und Resistance definiert und reproduzierbar sind und kein Patient gefährdet wird', 'Weil der Analysator am Patienten nicht passt', 'Weil Patienten zu wenig atmen'], correct: 1, explain: 'Definierte, reproduzierbare Bedingungen und Patientensicherheit.' },
      { q: 'Welche Prüfungen gehören nach dem Flowsensortausch mindestens zur Freigabe?', options: ['Keine – Sensortausch ist trivial', 'Gerätecheck inkl. Kalibrierung, Analysatorprüfung bei mehreren Einstellungen und Alarmprüfung', 'Nur eine messtechnische Kontrolle', 'Nur eine elektrische Sicherheitsprüfung'], correct: 1, explain: 'Funktion, Messgenauigkeit und Alarmierung müssen nach der Instandsetzung belegt werden.' },
      { q: 'Welche Maßnahme beugt dem Fehler am wirksamsten vor?', options: ['Häufiger Alarmgrenzen anpassen', 'Bei Vernebelung Herstellerangaben zu Exspirationsfiltern beachten und Kondensat regelmäßig entfernen', 'Flowsensor mit Druckluft ausblasen', 'Den Befeuchter abschalten'], correct: 1, explain: 'Aerosol und Kondensat erreichen sonst ungehindert den empfindlichen Sensor.' },
    ],

    createState: () => ({ flowSensor: 'original', circuit: 'original', disconnect: false }),
  });

  // Für automatische Tests exportieren (keine Auswirkung im Browser)
  MTRL.__test = MTRL.__test || {};
  MTRL.__test.ventFlow = { breath, measure, sensorGain, deviceCheck, flowFixture, pressureFixture, ventFrame, C_LUNG, R_LUNG };
})();
