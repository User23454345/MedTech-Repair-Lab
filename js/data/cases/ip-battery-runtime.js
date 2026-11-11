/*
 * Servicefall IP-01: Infusionspumpe schaltet beim Patiententransport ab
 * ------------------------------------------------------------------
 * Definierter Fehler (deterministisch):
 *   Gealterter Li-Ion-Akkupack (612 Zyklen, > 4,5 Jahre) mit stark erhöhtem
 *   Innenwiderstand (≈ 1,85 Ω statt ≈ 0,15 Ω) und vermindertem Kapazitäts-
 *   vermögen. Die Leerlaufspannung nach dem Laden ist normal, die Ladeanzeige
 *   zeigt „voll“. Unter Last bricht die Klemmenspannung nach
 *       U_Last = U0 − I · Ri
 *   so stark ein, dass die Pumpe früh „Akku schwach“ meldet und nach etwa
 *   einer halben Stunde unter die Unterspannungsabschaltung fällt.
 *   Ladeschaltung, Netzteil, Kontakte und Stromaufnahme sind in Ordnung.
 *
 * Alle Messwerte werden aus dem Zustand (state) berechnet:
 *   state.installed:  'original' | 'new'      – Akku in der Pumpe
 *   state.mmBattery:  'original' | 'test'     – Akku am Multimeter-Prüfplatz
 *   state.mmLoad:     'none' | 'load'         – Prüflast 8,2 Ω zugeschaltet
 *   state.idaSupply:  'mains' | 'battery'     – Versorgung bei der Förderratenprüfung
 *   state.idaBattery: 'original' | 'test'     – Akku bei der Förderratenprüfung
 *   state.verifySupply: 'battery' | 'mains'   – Versorgung bei der Funktionsprüfung
 *
 * Hinweis: Akkudaten, Schwellen, Messadapter, Servicemenü und Ereignisprotokoll
 * sind FIKTIV (Lernmodell) und entsprechen keinem realen Hersteller.
 */
