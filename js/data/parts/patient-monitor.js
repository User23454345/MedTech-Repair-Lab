/*
 * Ersatz- und Verschleißteile: Patientenmonitor (generisch, Lernmodell)
 * Keine realen Artikelnummern – Beschaffung ausschließlich nach Ersatzteilliste des Herstellers.
 */
MTRL.registerParts([
  {
    id: 'spo2-adapter-cable', name: 'SpO₂-Adapter-/Verlängerungskabel', category: 'Patientenkabel & Sensorik', devices: ['patient-monitor'],
    function: 'Verbindet den SpO₂-Sensor mit der Gerätebuchse; führt LED-Ansteuerung, geschirmtes Photodiodensignal und Sensorkodierung.',
    wear: 'hoch', wearInfo: 'Biegewechselbelastung am Knickschutz, Steckzyklen, Desinfektionsmittel.',
    failureModes: ['„Kein Signal“ bei erkanntem Sensor (Aderbruch Photodiodenleitung)', '„Kein Sensor“ (Kodier- oder LED-Leitung unterbrochen)', 'Sporadische Ausfälle bei Bewegung', 'Störanfälligkeit durch beschädigte Schirmung'],
    replacement: 'Austausch gegen freigegebenes Originalzubehör durch Anwender oder Medizintechnik möglich (Zubehörtausch, kein Geräteeingriff). Keine Reparatur durch Löten.',
    checksAfter: ['Sichtprüfung', 'SpO₂-Funktionsprüfung mit Simulator (mehrere Prüfpunkte)', 'Alarmprüfung'],
  },
  {
    id: 'spo2-sensor-reusable', name: 'SpO₂-Fingerclip-Sensor (Mehrweg)', category: 'Patientenkabel & Sensorik', devices: ['patient-monitor'],
    function: 'Enthält rote und infrarote LED, Photodiode und Kodierung; durchleuchtet das Gewebe.',
    wear: 'hoch', wearInfo: 'Feder/Clipmechanik, Fenster (Verkratzung), Kabelaustritt.',
    failureModes: ['Unplausible Werte durch verschmutzte/verkratzte Fenster', 'Kein Signal durch defekte LED/Photodiode', 'Fremdlichtempfindlichkeit bei ausgeleiertem Clip'],
    replacement: 'Austausch gegen freigegebenen, zur Kalibrierkurve des Geräts passenden Sensor. Fremdsensoren nur mit Kompatibilitätsfreigabe.',
    checksAfter: ['SpO₂-Funktionsprüfung mit Simulator', 'Probandentest'],
    notes: 'Sensor und Gerät bilden ein kalibriertes System – nicht freigegebene Sensoren können Messabweichungen verursachen.',
  },
  {
    id: 'ecg-trunk-cable', name: 'EKG-Stammkabel mit Ableitkabeln', category: 'Patientenkabel & Sensorik', devices: ['patient-monitor'],
    function: 'Überträgt die Elektrodenpotentiale zum EKG-Modul; enthält ggf. Schutzwiderstände (herstellerspezifisch).',
    wear: 'hoch', wearInfo: 'Knickstellen, Druckknopf-/Clipverschleiß.',
    failureModes: ['„Elektrode ab“ trotz angelegter Elektrode', 'Netzbrumm durch defekten Schirm', 'Vertauschte Ableitungen nach falscher Montage'],
    replacement: 'Austausch gegen freigegebenes Originalzubehör (defibrillationsfeste Ausführung beachten).',
    checksAfter: ['EKG-Prüfung mit EKG-Simulator (Amplitude, HF, Lead-off)', 'Sichtprüfung'],
  },
  {
    id: 'nibp-cuff', name: 'NIBP-Manschette', category: 'Pneumatik', devices: ['patient-monitor'],
    function: 'Komprimiert die Arterie; Druckschwankungen (Oszillationen) werden zum Gerät übertragen.',
    wear: 'hoch', wearInfo: 'Undichte Blase, verschlissener Klettverschluss, Kupplung.',
    failureModes: ['Meldung „Leck“ / Messabbruch', 'Falsche Werte durch falsche Manschettengröße'],
    replacement: 'Austausch durch Anwender gegen passende, freigegebene Manschette (Größe!).',
    checksAfter: ['Dichtheitsprüfung', 'Probemessung'],
  },
  {
    id: 'nibp-hose', name: 'NIBP-Verbindungsschlauch', category: 'Pneumatik', devices: ['patient-monitor'],
    function: 'Pneumatische Verbindung zwischen Manschette und Gerät.',
    wear: 'mittel', wearInfo: 'Risse, poröse Kupplungen, O-Ringe.',
    failureModes: ['Leck', 'Knick → Überdruck-/Okklusionsmeldung'],
    replacement: 'Austausch gegen Originalzubehör.',
    checksAfter: ['Dichtheitsprüfung', 'Statische Druckprüfung bei Bedarf'],
  },
  {
    id: 'battery-liion-monitor', name: 'Akku (Li-Ion) für Patientenmonitor', category: 'Energieversorgung', devices: ['patient-monitor'],
    function: 'Netzunabhängiger Betrieb bei Transport und Netzausfall.',
    wear: 'hoch', wearInfo: 'Kapazitätsverlust durch Zyklen, Alter und Temperatur.',
    failureModes: ['Gerät schaltet bei Netztrennung sofort ab', 'Laufzeit deutlich verkürzt', 'Akkufehlermeldung'],
    replacement: 'Austausch gemäß Herstellervorgabe (häufig ohne Öffnen des Gerätes); nur Originalakkus. Altakku fachgerecht entsorgen.',
    checksAfter: ['Ladeanzeige', 'Laufzeit-/Kapazitätstest', 'Netzausfall-Umschaltung'],
    notes: 'Aufgeblähte oder beschädigte Li-Ion-Akkus sofort sicher lagern (Brandgefahr).',
  },
  {
    id: 'temp-probe', name: 'Temperatursonde (NTC)', category: 'Patientenkabel & Sensorik', devices: ['patient-monitor'],
    function: 'Temperaturabhängiger Widerstand (NTC) zur Haut- oder Körperkerntemperaturmessung.',
    wear: 'mittel', wearInfo: 'Kabelbruch, Drift nach mechanischer/thermischer Belastung.',
    failureModes: ['Keine Anzeige / „Sonde ab“', 'Konstante Abweichung (Drift)'],
    replacement: 'Austausch gegen freigegebene Sonde des passenden Typs.',
    checksAfter: ['Prüfung mit Temperatursimulator/Referenzwiderstand'],
  },
]);
