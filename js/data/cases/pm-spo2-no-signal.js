/*
 * Servicefall PM-01: Patientenmonitor zeigt keine Sauerstoffsättigung an
 * ------------------------------------------------------------------
 * Vollständig ausgearbeiteter Referenzfall.
 *
 * Definierter Fehler (deterministisch):
 *   Aderbruch der Photodioden-Signalleitung (Pin 3) im SpO₂-Adapterkabel,
 *   unmittelbar am monitorseitigen Knickschutz. Bei Bewegung des Kabels
 *   entsteht zeitweise Kontakt (intermittierender Fehler).
 *
 * Alle Messwerte werden aus dem Zustand (state) berechnet:
 *   state.adapter: 'original' | 'test' | 'new'
 *   state.sensor:  'original' | 'test'
 *   state.flex:    Kabel am Knickschutz wird bewegt (Biegetest)
 *
 * Hinweis: Steckerbelegung, Testpunkte und Kodierwiderstand sind FIKTIV
 * (Lernmodell) und entsprechen keinem realen Hersteller.
 */
(function () {
  'use strict';
  const U = MTRL.util;
  const fmt = U.fmt;

  /* ======================= Lernmodell: Belegung ======================= */
  const PINS = [
    { n: 1, name: 'LED-Leitung A', desc: 'Anode Rot / Kathode IR', r: 0.32 },
    { n: 2, name: 'LED-Leitung B', desc: 'Anode IR / Kathode Rot', r: 0.31 },
    { n: 3, name: 'Photodiode +', desc: 'Signal (Anode Photodiode)', r: 0.47 },
    { n: 4, name: 'Photodiode −', desc: 'Signal-Rückleitung (Kathode)', r: 0.46 },
    { n: 5, name: 'Innenschirm', desc: 'Schirm der Photodiodenleitungen', r: 0.28 },
    { n: 6, name: 'Kodierung', desc: 'Sensor-ID (Kodierwiderstand)', r: 0.35 },
    { n: 7, name: 'Kodier-Masse', desc: 'Rückleitung Kodierung', r: 0.34 },
    { n: 8, name: 'Außenschirm', desc: 'Gesamtschirm', r: 0.22 },
  ];
  const ID_RESISTOR = 6810; // Ω – fiktiver Kodierwert im Lernmodell

  /** Netzliste des Adapterkabels (Seite S = Sensorbuchse, Seite M = Monitorstecker). */
  function adapterNet(kind, flex, tick) {
    const net = new MTRL.Netlist();
    PINS.forEach((p) => {
      let r = p.r;
      if (kind === 'original' && p.n === 3) {
        // Aderbruch: offen; beim Biegen zeitweise Kontakt mit schwankendem Übergangswiderstand
        if (flex) {
          const k = tick % 7;
          r = k === 2 ? 2.7 : k === 3 ? 0.9 : k === 5 ? 14.6 : Infinity;
        } else r = Infinity;
      }
      net.R('A-S' + p.n, 'A-M' + p.n, r);
    });
    return net;
  }

  /** Netzliste des Sensors (Stecker P, mit Sensorleitung ~1 m). */
  function sensorNet() {
    const net = new MTRL.Netlist();
    // Leitungswiderstände der Sensorleitung zu inneren Knoten
    [1, 2, 3, 4, 6, 7].forEach((n) => net.R('S-P' + n, 'S-i' + n, 0.55));
    net.R('S-P5', 'S-P8', 0.4); // Schirme im Sensorstecker verbunden
    net.D('S-i1', 'S-i2', 1.72); // rote LED (660 nm): Anode an Leitung A
    net.D('S-i2', 'S-i1', 1.18); // IR-LED (940 nm): Anode an Leitung B
    net.D('S-i3', 'S-i4', 0.52); // Photodiode in Flussrichtung (nur Diodentest!)
    net.R('S-i6', 'S-i7', ID_RESISTOR);
    return net;
  }

  /** Ist die Messkette Sensor → Monitor zum Zeitpunkt t geschlossen? */
  function chainClosed(st, t) {
    if (st.adapter !== 'original') return true; // Test- oder Neukabel sind in Ordnung
    if (st.flex) return t % 4 < 1.1; // beim Bewegen kurzzeitig Kontakt
    return false;
  }

  const isMm = (a, b, x, y) => (a === x && b === y) || (a === y && b === x);

  function ensure(st, key) {
    if (!Array.isArray(st[key])) st[key] = [];
    return st[key];
  }

  /* ======================= Monitoranzeige ======================= */

  /**
   * Monitorbild für eine Signalquelle.
   * src: {kind:'patient'|'simulator', spo2, hr, perf}
   */
  function monitorFrame(st, src, t, opts) {
    const o = opts || {};
    const ok = chainClosed(st, t);
    const perfAmp = src.perf === 'high' ? 1 : src.perf === 'low' ? 0.25 : 0.65;
    const pi = src.perf === 'high' ? 5.2 : src.perf === 'low' ? 0.4 : 2.1;
    // Monitor-Anzeige gegenüber Simulatorvorgabe: definierte, kleine Abweichung (innerhalb ±2 %)
    const shownSpo2 = src.spo2 >= 90 ? src.spo2 : src.spo2 - 1;
    const alarmLow = 90;
    const values = [];
    const waves = [];
    const messages = [];
    if (o.withEcg) {
      waves.push({ id: 'ecg', label: 'II', color: '#7CFC00', fn: (tt) => U.ecgShape(((tt % (60 / src.hr)) / (60 / src.hr))) * 0.95 - 0.15 });
      values.push({ id: 'hr', label: 'HF', value: String(src.hr), unit: '/min', color: '#7CFC00' });
    }
    waves.push({
      id: 'pleth',
      label: 'Pleth',
      color: '#22d3ee',
      fn: (tt) => (chainClosed(st, tt) ? (U.plethShape((tt % (60 / src.hr)) / (60 / src.hr)) - 0.5) * 1.6 * perfAmp : null),
    });
    if (ok) {
      const alarm = shownSpo2 < alarmLow;
      values.push({ id: 'spo2', label: 'SpO₂', value: String(shownSpo2), unit: '%', color: '#22d3ee', alarm, sub: 'Alarmgrenze < ' + alarmLow });
      values.push({ id: 'pr', label: 'PF', value: String(src.hr), unit: '/min', color: '#22d3ee', sub: 'PI ' + fmt(pi, 1) });
      if (alarm) messages.push({ text: '!! SpO₂ NIEDRIG', level: 'high' });
      if (src.perf === 'low') messages.push({ text: 'SpO₂ Perfusion gering', level: 'low' });
      if (st.adapter === 'original' && st.flex) messages.push({ text: 'SpO₂ Signal instabil', level: 'med' });
    } else {
      values.push({ id: 'spo2', label: 'SpO₂', value: '---', unit: '%', color: '#22d3ee' });
      values.push({ id: 'pr', label: 'PF', value: '---', unit: '/min', color: '#22d3ee' });
      messages.push({ text: 'SpO₂ KEIN SIGNAL – SENSOR PRÜFEN', level: 'med' });
    }
    if (o.withNibp) values.push({ id: 'nibp', label: 'NIBP', value: '124/78', unit: 'mmHg (92)', color: '#f5f5f5', sub: 'vor 4 min' });
    if (o.withTemp) values.push({ id: 'temp', label: 'Temp', value: '36,8', unit: '°C', color: '#f0abfc' });
    return { waves, values, messages };
  }

  /* ======================= Fixtures ======================= */

  const adapterControl = (verify) => ({
    id: 'adapter',
    type: 'select',
    label: 'Adapterkabel im Messaufbau',
    options: verify
      ? [{ value: 'new', label: 'Neues Adapterkabel (Originalersatzteil)' }]
      : [
          { value: 'original', label: 'Original-Adapterkabel des Geräts' },
          { value: 'test', label: 'Bekannt gutes Testkabel (Werkstatt)' },
        ],
    get: (ctx) => ctx.state.adapter,
    set: (ctx, v) => {
      ctx.state.adapter = v;
    },
  });
  const sensorControl = {
    id: 'sensor',
    type: 'select',
    label: 'SpO₂-Sensor im Messaufbau',
    options: [
      { value: 'original', label: 'Original-Sensor des Geräts' },
      { value: 'test', label: 'Bekannt guter Testsensor (Werkstatt)' },
    ],
    get: (ctx) => ctx.state.sensor,
    set: (ctx, v) => {
      ctx.state.sensor = v;
    },
  };
  const flexControl = {
    id: 'flex',
    type: 'toggle',
    label: 'Biegetest: Kabel am monitorseitigen Knickschutz bewegen',
    help: 'Simuliert das vorsichtige Hin- und Herbewegen des Kabels direkt am Stecker.',
    get: (ctx) => ctx.state.flex,
    set: (ctx, v) => {
      ctx.state.flex = v;
    },
    visible: (ctx) => ctx.state.adapter === 'original',
  };

  function simulatorFixture(verify) {
    return {
      title: verify ? 'Funktionsprüfung nach Instandsetzung – SpO₂-Kette mit neuem Adapterkabel' : 'Prüfling: Patientenmonitor, SpO₂-Messkette mit Simulator-Fingerattrappe',
      monitorTitle: 'Patientenmonitor PM-5 (Lernmodell) – Bett 7',
      params: ['spo2', 'hr', 'perf'],
      defaults: { spo2: 97, hr: 75, perf: 'normal' },
      presets: [
        { label: 'Prüfpunkt 97 % / 75', settings: { spo2: 97, hr: 75, perf: 'normal' } },
        { label: 'Prüfpunkt 90 % / 100', settings: { spo2: 90, hr: 100, perf: 'normal' } },
        { label: 'Prüfpunkt 85 % / 120 (Alarm)', settings: { spo2: 85, hr: 120, perf: 'normal' } },
        { label: 'Geringe Perfusion', settings: { spo2: 97, hr: 75, perf: 'low' } },
      ],
      hint: verify
        ? 'Prüfe mindestens zwei Sättigungsstufen (z. B. 97 % und 85 %) und kontrolliere die Alarmauslösung (Alarmgrenze SpO₂ &lt; 90 %). Die Anzeige darf um max. ±2 % (Herstellerangabe im Lernmodell) von der Simulatorvorgabe abweichen.'
        : 'Der Simulator ersetzt den Finger und liefert ein <b>definiertes</b> Signal. Damit lässt sich die Messkette unabhängig vom Patienten prüfen. Nutze die Auswahl rechts für <b>Tauschtests</b> mit bekannt gutem Sensor bzw. Kabel.',
      controls: verify ? [] : [adapterControl(false), sensorControl, flexControl],
      display: (settings, ctx, t) => monitorFrame(ctx.state, Object.assign({ kind: 'simulator' }, settings), t, {}),
      onSettings: (settings, ctx) => {
        const st = ctx.state;
        if (verify || ctx.repaired) {
          if (st.adapter === 'new') {
            const pts = ensure(st, 'verifyPoints');
            if (!pts.includes(settings.spo2)) pts.push(settings.spo2);
            if (pts.length >= 2) ctx.addFinding('fc_sim_ok', 'Funktionsprüfung Simulator');
            if (settings.spo2 < 90) ctx.addFinding('fc_alarm_ok', 'Funktionsprüfung Alarm');
          }
          return;
        }
        if (st.adapter === 'original' && st.sensor === 'original' && !st.flex) ctx.addFinding('f_sim_fail', 'SpO₂-Simulator');
        if (st.adapter === 'original' && st.sensor === 'test' && !st.flex) ctx.addFinding('f_swap_sensor_fail', 'SpO₂-Simulator (Tauschtest)');
        if (st.adapter === 'test' && st.sensor === 'original') ctx.addFinding('f_swap_cable_ok', 'SpO₂-Simulator (Tauschtest)');
        if (st.adapter === 'test' && st.sensor === 'test') ctx.addFinding('f_sim_testset_ok', 'SpO₂-Simulator');
        if (st.adapter === 'original' && st.flex) ctx.addFinding('f_flex_display', 'SpO₂-Simulator (Biegetest)');
      },
    };
  }

  const MM_POINTS = []
    .concat(PINS.map((p) => ({ id: 'A-S' + p.n, label: `Adapterkabel Sensorseite – Pin ${p.n} (${p.name})`, group: 'Adapterkabel: Sensorbuchse (S)' })))
    .concat(PINS.map((p) => ({ id: 'A-M' + p.n, label: `Adapterkabel Monitorseite – Pin ${p.n} (${p.name})`, group: 'Adapterkabel: Monitorstecker (M)' })))
    .concat(PINS.map((p) => ({ id: 'S-P' + p.n, label: `Sensorstecker – Pin ${p.n} (${p.name})`, group: 'SpO₂-Sensor (ausgesteckt)' })));

  function pinDiagram(red, black) {
    const mark = (id) => (id === red ? 'red' : id === black ? 'black' : '');
    const row = (prefix, title, x) =>
      `<g transform="translate(${x},0)"><text x="0" y="14" class="dg-title">${title}</text>` +
      PINS.map((p, i) => {
        const id = prefix + p.n;
        const m = mark(id);
        return `<g transform="translate(0,${26 + i * 22})"><circle cx="10" cy="0" r="7" class="pin ${m}"/><text x="24" y="4" class="dg-pin">${p.n} ${p.name}</text></g>`;
      }).join('') +
      '</g>';
    return (
      '<svg viewBox="0 0 330 210" class="pin-diagram" role="img" aria-label="Steckerbelegung Lernmodell">' +
      row('A-S', 'Kabel S (Sensorseite)', 0) +
      row('A-M', 'Kabel M (Monitorseite)', 170) +
      '</svg><div class="muted small">Belegung: fiktives Lernmodell. Reale Belegungen nur aus Herstellerunterlagen.</div>'
    );
  }

  const multimeterFixture = {
    title: 'Prüflinge (spannungsfrei, ausgesteckt): Original-Adapterkabel und Original-SpO₂-Sensor',
    modes: ['ohm', 'continuity', 'diode'],
    points: MM_POINTS,
    defaults: { mode: 'continuity', red: 'A-S1', black: 'A-M1' },
    hint:
      '<b>Vorgehen:</b> Jede Ader von Sensorseite (S) zu Monitorseite (M) auf Durchgang prüfen (gleiche Pin-Nummer). Danach benachbarte Adern gegeneinander auf Schluss prüfen. Am Sensor mit dem Diodentest LEDs und Photodiode prüfen (beide Polaritäten!) und den Kodierwiderstand messen. Für intermittierende Fehler den <b>Biegetest</b> aktivieren.',
    controls: [
      {
        id: 'flex',
        type: 'toggle',
        label: 'Biegetest: Kabel am monitorseitigen Knickschutz bewegen',
        get: (ctx) => ctx.state.flex,
        set: (ctx, v) => {
          ctx.state.flex = v;
        },
      },
    ],
    diagram: (ctx, red, black) => pinDiagram(red, black),
    measure(mode, a, b, ctx, tick) {
      const st = ctx.state;
      const sameItem = a.slice(0, 2) === b.slice(0, 2);
      if (!sameItem) return { text: 'OL', unit: mode === 'diode' ? 'V' : 'Ω', value: Infinity, note: 'Die Messspitzen liegen an zwei verschiedenen Prüflingen – kein Stromkreis.' };
      const net = a.startsWith('A-') ? adapterNet('original', st.flex, tick) : sensorNet();
      const r = MTRL.measureNetlist(net, mode, a, b);
      const pa = Number(a.slice(3));
      const pb = Number(b.slice(3));
      let note = '';
      if (a.startsWith('A-')) {
        const ends = (a[2] !== b[2]) && pa === pb; // gleiche Ader, Ende-zu-Ende
        if (ends && (mode === 'ohm' || mode === 'continuity')) {
          const measured = ensure(st, 'mmLines');
          if (!measured.includes(pa)) measured.push(pa);
          if (pa === 3) {
            if (st.flex) {
              ctx.addFinding('f_mm_flex_intermittent', 'Multimeter');
              note = 'Anzeige springt zwischen OL und wechselnden Werten – typisch für einen Aderbruch mit Wackelkontakt.';
            } else {
              ctx.addFinding('f_mm_pin3_open', 'Multimeter');
              note = 'Keine Verbindung zwischen S3 und M3: Ader unterbrochen.';
            }
          } else if (measured.filter((n) => n !== 3).length >= 4) {
            ctx.addFinding('f_mm_other_ok', 'Multimeter');
          }
        } else if (!ends && pa !== pb && (mode === 'ohm' || mode === 'continuity')) {
          if (a[2] === b[2]) {
            ctx.addFinding('f_mm_no_short', 'Multimeter');
            note = 'Zwischen zwei verschiedenen Adern: kein Schluss (Isolation in Ordnung).';
          } else note = 'Verschiedene Pin-Nummern an beiden Enden – keine gemeinsame Ader.';
        }
      } else {
        if (mode === 'diode' && isMm(a, b, 'S-P1', 'S-P2')) {
          const led = a === 'S-P1' ? 'rote LED (660 nm)' : 'IR-LED (940 nm)';
          note = `Flussspannung der ${led}. Beide Richtungen zeigen einen Wert, da die LEDs antiparallel geschaltet sind.`;
          const dirs = ensure(st, 'ledDirs');
          if (!dirs.includes(a)) dirs.push(a);
          if (dirs.length >= 2) ctx.addFinding('f_mm_sensor_led_ok', 'Multimeter (Diodentest)');
        }
        if (mode === 'diode' && isMm(a, b, 'S-P3', 'S-P4')) {
          const dirs = ensure(st, 'pdDirs');
          if (!dirs.includes(a)) dirs.push(a);
          note = a === 'S-P3' ? 'Photodiode in Durchlassrichtung: ca. 0,5 V – typisch für eine Silizium-Photodiode.' : 'Sperrrichtung: OL – korrekt.';
          if (dirs.length >= 2) ctx.addFinding('f_mm_sensor_pd_ok', 'Multimeter (Diodentest)');
        }
        if ((mode === 'ohm') && isMm(a, b, 'S-P6', 'S-P7')) {
          note = 'Kodierwiderstand des Sensors (Lernmodell-Wert 6,81 kΩ ± 1 %).';
          ctx.addFinding('f_mm_sensor_id_ok', 'Multimeter');
        }
      }
      return Object.assign({}, r, { note });
    },
  };

  /* ---------- Oszilloskop ---------- */
  const PERIOD = 0.002; // 500 Hz Multiplex: Rot – dunkel – IR – dunkel
  function ledDrive(t) {
    const ph = (t % PERIOD) / PERIOD;
    // LED-Strom regelt bei fehlendem Licht auf Maximum → etwas höhere Treiberspannung
    return ph < 0.25 ? 1 : ph >= 0.5 && ph < 0.75 ? -1 : 0;
  }
  function oscFixture() {
    const HR = 72;
    return {
      title: 'Lernmodell SpO₂-Modul, Gehäuse geöffnet (nur Simulation), Proband am Sensor (Finger)',
      testpoints: [
        { id: 'TP1', label: 'TP1 LED-Treiber', desc: 'Spannung über den antiparallelen LEDs (Leitung A gegen B)' },
        { id: 'TP2', label: 'TP2 Photodioden-Verstärker', desc: 'Ausgang des Transimpedanzverstärkers (Licht → Spannung)' },
        { id: 'TP3', label: 'TP3 Pleth (IR, AC)', desc: 'Demoduliertes, gefiltertes Pulssignal des IR-Kanals' },
        { id: 'TP4', label: 'TP4 +5 V Modul', desc: 'Versorgungsspannung des Moduls (isolierte Seite)' },
        { id: 'TP5', label: 'TP5 Daten Modul → CPU', desc: 'Serielle Datenleitung zur Hauptplatine (3,3-V-Logik)' },
      ],
      defaults: { ch1: 'TP1', ch2: 'TP2', vdiv1: 1, vdiv2: 0.5, tdiv: 0.0005 },
      hint:
        '<b>Signalverfolgung:</b> Beginne an der Ursache (TP1 – werden die LEDs angesteuert?) und gehe Stufe für Stufe weiter (TP2 – kommt Licht an der Photodiode an?). Vergleiche mit Testkabel. Für TP3 Zeitbasis ca. 0,2 s/div wählen. <br><span class="warn-inline">⚠ Lernsimulation: Reale Messungen im geöffneten Gerät nur durch qualifiziertes Personal nach Herstellerunterlagen.</span>',
      controls: [adapterControl(false), flexControl],
      sample(tp, t, ctx) {
        const st = ctx.state;
        const closed = chainClosed(st, t);
        const n = U.noise(7, t * 977) * 0.004;
        switch (tp) {
          case 'TP1': {
            const lvl = ledDrive(t);
            const max = !closed; // AGC auf Maximum bei fehlendem Licht
            return lvl > 0 ? (max ? 1.92 : 1.78) + n : lvl < 0 ? -(max ? 1.31 : 1.21) + n : n;
          }
          case 'TP2': {
            if (!closed) return 0.012 * Math.sin(2 * Math.PI * 50 * t) + n * 2; // offener Eingang: nur Brumm/Rauschen
            const lvl = ledDrive(t);
            const puls = 1 - 0.018 * U.plethShape((t % (60 / HR)) / (60 / HR));
            const amb = 0.06;
            return lvl > 0 ? 0.82 * puls + amb + n : lvl < 0 ? 1.14 * puls + amb + n : amb + n;
          }
          case 'TP3': {
            if (!closed) return U.noise(3, t * 333) * 0.006;
            return (U.plethShape((t % (60 / HR)) / (60 / HR)) - 0.45) * 0.08 + n;
          }
          case 'TP4':
            return 5.02 + 0.006 * Math.sin(2 * Math.PI * 1000 * t) + n * 0.5;
          case 'TP5': {
            // Datenframes 4× pro Sekunde, 115,2 kBd (stilisiert)
            const fr = t % 0.25;
            if (fr > 0.012) return 3.3 + n;
            const bit = Math.floor(fr / (1 / 11520));
            return (U.noise(bit, Math.floor(t / 0.25)) > 0 ? 3.3 : 0) + n;
          }
          default:
            return 0;
        }
      },
      onView(s, ctx) {
        const st = ctx.state;
        [s.ch1, s.ch2].forEach((tp) => {
          if (tp === 'TP1') ctx.addFinding('f_osc_led_ok', 'Oszilloskop');
          if (tp === 'TP2' && st.adapter === 'original' && !st.flex) ctx.addFinding('f_osc_pd_none', 'Oszilloskop');
          if (tp === 'TP2' && st.adapter === 'test') ctx.addFinding('f_osc_pd_testcable', 'Oszilloskop');
          if (tp === 'TP4') ctx.addFinding('f_osc_supply_ok', 'Oszilloskop');
          if (tp === 'TP5') ctx.addFinding('f_osc_comm_ok', 'Oszilloskop');
        });
      },
    };
  }

  const safetyFixture = {
    title: 'Wiederholungsprüfung nach IEC 62353 – Patientenmonitor PM-5 (Lernmodell)',
    deviceName: 'Patientenmonitor PM-5 (Lernmodell), Inv.-Nr. MT-04711',
    protectionClass: 'I',
    detachableCord: true,
    appliedParts: [
      { id: 'ecg', name: 'EKG', type: 'CF' },
      { id: 'spo2', name: 'SpO₂', type: 'BF' },
      { id: 'nibp', name: 'NIBP', type: 'BF' },
    ],
    hint: 'Für den Austausch eines Zubehörkabels ist eine elektrische Sicherheitsprüfung nicht in jedem Fall vorgeschrieben – Umfang nach Herstellervorgabe und Betreiberfestlegung. In diesem Fall ist laut (fiktivem) Prüfplan ohnehin eine Wiederholungsprüfung fällig und wird mit der Freigabe kombiniert.',
    values: () => ({ visual: true, pe: 0.084, insulation: Infinity, equipmentLeakage: 118, applied: { ecg: 6.4, spo2: 9.1, nibp: 4.2 } }),
    onResult: (r, ctx) => {
      if (r.ok && ctx.repaired) ctx.addFinding('fc_safety_ok', 'Sicherheitsanalysator');
    },
  };

  /* ======================= Fallbeschreibung ======================= */

  MTRL.registerCase({
    id: 'pm-spo2-no-signal',
    deviceId: 'patient-monitor',
    title: 'Patientenmonitor zeigt keine Sauerstoffsättigung an',
    short: 'SpO₂ „Kein Signal“',
    difficulty: 'Einsteiger – Fortgeschritten',
    duration: '30–45 min',
    tags: ['Sensorfehler', 'Kabelbruch', 'Signalweg', 'intermittierender Fehler'],
    summary:
      'Ein Intensiv-Monitor zeigt trotz angelegtem Sensor keine SpO₂-Werte. Systematische Fehlersuche entlang der Messkette – vom Finger bis zum Display.',
    minFindingsForCauses: 6,

    situation: {
      ticket: {
        'Auftrag': 'IH-2026-0417 (Übungsauftrag)',
        'Gerät': 'Patientenmonitor PM-5 (generisches Lernmodell)',
        'Inventarnummer': 'MT-04711',
        'Standort': 'Intensivstation 2, Bett 7',
        'Meldende Person': 'Pflegefachkraft, Frühdienst',
        'Priorität': 'hoch – Ersatzgerät wurde bereitgestellt',
        'Meldetext': '„SpO₂ geht seit heute Morgen gar nicht mehr. Sensor haben wir schon gewechselt. Die letzten Tage war es auch schon mal kurz weg.“',
      },
      html:
        '<p>Der Monitor wurde von der Station außer Betrieb genommen, durch ein Ersatzgerät ersetzt und mit dem gesamten Zubehör (SpO₂-Sensor, SpO₂-Adapterkabel, EKG-Kabel, NIBP-Schlauch) in die Medizintechnik gebracht. Ein <b>Aufbereitungsnachweis</b> (Wischdesinfektion) liegt bei.</p>' +
        '<p>Deine Aufgabe: Fehler reproduzieren, Ursache systematisch eingrenzen, das Gerät fachgerecht instand setzen, prüfen, dokumentieren und freigeben.</p>',
      checklist: [
        'Aufbereitungsnachweis vorhanden? – Ja, Wischdesinfektion dokumentiert.',
        'Gerät eindeutig identifiziert (Inventarnummer, Typ, Seriennummer)? – Ja.',
        'Zubehör vollständig mitgeliefert? – Ja (Sensor, Adapterkabel, EKG-Kabel, NIBP-Schlauch).',
        'Ersatzgerät auf Station? – Ja, Patientenversorgung ist gesichert.',
      ],
    },

    symptom: {
      html:
        '<p>Nach dem Anschluss an einen Probanden (Kollegin, gesunder Finger) zeigt der Monitor folgendes Bild: Das <b>EKG</b> läuft, <b>NIBP</b> misst korrekt, die <b>Temperatur</b> wird angezeigt. Die <b>Plethysmogramm-Kurve fehlt</b>, statt SpO₂ und Pulsfrequenz erscheinen Striche („---“), in der Meldungszeile steht „SpO₂ kein Signal – Sensor prüfen“.</p>' +
        '<p>Am Sensor leuchtet die rote LED sichtbar (die Infrarot-LED ist für das Auge unsichtbar).</p>',
      display: (st, t) => monitorFrame(Object.assign({}, st, { flex: false }), { kind: 'patient', spo2: 98, hr: 72, perf: 'normal' }, t, { withEcg: true, withNibp: true, withTemp: true }),
      observations: [
        'Fehlerbild betrifft ausschließlich den SpO₂-Kanal.',
        'Die rote LED im Sensor leuchtet → LED-Ansteuerung arbeitet zumindest teilweise.',
        'Laut Station trat der Fehler zuerst sporadisch auf.',
      ],
    },

    basics: [
      {
        title: 'Messprinzip der Pulsoxymetrie',
        html:
          '<p>Sauerstoffbeladenes (HbO₂) und sauerstoffarmes Hämoglobin (Hb) absorbieren Licht unterschiedlich stark. Der Sensor durchleuchtet das Gewebe abwechselnd mit <b>rotem Licht (~660 nm)</b> und <b>Infrarotlicht (~940 nm)</b>. Eine <b>Photodiode</b> auf der gegenüberliegenden Seite misst das durchgelassene Licht.</p>' +
          '<p>Mit jedem Herzschlag nimmt das arterielle Blutvolumen kurz zu – das erzeugt einen kleinen pulsierenden Anteil (<b>AC</b>, ca. 0,5–5 %) auf einem großen Gleichanteil (<b>DC</b>, Gewebe, venöses Blut). Das Gerät bildet das Verhältnis</p>' +
          '<p class="formula">R = (AC<sub>rot</sub> / DC<sub>rot</sub>) / (AC<sub>IR</sub> / DC<sub>IR</sub>)</p>' +
          '<p>und ordnet R über eine <b>empirisch ermittelte, herstellerspezifische Kalibrierkurve</b> einem SpO₂-Wert zu (ungefähr: R ≈ 0,5 → ~100 %, R ≈ 1 → ~85 %).</p>',
      },
      {
        title: 'Aufbau von Sensor und Adapterkabel',
        html:
          '<ul><li><b>Zwei LEDs</b> (rot, IR) sind häufig <b>antiparallel</b> an zwei Leitungen angeschlossen; die Polarität der Treiberspannung bestimmt, welche LED leuchtet.</li>' +
          '<li><b>Photodiode</b> mit eigenem, <b>geschirmtem</b> Leitungspaar – die Signalströme liegen im Bereich weniger µA bis nA und sind sehr störempfindlich.</li>' +
          '<li><b>Kodierung</b> (z. B. Widerstand oder Speicherchip): Das Modul erkennt daran, ob und welcher Sensortyp angeschlossen ist.</li>' +
          '<li>Das <b>Adapter- bzw. Verlängerungskabel</b> verbindet den Sensor mit dem Monitor. Es wird bei jeder Patientenlagerung bewegt und ist ein typisches <b>Verschleißteil</b>.</li></ul>',
      },
      {
        title: 'Signalweg im SpO₂-Modul',
        html:
          '<div class="chain">' +
          ['LED-Treiber (Multiplex Rot/IR)', 'LEDs im Sensor', 'Gewebe/Finger', 'Photodiode', 'Adapterkabel (geschirmt)', 'Transimpedanzverstärker', 'Demodulation & Filter', 'A/D-Wandler & DSP', 'Bus → Hauptplatine', 'Anzeige & Alarm']
            .map((s) => `<span class="chain-el">${s}</span>`)
            .join('<span class="chain-arrow">→</span>') +
          '</div>' +
          '<p>Der Treiber schaltet die LEDs im schnellen Wechsel (Rot – dunkel – IR – dunkel). In der Dunkelphase wird das <b>Umgebungslicht</b> gemessen und abgezogen. Der <b>Transimpedanzverstärker</b> wandelt den Photostrom in eine Spannung. Fehlt das Licht am Verstärker, erhöht die Regelung meist den <b>LED-Strom bis zum Maximum</b> – ein nützlicher Diagnosehinweis.</p>',
      },
      {
        title: 'Meldungen richtig deuten',
        html:
          '<table class="plain"><thead><tr><th>Meldung (generisch)</th><th>Was das Modul „sieht“</th><th>Typische Ursachen</th></tr></thead><tbody>' +
          '<tr><td>„Kein Sensor“ / „Sensor ab“</td><td>Kodierung nicht lesbar</td><td>Sensor nicht gesteckt, Kodierleitung unterbrochen, Stecker defekt</td></tr>' +
          '<tr><td>„Kein Signal“ / „Pulssuche“</td><td>Sensor erkannt, aber kein auswertbares Licht/Pulssignal</td><td>Sensor nicht am Finger, Photodiodenleitung unterbrochen, Photodiode defekt, sehr schlechte Perfusion</td></tr>' +
          '<tr><td>„Signal schwach / Perfusion gering“</td><td>Pulsanteil sehr klein</td><td>Kalte Finger, Vasokonstriktion, falsche Sensorgröße</td></tr>' +
          '<tr><td>„Störung / Bewegung“</td><td>Unplausible, verrauschte Signale</td><td>Bewegung, Fremdlicht, defekte Schirmung</td></tr>' +
          '</tbody></table><p class="muted">Genaue Meldetexte und ihre Bedeutung sind herstellerspezifisch – maßgeblich ist die Gebrauchsanweisung bzw. das Servicehandbuch.</p>',
      },
      {
        title: 'Systematische Fehlersuche',
        html:
          '<ol><li><b>Fehler reproduzieren</b> und eingrenzen (Welcher Kanal? Immer oder sporadisch?).</li>' +
          '<li><b>Einfaches zuerst:</b> Anwendung, Sichtprüfung, Selbsttest, Fehlerprotokoll.</li>' +
          '<li><b>Definiertes Signal einspeisen</b> (Simulator) – damit ist der Patient als Einflussgröße ausgeschlossen.</li>' +
          '<li><b>Messkette teilen</b> (Halbierungsmethode) und <b>Tauschtests mit bekannt guten Teilen</b> durchführen.</li>' +
          '<li><b>Ursache messtechnisch belegen</b>, nicht nur vermuten (z. B. Durchgangsprüfung).</li>' +
          '<li>Erst dann instand setzen – kein „Tausch auf Verdacht“.</li></ol>',
      },
    ],

    findings: [
      { id: 'f_user_intermittent', text: 'Station: Fehler trat zunächst sporadisch auf, seit heute dauerhaft', cat: 'Anamnese' },
      { id: 'f_user_multi', text: 'Station: Fehler bei verschiedenen Patienten; Einmal-/Mehrwegsensor bereits gewechselt', cat: 'Anamnese' },
      { id: 'f_visual_kink', text: 'Sichtprüfung: Knickschutz des Adapterkabels am Monitorstecker verformt, Mantel gestaucht', cat: 'Sichtprüfung' },
      { id: 'f_visual_connector_ok', text: 'Sichtprüfung: Gerätebuchse und Steckerkontakte sauber, nicht verbogen, Verriegelung i. O.', cat: 'Sichtprüfung' },
      { id: 'f_visual_housing_ok', text: 'Sichtprüfung: Gehäuse, Display, Netzkabel ohne Befund', cat: 'Sichtprüfung' },
      { id: 'f_symptom_confirmed', text: 'Fehler reproduziert: SpO₂ „---“, keine Pleth-Kurve, Meldung „Kein Signal“', cat: 'Funktion' },
      { id: 'f_other_params_ok', text: 'EKG, NIBP und Temperatur funktionieren am Probanden korrekt', cat: 'Funktion' },
      { id: 'f_application_ok', text: 'Anwendung i. O.: kein Nagellack, kein Fremdlicht, gute Perfusion, Sensor korrekt positioniert', cat: 'Funktion' },
      { id: 'f_selftest_ok', text: 'Selbsttest bestanden; SpO₂-Modul kommuniziert fehlerfrei mit der Hauptplatine', cat: 'Servicemenü' },
      { id: 'f_sensor_detected', text: 'Servicemenü: Sensor wird erkannt (Kodierung gelesen: Erwachsenen-Fingerclip)', cat: 'Servicemenü' },
      { id: 'f_led_current_max', text: 'Servicemenü: LED-Strom regelt auf Maximum, empfangenes Lichtsignal ≈ 0', cat: 'Servicemenü' },
      { id: 'f_log_pattern', text: 'Fehlerprotokoll: seit ca. 3 Wochen gehäuft „SpO₂ kein Signal“, keine Modul-/Kommunikationsfehler', cat: 'Protokoll' },
      { id: 'f_sim_fail', text: 'SpO₂-Simulator (definiertes Signal): keine Messwerte – Patient/Anwendung als Ursache ausgeschlossen', cat: 'Simulator' },
      { id: 'f_swap_sensor_fail', text: 'Tauschtest: bekannt guter Sensor + Original-Adapterkabel → weiterhin kein Signal', cat: 'Tauschtest' },
      { id: 'f_swap_cable_ok', text: 'Tauschtest: bekannt gutes Adapterkabel + Original-Sensor → korrekte Messwerte', cat: 'Tauschtest' },
      { id: 'f_sim_testset_ok', text: 'Testkabel + Testsensor am Monitor → korrekte Messwerte (Modul und Monitor i. O.)', cat: 'Tauschtest' },
      { id: 'f_flex_display', text: 'Biegetest am Monitor: bei Bewegung des Kabels erscheinen kurzzeitig Messwerte', cat: 'Simulator' },
      { id: 'f_mm_pin3_open', text: 'Multimeter: Ader Pin 3 (Photodiode +) im Adapterkabel unterbrochen (OL)', cat: 'Messung' },
      { id: 'f_mm_flex_intermittent', text: 'Multimeter + Biegetest: Pin 3 wechselt zwischen OL und wenigen Ω (Wackelkontakt am Knickschutz)', cat: 'Messung' },
      { id: 'f_mm_other_ok', text: 'Multimeter: übrige Adern des Adapterkabels durchgängig (< 0,5 Ω)', cat: 'Messung' },
      { id: 'f_mm_no_short', text: 'Multimeter: kein Schluss zwischen benachbarten Adern', cat: 'Messung' },
      { id: 'f_mm_sensor_led_ok', text: 'Diodentest Sensor: rote LED ≈ 1,72 V, IR-LED ≈ 1,18 V – plausibel', cat: 'Messung' },
      { id: 'f_mm_sensor_pd_ok', text: 'Diodentest Sensor: Photodiode ≈ 0,52 V in Durchlass-, OL in Sperrrichtung – i. O.', cat: 'Messung' },
      { id: 'f_mm_sensor_id_ok', text: 'Sensor-Kodierwiderstand ≈ 6,81 kΩ – plausibel', cat: 'Messung' },
      { id: 'f_osc_led_ok', text: 'Oszilloskop TP1: LED-Treiber liefert Rot-/IR-Impulse (500 Hz Multiplex)', cat: 'Messung' },
      { id: 'f_osc_pd_none', text: 'Oszilloskop TP2: mit Original-Kabel kein Photodiodensignal, nur Brummen/Rauschen', cat: 'Messung' },
      { id: 'f_osc_pd_testcable', text: 'Oszilloskop TP2: mit Testkabel Photodiodenimpulse synchron zu Rot/IR vorhanden', cat: 'Messung' },
      { id: 'f_osc_supply_ok', text: 'Oszilloskop TP4: Modulversorgung +5,0 V stabil', cat: 'Messung' },
      { id: 'f_osc_comm_ok', text: 'Oszilloskop TP5: Datenframes Modul → CPU vorhanden', cat: 'Messung' },
      { id: 'fc_sim_ok', text: 'Funktionsprüfung: SpO₂ an ≥ 2 Prüfpunkten innerhalb Toleranz', cat: 'Freigabe' },
      { id: 'fc_alarm_ok', text: 'Funktionsprüfung: Alarm „SpO₂ niedrig“ wird korrekt ausgelöst', cat: 'Freigabe' },
      { id: 'fc_safety_ok', text: 'Elektrische Sicherheit nach IEC 62353: bestanden', cat: 'Freigabe' },
      { id: 'fc_final_ok', text: 'Abschluss: Sichtprüfung, Probandentest und Gesamtsystem i. O.', cat: 'Freigabe' },
    ],

    investigations: [
      {
        id: 'inv_interview',
        type: 'action',
        category: 'Anamnese',
        icon: '💬',
        title: 'Rücksprache mit der Station',
        minutes: 3,
        desc: 'Wann tritt der Fehler auf? Was wurde bereits versucht?',
        run: () => ({
          html:
            '<p><b>Pflegefachkraft:</b> „Vor zwei, drei Wochen ging die Sättigung ab und zu mal kurz weg, meistens wenn wir den Patienten gelagert haben. Seit heute früh kommt gar nichts mehr. Wir hatten das bei zwei verschiedenen Patienten. Den Fingersensor haben wir schon gegen einen neuen getauscht – hat nichts gebracht.“</p>' +
            '<p><b>Frage:</b> Wurde das Adapterkabel auch getauscht? – „Nein, nur der Sensor.“</p>',
          findings: ['f_user_intermittent', 'f_user_multi'],
        }),
      },
      {
        id: 'inv_visual',
        type: 'action',
        category: 'Sichtprüfung',
        icon: '🔍',
        title: 'Sichtprüfung von Gerät und Zubehör',
        minutes: 5,
        desc: 'Gehäuse, Display, Netzkabel, Steckverbinder, Kabel und Sensor begutachten.',
        run: () => ({
          html:
            '<ul><li>Gehäuse, Display, Bedienelemente und Netzkabel: <b>ohne Befund</b>.</li>' +
            '<li>SpO₂-Gerätebuchse: Kontakte sauber, nicht verbogen, keine Korrosion; Verriegelung rastet korrekt.</li>' +
            '<li>SpO₂-Sensor: Gehäuse und Fenster intakt, Kabel ohne Beschädigung.</li>' +
            '<li><b>SpO₂-Adapterkabel:</b> Der <b>Knickschutz am monitorseitigen Stecker ist deutlich verformt</b>, der Kabelmantel direkt dahinter ist gestaucht und weißlich verfärbt (Biegebelastung). Keine offene Beschädigung.</li></ul>' +
            '<div class="figure"><svg viewBox="0 0 360 90" role="img" aria-label="Skizze Knickschutz"><rect x="10" y="30" width="80" height="34" rx="6" fill="#455a64"/><text x="50" y="52" fill="#fff" font-size="11" text-anchor="middle">Stecker M</text><path d="M90 38 Q120 40 130 47 Q140 54 150 47" stroke="#90a4ae" stroke-width="12" fill="none"/><path d="M150 47 Q240 46 350 47" stroke="#cfd8dc" stroke-width="7" fill="none"/><circle cx="128" cy="47" r="20" fill="none" stroke="#ff7043" stroke-width="2" stroke-dasharray="4 3"/><text x="128" y="84" fill="#ff7043" font-size="11" text-anchor="middle">Knickschutz verformt</text></svg></div>',
          findings: ['f_visual_kink', 'f_visual_connector_ok', 'f_visual_housing_ok'],
        }),
      },
      {
        id: 'inv_patient',
        type: 'action',
        category: 'Funktion',
        icon: '🧑‍⚕️',
        title: 'Funktionstest am Probanden',
        minutes: 4,
        desc: 'Monitor mit eigenem Zubehör an einer Kollegin anlegen (EKG, NIBP, SpO₂, Temperatur).',
        run: () => ({
          html:
            '<p>EKG zeigt Sinusrhythmus (72/min), NIBP misst 124/78 mmHg, Temperatur 36,8 °C – <b>plausibel</b>. SpO₂: „---“, keine Pleth-Kurve, Meldung <b>„SpO₂ kein Signal – Sensor prüfen“</b>. Der Fehler ist reproduzierbar.</p>',
          findings: ['f_symptom_confirmed', 'f_other_params_ok'],
        }),
      },
      {
        id: 'inv_application',
        type: 'action',
        category: 'Funktion',
        icon: '☝️',
        title: 'Anwendungsbedingungen prüfen',
        minutes: 2,
        desc: 'Fremdlicht, Nagellack, Sensorposition, Perfusion, Bewegungsartefakte ausschließen.',
        run: () => ({
          html:
            '<p>Finger warm und gut durchblutet, kein Nagellack, Sensor korrekt (Kabel zum Handrücken, Fenster gegenüber), Raumlicht abgedunkelt bzw. Sensor abgedeckt, Proband ruhig. <b>Der Fehler bleibt unverändert bestehen.</b></p>',
          findings: ['f_application_ok'],
        }),
      },
      {
        id: 'inv_selftest',
        type: 'action',
        category: 'Servicemenü',
        icon: '🛠️',
        title: 'Selbsttest & Servicemenü (Modulstatus)',
        minutes: 5,
        desc: 'Selbsttest beim Einschalten beobachten, Modulstatus und Diagnosedaten im Servicemenü ansehen.',
        run: () => ({
          html:
            '<table class="plain"><tbody>' +
            '<tr><td>Selbsttest</td><td><b>bestanden</b></td></tr>' +
            '<tr><td>SpO₂-Modul Kommunikation</td><td>OK, 0 Paketfehler</td></tr>' +
            '<tr><td>SpO₂-Modul Firmware</td><td>Prüfsumme OK</td></tr>' +
            '<tr><td>Sensor erkannt</td><td><b>Ja</b> – Typ: Erwachsenen-Fingerclip (Kodierung gelesen)</td></tr>' +
            '<tr><td>LED-Strom Rot / IR</td><td><b>100 % / 100 %</b> (Regelgrenze erreicht)</td></tr>' +
            '<tr><td>Empfangenes Signal (DC) Rot / IR</td><td><b>0,0 % / 0,0 %</b> des Messbereichs</td></tr>' +
            '</tbody></table><p class="muted">Servicemenü-Inhalte sind herstellerspezifisch; hier: Lernmodell.</p>',
          findings: ['f_selftest_ok', 'f_sensor_detected', 'f_led_current_max'],
        }),
      },
      {
        id: 'inv_log',
        type: 'action',
        category: 'Protokoll',
        icon: '📜',
        title: 'Fehler- und Ereignisprotokoll auslesen',
        minutes: 4,
        desc: 'Technische Meldungen der letzten Wochen auswerten.',
        run: () => ({
          html:
            '<table class="plain mono"><thead><tr><th>Zeitpunkt</th><th>Meldung</th></tr></thead><tbody>' +
            '<tr><td>vor 21 Tagen</td><td>SpO₂ kein Signal (8 s)</td></tr>' +
            '<tr><td>vor 14 Tagen</td><td>SpO₂ kein Signal (35 s) · 3×</td></tr>' +
            '<tr><td>vor 6 Tagen</td><td>SpO₂ kein Signal (2 min) · 7×</td></tr>' +
            '<tr><td>gestern</td><td>SpO₂ Signal instabil · 12×</td></tr>' +
            '<tr><td>heute 06:12</td><td>SpO₂ kein Signal (dauerhaft)</td></tr>' +
            '</tbody></table><p>Keine Einträge zu Modulkommunikation, Versorgung oder Selbsttestfehlern. Das <b>zunehmende</b> Auftreten passt zu einer fortschreitenden mechanischen Schädigung.</p>',
          findings: ['f_log_pattern'],
        }),
      },
      {
        id: 'inv_sim',
        type: 'instrument',
        instrument: 'patient-simulator',
        category: 'Simulator',
        icon: '🫀',
        title: 'SpO₂-Funktionstest mit Patientensimulator (inkl. Tauschtests)',
        minutes: 8,
        desc: 'Definiertes Signal einspeisen; Sensor und Adapterkabel gegen bekannt gute Teile tauschen.',
        fixture: () => simulatorFixture(false),
      },
      {
        id: 'inv_mm',
        type: 'instrument',
        instrument: 'multimeter',
        category: 'Messung',
        icon: '🔌',
        title: 'Durchgangs- und Bauteilprüfung mit Multimeter',
        minutes: 10,
        desc: 'Adern des Adapterkabels, Isolation, Sensor-LEDs, Photodiode und Kodierung prüfen.',
        fixture: () => multimeterFixture,
      },
      {
        id: 'inv_osc',
        type: 'instrument',
        instrument: 'oscilloscope',
        category: 'Messung',
        icon: '〰',
        title: 'Signalverfolgung im SpO₂-Modul (Oszilloskop)',
        minutes: 15,
        desc: 'Lernsimulation: Testpunkte im Modul – LED-Treiber, Verstärker, Versorgung, Datenleitung.',
        fixture: () => oscFixture(),
      },
      /* ---------- Prüfungen nach der Instandsetzung ---------- */
      {
        id: 'inv_verify_sim',
        type: 'instrument',
        instrument: 'patient-simulator',
        phase: 'verify',
        category: 'Freigabe',
        icon: '✅',
        title: 'Funktionsprüfung SpO₂ nach Instandsetzung',
        minutes: 8,
        desc: 'Mehrere Prüfpunkte und Alarmauslösung mit neuem Adapterkabel prüfen.',
        fixture: () => simulatorFixture(true),
      },
      {
        id: 'inv_verify_safety',
        type: 'instrument',
        instrument: 'safety-analyzer',
        phase: 'verify',
        category: 'Freigabe',
        icon: '⚡',
        title: 'Elektrische Sicherheitsprüfung (IEC 62353)',
        minutes: 15,
        desc: 'Wiederholungsprüfung mit Sicherheitsanalysator.',
        fixture: () => safetyFixture,
      },
      {
        id: 'inv_verify_final',
        type: 'action',
        phase: 'verify',
        category: 'Freigabe',
        icon: '🏁',
        title: 'Abschließende Sichtprüfung und Probandentest',
        minutes: 5,
        desc: 'Gesamtsystem mit allen Parametern am Probanden prüfen, Zubehör vollständig, Kennzeichnung.',
        run: (ctx) => {
          if (ctx.state.adapter !== 'new') return { html: '<p>Bitte zuerst die Instandsetzung durchführen.</p>', findings: [] };
          return {
            html: '<p>Am Probanden: EKG 70/min, NIBP 122/80 mmHg, Temperatur 36,7 °C, <b>SpO₂ 98 %, PF 70/min, Pleth-Kurve stabil</b>. Auch beim Bewegen des Kabels keine Unterbrechung. Zubehör vollständig, Gerät gereinigt, Prüfstatus aktualisiert.</p>',
            findings: ['fc_final_ok'],
          };
        },
      },
    ],

    hypotheses: [
      { id: 'h_application', text: 'Anwendungsfehler (Sensorposition, Fremdlicht, Nagellack, Minderperfusion)', expected: 'excluded', evidence: ['f_application_ok', 'f_sim_fail'], explain: 'Auch unter idealen Bedingungen und mit dem Simulator (definiertes Signal) fehlt der Messwert – die Anwendung ist nicht die Ursache.' },
      { id: 'h_sensor', text: 'SpO₂-Sensor defekt', expected: 'excluded', evidence: ['f_swap_sensor_fail', 'f_mm_sensor_pd_ok'], explain: 'Ein bekannt guter Sensor ändert nichts; die Bauteilprüfung des Original-Sensors ist unauffällig. Die Station hatte den Sensor zudem schon getauscht.' },
      { id: 'h_cable', text: 'SpO₂-Adapterkabel defekt (Aderbruch/Kontaktproblem)', expected: 'confirmed', evidence: ['f_swap_cable_ok', 'f_mm_pin3_open'], explain: 'Mit Testkabel funktioniert die Messung; die Durchgangsprüfung belegt die Unterbrechung der Photodiodenleitung (Pin 3).' },
      { id: 'h_connector', text: 'Gerätebuchse/Steckverbinder am Monitor defekt', expected: 'excluded', evidence: ['f_visual_connector_ok', 'f_swap_cable_ok'], explain: 'Die Buchse ist optisch einwandfrei, und mit Testkabel funktioniert dieselbe Buchse fehlerfrei.' },
      { id: 'h_module', text: 'SpO₂-Modul defekt (LED-Treiber, Verstärker, A/D-Wandler)', expected: 'excluded', evidence: ['f_sim_testset_ok', 'f_swap_cable_ok'], explain: 'Mit intaktem Kabel liefert dasselbe Modul korrekte Werte – das Modul arbeitet. Die maximale LED-Regelung ist Folge, nicht Ursache.' },
      { id: 'h_comm', text: 'Kommunikationsfehler zwischen Modul und Hauptplatine', expected: 'excluded', evidence: ['f_selftest_ok', 'f_log_pattern'], explain: 'Selbsttest und Protokoll zeigen keine Kommunikationsfehler; das Modul meldet aktiv „Kein Signal“ – es kommuniziert also.' },
      { id: 'h_config', text: 'Konfiguration/Software (Parameter deaktiviert, falscher Sensortyp)', expected: 'excluded', evidence: ['f_sensor_detected', 'f_swap_cable_ok'], explain: 'Der Sensor wird korrekt erkannt, und mit Testkabel misst das Gerät ohne Konfigurationsänderung.' },
      { id: 'h_power', text: 'Stromversorgung/Netzteil', expected: 'excluded', evidence: ['f_other_params_ok'], explain: 'Alle übrigen Parameter, Display und Selbsttest funktionieren; ein Versorgungsfehler würde sich breiter zeigen.' },
    ],

    diagnosis: {
      tree: {
        start: 'n_other',
        nodes: {
          n_other: {
            question: 'Funktionieren die übrigen Parameter (EKG, NIBP, Temperatur) am Probanden?',
            answers: [
              { label: 'Ja – nur SpO₂ ist betroffen', correct: true, requires: ['f_other_params_ok'], next: 'n_detect', feedback: 'Richtig: Fehler ist auf den SpO₂-Kanal begrenzt. Netzteil, CPU und Display sind unwahrscheinlich.' },
              { label: 'Nein – mehrere Parameter fallen aus', correct: false, feedback: 'Prüfe das Ergebnis des Probandentests: EKG, NIBP und Temperatur waren plausibel.' },
            ],
          },
          n_detect: {
            question: 'Erkennt der Monitor den angeschlossenen Sensor?',
            answers: [
              { label: 'Ja – Sensor erkannt, aber kein Signal', correct: true, requires: ['f_sensor_detected'], next: 'n_sim', feedback: 'Richtig: Kodierleitung und Grundfunktion der Steckverbindung sind intakt. Es fehlt das optische Messsignal.' },
              { label: 'Nein – Meldung „Kein Sensor“', correct: false, feedback: 'Das Servicemenü zeigt „Sensor erkannt“. Die Meldung lautet „Kein Signal“ – das ist ein wichtiger Unterschied!' },
            ],
          },
          n_sim: {
            question: 'Liefert der Monitor mit einem definierten Simulatorsignal Messwerte?',
            answers: [
              { label: 'Nein – auch mit Simulator kein Signal', correct: true, requires: ['f_sim_fail'], next: 'n_sensor', feedback: 'Richtig: Damit sind Patient und Anwendung als Ursache ausgeschlossen. Der Fehler liegt in der Messkette.' },
              { label: 'Ja – mit Simulator funktioniert es', correct: false, feedback: 'Mit Original-Sensor und Original-Kabel zeigt der Simulatortest keine Werte.' },
            ],
          },
          n_sensor: {
            question: 'Behebt ein bekannt guter Sensor (am Original-Adapterkabel) den Fehler?',
            answers: [
              { label: 'Nein – weiterhin kein Signal', correct: true, requires: ['f_swap_sensor_fail'], next: 'n_cable', feedback: 'Richtig: Der Sensor ist nicht die Ursache (passt zur Aussage der Station).' },
              { label: 'Ja – mit neuem Sensor funktioniert es', correct: false, feedback: 'Der Tauschtest mit bekannt gutem Sensor zeigte keine Veränderung.' },
            ],
          },
          n_cable: {
            question: 'Behebt ein bekannt gutes Adapterkabel (mit Original-Sensor) den Fehler?',
            answers: [
              { label: 'Ja – mit Testkabel korrekte Werte', correct: true, requires: ['f_swap_cable_ok'], next: 'n_measure', feedback: 'Richtig: Der Fehler ist auf das Adapterkabel eingegrenzt. Jetzt messtechnisch bestätigen.' },
              { label: 'Nein – auch mit Testkabel kein Signal', correct: false, feedback: 'Mit Testkabel und Original-Sensor misst der Monitor korrekt.' },
            ],
          },
          n_measure: {
            question: 'Was ergibt die Durchgangsprüfung des Original-Adapterkabels?',
            answers: [
              { label: 'Ader Pin 3 (Photodiode +) unterbrochen, beim Biegen wechselnd', correct: true, requires: ['f_mm_pin3_open'], feedback: 'Richtig: Ursache messtechnisch belegt – Aderbruch der Photodiodenleitung.' },
              { label: 'Alle Adern durchgängig', correct: false, feedback: 'Miss jede Ader einzeln Ende-zu-Ende – eine Ader zeigt „OL“.' },
              { label: 'Schluss zwischen zwei Adern', correct: false, feedback: 'Die Isolationsprüfung zwischen benachbarten Adern war unauffällig.' },
            ],
          },
        },
      },
      rootCauses: [
        { id: 'rc_cable_break', correct: true, text: 'Aderbruch der Photodioden-Signalleitung (Pin 3) im SpO₂-Adapterkabel am monitorseitigen Knickschutz (Biegewechselermüdung)', feedback: 'Korrekt. Die Ursache ist durch Tauschtest UND Messung belegt und erklärt auch den anfangs sporadischen Verlauf.' },
        { id: 'rc_sensor_pd', correct: false, text: 'Photodiode im SpO₂-Sensor defekt', feedback: 'Nein: Diodentest der Photodiode i. O., und ein Ersatzsensor ändert nichts.' },
        { id: 'rc_module_tia', correct: false, text: 'Transimpedanzverstärker im SpO₂-Modul defekt', feedback: 'Nein: Mit Testkabel liefert das Modul korrekte Werte.' },
        { id: 'rc_connector', correct: false, text: 'Korrodierte Kontakte in der Gerätebuchse', feedback: 'Nein: Buchse optisch einwandfrei und mit Testkabel voll funktionsfähig.' },
        { id: 'rc_firmware', correct: false, text: 'Firmwarefehler im SpO₂-Modul', feedback: 'Nein: Firmware-Prüfsumme OK, und das Verhalten hängt eindeutig vom Kabel ab.' },
        { id: 'rc_application', correct: false, text: 'Fehlanwendung durch das Pflegepersonal', feedback: 'Nein: Auch mit Simulator und idealer Anwendung tritt der Fehler auf. (Die Kabelführung hat aber zur Schädigung beigetragen – siehe Erklärung.)' },
      ],
      repairActions: [
        { id: 'ra_replace_cable', verdict: 'correct', completes: true, minutes: 5, text: 'Adapterkabel durch freigegebenes Originalersatzteil (laut Ersatzteilliste des Herstellers) ersetzen', feedback: 'Richtig: Zubehörkabel werden ersetzt, nicht repariert. Typ/Artikelnummer und Charge dokumentieren.', apply: (st) => { st.adapter = 'new'; st.flex = false; } },
        { id: 'ra_quarantine', verdict: 'good', minutes: 2, text: 'Defektes Kabel kennzeichnen („defekt – nicht verwenden“) und aussondern', feedback: 'Gut: So gelangt das defekte Kabel nicht versehentlich zurück in den Umlauf.' },
        { id: 'ra_inform', verdict: 'good', minutes: 3, text: 'Station über schonende Kabelführung informieren (nicht abknicken, nicht straff um das Gerät wickeln, Zugentlastung nutzen)', feedback: 'Gut: Ursachenvermeidung gehört zur Instandhaltung.' },
        { id: 'ra_solder', verdict: 'wrong', minutes: 20, text: 'Aderbruch auftrennen, löten und mit Schrumpfschlauch isolieren', feedback: 'Nicht zulässig: Eine Eigenreparatur verändert Schirmung, Isolation, Biegefestigkeit und ggf. Ableitstromverhalten eines Anwendungsteils. Ohne Herstellerfreigabe ist das ein nicht bestimmungsgemäßer Eingriff.' },
        { id: 'ra_tape', verdict: 'wrong', minutes: 2, text: 'Knickstelle mit Klebeband stabilisieren', feedback: 'Nicht zulässig: Die Unterbrechung bleibt bestehen; zudem nicht desinfizierbar.' },
        { id: 'ra_replace_sensor', verdict: 'wrong', minutes: 3, text: 'Sensor vorsorglich tauschen', feedback: 'Tausch auf Verdacht: Der Sensor ist nachweislich in Ordnung. Verursacht unnötige Kosten.' },
        { id: 'ra_replace_module', verdict: 'wrong', minutes: 40, text: 'SpO₂-Modul tauschen', feedback: 'Tausch auf Verdacht: Das Modul arbeitet mit intaktem Kabel fehlerfrei. Hoher Aufwand ohne Nutzen.' },
        { id: 'ra_clean', verdict: 'neutral', minutes: 5, text: 'Gerätebuchse mit Kontaktreiniger behandeln', feedback: 'Nicht erforderlich: Die Buchse ist sauber. Kontaktreiniger nur, wenn vom Hersteller zugelassen.' },
      ],
      functionChecks: [
        { id: 'fc_sim', title: 'SpO₂-Funktionsprüfung mit Simulator (≥ 2 Prüfpunkte)', passFinding: 'fc_sim_ok', investigation: 'inv_verify_sim' },
        { id: 'fc_alarm', title: 'Alarmprüfung „SpO₂ niedrig“', passFinding: 'fc_alarm_ok', investigation: 'inv_verify_sim' },
        { id: 'fc_safety', title: 'Elektrische Sicherheitsprüfung nach IEC 62353', passFinding: 'fc_safety_ok', investigation: 'inv_verify_safety' },
        { id: 'fc_final', title: 'Abschließende Sichtprüfung und Probandentest', passFinding: 'fc_final_ok', investigation: 'inv_verify_final' },
      ],
    },

    explanation: {
      html:
        '<h3>Was ist passiert?</h3>' +
        '<p>Im SpO₂-Adapterkabel ist die <b>Ader der Photodioden-Signalleitung (Pin 3)</b> direkt hinter dem <b>Knickschutz am Monitorstecker</b> gebrochen. Diese Stelle wird bei jeder Lagerung und beim Aufwickeln des Kabels am stärksten gebogen. Die dünnen Litzen der Ader brechen durch <b>Biegewechselermüdung</b> nach und nach – zunächst nur einzelne Drähte, sodass die Verbindung bei Bewegung kurz abreißt (sporadische Ausfälle), schließlich vollständig.</p>' +
        '<h3>Warum zeigt der Monitor genau dieses Fehlerbild?</h3>' +
        '<ul><li>Die <b>LED-Leitungen</b> sind intakt – die rote LED leuchtet sichtbar.</li>' +
        '<li>Die <b>Kodierleitung</b> ist intakt – der Sensor wird erkannt, daher <i>nicht</i> „Kein Sensor“, sondern „<b>Kein Signal</b>“.</li>' +
        '<li>Der <b>Photostrom</b> erreicht den Verstärker nicht. Das Modul empfängt kein Licht, regelt den LED-Strom auf Maximum und meldet schließlich „Kein Signal“.</li>' +
        '<li>Alle anderen Parameter laufen über eigene Module und Kabel – sie sind nicht betroffen.</li></ul>' +
        '<h3>Warum war dieses Vorgehen sinnvoll?</h3>' +
        '<ol><li><b>Anamnese</b> (sporadisch → dauerhaft, Sensor bereits getauscht) lenkt früh den Verdacht auf einen mechanischen Kabeldefekt.</li>' +
        '<li>Der <b>Simulator</b> schließt Patient und Anwendung aus.</li>' +
        '<li>Die <b>Tauschtests</b> mit bekannt guten Teilen halbieren die Messkette und grenzen den Fehler auf das Adapterkabel ein.</li>' +
        '<li>Die <b>Durchgangsprüfung</b> belegt die Ursache physikalisch – erst damit ist die Diagnose gesichert.</li>' +
        '<li>Das <b>Oszilloskop</b> war hier nicht zwingend nötig, zeigt aber anschaulich, wo das Signal verschwindet.</li></ol>' +
        '<h3>Warum Austausch statt Reparatur?</h3>' +
        '<p>Patientenkabel sind Teil des <b>Anwendungsteils</b>. Ihre Schirmung, Isolation, Biegefestigkeit und Materialverträglichkeit (Desinfektion, Hautkontakt) sind vom Hersteller spezifiziert. Eine gelötete Stelle erfüllt diese Eigenschaften nicht nachweisbar. Zubehör wird daher gegen <b>freigegebene Originalersatzteile</b> getauscht.</p>' +
        '<h3>Vorbeugung</h3>' +
        '<ul><li>Kabel nicht abknicken und nicht straff um das Gerät wickeln, Halterungen/Zugentlastung nutzen.</li>' +
        '<li>Kabel bei der Aufbereitung auf Knickstellen prüfen (Sichtprüfung durch Anwender).</li>' +
        '<li>Häufungen im Fehlerprotokoll ernst nehmen – sporadische Ausfälle kündigen Kabelbrüche oft an.</li></ul>' +
        '<div class="callout warn"><b>Lernsimulation vs. reale Servicearbeit:</b> Belegungen, Testpunkte, Messwerte und Servicemenü sind fiktiv. Reale Diagnose- und Reparaturschritte richten sich nach den Unterlagen des Herstellers, der Qualifikation des Personals und den geltenden Vorschriften (u. a. MPBetreibV, IEC 62353).</div>',
    },

    documentation: {
      intro: 'Erstelle den Instandsetzungsbericht. Er dient als Nachweis für Betreiber, Medizinproduktebuch/Gerätedatei und spätere Fehleranalysen.',
      fields: [
        {
          id: 'symptom',
          label: 'Fehlerbeschreibung (Befund)',
          type: 'select',
          options: [
            { value: 'a', label: 'Monitor defekt' },
            { value: 'b', label: 'SpO₂ ohne Messwert (Meldung „Kein Signal“), Sensor wird erkannt; übrige Parameter i. O.; anfangs sporadisch' },
            { value: 'c', label: 'Sensor defekt laut Station' },
          ],
          correct: 'b',
          hint: 'Beschreibe den Befund konkret und überprüfbar – nicht pauschal.',
        },
        {
          id: 'cause',
          label: 'Festgestellte Ursache',
          type: 'select',
          options: [
            { value: 'a', label: 'Vermutlich Kabel' },
            { value: 'b', label: 'Aderbruch Photodiodenleitung (Pin 3) im SpO₂-Adapterkabel am monitorseitigen Knickschutz; nachgewiesen durch Tauschtest und Durchgangsprüfung' },
            { value: 'c', label: 'SpO₂-Modul defekt' },
          ],
          correct: 'b',
          hint: 'Ursache und Nachweis gehören zusammen.',
        },
        {
          id: 'action',
          label: 'Durchgeführte Maßnahme',
          type: 'select',
          options: [
            { value: 'a', label: 'Kabel gelötet' },
            { value: 'b', label: 'SpO₂-Adapterkabel gegen Originalersatzteil getauscht; defektes Kabel gekennzeichnet und ausgesondert; Station zur Kabelführung informiert' },
            { value: 'c', label: 'Sensor und Kabel getauscht' },
          ],
          correct: 'b',
        },
        {
          id: 'part',
          label: 'Verwendetes Ersatzteil',
          type: 'select',
          options: [
            { value: 'a', label: 'SpO₂-Adapterkabel, Originalersatzteil laut Herstellerliste (Artikel-Nr./Charge eintragen)' },
            { value: 'b', label: 'Universal-Verlängerungskabel aus dem Elektronikhandel' },
            { value: 'c', label: 'Kein Ersatzteil' },
          ],
          correct: 'a',
          hint: 'Nur vom Hersteller freigegebene Teile – Rückverfolgbarkeit sicherstellen.',
        },
        {
          id: 'checks',
          label: 'Durchgeführte Prüfungen nach Instandsetzung',
          type: 'multi',
          options: [
            { value: 'visual', label: 'Sichtprüfung' },
            { value: 'sim', label: 'Funktionsprüfung SpO₂ mit Simulator (mehrere Prüfpunkte)' },
            { value: 'alarm', label: 'Alarmprüfung' },
            { value: 'safety', label: 'Elektrische Sicherheitsprüfung IEC 62353' },
            { value: 'calib', label: 'Neukalibrierung der SpO₂-Kalibrierkurve' },
            { value: 'mtk', label: 'Messtechnische Kontrolle NIBP' },
          ],
          correct: ['visual', 'sim', 'alarm', 'safety'],
          hint: 'Nur tatsächlich durchgeführte Prüfungen dokumentieren. Eine SpO₂-Kalibrierkurve wird nicht vom Anwender/Techniker „neu kalibriert“.',
        },
        {
          id: 'equipment',
          label: 'Verwendete Prüfmittel (mit Inventar-Nr. und Kalibrierstatus)',
          type: 'multi',
          options: [
            { value: 'sim', label: 'SpO₂-/Patientensimulator' },
            { value: 'sa', label: 'Sicherheitsanalysator' },
            { value: 'dmm', label: 'Digitalmultimeter (Fehlersuche)' },
            { value: 'flow', label: 'Beatmungsanalysator' },
          ],
          correct: ['sim', 'sa', 'dmm'],
          hint: 'Alle für Fehlersuche und Prüfung eingesetzten Messmittel aufführen.',
        },
        {
          id: 'release',
          label: 'Ergebnis / Freigabe',
          type: 'select',
          options: [
            { value: 'a', label: 'Gerät funktions- und sicherheitstechnisch i. O. – freigegeben, Prüfstatus aktualisiert, Rückgabe an Station' },
            { value: 'b', label: 'Gerät freigegeben, Prüfungen werden nachgeholt' },
            { value: 'c', label: 'Gerät gesperrt' },
          ],
          correct: 'a',
        },
        { id: 'remark', label: 'Bemerkungen / Empfehlungen', type: 'text', required: true, minLength: 10, placeholder: 'z. B. Hinweis an Station zur Kabelführung …' },
        { id: 'tech', label: 'Prüfer/in (Name, Kürzel)', type: 'text', required: true, minLength: 2, placeholder: 'Name, Kürzel' },
      ],
    },

    quiz: [
      { q: 'Warum zeigte der Monitor „Kein Signal“ und nicht „Kein Sensor“?', options: ['Weil die Firmware fehlerhaft war', 'Weil die Kodierleitung intakt war und der Sensor erkannt wurde, aber kein Photodiodensignal ankam', 'Weil der Sensor falsch herum angelegt war', 'Weil der Akku leer war'], correct: 1, explain: 'Die Sensorerkennung läuft über die Kodierung; das Lichtsignal über die Photodiodenleitung. Nur Letztere war unterbrochen.' },
      { q: 'Welche Wellenlängen nutzt ein typischer Pulsoxymetriesensor?', options: ['ca. 450 nm und 550 nm', 'ca. 660 nm (rot) und 940 nm (infrarot)', 'ca. 1300 nm und 1550 nm', 'nur weißes Licht'], correct: 1, explain: 'Bei 660 nm und 940 nm unterscheiden sich die Absorptionen von Hb und HbO₂ deutlich.' },
      { q: 'Was beweist ein Test mit dem SpO₂-Simulator in diesem Fall?', options: ['Die Genauigkeit der Kalibrierkurve', 'Dass der Fehler nicht am Patienten/der Anwendung liegt, sondern in der Messkette', 'Dass das Modul defekt ist', 'Dass die Ableitströme in Ordnung sind'], correct: 1, explain: 'Der Simulator liefert ein definiertes Signal. Ein Funktionstester ersetzt aber keine Genauigkeitsprüfung der Kalibrierkurve.' },
      { q: 'Welche Methode grenzte den Fehler am effizientesten ein?', options: ['Tausch aller Teile auf Verdacht', 'Tauschtests mit bekannt guten Teilen (Halbierung der Messkette)', 'Firmware-Update', 'Gerät komplett zerlegen'], correct: 1, explain: 'Tauschtests mit bekannt guten Teilen teilen die Messkette in überprüfbare Abschnitte.' },
      { q: 'Warum darf das gebrochene Adapterkabel nicht gelötet werden?', options: ['Löten ist grundsätzlich verboten', 'Schirmung, Isolation, Biegefestigkeit und Ableitstromverhalten des Anwendungsteils wären nicht mehr nachweisbar gewährleistet', 'Weil Lötzinn giftig ist', 'Weil das Kabel zu dünn ist'], correct: 1, explain: 'Zubehör ist Teil des geprüften Systems; Eigenreparaturen ohne Herstellerfreigabe sind kein bestimmungsgemäßer Eingriff.' },
      { q: 'Was zeigt ein Multimeter bei einer vollständig unterbrochenen Ader im Durchgangsmodus?', options: ['0,0 Ω und Piepton', '„OL“ (Bereichsüberschreitung), kein Piepton', 'Etwa 6,8 kΩ', 'Eine negative Spannung'], correct: 1, explain: 'Kein Stromfluss → unendlicher Widerstand → „OL“.' },
      { q: 'Wie findet man einen intermittierenden Kabelbruch am zuverlässigsten?', options: ['Kabel nur ansehen', 'Durchgangsmessung während das Kabel an Knickstellen bewegt wird (Biegetest)', 'Kabel in Wasser tauchen', 'Gerät länger laufen lassen'], correct: 1, explain: 'Beim Bewegen öffnet und schließt die Bruchstelle – die Anzeige springt.' },
      { q: 'Warum regelte das Modul den LED-Strom auf Maximum?', options: ['Wegen eines Firmwarefehlers', 'Weil am Verstärker kein Licht ankam und die Regelung versuchte, das Signal zu erhöhen', 'Weil der Finger zu dick war', 'Weil das Netzteil überlastet war'], correct: 1, explain: 'Die automatische Lichtregelung erhöht den Strom, solange das Empfangssignal zu klein ist – hier vergeblich.' },
      { q: 'Welche Prüfungen gehören nach dieser Instandsetzung mindestens zur Freigabe?', options: ['Keine, Kabeltausch ist trivial', 'Sichtprüfung und Funktionsprüfung (inkl. Alarm) – elektrische Sicherheit nach Herstellervorgabe/Betreiberfestlegung', 'Nur eine messtechnische Kontrolle', 'Nur ein Firmware-Update'], correct: 1, explain: 'Funktion und Alarmierung müssen nach jeder Instandsetzung belegt werden; der Umfang der elektrischen Prüfung richtet sich nach Eingriff und Vorgaben.' },
      { q: 'Was gehört NICHT in einen Instandsetzungsbericht?', options: ['Konkreter Befund und nachgewiesene Ursache', 'Verwendete Ersatzteile mit Rückverfolgbarkeit', 'Prüfergebnisse und Prüfmittel', 'Persönliche Vermutungen über das Verhalten einzelner Pflegekräfte'], correct: 3, explain: 'Der Bericht dokumentiert sachlich Befund, Ursache, Maßnahme, Prüfungen und Freigabe.' },
    ],

    createState: () => ({ adapter: 'original', sensor: 'original', flex: false }),
  });

  // Für automatische Tests exportieren (keine Auswirkung im Browser)
  MTRL.__test = MTRL.__test || {};
  MTRL.__test.pmSpo2 = { adapterNet, sensorNet, chainClosed, multimeterFixture, oscFixture, simulatorFixture, monitorFrame };
})();