(function () {
  'use strict';
  const U = MTRL.util;
  const fmt = U.fmt;

  /* ======================= Lernmodell: Akku & Pumpe ======================= */

  /** Ruhespannungskennlinie einer Li-Ion-Zelle (vereinfachtes Lernmodell): [Ladezustand, V]. */
  const OCV_CURVE = [[0, 3.0], [0.05, 3.3], [0.1, 3.45], [0.2, 3.58], [0.4, 3.68], [0.6, 3.8], [0.8, 3.95], [0.9, 4.05], [1, 4.15]];
  const CELLS = 3; // 3 Zellen in Reihe, Nennspannung 3 × 3,6 V = 10,8 V
  const NOMINAL_AH = 2.2; // Nennkapazität (Lernmodell)

  /** Akkus im Lernmodell: U0 = Leerlaufspannung voll geladen, Ri = Innenwiderstand, Q = nutzbare Ladung bei sehr kleinem Strom. */
  const BATT = {
    original: { label: 'Original-Akku der Pumpe', U0: 12.41, Ri: 1.85, Q: 1.5 },
    test: { label: 'Bekannt guter Werkstattakku', U0: 12.44, Ri: 0.16, Q: 2.15 },
    new: { label: 'Neuer Originalakku (Ersatzteil)', U0: 12.46, Ri: 0.14, Q: 2.2 },
  };

  const R_LOAD = 8.2; // Ω – Prüflast am Multimeter-Prüfplatz (kurzzeitig zuschalten)
  const U_CHARGE = 12.6; // V – Ladeschlussspannung 3 × 4,20 V (CV-Phase)
  const U_WARN = 9.4; // V – „Akku schwach“ (Lernmodell)
  const U_OFF = 9.0; // V – Unterspannungsabschaltung (Lernmodell)
  const I_PEAK = 1.6; // A – Spitzenlast: Motoranlauf + Hintergrundbeleuchtung + Alarmton (Lernmodell)
  const iAvg = (rate) => 0.38 + 0.0006 * rate; // A – mittlere Stromaufnahme im Förderbetrieb (Lernmodell)
  const NTC_R = 10810; // Ω – NTC 10 kΩ (B = 3435 K) bei ca. 23 °C

  function cellOcv(soc) {
    const s = U.clamp(soc, 0, 1);
    for (let i = 1; i < OCV_CURVE.length; i++) {
      const [a, va] = OCV_CURVE[i - 1];
      const [b, vb] = OCV_CURVE[i];
      if (s <= b) return va + ((vb - va) * (s - a)) / (b - a);
    }
    return OCV_CURVE[OCV_CURVE.length - 1][1];
  }
  /** Leerlaufspannung des Packs beim Ladezustand soc. */
  const packOcv = (bat, soc) => CELLS * cellOcv(soc) + (bat.U0 - CELLS * 4.15);
  /** Klemmenspannung unter Laststrom I: U = U0 − I·Ri */
  const terminal = (bat, soc, I) => packOcv(bat, soc) - I * bat.Ri;
  /** Klemmenspannung an einem ohmschen Lastwiderstand (Spannungsteiler aus Ri und R). */
  const underResistor = (bat, R) => {
    const I = bat.U0 / (R + bat.Ri);
    return { I, U: bat.U0 - I * bat.Ri };
  };

  const DT = 0.25; // min – Zeitschritt der Entladesimulation
  const cache = {};
  /** Laufzeitsimulation im Akkubetrieb (deterministisch). */
  function runtime(key, rate) {
    const ck = key + '@' + rate;
    if (cache[ck]) return cache[ck];
    const bat = BATT[key];
    const I = iAvg(rate);
    let soc = 1;
    let t = 0;
    let warn = null;
    const trace = [];
    let res = null;
    while (t <= 900) {
      const upk = terminal(bat, soc, I_PEAK);
      trace.push({ t, soc, uAvg: terminal(bat, soc, I), uPk: upk });
      if (warn === null && upk < U_WARN) warn = t;
      if (upk < U_OFF || soc <= 0) {
        res = { warn, off: t, soc, ah: (1 - soc) * bat.Q, trace };
        break;
      }
      soc -= (I * DT) / 60 / bat.Q;
      t += DT;
    }
    if (!res) res = { warn, off: null, soc, ah: (1 - soc) * bat.Q, trace };
    cache[ck] = res;
    return res;
  }
  /** Kapazitätstest mit Konstantstrom bis zur Entladeschlussspannung U_OFF. */
  function capacity(key, I) {
    const bat = BATT[key];
    let soc = 1;
    let t = 0;
    while (terminal(bat, soc, I) > U_OFF && soc > 0) {
      soc -= (I * DT) / 60 / bat.Q;
      t += DT;
    }
    return { ah: (1 - soc) * bat.Q, hours: t / 60 };
  }

  const hm = (min) => {
    const m = Math.round(min);
    return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
  };
  /** Uhrzeit im Ereignisprotokoll: Netztrennung um 14:02 + m Minuten. */
  const clock = (m) => {
    const total = 14 * 60 + 2 + Math.floor(m);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };
  const pct = (x) => fmt(x * 100, 0) + ' %';
  const isPair = (a, b, x, y) => (a === x && b === y) || (a === y && b === x);
  function ensure(st, key) {
    if (!Array.isArray(st[key])) st[key] = [];
    return st[key];
  }

  /* ======================= Anzeige der Pumpe (Fehlerbild) ======================= */

  const CYCLE = 40; // Zeitraffer: 1 s ≙ 1 min, Wiederholung nach 40 min
  function pumpFrame(st, t) {
    const r = runtime('original', 100);
    const m = t % CYCLE;
    const idx = Math.min(r.trace.length - 1, Math.floor(m / DT));
    const p = r.trace[idx];
    const off = m >= r.off;
    const values = [];
    const messages = [];
    const peak = (tt) => tt % 1.5 < 0.12;
    const waves = [
      {
        id: 'u',
        label: 'U Akku',
        color: '#ffd23f',
        fn: (tt) => {
          const mm = tt % CYCLE;
          if (mm >= r.off) return null;
          const q = r.trace[Math.min(r.trace.length - 1, Math.floor(mm / DT))];
          const u = peak(tt) ? q.uPk : q.uAvg;
          return U.clamp((u - 10.6) / 1.9, -1, 1);
        },
      },
      {
        id: 'motor',
        label: 'Motor',
        color: '#22d3ee',
        fn: (tt) => ((tt % CYCLE) >= r.off ? null : peak(tt) ? 0.8 : (tt * 6) % 1 < 0.5 ? 0.25 : -0.25),
      },
    ];
    if (off) {
      values.push({ id: 'rate', label: 'Rate', value: '---', unit: 'ml/h', color: '#f5f5f5' });
      values.push({ id: 'vol', label: 'Volumen', value: fmt((100 * r.off) / 60, 1), unit: 'ml', color: '#f5f5f5', sub: 'bis zur Abschaltung' });
      values.push({ id: 'batt', label: 'Akku', value: '---', unit: '', color: '#ff7043' });
      messages.push({ text: '!!! AKKU LEER – FÖRDERUNG GESTOPPT', level: 'high' });
    } else {
      values.push({ id: 'rate', label: 'Rate', value: '100', unit: 'ml/h', color: '#f5f5f5', sub: 'Förderung läuft' });
      values.push({ id: 'vol', label: 'Volumen', value: fmt((100 * m) / 60, 1), unit: 'ml', color: '#f5f5f5', sub: 't = ' + fmt(m, 0) + ' min' });
      values.push({ id: 'batt', label: 'Akku', value: fmt(p.soc * 100, 0), unit: '%', color: m >= r.warn ? '#ffb74d' : '#7CFC00', alarm: m >= r.warn, sub: 'U ' + fmt(p.uAvg, 2) + ' V' });
      messages.push({ text: 'AKKUBETRIEB', level: 'info' });
      if (m >= r.warn) messages.push({ text: '! AKKU SCHWACH', level: 'med' });
    }
    void st;
    return { waves, values, messages };
  }

  /* ======================= Fixtures ======================= */

  const MM_POINTS = [
    { id: 'BP', label: 'Akkupack: Pluspol (B+)', group: 'Akkupack, ausgebaut (Prüfplatz)' },
    { id: 'BN', label: 'Akkupack: Minuspol (B−)', group: 'Akkupack, ausgebaut (Prüfplatz)' },
    { id: 'BT', label: 'Akkupack: Temperaturkontakt (T, NTC gegen B−)', group: 'Akkupack, ausgebaut (Prüfplatz)' },
    { id: 'CP', label: 'Akkufach: Ladekontakt + (Messadapter)', group: 'Pumpe am Netz, Akkufach mit Messadapter (Lernmodell)' },
    { id: 'CN', label: 'Akkufach: Ladekontakt − (Messadapter)', group: 'Pumpe am Netz, Akkufach mit Messadapter (Lernmodell)' },
  ];

  function packDiagram(red, black, ctx) {
    const st = ctx.state;
    const mark = (id) => (id === red ? 'red' : id === black ? 'black' : '');
    const pin = (id, x, y, label) => `<g transform="translate(${x},${y})"><circle cx="0" cy="0" r="7" class="pin ${mark(id)}"/><text x="12" y="4" class="dg-pin">${label}</text></g>`;
    const load = st.mmLoad === 'load';
    return (
      '<svg viewBox="0 0 340 170" class="pin-diagram" role="img" aria-label="Prüfaufbau Akku (Lernmodell)">' +
      '<text x="0" y="14" class="dg-title">Ersatzschaltbild Akkupack</text>' +
      '<rect x="10" y="30" width="150" height="120" rx="8" fill="none" stroke="#90a4ae" stroke-dasharray="4 3"/>' +
      '<line x1="40" y1="60" x2="40" y2="80" stroke="#cfd8dc" stroke-width="3"/><line x1="30" y1="86" x2="50" y2="86" stroke="#cfd8dc" stroke-width="3"/><line x1="35" y1="94" x2="45" y2="94" stroke="#cfd8dc" stroke-width="3"/><line x1="40" y1="94" x2="40" y2="130" stroke="#cfd8dc"/>' +
      '<text x="56" y="94" class="dg-pin">U0</text>' +
      '<line x1="40" y1="60" x2="70" y2="60" stroke="#cfd8dc"/><rect x="70" y="53" width="40" height="14" fill="none" stroke="#ffb74d" stroke-width="2"/><text x="78" y="48" class="dg-pin">Ri</text><line x1="110" y1="60" x2="190" y2="60" stroke="#cfd8dc"/>' +
      '<line x1="40" y1="130" x2="190" y2="130" stroke="#cfd8dc"/>' +
      pin('BP', 196, 60, 'B+') +
      pin('BN', 196, 130, 'B−') +
      pin('BT', 196, 95, 'T (NTC)') +
      (load
        ? '<rect x="268" y="80" width="18" height="34" fill="none" stroke="#ff7043" stroke-width="2"/><text x="292" y="100" class="dg-pin">8,2 Ω</text><line x1="203" y1="60" x2="277" y2="60" stroke="#ff7043"/><line x1="277" y1="60" x2="277" y2="80" stroke="#ff7043"/><line x1="277" y1="114" x2="277" y2="130" stroke="#ff7043"/><line x1="203" y1="130" x2="277" y2="130" stroke="#ff7043"/>'
        : '<text x="250" y="100" class="dg-pin">Prüflast offen</text>') +
      '</svg><div class="muted small">Prüfaufbau und Kontaktbezeichnungen: fiktives Lernmodell. Reale Akkuprüfungen nur nach Herstellerunterlagen.</div>'
    );
  }

  const mmBatteryControl = {
    id: 'mmBattery',
    type: 'select',
    label: 'Akkupack am Prüfplatz',
    options: [
      { value: 'original', label: 'Original-Akku der Pumpe' },
      { value: 'test', label: 'Bekannt guter Werkstattakku (Vergleich)' },
    ],
    get: (ctx) => ctx.state.mmBattery,
    set: (ctx, v) => {
      ctx.state.mmBattery = v;
    },
  };
  const mmLoadControl = {
    id: 'mmLoad',
    type: 'select',
    label: 'Prüflast am Akkupack',
    help: 'Lastwiderstand 8,2 Ω (≈ 1,2–1,5 A, entspricht etwa der Spitzenlast der Pumpe). Nur kurzzeitig zuschalten.',
    options: [
      { value: 'none', label: 'Keine Last (Leerlaufspannung)' },
      { value: 'load', label: 'Prüflast 8,2 Ω zugeschaltet' },
    ],
    get: (ctx) => ctx.state.mmLoad,
    set: (ctx, v) => {
      ctx.state.mmLoad = v;
    },
  };

  const multimeterFixture = {
    title: 'Prüfplatz: Akkupack (ausgebaut) mit zuschaltbarer Prüflast; Pumpe am Netz mit Akkufach-Messadapter',
    modes: ['vdc', 'ohm'],
    points: MM_POINTS,
    defaults: { mode: 'vdc', red: 'BP', black: 'BN' },
    hint:
      '<b>Vorgehen:</b> 1. <b>Leerlaufspannung</b> des geladenen Akkus messen (B+ gegen B−). 2. <b>Prüflast zuschalten</b> und die Spannung unter Last ablesen. Aus dem Spannungseinbruch ΔU und dem Laststrom I folgt der Innenwiderstand <b>Ri = ΔU / I</b>. 3. Zum Vergleich den bekannt guten Werkstattakku messen. 4. <b>Ladespannung</b> am Akkufach (Pumpe am Netz) und den <b>Temperaturfühler</b> (T gegen B−, Widerstandsmessung) prüfen.<br>' +
      '<span class="warn-inline">⚠ Akku nie kurzschließen (Li-Ion: sehr hohe Kurzschlussströme, Brandgefahr). Widerstandsmessungen nicht über den Zellen (B+ gegen B−) durchführen. Messadapter und Kontaktbezeichnungen sind fiktiv (Lernmodell).</span>',
    controls: [mmBatteryControl, mmLoadControl],
    diagram: (ctx, red, black) => packDiagram(red, black, ctx),
    measure(mode, a, b, ctx, tick) {
      const st = ctx.state;
      const groupA = a[0];
      const groupB = b[0];
      const bat = BATT[st.mmBattery] || BATT.original;
      const loaded = st.mmLoad === 'load';
      const n = U.noise(3, tick + 1) * 0.004;
      if (groupA !== groupB) {
        return mode === 'vdc'
          ? { text: fmt(0, 2), unit: 'V', value: 0, note: 'Akkupack und Pumpe sind getrennte Prüflinge – kein gemeinsamer Stromkreis.' }
          : { text: 'OL', unit: 'MΩ', value: Infinity, note: 'Akkupack und Pumpe sind getrennte Prüflinge – kein Stromkreis.' };
      }
      if (mode === 'ohm') {
        if (groupA === 'C') {
          return { text: '- - - -', unit: 'Ω', value: null, note: 'Unzulässig: Widerstandsmessung an einer spannungsführenden Ladeschaltung (Pumpe am Netz). Messgerät und Prüfling können Schaden nehmen.' };
        }
        if (a === 'BP' || b === 'BP') {
          return { text: '- - - -', unit: 'Ω', value: null, note: 'Unzulässig: Widerstandsmessung über einer Spannungsquelle (Akkuzellen). Der Innenwiderstand eines Akkus lässt sich so nicht bestimmen – dafür den Lasttest verwenden (Ri = ΔU / I).' };
        }
        const net = new MTRL.Netlist().R('BT', 'BN', NTC_R);
        const r = MTRL.measureNetlist(net, 'ohm', a, b);
        ctx.addFinding('f_mm_ntc_ok', 'Multimeter');
        return Object.assign({}, r, { note: 'Temperaturfühler (NTC 10 kΩ bei 25 °C) – bei ca. 23 °C Raumtemperatur ≈ 10,8 kΩ: plausibel. Die Ladeschaltung nutzt diesen Wert, um nur im zulässigen Temperaturbereich zu laden.' });
      }
      // Gleichspannung
      const net = new MTRL.Netlist();
      let note = '';
      if (groupA === 'B') {
        const u = loaded ? underResistor(bat, R_LOAD) : { I: 0, U: bat.U0 };
        net.V('BP', u.U + n).V('BN', 0).R('BT', 'BN', NTC_R);
        if (isPair(a, b, 'BP', 'BN')) {
          if (loaded) {
            note = `Laststrom (Shunt im Prüfaufbau): <b>${fmt(u.I, 2)} A</b>. Spannungseinbruch gegenüber Leerlauf: ΔU = ${fmt(bat.U0, 2)} V − ${fmt(u.U, 2)} V = <b>${fmt(bat.U0 - u.U, 2)} V</b> → Ri = ΔU / I ≈ <b>${fmt((bat.U0 - u.U) / u.I, 2)} Ω</b>.`;
            if (st.mmBattery === 'original') ctx.addFinding('f_mm_load_drop', 'Multimeter (Lasttest)');
            if (st.mmBattery === 'test') ctx.addFinding('f_mm_test_load_ok', 'Multimeter (Lasttest)');
          } else {
            note = `Leerlaufspannung ${fmt(bat.U0, 2)} V ≈ ${fmt(bat.U0 / CELLS, 2)} V je Zelle – entspricht einem <b>voll geladenen</b> 3-Zellen-Li-Ion-Pack. Über Kapazität und Innenwiderstand sagt dieser Wert allein wenig aus.`;
            if (st.mmBattery === 'original') ctx.addFinding('f_mm_ocv_ok', 'Multimeter');
          }
        } else note = 'Der Temperaturkontakt führt keine Zellspannung (NTC gegen B−).';
      } else {
        net.V('CP', U_CHARGE + n * 0.5).V('CN', 0);
        note = 'Ladeschlussspannung der Ladeschaltung (Konstantspannungsphase): 12,60 V = 3 × 4,20 V – entspricht der Vorgabe des Lernmodells (12,60 V ± 0,05 V).';
        ctx.addFinding('f_mm_charge_ok', 'Multimeter');
      }
      const r = MTRL.measureNetlist(net, 'vdc', a, b);
      return Object.assign({}, r, { note });
    },
  };

  /* ---------- Pumpenprüfgerät ---------- */
  function pumpFlow(rate, tMin, batKey, supply) {
    const base = rate * 1.004 * (1 + 0.05 * Math.sin(2 * Math.PI * tMin * 0.37));
    if (supply !== 'battery') return base;
    const r = runtime(batKey, rate);
    if (r.off !== null && tMin >= r.off) return 0;
    return base;
  }
  const OCCLUSION = { alarmPressure: 560, minAllowed: 400, maxAllowed: 800, levelLabel: 'mittel' };

  const idaFixture = {
    title: 'Prüfling: Infusionspumpe IP-3 (Lernmodell) mit neuem Prüf-Infusionsset am Pumpenprüfgerät',
    pumpLabel: 'Prüfling: Infusionspumpe IP-3',
    rates: [25, 100, 500],
    duration: 60,
    tolerance: 0.05,
    hint:
      'Förderratenprüfung über 60 min (Beispieltoleranz ±5 %, Lernmodell). Wähle rechts die <b>Versorgung</b>: im Netzbetrieb prüfst du die Fördergenauigkeit, im <b>Akkubetrieb</b> (Akku vorher voll geladen) zusätzlich, ob die Pumpe die Prüfdauer durchhält. Für einen Tauschtest kann der bekannt gute Werkstattakku eingesetzt werden.',
    controls: [
      {
        id: 'idaSupply',
        type: 'select',
        label: 'Versorgung während der Prüfung',
        options: [
          { value: 'mains', label: 'Netzbetrieb' },
          { value: 'battery', label: 'Akkubetrieb (Netzstecker gezogen)' },
        ],
        get: (ctx) => ctx.state.idaSupply,
        set: (ctx, v) => {
          ctx.state.idaSupply = v;
        },
      },
      {
        id: 'idaBattery',
        type: 'select',
        label: 'Eingesetzter Akku',
        options: [
          { value: 'original', label: 'Original-Akku der Pumpe' },
          { value: 'test', label: 'Bekannt guter Werkstattakku' },
        ],
        get: (ctx) => ctx.state.idaBattery,
        set: (ctx, v) => {
          ctx.state.idaBattery = v;
        },
        visible: (ctx) => ctx.state.idaSupply === 'battery',
      },
    ],
    flow: (rate, tMin, ctx) => pumpFlow(rate, tMin, ctx.state.idaBattery, ctx.state.idaSupply),
    occlusion: () => Object.assign({}, OCCLUSION),
    onResult(kind, data, ctx) {
      const st = ctx.state;
      if (kind === 'occlusion') {
        if (data.ok) ctx.addFinding('f_ida_occl_ok', 'Pumpenprüfgerät');
        return;
      }
      if (st.idaSupply === 'mains' && data.ok) ctx.addFinding('f_ida_mains_ok', 'Pumpenprüfgerät');
      if (st.idaSupply === 'battery' && st.idaBattery === 'original' && !data.ok) ctx.addFinding('f_ida_batt_stop', 'Pumpenprüfgerät');
      if (st.idaSupply === 'battery' && st.idaBattery === 'test' && data.ok) ctx.addFinding('f_ida_test_batt_ok', 'Pumpenprüfgerät (Tauschtest)');
    },
  };

  const idaVerifyFixture = {
    title: 'Funktionsprüfung nach Instandsetzung – Infusionspumpe IP-3 (Lernmodell) mit neuem Akku',
    pumpLabel: 'Prüfling: Infusionspumpe IP-3',
    rates: [25, 100, 500],
    duration: 60,
    tolerance: 0.05,
    hint: 'Prüfe die Förderrate bei mindestens <b>zwei Raten im Akkubetrieb</b> (neuer Akku vorher vollständig geladen) und führe den <b>Okklusionstest</b> in der Druckstufe „mittel“ durch (zulässiger Alarmbereich im Lernmodell 400–800 mmHg). Toleranzen und Prüfbedingungen laut Herstellervorgabe.',
    controls: [
      {
        id: 'verifySupply',
        type: 'select',
        label: 'Versorgung während der Prüfung',
        options: [
          { value: 'battery', label: 'Akkubetrieb (Netzstecker gezogen)' },
          { value: 'mains', label: 'Netzbetrieb' },
        ],
        get: (ctx) => ctx.state.verifySupply,
        set: (ctx, v) => {
          ctx.state.verifySupply = v;
        },
      },
    ],
    flow: (rate, tMin, ctx) => pumpFlow(rate, tMin, ctx.state.installed, ctx.state.verifySupply),
    occlusion: () => Object.assign({}, OCCLUSION),
    onResult(kind, data, ctx) {
      const st = ctx.state;
      if (!ctx.repaired || st.installed !== 'new') return;
      if (kind === 'occlusion') {
        if (data.ok) ctx.addFinding('fc_occl_ok', 'Pumpenprüfgerät');
        return;
      }
      if (st.verifySupply === 'battery' && data.ok) {
        const rates = ensure(st, 'verifyRates');
        if (!rates.includes(data.rate)) rates.push(data.rate);
        if (rates.length >= 2) ctx.addFinding('fc_flow_ok', 'Pumpenprüfgerät');
      }
    },
  };

  /* ---------- Sicherheitsanalysator ---------- */
  const safetyFixture = {
    title: 'Wiederholungsprüfung nach IEC 62353 – Infusionspumpe IP-3 (Lernmodell)',
    deviceName: 'Infusionspumpe IP-3 (Lernmodell), Inv.-Nr. MT-07322',
    protectionClass: 'II',
    detachableCord: true,
    appliedParts: [{ id: 'fluid', name: 'Flüssigkeitsweg (Infusionsleitung)', type: 'CF' }],
    hint:
      'Laut Typschild des Lernmodells: <b>Schutzklasse II</b> (schutzisoliert, kein Schutzleiter → keine Schutzleiterprüfung) und Anwendungsteil <b>Typ CF</b> (Flüssigkeitsweg, z. B. bei zentralvenösem Zugang). Der Patientenableitstrom wird über eine mit physiologischer Kochsalzlösung gefüllte Infusionsleitung mit Messelektrode erfasst – Aufbau nach Herstellervorgabe. Schutzklasse und Anwendungsteil immer vom Typschild bzw. aus der Gebrauchsanweisung übernehmen. Umfang der Prüfung nach einem Akkutausch: laut Hersteller- und Betreibervorgabe; hier wird die fällige Wiederholungsprüfung mit der Freigabe kombiniert.',
    values: () => ({ visual: true, insulation: 280, equipmentLeakage: 21, applied: { fluid: 2.4 } }),
    onResult: (r, ctx) => {
      if (r.ok && ctx.repaired) ctx.addFinding('fc_safety_ok', 'Sicherheitsanalysator');
    },
  };

  /* ======================= Vorberechnete Kennwerte ======================= */
  const RT_ORIG = runtime('original', 100);
  const RT_TEST = runtime('test', 100);
  const CAP_LOW = capacity('original', 0.5);
  const CAP_PEAK = capacity('original', I_PEAK);
  const LOAD_ORIG = underResistor(BATT.original, R_LOAD);
  const LOAD_TEST = underResistor(BATT.test, R_LOAD);

  /* ======================= Fallbeschreibung ======================= */

  MTRL.registerCase({
    id: 'ip-battery-runtime',
    deviceId: 'infusion-pump',
    title: 'Infusionspumpe schaltet beim Patiententransport ab',
    short: 'Akku leer trotz voller Anzeige',
    difficulty: 'Fortgeschritten',
    duration: '40–60 min',
    tags: ['Akku', 'Innenwiderstand', 'Energieversorgung', 'Li-Ion', 'Transport'],
    summary:
      'Eine Infusionspumpe meldet beim Transport kurz nach dem Abstecken „Akku schwach“ und stoppt nach etwa einer halben Stunde mit „Akku leer“ – obwohl die Ladeanzeige voll war. Ursache messtechnisch eingrenzen: Ladung, Last, Innenwiderstand, Tauschtest.',
    minFindingsForCauses: 8,

    situation: {
      ticket: {
        'Auftrag': 'IH-2026-1183 (Übungsauftrag)',
        'Gerät': 'Volumetrische Infusionspumpe IP-3 (generisches Lernmodell)',
        'Inventarnummer': 'MT-07322',
        'Standort': 'Intensivstation 1, Transportpumpe',
        'Meldende Person': 'Pflegefachkraft, Spätdienst',
        'Priorität': 'hoch – Pumpe wird für Transporte benötigt, Ersatzgerät bereitgestellt',
        'Meldetext': '„Pumpe ging beim Transport ins CT nach einer guten halben Stunde mit ‚Akku leer‘ aus, obwohl sie die ganze Nacht am Netz hing und die Anzeige voll war. Gleich nach dem Abstecken kam schon ‚Akku schwach‘.“',
      },
      html:
        '<p>Während eines Transports von der Intensivstation in die Radiologie stoppte die Pumpe eine laufende Infusion mit Alarm „Akku leer“. Die Pflegekraft hat die Infusion sofort an einer anderen Pumpe fortgesetzt; ein Patientenschaden ist nicht bekannt. Die Pumpe wurde mit Netzkabel und eingesetztem Akku in die Medizintechnik gebracht, ein <b>Aufbereitungsnachweis</b> (Wischdesinfektion) liegt bei.</p>' +
        '<p>Deine Aufgabe: Fehler nachvollziehen, Ursache messtechnisch belegen, die Pumpe fachgerecht instand setzen, prüfen, dokumentieren und freigeben.</p>' +
        '<div class="callout warn"><b>Hinweis:</b> Ein Therapieabbruch durch eine Infusionspumpe kann je nach Medikament gefährlich sein. Ob ein <b>Vorkommnis</b> vorliegt, das nach Medizinprodukterecht (MPDG und zugehörige Verordnungen) zu melden ist, bewertet der Betreiber nach seinem internen Verfahren (z. B. über die/den Beauftragte/n für Medizinproduktesicherheit). Die Pumpe wird bis zur Klärung nicht verändert, außer für die Fehlersuche nötig – Befunde sorgfältig dokumentieren.</div>',
      checklist: [
        'Aufbereitungsnachweis vorhanden? – Ja, Wischdesinfektion dokumentiert.',
        'Gerät eindeutig identifiziert (Inventarnummer, Typ, Seriennummer)? – Ja.',
        'Zubehör vollständig (Netzkabel, Akku eingesetzt)? – Ja.',
        'Ersatzgerät auf Station? – Ja, Transporte sind abgesichert.',
        'Meldung an die/den Beauftragte/n für Medizinproduktesicherheit zur Bewertung weitergeleitet? – Ja (Betreiberprozess).',
      ],
    },

    symptom: {
      html:
        '<p>Die Station hat den Ablauf aus dem Gedächtnis beschrieben; das Ereignisprotokoll der Pumpe bestätigt ihn. Die Anzeige unten rekonstruiert den Transport im <b>Zeitraffer (1 s ≙ 1 min)</b>: Förderung mit 100 ml/h, Netzstecker gezogen bei t = 0.</p>' +
        '<ul><li>Beim Abstecken zeigt die Akkuanzeige <b>100 %</b>.</li>' +
        '<li>Nach wenigen Minuten erscheint <b>„Akku schwach“</b>, obwohl die Anzeige noch fast voll ist.</li>' +
        '<li>Nach etwa einer halben Stunde stoppt die Pumpe mit <b>„Akku leer“</b> – die Akkuanzeige stand zu diesem Zeitpunkt noch bei rund 85 %.</li></ul>' +
        '<p>Die gelbe Kurve zeigt die Akkuspannung; die kurzen Einbrüche entstehen bei Lastspitzen (Motoranlauf, Hintergrundbeleuchtung, Signalton).</p>',
      displayTitle: 'Infusionspumpe IP-3 (Lernmodell) – Rekonstruktion des Transports, Zeitraffer',
      display: (st, t) => pumpFrame(st, t),
      observations: [
        'Im Netzbetrieb hat die Pumpe laut Station nie Probleme gemacht.',
        'Die Akkuanzeige war vor dem Transport voll und zeigte bei der Abschaltung noch über 80 %.',
        '„Akku schwach“ kam auffällig früh – unmittelbar nach dem Abstecken.',
      ],
    },

    basics: [
      {
        title: 'Energieversorgung einer Infusionspumpe',
        html:
          '<div class="chain">' +
          ['Netz', 'Netzteil', 'Ladeschaltung (CC/CV)', 'Akkupack mit Schutzschaltung', 'Umschaltung Netz/Akku', 'Spannungsregler', 'Motor, Rechner, Display, Alarm']
            .map((s) => `<span class="chain-el">${s}</span>`)
            .join('<span class="chain-arrow">→</span>') +
          '</div>' +
          '<p>Am Netz versorgt das Netzteil die Pumpe und lädt zugleich den Akku. Fällt das Netz aus oder wird der Stecker gezogen, übernimmt der Akku <b>unterbrechungsfrei</b>. Die Pumpe überwacht die Akkuspannung: Sinkt sie unter eine Warnschwelle, kommt <b>„Akku schwach“</b>; vor Erreichen der Mindestspannung stoppt die Pumpe die Förderung mit Alarm <b>„Akku leer“</b> (Unterspannungsabschaltung), damit Rechner und Alarmierung nicht unkontrolliert ausfallen.</p>' +
          '<p>Die Stromaufnahme ist nicht konstant: Zur mittleren Last kommen kurze <b>Lastspitzen</b> (Motoranlauf, Hintergrundbeleuchtung, Signalton). Genau in diesen Momenten ist die Akkuspannung am niedrigsten.</p>' +
          '<p class="muted">Lernmodell: Warnschwelle 9,4 V, Abschaltung 9,0 V, mittlere Last ≈ 0,44 A bei 100 ml/h, Spitzenlast ≈ 1,6 A. Reale Werte sind herstellerspezifisch.</p>',
      },
      {
        title: 'Li-Ion-Akkus: Zellspannung, Laden, Schutzschaltung',
        html:
          '<ul><li>Eine Li-Ion-Zelle hat eine <b>Nennspannung</b> von ca. 3,6–3,7 V; voll geladen ca. 4,1–4,2 V, entladen ca. 3,0 V (typabhängig). Im Lernmodell sind <b>3 Zellen in Reihe</b> geschaltet: 10,8 V Nennspannung, 2,2 Ah Nennkapazität.</li>' +
          '<li><b>Ladeverfahren CC/CV:</b> Zunächst mit Konstantstrom (CC), ab der Ladeschlussspannung (hier 3 × 4,20 V = 12,60 V) mit Konstantspannung (CV), bis der Strom unter eine Abschaltschwelle fällt.</li>' +
          '<li>Eine <b>Schutzschaltung</b> (BMS) im Pack schützt vor Überladung, Tiefentladung, Kurzschluss und Übertemperatur. Ein <b>Temperaturfühler (NTC)</b> erlaubt der Ladeschaltung, nur im zulässigen Temperaturbereich zu laden.</li>' +
          '<li>Li-Ion-Akkus haben <b>keinen Memory-Effekt</b>. „Regenerieren“ durch Tiefentladen schadet ihnen.</li></ul>',
      },
      {
        title: 'Innenwiderstand: warum ein „voller“ Akku trotzdem versagt',
        html:
          '<p>Ein Akku verhält sich wie eine ideale Spannungsquelle <b>U0</b> (Leerlaufspannung) mit einem <b>Innenwiderstand Ri</b> in Reihe. Fließt der Laststrom I, fällt an Ri eine Spannung ab:</p>' +
          '<p class="formula">U<sub>Last</sub> = U<sub>0</sub> − I · R<sub>i</sub> &nbsp;&nbsp;⇔&nbsp;&nbsp; R<sub>i</sub> = (U<sub>0</sub> − U<sub>Last</sub>) / I</p>' +
          '<div class="figure"><svg viewBox="0 0 360 120" role="img" aria-label="Ersatzschaltbild Akku mit Last"><rect x="8" y="10" width="170" height="100" rx="8" fill="none" stroke="#90a4ae" stroke-dasharray="4 3"/><text x="14" y="26" fill="#90a4ae" font-size="11">Akkupack</text><line x1="40" y1="40" x2="40" y2="55" stroke="#cfd8dc" stroke-width="2"/><line x1="28" y1="58" x2="52" y2="58" stroke="#cfd8dc" stroke-width="3"/><line x1="34" y1="66" x2="46" y2="66" stroke="#cfd8dc" stroke-width="3"/><line x1="40" y1="66" x2="40" y2="95" stroke="#cfd8dc" stroke-width="2"/><text x="56" y="66" fill="#cfd8dc" font-size="12">U0</text><line x1="40" y1="40" x2="90" y2="40" stroke="#cfd8dc" stroke-width="2"/><rect x="90" y="32" width="44" height="16" fill="none" stroke="#ffb74d" stroke-width="2"/><text x="102" y="28" fill="#ffb74d" font-size="12">Ri</text><line x1="134" y1="40" x2="290" y2="40" stroke="#cfd8dc" stroke-width="2"/><line x1="40" y1="95" x2="290" y2="95" stroke="#cfd8dc" stroke-width="2"/><rect x="280" y="52" width="20" height="32" fill="none" stroke="#22d3ee" stroke-width="2"/><text x="306" y="72" fill="#22d3ee" font-size="12">Last</text><text x="200" y="72" fill="#ffd23f" font-size="12">U_Last</text><text x="200" y="34" fill="#cfd8dc" font-size="11">I →</text></svg></div>' +
          '<p><b>Rechenbeispiel (Lernmodell):</b> Ein gesunder Pack hat Ri ≈ 0,15 Ω. Bei 1,6 A Spitzenlast fallen nur 0,24 V ab. Ein stark gealterter Pack mit Ri ≈ 1,85 Ω verliert bei derselben Last 1,6 A × 1,85 Ω ≈ <b>2,96 V</b>. Aus 12,4 V im Leerlauf werden so unter Last nur noch ≈ 9,4 V – das liegt bereits an der Warnschwelle, obwohl der Akku voll geladen ist.</p>' +
          '<p>Da die Leerlaufspannung mit sinkendem Ladezustand abnimmt, erreicht der gealterte Akku die <b>Abschaltschwelle schon bei hohem Ladezustand</b>: Ein großer Teil der gespeicherten Ladung ist unter Last gar nicht nutzbar. Die <b>Leerlaufspannung allein</b> sagt deshalb fast nichts über die Gebrauchstauglichkeit aus – entscheidend ist das Verhalten <b>unter Last</b>.</p>',
      },
      {
        title: 'Alterung von Li-Ion-Akkus',
        html:
          '<ul><li><b>Zyklische Alterung:</b> Jeder Lade-/Entladezyklus schädigt Elektroden und Elektrolyt geringfügig (u. a. Wachstum der Grenzschicht an der Anode, Verlust an aktivem Lithium).</li>' +
          '<li><b>Kalendarische Alterung:</b> Auch ungenutzte Akkus altern – beschleunigt durch <b>Wärme</b> und dauerhaft <b>hohen Ladezustand</b> (typisch für Geräte, die ständig am Netz hängen).</li>' +
          '<li>Folgen: <b>Kapazität sinkt</b>, <b>Innenwiderstand steigt</b>. Beides verkürzt die Laufzeit; der steigende Innenwiderstand wirkt sich bei hohen Lastströmen und Kälte besonders stark aus.</li>' +
          '<li>Viele Hersteller geben Austauschkriterien vor (z. B. Alter, Zyklenzahl, Restkapazität oder Laufzeittest). Ein häufig genanntes Kriterium ist eine Restkapazität unter ca. 80 % der Nennkapazität – maßgeblich ist aber immer die Herstellerangabe.</li></ul>',
      },
      {
        title: 'Akkuprüfung: welche Messung sagt was?',
        html:
          '<table class="plain"><thead><tr><th>Prüfung</th><th>Aussage</th><th>Grenzen</th></tr></thead><tbody>' +
          '<tr><td>Leerlaufspannung</td><td>Ladezustand grob, Tiefentladung, Zellschluss</td><td>Sagt nichts über Ri und Kapazität</td></tr>' +
          '<tr><td>Spannung unter definierter Last</td><td>Innenwiderstand Ri = ΔU / I</td><td>Last nur kurzzeitig; Temperatur und Ladezustand beachten</td></tr>' +
          '<tr><td>Kapazitätstest (Entladung mit Konstantstrom)</td><td>Entnehmbare Ladung in Ah bis zur Entladeschlussspannung</td><td>Ergebnis hängt vom Entladestrom ab; dauert Stunden</td></tr>' +
          '<tr><td>Laufzeittest im Gerät</td><td>Praxisnah: reale Last inkl. Lastspitzen</td><td>Zeitaufwendig; definierte Bedingungen nötig</td></tr>' +
          '<tr><td>Tauschtest mit bekannt gutem Akku</td><td>Trennt Akku- von Gerätefehlern</td><td>Nur mit freigegebenem, geprüftem Akku</td></tr>' +
          '</tbody></table>',
      },
      {
        title: 'Li-Ion-Sicherheit und Entsorgung',
        html:
          '<ul><li>Akkupacks <b>nie öffnen, kurzschließen, quetschen oder erhitzen</b>. Kurzschlussströme von Li-Ion-Zellen können sehr hoch sein und zum <b>thermischen Durchgehen</b> (Brand, giftige Gase) führen.</li>' +
          '<li><b>Aufgeblähte, beschädigte, ausgelaufene oder heiße</b> Akkus sofort außer Betrieb nehmen und nicht brennbar lagern (z. B. in einem geeigneten Behälter mit Sand).</li>' +
          '<li>Altakkus: <b>Pole abkleben</b>, kennzeichnen und über die vorgesehenen Rücknahmesysteme bzw. den Hersteller <b>fachgerecht entsorgen</b> (geltendes Batterierecht, u. a. EU-Batterieverordnung und nationale Umsetzung). Nicht in den Restmüll.</li>' +
          '<li>Für Transport und Versand von Li-Ion-Akkus (auch Altakkus) gelten Gefahrgutvorschriften.</li>' +
          '<li>Nur vom Hersteller <b>freigegebene Originalakkus</b> verwenden. Selbst aus Einzelzellen gebaute oder nachbestückte Packs sind nicht geprüft und verändern ein Medizinprodukt unzulässig.</li></ul>',
      },
    ],

    findings: [
      { id: 'f_user_transport', text: 'Station: Ausfall beim Transport nach ca. 30 min; „Akku schwach“ kurz nach dem Abstecken; im Netzbetrieb nie Probleme', cat: 'Anamnese' },
      { id: 'f_user_charged', text: 'Station: Pumpe hing vor dem Transport über Nacht am Netz, Ladeanzeige voll', cat: 'Anamnese' },
      { id: 'f_visual_pack_ok', text: 'Sichtprüfung: Akkupack nicht aufgebläht, Gehäuse unbeschädigt, kein Elektrolytaustritt, nicht überhitzt', cat: 'Sichtprüfung' },
      { id: 'f_visual_contacts_ok', text: 'Sichtprüfung: Akku- und Akkufachkontakte sauber, nicht verbogen, keine Korrosion, Akku rastet fest ein', cat: 'Sichtprüfung' },
      { id: 'f_visual_label_age', text: 'Akkuetikett: Herstelldatum vor ca. 4 Jahren 8 Monaten (Lernmodell), Akku nie getauscht', cat: 'Sichtprüfung' },
      { id: 'f_visual_housing_ok', text: 'Sichtprüfung: Gehäuse, Tür, Klemme, Display und Netzkabel ohne Befund', cat: 'Sichtprüfung' },
      { id: 'f_mains_ok', text: 'Netzbetrieb: Selbsttest bestanden, Förderung und Alarme i. O., Netz-/Ladesymbol korrekt', cat: 'Funktion' },
      { id: 'f_gauge_full', text: 'Akkuanzeige nach Ladung: 100 %, Meldung „Ladung abgeschlossen“', cat: 'Funktion' },
      { id: 'f_log_shutdown', text: 'Ereignisprotokoll: Akkubetrieb → nach ≈ 4 min „Akku schwach“ → nach ≈ 31 min Unterspannungsabschaltung bei Ladeanzeige ≈ 85 %', cat: 'Protokoll' },
      { id: 'f_log_charge_complete', text: 'Ereignisprotokoll: vor dem Transport vollständige Ladung („Ladung abgeschlossen“), keine Lade- oder Temperaturfehler', cat: 'Protokoll' },
      { id: 'f_log_cycles', text: 'Akkudaten (Servicemenü, Lernmodell): 612 Ladezyklen, Akku-Alter ≈ 4,7 Jahre', cat: 'Protokoll' },
      { id: 'f_log_current_normal', text: 'Servicemenü: Stromaufnahme bei 100 ml/h ≈ 0,44 A – im Sollbereich des Lernmodells (0,35–0,50 A)', cat: 'Servicemenü' },
      { id: 'f_mm_ocv_ok', text: 'Multimeter: Leerlaufspannung Original-Akku ≈ 12,41 V (≈ 4,14 V/Zelle) – voll geladen, normal', cat: 'Messung' },
      { id: 'f_mm_load_drop', text: 'Multimeter: Original-Akku unter Prüflast 8,2 Ω nur ≈ 10,13 V bei ≈ 1,23 A → ΔU ≈ 2,28 V, Ri ≈ 1,85 Ω', cat: 'Messung' },
      { id: 'f_mm_test_load_ok', text: 'Multimeter: Werkstattakku unter gleicher Last ≈ 12,20 V bei ≈ 1,49 A → ΔU ≈ 0,24 V, Ri ≈ 0,16 Ω', cat: 'Messung' },
      { id: 'f_mm_charge_ok', text: 'Multimeter: Ladeschlussspannung am Akkufach 12,60 V (3 × 4,20 V) – Ladeschaltung i. O.', cat: 'Messung' },
      { id: 'f_mm_ntc_ok', text: 'Multimeter: Temperaturfühler im Akku ≈ 10,8 kΩ bei ca. 23 °C – plausibel', cat: 'Messung' },
      { id: 'f_runtime_short', text: 'Laufzeittest (Original-Akku, 100 ml/h): „Akku schwach“ nach ≈ 4 min, Abschaltung nach ≈ 31 min – Fehler reproduziert', cat: 'Funktion' },
      { id: 'f_cap_low', text: 'Kapazitätstest 0,5 A bis 9,0 V: ≈ 1,41 Ah (≈ 64 % der Nennkapazität 2,2 Ah)', cat: 'Messung' },
      { id: 'f_cap_load_dependent', text: 'Kapazitätstest mit 1,6 A (Spitzenlast): nur ≈ 0,23 Ah entnehmbar – starke Lastabhängigkeit durch hohen Innenwiderstand', cat: 'Messung' },
      { id: 'f_swap_ok', text: 'Tauschtest: bekannt guter Akku in derselben Pumpe → Laufzeit ≈ 4 h 49 min, keine frühe Warnung', cat: 'Tauschtest' },
      { id: 'f_ida_mains_ok', text: 'Pumpenprüfgerät, Netzbetrieb: Förderrate innerhalb ±5 %', cat: 'Messung' },
      { id: 'f_ida_batt_stop', text: 'Pumpenprüfgerät, Akkubetrieb mit Original-Akku: Pumpe stoppt vor Ende der 60-min-Prüfung („Akku leer“)', cat: 'Messung' },
      { id: 'f_ida_test_batt_ok', text: 'Pumpenprüfgerät, Akkubetrieb mit Werkstattakku: Förderrate innerhalb ±5 % über 60 min', cat: 'Tauschtest' },
      { id: 'f_ida_occl_ok', text: 'Pumpenprüfgerät: Okklusionsalarm bei 560 mmHg (Stufe „mittel“, zulässig 400–800 mmHg)', cat: 'Messung' },
      { id: 'fc_flow_ok', text: 'Funktionsprüfung: Förderrate im Akkubetrieb bei ≥ 2 Raten innerhalb Toleranz', cat: 'Freigabe' },
      { id: 'fc_occl_ok', text: 'Funktionsprüfung: Okklusionsalarm im zulässigen Bereich', cat: 'Freigabe' },
      { id: 'fc_runtime_ok', text: 'Funktionsprüfung: Akkulaufzeit mit neuem Akku ≥ 4 h (Sollwert Lernmodell)', cat: 'Freigabe' },
      { id: 'fc_switchover_ok', text: 'Funktionsprüfung: Netzausfall-Umschaltung unterbrechungsfrei, Akkuanzeige und Ladebetrieb i. O.', cat: 'Freigabe' },
      { id: 'fc_safety_ok', text: 'Elektrische Sicherheit nach IEC 62353: bestanden', cat: 'Freigabe' },
      { id: 'fc_final_ok', text: 'Abschluss: Sichtprüfung, Selbsttest, Alarmprüfung und Kennzeichnung i. O.', cat: 'Freigabe' },
    ],

    investigations: [
      {
        id: 'inv_interview',
        type: 'action',
        category: 'Anamnese',
        icon: '💬',
        title: 'Rücksprache mit der Station',
        minutes: 3,
        desc: 'Wann und unter welchen Bedingungen trat der Fehler auf? Wie wurde die Pumpe vorher betrieben?',
        run: () => ({
          html:
            '<p><b>Pflegefachkraft:</b> „Die Pumpe hing die ganze Nacht am Netz, die Akkuanzeige war voll. Kaum hatten wir sie für den Transport abgesteckt, kam schon ‚Akku schwach‘. Wir dachten, das sei ein Anzeigefehler. Nach einer guten halben Stunde, als wir im CT ankamen, ging sie mit ‚Akku leer‘ aus. Am Netz läuft sie problemlos.“</p>' +
            '<p><b>Frage:</b> Wird die Pumpe häufig für Transporte genutzt? – „Ja, das ist unsere Transportpumpe. Die Laufzeit kam uns in letzter Zeit schon kürzer vor, aber so schlimm war es noch nie.“</p>' +
            '<p><b>Frage:</b> War es kalt (z. B. Transport im Freien)? – „Nein, nur durch die Flure.“</p>',
          findings: ['f_user_transport', 'f_user_charged'],
        }),
      },
      {
        id: 'inv_visual',
        type: 'action',
        category: 'Sichtprüfung',
        icon: '🔍',
        title: 'Sichtprüfung von Pumpe, Akkufach und Akku',
        minutes: 5,
        desc: 'Gehäuse, Tür, Netzkabel; Akku entnehmen und auf Aufblähung, Beschädigung, Kontakte und Etikett prüfen.',
        run: () => ({
          html:
            '<ul><li>Gehäuse, Pumpentür, Freifluss-Klemme, Display, Stativklemme und Netzkabel: <b>ohne Befund</b>.</li>' +
            '<li>Akkufachdeckel geöffnet (laut Gebrauchsanweisung des Lernmodells ohne Werkzeug), Akkupack entnommen.</li>' +
            '<li><b>Akkupack:</b> Gehäuse plan, <b>nicht aufgebläht</b>, keine Risse, keine Verfärbung, kein Elektrolytgeruch, nicht warm.</li>' +
            '<li><b>Kontakte</b> an Akku und Akkufach: blank, nicht verbogen, keine Korrosion; der Akku rastet fest ein.</li>' +
            '<li><b>Etikett:</b> Li-Ion 10,8 V / 2,2 Ah (Lernmodell), Herstelldatum vor ca. <b>4 Jahren 8 Monaten</b>. Laut Gerätedatei wurde der Akku noch nie getauscht.</li></ul>' +
            '<div class="callout warn">Wäre der Akku aufgebläht, beschädigt oder heiß: sofort sicher lagern, nicht weiter prüfen oder laden, Brandschutz beachten.</div>',
          findings: ['f_visual_pack_ok', 'f_visual_contacts_ok', 'f_visual_label_age', 'f_visual_housing_ok'],
        }),
      },
      {
        id: 'inv_mains',
        type: 'action',
        category: 'Funktion',
        icon: '🔌',
        title: 'Funktionstest im Netzbetrieb und Ladeanzeige',
        minutes: 5,
        desc: 'Selbsttest, Probelauf mit Prüfset, Netz- und Ladesymbol, Akkuanzeige nach vollständiger Ladung.',
        run: () => ({
          html:
            '<p>Selbsttest beim Einschalten <b>bestanden</b> (Displaytest, Signalton, Alarmleuchte). Probelauf mit Prüf-Infusionsset bei 100 ml/h: Förderung läuft gleichmäßig, Tür- und Okklusionsalarm lösen bei Provokation aus. Netzsymbol leuchtet.</p>' +
            '<p>Die Pumpe wird bis zum Ende der Ladung am Netz gelassen: Akkuanzeige <b>100 %</b>, Meldung <b>„Ladung abgeschlossen“</b>.</p>',
          findings: ['f_mains_ok', 'f_gauge_full'],
        }),
      },
      {
        id: 'inv_log',
        type: 'action',
        category: 'Protokoll',
        icon: '📜',
        title: 'Ereignisprotokoll und Akkudiagnose auslesen',
        minutes: 5,
        desc: 'Ablauf des Ausfalls, Ladeereignisse, Akkuzyklen, Akku-Alter und Stromaufnahme im Servicemenü.',
        run: () => ({
          html:
            '<table class="plain mono"><thead><tr><th>Zeitpunkt</th><th>Ereignis</th></tr></thead><tbody>' +
            '<tr><td>Vortag 22:10</td><td>Netzbetrieb, Laden gestartet (Ladezustand 64 %)</td></tr>' +
            '<tr><td>Vortag 23:52</td><td>Ladung abgeschlossen (100 %)</td></tr>' +
            '<tr><td>14:02</td><td>Netz getrennt – Akkubetrieb, Ladezustand 100 %, Rate 100 ml/h</td></tr>' +
            `<tr><td>${clock(RT_ORIG.warn)}</td><td>Akku schwach (U<sub>min</sub> &lt; ${fmt(U_WARN, 1)} V, Ladeanzeige ${fmt(RT_ORIG.trace[Math.round(RT_ORIG.warn / DT)].soc * 100, 0)} %)</td></tr>` +
            `<tr><td>${clock(RT_ORIG.off)}</td><td>Akku leer – Förderung gestoppt, Unterspannungsabschaltung (U<sub>min</sub> &lt; ${fmt(U_OFF, 1)} V, Ladeanzeige ${fmt(RT_ORIG.soc * 100, 0)} %)</td></tr>` +
            '</tbody></table>' +
            '<p>Keine Einträge zu Ladefehlern, Akkutemperatur, Motor- oder Systemfehlern.</p>' +
            '<h4>Akkudiagnose (Servicemenü, Lernmodell)</h4><table class="plain"><tbody>' +
            '<tr><td>Ladezustand / Ladeanzeige</td><td>100 %</td></tr>' +
            '<tr><td>Akkuspannung (Pumpe im Stand-by)</td><td>12,4 V</td></tr>' +
            '<tr><td>Ladezyklen</td><td><b>612</b></td></tr>' +
            '<tr><td>Akku in Betrieb seit</td><td><b>ca. 4,7 Jahren</b></td></tr>' +
            '<tr><td>Akkutemperatur</td><td>24 °C</td></tr>' +
            `<tr><td>Stromaufnahme bei 100 ml/h</td><td>${fmt(iAvg(100), 2)} A (Sollbereich 0,35–0,50 A)</td></tr>` +
            '</tbody></table><p class="muted">Ereignisprotokoll und Servicemenü sind herstellerspezifisch; hier: fiktives Lernmodell. Herstellerangaben zur zulässigen Zyklenzahl bzw. Nutzungsdauer des Akkus beachten.</p>',
          findings: ['f_log_shutdown', 'f_log_charge_complete', 'f_log_cycles', 'f_log_current_normal'],
        }),
      },
      {
        id: 'inv_mm',
        type: 'instrument',
        instrument: 'multimeter',
        category: 'Messung',
        icon: '🔋',
        title: 'Akkuprüfung mit Multimeter: Leerlauf, Last, Ladespannung, Temperaturfühler',
        minutes: 10,
        desc: 'Leerlaufspannung und Spannung unter definierter Prüflast messen, Innenwiderstand berechnen, Ladespannung und NTC prüfen.',
        fixture: () => multimeterFixture,
      },
      {
        id: 'inv_runtime',
        type: 'action',
        category: 'Funktion',
        icon: '⏱️',
        title: 'Laufzeittest im Akkubetrieb (Original-Akku)',
        minutes: 35,
        desc: 'Akku voll geladen, Förderung 100 ml/h mit Prüfset, Netzstecker ziehen und Zeit bis Warnung und Abschaltung erfassen.',
        run: () => ({
          html:
            '<p>Original-Akku voll geladen (Anzeige 100 %), Förderung 100 ml/h in einen Messbecher, Netzstecker gezogen.</p>' +
            '<table class="plain"><tbody>' +
            `<tr><td>„Akku schwach“</td><td><b>nach ${hm(RT_ORIG.warn)}</b> (Ladeanzeige ${fmt(RT_ORIG.trace[Math.round(RT_ORIG.warn / DT)].soc * 100, 0)} %)</td></tr>` +
            `<tr><td>„Akku leer“, Förderung gestoppt</td><td><b>nach ${hm(RT_ORIG.off)}</b> (Ladeanzeige ${fmt(RT_ORIG.soc * 100, 0)} %)</td></tr>` +
            `<tr><td>Entnommene Ladung bis zur Abschaltung</td><td>${fmt(RT_ORIG.ah, 2)} Ah</td></tr>` +
            `<tr><td>Sollwert Laufzeit (Lernmodell, 100 ml/h)</td><td>≥ 4 h</td></tr>` +
            '</tbody></table>' +
            '<p>Der Fehler ist <b>reproduziert</b>. Auffällig: Die Pumpe schaltet ab, obwohl rechnerisch noch über 80 % der Ladung im Akku sind – die Abschaltung wird also nicht durch „leeren“ Akku, sondern durch die <b>Spannung unter Last</b> ausgelöst.</p>',
          findings: ['f_runtime_short'],
        }),
      },
      {
        id: 'inv_capacity',
        type: 'action',
        category: 'Messung',
        icon: '📉',
        title: 'Kapazitätstest mit Entladeprüfgerät',
        minutes: 20,
        desc: 'Original-Akku (voll geladen) mit Konstantstrom bis 9,0 V entladen – bei kleinem Strom und bei Spitzenlast.',
        run: () => ({
          html:
            '<p>Entladung mit einem Akku-Entladeprüfgerät (Konstantstrom) bis zur Entladeschlussspannung 9,0 V (3,0 V/Zelle), Raumtemperatur, Akku vorher voll geladen. Zwischen beiden Tests vollständig nachgeladen.</p>' +
            '<table class="plain"><thead><tr><th>Entladestrom</th><th>Entnommene Ladung</th><th>Anteil der Nennkapazität 2,2 Ah</th><th>Dauer</th></tr></thead><tbody>' +
            `<tr><td>0,5 A</td><td><b>${fmt(CAP_LOW.ah, 2)} Ah</b></td><td>${pct(CAP_LOW.ah / NOMINAL_AH)}</td><td>${hm(CAP_LOW.hours * 60)}</td></tr>` +
            `<tr><td>1,6 A (≈ Spitzenlast der Pumpe)</td><td><b>${fmt(CAP_PEAK.ah, 2)} Ah</b></td><td>${pct(CAP_PEAK.ah / NOMINAL_AH)}</td><td>${hm(CAP_PEAK.hours * 60)}</td></tr>` +
            '</tbody></table>' +
            '<p>Bei kleinem Strom ist noch knapp zwei Drittel der Nennkapazität entnehmbar – das allein würde für mehrere Stunden Förderung reichen. Bei hohem Strom erreicht der Akku die Entladeschlussspannung dagegen schon nach wenigen Minuten: Der Spannungsabfall I·Ri ist so groß, dass die gespeicherte Ladung <b>unter Last nicht nutzbar</b> ist.</p>' +
            '<p class="muted">Prüfbedingungen (Strom, Schlussspannung, Temperatur) und Austauschkriterium laut Herstellerangabe; hier: Lernmodell.</p>',
          findings: ['f_cap_low', 'f_cap_load_dependent'],
        }),
      },
      {
        id: 'inv_swap',
        type: 'action',
        category: 'Tauschtest',
        icon: '🔄',
        title: 'Tauschtest mit bekannt gutem Akku',
        minutes: 15,
        desc: 'Geprüften Werkstattakku (gleicher, freigegebener Typ) in die Pumpe einsetzen, laden und Laufzeittest wiederholen.',
        run: () => ({
          html:
            '<p>Ein geprüfter, freigegebener Werkstattakku desselben Typs wird in die Pumpe eingesetzt und voll geladen. Laufzeittest mit identischen Bedingungen (100 ml/h, Netzstecker gezogen; Ergebnis im Zeitraffer der Simulation).</p>' +
            '<table class="plain"><tbody>' +
            `<tr><td>„Akku schwach“</td><td>nach ${hm(RT_TEST.warn)}</td></tr>` +
            `<tr><td>Abschaltung</td><td><b>nach ${hm(RT_TEST.off)}</b></td></tr>` +
            `<tr><td>Spannung bei Spitzenlast direkt nach dem Abstecken</td><td>${fmt(terminal(BATT.test, 1, I_PEAK), 2)} V (Original-Akku: ${fmt(terminal(BATT.original, 1, I_PEAK), 2)} V)</td></tr>` +
            '</tbody></table>' +
            '<p>Mit dem bekannt guten Akku erreicht <b>dieselbe Pumpe</b> (gleiche Kontakte, gleiche Ladeschaltung, gleiche Stromaufnahme) eine normale Laufzeit. Der Fehler wandert mit dem Akku.</p>',
          findings: ['f_swap_ok'],
        }),
      },
      {
        id: 'inv_ida',
        type: 'instrument',
        instrument: 'pump-analyzer',
        category: 'Messung',
        icon: '💧',
        title: 'Förderratenprüfung im Netz- und Akkubetrieb (Pumpenprüfgerät)',
        minutes: 15,
        desc: 'Fördergenauigkeit und Okklusionsalarm prüfen; im Akkubetrieb mit Original- und Werkstattakku vergleichen.',
        fixture: () => idaFixture,
      },
      /* ---------- Prüfungen nach der Instandsetzung ---------- */
      {
        id: 'inv_verify_ida',
        type: 'instrument',
        instrument: 'pump-analyzer',
        phase: 'verify',
        category: 'Freigabe',
        icon: '✅',
        title: 'Funktionsprüfung Förderrate und Okklusion (Akkubetrieb)',
        minutes: 15,
        desc: 'Mindestens zwei Raten im Akkubetrieb und Okklusionsalarm mit neuem Akku prüfen.',
        fixture: () => idaVerifyFixture,
      },
      {
        id: 'inv_verify_runtime',
        type: 'action',
        phase: 'verify',
        category: 'Freigabe',
        icon: '⏱️',
        title: 'Laufzeittest mit neuem Akku',
        minutes: 20,
        desc: 'Neuen Akku vollständig laden und Laufzeittest bei 100 ml/h durchführen.',
        run: (ctx) => {
          if (ctx.state.installed !== 'new') return { html: '<p>Bitte zuerst die Instandsetzung durchführen.</p>', findings: [] };
          const r = runtime('new', 100);
          return {
            html:
              '<p>Neuer Originalakku eingesetzt, Erstladung laut Herstellervorgabe vollständig durchgeführt (Anzeige 100 %, „Ladung abgeschlossen“). Laufzeittest bei 100 ml/h, Netzstecker gezogen (Ergebnis im Zeitraffer der Simulation):</p>' +
              '<table class="plain"><tbody>' +
              `<tr><td>Spannung bei Spitzenlast direkt nach dem Abstecken</td><td>${fmt(terminal(BATT.new, 1, I_PEAK), 2)} V</td></tr>` +
              `<tr><td>„Akku schwach“</td><td>nach ${hm(r.warn)}</td></tr>` +
              `<tr><td>Abschaltung</td><td><b>nach ${hm(r.off)}</b> – Sollwert ≥ 4 h (Lernmodell) erfüllt</td></tr>` +
              '</tbody></table><p class="muted">In der Praxis wird ein Laufzeittest oft verkürzt oder über die Akkudiagnose des Geräts bewertet – Vorgehen laut Hersteller.</p>',
            findings: ['fc_runtime_ok'],
          };
        },
      },
      {
        id: 'inv_verify_switchover',
        type: 'action',
        phase: 'verify',
        category: 'Freigabe',
        icon: '🔀',
        title: 'Netzausfall-Umschaltung prüfen',
        minutes: 5,
        desc: 'Netzstecker während laufender Förderung ziehen und wieder stecken: Umschaltung, Anzeigen, Ladebetrieb.',
        run: (ctx) => {
          if (ctx.state.installed !== 'new') return { html: '<p>Bitte zuerst die Instandsetzung durchführen.</p>', findings: [] };
          return {
            html:
              '<ul><li>Netzstecker bei laufender Förderung (100 ml/h) gezogen: Förderung läuft <b>ohne Unterbrechung</b> weiter, Hinweis „Akkubetrieb“, Netzsymbol erlischt, Akkuanzeige 100 %.</li>' +
              `<li>Akkuspannung im Servicemenü: ${fmt(terminal(BATT.new, 1, iAvg(100)), 2)} V bei Förderung, kurzzeitig ${fmt(terminal(BATT.new, 1, I_PEAK), 2)} V bei Spitzenlast – <b>keine</b> Warnung.</li>` +
              '<li>Netzstecker wieder gesteckt: Netzsymbol leuchtet, Ladebetrieb startet, keine Alarme.</li></ul>',
            findings: ['fc_switchover_ok'],
          };
        },
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
        desc: 'Wiederholungsprüfung mit Sicherheitsanalysator (Schutzklasse und Anwendungsteil laut Typschild).',
        fixture: () => safetyFixture,
      },
      {
        id: 'inv_verify_final',
        type: 'action',
        phase: 'verify',
        category: 'Freigabe',
        icon: '🏁',
        title: 'Abschließende Sichtprüfung, Selbsttest und Alarmprüfung',
        minutes: 5,
        desc: 'Akkufach verschlossen, Selbsttest, Alarmprüfung, Kennzeichnung und Prüfstatus.',
        run: (ctx) => {
          if (ctx.state.installed !== 'new') return { html: '<p>Bitte zuerst die Instandsetzung durchführen.</p>', findings: [] };
          return {
            html: '<p>Akkufachdeckel sicher verschlossen, Akku sitzt fest. Selbsttest bestanden, Signalton und Alarmleuchte funktionieren, Akkuanzeige 100 %. Pumpe gereinigt, Prüfplakette/Prüfstatus aktualisiert, Akkutausch mit Datum im Gerät bzw. in der Gerätedatei vermerkt (für die Planung des nächsten Tauschs).</p>',
            findings: ['fc_final_ok'],
          };
        },
      },
    ],

    hypotheses: [
      { id: 'h_not_charged', text: 'Akku vor dem Transport nicht ausreichend geladen (Anwendungsfehler)', expected: 'excluded', evidence: ['f_user_charged', 'f_log_charge_complete'], explain: 'Die Pumpe hing über Nacht am Netz; das Protokoll belegt „Ladung abgeschlossen“ und 100 % beim Abstecken.' },
      { id: 'h_charger', text: 'Ladeschaltung oder Netzteil defekt – Akku wird nicht voll geladen', expected: 'excluded', evidence: ['f_mm_charge_ok', 'f_mm_ocv_ok'], explain: 'Die Ladeschlussspannung beträgt korrekt 12,60 V, und der Akku hat nach dem Laden die Leerlaufspannung eines voll geladenen Packs.' },
      { id: 'h_battery_aged', text: 'Akku gealtert: stark erhöhter Innenwiderstand (und verminderte Kapazität)', expected: 'confirmed', evidence: ['f_mm_load_drop', 'f_swap_ok'], explain: 'Unter definierter Last bricht die Spannung um ≈ 2,3 V ein (Ri ≈ 1,85 Ω statt ≈ 0,15 Ω); mit bekannt gutem Akku läuft dieselbe Pumpe normal.' },
      { id: 'h_contacts', text: 'Übergangswiderstand an Akkukontakten oder im Akkufach', expected: 'excluded', evidence: ['f_visual_contacts_ok', 'f_swap_ok'], explain: 'Kontakte sind einwandfrei, und der Werkstattakku funktioniert über dieselben Kontakte. Zudem wurde der Spannungseinbruch direkt an den Polen des ausgebauten Akkus gemessen.' },
      { id: 'h_consumption', text: 'Erhöhte Stromaufnahme der Pumpe (schwergängige Mechanik, Defekt auf der Platine)', expected: 'excluded', evidence: ['f_log_current_normal', 'f_swap_ok'], explain: 'Die Stromaufnahme liegt im Sollbereich, und mit gutem Akku erreicht die Pumpe die normale Laufzeit.' },
      { id: 'h_ntc', text: 'Temperaturfühler im Akku defekt (Ladeabbruch, falsche Temperaturmeldung)', expected: 'excluded', evidence: ['f_mm_ntc_ok', 'f_log_charge_complete'], explain: 'Der NTC-Wert ist plausibel, das Protokoll zeigt keine Temperaturfehler und eine abgeschlossene Ladung.' },
      { id: 'h_gauge', text: 'Ladestandsanzeige falsch – der Akku war in Wirklichkeit leer', expected: 'excluded', evidence: ['f_mm_ocv_ok', 'f_cap_low'], explain: 'Leerlaufspannung und Kapazitätstest bei kleinem Strom zeigen: Der Akku war geladen und enthält Ladung. Sie ist nur unter Last wegen des hohen Innenwiderstands nicht nutzbar.' },
      { id: 'h_damage', text: 'Akku mechanisch beschädigt oder aufgebläht (Zellschaden)', expected: 'excluded', evidence: ['f_visual_pack_ok'], explain: 'Die Sichtprüfung zeigt keinen mechanischen Schaden und keine Aufblähung. (Wäre das der Fall, müsste der Akku sofort sicher gelagert werden.)' },
    ],

    diagnosis: {
      tree: {
        start: 'n_mains',
        nodes: {
          n_mains: {
            question: 'Arbeitet die Pumpe im Netzbetrieb einwandfrei?',
            answers: [
              { label: 'Ja – Förderung, Selbsttest und Alarme i. O.', correct: true, requires: ['f_mains_ok'], next: 'n_charged', feedback: 'Richtig: Der Fehler betrifft nur den Akkubetrieb. Pumpmechanik und Steuerung sind grundsätzlich in Ordnung.' },
              { label: 'Nein – auch am Netz fallen Funktionen aus', correct: false, feedback: 'Der Funktionstest am Netz war unauffällig.' },
            ],
          },
          n_charged: {
            question: 'War der Akku vor dem Ausfall vollständig geladen?',
            answers: [
              { label: 'Ja – Ladung abgeschlossen, Leerlaufspannung entspricht vollem Akku', correct: true, requires: ['f_log_charge_complete', 'f_mm_ocv_ok'], next: 'n_reproduce', feedback: 'Richtig: Ladeschaltung und Bedienung scheiden als Ursache weitgehend aus.' },
              { label: 'Nein – der Akku war nicht geladen', correct: false, feedback: 'Protokoll und Leerlaufspannung belegen eine vollständige Ladung.' },
            ],
          },
          n_reproduce: {
            question: 'Lässt sich der Fehler unter definierten Bedingungen reproduzieren?',
            answers: [
              { label: 'Ja – frühe Warnung, Abschaltung nach ≈ 31 min trotz hoher Ladeanzeige', correct: true, requires: ['f_runtime_short'], next: 'n_load', feedback: 'Richtig: Der Fehler ist reproduzierbar – und die Abschaltung bei hoher Ladeanzeige weist auf ein Spannungsproblem unter Last hin.' },
              { label: 'Nein – im Laufzeittest läuft die Pumpe normal', correct: false, feedback: 'Der Laufzeittest mit dem Original-Akku zeigt das Fehlerbild deutlich.' },
            ],
          },
          n_load: {
            question: 'Wie verhält sich die Akkuspannung unter definierter Last?',
            answers: [
              { label: 'Starker Einbruch (≈ 2,3 V bei ≈ 1,2 A) → Ri ≈ 1,85 Ω', correct: true, requires: ['f_mm_load_drop'], next: 'n_consumption', feedback: 'Richtig: U_Last = U0 − I·Ri – der Innenwiderstand ist etwa zehnmal so hoch wie bei einem guten Akku.' },
              { label: 'Kaum Einbruch – Spannung bleibt über 12 V', correct: false, feedback: 'Das gilt nur für den Werkstattakku. Miss den Original-Akku mit zugeschalteter Prüflast.' },
              { label: 'Schon die Leerlaufspannung ist viel zu niedrig', correct: false, feedback: 'Die Leerlaufspannung ist mit ≈ 12,41 V normal – genau das macht diesen Fehler tückisch.' },
            ],
          },
          n_consumption: {
            question: 'Ist die Stromaufnahme der Pumpe normal?',
            answers: [
              { label: 'Ja – ≈ 0,44 A bei 100 ml/h, im Sollbereich', correct: true, requires: ['f_log_current_normal'], next: 'n_swap', feedback: 'Richtig: Die Pumpe belastet den Akku nicht übermäßig.' },
              { label: 'Nein – deutlich erhöht', correct: false, feedback: 'Die Akkudiagnose zeigt eine Stromaufnahme im Sollbereich.' },
            ],
          },
          n_swap: {
            question: 'Was ergibt der Tauschtest mit einem bekannt guten Akku?',
            answers: [
              { label: 'Normale Laufzeit – der Fehler wandert mit dem Akku', correct: true, requires: ['f_swap_ok'], feedback: 'Richtig: Ursache eindeutig dem Akkupack zugeordnet und messtechnisch belegt.' },
              { label: 'Weiterhin kurze Laufzeit – die Pumpe ist schuld', correct: false, feedback: 'Mit dem Werkstattakku läuft die Pumpe fast 5 Stunden.' },
            ],
          },
        },
      },
      rootCauses: [
        { id: 'rc_aged_battery', correct: true, text: 'Alterung des Akkupacks (612 Zyklen, ≈ 4,7 Jahre): stark erhöhter Innenwiderstand (≈ 1,85 Ω statt ≈ 0,15 Ω) und verminderte Kapazität → Spannungseinbruch unter Last bis zur Unterspannungsabschaltung', feedback: 'Korrekt. Belegt durch Lasttest (Ri), Kapazitätstest, Laufzeittest und Tauschtest. Die normale Leerlaufspannung und die volle Anzeige ändern daran nichts.' },
        { id: 'rc_charger', correct: false, text: 'Ladeschaltung lädt den Akku nicht vollständig', feedback: 'Nein: Ladeschlussspannung 12,60 V und Leerlaufspannung nach der Ladung sind korrekt.' },
        { id: 'rc_gauge', correct: false, text: 'Fehlerhafte Ladestandsanzeige (Firmware/Kalibrierung)', feedback: 'Nein: Der Akku war tatsächlich geladen. Die Anzeige stimmt in Bezug auf die gespeicherte Ladung – das Problem ist, dass diese Ladung unter Last nicht nutzbar ist.' },
        { id: 'rc_contacts', correct: false, text: 'Korrodierte Akkukontakte im Akkufach', feedback: 'Nein: Kontakte einwandfrei; der Spannungseinbruch tritt direkt an den Polen des ausgebauten Akkus auf.' },
        { id: 'rc_motor', correct: false, text: 'Schwergängige Pumpmechanik mit erhöhter Stromaufnahme', feedback: 'Nein: Stromaufnahme im Sollbereich, Laufzeit mit gutem Akku normal.' },
        { id: 'rc_user', correct: false, text: 'Bedienfehler: Pumpe vor dem Transport nicht geladen', feedback: 'Nein: Ladung abgeschlossen, Anzeige 100 %. (Gute Praxis bleibt trotzdem: Pumpen bei Nichtgebrauch am Netz lassen.)' },
      ],
      repairActions: [
        { id: 'ra_replace_battery', verdict: 'correct', completes: true, minutes: 10, text: 'Akkupack gemäß Herstellervorgabe gegen freigegebenen Originalakku tauschen; Erstladung und ggf. Akkudaten/Kalibrierzyklus nach Herstellervorgabe', feedback: 'Richtig: Der Akku ist ein Verschleißteil. Typ, Charge/Herstelldatum und Tauschdatum dokumentieren.', apply: (st) => { st.installed = 'new'; st.verifyRates = []; } },
        { id: 'ra_dispose', verdict: 'good', minutes: 3, text: 'Altakku: Pole abkleben, als „defekt – nicht verwenden“ kennzeichnen und über das Rücknahmesystem für Li-Ion-Akkus fachgerecht entsorgen', feedback: 'Gut: Verhindert Kurzschluss, Brand und versehentliche Wiederverwendung; Entsorgung nach geltendem Batterierecht.' },
        { id: 'ra_fleet', verdict: 'good', minutes: 5, text: 'Akku-Alter und Zyklen der übrigen Pumpen desselben Bestands prüfen; Akkutausch vorbeugend in die Instandhaltungsplanung aufnehmen', feedback: 'Gut: Gleich alte Akkus anderer Pumpen werden wahrscheinlich bald ähnlich ausfallen – vorbeugender Tausch nach Herstellerkriterien vermeidet weitere Therapieabbrüche.' },
        { id: 'ra_inform', verdict: 'good', minutes: 3, text: 'Station informieren: „Akku schwach“ ernst nehmen, Transportpumpen bei Nichtgebrauch am Netz lassen, Auffälligkeiten melden', feedback: 'Gut: Die frühe Warnung war ein echter Hinweis – Anwender sollten sie nicht als Anzeigefehler abtun.' },
        { id: 'ra_charger', verdict: 'wrong', minutes: 45, text: 'Ladeplatine bzw. Netzteil tauschen', feedback: 'Tausch auf Verdacht – und ein Eingriff an netzführenden Baugruppen: Die Ladeschaltung arbeitet nachweislich korrekt.' },
        { id: 'ra_cells', verdict: 'wrong', minutes: 60, text: 'Akkupack öffnen und mit Einzelzellen aus dem Handel neu bestücken', feedback: 'Nicht zulässig: Zellauswahl, Schutzschaltung, Verschweißung und Gehäuse sind Teil des geprüften Medizinprodukts. Selbstbau-Packs bergen Brand- und Ausfallrisiken und sind ohne Herstellerfreigabe kein bestimmungsgemäßer Eingriff.' },
        { id: 'ra_recondition', verdict: 'wrong', minutes: 30, text: 'Akku durch mehrfaches Tiefentladen und Laden „regenerieren“', feedback: 'Falsch: Li-Ion-Akkus haben keinen Memory-Effekt. Tiefentladung schädigt die Zellen zusätzlich und kann die Schutzschaltung auslösen. Der Innenwiderstand sinkt dadurch nicht.' },
        { id: 'ra_threshold', verdict: 'wrong', minutes: 10, text: 'Unterspannungs-Abschaltschwelle im Servicemenü herabsetzen', feedback: 'Unzulässig: Das ist eine Manipulation einer Schutzfunktion. Die Pumpe könnte unkontrolliert ausfallen, ohne zuverlässig zu alarmieren.' },
        { id: 'ra_mainboard', verdict: 'wrong', minutes: 60, text: 'Hauptplatine tauschen', feedback: 'Tausch auf Verdacht: Pumpe funktioniert mit gutem Akku einwandfrei.' },
        { id: 'ra_clean_contacts', verdict: 'neutral', minutes: 5, text: 'Akkukontakte mit Kontaktreiniger behandeln', feedback: 'Nicht erforderlich: Die Kontakte sind einwandfrei. Reinigungsmittel nur, wenn vom Hersteller zugelassen.' },
      ],
      functionChecks: [
        { id: 'fc_flow', title: 'Förderratenprüfung im Akkubetrieb (≥ 2 Raten)', passFinding: 'fc_flow_ok', investigation: 'inv_verify_ida' },
        { id: 'fc_occl', title: 'Okklusionsalarm (Druckstufe „mittel“)', passFinding: 'fc_occl_ok', investigation: 'inv_verify_ida' },
        { id: 'fc_runtime', title: 'Laufzeittest mit neuem Akku', passFinding: 'fc_runtime_ok', investigation: 'inv_verify_runtime' },
        { id: 'fc_switchover', title: 'Netzausfall-Umschaltung', passFinding: 'fc_switchover_ok', investigation: 'inv_verify_switchover' },
        { id: 'fc_safety', title: 'Elektrische Sicherheitsprüfung nach IEC 62353', passFinding: 'fc_safety_ok', investigation: 'inv_verify_safety' },
        { id: 'fc_final', title: 'Abschließende Sicht-, Selbst- und Alarmprüfung', passFinding: 'fc_final_ok', investigation: 'inv_verify_final' },
      ],
    },

    explanation: {
      html:
        '<h3>Was ist passiert?</h3>' +
        '<p>Der Akkupack der Pumpe ist nach <b>612 Zyklen und fast fünf Jahren</b> im Dauerbetrieb am Netz stark gealtert. Dabei ist nicht nur die Kapazität gesunken (bei kleinem Strom noch ≈ 64 %), vor allem ist der <b>Innenwiderstand</b> von ≈ 0,15 Ω auf ≈ 1,85 Ω gestiegen.</p>' +
        '<h3>Warum zeigt die Pumpe genau dieses Fehlerbild?</h3>' +
        '<ul><li>Nach dem Laden ist der Akku <b>voll</b>: Leerlaufspannung 12,41 V, Anzeige 100 %. Die Anzeige hat also nicht „gelogen“.</li>' +
        `<li>Bei jeder Lastspitze (≈ 1,6 A) fällt am Innenwiderstand ΔU = I·Ri ≈ 1,6 A × 1,85 Ω ≈ ${fmt(I_PEAK * BATT.original.Ri, 2)} V ab. Die Klemmenspannung sinkt von 12,41 V auf ≈ ${fmt(terminal(BATT.original, 1, I_PEAK), 2)} V – nur knapp über der Warnschwelle von 9,4 V. Schon wenige Minuten nach dem Abstecken liegt sie bei Lastspitzen darunter: „Akku schwach“.</li>` +
        `<li>Mit sinkendem Ladezustand fällt die Leerlaufspannung weiter. Bei etwa ${fmt(RT_ORIG.soc * 100, 0)} % Ladezustand unterschreitet die Spannung bei Lastspitzen die Abschaltschwelle von 9,0 V – nach ≈ ${hm(RT_ORIG.off)}. Die Pumpe stoppt korrekt mit Alarm, um einen unkontrollierten Ausfall zu verhindern.</li>` +
        '<li>Rund 85 % der gespeicherten Ladung sind damit unter Last <b>nicht nutzbar</b> – das erklärt den großen Unterschied zwischen Kapazitätstest bei 0,5 A und Laufzeit in der Pumpe.</li></ul>' +
        '<h3>Warum war dieses Vorgehen sinnvoll?</h3>' +
        '<ol><li><b>Anamnese und Protokoll</b> zeigen: Fehler nur im Akkubetrieb, Akku war geladen, Abschaltung bei hoher Ladeanzeige.</li>' +
        '<li>Die <b>Leerlaufspannung</b> schließt einen ungeladenen Akku aus – beweist aber noch keinen guten Akku.</li>' +
        '<li>Erst der <b>Lasttest</b> macht den Innenwiderstand sichtbar: Ri = ΔU / I. Der Vergleich mit einem guten Akku liefert den Referenzwert.</li>' +
        '<li><b>Ladespannung, NTC und Stromaufnahme</b> schließen Ladeschaltung, Temperaturerfassung und Pumpe als Ursache aus.</li>' +
        '<li>Der <b>Tauschtest</b> bestätigt: Der Fehler wandert mit dem Akku.</li></ol>' +
        '<h3>Warum Austausch statt „Reparatur“?</h3>' +
        '<p>Der Akkupack ist ein vom Hersteller spezifiziertes Verschleißteil mit Schutzschaltung. Einzelzellen nachzurüsten, Packs zu „regenerieren“ oder Abschaltschwellen zu verändern, gefährdet Patient und Anwender (Brand, unerwarteter Therapieabbruch) und ist ohne Herstellerfreigabe nicht zulässig. Richtig ist der Tausch gegen einen <b>freigegebenen Originalakku</b> mit anschließender Funktionsprüfung.</p>' +
        '<h3>Li-Ion-Sicherheit und Entsorgung</h3>' +
        '<ul><li>Altakku nicht kurzschließen: Pole abkleben, kennzeichnen, getrennt sammeln, über Rücknahmesysteme entsorgen.</li>' +
        '<li>Aufgeblähte oder beschädigte Akkus sind ein Brandrisiko – sofort sicher und nicht brennbar lagern.</li></ul>' +
        '<h3>Vorbeugung</h3>' +
        '<ul><li>Akkuzustand regelmäßig prüfen (Akkudiagnose, Laufzeit- oder Kapazitätstest nach Herstellervorgabe), besonders bei <b>Transportpumpen</b>.</li>' +
        '<li>Akkus nach Herstellerkriterien (Alter, Zyklen, Restkapazität) <b>vorbeugend tauschen</b> und das Tauschdatum dokumentieren.</li>' +
        '<li>Anwender schulen: Eine frühe Meldung „Akku schwach“ nach dem Abstecken ist ein ernstzunehmendes Warnsignal.</li></ul>' +
        '<div class="callout warn"><b>Lernsimulation vs. reale Servicearbeit:</b> Akkudaten, Schwellen, Messadapter, Servicemenü und Protokoll sind fiktiv. Reale Akkuprüfungen und -tausch richten sich nach den Unterlagen des Herstellers, der Qualifikation des Personals und den geltenden Vorschriften (u. a. MPDG, MPBetreibV, IEC 62353, Batterie- und Gefahrgutrecht). Arbeiten an Netzteil und Ladeschaltung sind qualifiziertem, vom Hersteller geschultem Personal vorbehalten.</div>',
    },

    documentation: {
      intro: 'Erstelle den Instandsetzungsbericht. Er dient als Nachweis für Betreiber, Medizinproduktebuch/Gerätedatei und eine mögliche Vorkommnisbewertung.',
      fields: [
        {
          id: 'symptom',
          label: 'Fehlerbeschreibung (Befund)',
          type: 'select',
          options: [
            { value: 'a', label: 'Akku kaputt' },
            { value: 'b', label: 'Im Akkubetrieb „Akku schwach“ nach ≈ 4 min, Abschaltung nach ≈ 31 min bei 100 ml/h trotz vollständiger Ladung (Anzeige 100 %); Netzbetrieb i. O.; Fehler reproduziert' },
            { value: 'c', label: 'Pumpe schaltet sich gelegentlich aus' },
          ],
          correct: 'b',
          hint: 'Beschreibe den Befund konkret und überprüfbar – mit Bedingungen und Zeiten.',
        },
        {
          id: 'cause',
          label: 'Festgestellte Ursache',
          type: 'select',
          options: [
            { value: 'a', label: 'Ladeschaltung defekt' },
            { value: 'b', label: 'Vermutlich alter Akku' },
            { value: 'c', label: 'Gealterter Akkupack (612 Zyklen, ≈ 4,7 Jahre): Innenwiderstand ≈ 1,85 Ω (Lasttest 8,2 Ω: 12,41 V → 10,13 V bei 1,23 A), Kapazität ≈ 64 %; Ladeschaltung, NTC und Stromaufnahme i. O.; Tauschtest bestätigt' },
          ],
          correct: 'c',
          hint: 'Ursache und Nachweis gehören zusammen.',
        },
        {
          id: 'action',
          label: 'Durchgeführte Maßnahme',
          type: 'select',
          options: [
            { value: 'a', label: 'Akkupack gegen freigegebenen Originalakku getauscht, Erstladung nach Herstellervorgabe; Altakku gesichert und zur Entsorgung gegeben; Station informiert; Akkubestand geprüft' },
            { value: 'b', label: 'Akku regeneriert (dreimal tiefentladen und geladen)' },
            { value: 'c', label: 'Akku mit neuen Zellen bestückt' },
          ],
          correct: 'a',
        },
        {
          id: 'part',
          label: 'Verwendetes Ersatzteil',
          type: 'select',
          options: [
            { value: 'a', label: 'Kompatibler Nachbauakku aus dem Onlinehandel' },
            { value: 'b', label: 'Akkupack Li-Ion, Originalersatzteil laut Herstellerliste (Artikel-Nr., Herstelldatum/Charge eintragen)' },
            { value: 'c', label: 'Kein Ersatzteil' },
          ],
          correct: 'b',
          hint: 'Nur vom Hersteller freigegebene Teile – Rückverfolgbarkeit sicherstellen.',
        },
        {
          id: 'checks',
          label: 'Durchgeführte Prüfungen nach Instandsetzung',
          type: 'multi',
          options: [
            { value: 'visual', label: 'Sichtprüfung, Selbsttest, Alarmprüfung' },
            { value: 'flow', label: 'Förderratenprüfung im Akkubetrieb' },
            { value: 'occl', label: 'Okklusionsalarm' },
            { value: 'runtime', label: 'Laufzeittest mit neuem Akku' },
            { value: 'switch', label: 'Netzausfall-Umschaltung' },
            { value: 'safety', label: 'Elektrische Sicherheitsprüfung IEC 62353' },
            { value: 'pressure', label: 'Neujustage der Okklusionsdrucksensoren' },
            { value: 'mtk', label: 'Messtechnische Kontrolle' },
          ],
          correct: ['visual', 'flow', 'occl', 'runtime', 'switch', 'safety'],
          hint: 'Nur tatsächlich durchgeführte Prüfungen dokumentieren. Drucksensoren wurden nicht justiert; messtechnische Kontrollen (MPBetreibV Anlage 2) sind für Infusionspumpen nicht vorgesehen.',
        },
        {
          id: 'equipment',
          label: 'Verwendete Prüfmittel (mit Inventar-Nr. und Kalibrierstatus)',
          type: 'multi',
          options: [
            { value: 'ida', label: 'Pumpenprüfgerät' },
            { value: 'sa', label: 'Sicherheitsanalysator' },
            { value: 'dmm', label: 'Digitalmultimeter mit Prüflast' },
            { value: 'discharge', label: 'Akku-Entladeprüfgerät' },
            { value: 'flow', label: 'Beatmungsanalysator' },
            { value: 'ecg', label: 'EKG-Simulator' },
          ],
          correct: ['ida', 'sa', 'dmm'],
          optional: ['discharge'], // nur, wenn der Kapazitätstest durchgeführt wurde
          hint: 'Alle für Fehlersuche und Prüfung eingesetzten Messmittel aufführen.',
        },
        {
          id: 'disposal',
          label: 'Verbleib des Altakkus',
          type: 'select',
          options: [
            { value: 'a', label: 'In den Restmüll' },
            { value: 'b', label: 'Als Reserveakku ins Lager' },
            { value: 'c', label: 'Pole isoliert, gekennzeichnet, über Rücknahmesystem für Li-Ion-Akkus entsorgt' },
          ],
          correct: 'c',
          hint: 'Gealterte Akkus nicht weiterverwenden; Li-Ion-Akkus gehören nicht in den Restmüll.',
        },
        {
          id: 'release',
          label: 'Ergebnis / Freigabe',
          type: 'select',
          options: [
            { value: 'a', label: 'Gerät freigegeben, Laufzeittest wird bei Gelegenheit nachgeholt' },
            { value: 'b', label: 'Gerät funktions- und sicherheitstechnisch i. O. – freigegeben, Prüfstatus und Akkutauschdatum dokumentiert, Rückgabe an Station' },
            { value: 'c', label: 'Gerät gesperrt' },
          ],
          correct: 'b',
        },
        { id: 'remark', label: 'Bemerkungen / Empfehlungen', type: 'text', required: true, minLength: 10, placeholder: 'z. B. Akkutausch weiterer Pumpen gleichen Alters planen, Hinweis an Station …' },
        { id: 'tech', label: 'Prüfer/in (Name, Kürzel)', type: 'text', required: true, minLength: 2, placeholder: 'Name, Kürzel' },
      ],
    },

    quiz: [
      { q: 'Ein Akku zeigt im Leerlauf 12,41 V, unter 1,23 A Last nur noch 10,13 V. Wie groß ist sein Innenwiderstand?', options: ['ca. 0,19 Ω', 'ca. 1,85 Ω', 'ca. 8,2 Ω', 'ca. 10 Ω'], correct: 1, explain: 'Ri = (U0 − U_Last) / I = (12,41 V − 10,13 V) / 1,23 A ≈ 1,85 Ω.' },
      { q: 'Warum ist die Leerlaufspannung allein kein Nachweis für einen guten Akku?', options: ['Weil Multimeter Leerlaufspannungen ungenau messen', 'Weil sie nur den Ladezustand widerspiegelt, nicht Innenwiderstand und Kapazität', 'Weil Li-Ion-Akkus keine Leerlaufspannung haben', 'Weil sie immer 10,8 V beträgt'], correct: 1, explain: 'Ein gealterter Akku kann voll geladen eine normale Leerlaufspannung haben – sein Defizit zeigt sich erst unter Last.' },
      { q: 'Welche Formel beschreibt die Klemmenspannung eines Akkus unter Last?', options: ['U = U0 + I · Ri', 'U = U0 − I · Ri', 'U = I / Ri', 'U = U0 · Ri / I'], correct: 1, explain: 'Am Innenwiderstand fällt die Spannung I·Ri ab; sie fehlt an den Klemmen.' },
      { q: 'Warum schaltete die Pumpe ab, obwohl die Ladeanzeige noch etwa 85 % zeigte?', options: ['Firmwarefehler der Ladeanzeige', 'Weil die Spannung bei Lastspitzen wegen des hohen Innenwiderstands unter die Abschaltschwelle fiel', 'Weil der Motor blockierte', 'Weil die Ladeschaltung den Akku entlud'], correct: 1, explain: 'Die gespeicherte Ladung war vorhanden, aber bei hohem Strom nicht nutzbar.' },
      { q: 'Was beweist der Tauschtest mit einem bekannt guten Akku?', options: ['Dass der Akku die Ursache ist, wenn der Fehler mit dem Akku wandert', 'Dass die Ableitströme in Ordnung sind', 'Dass die Förderrate stimmt', 'Gar nichts, Tauschtests sind unzuverlässig'], correct: 0, explain: 'Gleiche Pumpe, gleiche Kontakte, gleiche Ladeschaltung – nur der Akku ist anders. Läuft die Pumpe normal, liegt die Ursache im Akku.' },
      { q: 'Welche Maßnahme ist bei einem gealterten Li-Ion-Akku richtig?', options: ['Mehrfach tiefentladen, um ihn zu regenerieren', 'Mit Einzelzellen aus dem Handel neu bestücken', 'Gegen einen vom Hersteller freigegebenen Originalakku tauschen', 'Die Abschaltschwelle im Servicemenü senken'], correct: 2, explain: 'Nur der Tausch gegen ein freigegebenes Originalteil erhält die geprüften Eigenschaften des Medizinprodukts.' },
      { q: 'Wie wird ein Li-Ion-Altakku korrekt behandelt?', options: ['In den Restmüll', 'Pole isolieren, kennzeichnen und über ein Rücknahmesystem fachgerecht entsorgen', 'Öffnen und Zellen einzeln entsorgen', 'In Wasser lagern'], correct: 1, explain: 'Abgeklebte Pole verhindern Kurzschlüsse; Li-Ion-Akkus werden über Rücknahmesysteme nach Batterierecht entsorgt.' },
      { q: 'Was ist bei einem aufgeblähten Li-Ion-Akku zu tun?', options: ['Weiter benutzen, solange er funktioniert', 'Sofort außer Betrieb nehmen, nicht laden, sicher und nicht brennbar lagern', 'Mit Gewicht flach drücken', 'Aufstechen, damit das Gas entweicht'], correct: 1, explain: 'Aufblähung zeigt einen Zellschaden an – es besteht Brandgefahr.' },
      { q: 'Warum gehört nach dem Akkutausch auch eine Förderratenprüfung im Akkubetrieb zur Funktionsprüfung?', options: ['Weil der Akku die Förderrate einstellt', 'Weil so die Funktion der Pumpe unter realer Akkuversorgung über die Prüfdauer belegt wird', 'Weil die Norm das für jede Messung vorschreibt', 'Sie ist nicht nötig'], correct: 1, explain: 'Die Instandsetzung soll den Akkubetrieb wiederherstellen – genau dieser muss funktional nachgewiesen werden, zusammen mit Okklusionsalarm, Laufzeit und Umschaltung.' },
      { q: 'Wozu dient der Temperaturfühler (NTC) im Akkupack?', options: ['Zur Messung der Patiententemperatur', 'Damit die Ladeschaltung nur im zulässigen Temperaturbereich lädt und Übertemperatur erkennt', 'Er bestimmt die Förderrate', 'Er ersetzt die Schutzschaltung'], correct: 1, explain: 'Li-Ion-Zellen dürfen nur in einem begrenzten Temperaturbereich geladen werden; der NTC liefert der Ladeschaltung diese Information.' },
    ],

    createState: () => ({
      installed: 'original',
      mmBattery: 'original',
      mmLoad: 'none',
      idaSupply: 'mains',
      idaBattery: 'original',
      verifySupply: 'battery',
    }),
  });

  // Für automatische Tests exportieren (keine Auswirkung im Browser)
  MTRL.__test = MTRL.__test || {};
  MTRL.__test.ipBattery = { BATT, runtime, capacity, terminal, underResistor, packOcv, multimeterFixture, idaFixture, idaVerifyFixture };
})();
