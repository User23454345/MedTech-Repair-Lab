/*
 * Servicefall NIBP-01: Blutdruckmessgerät misst systematisch zu hoch
 * ------------------------------------------------------------------
 * Definierter Fehler (deterministisch):
 *   Der Hauptdrucksensor (Messkanal) des NIBP-Messmoduls hat durch Langzeit-
 *   drift einen NULLPUNKTFEHLER (Offset) von ca. +6 mmHg entwickelt. Die
 *   Empfindlichkeit (Steigung der Kennlinie) ist unverändert. Folge: Jeder
 *   gemessene Manschettendruck – und damit SYS, DIA und MAD – wird um
 *   konstant ca. 6 mmHg zu hoch angezeigt. Das pneumatische System ist dicht.
 *
 * Abzugrenzen gegen:
 *   - Verstärkungs-/Empfindlichkeitsfehler (Abweichung wächst proportional mit dem Druck)
 *   - Leckage (Druckabfall bei der Dichtheitsprüfung, Messabbrüche)
 *   - Anwendungsfehler (zu kleine Manschette → falsch hohe Werte am Patienten)
 *   - fehlerhafte Referenz bzw. Methodenunterschiede bei Vergleichsmessungen
 *
 * Alle Messwerte werden aus dem Zustand (state) berechnet:
 *   state.sensor: 'drifted' | 'adjusted'   (Drucksensor vor/nach Justierung)
 *   state.setup:  'own' | 'testvol'        (Prüfaufbau: eigene Manschette+Schlauch
 *                                           um Prüfzylinder oder Werkstatt-Prüfvolumen)
 *
 * Physik (Lernmodell): lineare Sensorkennlinie  Anzeige = k · p + b
 *   vorher:  k = 1,000, b = +6,2 mmHg  → +6 mmHg an allen Druckstufen
 *   nachher: k = 1,001, b = +0,3 mmHg  → Restabweichung ≤ 1 mmHg
 * Dichtheit: konstante Druckabfallrate (mmHg/min) je Prüfaufbau.
 *
 * Hinweis: Servicemenü, Diagnosedaten, Meldetexte und der Dichtheits-Grenzwert
 * sind FIKTIV (Lernmodell) und entsprechen keinem realen Hersteller. Eine
 * Justageanleitung wird bewusst NICHT beschrieben – Justierung nur nach dem
 * vom Hersteller vorgesehenen Verfahren durch befugtes Personal.
 */
