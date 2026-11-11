/*
 * Gerät: Automatisches oszillometrisches Blutdruckmessgerät (generisches Lernmodell)
 * Keine realen Hersteller, Modelle oder Servicecodes. Aufbau und Bezeichnungen
 * sind verallgemeinert; maßgeblich sind immer die Herstellerunterlagen.
 */
MTRL.registerDevice({
  id: 'nibp-monitor',
  name: 'Automatisches Blutdruckmessgerät (NIBP)',
  icon: '🩺',
  category: 'Diagnostik',
  riskClass: 'Typisch Klasse IIa (Messung eines Vitalparameters); Einstufung hängt von der Zweckbestimmung des Herstellers ab',
  summary:
    'Misst den Blutdruck nichtinvasiv und automatisch nach dem oszillometrischen Verfahren: Eine Manschette wird aufgepumpt, langsam entlüftet und aus den Druckschwankungen in der Manschette werden systolischer, diastolischer und mittlerer arterieller Druck sowie die Pulsfrequenz bestimmt – als Einzelmessung oder in einstellbaren Intervallen.',
  principle:
    '<p>Eine <b>Pumpe</b> bläst die <b>Manschette</b> am Oberarm über den Systolendruck hinaus auf; die Arterie wird komprimiert. Ein <b>Ablassventil</b> senkt den Manschettendruck danach kontrolliert (stufenweise oder kontinuierlich). Sobald der Manschettendruck unter den Systolendruck fällt, öffnet sich die Arterie mit jedem Herzschlag kurz – die Pulswellen übertragen sich als kleine <b>Druckschwankungen (Oszillationen)</b> von wenigen mmHg auf die Manschette.</p>' +
    '<p>Ein <b>Drucksensor</b> (meist piezoresistiv: Siliziummembran mit Widerstandsmessbrücke) misst den Manschettendruck. Die Elektronik trennt den langsam fallenden Gleichanteil (Manschettendruck) vom pulsierenden Anteil (Oszillationen). Das <b>Maximum der Oszillationsamplituden</b> liegt beim <b>mittleren arteriellen Druck (MAD/MAP)</b>. Systolischer und diastolischer Druck werden daraus mit <b>herstellerspezifischen, empirisch ermittelten Algorithmen</b> (z. B. Amplitudenverhältnisse) abgeleitet – sie werden also nicht direkt „gemessen“ wie beim Abhören der Korotkow-Geräusche.</p>' +
    '<p>Weil jeder Blutdruckwert letztlich auf dem <b>gemessenen Manschettendruck</b> beruht, wirkt sich ein Fehler des Drucksensors unmittelbar auf alle angezeigten Werte aus. Deshalb prüft man die Messgenauigkeit des Drucksensors <b>statisch</b> mit einem kalibrierten Referenzmanometer – unabhängig vom Algorithmus.</p>' +
    '<p>Zur Sicherheit begrenzen eine <b>Überdruckabschaltung</b> (häufig mit einem zweiten, unabhängigen Drucksensor) und eine <b>Messzeitbegrenzung</b> Druck und Dauer der Kompression. Diese Schutzfunktionen dürfen nicht verändert werden.</p>' +
    '<p class="muted">Einheiten: 1 kPa ≈ 7,5 mmHg. Blutdruckwerte werden in Deutschland üblicherweise in mmHg angegeben.</p>',
  components: [
    { id: 'pump', name: 'Pumpe (Membranpumpe)', function: 'Bläst die Manschette auf den Aufpumpdruck auf.', wear: 'mittel', notes: 'Membran und Ventilplättchen verschleißen mit der Anzahl der Messzyklen; Austausch nur nach Herstellerunterlagen.' },
    { id: 'valves', name: 'Ablassventil und Schnellablassventil', function: 'Senken den Manschettendruck kontrolliert (Messphase) bzw. schnell (Messende, Abbruch, Überdruck).', wear: 'mittel', notes: 'Undichte oder klemmende Ventile führen zu Messabbrüchen oder verlängerter Messzeit.' },
    { id: 'sensor', name: 'Drucksensor (Messkanal)', function: 'Misst den Manschettendruck; Grundlage aller angezeigten Blutdruckwerte.', wear: 'niedrig', notes: 'Piezoresistive Sensoren können über Jahre driften (vor allem Nullpunkt); deshalb regelmäßige messtechnische Kontrolle.' },
    { id: 'safety-sensor', name: 'Sicherheits-Drucksensor / Überdruckabschaltung', function: 'Unabhängige Überwachung des Manschettendrucks; öffnet bei Überschreitung des Maximaldrucks das Schnellablassventil.', wear: 'niedrig', notes: 'Schutzfunktion – Prüfung und Arbeiten daran nur nach Herstellerunterlagen durch qualifiziertes Personal.' },
    { id: 'electronics', name: 'Mess- und Steuerelektronik', function: 'Verstärkung und Digitalisierung des Sensorsignals, Pumpen-/Ventilsteuerung, oszillometrische Auswertung, Plausibilitätsprüfungen.', wear: 'niedrig', notes: 'Enthält die herstellerseitig gespeicherten Justierdaten des Drucksensors.' },
    { id: 'ui', name: 'Anzeige und Bedienteil', function: 'Anzeige von SYS/DIA/MAD und Pulsfrequenz, Intervallsteuerung, Alarm- bzw. Meldungsanzeige, Messwertspeicher.', wear: 'mittel' },
    { id: 'power', name: 'Netzteil und Akku', function: 'Energieversorgung; Akku für netzunabhängigen Betrieb.', wear: 'mittel', notes: 'Akkukapazität nimmt mit Alter und Zyklen ab. Arbeiten am Netzteil nur nach Servicehandbuch.' },
    { id: 'cuff', name: 'Manschette (verschiedene Größen)', function: 'Komprimiert die Arterie und überträgt die Oszillationen.', wear: 'hoch', notes: 'Die Manschettengröße muss zum Armumfang passen – eine zu kleine Manschette führt zu falsch hohen, eine zu große zu falsch niedrigen Werten.' },
    { id: 'hose', name: 'Verbindungsschlauch mit Kupplungen', function: 'Pneumatische Verbindung zwischen Gerät und Manschette.', wear: 'hoch', notes: 'Undichte Kupplungen (O-Ringe) und Knicke sind häufige Fehlerquellen.' },
  ],
  signalPath: [
    { id: 'artery', label: 'Arterie (Patient)', desc: 'Pulsierender Blutdruck unter der Manschette' },
    { id: 'cuff', label: 'Manschette', desc: 'Kompression; Pulswellen → Druckoszillationen' },
    { id: 'hose', label: 'Schlauch & Kupplung', desc: 'Pneumatische Übertragung, muss dicht sein' },
    { id: 'pneumatics', label: 'Pumpe & Ventile', desc: 'Aufpumpen, kontrolliertes Ablassen' },
    { id: 'sensor', label: 'Drucksensor', desc: 'Druck → elektrisches Signal (Messbrücke)' },
    { id: 'adc', label: 'Verstärker & A/D-Wandler', desc: 'Digitalisierung, Justierdaten (Nullpunkt, Empfindlichkeit)' },
    { id: 'algo', label: 'Oszillometrische Auswertung', desc: 'Gleichanteil/Oszillationen trennen, MAD, SYS, DIA' },
    { id: 'display', label: 'Anzeige & Speicher', desc: 'Messwerte, Meldungen, Trend' },
  ],
  faults: [
    { symptom: 'Messwerte systematisch zu hoch oder zu niedrig', causes: ['Drucksensor mit Nullpunkt- oder Empfindlichkeitsfehler (Drift)', 'Falsche Manschettengröße (zu klein → zu hoch, zu groß → zu niedrig)', 'Anwendungsfehler (Arm nicht auf Herzhöhe, Bewegung, Sprechen)', 'Vergleichsmessung mit ungeeigneter Methode oder ungeprüftem Referenzgerät'], checks: ['Statische Druckprüfung mit rückführbar kalibriertem Referenzmanometer (mehrere Druckstufen)', 'Abweichungsmuster auswerten (konstant → Nullpunkt, proportional → Empfindlichkeit)', 'Manschettenwahl und Anwendung prüfen', 'Funktionsprüfung mit NIBP-Simulator'] },
    { symptom: 'Messung bricht ab, Meldung „Leck“ oder „Manschette prüfen“', causes: ['Undichte Manschette oder Schlauch', 'Undichte Kupplung / O-Ring', 'Ablassventil undicht', 'Manschette zu locker angelegt'], checks: ['Dichtheitsprüfung (Druckabfall pro Minute)', 'Komponenten einzeln tauschen (Manschette, Schlauch)', 'Sichtprüfung der Kupplungen'] },
    { symptom: 'Aufpumpen dauert sehr lange oder Zieldruck wird nicht erreicht', causes: ['Pumpe verschlissen', 'Großes Leck', 'Lufteinlassfilter der Pumpe verstopft (geräteabhängig)'], checks: ['Aufpumpzeit gegen Vorgabe des Herstellers prüfen', 'Dichtheitsprüfung', 'Servicemenü/Diagnosedaten nach Herstellerunterlagen'] },
    { symptom: 'Meldung „Überdruck“ bzw. „Schlauch abgeknickt“', causes: ['Geknickter oder blockierter Schlauch', 'Ablassventil öffnet nicht', 'Fehler der Drucküberwachung'], checks: ['Schlauchführung prüfen', 'Prüfung der Überdruckabschaltung ausschließlich nach Herstellerverfahren'] },
    { symptom: 'Häufig keine Messwerte („Messung nicht möglich“)', causes: ['Bewegungsartefakte, Arrhythmien, sehr schwacher Puls', 'Manschette falsch angelegt', 'Undichtigkeiten'], checks: ['Anwendung prüfen', 'Funktionsprüfung mit NIBP-Simulator', 'Dichtheitsprüfung'] },
  ],
  wearParts: ['nibp-dev-cuff-set', 'nibp-dev-hose', 'nibp-dev-coupling', 'nibp-dev-intake-filter', 'nibp-dev-battery', 'nibp-dev-module'],
  functionChecks: [
    'Sichtprüfung (Gehäuse, Anzeige, Netzkabel, Manschetten, Schlauch, Kupplungen, Kennzeichnung inkl. Prüfplakette)',
    'Selbsttest beim Einschalten',
    'Statische Druckprüfung mit rückführbar kalibriertem Referenzmanometer bei mehreren Druckstufen (häufig genannte Fehlergrenze ±3 mmHg – nur Orientierung; maßgeblich sind Herstellerangaben und die Vorgaben für die messtechnische Kontrolle)',
    'Dichtheitsprüfung des pneumatischen Systems (Druckabfall pro Minute)',
    'Prüfung der Überdruckabschaltung und der Messzeitbegrenzung nach Herstellerverfahren',
    'Funktionsprüfung mit NIBP-Simulator (mehrere Blutdruckstufen, Wiederholbarkeit, Meldungen)',
    'Elektrische Sicherheit nach IEC 62353 (Umfang und Anlass nach Herstellervorgabe und Betreiberfestlegung)',
  ],
  safety: [
    'Gerät vor Arbeiten gemäß Hygieneplan aufbereiten; Manschetten haben Hautkontakt und gelten als potenziell kontaminiert.',
    'Prüfungen nie am Patienten durchführen, sondern mit Referenzmanometer, Prüfvolumen bzw. Simulator.',
    'Überdruckabschaltung und Messzeitbegrenzung sind Schutzfunktionen – sie dürfen nicht verändert oder umgangen werden.',
    'Justierung bzw. Kalibrierung des Drucksensors ausschließlich nach dem vom Hersteller vorgesehenen Verfahren durch befugtes, geschultes Personal mit rückführbar kalibrierten Prüfmitteln.',
    'Öffnen des Gehäuses und Arbeiten am Netzteil nur nach Servicehandbuch; danach elektrische Sicherheitsprüfung nach IEC 62353.',
  ],
  regulatory:
    'Medizinprodukte zur nichtinvasiven Blutdruckmessung gehören zu den in Anlage 2 der MPBetreibV genannten Medizinprodukten, für die messtechnische Kontrollen (MTK) vorgesehen sind. Fristen nach Herstellerangabe bzw. – falls der Hersteller keine angibt – nach Anlage 2 (aktuelle Fassung der Verordnung beachten). Die MTK darf nur von der zuständigen Behörde oder von Personen durchgeführt werden, die die Anforderungen der Verordnung erfüllen; das Ergebnis wird dokumentiert und das Gerät gekennzeichnet. Nichtinvasive Blutdruckmessgeräte sind nicht in Anlage 1 aufgeführt; sicherheitstechnische Kontrollen erfolgen, soweit der Hersteller sie vorschreibt.',
  instruments: ['pressure-meter', 'patient-simulator', 'safety-analyzer', 'multimeter'],
});
