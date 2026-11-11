/*
 * Servicefall PM-02: Patientenmonitor an der Zentrale „Offline“
 * ------------------------------------------------------------------
 * Kommunikationsproblem: Der Monitor misst und alarmiert am Bettplatz
 * korrekt, erscheint an der Überwachungszentrale aber als
 * „Verbindung verloren“.
 *
 * Definierter Fehler (deterministisch):
 *   Das Netzwerk-Patchkabel (Monitor ↔ Netzwerkdose) wurde beim
 *   Bettenumzug zwischen Bettrahmen und Wand gequetscht. Dabei ist die
 *   Ader an Pin 6 (grünes Adernpaar, bei 100BASE-TX Empfangsleitung RD−
 *   des Monitors) gebrochen. Zusätzlich ist die Rastnase des wandseitigen
 *   RJ45-Steckers abgebrochen (Zugbelastung). Beim Bewegen des Kabels
 *   entsteht zeitweise Kontakt (Link kommt kurz zustande).
 *
 * Alle Messwerte werden aus dem Zustand (state) berechnet:
 *   state.cable: 'original' | 'test' | 'new'   (Kabel im Aufbau)
 *   state.flex:  Biegetest an der Quetschstelle
 *   state.view:  'bedside' | 'central'          (Anzeige Bettplatz/Zentrale)
 *
 * Hinweis: Die RJ45-Belegung nach TIA-568 (T568B) und die Signalbelegung
 * von 100BASE-TX sind öffentlich genormt. Servicemenü, Ereignisprotokoll,
 * Adressen, Dosen-/Portnummern und Zentralen-Ansicht sind FIKTIV
 * (Lernmodell) und entsprechen keinem realen Hersteller.
 */