(function () {
  'use strict';
  const U = MTRL.util;
  const fmt = U.fmt;

  /* ======================= Lernmodell: Parameter ======================= */
  const SETPOINTS = [0, 50, 100, 150, 200, 250]; // mmHg
  const TOL = 3; // mmHg – übliche Fehlergrenze der statischen Druckanzeige
  const SIM_TOL = 5; // mmHg – Plausibilitätsgrenze Simulatorvergleich (Beispielwert Lernmodell)
  const LEAK = { pressure: 200, duration: 60, limit: 6 }; // Beispielgrenzwert Lernmodell (mmHg/min)
  const LEAK_RATE = { own: 1.6, testvol: 0.4 }; // mmHg/min
  /** Kennlinie des Messkanals: Anzeige = gain · p + offset */
  const CAL = {
    drifted: { gain: 1.0, offset: 6.2 },
    adjusted: { gain: 1.001, offset: 0.3 },
  };
  const DEVICE = 'Blutdruckmessgerät BD-3 (Lernmodell)';

  function cal(st) {
    return CAL[st.sensor] || CAL.drifted;
  }
  /** Angezeigter Druck (ganzzahlig, wie am Gerät) für den tatsächlichen Druck p. */
  function deviceReading(p, st) {
    const c = cal(st);
    return Math.round(p * c.gain + c.offset);
  }

  function ensure(st, key) {
    if (!Array.isArray(st[key])) st[key] = [];
    return st[key];
  }

  function parseBp(s) {
    const parts = String(s || '120/80').split('/').map(Number);
    return { sys: parts[0], dia: parts[1] };
  }

  /**
   * Oszillometrische Messung (Lernmodell): Die Auswertung bestimmt SYS/DIA/MAD aus
   * dem gemessenen Manschettendruck. Der Algorithmus selbst bildet den Simulator
   * bis auf eine kleine, feste Abweichung (SYS +1 mmHg) nach. Jeder Fehler der
   * Druckmessung geht unmittelbar in alle drei Werte ein.
   */
  function measureBp(src, st) {
    const { sys, dia } = parseBp(src);
    const c = cal(st);
    const map = dia + (sys - dia) / 3;
    return {
      sys: Math.round((sys + 1) * c.gain + c.offset),
      dia: Math.round(dia * c.gain + c.offset),
      map: Math.round(map * c.gain + c.offset),
      trueMap: map,
    };
  }

  /** Manschettendruckverlauf einer Messung (Periode 30 s), so wie ihn das Gerät misst. */
  function cuffPressure(src, hr, st, tt) {
    const { sys, dia } = parseBp(src);
    const map = dia + (sys - dia) / 3;
    const pMax = sys + 30;
    const pEnd = Math.max(dia - 25, 20);
    const tc = ((tt % 30) + 30) % 30;
    let p;
    if (tc < 5) p = (pMax * tc) / 5;
    else if (tc < 23) {
      p = pMax - ((pMax - pEnd) * (tc - 5)) / 18;
      const amp = 3.5 * Math.exp(-Math.pow((p - map) / (0.55 * (sys - dia)), 2));
      p += amp * Math.max(0, Math.sin((2 * Math.PI * hr * tt) / 60));
    } else if (tc < 24) p = pEnd * (24 - tc);
    else p = 0;
    const c = cal(st);
    return p * c.gain + c.offset;
  }

  /* ======================= Geräteanzeige ======================= */
  function nibpFrame(st, src, hr, t) {
    const m = measureBp(src, st);
    return {
      waves: [
        { id: 'cuff', label: 'Manschettendruck (Gerätemessung)', color: '#f5f5f5', fn: (tt) => (cuffPressure(src, hr, st, tt) / 260) * 1.7 - 0.85 },
      ],
      values: [
        { id: 'sys', label: 'SYS', value: String(m.sys), unit: 'mmHg', color: '#f5f5f5' },
        { id: 'dia', label: 'DIA', value: String(m.dia), unit: 'mmHg', color: '#f5f5f5' },
        { id: 'map', label: 'MAD', value: String(m.map), unit: 'mmHg', color: '#cbd5e1' },
        { id: 'pr', label: 'PF', value: String(hr), unit: '/min', color: '#7CFC00', sub: 'Messdauer 26 s' },
      ],
      messages: (t % 30) < 24 ? [{ text: 'NIBP-Messung läuft …', level: 'info' }] : [{ text: 'Messung abgeschlossen', level: 'info' }],
    };
  }

  /* ======================= Fixtures ======================= */

  const setupControl = {
    id: 'setup',
    type: 'select',
    label: 'Pneumatischer Prüfaufbau',
    options: [
      { value: 'own', label: 'Eigene Manschette + Schlauch des Geräts (Manschette um Prüfzylinder)' },
      { value: 'testvol', label: 'Werkstatt-Prüfvolumen (500 ml) mit Prüfschlauch, ohne Gerätezubehör' },
    ],
    get: (ctx) => ctx.state.setup,
    set: (ctx, v) => {
      ctx.state.setup = v;
    },
  };

  function pressureFixture(verify) {
    return {
      title: verify
        ? 'Messtechnische Kontrolle nach Justierung – ' + DEVICE + ' im Service-Druckmodus, Referenzmanometer über T-Stück'
        : 'Prüfling: ' + DEVICE + ' im Service-Druckmodus (Ventile geschlossen, Pumpe aus), Referenzmanometer über T-Stück',
      unit: 'mmHg',
      max: 300,
      setpoints: SETPOINTS,
      tolerance: TOL,
      deviceLabel: 'Anzeige Manschettendruck am Blutdruckmessgerät',
      hint:
        '<b>1. Statische Druckprüfung:</b> Alle Druckstufen von 0 bis 250 mmHg anfahren (auch 0 mmHg!) und Referenz und Geräteanzeige vergleichen. Fehlergrenze ±3 mmHg – die übliche Anforderung an die Manschettendruckanzeige bei der messtechnischen Kontrolle; maßgeblich sind die geltenden Vorgaben und Herstellerangaben. ' +
        '<b>Achte auf das Muster:</b> Ist die Abweichung überall gleich (Nullpunkt) oder wächst sie mit dem Druck (Empfindlichkeit)?<br>' +
        `<b>2. Dichtheitsprüfung:</b> System auf ${LEAK.pressure} mmHg bringen und den Druckabfall über ${LEAK.duration} s beobachten (Grenze ≤ ${LEAK.limit} mmHg/min – Beispielwert im Lernmodell).` +
        (verify ? '' : '<br>Nutze die Auswahl rechts, um den Einfluss von Manschette und Schlauch auszuschließen.') +
        '<br><span class="warn-inline">⚠ Service-Druckmodus und Bedienung im Lernmodell fiktiv – real nur nach Herstellerunterlagen.</span>',
      controls: verify ? [] : [setupControl],
      deviceReading: (ref, ctx) => deviceReading(ref, ctx.state),
      leak: {
        pressure: LEAK.pressure,
        duration: LEAK.duration,
        limit: LEAK.limit,
        rate: (ctx) => LEAK_RATE[ctx.state.setup === 'testvol' ? 'testvol' : 'own'],
      },
      onResult(kind, data, ctx) {
        const st = ctx.state;
        if (verify) {
          if (!ctx.repaired || st.sensor !== 'adjusted') return;
          if (kind === 'static' && data.ok) ctx.addFinding('fc_static_ok', 'Druckmessgerät (MTK)');
          if (kind === 'leak' && data.ok) ctx.addFinding('fc_leak_ok', 'Druckmessgerät (Dichtheit)');
          return;
        }
        if (ctx.repaired || st.sensor !== 'drifted') return;
        if (kind === 'leak') {
          if (data.ok && st.setup !== 'testvol') ctx.addFinding('f_leak_ok', 'Druckmessgerät (Dichtheit)');
          return;
        }
        if (kind !== 'static') return;
        const res = data.results || {};
        if (!SETPOINTS.every((sp) => res[sp] && res[sp].dev !== null && res[sp].reached)) return;
        const devs = SETPOINTS.map((sp) => res[sp].dev);
        const lo = Math.min.apply(null, devs);
        const hi = Math.max.apply(null, devs);
        if (devs.every((d) => Math.abs(d) > TOL)) ctx.addFinding('f_static_out_of_tol', 'Druckmessgerät');
        if (res[0].dv !== 0) ctx.addFinding('f_static_zero', 'Druckmessgerät');
        if (hi - lo <= 1 && lo > TOL) {
          ctx.addFinding('f_static_constant', 'Druckmessgerät');
          const setups = ensure(st, 'staticSetups');
          const s = st.setup === 'testvol' ? 'testvol' : 'own';
          if (!setups.includes(s)) setups.push(s);
          if (setups.includes('own') && setups.includes('testvol')) ctx.addFinding('f_static_cuff_independent', 'Druckmessgerät (Tauschtest)');
        }
      },
    };
  }

  const SIM_PRESETS = [
    { label: '90/60 (Hypotonie)', settings: { nibp: '90/60', hr: 70 } },
    { label: '120/80 (normal)', settings: { nibp: '120/80', hr: 72 } },
    { label: '150/100 (Hypertonie)', settings: { nibp: '150/100', hr: 80 } },
    { label: '200/150 (stark erhöht)', settings: { nibp: '200/150', hr: 90 } },
  ];

  function simulatorFixture(verify) {
    return {
      title: verify
        ? 'Funktionsprüfung nach Justierung – ' + DEVICE + ' am NIBP-Simulator'
        : 'Prüfling: ' + DEVICE + ', Manschette um den Prüfzylinder des NIBP-Simulators',
      monitorTitle: DEVICE + ' – Ambulanz, Raum 2',
      params: ['nibp', 'hr'],
      defaults: { nibp: '120/80', hr: 72 },
      presets: SIM_PRESETS,
      hint:
        'Der NIBP-Simulator erzeugt in einem Prüfvolumen <b>definierte Druckoszillationen</b>, wie sie eine Arterie mit dem eingestellten Blutdruck erzeugen würde. Damit prüft man <b>Funktion, Messablauf und Wiederholbarkeit</b> der Messung. ' +
        `Vergleiche die Anzeige mit der Simulatorvorgabe (Plausibilitätsgrenze im Lernmodell ±${SIM_TOL} mmHg). ` +
        '<b>Grenze:</b> Ein Simulator ist kein Normal für die Genauigkeit – die Ergebnisse hängen auch vom herstellerspezifischen Algorithmus ab. Die Messgenauigkeit des Drucksensors wird mit der <b>statischen Druckprüfung</b> nachgewiesen.' +
        (verify ? ' Prüfe mindestens zwei verschiedene Blutdruckstufen.' : ''),
      controls: [],
      display: (settings, ctx, t) => nibpFrame(ctx.state, settings.nibp, settings.hr || 72, t),
      onSettings: (settings, ctx) => {
        const st = ctx.state;
        const m = measureBp(settings.nibp, st);
        const ref = parseBp(settings.nibp);
        const within = Math.abs(m.sys - ref.sys) <= SIM_TOL && Math.abs(m.dia - ref.dia) <= SIM_TOL;
        if (verify || ctx.repaired) {
          if (ctx.repaired && st.sensor === 'adjusted' && within) {
            const pts = ensure(st, 'verifySimPoints');
            if (!pts.includes(settings.nibp)) pts.push(settings.nibp);
            if (pts.length >= 2) ctx.addFinding('fc_sim_ok', 'NIBP-Simulator');
          }
          return;
        }
        if (st.sensor !== 'drifted') return;
        const pts = ensure(st, 'simPoints');
        if (!pts.includes(settings.nibp)) pts.push(settings.nibp);
        ctx.addFinding('f_sim_runs_ok', 'NIBP-Simulator');
        if (pts.length >= 2) ctx.addFinding('f_sim_high', 'NIBP-Simulator');
      },
    };
  }

  const safetyFixture = {
    title: 'Wiederholungsprüfung nach IEC 62353 – ' + DEVICE,
    deviceName: DEVICE + ', Inv.-Nr. MT-06230',
    protectionClass: 'I',
    detachableCord: true,
    appliedParts: [{ id: 'cuff', name: 'NIBP-Manschette', type: 'BF' }],
    hint: 'Laut (fiktivem) Prüfplan des Betreibers wird die elektrische Wiederholungsprüfung zusammen mit der messtechnischen Kontrolle durchgeführt. Umfang und Anlass richten sich nach Herstellervorgabe und Betreiberfestlegung; wurde das Gerät für die Justierung geöffnet, ist die Prüfung in jedem Fall angezeigt.',
    values: () => ({ visual: true, pe: 0.068, insulation: Infinity, equipmentLeakage: 42, applied: { cuff: 2.3 } }),
    onResult: (r, ctx) => {
      if (r.ok && ctx.repaired) ctx.addFinding('fc_safety_ok', 'Sicherheitsanalysator');
    },
  };

  /** Servicemenü (fiktives Lernmodell) – Werte aus dem Zustand. */
  function serviceMenu(st) {
    const zero = deviceReading(0, st);
    const ok = Math.abs(zero) <= 1;
    return (
      '<p>Schlauch am Gerät <b>abgezogen</b> – der Druckanschluss ist offen zur Atmosphäre. Damit liegt sicher kein Restdruck an.</p>' +
      '<table class="plain"><tbody>' +
      '<tr><td>Selbsttest</td><td><b>bestanden</b> (Plausibilitätsprüfung Drucksensoren: Grenze ±10 mmHg – Lernmodell)</td></tr>' +
      '<tr><td>Firmware</td><td>Prüfsumme OK</td></tr>' +
      `<tr><td>Hauptdrucksensor (Messkanal) bei Atmosphäre</td><td><b>${zero} mmHg</b> ${ok ? '(erwartet 0 ± 1 mmHg)' : '(erwartet 0 ± 1 mmHg) – <b>außerhalb</b>'}</td></tr>` +
      '<tr><td>Sicherheits-Drucksensor (Überdrucküberwachung) bei Atmosphäre</td><td><b>0 mmHg</b></td></tr>' +
      '<tr><td>Automatischer Nullabgleich</td><td>im Lernmodell nicht vorhanden – Nullpunkt aus gespeicherten Justierdaten</td></tr>' +
      '<tr><td>Letzte Justierung (Justierdaten)</td><td>vor 5 Jahren (Werksauslieferung)</td></tr>' +
      '<tr><td>Pumpe: Aufpumpzeit Prüfvolumen auf 200 mmHg</td><td>7,8 s (Vorgabe Lernmodell ≤ 10 s)</td></tr>' +
      '<tr><td>Ablassventil: Ablassrate Messphase</td><td>5,2 mmHg/s (Vorgabe Lernmodell 4–8 mmHg/s)</td></tr>' +
      '<tr><td>Schnellablass 200 → 15 mmHg</td><td>2,6 s (Vorgabe Lernmodell ≤ 5 s)</td></tr>' +
      '</tbody></table>' +
      '<p class="muted">Servicemenü-Inhalte, Grenzen und Bezeichnungen sind herstellerspezifisch; hier: fiktives Lernmodell. Das Servicemenü dient hier nur der <b>Diagnose</b> – Justierwerte werden darüber nicht verändert.</p>'
    );
  }

  /* ======================= Fallbeschreibung ======================= */

  MTRL.registerCase({
    id: 'nibp-measurement-deviation',
    deviceId: 'nibp-monitor',
    title: 'Blutdruckmessgerät misst systematisch zu hoch',
    short: 'NIBP-Messabweichung',
    difficulty: 'Fortgeschritten',
    duration: '35–50 min',
    tags: ['Messabweichung', 'Messtechnische Kontrolle', 'Nullpunktfehler', 'Abgrenzung Leckage', 'Referenzmanometer'],
    summary:
      'Bei der fälligen messtechnischen Kontrolle eines automatischen Blutdruckmessgeräts – und schon vorher im Vergleich mit manuellen Messungen der Ambulanz – fallen die Werte systematisch zu hoch aus. Liegt es an der Manschette, an einer Leckage, an der Vergleichsmethode – oder am Drucksensor? Und wenn ja: Nullpunkt- oder Verstärkungsfehler?',
    minFindingsForCauses: 8,

    situation: {
      ticket: {
        'Auftrag': 'MTK-2026-0815 (Übungsauftrag)',
        'Gerät': 'Blutdruckmessgerät BD-3, automatisch-oszillometrisch (generisches Lernmodell)',
        'Inventarnummer': 'MT-06230',
        'Standort': 'Internistische Ambulanz, Untersuchungsraum 2',
        'Anlass': 'Fällige messtechnische Kontrolle (MTK) nach MPBetreibV + Rückmeldung der Ambulanz',
        'Meldende Person': 'Medizinische Fachangestellte, Ambulanz',
        'Priorität': 'mittel – Ersatzgerät steht in der Ambulanz zur Verfügung',
        'Meldetext': '„Die Werte kommen uns seit einiger Zeit eher hoch vor. Wenn wir mit Stethoskop und Handmanometer nachmessen, liegen wir meistens ein paar mmHg drunter – oben und unten.“',
      },
      html:
        '<p>Das Gerät wurde zur turnusmäßigen <b>messtechnischen Kontrolle (MTK)</b> in die Medizintechnik gebracht. Die Ambulanz hat zusätzlich gemeldet, dass die Werte im Vergleich zu manuellen Kontrollmessungen auffällig hoch erscheinen. Mitgeliefert wurden das Gerät, der Verbindungsschlauch und drei Manschetten (Erwachsene, Erwachsene groß, Kind). Ein <b>Aufbereitungsnachweis</b> (Wischdesinfektion) liegt bei.</p>' +
        '<p>Die Medizintechnik der Klinik erfüllt im Lernmodell die Voraussetzungen der MPBetreibV für die Durchführung von MTK (Sachkenntnis, rückführbar kalibrierte Prüfmittel, Anzeige bei der zuständigen Behörde). Justierungen am Gerät darf laut Herstellerunterlagen nur <b>vom Hersteller geschultes und befugtes Personal</b> mit dem herstellerseitig vorgesehenen Verfahren vornehmen.</p>' +
        '<p>Deine Aufgabe: Messabweichung objektiv nachweisen, Ursache eingrenzen und von anderen Fehlerquellen abgrenzen, die richtige Maßnahme festlegen, Prüfungen nach der Instandsetzung durchführen, dokumentieren und freigeben.</p>',
      checklist: [
        'Aufbereitungsnachweis vorhanden? – Ja, Wischdesinfektion dokumentiert.',
        'Gerät eindeutig identifiziert (Inventarnummer, Typ, Seriennummer)? – Ja.',
        'Zubehör vollständig mitgeliefert? – Ja (Schlauch, drei Manschetten).',
        'Ersatzgerät in der Ambulanz? – Ja, die Versorgung ist gesichert.',
        'Medizinproduktebuch/Gerätedatei mit Vorbefunden der letzten MTK verfügbar? – Ja.',
      ],
    },

    symptom: {
      html:
        '<p>Die Ambulanz hat eine typische Vergleichsmessung notiert: Das Gerät zeigte bei einer Patientin <b>129/84 mmHg</b>, die unmittelbar danach am selben Arm durchgeführte <b>manuelle (auskultatorische) Messung</b> ergab <b>122/78 mmHg</b>. Ähnliche Unterschiede gab es bei mehreren Patientinnen und Patienten – systolisch <b>und</b> diastolisch, immer in dieselbe Richtung.</p>' +
        '<p>Fehlermeldungen oder Messabbrüche traten nicht auf, die Messdauer war unauffällig.</p>' +
        '<p class="muted">Achtung: Der Vergleich zweier Messmethoden am Patienten ist ein <b>Hinweis</b>, aber kein Nachweis – Blutdruck schwankt von Schlag zu Schlag, und auskultatorische und oszillometrische Messung unterscheiden sich methodisch. Den Nachweis liefert erst eine Messung mit einer rückführbar kalibrierten Referenz.</p>',
      display: (st, t) => nibpFrame(st, '122/78', 74, t),
      observations: [
        'Abweichung systolisch und diastolisch in dieselbe Richtung und in ähnlicher Größe (ca. 6–7 mmHg).',
        'Keine Fehlermeldungen, keine Messabbrüche → kein Hinweis auf eine grobe Leckage.',
        'Die Werte stammen aus Vergleichen am Patienten – sie müssen objektiv mit einer Referenz bestätigt werden.',
      ],
    },

    basics: [
      {
        title: 'Oszillometrisches Messprinzip',
        html:
          '<p>Die Manschette wird über den Systolendruck aufgepumpt und dann langsam entlüftet. Unterhalb des Systolendrucks öffnet sich die Arterie mit jedem Herzschlag kurz – in der Manschette entstehen <b>Druckoszillationen</b> von wenigen mmHg auf dem langsam fallenden Manschettendruck.</p>' +
          '<ul><li>Das <b>Maximum der Oszillationsamplituden</b> liegt beim <b>mittleren arteriellen Druck (MAD)</b>.</li>' +
          '<li><b>SYS</b> und <b>DIA</b> werden mit <b>herstellerspezifischen Algorithmen</b> (z. B. Amplitudenverhältnisse) aus der Hüllkurve abgeleitet.</li>' +
          '<li>Grobe Näherung für den MAD: <span class="formula">MAD ≈ DIA + (SYS − DIA) / 3</span></li></ul>' +
          '<p><b>Entscheidend für diesen Fall:</b> Alle Werte werden einem <b>gemessenen Manschettendruck</b> zugeordnet. Zeigt der Drucksensor zu viel an, sind SYS, DIA und MAD gleichermaßen betroffen – unabhängig vom Algorithmus.</p>',
      },
      {
        title: 'Drucksensor und Kennlinie: Nullpunkt- oder Verstärkungsfehler?',
        html:
          '<p>Ein piezoresistiver Drucksensor (Siliziummembran mit Widerstands-Messbrücke) liefert eine Spannung, die näherungsweise linear vom Druck abhängt. Mit den <b>Justierdaten</b> rechnet die Elektronik daraus den angezeigten Druck:</p>' +
          '<p class="formula">Anzeige = k · p + b &nbsp;&nbsp; (k = Empfindlichkeit/Steigung, b = Nullpunkt/Offset)</p>' +
          '<table class="plain"><thead><tr><th>Referenz</th><th>Nullpunktfehler b = +6 mmHg</th><th>Verstärkungsfehler k = 1,03</th><th>Leckage</th></tr></thead><tbody>' +
          '<tr><td>0 mmHg</td><td>+6</td><td>0</td><td>0</td></tr>' +
          '<tr><td>50 mmHg</td><td>+6</td><td>+1,5</td><td>0</td></tr>' +
          '<tr><td>150 mmHg</td><td>+6</td><td>+4,5</td><td>0</td></tr>' +
          '<tr><td>250 mmHg</td><td>+6</td><td>+7,5</td><td>0</td></tr>' +
          '<tr><td>Dichtheitsprüfung</td><td>i. O.</td><td>i. O.</td><td><b>Druckabfall zu groß</b></td></tr>' +
          '</tbody></table>' +
          '<p>Merke: Ein <b>Nullpunktfehler</b> verschiebt die Kennlinie parallel – die Abweichung ist <b>konstant</b> und schon bei 0 mmHg sichtbar. Ein <b>Verstärkungsfehler</b> verändert die Steigung – die Abweichung wächst <b>proportional</b> mit dem Druck. Eine <b>Leckage</b> verfälscht die statische Anzeige nicht (Referenz und Gerät messen denselben Druck), sondern zeigt sich beim <b>Druckabfall</b>. Bei piezoresistiven Drucksensoren ist eine langsame <b>Nullpunktdrift</b> über die Jahre eine typische Langzeitveränderung.</p>' +
          '<p class="muted">Werte in der Tabelle: Beispiele im Lernmodell.</p>',
      },
      {
        title: 'Kalibrieren, Justieren, Kontrollieren – drei verschiedene Dinge',
        html:
          '<ul><li><b>Kalibrieren:</b> Unter festgelegten Bedingungen die Abweichung zwischen Anzeige und rückführbarer Referenz <b>ermitteln und dokumentieren</b> – <i>ohne</i> Eingriff in das Gerät.</li>' +
          '<li><b>Justieren:</b> Das Gerät so <b>einstellen bzw. abgleichen</b>, dass die Abweichung möglichst klein wird (z. B. neue Justierdaten für Nullpunkt und Empfindlichkeit). Das ist ein <b>Eingriff</b> und erfolgt nur nach dem Verfahren des Herstellers durch befugtes Personal.</li>' +
          '<li><b>Messtechnische Kontrolle (MTK):</b> Gesetzlich vorgesehene Prüfung, ob das Medizinprodukt die <b>Fehlergrenzen einhält</b>. Die MTK selbst ist eine Kontrolle, keine Reparatur: Werden die Fehlergrenzen überschritten, muss das Gerät instand gesetzt (z. B. justiert) und danach erneut kontrolliert werden.</li></ul>' +
          '<p><b>Rückführbarkeit:</b> Das Referenzmanometer muss über eine ununterbrochene Kette von Kalibrierungen auf nationale Normale zurückgeführt sein (Kalibrierschein, gültige Frist). Seine Messunsicherheit muss <b>deutlich kleiner</b> sein als die zu prüfende Fehlergrenze.</p>',
      },
      {
        title: 'MTK nach MPBetreibV (Überblick)',
        html:
          '<ul><li>Medizinprodukte zur <b>nichtinvasiven Blutdruckmessung</b> sind in <b>Anlage 2 der MPBetreibV</b> aufgeführt; für sie sind messtechnische Kontrollen vorgesehen.</li>' +
          '<li><b>Fristen:</b> nach Angabe des Herstellers; gibt der Hersteller keine an, gelten die in Anlage 2 genannten Fristen.</li>' +
          '<li>Eine MTK ist sinngemäß auch dann <b>unverzüglich</b> durchzuführen, wenn Anzeichen bestehen, dass die Fehlergrenzen nicht eingehalten werden, oder wenn die messtechnischen Eigenschaften durch einen <b>Eingriff</b> (z. B. Justierung, Modultausch) beeinflusst worden sein könnten.</li>' +
          '<li><b>Wer?</b> Die zuständige Behörde oder Personen, die die Anforderungen der Verordnung erfüllen (u. a. Sachkenntnis, geeignete rückführbare Messeinrichtungen) und ihre Tätigkeit der Behörde angezeigt haben.</li>' +
          '<li><b>Dokumentation und Kennzeichnung:</b> Ergebnis im Medizinproduktebuch dokumentieren; das Gerät wird mit einem Zeichen gekennzeichnet, aus dem das Jahr der nächsten MTK und die durchführende Stelle hervorgehen.</li>' +
          '<li><b>Inhalt</b> bei Blutdruckmessgeräten typischerweise: Prüfung der Manschettendruckanzeige bei mehreren statischen Druckstufen (übliche Fehlergrenze ±3 mmHg) und Dichtheitsprüfung. Für die praktische Durchführung gibt es Leitfäden (z. B. der Physikalisch-Technischen Bundesanstalt) – maßgeblich ist die jeweils aktuelle Fassung.</li></ul>' +
          '<p class="muted">Dies ist eine vereinfachte Lernübersicht. Verbindlich sind der aktuelle Wortlaut der MPBetreibV, die Vorgaben der zuständigen Behörden und die Herstellerangaben.</p>',
      },
      {
        title: 'Systematische Fehlersuche bei Messabweichungen',
        html:
          '<ol><li><b>Referenz prüfen:</b> Ist das eigene Prüfmittel gültig kalibriert und plausibel? Sonst sucht man den Fehler am falschen Gerät.</li>' +
          '<li><b>Objektiv messen:</b> Statische Druckprüfung über den gesamten Bereich – <b>einschließlich 0 mmHg</b>.</li>' +
          '<li><b>Abweichungsmuster auswerten:</b> konstant (Nullpunkt), proportional (Empfindlichkeit), unregelmäßig (Instabilität, Leck, Ventile).</li>' +
          '<li><b>Dichtheit</b> getrennt prüfen.</li>' +
          '<li><b>Einflüsse ausschließen:</b> Zubehör (Tausch gegen Prüfvolumen), Anwendung (Manschettengröße, Lagerung), Vergleichsmethode.</li>' +
          '<li><b>Ursache lokalisieren</b> (z. B. Diagnosedaten, Vergleich mit dem unabhängigen Sicherheitssensor, Trend im Protokoll).</li>' +
          '<li>Erst dann die Maßnahme festlegen – kein Tausch auf Verdacht, keine „Korrektur“ an falscher Stelle.</li></ol>',
      },
    ],

    findings: [
      { id: 'f_user_high_both', text: 'Ambulanz: Gerät zeigt im Vergleich zur manuellen Messung systolisch und diastolisch ca. 5–8 mmHg mehr, bei verschiedenen Patienten', cat: 'Anamnese' },
      { id: 'f_user_no_errors', text: 'Ambulanz: keine Fehlermeldungen, keine Messabbrüche, Messdauer unauffällig', cat: 'Anamnese' },
      { id: 'f_user_cuffs', text: 'Ambulanz: Abweichung mit verschiedenen Manschettengrößen beobachtet', cat: 'Anamnese' },
      { id: 'f_visual_cuff_ok', text: 'Sichtprüfung: Manschetten, Schlauch und Kupplungen ohne Beschädigung, O-Ringe intakt', cat: 'Sichtprüfung' },
      { id: 'f_visual_housing_ok', text: 'Sichtprüfung: Gehäuse, Anzeige, Netzkabel ohne Befund', cat: 'Sichtprüfung' },
      { id: 'f_mtk_due', text: 'Kennzeichnung/Medizinproduktebuch: MTK fällig; letzte MTK vor 2 Jahren bestanden (damals +2 mmHg)', cat: 'Sichtprüfung' },
      { id: 'f_application_ok', text: 'Anwendung i. O.: Manschettengröße passend zum Armumfang (Bereichsmarkierung), Arm auf Herzhöhe, Patient sitzend und ruhig', cat: 'Funktion' },
      { id: 'f_ref_valid', text: 'Prüfmittel: Referenzmanometer rückführbar kalibriert, Kalibrierfrist gültig, Nullpunkt bei Atmosphäre 0,0 mmHg', cat: 'Prüfmittel' },
      { id: 'f_service_selftest_ok', text: 'Servicemenü: Selbsttest bestanden, Firmware-Prüfsumme OK', cat: 'Servicemenü' },
      { id: 'f_service_zero', text: 'Servicemenü: Hauptdrucksensor zeigt bei offenem Anschluss (Atmosphäre) +6 mmHg statt 0', cat: 'Servicemenü' },
      { id: 'f_service_safety_zero', text: 'Servicemenü: unabhängiger Sicherheits-Drucksensor zeigt bei Atmosphäre korrekt 0 mmHg', cat: 'Servicemenü' },
      { id: 'f_service_valves_ok', text: 'Servicemenü: Aufpumpzeit, Ablassrate und Schnellablass innerhalb der Vorgaben', cat: 'Servicemenü' },
      { id: 'f_log_drift_trend', text: 'Protokoll: Nullpunkt-Rohwert des Hauptsensors steigt seit Jahren langsam an (+1 → +6 mmHg)', cat: 'Protokoll' },
      { id: 'f_log_no_errors', text: 'Protokoll: keine Leck-, Überdruck- oder Pumpenmeldungen', cat: 'Protokoll' },
      { id: 'f_static_out_of_tol', text: 'Statische Druckprüfung: an allen Druckstufen Abweichung > ±3 mmHg (Fehlergrenze überschritten)', cat: 'Messung' },
      { id: 'f_static_constant', text: 'Statische Druckprüfung: Abweichung konstant ca. +6 mmHg von 0 bis 250 mmHg (wächst nicht mit dem Druck)', cat: 'Messung' },
      { id: 'f_static_zero', text: 'Statische Druckprüfung: Gerät zeigt bereits bei 0 mmHg Referenzdruck 6 mmHg an', cat: 'Messung' },
      { id: 'f_static_cuff_independent', text: 'Tauschtest: mit Werkstatt-Prüfvolumen statt eigener Manschette/Schlauch identische Abweichung', cat: 'Tauschtest' },
      { id: 'f_leak_ok', text: 'Dichtheitsprüfung mit Original-Manschette und Schlauch: 1,6 mmHg/min – dicht', cat: 'Messung' },
      { id: 'f_sim_runs_ok', text: 'NIBP-Simulator: Messablauf normal (Aufpumpen, Ablassen, Messdauer), keine Meldungen', cat: 'Simulator' },
      { id: 'f_sim_high', text: 'NIBP-Simulator: bei allen Blutdruckstufen SYS, DIA und MAD um ca. 6–7 mmHg zu hoch', cat: 'Simulator' },
      { id: 'fc_static_ok', text: 'MTK nach Justierung: statische Druckprüfung an allen Stufen innerhalb ±3 mmHg', cat: 'Freigabe' },
      { id: 'fc_leak_ok', text: 'MTK nach Justierung: Dichtheitsprüfung bestanden', cat: 'Freigabe' },
      { id: 'fc_sim_ok', text: 'Funktionsprüfung mit NIBP-Simulator an ≥ 2 Blutdruckstufen plausibel', cat: 'Freigabe' },
      { id: 'fc_safety_ok', text: 'Elektrische Sicherheit nach IEC 62353: bestanden', cat: 'Freigabe' },
      { id: 'fc_final_ok', text: 'Abschluss: Schutzfunktionen nach Herstellerverfahren geprüft, MTK-Kennzeichnung und Dokumentation erledigt', cat: 'Freigabe' },
    ],

    investigations: [
      {
        id: 'inv_interview',
        type: 'action',
        category: 'Anamnese',
        icon: '💬',
        title: 'Rücksprache mit der Ambulanz',
        minutes: 3,
        desc: 'Wie wurde verglichen? Seit wann? Welche Manschetten? Gab es Meldungen?',
        run: () => ({
          html:
            '<p><b>Medizinische Fachangestellte:</b> „Uns ist das vor ein paar Monaten aufgefallen. Wenn ein Wert grenzwertig war, haben wir manuell nachgemessen – mit Stethoskop und unserem Handmanometer. Das Gerät lag fast immer höher, oben und unten so um 5 bis 8 mmHg. Das war bei ganz verschiedenen Patienten so, mit der normalen und mit der großen Manschette.“</p>' +
            '<p><b>Frage:</b> Gab es Fehlermeldungen oder Abbrüche? – „Nein, das Gerät misst ganz normal, auch nicht länger als sonst.“</p>' +
            '<p class="muted">Bewertung: Die Angaben sind wertvolle Hinweise. Aber: Auch das Handmanometer der Station müsste geprüft sein, und Vergleiche am Patienten streuen methodisch.</p>',
          findings: ['f_user_high_both', 'f_user_no_errors', 'f_user_cuffs'],
        }),
      },
      {
        id: 'inv_visual',
        type: 'action',
        category: 'Sichtprüfung',
        icon: '🔍',
        title: 'Sichtprüfung von Gerät, Zubehör und Kennzeichnung',
        minutes: 5,
        desc: 'Gehäuse, Anzeige, Netzkabel, Manschetten, Schlauch, Kupplungen, Prüfplakette und Medizinproduktebuch.',
        run: () => ({
          html:
            '<ul><li>Gehäuse, Anzeige, Bedienelemente und Netzkabel: <b>ohne Befund</b>.</li>' +
            '<li>Manschetten (3 Größen): Blasen und Klettverschlüsse intakt, Bereichsmarkierungen gut lesbar.</li>' +
            '<li>Schlauch und Kupplungen: keine Risse oder Knicke, O-Ringe elastisch und unbeschädigt.</li>' +
            '<li><b>Kennzeichnung:</b> MTK-Zeichen weist die Kontrolle für dieses Jahr als fällig aus. Laut Medizinproduktebuch wurde die letzte MTK vor 2 Jahren <b>bestanden</b>; die größte Abweichung betrug damals +2 mmHg.</li></ul>',
          findings: ['f_visual_cuff_ok', 'f_visual_housing_ok', 'f_mtk_due'],
        }),
      },
      {
        id: 'inv_application',
        type: 'action',
        category: 'Funktion',
        icon: '💪',
        title: 'Anwendung und Manschettenwahl überprüfen',
        minutes: 4,
        desc: 'Manschettengröße, Lagerung, Messbedingungen in der Ambulanz nachvollziehen.',
        run: () => ({
          html:
            '<p>Gemeinsam mit der Ambulanz wird der Ablauf nachgestellt: Armumfang der typischen Patientinnen und Patienten gemessen und mit der <b>Bereichsmarkierung</b> der Manschetten verglichen – <b>passend</b>. Manschette auf Herzhöhe, Patient sitzt angelehnt, Arm aufgelegt, keine Gespräche während der Messung. Die Indexmarke liegt über der Arterie.</p>' +
            '<p>Eine <b>zu kleine Manschette</b> hätte falsch hohe Werte erklärt – das ist hier <b>nicht</b> der Fall.</p>',
          findings: ['f_application_ok'],
        }),
      },
      {
        id: 'inv_reference',
        type: 'action',
        category: 'Prüfmittel',
        icon: '📏',
        title: 'Prüfmittel kontrollieren (Referenzmanometer)',
        minutes: 3,
        desc: 'Kalibrierstatus, Rückführbarkeit und Nullpunkt des eigenen Referenzmanometers prüfen.',
        run: () => ({
          html:
            '<table class="plain"><tbody>' +
            '<tr><td>Referenzmanometer</td><td>Werkstatt-Prüfmittel Nr. PM-12 (Lernmodell)</td></tr>' +
            '<tr><td>Kalibrierschein</td><td>akkreditiertes Kalibrierlaboratorium, rückführbar; <b>Frist gültig</b></td></tr>' +
            '<tr><td>Messunsicherheit laut Kalibrierschein</td><td>≤ 0,3 mmHg im Bereich 0–300 mmHg (deutlich kleiner als die Fehlergrenze ±3 mmHg)</td></tr>' +
            '<tr><td>Nullpunktkontrolle bei Atmosphäre</td><td><b>0,0 mmHg</b></td></tr>' +
            '<tr><td>Plausibilitätsvergleich mit zweitem Werkstattmanometer bei 150 mmHg</td><td>Differenz 0,2 mmHg</td></tr>' +
            '</tbody></table><p>Die Referenz ist geeignet. Erst jetzt ist ein Vergleich mit dem Prüfling aussagekräftig.</p>',
          findings: ['f_ref_valid'],
        }),
      },
      {
        id: 'inv_service',
        type: 'action',
        category: 'Servicemenü',
        icon: '🛠️',
        title: 'Selbsttest & Servicemenü (Diagnosedaten)',
        minutes: 5,
        desc: 'Selbsttest, Sensorwerte bei Atmosphärendruck, Pumpen- und Ventildaten ansehen (nur lesen).',
        run: (ctx) => ({
          html: serviceMenu(ctx.state),
          findings: ctx.state.sensor === 'drifted' ? ['f_service_selftest_ok', 'f_service_zero', 'f_service_safety_zero', 'f_service_valves_ok'] : ['f_service_selftest_ok', 'f_service_safety_zero', 'f_service_valves_ok'],
        }),
      },
      {
        id: 'inv_log',
        type: 'action',
        category: 'Protokoll',
        icon: '📜',
        title: 'Ereignis- und Diagnoseprotokoll auslesen',
        minutes: 4,
        desc: 'Technische Meldungen und gespeicherte Nullpunkt-Rohwerte der Selbsttests auswerten.',
        run: () => ({
          html:
            '<p>Das Gerät speichert (im Lernmodell) beim monatlichen Selbsttest den Rohwert des Hauptdrucksensors bei Atmosphärendruck:</p>' +
            '<table class="plain mono"><thead><tr><th>Zeitpunkt</th><th>Nullpunkt-Rohwert Hauptsensor</th><th>Sicherheitssensor</th></tr></thead><tbody>' +
            '<tr><td>vor 5 Jahren (Auslieferung)</td><td>0 mmHg</td><td>0 mmHg</td></tr>' +
            '<tr><td>vor 4 Jahren</td><td>+1 mmHg</td><td>0 mmHg</td></tr>' +
            '<tr><td>vor 2 Jahren (letzte MTK)</td><td>+2 mmHg</td><td>0 mmHg</td></tr>' +
            '<tr><td>vor 1 Jahr</td><td>+4 mmHg</td><td>0 mmHg</td></tr>' +
            '<tr><td>vor 6 Monaten</td><td>+5 mmHg</td><td>0 mmHg</td></tr>' +
            '<tr><td>letzter Monat</td><td>+6 mmHg</td><td>0 mmHg</td></tr>' +
            '</tbody></table>' +
            '<p>Der Selbsttest bewertet nur die Plausibilität (Grenze ±10 mmHg im Lernmodell) und war deshalb immer „bestanden“. Ereignisse: <b>keine</b> Leck-, Überdruck-, Pumpen- oder Ventilmeldungen.</p>' +
            '<p class="muted">Diagnosedaten und Protokollinhalte sind herstellerspezifisch; hier: fiktives Lernmodell.</p>',
          findings: ['f_log_drift_trend', 'f_log_no_errors'],
        }),
      },
      {
        id: 'inv_pressure',
        type: 'instrument',
        instrument: 'pressure-meter',
        category: 'Messung',
        icon: '⏲',
        title: 'Statische Druckprüfung und Dichtheitsprüfung (Referenzmanometer)',
        minutes: 15,
        desc: 'Kern der MTK: Druckstufen 0–250 mmHg vergleichen, Abweichungsmuster auswerten, Dichtheit prüfen – mit eigenem Zubehör und mit Werkstatt-Prüfvolumen.',
        fixture: () => pressureFixture(false),
      },
      {
        id: 'inv_sim',
        type: 'instrument',
        instrument: 'patient-simulator',
        category: 'Simulator',
        icon: '🫀',
        title: 'Funktionsprüfung mit NIBP-Simulator',
        minutes: 8,
        desc: 'Mehrere Blutdruckstufen simulieren und Anzeige, Messablauf und Meldungen beurteilen.',
        fixture: () => simulatorFixture(false),
      },
      /* ---------- Prüfungen nach der Instandsetzung ---------- */
      {
        id: 'inv_verify_pressure',
        type: 'instrument',
        instrument: 'pressure-meter',
        phase: 'verify',
        category: 'Freigabe',
        icon: '✅',
        title: 'Erneute MTK: statische Druckprüfung und Dichtheit',
        minutes: 15,
        desc: 'Nach dem Eingriff alle Druckstufen und die Dichtheit erneut prüfen.',
        fixture: () => pressureFixture(true),
      },
      {
        id: 'inv_verify_sim',
        type: 'instrument',
        instrument: 'patient-simulator',
        phase: 'verify',
        category: 'Freigabe',
        icon: '🫀',
        title: 'Funktionsprüfung mit NIBP-Simulator nach Justierung',
        minutes: 8,
        desc: 'Mindestens zwei Blutdruckstufen prüfen.',
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
        title: 'Schutzfunktionen, Kennzeichnung und Abschluss',
        minutes: 6,
        desc: 'Überdruckabschaltung/Messzeitbegrenzung nach Herstellerverfahren, MTK-Kennzeichnung, Medizinproduktebuch, Probemessung.',
        run: (ctx) => {
          if (ctx.state.sensor !== 'adjusted') return { html: '<p>Bitte zuerst die Instandsetzung durchführen.</p>', findings: [] };
          return {
            html:
              '<ul><li><b>Überdruckabschaltung und Messzeitbegrenzung</b> wurden mit dem vom Hersteller vorgeschriebenen Prüfverfahren geprüft: <b>bestanden</b> (Lernmodell – das konkrete Verfahren steht ausschließlich in den Herstellerunterlagen).</li>' +
              '<li>Servicemenü: Hauptdrucksensor bei Atmosphäre <b>0 mmHg</b>, Sicherheitssensor 0 mmHg.</li>' +
              '<li>Probemessung an einer Kollegin mit passender Manschette: 121/79 mmHg, unmittelbar folgende manuelle Messung 120/78 mmHg – plausibel.</li>' +
              '<li>MTK-Ergebnis im <b>Medizinproduktebuch</b> dokumentiert, Gerät mit dem <b>MTK-Zeichen</b> (Jahr der nächsten MTK, durchführende Stelle) gekennzeichnet, Prüfstatus in der Gerätedatei aktualisiert.</li></ul>',
            findings: ['fc_final_ok'],
          };
        },
      },
    ],

    hypotheses: [
      { id: 'h_offset', text: 'Nullpunktfehler (Offset) des Drucksensors im Messkanal', expected: 'confirmed', evidence: ['f_static_constant', 'f_static_zero', 'f_service_zero'], explain: 'Die Abweichung ist an allen Druckstufen gleich groß und bereits bei 0 mmHg vorhanden; bei offenem Anschluss zeigt der Hauptsensor +6 mmHg. Das ist das typische Bild eines Nullpunktfehlers.' },
      { id: 'h_gain', text: 'Verstärkungs-/Empfindlichkeitsfehler des Drucksensors', expected: 'excluded', evidence: ['f_static_constant', 'f_static_zero'], explain: 'Ein Verstärkungsfehler würde bei 0 mmHg keine Abweichung zeigen und mit dem Druck proportional zunehmen. Gemessen wurde eine konstante Abweichung.' },
      { id: 'h_leak', text: 'Undichtigkeit im pneumatischen System (Manschette, Schlauch, Kupplung, Ventil)', expected: 'excluded', evidence: ['f_leak_ok', 'f_log_no_errors'], explain: 'Die Dichtheitsprüfung ist bestanden, und es gibt keine Leckmeldungen. Eine Leckage würde die statische Druckanzeige zudem nicht verschieben.' },
      { id: 'h_cuff', text: 'Falsche Manschettengröße oder defektes Zubehör', expected: 'excluded', evidence: ['f_application_ok', 'f_static_cuff_independent'], explain: 'Die Manschetten passen zum Armumfang, und mit dem Werkstatt-Prüfvolumen (ohne Gerätezubehör) bleibt die Abweichung identisch.' },
      { id: 'h_reference', text: 'Fehlerhafte Referenz (eigenes Prüfmittel)', expected: 'excluded', evidence: ['f_ref_valid'], explain: 'Das Referenzmanometer ist gültig rückführbar kalibriert, zeigt bei Atmosphäre 0,0 mmHg und stimmt mit einem zweiten Manometer überein.' },
      { id: 'h_method', text: 'Kein Gerätefehler – nur Methodenunterschied/Streuung bei der Vergleichsmessung am Patienten', expected: 'excluded', evidence: ['f_static_out_of_tol', 'f_sim_high'], explain: 'Die statische Druckprüfung mit Referenz – ganz ohne Patient und ohne Algorithmus – zeigt eine Überschreitung der Fehlergrenze. Die Abweichung ist also real und gerätebedingt.' },
      { id: 'h_algorithm', text: 'Fehler im oszillometrischen Auswertealgorithmus bzw. in der Software', expected: 'excluded', evidence: ['f_static_out_of_tol', 'f_service_selftest_ok'], explain: 'Schon die reine Druckanzeige im Service-Druckmodus weicht ab – dort ist der Algorithmus nicht beteiligt. Firmware-Prüfsumme und Selbsttest sind in Ordnung.' },
      { id: 'h_pneumatics', text: 'Pumpe oder Ablassventil verschlissen (Restdruck, falsche Ablassrate)', expected: 'excluded', evidence: ['f_service_valves_ok', 'f_service_zero'], explain: 'Aufpumpzeit und Ablassraten liegen innerhalb der Vorgaben. Der Sensor zeigt +6 mmHg sogar bei abgezogenem Schlauch und offenem Anschluss – ein Restdruck ist damit ausgeschlossen.' },
    ],

    diagnosis: {
      tree: {
        start: 'n_reference',
        nodes: {
          n_reference: {
            question: 'Ist die eigene Referenz für die Prüfung geeignet?',
            answers: [
              { label: 'Ja – rückführbar kalibriert, Frist gültig, Nullpunkt und Plausibilitätsvergleich i. O.', correct: true, requires: ['f_ref_valid'], next: 'n_static', feedback: 'Richtig: Erst mit einer geprüften Referenz sind die folgenden Vergleichsmessungen aussagekräftig.' },
              { label: 'Nicht nötig – das Werkstattmanometer stimmt immer', correct: false, feedback: 'Auch Prüfmittel driften. Ohne gültige Kalibrierung und Plausibilitätskontrolle ist jede Aussage über den Prüfling unsicher.' },
            ],
          },
          n_static: {
            question: 'Hält das Gerät bei der statischen Druckprüfung die Fehlergrenze von ±3 mmHg ein?',
            answers: [
              { label: 'Nein – an allen Druckstufen außerhalb der Fehlergrenze', correct: true, requires: ['f_static_out_of_tol'], next: 'n_leak', feedback: 'Richtig: Die Messabweichung ist objektiv nachgewiesen – unabhängig von Patient und Vergleichsmethode.' },
              { label: 'Ja – alle Stufen innerhalb ±3 mmHg', correct: false, feedback: 'Sieh dir die Tabelle der statischen Druckprüfung noch einmal an: Die Abweichung beträgt an jeder Stufe etwa +6 mmHg.' },
            ],
          },
          n_leak: {
            question: 'Ist das pneumatische System dicht?',
            answers: [
              { label: 'Ja – Druckabfall deutlich unter dem Grenzwert', correct: true, requires: ['f_leak_ok'], next: 'n_pattern', feedback: 'Richtig: Eine Leckage ist ausgeschlossen. Sie hätte die statische Anzeige ohnehin nicht verschoben.' },
              { label: 'Nein – das System ist undicht', correct: false, feedback: 'Die Dichtheitsprüfung mit Original-Manschette und Schlauch ergab nur 1,6 mmHg/min.' },
            ],
          },
          n_pattern: {
            question: 'Wie verhält sich die Abweichung über die Druckstufen?',
            answers: [
              { label: 'Konstant ca. +6 mmHg, auch schon bei 0 mmHg → Nullpunktfehler', correct: true, requires: ['f_static_constant', 'f_static_zero'], next: 'n_accessory', feedback: 'Richtig: Die Kennlinie ist parallel verschoben – typisch für einen Nullpunktfehler (Offset).' },
              { label: 'Wächst proportional mit dem Druck → Verstärkungsfehler', correct: false, feedback: 'Bei einem Verstärkungsfehler wäre die Abweichung bei 0 mmHg null und bei 250 mmHg am größten. Gemessen wurde überall +6 mmHg.' },
              { label: 'Unregelmäßig, nicht reproduzierbar', correct: false, feedback: 'Die Abweichung war an allen Stufen reproduzierbar gleich groß.' },
            ],
          },
          n_accessory: {
            question: 'Hängt die Abweichung vom Zubehör (Manschette, Schlauch) ab?',
            answers: [
              { label: 'Nein – mit Werkstatt-Prüfvolumen identische Abweichung', correct: true, requires: ['f_static_cuff_independent'], next: 'n_locate', feedback: 'Richtig: Der Fehler liegt im Gerät selbst, nicht im Zubehör.' },
              { label: 'Ja – mit Prüfvolumen verschwindet die Abweichung', correct: false, feedback: 'Der Tauschtest mit dem Werkstatt-Prüfvolumen zeigte dieselbe Abweichung.' },
            ],
          },
          n_locate: {
            question: 'Wo entsteht der Nullpunktfehler?',
            answers: [
              { label: 'Im Hauptdrucksensor (Messkanal): +6 mmHg bei offenem Anschluss, Sicherheitssensor 0 mmHg', correct: true, requires: ['f_service_zero', 'f_service_safety_zero'], feedback: 'Richtig: Der unabhängige Sicherheitssensor sieht bei Atmosphäre 0 mmHg, der Messkanal +6 mmHg. Der Protokolltrend zeigt eine langsame Drift über Jahre.' },
              { label: 'Restdruck im System, weil das Ablassventil nicht vollständig öffnet', correct: false, feedback: 'Bei abgezogenem Schlauch und offenem Anschluss kann kein Restdruck anliegen – trotzdem zeigt der Hauptsensor +6 mmHg.' },
              { label: 'Im oszillometrischen Algorithmus', correct: false, feedback: 'Im Service-Druckmodus wird der Algorithmus nicht verwendet, die Anzeige weicht trotzdem ab.' },
            ],
          },
        },
      },
      rootCauses: [
        { id: 'rc_zero_drift', correct: true, text: 'Nullpunktdrift des Hauptdrucksensors im NIBP-Messmodul um ca. +6 mmHg (Langzeitdrift, Empfindlichkeit unverändert) – Fehlergrenze ±3 mmHg überschritten', feedback: 'Korrekt. Die Ursache ist durch statische Druckprüfung (konstantes Muster, Abweichung bei 0 mmHg), Tauschtest mit Prüfvolumen, Sensorvergleich und Protokolltrend belegt.' },
        { id: 'rc_gain', correct: false, text: 'Verstärkungsfehler (Empfindlichkeit +3 %) des Drucksensors', feedback: 'Nein: Die Abweichung wächst nicht mit dem Druck und ist schon bei 0 mmHg vorhanden.' },
        { id: 'rc_leak', correct: false, text: 'Undichte Schlauchkupplung', feedback: 'Nein: Dichtheitsprüfung bestanden; eine Leckage verschiebt die statische Anzeige nicht.' },
        { id: 'rc_cuff_small', correct: false, text: 'Zu kleine Manschette in der Ambulanz', feedback: 'Nein: Manschetten passend, und die Abweichung tritt auch ohne Manschette am Prüfvolumen auf.' },
        { id: 'rc_algorithm', correct: false, text: 'Fehlerhafter Auswertealgorithmus nach Firmware-Fehler', feedback: 'Nein: Schon die reine Druckanzeige weicht ab; Firmware-Prüfsumme in Ordnung.' },
        { id: 'rc_reference', correct: false, text: 'Das Handmanometer der Ambulanz zeigt zu wenig an', feedback: 'Nein: Die Abweichung des Geräts wurde mit dem eigenen, rückführbar kalibrierten Referenzmanometer nachgewiesen.' },
        { id: 'rc_valve', correct: false, text: 'Ablassventil öffnet nicht vollständig (Restdruck)', feedback: 'Nein: Auch bei abgezogenem Schlauch zeigt der Sensor +6 mmHg; Ventildaten in Ordnung.' },
      ],
      repairActions: [
        { id: 'ra_adjust', verdict: 'correct', completes: true, minutes: 45, text: 'Gerät außer Betrieb lassen und den Drucksensor ausschließlich nach dem herstellerseitig vorgesehenen Verfahren durch befugtes, vom Hersteller geschultes Personal mit rückführbar kalibriertem Referenzmanometer justieren lassen – ist das nicht möglich: NIBP-Modul nach Herstellervorgabe tauschen bzw. Gerät zum Hersteller einsenden', feedback: 'Richtig: Die Justierung ist ein Eingriff in die messtechnischen Eigenschaften und gehört in die Hände befugten Personals mit dem Herstellerverfahren. Danach ist eine erneute MTK erforderlich.', apply: (st) => { st.sensor = 'adjusted'; st.setup = 'own'; } },
        { id: 'ra_tag', verdict: 'good', minutes: 2, text: 'Gerät bis zur Instandsetzung als „gesperrt – MTK nicht bestanden“ kennzeichnen und nicht an die Ambulanz zurückgeben', feedback: 'Gut: Ein Gerät, das die Fehlergrenzen nicht einhält, darf nicht weiter angewendet werden.' },
        { id: 'ra_inform', verdict: 'good', minutes: 5, text: 'Betreiber bzw. zuständige Person (z. B. Medizinprodukteverantwortliche) und Ambulanz über die nachgewiesene systematische Abweichung informieren, damit die Bedeutung für zurückliegende Messungen bewertet werden kann', feedback: 'Gut: Die Bewertung, ob zurückliegende Messungen klinisch relevant beeinflusst wurden (und ob weitere Pflichten bestehen), ist nicht Aufgabe der Werkstatt allein.' },
        { id: 'ra_self_offset', verdict: 'wrong', minutes: 10, text: 'Im Servicemenü den Nullpunkt-Korrekturwert eigenmächtig um −6 mmHg ändern', feedback: 'Nicht zulässig: Eine Justierung ohne Herstellerverfahren, Berechtigung und dokumentierte Referenzkette ist ein nicht bestimmungsgemäßer Eingriff – die Messrichtigkeit wäre nicht nachgewiesen.' },
        { id: 'ra_subtract', verdict: 'wrong', minutes: 2, text: 'Ambulanz anweisen, von allen Messwerten 6 mmHg abzuziehen', feedback: 'Nicht zulässig: Das Gerät hält die Fehlergrenzen nicht ein und darf so nicht angewendet werden. „Korrekturtabellen“ für Anwender sind fehleranfällig und keine Instandsetzung.' },
        { id: 'ra_accept', verdict: 'wrong', minutes: 1, text: 'MTK als bestanden werten – 6 mmHg sind klinisch unbedeutend', feedback: 'Falsch: Die Fehlergrenze ist verbindlich. Systematisch zu hohe Werte können z. B. zu unnötiger Therapie führen.' },
        { id: 'ra_cuffs', verdict: 'wrong', minutes: 5, text: 'Alle Manschetten und den Schlauch vorsorglich erneuern', feedback: 'Tausch auf Verdacht: Zubehör ist dicht und nachweislich nicht ursächlich (Prüfvolumen-Test).' },
        { id: 'ra_pump', verdict: 'wrong', minutes: 40, text: 'Pumpe und Ablassventil tauschen', feedback: 'Tausch auf Verdacht: Pumpen- und Ventildaten sind in Ordnung, die Pneumatik ist nicht ursächlich.' },
        { id: 'ra_oring', verdict: 'neutral', minutes: 3, text: 'O-Ringe der Kupplungen vorsorglich erneuern', feedback: 'Nicht erforderlich: Die Dichtheitsprüfung war in Ordnung. Schadet nicht, behebt aber nicht die Ursache.' },
      ],
      functionChecks: [
        { id: 'fc_static', title: 'Erneute MTK: statische Druckprüfung 0–250 mmHg (±3 mmHg)', passFinding: 'fc_static_ok', investigation: 'inv_verify_pressure' },
        { id: 'fc_leak', title: 'Erneute MTK: Dichtheitsprüfung', passFinding: 'fc_leak_ok', investigation: 'inv_verify_pressure' },
        { id: 'fc_sim', title: 'Funktionsprüfung mit NIBP-Simulator (≥ 2 Stufen)', passFinding: 'fc_sim_ok', investigation: 'inv_verify_sim' },
        { id: 'fc_safety', title: 'Elektrische Sicherheitsprüfung nach IEC 62353', passFinding: 'fc_safety_ok', investigation: 'inv_verify_safety' },
        { id: 'fc_final', title: 'Schutzfunktionen, Kennzeichnung, Dokumentation, Probemessung', passFinding: 'fc_final_ok', investigation: 'inv_verify_final' },
      ],
    },

    explanation: {
      html:
        '<h3>Was ist passiert?</h3>' +
        '<p>Der <b>Hauptdrucksensor</b> des NIBP-Messmoduls ist über die Jahre langsam <b>im Nullpunkt gedriftet</b> – von 0 auf etwa +6 mmHg. Seine Empfindlichkeit (Steigung) ist unverändert. Da das Gerät im Lernmodell keinen automatischen Nullabgleich vor jeder Messung durchführt, sondern mit den gespeicherten Justierdaten rechnet, wird <b>jeder Manschettendruck um ca. 6 mmHg zu hoch</b> gemessen. Weil der Selbsttest nur die grobe Plausibilität (±10 mmHg) bewertet, blieb die Drift unbemerkt – bis zur Rückmeldung der Ambulanz und zur MTK.</p>' +
        '<h3>Warum sind SYS, DIA und MAD gleichermaßen betroffen?</h3>' +
        '<p>Das oszillometrische Verfahren ordnet charakteristische Punkte der Oszillationskurve einem <b>gemessenen Manschettendruck</b> zu. Ist diese Druckmessung um +6 mmHg verschoben, sind alle daraus abgeleiteten Werte um denselben Betrag verschoben. Messablauf, Dauer und Meldungen bleiben normal – das Gerät „merkt“ den Fehler nicht.</p>' +
        '<h3>Wie wurde der Fehler abgegrenzt?</h3>' +
        '<ul><li><b>Referenz geprüft:</b> Erst ein gültig kalibriertes Referenzmanometer macht den Vergleich belastbar.</li>' +
        '<li><b>Statische Druckprüfung:</b> Konstante Abweichung an allen Stufen – auch bei 0 mmHg → <b>Nullpunktfehler</b>, kein Verstärkungsfehler.</li>' +
        '<li><b>Dichtheitsprüfung:</b> bestanden → <b>keine Leckage</b>. (Eine Leckage verfälscht die statische Anzeige nicht, sie lässt den Druck abfallen.)</li>' +
        '<li><b>Prüfvolumen statt eigenem Zubehör:</b> identische Abweichung → <b>Zubehör und Manschettengröße</b> nicht ursächlich.</li>' +
        '<li><b>Servicemenü:</b> Bei offenem Anschluss zeigt der Messkanal +6 mmHg, der unabhängige Sicherheitssensor 0 mmHg → Fehler im <b>Hauptsensor/Messkanal</b>, kein Restdruck.</li>' +
        '<li><b>NIBP-Simulator:</b> bestätigt das Bild in der Anwendung, ist aber kein Genauigkeitsnormal.</li></ul>' +
        '<h3>Warum keine „schnelle Korrektur“?</h3>' +
        '<p>Eine Justierung verändert die <b>messtechnischen Eigenschaften</b> eines Medizinprodukts mit Messfunktion. Sie ist nur mit dem <b>vom Hersteller vorgesehenen Verfahren</b>, durch <b>befugtes, geschultes Personal</b> und mit <b>rückführbar kalibrierten</b> Prüfmitteln zulässig – andernfalls ist die Messrichtigkeit nicht nachgewiesen. Ist das vor Ort nicht möglich, wird das Modul nach Herstellervorgabe getauscht oder das Gerät eingesendet. Anschließend ist eine <b>erneute MTK</b> erforderlich, weil der Eingriff die messtechnischen Eigenschaften beeinflusst hat.</p>' +
        '<h3>Bedeutung der MTK</h3>' +
        '<p>Die MTK ist kein Formalismus: Sie hat hier eine schleichende, für Anwender kaum erkennbare Abweichung aufgedeckt. Der Vergleich mit dem Vorbefund (+2 mmHg vor zwei Jahren) zeigt den Drifttrend. Die Prüfergebnisse werden im <b>Medizinproduktebuch</b> dokumentiert, das Gerät erhält das <b>MTK-Zeichen</b>.</p>' +
        '<h3>Vorbeugung</h3>' +
        '<ul><li>MTK-Fristen konsequent einhalten und Vorbefunde vergleichen (Trends erkennen).</li>' +
        '<li>Rückmeldungen von Anwendern zu „unplausiblen Werten“ ernst nehmen – aber objektiv mit Referenz prüfen.</li>' +
        '<li>Vergleichsmessungen am Patienten nur als Hinweis werten; auch das Handmanometer der Station unterliegt der MTK.</li>' +
        '<li>Anwender zur richtigen Manschettenwahl schulen – die häufigste Fehlerquelle am Patienten.</li></ul>' +
        '<div class="callout warn"><b>Lernsimulation vs. reale Servicearbeit:</b> Servicemenü, Diagnosedaten, Protokolle, Grenzwerte (außer der üblichen Fehlergrenze ±3 mmHg) und Messwerte sind fiktiv. Reale Prüf-, Justier- und Instandsetzungsschritte richten sich nach den Unterlagen des Herstellers, der Qualifikation und Befugnis des Personals und den geltenden Vorschriften (u. a. MPDG, MPBetreibV, IEC 62353).</div>',
    },

    documentation: {
      intro: 'Erstelle den Prüf- und Instandsetzungsbericht. Er dient als Nachweis im Medizinproduktebuch, für den Betreiber und für künftige MTK (Trendvergleich).',
      fields: [
        {
          id: 'symptom',
          label: 'Befund',
          type: 'select',
          options: [
            { value: 'a', label: 'Gerät misst falsch' },
            { value: 'b', label: 'MTK nicht bestanden: Manschettendruckanzeige an allen Stufen (0–250 mmHg) konstant ca. +6 mmHg (Fehlergrenze ±3 mmHg); Dichtheit i. O.; Anwendermeldung „Werte zu hoch“ bestätigt' },
            { value: 'c', label: 'Ambulanz misst manuell zu niedrig' },
          ],
          correct: 'b',
          hint: 'Konkret und überprüfbar: Messwerte, Fehlergrenze, Ergebnis der Dichtheitsprüfung.',
        },
        {
          id: 'cause',
          label: 'Festgestellte Ursache',
          type: 'select',
          options: [
            { value: 'a', label: 'Vermutlich Sensor' },
            { value: 'b', label: 'Verstärkungsfehler des Drucksensors' },
            { value: 'c', label: 'Nullpunktdrift (+6 mmHg) des Hauptdrucksensors im NIBP-Modul; nachgewiesen durch statische Druckprüfung (konstantes Muster, Abweichung bei 0 mmHg), Prüfvolumen-Tauschtest und Sensorvergleich' },
          ],
          correct: 'c',
          hint: 'Ursache und Nachweis gehören zusammen – und das Abweichungsmuster unterscheidet Nullpunkt- von Verstärkungsfehler.',
        },
        {
          id: 'action',
          label: 'Durchgeführte Maßnahme',
          type: 'select',
          options: [
            { value: 'a', label: 'Nullpunkt im Servicemenü um −6 mmHg korrigiert' },
            { value: 'b', label: 'Justierung des Drucksensors nach Herstellerverfahren durch befugtes, geschultes Personal mit rückführbar kalibriertem Referenzmanometer; Gerät bis dahin gesperrt; Betreiber und Ambulanz informiert' },
            { value: 'c', label: 'Manschetten und Schlauch erneuert' },
          ],
          correct: 'b',
        },
        {
          id: 'results',
          label: 'Messergebnisse (vorher / nachher)',
          type: 'select',
          options: [
            { value: 'a', label: 'Vorher: +6 mmHg an allen Stufen 0–250 mmHg, Dichtheit 1,6 mmHg/min. Nachher: max. +1 mmHg an allen Stufen, Dichtheit 1,6 mmHg/min (Referenzmanometer PM-12, rückführbar kalibriert)' },
            { value: 'b', label: 'Nachher i. O.' },
            { value: 'c', label: 'Vorher: +6 %, nachher 0 %' },
          ],
          correct: 'a',
          hint: 'Für die MTK zählen die konkreten Messwerte je Druckstufe und das verwendete Referenzmessgerät.',
        },
        {
          id: 'checks',
          label: 'Durchgeführte Prüfungen nach der Instandsetzung',
          type: 'multi',
          options: [
            { value: 'static', label: 'Erneute MTK: statische Druckprüfung' },
            { value: 'leak', label: 'Erneute MTK: Dichtheitsprüfung' },
            { value: 'sim', label: 'Funktionsprüfung mit NIBP-Simulator' },
            { value: 'protect', label: 'Überdruckabschaltung/Messzeitbegrenzung nach Herstellerverfahren' },
            { value: 'safety', label: 'Elektrische Sicherheitsprüfung IEC 62353' },
            { value: 'spo2', label: 'SpO₂-Prüfung mit Simulator' },
          ],
          correct: ['static', 'leak', 'sim', 'protect', 'safety'],
          hint: 'Nur tatsächlich durchgeführte Prüfungen dokumentieren. Das Gerät hat keine SpO₂-Funktion.',
        },
        {
          id: 'equipment',
          label: 'Verwendete Prüfmittel (mit Inventar-Nr. und Kalibrierstatus)',
          type: 'multi',
          options: [
            { value: 'ref', label: 'Referenzmanometer mit Druckerzeuger, T-Stück, Prüfvolumen' },
            { value: 'sim', label: 'NIBP-/Patientensimulator' },
            { value: 'sa', label: 'Sicherheitsanalysator' },
            { value: 'flow', label: 'Beatmungsanalysator' },
          ],
          correct: ['ref', 'sim', 'sa'],
          hint: 'Alle für Fehlersuche und Prüfung eingesetzten Messmittel aufführen.',
        },
        {
          id: 'release',
          label: 'Ergebnis / Freigabe',
          type: 'select',
          options: [
            { value: 'a', label: 'MTK nach Justierung bestanden, Sicherheitsprüfung bestanden – Gerät freigegeben, MTK-Zeichen angebracht, Medizinproduktebuch aktualisiert, Rückgabe an Ambulanz' },
            { value: 'b', label: 'Gerät freigegeben, MTK wird bei der nächsten Frist nachgeholt' },
            { value: 'c', label: 'Gerät gesperrt' },
          ],
          correct: 'a',
        },
        { id: 'remark', label: 'Bemerkungen / Empfehlungen', type: 'text', required: true, minLength: 10, placeholder: 'z. B. Drifttrend beobachten, Vorbefunde vergleichen, Hinweis an Ambulanz …' },
        { id: 'tech', label: 'Prüfer/in (Name, Kürzel)', type: 'text', required: true, minLength: 2, placeholder: 'Name, Kürzel' },
      ],
    },

    quiz: [
      { q: 'Die statische Druckprüfung ergibt bei 0, 50, 150 und 250 mmHg jeweils +6 mmHg. Welcher Fehler liegt vor?', options: ['Verstärkungsfehler', 'Nullpunktfehler (Offset)', 'Leckage', 'Algorithmusfehler'], correct: 1, explain: 'Konstante Abweichung über alle Stufen, schon bei 0 mmHg – die Kennlinie ist parallel verschoben.' },
      { q: 'Woran erkennt man einen Verstärkungsfehler?', options: ['Die Abweichung ist bei allen Drücken gleich', 'Die Abweichung wächst proportional mit dem Druck und ist bei 0 mmHg null', 'Der Druck fällt bei der Dichtheitsprüfung ab', 'Das Gerät zeigt gar nichts an'], correct: 1, explain: 'Bei falscher Steigung k ist der Fehler k−1 mal Druck – bei hohen Drücken am größten.' },
      { q: 'Warum verfälscht eine Leckage die statische Druckanzeige nicht?', options: ['Weil Leckagen nur bei hohen Drücken auftreten', 'Weil Referenzmanometer und Gerät im selben Volumen denselben (ggf. fallenden) Druck messen', 'Weil das Gerät Leckagen automatisch korrigiert', 'Weil die Manschette abgezogen ist'], correct: 1, explain: 'Beide Messgeräte sehen denselben Druck. Eine Leckage zeigt sich als Druckabfall bei der Dichtheitsprüfung.' },
      { q: 'Was ist der Unterschied zwischen Kalibrieren und Justieren?', options: ['Es gibt keinen', 'Kalibrieren ermittelt die Abweichung ohne Eingriff; Justieren stellt das Gerät ein, um die Abweichung zu verringern', 'Justieren ist nur für Waagen', 'Kalibrieren darf nur der Hersteller'], correct: 1, explain: 'Kalibrieren = feststellen und dokumentieren; Justieren = Eingriff zum Abgleich.' },
      { q: 'Welche Maßnahme ist bei der festgestellten Nullpunktdrift richtig?', options: ['Ambulanz zieht 6 mmHg von jedem Wert ab', 'Korrekturwert im Servicemenü eigenmächtig ändern', 'Justierung nach Herstellerverfahren durch befugtes Personal mit rückführbarer Referenz bzw. Modultausch/Einsendung, danach erneute MTK', 'Manschetten tauschen'], correct: 2, explain: 'Eingriffe in die messtechnischen Eigenschaften nur nach Herstellerverfahren durch befugtes Personal; danach erneute Kontrolle.' },
      { q: 'Wozu dient ein NIBP-Simulator – und wozu nicht?', options: ['Er ist das Normal für die MTK', 'Er prüft Funktion, Messablauf und Wiederholbarkeit; die Genauigkeit des Drucksensors wird statisch mit einem Referenzmanometer nachgewiesen', 'Er ersetzt die Dichtheitsprüfung', 'Er misst Ableitströme'], correct: 1, explain: 'Die Simulatorergebnisse hängen auch vom herstellerspezifischen Algorithmus ab.' },
      { q: 'Wie wirkt sich eine zu kleine Manschette am Patienten typischerweise aus?', options: ['Falsch niedrige Werte', 'Falsch hohe Werte', 'Keine Auswirkung', 'Nur die Pulsfrequenz ändert sich'], correct: 1, explain: 'Eine zu schmale Manschette benötigt mehr Druck, um die Arterie zu komprimieren → zu hohe Werte. Deshalb wurde die Anwendung geprüft.' },
      { q: 'Warum wurde zuerst das eigene Referenzmanometer kontrolliert?', options: ['Aus Gewohnheit', 'Weil eine Aussage über den Prüfling nur so gut ist wie die Referenz – sie muss rückführbar kalibriert und plausibel sein', 'Weil der Hersteller es verlangt, obwohl es fachlich egal ist', 'Damit die Prüfung länger dauert'], correct: 1, explain: 'Rückführbarkeit und deutlich kleinere Messunsicherheit als die Fehlergrenze sind Voraussetzung für eine belastbare MTK.' },
      { q: 'Wann sieht die MPBetreibV (sinngemäß) eine MTK auch außerhalb der regulären Frist vor?', options: ['Nie', 'Wenn Anzeichen bestehen, dass Fehlergrenzen nicht eingehalten werden, oder ein Eingriff die messtechnischen Eigenschaften beeinflusst haben könnte', 'Nur nach einem Umzug der Station', 'Nur auf Wunsch des Herstellers'], correct: 1, explain: 'Darum folgt auf die Justierung eine erneute MTK. Verbindlich ist der aktuelle Verordnungstext.' },
      { q: 'Warum zeigte der Selbsttest des Geräts keinen Fehler an?', options: ['Weil der Sensor in Ordnung war', 'Weil der Selbsttest nur eine grobe Plausibilitätsgrenze (±10 mmHg im Lernmodell) prüft und eine schleichende Drift von 6 mmHg darin liegt', 'Weil der Selbsttest abgeschaltet war', 'Weil die Manschette fehlte'], correct: 1, explain: 'Selbsttests erkennen grobe Defekte, ersetzen aber keine messtechnische Kontrolle mit Referenz.' },
    ],

    createState: () => ({ sensor: 'drifted', setup: 'own' }),
  });

  // Für automatische Tests exportieren (keine Auswirkung im Browser)
  MTRL.__test = MTRL.__test || {};
  MTRL.__test.nibpDeviation = { deviceReading, measureBp, cuffPressure, pressureFixture, simulatorFixture, nibpFrame, CAL, SETPOINTS };
})();
