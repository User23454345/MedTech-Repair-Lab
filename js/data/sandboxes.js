/*
 * Übungsaufbauten für das Messgerätelabor.
 * Jeder Aufbau hat schaltbare Lernfehler (Fixture-Controls). Alle Messwerte
 * werden deterministisch aus dem Zustand berechnet.
 */
(function () {
  'use strict';
  const U = MTRL.util;
  const fmt = U.fmt;
  const toggle = (id, label, help) => ({
    id,
    type: 'toggle',
    label: '⚠ Lernfehler: ' + label,
    help,
    get: (ctx) => !!ctx.state[id],
    set: (ctx, v) => {
      ctx.state[id] = v;
    },
  });

  /* ======================= Multimeter ======================= */

  // EKG-Patientenkabel (3 Ableitungen) mit Schutzwiderständen (fiktive Werte)
  const LEADS = [
    { k: 'RA', name: 'RA (rechter Arm)', r: 1000 },
    { k: 'LA', name: 'LA (linker Arm)', r: 1000 },
    { k: 'LL', name: 'LL (linkes Bein)', r: 1000 },
  ];
  MTRL.registerSandbox({
    id: 'mm-ecg-cable',
    instrument: 'multimeter',
    title: 'EKG-Patientenkabel',
    description: 'Ein 3-poliges EKG-Patientenkabel (Lernmodell) mit Schutzwiderständen von je 1 kΩ in den Ableitadern. Prüfe jede Ader vom Druckknopf/Clip bis zum Gerätestecker und die Isolation zwischen den Adern.',
    createState: () => ({ breakLA: false, shortRaLl: false }),
    tasks: [
      'Miss den Widerstand jeder Ader (Clip → Stecker). Welcher Wert ist zu erwarten, wenn ein 1-kΩ-Schutzwiderstand eingebaut ist?',
      'Schalte den Lernfehler „Ader LA unterbrochen“ zu und finde ihn.',
      'Schalte „Schluss RA–LL“ zu. Mit welcher Messung findest du ihn? Was würde das EKG zeigen?',
    ],
    fixture: {
      title: 'EKG-Patientenkabel, ausgesteckt',
      modes: ['ohm', 'continuity'],
      points: []
        .concat(LEADS.map((l) => ({ id: 'C-' + l.k, label: 'Clip ' + l.name, group: 'Patientenseite' })))
        .concat(LEADS.map((l) => ({ id: 'P-' + l.k, label: 'Stecker-Pin ' + l.k, group: 'Geräteseite' })))
        .concat([{ id: 'P-SH', label: 'Stecker-Pin Schirm', group: 'Geräteseite' }]),
      defaults: { mode: 'ohm', red: 'C-RA', black: 'P-RA' },
      hint: 'Hinweis: Ob und welche Schutzwiderstände in EKG-Kabeln verbaut sind, ist herstellerspezifisch. Im Lernmodell: 1 kΩ je Ader.',
      controls: [toggle('breakLA', 'Ader LA unterbrochen'), toggle('shortRaLl', 'Schluss zwischen RA und LL (Isolationsschaden)')],
      measure(mode, a, b, ctx) {
        const net = new MTRL.Netlist();
        LEADS.forEach((l) => net.R('C-' + l.k, 'P-' + l.k, l.k === 'LA' && ctx.state.breakLA ? Infinity : l.r + 0.6));
        net.R('P-SH', 'P-SHx', 0.2);
        if (ctx.state.shortRaLl) net.R('P-RA', 'P-LL', 3.5);
        return MTRL.measureNetlist(net, mode, a, b);
      },
    },
  });

  MTRL.registerSandbox({
    id: 'mm-battery',
    instrument: 'multimeter',
    title: 'Akkupack (Gleichspannung)',
    description: 'Akkupack eines Transportgeräts (Lernmodell: 3 Li-Ion-Zellen in Reihe, Nennspannung 10,8 V). Miss Gesamt- und Zellspannungen im Leerlauf.',
    createState: () => ({ weakCell: false, deepDischarge: false }),
    tasks: [
      'Miss die Gesamtspannung und jede Zellspannung. Passen die Einzelwerte zur Summe?',
      'Schalte „Zelle 2 geschädigt“ zu. Woran erkennst du eine einzelne schwache Zelle?',
      'Hinweis: Leerlaufspannung sagt wenig über die Kapazität. Wie würdest du die Kapazität prüfen?',
    ],
    fixture: {
      title: 'Akkupack, ausgebaut (Balancer-Anschluss zugänglich)',
      modes: ['vdc'],
      points: [
        { id: 'B-', label: 'Pack − (B−)', group: 'Anschlüsse' },
        { id: 'B1', label: 'Balancer Zelle 1 +', group: 'Anschlüsse' },
        { id: 'B2', label: 'Balancer Zelle 2 +', group: 'Anschlüsse' },
        { id: 'B+', label: 'Pack + (B+)', group: 'Anschlüsse' },
      ],
      defaults: { mode: 'vdc', red: 'B+', black: 'B-' },
      hint: 'Akkus nie kurzschließen. Defekte/aufgeblähte Li-Ion-Akkus sofort sicher lagern und fachgerecht entsorgen.',
      controls: [toggle('weakCell', 'Zelle 2 geschädigt (Spannungseinbruch)'), toggle('deepDischarge', 'Pack tiefentladen')],
      measure(mode, a, b, ctx) {
        const st = ctx.state;
        const base = st.deepDischarge ? 2.6 : 3.92;
        const c = [base, st.weakCell ? (st.deepDischarge ? 0.9 : 2.71) : base - 0.01, base + 0.01];
        const net = new MTRL.Netlist();
        net.V('B-', 0).V('B1', c[0]).V('B2', c[0] + c[1]).V('B+', c[0] + c[1] + c[2]);
        return MTRL.measureNetlist(net, mode, a, b);
      },
    },
  });

  /* ======================= Oszilloskop ======================= */
  MTRL.registerSandbox({
    id: 'osc-ecg-amp',
    instrument: 'oscilloscope',
    title: 'EKG-Verstärkerkette',
    description: 'Ein EKG-Simulator speist 1 mV (Ableitung II, 60/min) in eine vereinfachte Verstärkerkette ein: Eingang → Vorverstärker (×10) → Hochpass/Tiefpass → Hauptverstärker (×100) → A/D-Eingang.',
    createState: () => ({ hum: false, deadStage: false, saturate: false }),
    tasks: [
      'Verfolge das Signal von TP1 bis TP4. Wie groß ist die Verstärkung jeder Stufe? (V/div anpassen!)',
      'Schalte „Schirm unterbrochen“ zu. Welche Frequenz hat die Störung? Wo wird sie sichtbar?',
      'Schalte „Hauptverstärker defekt“ zu und lokalisiere die Stufe mit der Halbierungsmethode.',
    ],
    fixture: {
      title: 'Lernmodell EKG-Front-End, Eingang: EKG-Simulator 1 mV, 60/min',
      testpoints: [
        { id: 'TP1', label: 'TP1 Eingang (Elektrode)', desc: 'ca. 1 mV' },
        { id: 'TP2', label: 'TP2 nach Vorverstärker', desc: 'Verstärkung ×10' },
        { id: 'TP3', label: 'TP3 nach Filter', desc: '0,5–40 Hz (Monitorfilter)' },
        { id: 'TP4', label: 'TP4 Hauptverstärker / A/D', desc: 'Verstärkung ×100, ±2,5 V Aussteuerbereich' },
      ],
      defaults: { ch1: 'TP1', ch2: 'TP4', vdiv1: 0.0005, vdiv2: 0.5, tdiv: 0.2 },
      controls: [toggle('hum', 'Schirm unterbrochen (50-Hz-Einstreuung)'), toggle('deadStage', 'Hauptverstärker defekt'), toggle('saturate', 'Elektrodenoffset zu groß (Übersteuerung)')],
      sample(tp, t, ctx) {
        const st = ctx.state;
        const ecg = U.ecgShape(t % 1) * 0.001; // 1 mV
        const hum = st.hum ? 0.0006 * Math.sin(2 * Math.PI * 50 * t) : 0;
        const offset = st.saturate ? 0.0045 : 0;
        const n = U.noise(1, t * 1000) * 0.00001;
        const in1 = ecg + hum + n + offset;
        if (tp === 'TP1') return in1;
        const s2 = in1 * 10;
        if (tp === 'TP2') return s2;
        // Filter: Hochpass entfernt Offset, Tiefpass dämpft 50 Hz (stark vereinfacht)
        const s3 = (ecg + n) * 10 + (st.hum ? 0.0006 * 0.35 * 10 * Math.sin(2 * Math.PI * 50 * t) : 0);
        if (tp === 'TP3') return st.saturate ? U.clamp(s2, -0.04, 0.04) - offset * 10 * 0.98 : s3;
        if (tp === 'TP4') {
          if (st.deadStage) return 0.002 * U.noise(2, t * 500);
          const v = st.saturate ? 2.5 : s3 * 100;
          return U.clamp(v, -2.5, 2.5);
        }
        return 0;
      },
    },
  });

  /* ======================= Patientensimulator ======================= */
  MTRL.registerSandbox({
    id: 'sim-monitor',
    instrument: 'patient-simulator',
    title: 'Monitor-Funktionsprüfung',
    description: 'Patientenmonitor (Lernmodell) am Multiparameter-Simulator. Verändere die Vorgaben und beobachte Anzeige und Alarme. Schalte Lernfehler zu.',
    createState: () => ({ ambient: false, tempDrift: false, nibpLeak: false }),
    tasks: [
      'Prüfe SpO₂ bei 97 %, 90 % und 85 %. Ab welchem Wert alarmiert der Monitor (Alarmgrenze 90 %)?',
      'Stelle die Perfusion auf „niedrig“. Welche Meldung erscheint und warum?',
      'Schalte „Temperatursonde driftet“ zu: Wie groß ist die Abweichung? Ist sie zulässig (Lernmodell: ±0,1 °C)?',
    ],
    fixture: {
      title: 'Patientenmonitor PM-5 (Lernmodell) am Simulator',
      params: ['spo2', 'hr', 'perf', 'resp', 'temp', 'nibp'],
      controls: [toggle('ambient', 'Starkes Fremdlicht auf dem SpO₂-Sensor'), toggle('tempDrift', 'Temperatursonde driftet (+0,8 °C)'), toggle('nibpLeak', 'NIBP-Manschette undicht')],
      display(s, ctx, t) {
        const st = ctx.state;
        const period = 60 / s.hr;
        const perfAmp = s.perf === 'high' ? 1 : s.perf === 'low' ? 0.25 : 0.65;
        const msgs = [];
        const values = [{ id: 'hr', label: 'HF', value: String(s.hr), unit: '/min', color: '#7CFC00', alarm: s.hr > 120 || s.hr < 50, sub: 'Grenzen 50–120' }];
        if (s.hr > 120) msgs.push({ text: '!! HF HOCH', level: 'high' });
        if (s.hr < 50) msgs.push({ text: '!! HF NIEDRIG', level: 'high' });
        let spo2ok = true;
        if (st.ambient) {
          spo2ok = false;
          msgs.push({ text: 'SpO₂ STÖRUNG – FREMDLICHT', level: 'med' });
        }
        const spo2 = s.spo2 >= 90 ? s.spo2 : s.spo2 - 1;
        values.push({ id: 'spo2', label: 'SpO₂', value: spo2ok ? String(spo2) : '---', unit: '%', color: '#22d3ee', alarm: spo2ok && spo2 < 90, sub: 'Grenze < 90' });
        if (spo2ok && spo2 < 90) msgs.push({ text: '!! SpO₂ NIEDRIG', level: 'high' });
        if (spo2ok && s.perf === 'low') msgs.push({ text: 'SpO₂ Perfusion gering', level: 'low' });
        values.push({ id: 'resp', label: 'AF', value: String(s.resp), unit: '/min', color: '#fde047' });
        values.push({ id: 'temp', label: 'Temp', value: fmt(s.temp + (st.tempDrift ? 0.8 : 0), 1), unit: '°C', color: '#f0abfc' });
        values.push({ id: 'nibp', label: 'NIBP', value: st.nibpLeak ? '---/---' : s.nibp, unit: 'mmHg', color: '#f5f5f5' });
        if (st.nibpLeak) msgs.push({ text: 'NIBP LECK / MANSCHETTE PRÜFEN', level: 'med' });
        return {
          waves: [
            { id: 'ecg', label: 'II', color: '#7CFC00', fn: (tt) => U.ecgShape((tt % period) / period) * 0.95 - 0.15 },
            { id: 'pleth', label: 'Pleth', color: '#22d3ee', fn: (tt) => (spo2ok ? (U.plethShape(((tt - 0.2 + 10) % period) / period) - 0.5) * 1.6 * perfAmp : null) },
            { id: 'resp', label: 'Resp', color: '#fde047', fn: (tt) => (s.resp ? 0.6 * Math.sin((2 * Math.PI * s.resp * tt) / 60) : 0) },
          ],
          values,
          messages: msgs,
        };
      },
    },
  });

  /* ======================= EKG-Simulator ======================= */
  MTRL.registerSandbox({
    id: 'ecg-device',
    instrument: 'ecg-simulator',
    title: 'EKG-Gerät prüfen',
    description: 'EKG-Gerät (Lernmodell) am EKG-Simulator. Prüfe Amplitude (10 mm/mV), Herzfrequenz und das Verhalten bei typischen Kabel- und Anschlussfehlern.',
    createState: () => ({ raBroken: false, swapped: false, gainLow: false }),
    tasks: [
      'Wähle den Kalibrierimpuls 1 mV. Ist der Ausschlag 10 mm (= 2 große Kästchen)?',
      'Schalte „Elektroden RA/LA vertauscht“ zu: Was passiert mit Ableitung I, II und III?',
      'Schalte „Ader RA unterbrochen“ zu: Welche Ableitungen fallen aus – und warum bleibt III erhalten?',
    ],
    fixture: {
      title: 'EKG-Gerät (Lernmodell), 3 Extremitätenableitungen',
      controls: [toggle('raBroken', 'Ader RA unterbrochen'), toggle('swapped', 'Elektroden RA und LA vertauscht'), toggle('gainLow', 'Verstärkung 20 % zu niedrig')],
      process(e, settings, ctx) {
        const st = ctx.state;
        let RA = e.RA;
        let LA = e.LA;
        if (st.swapped) {
          RA = e.LA;
          LA = e.RA;
        }
        const g = st.gainLow ? 0.8 : 1;
        const raOff = st.raBroken;
        const leads = [
          { label: 'I', mv: raOff ? null : (LA - RA) * g, off: raOff },
          { label: 'II', mv: raOff ? null : (e.LL - RA) * g, off: raOff },
          { label: 'III', mv: (e.LL - LA) * g },
        ];
        const messages = [];
        if (raOff) messages.push({ text: 'ELEKTRODE RA AB', level: 'med' });
        if (settings.rhythm === 'vf') messages.push({ text: '!! KAMMERFLIMMERN', level: 'high' });
        if (settings.rhythm === 'asys') messages.push({ text: '!! ASYSTOLIE', level: 'high' });
        return { leads, hr: MTRL.ecgRate(settings), messages };
      },
    },
  });

  /* ======================= Sicherheitsanalysator ======================= */
  MTRL.registerSandbox({
    id: 'sa-monitor',
    instrument: 'safety-analyzer',
    title: 'Monitor, Schutzklasse I',
    description: 'Wiederholungsprüfung eines Patientenmonitors (Schutzklasse I, abnehmbare Netzleitung, Anwendungsteile EKG = CF, SpO₂ und NIBP = BF).',
    createState: () => ({ peDamage: false, moisture: false, barrier: false }),
    tasks: [
      'Führe den kompletten Prüfablauf durch und bewerte das Ergebnis.',
      'Schalte „Schutzleiter im Netzkabel beschädigt“ zu: Welcher Prüfschritt schlägt an? Was ist die richtige Maßnahme?',
      'Warum ist der Grenzwert für das EKG-Anwendungsteil (CF) so viel strenger als für BF?',
    ],
    fixture: {
      title: 'Patientenmonitor (Lernmodell)',
      deviceName: 'Patientenmonitor PM-5 (Lernmodell)',
      protectionClass: 'I',
      detachableCord: true,
      appliedParts: [
        { id: 'ecg', name: 'EKG', type: 'CF' },
        { id: 'spo2', name: 'SpO₂', type: 'BF' },
        { id: 'nibp', name: 'NIBP', type: 'BF' },
      ],
      controls: [toggle('peDamage', 'Schutzleiter im Netzkabel beschädigt'), toggle('moisture', 'Feuchtigkeit/Verschmutzung im Netzteil'), toggle('barrier', 'Isolationsbarriere EKG beeinträchtigt')],
      values(ctx) {
        const st = ctx.state;
        return {
          visual: !st.peDamage,
          pe: st.peDamage ? 0.71 : 0.084,
          insulation: st.moisture ? 1.1 : Infinity,
          equipmentLeakage: st.moisture ? 1460 : 118,
          applied: { ecg: st.barrier ? 86 : 6.4, spo2: 9.1, nibp: 4.2 },
        };
      },
    },
  });

  MTRL.registerSandbox({
    id: 'sa-syringe',
    instrument: 'safety-analyzer',
    title: 'Spritzenpumpe, Schutzklasse II',
    description: 'Spritzenpumpe (Lernmodell) in Schutzklasse II (schutzisoliert, kein Schutzleiter). Das Anwendungsteil (Flüssigkeitsweg) ist vom Typ BF.',
    createState: () => ({ crack: false }),
    tasks: ['Warum entfällt die Schutzleitermessung?', 'Schalte „Gehäuseriss mit Flüssigkeitseintritt“ zu und bewerte das Ergebnis.'],
    fixture: {
      title: 'Spritzenpumpe (Lernmodell)',
      deviceName: 'Spritzenpumpe SP-2 (Lernmodell)',
      protectionClass: 'II',
      appliedParts: [{ id: 'line', name: 'Infusionsleitung', type: 'BF' }],
      controls: [toggle('crack', 'Gehäuseriss mit Flüssigkeitseintritt')],
      values(ctx) {
        const c = ctx.state.crack;
        return { visual: !c, insulation: c ? 0.8 : Infinity, equipmentLeakage: c ? 640 : 22, applied: { line: c ? 410 : 3.1 } };
      },
    },
  });

  /* ======================= Druckmessgerät ======================= */
  MTRL.registerSandbox({
    id: 'pm-nibp',
    instrument: 'pressure-meter',
    title: 'NIBP: statische Druckprüfung',
    description: 'Blutdruckmessgerät (Lernmodell) im Service-Druckmodus. Referenzmanometer über T-Stück angeschlossen. Prüfe die Anzeige bei mehreren Druckstufen und die Dichtheit.',
    createState: () => ({ offset: false, gain: false, leak: false }),
    tasks: [
      'Fahre alle Druckstufen an. Liegt die Abweichung innerhalb ±3 mmHg?',
      'Schalte „Offset“ und dann „Verstärkungsfehler“ zu. Wie unterscheiden sich die beiden Fehlerbilder über die Druckstufen?',
      'Führe die Dichtheitsprüfung mit und ohne Leck durch.',
    ],
    fixture: {
      title: 'Blutdruckmessgerät, Service-Druckmodus (Ventile geschlossen)',
      unit: 'mmHg',
      setpoints: [0, 50, 100, 150, 200, 250],
      tolerance: 3,
      deviceLabel: 'Anzeige NIBP-Gerät',
      hint: 'Die Toleranz von ±3 mmHg entspricht der üblichen Anforderung an nichtinvasive Blutdruckmessgeräte; maßgeblich sind Herstellerangaben und der für die messtechnische Kontrolle geltende Leitfaden. Dichtheits-Grenzwert hier als Beispiel.',
      controls: [toggle('offset', 'Drucksensor mit Nullpunktfehler (+5 mmHg)'), toggle('gain', 'Drucksensor mit Verstärkungsfehler (+3 %)'), toggle('leak', 'Undichter Schlauchanschluss')],
      deviceReading(ref, ctx) {
        let v = ref;
        if (ctx.state.offset) v += 5;
        if (ctx.state.gain) v *= 1.03;
        return Math.round(v);
      },
      leak: { pressure: 200, duration: 60, limit: 6, rate: (ctx) => (ctx.state.leak ? 14 : 1.2) },
    },
  });

  MTRL.registerSandbox({
    id: 'pm-suction',
    instrument: 'pressure-meter',
    title: 'Absauggerät: Vakuum',
    description: 'Absauggerät (Lernmodell) mit Regler und Vakuummeter. Prüfe mit dem Referenzmanometer am verschlossenen Patientenschlauch, ob der eingestellte Unterdruck erreicht und richtig angezeigt wird.',
    createState: () => ({ lidLeak: false, gauge: false }),
    tasks: ['Fahre die Unterdruckstufen an und vergleiche die Anzeige.', 'Schalte „Behälterdeckel undicht“ zu: Welche Stufen werden nicht mehr erreicht?'],
    fixture: {
      title: 'Absauggerät, Patientenschlauch verschlossen',
      unit: 'mbar',
      vacuum: true,
      max: 1000,
      setpoints: [100, 200, 400, 600, 800],
      tolerance: 40,
      deviceLabel: 'Vakuummeter Absauggerät (−mbar)',
      hint: 'Toleranz im Lernmodell: ±40 mbar. Erreichbares Endvakuum und Toleranzen sind herstellerspezifisch.',
      controls: [toggle('lidLeak', 'Sekretbehälterdeckel undicht'), toggle('gauge', 'Vakuummeter des Geräts zeigt 15 % zu wenig')],
      maxReachable: (ctx) => (ctx.state.lidLeak ? 380 : 860),
      deviceReading(ref, ctx) {
        return Math.round(ref * (ctx.state.gauge ? 0.85 : 1));
      },
    },
  });

  /* ======================= Durchfluss / Beatmung ======================= */
  MTRL.registerSandbox({
    id: 'flow-vent',
    instrument: 'flow-analyzer',
    title: 'Beatmungsgerät an Testlunge',
    description: 'Beatmungsgerät (Lernmodell, volumenkontrolliert) an Analysator und Testlunge. Vergleiche Einstellung, tatsächliche Abgabe (Analysator) und Gerätemessung.',
    createState: () => ({ flowSensor: false, leak: false, o2: false }),
    tasks: [
      'Stelle VT 500 ml, f 12/min, PEEP 5 mbar, FiO₂ 40 % ein und bewerte alle Werte.',
      'Schalte „Flowsensor verschmutzt“ zu: Gibt das Gerät zu wenig ab – oder misst es nur falsch?',
      'Schalte „Leckage“ zu: Woran unterscheidest du eine Leckage von einem Messfehler?',
    ],
    fixture: {
      title: 'Beatmungsgerät (Lernmodell) · Analysator · Testlunge',
      tolerances: { vt: { rel: 0.1, abs: 15 }, rate: { abs: 1 }, peep: { abs: 1.5 }, ppeak: { abs: 2 }, fio2: { abs: 3 } },
      hint: 'Toleranzen im Lernmodell. Reale Toleranzen und Prüfabläufe stehen in den Herstellerunterlagen (Prüf-/Wartungsanleitung).',
      controls: [toggle('flowSensor', 'Flowsensor verschmutzt (misst 15 % zu wenig)'), toggle('leak', 'Leckage im Schlauchsystem'), toggle('o2', 'O₂-Sensor verbraucht')],
      measure(s, ctx) {
        const st = ctx.state;
        const C = 50; // ml/mbar
        const R = 5; // mbar/(l/s)
        const vtDel = st.leak ? s.vt * 0.78 : s.vt;
        const peepDel = st.leak ? Math.max(0, s.peep - 2) : s.peep;
        const ti = 60 / s.rate / 3;
        const ppeak = peepDel + vtDel / C + R * (vtDel / 1000 / ti);
        const ref = { vt: vtDel, rate: s.rate, peep: peepDel, ppeak, fio2: s.fio2 };
        const device = {
          vt: Math.round(vtDel * (st.flowSensor ? 0.85 : 1.0) + 2),
          rate: s.rate,
          peep: peepDel,
          ppeak: ppeak + 0.4,
          fio2: st.o2 ? s.fio2 - 9 : s.fio2,
        };
        const alarms = [];
        if (st.leak) alarms.push({ text: 'LECKAGE / VT NIEDRIG', level: 'high' });
        if (st.o2) alarms.push({ text: 'O₂-SENSOR PRÜFEN / KALIBRIEREN', level: 'med' });
        if (st.flowSensor) alarms.push({ text: 'VTe NIEDRIG', level: 'med' });
        return { ref, device, alarms };
      },
    },
  });

  /* ======================= Pumpenprüfgerät ======================= */
  MTRL.registerSandbox({
    id: 'ida-volumetric',
    instrument: 'pump-analyzer',
    title: 'Volumetrische Infusionspumpe',
    description: 'Peristaltische Infusionspumpe (Lernmodell) mit Infusionsset am Pumpenprüfgerät. Prüfe Förderrate und Okklusionsalarm.',
    createState: () => ({ segment: false, occSensor: false }),
    tasks: [
      'Prüfe die Förderrate bei 25 und 100 ml/h. Warum schwankt der Flow periodisch?',
      'Schalte „Pumpsegment ermüdet“ zu. Wie groß ist die Abweichung?',
      'Führe den Okklusionstest mit und ohne Fehler durch. Welches Risiko besteht bei zu spätem Alarm?',
    ],
    fixture: {
      title: 'Volumetrische Infusionspumpe VP-1 (Lernmodell)',
      pumpLabel: 'Prüfling: Infusionspumpe',
      rates: [25, 100, 500],
      duration: 60,
      tolerance: 0.05,
      hint: 'Beispieltoleranz ±5 %. Die zulässige Genauigkeit hängt von Pumpe, Infusionsset und Prüfbedingungen ab (Herstellerangabe).',
      controls: [toggle('segment', 'Pumpsegment/Infusionsset ermüdet (−8 %)'), toggle('occSensor', 'Okklusionsdrucksensor dejustiert')],
      flow(rate, tMin, ctx) {
        const k = ctx.state.segment ? 0.92 : 1.006;
        return rate * k * (1 + 0.06 * Math.sin(2 * Math.PI * tMin * 0.37));
      },
      occlusion: (ctx) => ({ alarmPressure: ctx.state.occSensor ? 1050 : 590, minAllowed: 400, maxAllowed: 800, levelLabel: 'mittel' }),
    },
  });

  MTRL.registerSandbox({
    id: 'ida-syringe',
    instrument: 'pump-analyzer',
    title: 'Spritzenpumpe',
    description: 'Spritzenpumpe (Lernmodell) mit 50-ml-Spritze. Beachte das Anlaufverhalten durch mechanisches Spiel zu Beginn der Förderung.',
    createState: () => ({ wrongSyringe: false }),
    tasks: ['Prüfe 5 ml/h über 60 min. Wie wirkt sich der Anlauf auf das Ergebnis aus?', 'Schalte „falscher Spritzentyp eingestellt“ zu und erkläre die Abweichung.'],
    fixture: {
      title: 'Spritzenpumpe SP-2 (Lernmodell), 50-ml-Spritze',
      pumpLabel: 'Prüfling: Spritzenpumpe',
      rates: [1, 5, 50],
      duration: 60,
      tolerance: 0.05,
      hint: 'Bei kleinen Raten ist die Anlaufzeit (Spiel zwischen Antrieb und Kolben) relevant. Herstellerangaben zu Prüfdauer und Einlaufzeit beachten.',
      controls: [toggle('wrongSyringe', 'Falscher Spritzentyp eingestellt (+12 % Volumen)')],
      flow(rate, tMin, ctx) {
        const k = ctx.state.wrongSyringe ? 1.12 : 1.0;
        const startup = 1 - Math.exp(-tMin / 1.2);
        return rate * k * startup * (1 + 0.04 * Math.sin(2 * Math.PI * tMin * 6));
      },
      occlusion: () => ({ alarmPressure: 520, minAllowed: 300, maxAllowed: 750, levelLabel: 'mittel' }),
    },
  });
})();
