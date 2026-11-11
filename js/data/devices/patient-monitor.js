/*
 * Gerät: Patientenmonitor (generisches Lernmodell)
 * Dient zugleich als Referenz für das Datenformat aller Geräte.
 */
MTRL.registerDevice({
  id: 'patient-monitor',
  name: 'Patientenmonitor',
  icon: '🖥️',
  category: 'Überwachung',
  riskClass: 'Typisch Klasse IIb (Überwachung vitaler Parameter); Einstufung hängt von der Zweckbestimmung des Herstellers ab',
  summary:
    'Überwacht kontinuierlich Vitalparameter wie EKG, Herzfrequenz, SpO₂, nicht-invasiven Blutdruck (NIBP), Temperatur und Atmung und alarmiert bei Grenzwertverletzungen.',
  principle:
    '<p>Ein Patientenmonitor ist modular aufgebaut: <b>Messmodule</b> (bzw. Parameterplatinen) erfassen die einzelnen Vitalparameter über <b>Sensoren und Patientenkabel</b>, digitalisieren sie und übertragen die Daten über einen internen Bus an die <b>Hauptplatine (CPU)</b>. Diese berechnet Trends, prüft Alarmgrenzen und steuert <b>Display, Lautsprecher und Netzwerkschnittstelle</b> (z. B. zur Zentrale).</p>' +
    '<p>Die Anwendungsteile (EKG, SpO₂, NIBP, Temperatur) sind vom Netz <b>galvanisch getrennt</b> (Typ BF oder CF), damit keine gefährlichen Ableitströme zum Patienten fließen. Die Energieversorgung erfolgt über ein Netzteil und einen <b>Akku</b> für Transport und Netzausfall.</p>',
  components: [
    { id: 'psu', name: 'Netzteil', function: 'Wandelt Netzspannung in Kleinspannungen um, lädt den Akku, stellt Netztrennung sicher.', wear: 'niedrig', notes: 'Elektrolytkondensatoren altern (Wärme).' },
    { id: 'battery', name: 'Akku (Li-Ion)', function: 'Überbrückt Netzausfall und Transport.', wear: 'hoch', notes: 'Kapazitätsverlust durch Zyklen und Alter; regelmäßige Kapazitätsprüfung.' },
    { id: 'cpu', name: 'Hauptplatine (CPU)', function: 'Datenverarbeitung, Alarmlogik, Anzeige, Speicherung, Kommunikation.', wear: 'niedrig' },
    { id: 'display', name: 'Display mit Touch', function: 'Darstellung von Kurven, Zahlenwerten, Alarmen; Bedienung.', wear: 'mittel', notes: 'Hintergrundbeleuchtung und Touch-Folie altern.' },
    { id: 'ecg', name: 'EKG-Modul', function: 'Verstärkt und filtert die Elektrodenpotentiale, Elektrodenüberwachung (Lead-off), Schrittmachererkennung.', wear: 'niedrig' },
    { id: 'spo2', name: 'SpO₂-Modul', function: 'Steuert die Sensor-LEDs, verstärkt das Photodiodensignal, berechnet SpO₂ und Pulsfrequenz.', wear: 'niedrig' },
    { id: 'nibp', name: 'NIBP-Modul', function: 'Pumpe, Ventile und Drucksensor für die oszillometrische Blutdruckmessung; Überdruckabschaltung.', wear: 'mittel', notes: 'Pumpe und Ventile verschleißen mit Messzyklen.' },
    { id: 'temp', name: 'Temperaturmodul', function: 'Auswertung von NTC-Temperatursonden.', wear: 'niedrig' },
    { id: 'cables', name: 'Patientenkabel & Sensoren', function: 'Verbinden Patient und Messmodul (EKG-Kabel, SpO₂-Sensor und -Adapterkabel, NIBP-Schlauch und Manschette).', wear: 'hoch', notes: 'Häufigste Fehlerquelle: Biegebelastung, Knicke, Steckzyklen, Desinfektionsmittel.' },
    { id: 'speaker', name: 'Lautsprecher/Alarmanzeige', function: 'Akustische und optische Alarmierung.', wear: 'niedrig' },
    { id: 'network', name: 'Netzwerkschnittstelle', function: 'Anbindung an Zentrale/Klinik-IT (LAN/WLAN).', wear: 'niedrig' },
  ],
  signalPath: [
    { id: 'patient', label: 'Patient', desc: 'Physiologisches Signal (Licht­absorption, Potential, Druck)' },
    { id: 'sensor', label: 'Sensor', desc: 'Wandelt in elektrisches Signal (Photodiode, Elektrode, Drucksensor)' },
    { id: 'cable', label: 'Patienten-/Adapterkabel', desc: 'Leitet das Signal weiter, geschirmt' },
    { id: 'connector', label: 'Gerätebuchse', desc: 'Steckverbindung zum Messmodul' },
    { id: 'frontend', label: 'Analoges Front-End', desc: 'Verstärker, Filter, Isolationsbarriere' },
    { id: 'adc', label: 'A/D-Wandler & DSP', desc: 'Digitalisierung und Parameterberechnung' },
    { id: 'bus', label: 'Interner Bus', desc: 'Datenübertragung zur Hauptplatine' },
    { id: 'cpu', label: 'Hauptplatine', desc: 'Alarmlogik, Trends, Darstellung' },
    { id: 'display', label: 'Anzeige & Alarm', desc: 'Kurven, Zahlenwerte, Meldungen' },
  ],
  faults: [
    { symptom: 'SpO₂ zeigt keine Werte („Kein Signal“)', causes: ['Aderbruch im Adapterkabel', 'Sensor defekt', 'Anwendungsproblem (Fremdlicht, Nagellack, Minderperfusion)', 'Steckverbinder/Buchse defekt', 'SpO₂-Modul defekt'], checks: ['Sichtprüfung Kabel/Knickschutz', 'Test mit SpO₂-Simulator', 'Tauschtest mit bekannt gutem Sensor/Kabel', 'Durchgangsprüfung'] },
    { symptom: 'EKG: „Elektrode ab“ trotz angelegter Elektroden', causes: ['Aderbruch im EKG-Kabel', 'Elektroden ausgetrocknet', 'Steckkontakt verschmutzt'], checks: ['EKG-Simulator', 'Durchgangsprüfung der einzelnen Adern', 'Elektroden erneuern'] },
    { symptom: 'NIBP misst nicht oder bricht ab („Leck“)', causes: ['Undichter Schlauch/Manschette', 'Undichter Kupplungs-O-Ring', 'Pumpe/Ventil verschlissen'], checks: ['Dichtheitsprüfung', 'Statische Druckprüfung', 'Manschette tauschen'] },
    { symptom: 'Gerät schaltet bei Netztrennung sofort ab', causes: ['Akku gealtert', 'Akkukontakt/Ladeschaltung defekt'], checks: ['Akkukapazitätstest', 'Ladespannung/-strom prüfen (nach Herstellervorgabe)'] },
    { symptom: 'Messwerte erscheinen nicht an der Zentrale', causes: ['Netzwerkkabel/Port', 'Konfiguration (IP, Bettenzuordnung)', 'WLAN-Abdeckung'], checks: ['Link-Status', 'Konfiguration mit IT abgleichen'] },
  ],
  wearParts: ['spo2-adapter-cable', 'spo2-sensor-reusable', 'ecg-trunk-cable', 'nibp-cuff', 'nibp-hose', 'battery-liion-monitor', 'temp-probe'],
  functionChecks: [
    'Sichtprüfung (Gehäuse, Display, Netzkabel, Zubehör, Kennzeichnung)',
    'Selbsttest beim Einschalten, Akku-/Netzanzeige',
    'EKG mit EKG-Simulator: Herzfrequenz, Amplitude, Elektrodenüberwachung, Alarm',
    'SpO₂ mit SpO₂-Simulator: mehrere Sättigungsstufen, Pulsfrequenz, Alarmgrenzen',
    'NIBP: statische Druckprüfung, Dichtheitsprüfung, Überdruckabschaltung',
    'Temperatur mit Simulator/Referenzwiderstand',
    'Alarmsystem: akustisch und optisch, Alarmweiterleitung zur Zentrale',
    'Elektrische Sicherheit nach IEC 62353 (Schutzleiter, Ableitströme inkl. Anwendungsteile)',
  ],
  safety: [
    'Gerät vor Arbeiten gemäß Hygieneplan aufbereiten; Freigabe der Station abwarten.',
    'Öffnen des Gehäuses, Arbeiten an Netzteil und Isolationsbarriere nur durch qualifiziertes, vom Hersteller geschultes Personal nach Servicehandbuch.',
    'Nach jedem Öffnen oder Tausch netzführender Teile: Wiederholungsprüfung nach IEC 62353.',
    'NIBP: Überdruckschutz und Messzeitbegrenzung dürfen nicht verändert werden.',
  ],
  regulatory: 'Für nichtinvasive Blutdruckmessgeräte (auch NIBP-Funktion eines Monitors) sind nach MPBetreibV messtechnische Kontrollen vorgesehen (Fristen laut Verordnung bzw. Hersteller). Sicherheitstechnische Kontrollen nach Herstellervorgabe.',
  instruments: ['patient-simulator', 'ecg-simulator', 'multimeter', 'oscilloscope', 'safety-analyzer', 'pressure-meter'],
});