(function () {
  'use strict';
  const U = MTRL.util;
  const fmt = U.fmt;

  /* ============ Belegung RJ45 nach T568B (öffentlich genormt) ============ */
  // Signalnamen aus Sicht des Endgeräts (Monitor, MDI) bei 100BASE-TX.
  // r: Schleifenfreier Aderwiderstand des ca. 3 m langen Patchkabels
  // (Litze, ca. 0,14 Ω/m + Kontakte); Paare mit unterschiedlicher
  // Schlaglänge sind unterschiedlich lang → leicht abweichende Werte.
  const PINS = [
    { n: 1, color: 'weiß-orange', hex: '#f28c28', striped: true, pair: 2, sig: 'TD+ (Senden +)', r: 0.44 },
    { n: 2, color: 'orange', hex: '#f28c28', striped: false, pair: 2, sig: 'TD− (Senden −)', r: 0.44 },
    { n: 3, color: 'weiß-grün', hex: '#2e9e44', striped: true, pair: 3, sig: 'RD+ (Empfang +)', r: 0.45 },
    { n: 4, color: 'blau', hex: '#2f6fd6', striped: false, pair: 1, sig: 'bei 100BASE-TX ungenutzt', r: 0.43 },
    { n: 5, color: 'weiß-blau', hex: '#2f6fd6', striped: true, pair: 1, sig: 'bei 100BASE-TX ungenutzt', r: 0.43 },
    { n: 6, color: 'grün', hex: '#2e9e44', striped: false, pair: 3, sig: 'RD− (Empfang −)', r: 0.45 },
    { n: 7, color: 'weiß-braun', hex: '#8b5a2b', striped: true, pair: 4, sig: 'bei 100BASE-TX ungenutzt', r: 0.42 },
    { n: 8, color: 'braun', hex: '#8b5a2b', striped: false, pair: 4, sig: 'bei 100BASE-TX ungenutzt', r: 0.42 },
  ];
  const BROKEN_PIN = 6;

  /**
   * Netzliste eines Patchkabels. Knoten: <K>-A<n> (Stecker A, Monitorseite)
   * und <K>-B<n> (Stecker B, Wanddose). K = 'O' (Original) oder 'T' (Testkabel).
   */
  function cableNet(kind, flex, tick) {
    const net = new MTRL.Netlist();
    const k = kind === 'original' ? 'O' : 'T';
    PINS.forEach((p) => {
      let r = p.r;
      if (kind === 'original' && p.n === BROKEN_PIN) {
        // Aderbruch an der Quetschstelle: offen; beim Biegen zeitweise Kontakt
        if (flex) {
          const s = tick % 7;
          r = s === 1 ? 3.8 : s === 3 ? 0.9 : s === 4 ? 27 : s === 6 ? 1.6 : Infinity;
        } else r = Infinity;
      }
      net.R(k + '-A' + p.n, k + '-B' + p.n, r);
    });
    return net;
  }

  /** Physikalische Verbindung (Link) Monitor ↔ Switch zum Zeitpunkt t. */
  function linkUp(st, t) {
    if (st.cable !== 'original') return true; // Test- oder Neukabel intakt
    if (st.flex) return t % 5 < 1.2; // beim Bewegen kurzzeitig Kontakt → Link kommt kurz zustande
    return false;
  }

  function ensure(st, key) {
    if (!Array.isArray(st[key])) st[key] = [];
    return st[key];
  }

  const isAlarm = (src) => src.spo2 < 90 || src.hr > 120;

  /* ======================= Monitor- und Zentralenanzeige ======================= */

  /**
   * src: {spo2, hr, perf}; view: 'bedside' | 'central'
   * Beide Ansichten liefern genau zwei Kurven (feste Kanalzahl der Anzeige).
   */
  function monitorFrame(st, src, t, view) {
    const up = linkUp(st, t);
    const unstable = st.cable === 'original' && st.flex;
    const perfAmp = src.perf === 'high' ? 1 : src.perf === 'low' ? 0.25 : 0.65;
    const shownSpo2 = src.spo2; // Simulatorvorgabe wird unverändert angezeigt (SpO₂-Messung intakt)
    const spo2Alarm = shownSpo2 < 90;
    const hrAlarm = src.hr > 120;
    const ecg = (hr) => (tt) => U.ecgShape((tt % (60 / hr)) / (60 / hr)) * 0.95 - 0.15;
    const waves = [];
    const values = [];
    const messages = [];

    if (view === 'central') {
      waves.push({ id: 'ecg10', label: 'Bett 10 · II', color: '#7CFC00', fn: ecg(68) });
      waves.push({ id: 'ecg12', label: 'Bett 12 · II', color: '#7CFC00', fn: (tt) => (linkUp(st, tt) ? ecg(src.hr)(tt) : null) });
      values.push({ id: 'b10', label: 'Bett 10 · HF', value: '68', unit: '/min', color: '#7CFC00', sub: 'SpO₂ 97 % · online' });
      values.push({ id: 'b11', label: 'Bett 11 · HF', value: '91', unit: '/min', color: '#7CFC00', sub: 'SpO₂ 94 % · online' });
      if (up) {
        values.push({ id: 'b12', label: 'Bett 12 · HF', value: String(src.hr), unit: '/min', color: '#7CFC00', alarm: spo2Alarm || hrAlarm, sub: 'SpO₂ ' + shownSpo2 + ' % · ' + (unstable ? 'instabil' : 'online') });
        if (spo2Alarm) messages.push({ text: 'Bett 12: !! SpO₂ NIEDRIG', level: 'high' });
        if (hrAlarm) messages.push({ text: 'Bett 12: !! HF HOCH', level: 'high' });
        if (unstable) messages.push({ text: 'Bett 12: Verbindung instabil', level: 'low' });
      } else {
        values.push({ id: 'b12', label: 'Bett 12', value: 'OFFLINE', unit: '', color: '#9ca3af', sub: 'Verbindung verloren' });
        messages.push({ text: 'Bett 12: VERBINDUNG VERLOREN', level: 'med' });
      }
      values.push({ id: 'b13', label: 'Bett 13 · HF', value: '77', unit: '/min', color: '#7CFC00', sub: 'SpO₂ 98 % · online' });
      return { waves, values, messages };
    }

    // Bettseitige Anzeige: Messung und Alarmierung arbeiten lokal unabhängig vom Netzwerk
    waves.push({ id: 'ecg', label: 'II', color: '#7CFC00', fn: ecg(src.hr) });
    waves.push({ id: 'pleth', label: 'Pleth', color: '#22d3ee', fn: (tt) => (U.plethShape((tt % (60 / src.hr)) / (60 / src.hr)) - 0.5) * 1.6 * perfAmp });
    values.push({ id: 'hr', label: 'HF', value: String(src.hr), unit: '/min', color: '#7CFC00', alarm: hrAlarm, sub: 'Alarmgrenze > 120' });
    values.push({ id: 'spo2', label: 'SpO₂', value: String(shownSpo2), unit: '%', color: '#22d3ee', alarm: spo2Alarm, sub: 'Alarmgrenze < 90' });
    values.push({
      id: 'lan',
      label: 'Netzwerk',
      value: up ? (unstable ? 'wechselnd' : '100') : 'kein Link',
      unit: up && !unstable ? 'Mbit/s' : '',
      color: up ? '#a3e635' : '#9ca3af',
      sub: up ? (unstable ? 'Zentrale zeitweise verbunden' : 'Zentrale verbunden') : 'Zentrale getrennt',
    });
    if (spo2Alarm) messages.push({ text: '!! SpO₂ NIEDRIG', level: 'high' });
    if (hrAlarm) messages.push({ text: '!! HF HOCH', level: 'high' });
    if (!up) messages.push({ text: 'Keine Verbindung zur Zentrale', level: 'med' });
    else if (unstable) messages.push({ text: 'Netzwerkverbindung instabil', level: 'low' });
    return { waves, values, messages };
  }

  /* ======================= Fixtures ======================= */

  const cableControl = {
    id: 'cable',
    type: 'select',
    label: 'Patchkabel zwischen Monitor und Netzwerkdose',
    options: [
      { value: 'original', label: 'Original-Patchkabel des Bettplatzes' },
      { value: 'test', label: 'Bekannt gutes Testkabel (geprüft, konfektioniert)' },
    ],
    get: (ctx) => ctx.state.cable,
    set: (ctx, v) => {
      ctx.state.cable = v;
    },
  };
  const flexControl = {
    id: 'flex',
    type: 'toggle',
    label: 'Biegetest: Original-Patchkabel an der Quetschstelle vorsichtig bewegen',
    help: 'Simuliert das Hin- und Herbewegen des Kabels an der gequetschten Stelle.',
    get: (ctx) => ctx.state.flex,
    set: (ctx, v) => {
      ctx.state.flex = v;
    },
    visible: (ctx) => ctx.state.cable === 'original',
  };
  const viewControl = {
    id: 'view',
    type: 'select',
    label: 'Anzeige',
    options: [
      { value: 'bedside', label: 'Monitor am Bettplatz' },
      { value: 'central', label: 'Überwachungszentrale (Stationsübersicht)' },
    ],
    help: 'Die Zentrale steht im Stationsstützpunkt; eine Kollegin bzw. die IT meldet dir per Telefon, was dort angezeigt wird.',
    get: (ctx) => ctx.state.view,
    set: (ctx, v) => {
      ctx.state.view = v;
    },
  };

  function simulatorFixture(verify) {
    return {
      title: verify
        ? 'Funktionsprüfung nach Instandsetzung – Monitor mit neuem Patchkabel, Anzeige an Bettplatz und Zentrale'
        : 'Prüfaufbau: Patientenmonitor am Bettplatz 12 mit Patientensimulator (Patient verlegt)',
      monitorTitle: 'PM-5 (Lernmodell) · Bettplatz 12 bzw. Zentrale ITS 2',
      params: ['spo2', 'hr', 'perf'],
      defaults: { spo2: 97, hr: 75, perf: 'normal' },
      presets: [
        { label: 'Normalwerte 97 % / 75', settings: { spo2: 97, hr: 75, perf: 'normal' } },
        { label: 'Alarm SpO₂ 85 %', settings: { spo2: 85, hr: 75, perf: 'normal' } },
        { label: 'Alarm HF 140', settings: { spo2: 97, hr: 140, perf: 'normal' } },
      ],
      hint: verify
        ? 'Schalte die Anzeige auf die <b>Zentrale</b>: Bett 12 muss online sein und dieselben Werte zeigen wie der Monitor. Löse dann am Simulator einen <b>physiologischen Alarm</b> aus (z. B. SpO₂ 85 %) und prüfe, ob er an der Zentrale <b>dem richtigen Bett</b> zugeordnet erscheint. Die zulässige Verzögerung der Alarmweiterleitung ist herstellerspezifisch (Gebrauchsanweisung/Systembeschreibung).'
        : 'Der Simulator liefert definierte Vitalwerte – so prüfst du Messung und Alarmierung unabhängig vom Patienten. Wechsle zwischen <b>Bettplatz</b> und <b>Zentrale</b>, löse einen Alarm aus und vergleiche. Über „Prüfaufbau“ kannst du einen <b>Tauschtest</b> mit einem bekannt guten Patchkabel durchführen.',
      controls: verify ? [viewControl] : [viewControl, cableControl, flexControl],
      display: (settings, ctx, t) => monitorFrame(ctx.state, settings, t, ctx.state.view),
      onSettings: (settings, ctx) => {
        const st = ctx.state;
        const alarm = isAlarm(settings);
        if (verify || ctx.repaired) {
          if (st.cable === 'new' && st.view === 'central') {
            ctx.addFinding('fc_online_ok', 'Funktionsprüfung Zentrale');
            if (alarm) ctx.addFinding('fc_alarm_central_ok', 'Funktionsprüfung Alarmweiterleitung');
          }
          return;
        }
        if (st.cable === 'original' && !st.flex) {
          if (st.view === 'bedside') {
            ctx.addFinding('f_local_ok', 'Patientensimulator');
            if (alarm) ctx.addFinding('f_local_alarm_ok', 'Patientensimulator');
          } else if (alarm) ctx.addFinding('f_central_offline_sim', 'Patientensimulator (Zentrale)');
        }
        if (st.cable === 'test') ctx.addFinding('f_swap_cable_ok', 'Patientensimulator (Tauschtest)');
        if (st.cable === 'original' && st.flex) ctx.addFinding('f_flex_flapping', 'Patientensimulator (Biegetest)');
      },
    };
  }

  /* ---------- Multimeter: Adernprüfung des Patchkabels ---------- */
  const MM_POINTS = []
    .concat(PINS.map((p) => ({ id: 'O-A' + p.n, label: `Original, Stecker A (Monitor) – Pin ${p.n} (${p.color})`, group: 'Original-Patchkabel: Stecker A (Monitorseite)' })))
    .concat(PINS.map((p) => ({ id: 'O-B' + p.n, label: `Original, Stecker B (Dose) – Pin ${p.n} (${p.color})`, group: 'Original-Patchkabel: Stecker B (Wanddose, Rastnase ab)' })))
    .concat(PINS.map((p) => ({ id: 'T-A' + p.n, label: `Testkabel, Stecker A – Pin ${p.n} (${p.color})`, group: 'Testkabel: Stecker A' })))
    .concat(PINS.map((p) => ({ id: 'T-B' + p.n, label: `Testkabel, Stecker B – Pin ${p.n} (${p.color})`, group: 'Testkabel: Stecker B' })));

  function pinDiagram(red, black) {
    const mark = (id) => (id === red ? 'red' : id === black ? 'black' : '');
    const k = (red || black || 'O')[0] === 'T' ? 'T' : 'O';
    const swatch = (p) =>
      p.striped
        ? `<rect x="22" y="-5" width="16" height="10" fill="#f5f5f5"/><rect x="22" y="-2" width="16" height="4" fill="${p.hex}"/>`
        : `<rect x="22" y="-5" width="16" height="10" fill="${p.hex}"/>`;
    const row = (side, title, x) =>
      `<g transform="translate(${x},0)"><text x="0" y="14" class="dg-title">${title}</text>` +
      PINS.map((p, i) => {
        const id = k + '-' + side + p.n;
        return `<g transform="translate(0,${28 + i * 22})"><circle cx="10" cy="0" r="7" class="pin ${mark(id)}"/>${swatch(p)}<text x="44" y="4" class="dg-pin">${p.n} ${p.n === 1 || p.n === 2 || p.n === 3 || p.n === 6 ? p.sig.split(' ')[0] : '(frei)'}</text></g>`;
      }).join('') +
      '</g>';
    return (
      '<svg viewBox="0 0 330 215" class="pin-diagram" role="img" aria-label="RJ45-Belegung T568B">' +
      row('A', (k === 'T' ? 'Testkabel' : 'Original') + ' A (Monitor)', 0) +
      row('B', (k === 'T' ? 'Testkabel' : 'Original') + ' B (Dose)', 170) +
      '</svg><div class="muted small">Farbcode T568B (TIA-568, öffentlich genormt), 1:1-Kabel (Pin n ↔ Pin n). Signalnamen aus Sicht des Endgeräts bei 100BASE-TX.</div>'
    );
  }

  const multimeterFixture = {
    title: 'Prüflinge (ausgesteckt, beidseitig abgezogen): Original-Patchkabel und Testkabel, je ca. 3 m, T568B',
    modes: ['ohm', 'continuity'],
    points: MM_POINTS,
    defaults: { mode: 'continuity', red: 'O-A1', black: 'O-B1' },
    hint:
      '<b>Vorgehen:</b> Kabel an beiden Enden abziehen. Jede der 8 Adern von Stecker A zu Stecker B auf Durchgang prüfen (gleiche Pin-Nummer). Danach benachbarte Adern auf <b>Kurz-/Kreuzschluss</b> prüfen (gleicher Stecker, verschiedene Pins) und stichprobenartig auf <b>Vertauschung</b> (z. B. A3 gegen B6). Für Wackelkontakte den <b>Biegetest</b> zuschalten. In der Praxis erledigt ein <b>Kabeltester</b> (Wiremap) diese Prüfung in einem Schritt – das Prinzip ist dasselbe.',
    controls: [
      {
        id: 'flex',
        type: 'toggle',
        label: 'Biegetest: Original-Patchkabel an der Quetschstelle bewegen',
        get: (ctx) => ctx.state.flex,
        set: (ctx, v) => {
          ctx.state.flex = v;
        },
      },
    ],
    diagram: (ctx, red, black) => pinDiagram(red, black),
    measure(mode, a, b, ctx, tick) {
      const st = ctx.state;
      if (a[0] !== b[0]) return { text: 'OL', unit: 'Ω', value: Infinity, note: 'Die Messspitzen liegen an zwei verschiedenen Kabeln – kein Stromkreis.' };
      const kind = a[0] === 'O' ? 'original' : 'test';
      const net = cableNet(kind, st.flex, tick);
      const r = MTRL.measureNetlist(net, mode, a, b);
      const sa = a[2];
      const sb = b[2];
      const pa = Number(a.slice(3));
      const pb = Number(b.slice(3));
      let note = '';
      if (mode === 'ohm' || mode === 'continuity') {
        if (sa !== sb && pa === pb) {
          if (kind === 'original') {
            const m = ensure(st, 'mmLines');
            if (!m.includes(pa)) m.push(pa);
            if (pa === BROKEN_PIN) {
              if (st.flex) {
                ctx.addFinding('f_mm_flex_intermittent', 'Multimeter (Biegetest)');
                note = 'Anzeige springt zwischen OL und wechselnden Werten – typisch für einen Aderbruch mit Wackelkontakt an der Quetschstelle.';
              } else {
                ctx.addFinding('f_mm_pin6_open', 'Multimeter');
                note = 'Keine Verbindung zwischen A6 und B6: Ader 6 (grün) unterbrochen.';
              }
            } else {
              note = `Ader ${pa} (${PINS[pa - 1].color}) durchgängig. Erwartung bei ca. 3 m Patchkabel: deutlich unter 1 Ω.`;
              if (m.filter((n) => n !== BROKEN_PIN).length >= 4) ctx.addFinding('f_mm_other_ok', 'Multimeter');
            }
          } else {
            const m = ensure(st, 'mmTestLines');
            if (!m.includes(pa)) m.push(pa);
            note = 'Testkabel: Ader durchgängig.';
            if (m.length >= 4 && m.includes(3) && m.includes(6)) ctx.addFinding('f_mm_testcable_ok', 'Multimeter');
          }
        } else if (sa === sb && pa !== pb) {
          note = 'Zwei verschiedene Adern am selben Stecker: kein Kurz-/Kreuzschluss (Isolation zwischen den Adern in Ordnung).';
          if (kind === 'original') ctx.addFinding('f_mm_no_short', 'Multimeter');
        } else if (sa !== sb && pa !== pb) {
          note = 'Verschiedene Pin-Nummern an beiden Enden: keine Verbindung – richtig für ein 1:1-Kabel (keine Vertauschung).';
          if (kind === 'original' && pa !== BROKEN_PIN && pb !== BROKEN_PIN) ctx.addFinding('f_mm_no_miswire', 'Multimeter');
        }
      }
      return Object.assign({}, r, { note });
    },
  };

  /* ---------- Oszilloskop: differentielle Signale (Lernsimulation) ---------- */
  const FLP_PERIOD = 0.016; // Abstand der Autonegotiation-Bursts (ca. 16 ms)
  const FLP_SLOT = 62.5e-6; // Impulsabstand im Burst (62,5 µs)
  const FLP_W = 25e-6; // Darstellung verbreitert (real ca. 100 ns) – nur zur Sichtbarkeit
  const FLP_WORD = 0x01e1; // stilisiertes Fähigkeitswort (16 Datenbits)
  function flp(t, offset) {
    const tb = (((t - offset) % FLP_PERIOD) + FLP_PERIOD) % FLP_PERIOD;
    const k = Math.floor(tb / FLP_SLOT);
    if (k > 32) return 0; // 17 Takt- + 16 Datenimpulse
    if (tb - k * FLP_SLOT > FLP_W) return 0;
    const present = k % 2 === 0 || ((FLP_WORD >> ((k - 1) / 2)) & 1) === 1;
    return present ? 1 : 0;
  }
  /** MLT-3-Symbolfolge (125 MBd): Pegel 0, +1, 0, −1 zyklisch, Schrittweite je Symbol 0 oder 1. */
  function mlt3(t, seed) {
    const k = Math.floor(t / 8e-9);
    const gk = 0.5 * k + 0.25 * Math.sin(0.73 * k + seed) + 0.2 * Math.sin(0.311 * k + 2 * seed);
    const p = ((Math.floor(gk) % 4) + 4) % 4;
    return [0, 1, 0, -1][p];
  }

  function oscFixture() {
    return {
      title: 'Lernsimulation: Prüfadapter (Breakout) am Monitor und an der Netzwerkdose, differentielle Messung',
      testpoints: [
        { id: 'TP1', label: 'TP1 Monitor, Pins 1/2 (TD±)', desc: 'Sendepaar des Monitors, gemessen direkt an der LAN-Buchse des Monitors' },
        { id: 'TP2', label: 'TP2 Monitor, Pins 3/6 (RD±)', desc: 'Empfangspaar des Monitors – was vom Switch am Monitor ankommt' },
        { id: 'TP3', label: 'TP3 Dose, Pins 3/6 (Switch sendet)', desc: 'Sendesignal des Switch-Ports, gemessen an der Netzwerkdose' },
        { id: 'TP4', label: 'TP4 Dose, Pins 1/2 (Switch empfängt)', desc: 'Signal des Monitors, wie es an der Netzwerkdose ankommt' },
      ],
      defaults: { ch1: 'TP3', ch2: 'TP2', vdiv1: 1, vdiv2: 1, tdiv: 0.0005 },
      hint:
        '<b>Signalverfolgung:</b> Sendet der Switch (TP3)? Kommt dieses Signal am Monitor an (TP2)? Sendet der Monitor (TP1) und kommt das an der Dose an (TP4)? Ohne Link senden beide Seiten nur <b>Link-Impulse</b> (Autonegotiation-Bursts, ca. alle 16 ms); mit Link liegt ein durchgehendes <b>MLT-3-Signal</b> (±1 V, 125 MBd) an. Für kleine Signale an TP2 die Empfindlichkeit erhöhen (z. B. 20 mV/div). Die sehr kurzen Link-Impulse sind zur Sichtbarkeit verbreitert dargestellt.' +
        '<br><span class="warn-inline">⚠ Lernsimulation: Reale Messungen an Netzwerkleitungen erfordern einen Differenztastkopf bzw. geeignete Netzwerk-Messtechnik und sind mit der IT abzustimmen. In der Praxis genügen meist Kabeltester und Port-Status.</span>',
      controls: [cableControl, flexControl],
      sample(tp, t, ctx) {
        const st = ctx.state;
        const up = linkUp(st, t);
        const n = U.noise(11, t * 1013) * 0.006;
        switch (tp) {
          case 'TP1':
            return (up ? mlt3(t, 1) : 2.4 * flp(t, 0)) + n;
          case 'TP2':
            // Ader 6 offen: Stromkreis des Empfangspaares unterbrochen → kein Differenzsignal,
            // nur Rauschen und schwaches Nebensprechen vom eigenen Sendepaar (NEXT)
            if (up) return 0.97 * mlt3(t, 2) + n;
            return 0.035 * flp(t, 0) + n * 1.5;
          case 'TP3':
            return (up ? mlt3(t, 2) : 2.4 * flp(t, 0.0071)) + n;
          case 'TP4':
            return (up ? 0.97 * mlt3(t, 1) : 2.33 * flp(t, 0)) + n;
          default:
            return 0;
        }
      },
      onView(s, ctx) {
        const st = ctx.state;
        const orig = st.cable === 'original' && !st.flex;
        [s.ch1, s.ch2].forEach((tp) => {
          if (tp === 'TP1' && orig) ctx.addFinding('f_osc_tx_ok', 'Oszilloskop');
          if (tp === 'TP4' && orig) ctx.addFinding('f_osc_wall_rx_ok', 'Oszilloskop');
          if (tp === 'TP3' && orig) ctx.addFinding('f_osc_switch_tx_ok', 'Oszilloskop');
          if (tp === 'TP2' && orig) ctx.addFinding('f_osc_rx_none', 'Oszilloskop');
          if (tp === 'TP2' && st.cable === 'test') ctx.addFinding('f_osc_rx_testcable', 'Oszilloskop');
        });
      },
    };
  }

  /* ======================= Fallbeschreibung ======================= */

  MTRL.registerCase({
    id: 'pm-central-communication',
    deviceId: 'patient-monitor',
    title: 'Patientenmonitor an der Zentrale „Offline“',
    short: 'Zentrale: „Verbindung verloren“',
    difficulty: 'Fortgeschritten',
    duration: '35–50 min',
    tags: ['Kommunikation', 'Netzwerk', 'Alarmweiterleitung', 'Medizintechnik & IT', 'Kabelbruch'],
    summary:
      'Ein Monitor misst am Bett einwandfrei, an der Überwachungszentrale erscheint das Bett aber als „Verbindung verloren“ – Alarme kommen dort nicht mehr an. Systematische Fehlersuche entlang der Kommunikationskette, gemeinsam mit der IT.',
    minFindingsForCauses: 8,

    situation: {
      ticket: {
        'Auftrag': 'IH-2026-0523 (Übungsauftrag)',
        'Gerät': 'Patientenmonitor PM-5 (generisches Lernmodell)',
        'Inventarnummer': 'MT-04738',
        'Standort': 'Intensivstation 2, Zimmer 3, Bettplatz 12 (Netzwerkdose 3.12 – fiktiv)',
        'Meldende Person': 'Stationsleitung',
        'Priorität': 'hoch – Alarmweiterleitung zur Zentrale ausgefallen',
        'Parallelticket IT': 'NW-2026-1187 (fiktiv), IT-Netzwerkbetrieb informiert',
        'Meldetext': '„Bett 12 ist an der Zentrale seit gestern Nachmittag offline. Am Monitor selbst sieht alles normal aus. Wir haben den Monitor schon aus- und wieder eingeschaltet.“',
      },
      html:
        '<p>Die Überwachungszentrale im Stationsstützpunkt zeigt für Bett 12 „<b>Verbindung verloren</b>“. Damit werden Kurven, Messwerte und vor allem <b>Alarme</b> dieses Bettes dort nicht mehr angezeigt – die Pflegekräfte erfahren von einem Alarm nur noch, wenn sie ihn am Bett hören oder sehen.</p>' +
        '<p>Die Station hat den Patienten deshalb an einen anderen, an der Zentrale online überwachten Bettplatz verlegt. Der Monitor bleibt am Bettplatz 12, sodass du <b>vor Ort</b> mit Patientensimulator und Messmitteln arbeiten kannst. Die IT ist über ein Parallelticket eingebunden.</p>' +
        '<p>Deine Aufgabe: Fehler reproduzieren, die Kommunikationskette <i>Monitor → Patchkabel → Netzwerkdose → Switch → Zentrale</i> systematisch eingrenzen, den Fehler beheben, die <b>Alarmweiterleitung</b> prüfen und alles dokumentieren.</p>',
      checklist: [
        'Patientensicherheit: Patient an einen online überwachten Platz verlegt? – Ja, durch die Station veranlasst.',
        'Gerät eindeutig identifiziert (Inventarnummer, Typ)? – Ja, MT-04738.',
        'IT-Netzwerkbetrieb informiert und erreichbar? – Ja, Parallelticket NW-2026-1187 (fiktiv).',
        'Hygiene: Bettplatz nach Verlegung wischdesinfiziert? – Ja.',
        'Absprache: Keine eigenmächtigen Änderungen an Switch, Netzwerk- oder Zentralenkonfiguration – nur in Abstimmung mit der IT bzw. nach Herstellervorgabe.',
      ],
    },

    symptom: {
      html:
        '<p>Vor der Verlegung hat die Pflegekraft das Monitorbild am Bettplatz festgehalten (Abbildung): Der Monitor zeigte <b>EKG, Pleth-Kurve, Herzfrequenz und SpO₂</b> plausibel an. In der Meldungszeile stand die technische Meldung „<b>Keine Verbindung zur Zentrale</b>“, das Netzwerksymbol war durchgestrichen.</p>' +
        '<p>An der Zentrale im Stationsstützpunkt sind die Betten 10, 11 und 13 normal sichtbar. Die Kachel von Bett 12 ist grau und zeigt „<b>OFFLINE – Verbindung verloren</b>“.</p>',
      displayTitle: 'Monitor am Bettplatz 12 (Fehlerbild)',
      display: (st, t) => monitorFrame(Object.assign({}, st, { cable: 'original', flex: false }), { spo2: 96, hr: 84, perf: 'normal' }, t, 'bedside'),
      observations: [
        'Messung und Anzeige am Bettplatz funktionieren – das Problem liegt in der Übertragung zur Zentrale.',
        'Nur Bett 12 ist betroffen; die übrigen Betten sind an der Zentrale online.',
        'Ein Neustart des Monitors hat nichts geändert.',
        'Sicherheitsrelevant: Alarme von Bett 12 erreichen die Zentrale nicht.',
      ],
    },

    basics: [
      {
        title: 'Monitor, Netzwerk und Zentrale',
        html:
          '<p>Bettseitige Monitore übertragen Kurven, Messwerte, Alarme und technische Meldungen über das Klinik-Netzwerk an eine <b>Überwachungszentrale</b>. Dort sieht das Pflegepersonal alle Betten einer Station gleichzeitig.</p>' +
          '<div class="chain">' +
          ['Messmodule', 'Hauptplatine (Alarmlogik)', 'Netzwerkschnittstelle', 'Patchkabel', 'Netzwerkdose', 'Gebäudeverkabelung', 'Switch-Port', 'Netzwerk', 'Zentrale (Server/Arbeitsplatz)']
            .map((s) => `<span class="chain-el">${s}</span>`)
            .join('<span class="chain-arrow">→</span>') +
          '</div>' +
          '<p><b>Wichtig:</b> Die Alarme entstehen im Monitor selbst. Der Monitor alarmiert lokal auch ohne Netzwerk. Die Zentrale <i>verteilt</i> die Alarme zusätzlich an das Personal. Fällt die Verbindung aus, melden Zentralen üblicherweise eine technische Meldung wie „Verbindung verloren“. Ob und in welchem Umfang eine Zentrale als zuverlässige Alarmweiterleitung genutzt werden darf, legt der Hersteller in der Zweckbestimmung und Gebrauchsanweisung fest (Stichwort: verteiltes Alarmsystem, IEC 60601-1-8).</p>',
      },
      {
        title: 'Ethernet 100BASE-TX und RJ45-Belegung (T568B)',
        html:
          '<p>Viele Monitore nutzen kabelgebundenes Ethernet mit <b>100 Mbit/s (100BASE-TX)</b>. Das Kabel enthält 4 verdrillte Adernpaare (Twisted Pair). 100BASE-TX nutzt davon <b>zwei Paare</b>: eines zum Senden, eines zum Empfangen. Jedes Paar überträgt das Signal <b>differentiell</b> – ausgewertet wird die Spannungsdifferenz zwischen den beiden Adern. Fällt eine Ader eines Paares aus, ist dieser Übertragungsweg vollständig unterbrochen.</p>' +
          '<table class="plain"><thead><tr><th>Pin</th><th>Farbe T568B</th><th>Paar</th><th>100BASE-TX (Endgerät)</th></tr></thead><tbody>' +
          PINS.map((p) => `<tr><td>${p.n}</td><td>${p.color}</td><td>${p.pair}</td><td>${p.sig}</td></tr>`).join('') +
          '</tbody></table>' +
          '<p>Die Belegung nach <b>TIA-568 (T568A/T568B)</b> ist öffentlich genormt. Ein Patchkabel ist normalerweise 1:1 belegt (Pin n ↔ Pin n). Der Switch-Port arbeitet mit vertauschten Rollen (sendet auf 3/6, empfängt auf 1/2); moderne Ports erkennen die Belegung meist automatisch (Auto-MDI-X).</p>' +
          '<p>Signalform: Jedes Paar führt bei bestehender Verbindung ununterbrochen ein dreistufiges <b>MLT-3-Signal</b> mit ca. ±1 V (125 MBd) – auch in Sendepausen werden Leersymbole übertragen. Übertrager (Magnetics) an beiden Enden sorgen für eine <b>galvanische Trennung</b> zwischen Gerät und Leitung.</p>' +
          '<p class="muted">Gigabit-Ethernet (1000BASE-T) nutzt alle vier Paare. Bei einem defekten Paar schalten manche Netzwerkkomponenten auf 100 Mbit/s zurück, statt die Verbindung ganz zu verlieren – das kann einen Kabelschaden verschleiern.</p>',
      },
      {
        title: 'Link, Autonegotiation und Link-LED',
        html:
          '<p>Bevor Daten fließen, handeln Netzwerkschnittstelle und Switch-Port Geschwindigkeit und Duplex-Betrieb aus (<b>Autonegotiation</b>). Dazu senden beide Seiten regelmäßig kurze <b>Link-Impulse</b> (Bursts etwa alle 16 ms). Erst wenn <b>jede Seite die Impulse der anderen empfängt</b> und bestätigt, entsteht ein <b>Link</b>. Die <b>Link-LED</b> an der Buchse und der Port-Status am Switch zeigen das an.</p>' +
          '<p>Ist eine Übertragungsrichtung unterbrochen, kommt <b>kein Link</b> zustande – auf <b>beiden</b> Seiten. Der Switch-Port meldet dann „down“, obwohl der Monitor noch sendet.</p>',
      },
      {
        title: 'Systematisch von unten nach oben (Schichtenmodell)',
        html:
          '<p>Netzwerkfehler lassen sich am besten <b>schichtweise</b> eingrenzen (angelehnt an das OSI-Modell):</p>' +
          '<ol><li><b>Physik (Schicht 1):</b> Kabel, Stecker, Dose, Link-LED, Port-Status. Ohne Link ist alles Weitere bedeutungslos.</li>' +
          '<li><b>Sicherung (Schicht 2):</b> Port-Konfiguration, VLAN, Port-Sperren (Aufgabe der IT).</li>' +
          '<li><b>Netzwerk/Transport (Schicht 3/4):</b> IP-Adresse, Erreichbarkeit der Zentrale.</li>' +
          '<li><b>Anwendung:</b> Bettenzuordnung, Patientenzuordnung, Lizenz/Konfiguration der Zentrale.</li></ol>' +
          '<p>Typischer Denkfehler: sofort an der IP-Konfiguration „herumschrauben“, obwohl die Link-LED aus ist. Eine Konfigurationsänderung kann neue Fehler erzeugen (z. B. doppelte Adressen, falsche Bettenzuordnung).</p>',
      },
      {
        title: 'Zuständigkeiten: Medizintechnik und IT',
        html:
          '<p>Monitor, Zentrale und Netzwerk bilden zusammen ein <b>medizinisches IT-Netzwerk</b>. Für den Monitor und die Zentrale (Medizinprodukte) ist in der Regel die Medizintechnik zuständig, für Switches, Gebäudeverkabelung und Netzwerkkonfiguration die IT. Wer für das Patchkabel am Bettplatz zuständig ist, muss im Haus geregelt sein.</p>' +
          '<p>Die Normenreihe <b>IEC 80001-1</b> beschreibt, wie Risiken beim Einbinden von Medizinprodukten in IT-Netzwerke über klare Verantwortlichkeiten, Risikomanagement und Änderungsmanagement beherrscht werden. Für den sicheren Betrieb von Medizinprodukten ist nach MPBetreibV der Betreiber verantwortlich – deshalb gilt: Störungen gemeinsam eingrenzen, Änderungen abstimmen, Ergebnisse dokumentieren.</p>',
      },
    ],

    findings: [
      { id: 'f_user_since_move', text: 'Station: Verbindung zur Zentrale fehlt seit Bettenumzug und Zimmerreinigung gestern Nachmittag', cat: 'Anamnese' },
      { id: 'f_user_brief_return', text: 'Station: Verbindung kam einmal kurz zurück, als das Bett verschoben wurde – dann wieder „Offline“', cat: 'Anamnese' },
      { id: 'f_user_local_ok', text: 'Station: Messwerte und Alarme am Bettplatz unauffällig; Neustart des Monitors ohne Wirkung', cat: 'Anamnese' },
      { id: 'f_visual_latch_broken', text: 'Sichtprüfung: Rastnase am wandseitigen RJ45-Stecker abgebrochen, Stecker sitzt lose in der Dose', cat: 'Sichtprüfung' },
      { id: 'f_visual_crushed', text: 'Sichtprüfung: Patchkabel ca. 40 cm vor der Dose gequetscht (Mantel abgeflacht, Abdruck des Bettrahmens)', cat: 'Sichtprüfung' },
      { id: 'f_visual_ports_ok', text: 'Sichtprüfung: LAN-Buchse am Monitor und Netzwerkdose ohne sichtbare Beschädigung, Kontakte nicht verbogen', cat: 'Sichtprüfung' },
      { id: 'f_visual_housing_ok', text: 'Sichtprüfung: Gehäuse, Display und Netzkabel des Monitors ohne Befund', cat: 'Sichtprüfung' },
      { id: 'f_link_led_off', text: 'LAN-Buchse am Monitor: Link-LED und Aktivitäts-LED aus', cat: 'Gerätestatus' },
      { id: 'f_monitor_msg', text: 'Monitor: technische Meldung „Keine Verbindung zur Zentrale“, Netzwerksymbol durchgestrichen', cat: 'Gerätestatus' },
      { id: 'f_service_nolink', text: 'Servicemenü (fiktiv): Netzwerkstatus „Kein Link“, Autonegotiation ohne Partner', cat: 'Servicemenü' },
      { id: 'f_config_unchanged', text: 'Servicemenü: IP-Konfiguration und Bettenzuordnung (ITS2-12) unverändert, identisch mit Inbetriebnahmeprotokoll', cat: 'Servicemenü' },
      { id: 'f_linkflap_log', text: 'Ereignisprotokoll: gestern ab 14:31 wiederholte Link-Wechsel, seit 14:58 dauerhaft „Kein Link“', cat: 'Protokoll' },
      { id: 'f_it_central_ok', text: 'IT: Zentrale arbeitet normal, alle anderen Betten der Station online', cat: 'IT-Abgleich' },
      { id: 'f_it_port_down', text: 'IT: Switch-Port der Dose 3.12 „down“ mit Link-Wechseln seit gestern 14:31; Port-Konfiguration unverändert, nicht gesperrt', cat: 'IT-Abgleich' },
      { id: 'f_it_port_test_ok', text: 'IT-Netzwerktester an Dose 3.12 (eigenes Kabel): Link vorhanden, Port erreicht das Medizingeräte-Netz', cat: 'IT-Abgleich' },
      { id: 'f_local_ok', text: 'Simulator am Bettplatz: Monitor zeigt die vorgegebenen Werte korrekt an', cat: 'Simulator' },
      { id: 'f_local_alarm_ok', text: 'Simulator am Bettplatz: physiologischer Alarm wird am Monitor lokal korrekt ausgelöst', cat: 'Simulator' },
      { id: 'f_central_offline_sim', text: 'Zentrale: Bett 12 „Verbindung verloren“; ein am Simulator ausgelöster Alarm erscheint dort nicht', cat: 'Simulator' },
      { id: 'f_swap_cable_ok', text: 'Tauschtest: mit bekannt gutem Patchkabel Link vorhanden, Bett 12 an der Zentrale online (Netzwerkschnittstelle i. O.)', cat: 'Tauschtest' },
      { id: 'f_flex_flapping', text: 'Biegetest am Original-Patchkabel: Verbindung kommt kurzzeitig zustande und reißt wieder ab', cat: 'Tauschtest' },
      { id: 'f_mm_pin6_open', text: 'Multimeter: Ader Pin 6 (grün, Empfangspaar RD−) im Original-Patchkabel unterbrochen (OL)', cat: 'Messung' },
      { id: 'f_mm_flex_intermittent', text: 'Multimeter + Biegetest: Ader 6 wechselt zwischen OL und wechselnden Werten von ca. 1–30 Ω (Bruch an der Quetschstelle)', cat: 'Messung' },
      { id: 'f_mm_other_ok', text: 'Multimeter: übrige Adern des Original-Patchkabels durchgängig (ca. 0,4 Ω)', cat: 'Messung' },
      { id: 'f_mm_no_short', text: 'Multimeter: kein Kurz-/Kreuzschluss zwischen den Adern', cat: 'Messung' },
      { id: 'f_mm_no_miswire', text: 'Multimeter: keine Vertauschung – Belegung 1:1 (T568B auf beiden Seiten)', cat: 'Messung' },
      { id: 'f_mm_testcable_ok', text: 'Multimeter: Testkabel – alle geprüften Adern einschließlich 3 und 6 durchgängig', cat: 'Messung' },
      { id: 'f_osc_tx_ok', text: 'Oszilloskop TP1: Monitor sendet Link-Impulse (Autonegotiation) auf Pins 1/2', cat: 'Messung' },
      { id: 'f_osc_wall_rx_ok', text: 'Oszilloskop TP4: Link-Impulse des Monitors kommen an der Dose an (Paar 1/2 intakt)', cat: 'Messung' },
      { id: 'f_osc_switch_tx_ok', text: 'Oszilloskop TP3: Switch sendet Link-Impulse an der Dose (Pins 3/6)', cat: 'Messung' },
      { id: 'f_osc_rx_none', text: 'Oszilloskop TP2: am Monitor kommt auf Pins 3/6 kein Differenzsignal an (nur Rauschen/Nebensprechen)', cat: 'Messung' },
      { id: 'f_osc_rx_testcable', text: 'Oszilloskop TP2 mit Testkabel: MLT-3-Datensignal ca. ±1 V, Link aktiv', cat: 'Messung' },
      { id: 'fc_online_ok', text: 'Funktionsprüfung: Bett 12 an der Zentrale online, Werte identisch mit Bettplatz', cat: 'Freigabe' },
      { id: 'fc_alarm_central_ok', text: 'Funktionsprüfung: physiologischer Alarm vom Simulator wird an der Zentrale bei Bett 12 angezeigt', cat: 'Freigabe' },
      { id: 'fc_bed_ok', text: 'Funktionsprüfung: Bettenzuordnung an der Zentrale korrekt (Bett 12 ↔ MT-04738), keine Verwechslung', cat: 'Freigabe' },
      { id: 'fc_final_ok', text: 'Abschluss: Link stabil, IT-Rückmeldung Port i. O., Kabelführung gesichert, Station informiert', cat: 'Freigabe' },
    ],

    investigations: [
      {
        id: 'inv_interview',
        type: 'action',
        category: 'Anamnese',
        icon: '💬',
        title: 'Rücksprache mit der Station',
        minutes: 3,
        desc: 'Seit wann besteht der Fehler? Was ist vorher passiert? Was wurde bereits versucht?',
        run: () => ({
          html:
            '<p><b>Stationsleitung:</b> „Gestern Nachmittag wurde das Zimmer grundgereinigt, dafür haben wir das Bett ein Stück von der Wand weggezogen und danach wieder zurückgeschoben. Seitdem ist Bett 12 an der Zentrale offline. Einmal war es kurz wieder da, als jemand das Bett verschoben hat – dann wieder weg.“</p>' +
            '<p>„Am Monitor selbst ist alles normal, Werte und Alarme kommen. Wir haben ihn aus- und wieder eingeschaltet, hat nichts gebracht. An der Konfiguration hat niemand etwas geändert.“</p>',
          findings: ['f_user_since_move', 'f_user_brief_return', 'f_user_local_ok'],
        }),
      },
      {
        id: 'inv_visual',
        type: 'action',
        category: 'Sichtprüfung',
        icon: '🔍',
        title: 'Sichtprüfung: Monitor, Patchkabel, Netzwerkdose',
        minutes: 5,
        desc: 'Kabelweg vom Monitor bis zur Wanddose verfolgen, Stecker, Buchsen und Mantel begutachten.',
        run: () => ({
          html:
            '<ul><li>Monitor: Gehäuse, Display, Bedienelemente, Netzkabel <b>ohne Befund</b>. LAN-Buchse am Monitor sauber, Kontaktfedern gerade.</li>' +
            '<li>Netzwerkdose 3.12 (fiktiv) in der Wandschiene hinter dem Bett: Abdeckung intakt, Kontakte nicht verbogen, Beschriftung vorhanden.</li>' +
            '<li><b>Wandseitiger RJ45-Stecker:</b> Die <b>Rastnase ist abgebrochen</b>, der Stecker sitzt nicht verriegelt in der Dose und lässt sich ohne Widerstand herausziehen.</li>' +
            '<li><b>Patchkabel:</b> ca. 40 cm vor der Dose ist der Mantel <b>abgeflacht und eingedrückt</b> – passend zum Rahmen des Bettes, das dort an der Wand steht. Keine offen liegenden Adern.</li></ul>' +
            '<div class="figure"><svg viewBox="0 0 360 100" role="img" aria-label="Skizze Quetschstelle und Stecker">' +
            '<rect x="300" y="18" width="50" height="60" rx="4" fill="#455a64"/><text x="325" y="92" fill="#cfd8dc" font-size="10" text-anchor="middle">Dose 3.12</text>' +
            '<rect x="262" y="38" width="38" height="20" rx="3" fill="#90a4ae"/><line x1="270" y1="38" x2="262" y2="30" stroke="#ff7043" stroke-width="2" stroke-dasharray="3 2"/>' +
            '<text x="262" y="24" fill="#ff7043" font-size="10" text-anchor="middle">Rastnase ab</text>' +
            '<path d="M10 48 L170 48" stroke="#cfd8dc" stroke-width="7" fill="none"/><path d="M170 48 L200 48" stroke="#cfd8dc" stroke-width="3" fill="none"/><path d="M200 48 L262 48" stroke="#cfd8dc" stroke-width="7" fill="none"/>' +
            '<circle cx="185" cy="48" r="20" fill="none" stroke="#ff7043" stroke-width="2" stroke-dasharray="4 3"/><text x="185" y="88" fill="#ff7043" font-size="10" text-anchor="middle">Quetschstelle (Bettrahmen)</text>' +
            '<text x="40" y="36" fill="#cfd8dc" font-size="10">zum Monitor</text></svg></div>',
          findings: ['f_visual_latch_broken', 'f_visual_crushed', 'f_visual_ports_ok', 'f_visual_housing_ok'],
        }),
      },
      {
        id: 'inv_status',
        type: 'action',
        category: 'Gerätestatus',
        icon: '💡',
        title: 'Gerätestatus und Link-LED am Monitor ablesen',
        minutes: 2,
        desc: 'Meldungen am Monitor, Netzwerksymbol und LEDs an der LAN-Buchse beobachten (Original-Patchkabel gesteckt).',
        run: () => ({
          html:
            '<p>Meldungszeile: „<b>Keine Verbindung zur Zentrale</b>“ (technische Meldung, niedrige Priorität). Das Netzwerksymbol in der Statusleiste ist durchgestrichen.</p>' +
            '<p>LAN-Buchse an der Geräterückseite (Original-Patchkabel gesteckt, Stecker an der Dose von Hand festgehalten): <b>Link-LED aus, Aktivitäts-LED aus</b>. Auch nach mehreren Sekunden kein Aufleuchten.</p>' +
            '<p class="muted">Bedeutung und Farben der LEDs sind herstellerspezifisch; hier: Lernmodell (Link-LED leuchtet bei bestehender Verbindung, Aktivitäts-LED blinkt bei Datenverkehr).</p>',
          findings: ['f_link_led_off', 'f_monitor_msg'],
        }),
      },
      {
        id: 'inv_service',
        type: 'action',
        category: 'Servicemenü',
        icon: '🛠️',
        title: 'Servicemenü: Netzwerkstatus und Konfiguration (fiktiv)',
        minutes: 5,
        desc: 'Netzwerkstatus, Konfiguration und Ereignisprotokoll im (fiktiven) Servicemenü ansehen – nur lesen, nichts ändern.',
        run: () => ({
          html:
            '<table class="plain"><tbody>' +
            '<tr><td>Link-Status</td><td><b>Kein Link</b></td></tr>' +
            '<tr><td>Autonegotiation</td><td><b>kein Partner erkannt</b></td></tr>' +
            '<tr><td>Geschwindigkeit/Duplex</td><td>—</td></tr>' +
            '<tr><td>IP-Adresse (statisch)</td><td>192.0.2.112 / 255.255.255.0 <span class="muted">(Dokumentationsadressbereich, Lernmodell)</span></td></tr>' +
            '<tr><td>Zentrale</td><td>192.0.2.10</td></tr>' +
            '<tr><td>Bettenzuordnung</td><td>ITS2-12</td></tr>' +
            '<tr><td>Konfiguration geändert</td><td>zuletzt bei Inbetriebnahme – <b>identisch</b> mit Inbetriebnahmeprotokoll</td></tr>' +
            '<tr><td>Empfangene Pakete (seit Neustart)</td><td>0</td></tr>' +
            '</tbody></table>' +
            '<p><b>Ereignisprotokoll Netzwerk (Auszug):</b></p>' +
            '<table class="plain mono"><thead><tr><th>Zeitpunkt</th><th>Ereignis</th></tr></thead><tbody>' +
            '<tr><td>gestern 14:31</td><td>Link down</td></tr>' +
            '<tr><td>gestern 14:31–14:58</td><td>Link up/down · 11×</td></tr>' +
            '<tr><td>gestern 14:58</td><td>Link down (seitdem dauerhaft)</td></tr>' +
            '<tr><td>heute 07:40</td><td>Neustart durch Anwender – Link down</td></tr>' +
            '</tbody></table>' +
            '<p class="muted">Servicemenü-Inhalte, Adressen und Bezeichnungen sind herstellerspezifisch; hier: fiktives Lernmodell. Konfigurationsänderungen nur in Abstimmung mit IT und nach Herstellervorgabe.</p>',
          findings: ['f_service_nolink', 'f_config_unchanged', 'f_linkflap_log'],
        }),
      },
      {
        id: 'inv_it',
        type: 'action',
        category: 'IT-Abgleich',
        icon: '🖧',
        title: 'Abgleich mit der IT (Zentrale, andere Betten, Switch-Port)',
        minutes: 8,
        desc: 'Mit dem IT-Netzwerkbetrieb telefonieren: Status der Zentrale, Port-Status, Test der Netzwerkdose.',
        run: () => ({
          html:
            '<p><b>IT-Netzwerkbetrieb</b> (Parallelticket NW-2026-1187, fiktiv):</p>' +
            '<ul><li>„Die Zentrale der ITS 2 läuft normal. Alle anderen Betten der Station sind online, keine Störungsmeldungen im Netz.“</li>' +
            '<li>„Der Switch-Port hinter Dose 3.12 steht auf <b>down</b>. Im Port-Protokoll sehe ich gestern ab 14:31 mehrere Link-Wechsel, seit 14:58 nichts mehr. Die Port-Konfiguration (VLAN Medizingeräte) ist unverändert, der Port ist nicht gesperrt.“</li>' +
            '<li>Die IT-Kollegin kommt vorbei und steckt einen <b>Netzwerktester</b> mit eigenem, kurzem Kabel direkt in Dose 3.12: <b>Link 1 Gbit/s, Vollduplex</b>, der Tester erreicht das Medizingeräte-Netz. Dose, Gebäudeverkabelung und Switch-Port sind damit in Ordnung.</li></ul>' +
            '<p class="muted">Bezeichnungen, Dosen- und Portnummern: fiktiv. Arbeiten am Switch und an der Gebäudeverkabelung sind Aufgabe der IT.</p>',
          findings: ['f_it_central_ok', 'f_it_port_down', 'f_it_port_test_ok'],
        }),
      },
      {
        id: 'inv_sim',
        type: 'instrument',
        instrument: 'patient-simulator',
        category: 'Simulator',
        icon: '🫀',
        title: 'Monitor und Zentrale mit Patientensimulator prüfen (inkl. Tauschtest)',
        minutes: 10,
        desc: 'Definierte Werte und Alarme einspeisen, Bettplatz und Zentrale vergleichen, Patchkabel gegen bekannt gutes Kabel tauschen.',
        fixture: () => simulatorFixture(false),
      },
      {
        id: 'inv_mm',
        type: 'instrument',
        instrument: 'multimeter',
        category: 'Messung',
        icon: '🔌',
        title: 'Adernprüfung des Patchkabels mit Multimeter',
        minutes: 10,
        desc: 'Alle 8 Adern auf Durchgang, Kurz-/Kreuzschluss und Vertauschung prüfen; Biegetest an der Quetschstelle.',
        fixture: () => multimeterFixture,
      },
      {
        id: 'inv_osc',
        type: 'instrument',
        instrument: 'oscilloscope',
        category: 'Messung',
        icon: '〰',
        title: 'Datensignale an Monitor und Dose (Oszilloskop, Lernsimulation)',
        minutes: 12,
        desc: 'Lernsimulation: differentielle Signale der Sende- und Empfangspaare an Monitor und Netzwerkdose vergleichen.',
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
        title: 'Funktionsprüfung: Verbindung und Alarmweiterleitung zur Zentrale',
        minutes: 10,
        desc: 'Bett 12 an der Zentrale online? Simulator-Alarm an der Zentrale beim richtigen Bett?',
        fixture: () => simulatorFixture(true),
      },
      {
        id: 'inv_verify_bed',
        type: 'action',
        phase: 'verify',
        category: 'Freigabe',
        icon: '🛏️',
        title: 'Bettenzuordnung an der Zentrale prüfen',
        minutes: 5,
        desc: 'Gemeinsam mit der Station: Erscheint der Monitor in der richtigen Bettkachel? Keine Verwechslung mit anderen Betten?',
        run: (ctx) => {
          if (ctx.state.cable !== 'new') return { html: '<p>Bitte zuerst die Instandsetzung durchführen.</p>', findings: [] };
          return {
            html:
              '<table class="plain"><tbody>' +
              '<tr><td>Kachel an der Zentrale</td><td>Bett 12 (ITS2-12)</td></tr>' +
              '<tr><td>Gerätekennung in der Kachel</td><td>PM-5, MT-04738 – <b>stimmt</b> mit dem Gerät am Bettplatz überein</td></tr>' +
              '<tr><td>Kontrolle mit Simulator</td><td>HF am Simulator von 75 auf 140/min verstellt – Änderung erscheint <b>nur</b> in Kachel Bett 12, nicht bei 10, 11 oder 13</td></tr>' +
              '<tr><td>Uhrzeit Monitor/Zentrale</td><td>synchron</td></tr>' +
              '</tbody></table>' +
              '<p>Die Zuordnung des Patienten (Aufnahme/Patientendaten an der Zentrale) nimmt die Station nach der Rückverlegung vor und kontrolliert sie am Bett.</p>',
            findings: ['fc_bed_ok'],
          };
        },
      },
      {
        id: 'inv_verify_final',
        type: 'action',
        phase: 'verify',
        category: 'Freigabe',
        icon: '🏁',
        title: 'Abschluss: Link-Stabilität, IT-Rückmeldung, Kabelführung',
        minutes: 15,
        desc: 'Link über einige Minuten beobachten, Rückmeldung der IT einholen, Kabelweg sichern, Station informieren.',
        run: (ctx) => {
          if (ctx.state.cable !== 'new') return { html: '<p>Bitte zuerst die Instandsetzung durchführen.</p>', findings: [] };
          return {
            html:
              '<ul><li>Servicemenü (fiktiv): <b>Link 100 Mbit/s Vollduplex</b>, nach 15 min Beobachtung <b>0 Link-Wechsel</b>, keine Empfangsfehler. Link-LED leuchtet, Aktivitäts-LED blinkt.</li>' +
              '<li>IT bestätigt: Port „up“, keine Fehlerzähler, Ticket NW-2026-1187 kann geschlossen werden.</li>' +
              '<li>Neues Patchkabel mit intakter Rastnase sicher eingerastet (Zugprobe), Kabel außerhalb des Bettrahmens in der Kabelhalterung der Wandschiene geführt.</li>' +
              '<li>Simulator entfernt, Bettplatz an die Station übergeben; Station über Ursache und Kabelführung informiert.</li></ul>',
            findings: ['fc_final_ok'],
          };
        },
      },
    ],

    hypotheses: [
      { id: 'h_config', text: 'Konfigurationsfehler (IP-Adresse, Bettenzuordnung) nach dem Umzug', expected: 'excluded', evidence: ['f_config_unchanged', 'f_swap_cable_ok'], explain: 'Die Konfiguration ist identisch mit dem Inbetriebnahmeprotokoll, und mit einem anderen Kabel ist der Monitor ohne jede Konfigurationsänderung online. Außerdem: Ohne Link (Schicht 1) kann die IP-Konfiguration gar nicht wirksam werden.' },
      { id: 'h_central', text: 'Störung der Überwachungszentrale', expected: 'excluded', evidence: ['f_it_central_ok'], explain: 'Die Zentrale arbeitet, alle anderen Betten sind online. Ein Fehler der Zentrale würde mehrere Betten betreffen.' },
      { id: 'h_port', text: 'Switch-Port bzw. Netzwerkinfrastruktur defekt oder gesperrt', expected: 'excluded', evidence: ['f_it_port_test_ok'], explain: 'Der Netzwerktester der IT bekommt an derselben Dose Link und erreicht das Netz; der Port ist nicht gesperrt. Der Port-Status „down“ ist Folge, nicht Ursache.' },
      { id: 'h_outlet', text: 'Netzwerkdose (Wandauslass) defekt', expected: 'excluded', evidence: ['f_it_port_test_ok', 'f_visual_ports_ok'], explain: 'Dose optisch unauffällig; der Test mit Netzwerktester direkt an der Dose ist erfolgreich.' },
      { id: 'h_nic', text: 'Netzwerkschnittstelle des Monitors defekt', expected: 'excluded', evidence: ['f_swap_cable_ok'], explain: 'Mit bekannt gutem Patchkabel bekommt derselbe Monitor sofort Link und ist an der Zentrale online.' },
      { id: 'h_cable', text: 'Netzwerk-Patchkabel beschädigt (Aderbruch durch Quetschung)', expected: 'confirmed', evidence: ['f_swap_cable_ok', 'f_mm_pin6_open'], explain: 'Der Tauschtest grenzt den Fehler auf das Kabel ein, die Durchgangsprüfung belegt die Unterbrechung der Ader 6 (Empfangspaar).' },
      { id: 'h_latch_only', text: 'Nur der lose Stecker (Rastnase abgebrochen) – das Kabel selbst ist intakt', expected: 'excluded', evidence: ['f_mm_pin6_open', 'f_link_led_off'], explain: 'Die Rastnase ist zwar abgebrochen, aber auch bei festgehaltenem Stecker gibt es keinen Link, und die Messung am ausgesteckten Kabel zeigt den Aderbruch. Der lose Stecker ist ein zusätzlicher Mangel, nicht die alleinige Ursache.' },
      { id: 'h_monitor_alarm', text: 'Mess- bzw. Alarmfunktion des Monitors gestört', expected: 'excluded', evidence: ['f_local_ok', 'f_local_alarm_ok'], explain: 'Mit dem Simulator misst der Monitor korrekt und löst lokal Alarme aus. Gestört ist nur die Weiterleitung zur Zentrale.' },
    ],

    diagnosis: {
      tree: {
        start: 'n_local',
        nodes: {
          n_local: {
            question: 'Misst und alarmiert der Monitor am Bettplatz korrekt?',
            answers: [
              { label: 'Ja – Werte und lokale Alarme mit Simulator korrekt', correct: true, requires: ['f_local_ok', 'f_local_alarm_ok'], next: 'n_central', feedback: 'Richtig: Messkette und Alarmlogik arbeiten. Das Problem liegt in der Übertragung zur Zentrale.' },
              { label: 'Nein – auch lokal fehlen Werte', correct: false, feedback: 'Prüfe den Simulatortest am Bettplatz: Werte und Alarme wurden korrekt angezeigt.' },
            ],
          },
          n_central: {
            question: 'Ist die Zentrale selbst funktionsfähig?',
            answers: [
              { label: 'Ja – andere Betten sind online, nur Bett 12 fehlt', correct: true, requires: ['f_it_central_ok'], next: 'n_link', feedback: 'Richtig: Ein Fehler der Zentrale würde mehrere Betten betreffen. Der Fehler liegt auf dem Weg von Bett 12 zum Netzwerk.' },
              { label: 'Nein – die Zentrale ist gestört', correct: false, feedback: 'Die IT bestätigt: Zentrale läuft, alle anderen Betten sind online.' },
            ],
          },
          n_link: {
            question: 'Hat der Monitor eine physikalische Netzwerkverbindung (Link)?',
            answers: [
              { label: 'Nein – kein Link: Fehler auf der physikalischen Ebene (Schicht 1)', correct: true, requires: ['f_service_nolink', 'f_link_led_off'], next: 'n_port', feedback: 'Richtig: Ohne Link ist die IP-Konfiguration nicht die Ursache. Jetzt Kabel, Dose und Port eingrenzen.' },
              { label: 'Ja – Link vorhanden, also liegt es an der IP-Konfiguration', correct: false, feedback: 'Link-LED und Servicemenü zeigen: kein Link. Erst die physikalische Ebene klären, bevor an der Konfiguration gesucht wird.' },
            ],
          },
          n_port: {
            question: 'Funktionieren Netzwerkdose und Switch-Port mit einem Testgerät?',
            answers: [
              { label: 'Ja – Netzwerktester bekommt an der Dose Link', correct: true, requires: ['f_it_port_test_ok'], next: 'n_swap', feedback: 'Richtig: Infrastruktur bis zur Dose in Ordnung. Übrig bleiben Patchkabel und Netzwerkschnittstelle des Monitors.' },
              { label: 'Nein – der Port ist defekt', correct: false, feedback: 'Der Netzwerktester der IT bekam an derselben Dose Link. Der Port-Status „down“ ist nur die Folge.' },
            ],
          },
          n_swap: {
            question: 'Bekommt der Monitor mit einem bekannt guten Patchkabel Link und Verbindung zur Zentrale?',
            answers: [
              { label: 'Ja – mit Testkabel online', correct: true, requires: ['f_swap_cable_ok'], next: 'n_measure', feedback: 'Richtig: Die Netzwerkschnittstelle des Monitors arbeitet. Der Fehler ist auf das Patchkabel eingegrenzt – jetzt messtechnisch belegen.' },
              { label: 'Nein – auch mit Testkabel kein Link', correct: false, feedback: 'Mit dem Testkabel war Bett 12 sofort online.' },
            ],
          },
          n_measure: {
            question: 'Was ergibt die Adernprüfung des Original-Patchkabels?',
            answers: [
              { label: 'Ader 6 (grün, Empfangspaar) unterbrochen, beim Biegen wechselnd; übrige Adern i. O., kein Kreuzschluss', correct: true, requires: ['f_mm_pin6_open'], feedback: 'Richtig: Ursache messtechnisch belegt – Aderbruch im Empfangspaar durch Quetschung.' },
              { label: 'Alle Adern durchgängig – nur der Stecker ist locker', correct: false, feedback: 'Miss jede Ader einzeln von Stecker A nach B – Ader 6 zeigt „OL“.' },
              { label: 'Kurzschluss zwischen Pin 3 und Pin 6', correct: false, feedback: 'Die Prüfung zwischen den Adern ergab keinen Kurz-/Kreuzschluss.' },
            ],
          },
        },
      },
      rootCauses: [
        { id: 'rc_cable', correct: true, text: 'Netzwerk-Patchkabel beim Bettenumzug gequetscht: Aderbruch Pin 6 (Empfangspaar des Monitors); zusätzlich Rastnase am wandseitigen Stecker abgebrochen', feedback: 'Korrekt. Durch Tauschtest UND Messung belegt; erklärt auch die kurzzeitige Verbindung beim Bewegen des Bettes.' },
        { id: 'rc_latch', correct: false, text: 'Nur die abgebrochene Rastnase – der Stecker rutscht aus der Dose', feedback: 'Nicht ausreichend: Auch mit festgehaltenem Stecker kein Link, und die Messung zeigt den Aderbruch an Pin 6.' },
        { id: 'rc_config', correct: false, text: 'IP-Adresse bzw. Bettenzuordnung beim Umzug verändert', feedback: 'Nein: Konfiguration unverändert, und mit Testkabel ist der Monitor ohne Änderung online.' },
        { id: 'rc_port', correct: false, text: 'Switch-Port defekt oder von der IT gesperrt', feedback: 'Nein: Der Netzwerktester bekommt an derselben Dose Link; Port nicht gesperrt.' },
        { id: 'rc_nic', correct: false, text: 'Netzwerkschnittstelle (Hauptplatine) des Monitors defekt', feedback: 'Nein: Mit Testkabel arbeitet die Schnittstelle einwandfrei.' },
        { id: 'rc_central', correct: false, text: 'Software- bzw. Serverstörung der Zentrale', feedback: 'Nein: Alle anderen Betten sind online.' },
      ],
      repairActions: [
        { id: 'ra_replace_cable', verdict: 'correct', completes: true, minutes: 5, text: 'Patchkabel in Absprache mit der IT gegen ein konfektioniertes, geprüftes Kabel (passende Kategorie und Länge, Knickschutz) tauschen', feedback: 'Richtig: Patchkabel werden ersetzt, nicht repariert. Kabeltyp und Herkunft dokumentieren.', apply: (st) => { st.cable = 'new'; st.flex = false; } },
        { id: 'ra_inform_it', verdict: 'good', minutes: 3, text: 'IT informieren: Ursache, Kabeltausch, Port-Status nach dem Tausch prüfen lassen, Tickets verknüpfen', feedback: 'Gut: Medizintechnik und IT arbeiten am selben System – beide brauchen den gleichen Kenntnisstand.' },
        { id: 'ra_routing', verdict: 'good', minutes: 5, text: 'Kabel außerhalb des Fahr- und Klemmbereichs des Bettes führen (vorhandene Kabelhalterung), Station informieren', feedback: 'Gut: Ursache beseitigt, nicht nur Symptom. Bauliche Änderungen an der Wandschiene wären Sache der Haustechnik/IT.' },
        { id: 'ra_quarantine', verdict: 'good', minutes: 1, text: 'Defektes Patchkabel kennzeichnen und entsorgen', feedback: 'Gut: So landet das beschädigte Kabel nicht wieder in der Kabelkiste.' },
        { id: 'ra_tape_latch', verdict: 'wrong', minutes: 2, text: 'Stecker mit Klebeband in der Dose fixieren und Kabel weiterverwenden', feedback: 'Nicht zulässig: Der Aderbruch bleibt bestehen; das Provisorium ist weder dauerhaft noch hygienisch.' },
        { id: 'ra_crimp', verdict: 'wrong', minutes: 15, text: 'Neuen RJ45-Stecker vor Ort auf das beschädigte Kabel crimpen und ohne Prüfung wieder einsetzen', feedback: 'Nicht sinnvoll: Die Quetschstelle bleibt im Kabel, und eine ungeprüfte Vor-Ort-Konfektion ist für eine sicherheitsrelevante Alarmweiterleitung keine verlässliche Lösung.' },
        { id: 'ra_reconfig', verdict: 'wrong', minutes: 10, text: 'IP-Adresse und Bettenzuordnung im Monitor neu eingeben', feedback: 'Falsch: Die Konfiguration ist korrekt. Unabgestimmte Änderungen können doppelte Adressen oder falsche Bettenzuordnungen verursachen – Alarme würden dann womöglich beim falschen Bett angezeigt.' },
        { id: 'ra_replace_board', verdict: 'wrong', minutes: 60, text: 'Hauptplatine/Netzwerkschnittstelle des Monitors tauschen', feedback: 'Tausch auf Verdacht: Mit Testkabel arbeitet die Schnittstelle einwandfrei. Hoher Aufwand und Gerätestillstand ohne Nutzen.' },
        { id: 'ra_restart_port', verdict: 'neutral', minutes: 3, text: 'IT bitten, den Switch-Port neu zu starten', feedback: 'Unschädlich, aber wirkungslos: Der Port ist in Ordnung; der Fehler liegt im Kabel.' },
      ],
      functionChecks: [
        { id: 'fc_online', title: 'Bett 12 an der Zentrale online, Werte identisch', passFinding: 'fc_online_ok', investigation: 'inv_verify_sim' },
        { id: 'fc_alarm', title: 'Alarmweiterleitung: Simulator-Alarm erscheint an der Zentrale', passFinding: 'fc_alarm_central_ok', investigation: 'inv_verify_sim' },
        { id: 'fc_bed', title: 'Bettenzuordnung an der Zentrale korrekt', passFinding: 'fc_bed_ok', investigation: 'inv_verify_bed' },
        { id: 'fc_final', title: 'Link-Stabilität, IT-Rückmeldung, Kabelführung', passFinding: 'fc_final_ok', investigation: 'inv_verify_final' },
      ],
    },

    explanation: {
      html:
        '<h3>Was ist passiert?</h3>' +
        '<p>Bei der Zimmerreinigung wurde das Bett von der Wand weggezogen und wieder zurückgeschoben. Dabei geriet das Netzwerk-Patchkabel zwischen Bettrahmen und Wand: Der Zug am Kabel hat die <b>Rastnase</b> des wandseitigen Steckers abgebrochen, der Bettrahmen hat das Kabel <b>gequetscht</b>. An der Quetschstelle ist die <b>Ader an Pin 6</b> (grünes Paar) gebrochen. Beim Bewegen des Bettes berührten sich die Bruchenden zeitweise – daher die Link-Wechsel im Protokoll und das kurze „Wiederauftauchen“ an der Zentrale.</p>' +
        '<h3>Warum zeigt sich genau dieses Fehlerbild?</h3>' +
        '<ul><li>Pins 3 und 6 bilden bei 100BASE-TX das <b>Empfangspaar</b> des Monitors. Das Signal ist differentiell – mit einer gebrochenen Ader ist der Stromkreis des Paares offen, am Monitor kommt <b>nichts</b> an.</li>' +
        '<li>Der Monitor sendet weiterhin (Paar 1/2 intakt), aber ein Link entsteht nur, wenn <b>beide Richtungen</b> funktionieren. Darum melden Monitor <i>und</i> Switch-Port „kein Link“.</li>' +
        '<li>Messung und Alarmierung finden im Monitor statt – lokal funktioniert daher alles. Nur die <b>Weiterleitung</b> an die Zentrale fehlt.</li>' +
        '<li>Ein Neustart ändert nichts an einer mechanischen Unterbrechung.</li></ul>' +
        '<h3>Warum war dieses Vorgehen sinnvoll?</h3>' +
        '<ol><li>Die <b>Anamnese</b> („seit dem Bettenumzug“, „kurz wieder da beim Bewegen“) weist früh auf eine mechanische Ursache hin.</li>' +
        '<li>Der <b>Simulator</b> zeigt: Messung und lokale Alarme in Ordnung – das Problem liegt in der Kommunikation.</li>' +
        '<li><b>Andere Betten online</b> schließt die Zentrale aus, <b>Link-LED aus</b> verweist auf die physikalische Ebene – die IP-Konfiguration kann ohne Link nicht die Ursache sein.</li>' +
        '<li>Der <b>Netzwerktester der IT</b> an der Dose schließt Port und Gebäudeverkabelung aus, der <b>Tauschtest</b> mit bekannt gutem Kabel die Netzwerkschnittstelle des Monitors.</li>' +
        '<li>Die <b>Adernprüfung</b> belegt die Ursache physikalisch. Das Oszilloskop war nicht zwingend nötig, zeigt aber anschaulich, wo das Signal verschwindet.</li></ol>' +
        '<h3>Warum ist das sicherheitsrelevant?</h3>' +
        '<p>Auf einer Intensivstation sind Pflegekräfte nicht ständig im Zimmer. Die Zentrale sorgt dafür, dass Alarme auch außerhalb des Zimmers wahrgenommen werden. Ist ein Bett „offline“, kann ein lebensbedrohlicher Alarm unbemerkt bleiben. Deshalb: Station sofort informieren, <b>Ersatzmaßnahme</b> sicherstellen (hier: Verlegung) und nach der Instandsetzung die <b>Alarmweiterleitung und die Bettenzuordnung</b> ausdrücklich prüfen. Eine falsche Bettenzuordnung wäre sogar gefährlicher als ein Ausfall: Alarme würden beim falschen Patienten angezeigt.</p>' +
        '<h3>Zuständigkeiten</h3>' +
        '<p>Der Fehler lag an der Schnittstelle zwischen Medizintechnik (Monitor, Zentrale) und IT (Dose, Switch, Netzwerk). Klare Absprachen – wer prüft was, wer darf was ändern, wer dokumentiert – sind Voraussetzung für schnelle und sichere Fehlerbehebung. Die IEC 80001-1 bietet dafür einen Rahmen (Risikomanagement für IT-Netzwerke mit Medizinprodukten); die konkrete Umsetzung regelt jedes Haus selbst.</p>' +
        '<h3>Vorbeugung</h3>' +
        '<ul><li>Patchkabel außerhalb des Fahr- und Klemmbereichs von Betten führen, Kabelhalterungen nutzen.</li>' +
        '<li>Stecker mit Rastnasenschutz (Knickschutztülle) verwenden; Kabel mit abgebrochener Rastnase sofort austauschen.</li>' +
        '<li>Bei Bettenumzügen und Reinigungen die Netzwerkverbindung anschließend an der Zentrale kontrollieren.</li>' +
        '<li>Technische Meldungen wie „Verbindung verloren“ nicht dauerhaft hinnehmen, sondern sofort melden.</li></ul>' +
        '<div class="callout warn"><b>Lernsimulation vs. reale Servicearbeit:</b> Servicemenü, Protokolle, Adressen, Dosen- und Portnummern sowie die Zentralen-Ansicht sind fiktiv. Die RJ45-Belegung (TIA-568) und die Grundlagen von 100BASE-TX sind öffentlich genormt. Reale Arbeiten richten sich nach den Unterlagen des Herstellers, den Regelungen des Betreibers zur Zusammenarbeit von Medizintechnik und IT und den geltenden Vorschriften (u. a. MPBetreibV).</div>',
    },

    documentation: {
      intro: 'Erstelle den Instandsetzungsbericht. Er dient als Nachweis für Betreiber und Gerätedatei und wird mit dem Ticket der IT verknüpft.',
      fields: [
        {
          id: 'symptom',
          label: 'Fehlerbeschreibung (Befund)',
          type: 'select',
          options: [
            { value: 'a', label: 'Monitor defekt' },
            { value: 'b', label: 'Bett 12 an der Zentrale „Verbindung verloren“, keine Alarmweiterleitung; Messung und Alarme am Bettplatz i. O.; kein Link; seit Bettenumzug, anfangs wechselnd' },
            { value: 'c', label: 'Netzwerk gestört' },
          ],
          correct: 'b',
          hint: 'Beschreibe den Befund konkret und überprüfbar – nicht pauschal.',
        },
        {
          id: 'cause',
          label: 'Festgestellte Ursache',
          type: 'select',
          options: [
            { value: 'a', label: 'Vermutlich IT-Problem' },
            { value: 'b', label: 'Patchkabel gequetscht: Aderbruch Pin 6 (Empfangspaar), Rastnase wandseitig abgebrochen; nachgewiesen durch Tauschtest und Adernprüfung; Dose/Port durch IT geprüft i. O.' },
            { value: 'c', label: 'IP-Konfiguration fehlerhaft' },
          ],
          correct: 'b',
          hint: 'Ursache und Nachweis gehören zusammen.',
        },
        {
          id: 'action',
          label: 'Durchgeführte Maßnahme',
          type: 'select',
          options: [
            { value: 'a', label: 'Stecker neu gecrimpt' },
            { value: 'b', label: 'Patchkabel in Absprache mit IT gegen konfektioniertes, geprüftes Kabel getauscht; Kabelführung gesichert; defektes Kabel entsorgt; IT und Station informiert' },
            { value: 'c', label: 'Monitor neu konfiguriert und Kabel getauscht' },
          ],
          correct: 'b',
        },
        {
          id: 'part',
          label: 'Verwendetes Material',
          type: 'select',
          options: [
            { value: 'a', label: 'Konfektioniertes, geprüftes Patchkabel (Kategorie wie Bestand, Länge passend, mit Knickschutz) aus dem abgestimmten Bestand' },
            { value: 'b', label: 'Beliebiges Netzwerkkabel aus der Schublade' },
            { value: 'c', label: 'Kein Material' },
          ],
          correct: 'a',
          hint: 'Auch Infrastrukturmaterial gehört nachvollziehbar dokumentiert.',
        },
        {
          id: 'checks',
          label: 'Durchgeführte Prüfungen nach Instandsetzung',
          type: 'multi',
          options: [
            { value: 'link', label: 'Link-Status und Link-Stabilität (Servicemenü, IT-Port-Status)' },
            { value: 'online', label: 'Bett 12 an der Zentrale online, Werte identisch' },
            { value: 'alarm', label: 'Alarmweiterleitung mit Simulator zur Zentrale' },
            { value: 'bed', label: 'Bettenzuordnung an der Zentrale' },
            { value: 'safety', label: 'Elektrische Sicherheitsprüfung IEC 62353' },
            { value: 'mtk', label: 'Messtechnische Kontrolle NIBP' },
          ],
          correct: ['link', 'online', 'alarm', 'bed'],
          hint: 'Nur tatsächlich durchgeführte Prüfungen dokumentieren. Am Monitor selbst wurde nicht eingegriffen.',
        },
        {
          id: 'equipment',
          label: 'Prüfmittel für Ursachennachweis und Funktionsprüfung (mit Inventar-Nr. und Kalibrierstatus)',
          type: 'multi',
          options: [
            { value: 'sim', label: 'Patientensimulator' },
            { value: 'dmm', label: 'Digitalmultimeter (Adernprüfung)' },
            { value: 'sa', label: 'Sicherheitsanalysator' },
            { value: 'osc', label: 'Oszilloskop (optionale Signalverfolgung)' },
            { value: 'flow', label: 'Beatmungsanalysator' },
          ],
          correct: ['sim', 'dmm'],
          optional: ['osc'],
          hint: 'Die Prüfmittel aufführen, auf die sich der Ursachennachweis (Adernprüfung) und die Funktionsprüfung stützen – keine, die nicht eingesetzt wurden. Das Oszilloskop nur angeben, wenn du es tatsächlich genutzt hast; der Netzwerktester der IT wird im IT-Ticket dokumentiert.',
        },
        {
          id: 'coord',
          label: 'Abstimmung / Information',
          type: 'select',
          options: [
            { value: 'a', label: 'Nicht erforderlich, reiner Kabeltausch' },
            { value: 'b', label: 'IT-Ticket NW-2026-1187 verknüpft, IT bestätigt Port i. O.; Station über Ursache, Kabelführung und Wiederinbetriebnahme informiert' },
            { value: 'c', label: 'Hersteller des Monitors informiert' },
          ],
          correct: 'b',
          hint: 'Bei Störungen an der Schnittstelle Medizintechnik/IT gehören beide Seiten und die Station dazu.',
        },
        {
          id: 'release',
          label: 'Ergebnis / Freigabe',
          type: 'select',
          options: [
            { value: 'a', label: 'Verbindung zur Zentrale und Alarmweiterleitung i. O. – Bettplatz 12 wieder zur Überwachung freigegeben' },
            { value: 'b', label: 'Freigegeben, Alarmweiterleitung wird bei Gelegenheit geprüft' },
            { value: 'c', label: 'Gerät gesperrt' },
          ],
          correct: 'a',
        },
        { id: 'remark', label: 'Bemerkungen / Empfehlungen', type: 'text', required: true, minLength: 10, placeholder: 'z. B. Kabelführung an Bettplätzen prüfen, Kontrolle der Zentrale nach Bettenumzügen …' },
        { id: 'tech', label: 'Prüfer/in (Name, Kürzel)', type: 'text', required: true, minLength: 2, placeholder: 'Name, Kürzel' },
      ],
    },

    quiz: [
      { q: 'Warum konnte die IP-Konfiguration in diesem Fall nicht die Ursache sein?', options: ['Weil IP-Adressen nie falsch sind', 'Weil kein Link bestand – ohne physikalische Verbindung (Schicht 1) kann eine Konfiguration (Schicht 3) gar nicht wirksam werden', 'Weil der Monitor neu gestartet wurde', 'Weil die Zentrale die IP-Adresse vergibt'], correct: 1, explain: 'Fehlersuche im Netzwerk von unten nach oben: Erst Link, dann Konfiguration. Zudem war die Konfiguration nachweislich unverändert.' },
      { q: 'Welche Pins eines RJ45-Steckers nutzt 100BASE-TX?', options: ['1, 2, 3 und 6', '4, 5, 7 und 8', 'alle acht', 'nur 1 und 2'], correct: 0, explain: 'Paar 1/2 und Paar 3/6. Die übrigen Paare bleiben bei 100BASE-TX ungenutzt (Gigabit-Ethernet nutzt alle vier).' },
      { q: 'Warum fällt die gesamte Verbindung aus, obwohl nur eine einzige Ader gebrochen ist?', options: ['Weil eine Ader die Versorgungsspannung führt', 'Weil das Signal differentiell über ein Paar läuft und ein Link nur zustande kommt, wenn beide Übertragungsrichtungen funktionieren', 'Weil der Switch das Kabel abschaltet', 'Weil die Zentrale nur ganze Kabel erkennt'], correct: 1, explain: 'Mit einer gebrochenen Ader ist das Empfangspaar offen. Ohne Empfang keine Autonegotiation – kein Link auf beiden Seiten.' },
      { q: 'Welche Farbe hat die Ader an Pin 6 nach T568B?', options: ['orange', 'blau', 'grün', 'braun'], correct: 2, explain: 'T568B: 1 weiß-orange, 2 orange, 3 weiß-grün, 4 blau, 5 weiß-blau, 6 grün, 7 weiß-braun, 8 braun.' },
      { q: 'Warum ist ein „Offline“-Bett an der Zentrale sicherheitsrelevant, obwohl der Monitor lokal alarmiert?', options: ['Ist es nicht, der Monitor alarmiert ja', 'Weil Alarme außerhalb des Zimmers nicht mehr wahrgenommen werden und lebensbedrohliche Situationen unbemerkt bleiben können', 'Weil die Messwerte ungenauer werden', 'Weil der Monitor ohne Netzwerk nicht speichert'], correct: 1, explain: 'Das Personal ist nicht ständig im Zimmer. Bis zur Behebung braucht es eine Ersatzmaßnahme (z. B. Verlegung, Sitzwache).' },
      { q: 'Wie wurde die Netzwerkinfrastruktur (Dose, Port) als Ursache ausgeschlossen?', options: ['Durch Neustart des Monitors', 'Durch einen Netzwerktester der IT mit eigenem Kabel direkt an der Dose', 'Durch Neueingabe der IP-Adresse', 'Durch Sichtprüfung des Monitors'], correct: 1, explain: 'Ein bekannt gutes Prüfgerät an derselben Dose trennt Infrastruktur und Endgerät/Kabel sauber voneinander.' },
      { q: 'Was zeigt das Multimeter im Durchgangsmodus an einer unterbrochenen Ader?', options: ['0,0 Ω und Piepton', '„OL“ (Bereichsüberschreitung), kein Piepton', 'ca. 100 Ω (Wellenwiderstand)', 'Eine Spannung von 1 V'], correct: 1, explain: 'Kein Stromfluss → unendlicher Widerstand → „OL“. Die 100 Ω Wellenwiderstand sind eine Hochfrequenzeigenschaft und mit dem Ohmmeter nicht messbar.' },
      { q: 'Welche Prüfung ist nach dieser Instandsetzung unverzichtbar?', options: ['Elektrische Sicherheitsprüfung des Monitors', 'Prüfung der Alarmweiterleitung mit Simulator zur Zentrale einschließlich korrekter Bettenzuordnung', 'Messtechnische Kontrolle NIBP', 'Firmware-Update'], correct: 1, explain: 'Die gestörte Funktion war die Alarmweiterleitung – genau diese muss nach der Instandsetzung nachgewiesen werden, inklusive richtiger Bettenzuordnung.' },
      { q: 'Warum ist eine falsche Bettenzuordnung an der Zentrale besonders gefährlich?', options: ['Sie verlangsamt das Netzwerk', 'Alarme und Werte würden einem anderen Patienten zugeordnet – das Personal reagiert womöglich am falschen Bett', 'Sie verbraucht Lizenzen', 'Sie ist nicht gefährlich, nur unübersichtlich'], correct: 1, explain: 'Ein falsch zugeordneter Alarm ist potenziell gefährlicher als ein offensichtlicher Ausfall, weil er Vertrauen erzeugt.' },
      { q: 'Wofür steht die IEC 80001-1 im Zusammenhang dieses Falls?', options: ['Prüfung der elektrischen Sicherheit von Monitoren', 'Risikomanagement beim Einbinden von Medizinprodukten in IT-Netzwerke, inklusive klarer Verantwortlichkeiten', 'Farbcode von Netzwerkkabeln', 'Kalibrierung von SpO₂-Sensoren'], correct: 1, explain: 'Sie beschreibt einen Rahmen für Rollen, Verantwortlichkeiten und Risikomanagement in medizinischen IT-Netzwerken; die konkrete Umsetzung regelt der Betreiber.' },
    ],

    createState: () => ({ cable: 'original', flex: false, view: 'bedside' }),
  });

  // Für automatische Tests exportieren (keine Auswirkung im Browser)
  MTRL.__test = MTRL.__test || {};
  MTRL.__test.pmCentral = { cableNet, linkUp, monitorFrame, multimeterFixture, oscFixture, simulatorFixture, flp, mlt3 };
})();
