/*
 * Gerät: Diagnostisches Ultraschallgerät (generisches Lernmodell)
 * Keine realen Hersteller, Modelle, Artikelnummern oder Servicecodes.
 * Zahlenwerte sind, sofern nicht allgemein physikalisch, Beispiele (Lernmodell).
 * Maßgeblich sind immer die Herstellerunterlagen.
 */
MTRL.registerDevice({
  id: 'ultrasound',
  name: 'Diagnostisches Ultraschallgerät',
  icon: '🩻',
  category: 'Bildgebung',
  riskClass: 'Typisch Klasse IIa (diagnostischer Ultraschall); bestimmte Anwendungen/Schallköpfe ggf. höher – maßgeblich ist die Einstufung durch den Hersteller',
  summary:
    'Erzeugt Schnittbilder des Körpers mit Schallwellen im Megahertz-Bereich: Der Schallkopf sendet kurze Schallimpulse aus und empfängt die Echos von Gewebegrenzen. Aus Laufzeit und Echostärke entsteht das B-Bild; Doppler-Verfahren stellen Blutfluss dar. Der Schallkopf ist das empfindlichste und am stärksten beanspruchte Bauteil.',
  principle:
    '<p><b>Puls-Echo-Prinzip:</b> Der Schallkopf (Transducer) sendet einen sehr kurzen Ultraschallimpuls in das Gewebe. An Grenzflächen mit unterschiedlicher <b>akustischer Impedanz</b> (Z = ρ · c, Dichte mal Schallgeschwindigkeit) wird ein Teil des Schalls reflektiert. Das Gerät misst die <b>Laufzeit</b> t des Echos und berechnet daraus die Tiefe:</p>' +
    '<p style="text-align:center"><b>d = c · t / 2</b></p>' +
    '<p>Dabei wird für Weichgewebe eine mittlere Schallgeschwindigkeit von <b>c ≈ 1540 m/s</b> angenommen. Beispiel: Ein Echo nach 65 µs stammt aus etwa 1540 m/s · 65 µs / 2 ≈ 5 cm Tiefe. Der Faktor 2 berücksichtigt Hin- und Rückweg.</p>' +
    '<p><b>Frequenz und Auflösung:</b> Hohe Frequenzen (z. B. 7–15 MHz bei Linearschallköpfen) ergeben eine kurze Wellenlänge (λ = c / f, bei 10 MHz ≈ 0,15 mm) und damit gute Auflösung, werden aber stärker gedämpft – geringe Eindringtiefe. Niedrige Frequenzen (z. B. 2–5 MHz bei Konvex- oder Sektorschallköpfen) dringen tiefer ein, lösen aber gröber auf. Die Werte sind Beispiele; die Angaben stehen im Datenblatt des jeweiligen Schallkopfs.</p>' +
    '<p><b>Aufbau des Schallkopfs:</b> Kern ist ein <b>Array aus vielen piezoelektrischen Elementen</b> (häufig 128 bis mehrere hundert, Werkstoff z. B. Piezokeramik). Ein Spannungsimpuls lässt ein Element schwingen (inverser Piezoeffekt); ein eintreffendes Echo erzeugt eine kleine Spannung (direkter Piezoeffekt). Vor den Elementen liegen <b>Anpassschichten</b> (verringern den Impedanzsprung zur Haut) und eine <b>akustische Linse</b> (meist Silikon, fokussiert in der Schichtdicke). Dahinter dämpft ein <b>Backing</b> das Nachschwingen für kurze Impulse. Jedes Element ist über eine eigene feine Leitung (Mikrokoax) im <b>Schallkopfkabel</b> mit dem Stecker verbunden.</p>' +
    '<p><b>Beamforming:</b> Der <b>Sende-Beamformer</b> steuert Gruppen von Elementen mit fein abgestuften Zeitverzögerungen an und erzeugt so einen fokussierten, ggf. geschwenkten Schallstrahl. Der <b>Empfangs-Beamformer</b> verzögert die Echos der einzelnen Elemente passend und summiert sie (dynamische Fokussierung). Fällt ein Element oder eine Kabelader aus, fehlt dessen Beitrag: Bei Linear- und Konvexschallköpfen erscheint typischerweise ein <b>dunkler Längsstreifen (Schattenstreifen)</b> im Bild unterhalb der betroffenen Stelle.</p>' +
    '<p><b>Signalverarbeitung:</b> Die Echos werden verstärkt, mit der <b>Tiefenausgleichsverstärkung (TGC)</b> entsprechend der Laufzeit nachverstärkt (tiefe Echos sind stärker gedämpft), demoduliert, logarithmisch komprimiert und als Graustufen dargestellt (<b>B-Mode</b>). Weitere Modi: <b>M-Mode</b> (Bewegung über der Zeit), <b>Doppler</b> (Frequenzverschiebung durch bewegte Blutkörperchen: PW-, CW- und Farbdoppler).</p>' +
    '<p><b>Schallausgangsleistung:</b> Das Gerät zeigt den <b>thermischen Index (TI)</b> und den <b>mechanischen Index (MI)</b> als Maß für mögliche biologische Wirkungen an. Anwender folgen dem <b>ALARA-Prinzip</b> (so niedrig wie vernünftigerweise erreichbar). Grenzen der Schallausgangsleistung sind im Gerät festgelegt und dürfen nicht verändert werden.</p>',
  components: [
    { id: 'transducer', name: 'Schallkopf (Transducer)', function: 'Wandelt elektrische Impulse in Ultraschall und Echos zurück in elektrische Signale; Bauformen z. B. Linear-, Konvex-, Sektor(Phased-Array)- und Endokavitärschallkopf.', wear: 'hoch', notes: 'Teuerstes Verschleißteil. Typische Schäden: Linse (Risse, Ablösung, Blasen), ausgefallene Elemente, Kabelbruch, gebrochenes Gehäuse, verbogene Steckerpins. Stoß- und Sturzempfindlich.' },
    { id: 'piezo', name: 'Piezo-Element-Array', function: 'Viele einzeln angesteuerte Piezoelemente; Senden (inverser) und Empfangen (direkter Piezoeffekt).', wear: 'mittel', notes: 'Element-Ausfälle durch Sturz, Stoß, Feuchtigkeit oder Alterung → Schattenstreifen bzw. verminderte Empfindlichkeit.' },
    { id: 'lens', name: 'Akustische Linse & Anpassschichten', function: 'Fokussiert in der Schichtdicke und verbessert die Schallübertragung in die Haut.', wear: 'hoch', notes: 'Angegriffen durch ungeeignete Desinfektions-/Reinigungsmittel, Kratzer, scharfe Gegenstände; Ablösung (Delamination) führt zu Bildfehlern. Nur vom Hersteller freigegebene Mittel verwenden.' },
    { id: 'probe-cable', name: 'Schallkopfkabel und Stecker', function: 'Viele feine Mikrokoaxialleitungen (eine je Element bzw. Kanal) plus Kodierung; Stecker mit zahlreichen Kontakten.', wear: 'hoch', notes: 'Knickstellen am Knickschutz, Überfahren mit Rollen, Quetschen in Schubladen; verbogene oder verschmutzte Kontakte.' },
    { id: 'probe-port', name: 'Schallkopfanschlüsse (Ports)', function: 'Gerätebuchsen mit Verriegelung; Umschaltung zwischen mehreren Schallköpfen.', wear: 'mittel', notes: 'Steckzyklen, Verschmutzung (Gel), mechanische Beschädigung.' },
    { id: 'tx', name: 'Sendeeinheit (Pulser) & Sende-Beamformer', function: 'Erzeugt die Sendeimpulse (Spannungen deutlich über Kleinspannung) mit elementweisen Verzögerungen.', wear: 'niedrig', notes: 'Kein Eingriff ohne Herstellerunterlagen.' },
    { id: 'rx', name: 'Empfänger & Empfangs-Beamformer', function: 'Vorverstärker, TGC, A/D-Wandlung, Verzögern und Summieren der Kanäle.', wear: 'niedrig' },
    { id: 'processor', name: 'Bildverarbeitung / Rechner', function: 'Demodulation, Kompression, Scan-Konvertierung, Doppler-Auswertung, Messungen, Speicherung, DICOM-Schnittstelle.', wear: 'niedrig', notes: 'Festplatte/SSD und Software; Datensicherung und IT-Sicherheit beachten.' },
    { id: 'display', name: 'Monitor & Touchscreen', function: 'Bilddarstellung und Bedienung.', wear: 'mittel', notes: 'Helligkeit und Kontrast beeinflussen die Befundung – Monitoreinstellungen nicht unkontrolliert verändern.' },
    { id: 'controls', name: 'Bedienfeld (Tastatur, Trackball, Drehregler, TGC-Schieber)', function: 'Bedienung, Messungen, Bildparameter.', wear: 'mittel', notes: 'Gel und Desinfektionsmittel verkleben Trackball und Tasten.' },
    { id: 'cooling', name: 'Lüfter & Luftfilter', function: 'Kühlen Beamformer und Rechner.', wear: 'hoch', notes: 'Verstopfte Filter → Überhitzung, Leistungsreduzierung oder Abschaltung.' },
    { id: 'psu', name: 'Netzteil (ggf. mit Trenntransformator)', function: 'Energieversorgung; bei Wagengeräten oft mit Steckdosen für Peripherie (Drucker).', wear: 'niedrig', notes: 'Netzführendes Teil – nur qualifiziertes Personal nach Servicehandbuch. Angeschlossene Peripherie geht in die Ableitstrombewertung des Systems ein.' },
    { id: 'peripherals', name: 'Peripherie (Drucker, Rekorder, Netzwerk)', function: 'Dokumentation und Bildübertragung (z. B. DICOM ins PACS).', wear: 'mittel' },
  ],
  signalPath: [
    { id: 'pulser', label: 'Sender (Pulser)', desc: 'Sendeimpulse mit elementweisen Verzögerungen (Beamforming)' },
    { id: 'port', label: 'Schallkopfanschluss', desc: 'Stecker, viele Kontakte, Kodierung' },
    { id: 'cable', label: 'Schallkopfkabel', desc: 'Eine Mikrokoaxleitung je Element/Kanal' },
    { id: 'elements', label: 'Piezo-Elemente', desc: 'Elektrisch → mechanisch (Senden) und zurück (Empfangen)' },
    { id: 'lens', label: 'Linse & Anpassschicht + Gel', desc: 'Schallübertragung in die Haut, Fokussierung' },
    { id: 'tissue', label: 'Gewebe (Patient)', desc: 'Reflexion an Impedanzgrenzen, Dämpfung mit Tiefe und Frequenz' },
    { id: 'receive', label: 'Empfänger & TGC', desc: 'Vorverstärker, Tiefenausgleich, A/D-Wandlung' },
    { id: 'beamformer', label: 'Empfangs-Beamformer', desc: 'Verzögern und Summieren der Kanäle' },
    { id: 'processing', label: 'Bildverarbeitung', desc: 'Demodulation, Log-Kompression, Scan-Konvertierung, Doppler' },
    { id: 'display', label: 'Monitor / Speicher / PACS', desc: 'B-Bild, Messungen, Dokumentation' },
  ],
  faults: [
    {
      symptom: 'Dunkler Längsstreifen (Schattenstreifen) im Bild, immer an derselben Stelle des Schallkopfs',
      causes: ['Ausgefallenes Piezo-Element bzw. Elementgruppe (Sturz, Stoß, Alterung)', 'Unterbrochene Ader im Schallkopfkabel (Knickstelle)', 'Verbogener oder verschmutzter Kontakt im Schallkopfstecker', 'Seltener: defekter Kanal im Gerät (Beamformer)'],
      checks: ['Luftbild bzw. Abrolltest: Schallkopf sauber und trocken, Bild in Luft betrachten – Nachschwing-Linien (Ringdown) über die ganze Breite gleichmäßig? Lücken markieren Element- oder Kanalausfälle', 'Kabel bei laufendem Bild vorsichtig bewegen – verändert sich der Streifen? (Hinweis auf Kabelbruch)', 'Schallkopf an anderem Port bzw. an einem Vergleichsgerät betreiben (Tauschtest Schallkopf ↔ Gerät)', 'Sondentest mit Schallkopftester bzw. integriertem Elementtest, soweit vom Hersteller vorgesehen', 'Bildqualitätsprüfung mit Gewebephantom'],
    },
    {
      symptom: 'Schallkopf wird nicht erkannt oder Bild bricht sporadisch ab',
      causes: ['Steckerkontakte verschmutzt oder verbogen', 'Kodierleitung/Kabelbruch', 'Verriegelung des Steckers nicht eingerastet', 'Defekter Port'],
      checks: ['Sichtprüfung der Steckerkontakte (Lupe, Beleuchtung)', 'Anderen Port bzw. anderen Schallkopf testen', 'Kabelbewegung bei laufendem Bild', 'Fehlerprotokoll des Gerätes'],
    },
    {
      symptom: 'Bild insgesamt blass, verrauscht oder geringe Eindringtiefe',
      causes: ['Ungünstige Bildeinstellungen (Gain, TGC, Preset, Frequenz)', 'Gealterte Linse oder Anpassschicht, Delamination', 'Empfindlichkeitsverlust des Arrays', 'Zu wenig Kontaktgel / Luftblasen'],
      checks: ['Werkseinstellung bzw. Standardpreset laden', 'Phantommessung: maximale Eindringtiefe, Auflösung, Kontrast im Vergleich zu Referenz-/Vorwerten (Konstanzprüfung)', 'Linse auf Blasen, Risse, Ablösungen prüfen', 'Vergleich mit zweitem Schallkopf gleichen Typs'],
    },
    {
      symptom: 'Störmuster, Streifen oder „Schnee“ im Bild, besonders im Doppler',
      causes: ['Elektromagnetische Störungen durch benachbarte Geräte (z. B. Netzteile, HF-Chirurgie, Leuchten)', 'Beschädigte Kabelschirmung des Schallkopfs', 'Gemeinsame Steckdosenleiste mit Störquellen, Erdungsprobleme'],
      checks: ['Störquellen nacheinander abschalten bzw. Gerät an andere Steckdose', 'Schallkopftausch', 'Oszilloskop: Störspannung an zugänglichen Signalausgängen (Lernmodell) – keine Messung an Sendeleitungen', 'Elektrische Sicherheit (Schutzleiter) prüfen'],
    },
    {
      symptom: 'Linse beschädigt, Gehäuse gerissen oder Kabelmantel verletzt',
      causes: ['Sturz, Einklemmen, Überfahren', 'Ungeeignete Desinfektions- oder Reinigungsmittel, zu lange Einwirkzeit, Eintauchen über die zulässige Tiefe hinaus', 'Alterung'],
      checks: ['Gerät/Schallkopf sofort außer Betrieb nehmen – Gefahr durch Ableitströme am Patienten und Hygienerisiko (nicht mehr sicher aufbereitbar)', 'Sichtprüfung mit Lupe', 'Ableitstrom- bzw. Isolationsprüfung des Schallkopfs nach Herstellervorgabe (besonders bei endokavitären und TEE-Schallköpfen)', 'Instandsetzung bzw. Austausch nur über Hersteller oder qualifizierte Fachwerkstatt'],
    },
    {
      symptom: 'Gerät überhitzt, Lüfter laut oder Gerät schaltet ab',
      causes: ['Verstopfte Luftfilter', 'Lüfter verschlissen', 'Lüftungsöffnungen verdeckt'],
      checks: ['Luftfilter prüfen/reinigen bzw. tauschen (Herstellerintervall)', 'Lüfterlauf hören/prüfen', 'Temperaturmeldungen im Fehlerprotokoll'],
    },
    {
      symptom: 'Trackball/Tasten reagieren träge oder klemmen',
      causes: ['Verschmutzung durch Gel und Desinfektionsmittel', 'Mechanischer Verschleiß'],
      checks: ['Reinigung nach Gebrauchsanweisung (freigegebene Mittel)', 'Funktionstest aller Bedienelemente', 'Austausch des Bedienelements nach Herstellerunterlagen'],
    },
  ],
  wearParts: ['us-transducer-linear', 'us-transducer-convex', 'us-transducer-endocavity', 'us-air-filter', 'us-trackball'],
  functionChecks: [
    'Sichtprüfung: Gehäuse, Rollen/Bremsen, Netzkabel, Monitor, Bedienfeld, Kennzeichnung',
    'Schallköpfe einzeln: Linse (Risse, Blasen, Ablösungen), Gehäuse, Kabel und Knickschutz, Steckerkontakte',
    'Luftbild/Ringdown je Schallkopf: gleichmäßige Nachschwing-Linien über die ganze Breite (keine Lücken = keine Elementausfälle)',
    'Sondentest mit Schallkopftester bzw. integrierter Elementprüfung, soweit vom Hersteller vorgesehen',
    'Bildqualität mit Gewebephantom: Eindringtiefe, axiale und laterale Auflösung, Darstellung von Zysten/Kontrast, Abstandsmessgenauigkeit (Vergleich mit Referenzwerten der Abnahme)',
    'Funktion aller Betriebsarten (B-Mode, M-Mode, Doppler) und Messfunktionen',
    'Anzeige von TI/MI vorhanden; Speicherung, Druck und Bildübertragung (z. B. DICOM)',
    'Lüfter und Luftfilter; Bedienelemente',
    'Elektrische Sicherheit nach IEC 62353 inkl. Ableitströme der Schallköpfe (Anwendungsteile); bei Wagengeräten mit Peripherie das gesamte System betrachten',
  ],
  safety: [
    'Schallköpfe vor jeder Prüfung gemäß Hygieneplan und Herstellerangaben aufbereiten; endokavitäre Schallköpfe (z. B. vaginal/rektal, TEE) erfordern eine Aufbereitung nach ihrer Risikoeinstufung (in der Regel mindestens Desinfektion mit nachgewiesener Wirksamkeit gemäß Herstellerangaben).',
    'Schallköpfe mit beschädigter Linse, gerissenem Gehäuse oder verletztem Kabelmantel sofort außer Betrieb nehmen: Gefahr erhöhter Ableitströme am Patienten und nicht mehr sichere Aufbereitung.',
    'Der Sender arbeitet mit Spannungen über der Kleinspannung. Öffnen des Gerätes, Arbeiten an Netzteil, Sende-/Empfangselektronik und an Schallköpfen nur durch vom Hersteller geschultes Personal nach Servicehandbuch.',
    'Schallausgangsleistung und deren Begrenzungen dürfen nicht verändert werden; TI/MI-Anzeige muss funktionieren (ALARA-Prinzip).',
    'Nur vom Hersteller freigegebene Reinigungs-, Desinfektionsmittel und Kontaktgele verwenden – ungeeignete Mittel zerstören Linse und Gehäuse.',
    'Nach Reparatur oder Schallkopftausch: Funktionsprüfung, Bildqualitätskontrolle und Wiederholungsprüfung nach IEC 62353.',
  ],
  regulatory:
    'Diagnostische Ultraschallgeräte gehören nicht zu den in Anlage 1 der MPBetreibV genannten Geräten (bei den bildgebenden Verfahren nennt Anlage 1 die Kernspinresonanz) und nicht zu den Produkten mit messtechnischen Kontrollen nach Anlage 2; sicherheitstechnische Kontrollen sind durchzuführen, wenn und wie der Hersteller sie vorschreibt. Instandhaltung (Wartung, Inspektion, Instandsetzung) nach Herstellerangaben durch qualifiziertes Personal. Gerätespezifische Norm: IEC 60601-2-37; Wiederholungsprüfungen der elektrischen Sicherheit nach IEC 62353. Regelmäßige Bildqualitäts- bzw. Konstanzprüfungen mit Phantom sind gute Praxis und können von Hersteller, Fachgesellschaft oder Betreiber gefordert sein. Angaben stets mit der geltenden Fassung der Vorschriften abgleichen.',
  instruments: ['safety-analyzer', 'multimeter', 'oscilloscope'],
});
