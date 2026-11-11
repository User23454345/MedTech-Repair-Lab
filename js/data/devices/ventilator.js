/*
 * Gerät: Intensiv-Beatmungsgerät (generisches Lernmodell)
 * Keine realen Hersteller, Modelle oder Servicecodes. Aufbau und Bezeichnungen
 * sind verallgemeinert; maßgeblich sind immer die Herstellerunterlagen.
 */
MTRL.registerDevice({
  id: 'ventilator',
  name: 'Intensiv-Beatmungsgerät',
  icon: '🫁',
  category: 'Beatmung & Atemtherapie',
  riskClass: 'Typisch Klasse IIb (lebenserhaltende bzw. -unterstützende Gasabgabe); Einstufung hängt von der Zweckbestimmung des Herstellers ab',
  summary:
    'Unterstützt oder ersetzt die Spontanatmung von Intensivpatientinnen und -patienten: Das Gerät dosiert ein Luft-Sauerstoff-Gemisch, gibt es druck- oder volumenkontrolliert ab, misst Drücke, Flows und Volumina und alarmiert bei Abweichungen.',
  principle:
    '<p>Ein Intensiv-Beatmungsgerät besteht im Kern aus einer <b>pneumatischen Einheit</b> und einer <b>Steuer- und Überwachungselektronik</b>. Die Gasversorgung erfolgt über die zentrale Gasversorgung (Druckluft und Sauerstoff) oder über eine geräteinterne Turbine/Gebläse für Raumluft. <b>Dosierventile</b> bzw. ein Gasmischer stellen die gewünschte Sauerstoffkonzentration (FiO₂) ein; ein <b>Inspirationsventil</b> regelt den Gasfluss (Flow) zum Patienten.</p>' +
    '<p>Während der <b>Inspiration</b> strömt das Gas über den Inspirationsschenkel des Schlauchsystems (ggf. mit Befeuchter) und das Y-Stück in die Lunge. In der <b>Exspiration</b> öffnet das <b>Exspirationsventil</b> und hält dabei den eingestellten <b>PEEP</b> (positiver endexspiratorischer Druck). Das ausgeatmete Gas passiert den <b>exspiratorischen Flowsensor</b>, der das ausgeatmete Tidalvolumen (<b>VTe</b>) und daraus das <b>Atemminutenvolumen</b> (MV = VTe · Frequenz) bestimmt.</p>' +
    '<p>Drucksensoren messen den Atemwegsdruck (Paw), ein O₂-Sensor überwacht die FiO₂. Die Elektronik vergleicht alle Messwerte mit den <b>Alarmgrenzen</b>. Da das Gerät lebenserhaltend sein kann, sind Alarmierung, Netzausfall-Überbrückung (Akku) und Selbsttests zentrale Sicherheitsfunktionen.</p>' +
    '<p class="muted">Einheiten: Drücke werden je nach Gerät in mbar oder cmH₂O angegeben (1 mbar ≈ 1,02 cmH₂O).</p>',
  components: [
    { id: 'gas-inlet', name: 'Gaseinlass (O₂ / Druckluft) bzw. Turbine', function: 'Anschluss an die zentrale Gasversorgung mit Filtern und Druckreglern oder geräteinterne Gaserzeugung über ein Gebläse.', wear: 'mittel', notes: 'Einlassfilter verschmutzen; Arbeiten an der O₂-Versorgung nur nach Herstellerunterlagen durch qualifiziertes Personal.' },
    { id: 'mixer', name: 'Gasmischer / Dosierventile', function: 'Stellen die Sauerstoffkonzentration (FiO₂) und den Inspirationsflow ein.', wear: 'niedrig' },
    { id: 'insp-valve', name: 'Inspirationsventil mit inspiratorischem Flowsensor', function: 'Regelt den Gasfluss zum Patienten; der interne Flowsensor misst den abgegebenen Flow (VTi).', wear: 'niedrig' },
    { id: 'exp-valve', name: 'Exspirationsventil (mit Membran)', function: 'Schließt während der Inspiration, öffnet in der Exspiration und regelt den PEEP.', wear: 'mittel', notes: 'Membran altert; je nach Gerät aufbereitbares Verschleißteil.' },
    { id: 'exp-flow', name: 'Exspiratorischer Flowsensor', function: 'Misst den Ausatemflow; daraus werden VTe und Atemminutenvolumen berechnet (Grundlage wichtiger Alarme).', wear: 'hoch', notes: 'Empfindlich gegen Kondensat, Sekret und Medikamentenaerosol; Kalibrierung nur über die Gerätefunktion nach Herstellervorgabe.' },
    { id: 'pressure', name: 'Drucksensorik', function: 'Misst Atemwegsdruck (Paw), Spitzendruck, Plateaudruck und PEEP; Grundlage für Druckbegrenzung und Druckalarme.', wear: 'niedrig' },
    { id: 'o2-sensor', name: 'O₂-Sensor', function: 'Überwacht die abgegebene Sauerstoffkonzentration (z. B. galvanische Zelle).', wear: 'hoch', notes: 'Galvanische O₂-Zellen verbrauchen sich und haben eine begrenzte Lebensdauer.' },
    { id: 'circuit', name: 'Patientenschlauchsystem, Filter, Befeuchter', function: 'Verbindet Gerät und Patient; Filter (z. B. HME- oder Bakterien-/Virenfilter) und Befeuchter konditionieren das Atemgas.', wear: 'hoch', notes: 'Einweg- bzw. Mehrwegzubehör; Wechselintervalle nach Hygieneplan und Herstellerangaben.' },
    { id: 'control', name: 'Steuer- und Überwachungselektronik', function: 'Regelung, Messwertverarbeitung, Alarmlogik, Selbsttests, Ereignisprotokoll.', wear: 'niedrig' },
    { id: 'ui', name: 'Bedieneinheit / Display', function: 'Einstellungen, Kurven (Druck, Flow, Volumen), Messwerte, Alarme.', wear: 'mittel' },
    { id: 'power', name: 'Netzteil und Akku', function: 'Energieversorgung; Akku überbrückt Netzausfall und Transport.', wear: 'mittel', notes: 'Akkukapazität regelmäßig prüfen; Arbeiten am Netzteil nur nach Servicehandbuch.' },
    { id: 'alarm', name: 'Alarmsystem', function: 'Akustische und optische Alarme (z. B. Diskonnektion, Druck hoch, MV niedrig, Gasversorgung, Geräteausfall).', wear: 'niedrig', notes: 'Sicherheitsfunktion – darf nicht verändert oder umgangen werden.' },
  ],
  signalPath: [
    { id: 'supply', label: 'Gasversorgung', desc: 'O₂ und Druckluft (zentral) bzw. Turbine' },
    { id: 'mixer', label: 'Gasmischer & Dosierventile', desc: 'FiO₂ und Flow einstellen' },
    { id: 'insp', label: 'Inspirationsventil + insp. Flowsensor', desc: 'Abgabe regeln, VTi messen' },
    { id: 'circuit-in', label: 'Inspirationsschenkel', desc: 'Schlauch, Befeuchter, Filter' },
    { id: 'patient', label: 'Y-Stück / Patient', desc: 'Atemwege und Lunge (Compliance, Resistance)' },
    { id: 'circuit-ex', label: 'Exspirationsschenkel', desc: 'Schlauch, ggf. Wasserfalle, Exspirationsfilter' },
    { id: 'exp-flow', label: 'Exspiratorischer Flowsensor', desc: 'Ausatemflow → VTe, MV' },
    { id: 'exp-valve', label: 'Exspirationsventil', desc: 'PEEP-Regelung, Gasauslass' },
    { id: 'control', label: 'Steuerung & Überwachung', desc: 'Regelkreise, Alarmgrenzen, Selbsttest' },
    { id: 'display', label: 'Anzeige & Alarm', desc: 'Kurven, Messwerte, Alarmmeldungen' },
  ],
  faults: [
    { symptom: 'VTe/Atemminutenvolumen deutlich niedriger als eingestellt, Alarm „MV niedrig“', causes: ['Exspiratorischer Flowsensor verschmutzt, feucht oder defekt (Messfehler)', 'Leckage im Schlauchsystem oder am Tubus/Cuff (Abgabe zu gering)', 'Unpassende Einstellungen oder Alarmgrenzen', 'Exspirationsventil/Membran undicht'], checks: ['Prüfung an Testlunge mit Beatmungsanalysator (Einstellung – Abgabe – Anzeige vergleichen)', 'Dichtheitsprüfung des Schlauchsystems / Gerätecheck', 'Tauschtest mit bekannt gutem Flowsensor bzw. neuem Schlauchsystem', 'Einstellungen mit ärztlicher Anordnung abgleichen'] },
    { symptom: 'Alarm „Leckage“ bzw. PEEP wird nicht gehalten', causes: ['Undichte Schlauchverbindung, Wasserfalle, Befeuchterkammer', 'Exspirationsventil-Membran defekt oder falsch eingesetzt', 'Cuffleckage am Patienten'], checks: ['Gerätecheck mit Dichtheitsprüfung', 'Druckabfallprüfung mit Referenzmanometer', 'Komponenten einzeln tauschen'] },
    { symptom: 'FiO₂-Anzeige weicht ab bzw. Alarm „O₂-Sensor“', causes: ['O₂-Sensor verbraucht', 'O₂-Kalibrierung fällig', 'Störung der Gasversorgung'], checks: ['O₂-Kalibrierung nach Gebrauchsanweisung', 'Vergleich mit kalibriertem O₂-Analysator', 'Gasversorgungsdruck prüfen (nur durch qualifiziertes Personal)'] },
    { symptom: 'Gerätecheck/Selbsttest wird nicht bestanden', causes: ['Undichtes Schlauchsystem oder fehlender Testverschluss', 'Flowsensor nicht kalibrierbar', 'Interner Komponentenfehler'], checks: ['Fehlermeldung nach Gebrauchsanweisung/Servicehandbuch auswerten', 'Schlauchsystem und Sensoren tauschen', 'Bei internen Fehlern: Herstellerservice'] },
    { symptom: 'Akku-Laufzeit zu kurz / Gerät meldet Akkufehler', causes: ['Akku gealtert', 'Ladeschaltung defekt'], checks: ['Akkutest nach Herstellervorgabe', 'Netzausfallsimulation unter Aufsicht (nicht am Patienten)'] },
  ],
  wearParts: ['vent-exp-flow-sensor', 'vent-patient-circuit', 'vent-filter', 'vent-exp-valve-membrane', 'vent-o2-sensor', 'vent-water-trap', 'vent-air-inlet-filter', 'vent-battery'],
  functionChecks: [
    'Sichtprüfung (Gehäuse, Bedienelemente, Netz- und Gasanschlüsse, Zubehör, Kennzeichnung)',
    'Gerätecheck/Selbsttest nach Gebrauchsanweisung (Dichtheit, Compliance des Schlauchsystems, Sensoren)',
    'Kalibrierung von Flow- und O₂-Sensor über die Gerätefunktion, sofern vom Hersteller vorgesehen',
    'Beatmungsparameter an Testlunge mit Beatmungsanalysator (VT, Frequenz, PEEP, Spitzendruck, FiO₂) bei mehreren Einstellungen',
    'Alarmprüfung (z. B. Diskonnektion, MV niedrig, Druck hoch, Gasversorgungsausfall – Umfang nach Herstellervorgabe)',
    'Netzausfall/Akkubetrieb',
    'Elektrische Sicherheit nach IEC 62353 (Umfang und Anlass nach Herstellervorgabe und Betreiberfestlegung)',
  ],
  safety: [
    'Prüfungen und Fehlersuche nie am Patienten – immer mit Testlunge; der Patient wird währenddessen mit einem Ersatzgerät versorgt.',
    'Gerät vor Arbeiten gemäß Hygieneplan aufbereiten; Patientenschlauchsystem, Filter und Flowsensoren gelten als potenziell kontaminiert (Schutzhandschuhe).',
    'Arbeiten an Gasversorgung, Sauerstoffpfad, Netzteil sowie an Druckbegrenzung und Alarmfunktionen nur durch qualifiziertes, vom Hersteller geschultes Personal nach Servicehandbuch.',
    'Sauerstoff fördert die Verbrennung: Keine Öle/Fette an O₂-führenden Teilen, nur freigegebene Materialien verwenden.',
    'Alarmgrenzen nicht verändern, um eine Störung zu „beheben“ – Alarme sind Schutzfunktionen.',
  ],
  regulatory:
    'Geräte zur maschinellen Beatmung gehören zu den in Anlage 1 der MPBetreibV genannten Medizinprodukten. Daraus ergeben sich u. a. Funktionsprüfung und Einweisung vor der ersten Inbetriebnahme, die Führung eines Medizinproduktebuchs sowie sicherheitstechnische Kontrollen nach Herstellerangaben (Fristen gemäß Verordnung bzw. Hersteller). Messtechnische Kontrollen nach Anlage 2 MPBetreibV sind für Beatmungsgeräte nicht vorgesehen; die Messgenauigkeit wird u. a. bei Funktionsprüfungen und STK nach Herstellervorgabe beurteilt.',
  instruments: ['flow-analyzer', 'pressure-meter', 'safety-analyzer', 'multimeter'],
});
