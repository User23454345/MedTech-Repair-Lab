/*
 * Gerät: 12-Kanal-EKG-Schreiber / Diagnostik-EKG (generisches Lernmodell)
 * Keine realen Hersteller, Modelle oder Servicecodes. Aufbau und Bezeichnungen
 * sind verallgemeinert; maßgeblich sind immer die Herstellerunterlagen.
 */
MTRL.registerDevice({
  id: 'ecg-device',
  name: '12-Kanal-EKG-Schreiber (Diagnostik-EKG)',
  icon: '📈',
  category: 'Diagnostik',
  riskClass: 'Typisch Klasse IIa (diagnostisches Gerät zur Messung elektrischer Herzsignale); Einstufung hängt von der Zweckbestimmung des Herstellers ab',
  summary:
    'Zeichnet das Ruhe-EKG mit 12 Standardableitungen auf, stellt es auf Display und Thermopapier dar, speichert es und überträgt es an die Klinik-IT. Viele Geräte liefern zusätzlich Messwerte (Intervalle, Achse) und einen automatischen Vorbefund, der ärztlich überprüft werden muss.',
  principle:
    '<p>Das Herz erzeugt bei jeder Erregung elektrische Potentialänderungen, die an der Körperoberfläche als Spannungen von etwa <b>0,5 bis 3 mV</b> messbar sind. Beim 12-Kanal-EKG werden <b>10 Elektroden</b> angelegt: vier an den Extremitäten (RA/R, LA/L, LL/F, RL/N) und sechs an der Brustwand (V1–V6). Daraus bildet das Gerät <b>12 Ableitungen</b>:</p>' +
    '<ul><li><b>Einthoven</b> (bipolar): I = LA − RA, II = LL − RA, III = LL − LA</li>' +
    '<li><b>Goldberger</b> (augmentiert, unipolar): aVR, aVL, aVF – jeweils gegen den Mittelwert der beiden anderen Extremitätenelektroden</li>' +
    '<li><b>Wilson</b> (Brustwand, unipolar): V1–V6 gegen die <b>Wilson-Zentralklemme</b> (Mittelwert aus RA, LA, LL)</li></ul>' +
    '<p>Die Elektrode am rechten Bein (RL/N) dient nicht als Messelektrode, sondern als <b>Bezugs- bzw. Ansteuerelektrode</b> („Right-Leg-Drive“), die Gleichtaktstörungen (z. B. 50-Hz-Netzbrumm) aktiv verringert.</p>' +
    '<p>Das analoge Front-End besteht aus <b>Eingangsschutz</b> (defibrillationsfeste Schutzbeschaltung), <b>Instrumentenverstärkern</b> mit hoher Gleichtaktunterdrückung und einer <b>galvanischen Trennung</b> (Isolationsbarriere) zum Netzteil. Nach der Digitalisierung folgen Filter (Basislinie, Netzfrequenz, Muskelartefakte), Schrittmacherimpulserkennung, Vermessung und Darstellung.</p>' +
    '<p>Standarddarstellung: <b>10 mm/mV</b> Amplitude und <b>25 mm/s</b> (oder 50 mm/s) Papiergeschwindigkeit. Für die Diagnostik ist ein weiter Frequenzbereich nötig (untere Grenzfrequenz typischerweise etwa 0,05 Hz, obere mindestens etwa 150 Hz) – zu starke Filterung kann z. B. ST-Strecken verfälschen. Maßgeblich sind die Angaben des Herstellers und die einschlägige Gerätenorm.</p>',
  components: [
    { id: 'cable', name: 'Patientenkabel (10 Ableitkabel)', function: 'Überträgt die Elektrodenpotentiale zum Gerät; ggf. mit integrierten Schutzwiderständen (herstellerspezifisch).', wear: 'hoch', notes: 'Häufigste Fehlerquelle: Aderbrüche an Knickstellen und Steckern, verschlissene Clips/Druckknöpfe.' },
    { id: 'electrodes', name: 'Elektroden (Saug-, Klammer- oder Klebeelektroden)', function: 'Elektrischer Kontakt zur Haut (Ag/AgCl-Übergang, Elektrodengel).', wear: 'hoch', notes: 'Ausgetrocknete oder verschmutzte Elektroden verursachen Störungen und Nulllinienschwankungen.' },
    { id: 'protection', name: 'Eingangsschutz', function: 'Schützt den Verstärker vor hohen Spannungen, z. B. bei Defibrillation (Schutzwiderstände, Überspannungsableiter).', wear: 'niedrig', notes: 'Teil der Defibrillationsfestigkeit – Schutzfunktion, Arbeiten nur nach Herstellerunterlagen.' },
    { id: 'frontend', name: 'Analoges Front-End mit Isolationsbarriere', function: 'Instrumentenverstärker, Right-Leg-Drive, Elektrodenüberwachung (Lead-off), galvanische Trennung.', wear: 'niedrig', notes: 'Isolationsbarriere ist sicherheitsrelevant (Anwendungsteil Typ CF) – kein Eingriff ohne Herstellerunterlagen.' },
    { id: 'adc', name: 'A/D-Wandler & Signalverarbeitung', function: 'Digitalisierung, Filter, Schrittmachererkennung, Vermessung, ggf. automatischer Vorbefund.', wear: 'niedrig' },
    { id: 'cpu', name: 'Hauptplatine', function: 'Bedienung, Speicherung, Ausdruck, Datenübertragung.', wear: 'niedrig' },
    { id: 'display', name: 'Display und Bedienung', function: 'Kurvendarstellung, Patientendaten, Einstellungen (Filter, Verstärkung, Vorschub).', wear: 'mittel' },
    { id: 'printer', name: 'Thermodrucker (Druckkopf, Andruckwalze, Papierantrieb)', function: 'Druckt das EKG mit definierter Amplitude und Papiergeschwindigkeit auf Thermopapier.', wear: 'mittel', notes: 'Druckkopf verschmutzt oder einzelne Heizelemente defekt → helle Streifen; Antrieb verschlissen → falsche Zeitachse.' },
    { id: 'power', name: 'Netzteil und Akku', function: 'Energieversorgung, netzunabhängiger Betrieb am Patientenbett.', wear: 'mittel', notes: 'Arbeiten am Netzteil nur nach Servicehandbuch.' },
    { id: 'interface', name: 'Datenschnittstellen', function: 'Übertragung an Klinik-IT/EKG-Archiv (LAN, WLAN, Speichermedien).', wear: 'niedrig' },
  ],
  signalPath: [
    { id: 'heart', label: 'Herz (Patient)', desc: 'Elektrische Erregung, Potentiale an der Körperoberfläche' },
    { id: 'electrodes', label: 'Elektroden', desc: 'Haut-Elektroden-Übergang (Ag/AgCl, Gel)' },
    { id: 'cable', label: 'Patientenkabel', desc: '10 Ableitkabel, ggf. Schutzwiderstände' },
    { id: 'protection', label: 'Eingangsschutz', desc: 'Defibrillationsfeste Schutzbeschaltung' },
    { id: 'amp', label: 'Verstärker & Isolationsbarriere', desc: 'Differenzverstärkung, Gleichtaktunterdrückung, Trennung' },
    { id: 'adc', label: 'A/D-Wandler & Filter', desc: 'Digitalisierung, Basislinien-/Netzfilter' },
    { id: 'leads', label: 'Ableitungsbildung', desc: 'Einthoven, Goldberger, Wilson (12 Ableitungen)' },
    { id: 'output', label: 'Display, Drucker, Archiv', desc: '10 mm/mV, 25 mm/s, Übertragung' },
  ],
  faults: [
    { symptom: 'Einzelne Ableitungen zeigen „Elektrode ab“ oder Nulllinie', causes: ['Aderbruch im Patientenkabel', 'Elektrode ohne Hautkontakt bzw. ausgetrocknet', 'Clip/Druckknopf verschlissen'], checks: ['EKG-Simulator: welche Ableitungen fehlen? (Rückschluss auf die Elektrode)', 'Durchgangsprüfung der einzelnen Adern nach Herstellerangaben', 'Tauschtest mit bekannt gutem Kabel'] },
    { symptom: 'Starker 50-Hz-Brumm / Störungen in allen Ableitungen', causes: ['Hoher Haut-Elektroden-Übergangswiderstand', 'RL/N-Elektrode ohne Kontakt', 'Schirm im Patientenkabel defekt', 'Störquellen in der Umgebung (Netzkabel nahe am Patientenkabel)'], checks: ['Elektroden und Hautvorbereitung prüfen', 'Simulator-Test (störungsfreie Signalquelle)', 'Kabel tauschen', 'Umgebung prüfen'] },
    { symptom: 'Ausdruck mit hellen Längsstreifen oder blass', causes: ['Druckkopf verschmutzt', 'Einzelne Heizelemente defekt', 'Ungeeignetes oder falsch eingelegtes Thermopapier'], checks: ['Testausdruck', 'Druckkopfreinigung nach Gebrauchsanweisung', 'Originalpapier verwenden'] },
    { symptom: 'Zeitachse/Herzfrequenz im Ausdruck unplausibel', causes: ['Falsche Vorschubeinstellung (25 statt 50 mm/s)', 'Papierantrieb/Andruckwalze verschlissen (Schlupf)'], checks: ['Einstellungen prüfen', 'Ausdruck eines Simulatorsignals mit bekannter Frequenz ausmessen'] },
    { symptom: 'Amplituden zu klein/zu groß', causes: ['Verstärkungseinstellung (5/10/20 mm/mV)', 'Fehler im Messkanal'], checks: ['Kalibrierimpuls 1 mV mit EKG-Simulator → muss 10 mm ergeben (bei 10 mm/mV)'] },
  ],
  wearParts: ['ecg-dev-patient-cable', 'ecg-dev-suction-electrodes', 'ecg-dev-limb-clamps', 'ecg-dev-adhesive-electrodes', 'ecg-dev-thermal-paper', 'ecg-dev-printhead', 'ecg-dev-platen-roller', 'ecg-dev-battery'],
  functionChecks: [
    'Sichtprüfung (Gehäuse, Display, Netzkabel, Patientenkabel, Elektroden, Kennzeichnung)',
    'Selbsttest beim Einschalten, Akku-/Netzanzeige',
    'EKG-Simulator: alle 12 Ableitungen vorhanden und korrekt zugeordnet (Polarität, Ableitungsbildung)',
    'Kalibrierimpuls 1 mV → 10 mm bei 10 mm/mV; Frequenzgang bzw. Sinussignale nach Herstellervorgabe',
    'Elektrodenüberwachung (Lead-off) für jede Elektrode',
    'Ausdruck: Druckbild, Papiergeschwindigkeit (25/50 mm/s) mit bekannter Frequenz ausgemessen',
    'Datenübertragung/Archivierung (falls genutzt)',
    'Elektrische Sicherheit nach IEC 62353 (Anwendungsteil typischerweise Typ CF, defibrillationsgeschützt)',
  ],
  safety: [
    'Gerät vor Arbeiten gemäß Hygieneplan aufbereiten; Elektroden und Patientenkabel haben Hautkontakt.',
    'Prüfungen mit EKG-Simulator, nicht am Patienten.',
    'Eingangsschutz (Defibrillationsfestigkeit) und Isolationsbarriere sind Schutzfunktionen – Öffnen und Arbeiten daran nur durch qualifiziertes, vom Hersteller geschultes Personal nach Servicehandbuch.',
    'Nur freigegebene Patientenkabel verwenden – Schutzwiderstände und Defibrillationsfestigkeit sind Teil des geprüften Systems.',
    'Nach Öffnen des Geräts oder Tausch netzführender Teile: elektrische Sicherheitsprüfung nach IEC 62353.',
  ],
  regulatory:
    'Diagnostische EKG-Geräte sind weder in Anlage 1 (u. a. Funktionsprüfung und Einweisung vor Inbetriebnahme, sicherheitstechnische Kontrollen) noch in Anlage 2 (messtechnische Kontrollen) der MPBetreibV ausdrücklich genannt. Sicherheitstechnische Kontrollen und Prüfungen erfolgen nach Herstellervorgabe; Umfang und Fristen elektrischer Wiederholungsprüfungen (z. B. nach IEC 62353) legt der Betreiber auf dieser Grundlage fest. Allgemeine Betreiberpflichten (Instandhaltung, Einweisung, Bestandsverzeichnis) gelten unabhängig davon.',
  instruments: ['ecg-simulator', 'multimeter', 'oscilloscope', 'safety-analyzer'],
});
