/*
 * Gerät: Spritzenpumpe – generisches Lernmodell
 * Keine realen Hersteller, Modelle oder Servicecodes. Bauteilbezeichnungen,
 * Grenzwerte und Abläufe sind Beispiele für den Lernkontext.
 */
MTRL.registerDevice({
  id: 'syringe-pump',
  name: 'Spritzenpumpe',
  icon: '💉',
  category: 'Infusionstechnik',
  riskClass: 'Typisch Klasse IIb (aktives Produkt zur Abgabe von Arzneimitteln mit potenziell gefährlicher Wirkung); die Einstufung hängt von der Zweckbestimmung des Herstellers ab',
  summary:
    'Fördert Medikamente aus einer Einmalspritze (z. B. 20 oder 50 ml) sehr gleichmäßig auch bei kleinen Raten (bis unter 1 ml/h) – typisch für hochwirksame Medikamente wie Katecholamine, Analgetika oder Insulin.',
  principle:
    '<p>Ein <b>Schrittmotor</b> treibt über ein Getriebe eine <b>Gewindespindel</b> an. Eine <b>Spindelmutter</b> (häufig als zu öffnende Halbmutter ausgeführt) setzt die Drehung in eine lineare Bewegung des <b>Antriebskopfes</b> um, der den <b>Spritzenkolben</b> vorschiebt. Das geförderte Volumen ergibt sich aus <b>Kolbenweg × Innenquerschnitt der Spritze</b>: Schon kleine Unterschiede im Innendurchmesser verändern die Förderrate deutlich. Deshalb muss der <b>Spritzentyp</b> (Hersteller und Größe) korrekt erkannt bzw. ausgewählt werden.</p>' +
    '<p>Ein <b>Kraftsensor</b> im Antriebskopf misst die Kraft auf den Kolben und erkennt so einen Verschluss (Okklusion). Weitere Sensoren erkennen Spritzengröße (Spritzenhalter), korrekt eingelegten Kolben und Flügel sowie die Position (Restvolumen, „Spritze fast leer“). Nach einer Okklusion steht die Leitung unter Druck – die Pumpe reduziert danach den <b>Bolus</b> (Rückzug des Antriebs), damit beim Lösen des Verschlusses keine ungewollte Medikamentenmenge zum Patienten gelangt.</p>' +
    '<p>Beim Start muss zunächst das <b>mechanische Spiel</b> zwischen Antrieb, Kolben und Spritze überwunden werden. Bei sehr kleinen Raten kann es daher einige Minuten dauern, bis die Förderung stabil ist (Anlaufverhalten) – wichtig bei kurz wirksamen Medikamenten.</p>' +
    '<p class="muted">Lernmodell: Aufbau, Bezeichnungen und Werte sind generisch und entsprechen keinem bestimmten Hersteller. Besondere Festlegungen für Infusionspumpen (einschließlich Spritzenpumpen) enthält u. a. IEC 60601-2-24.</p>',
  components: [
    { id: 'psu', name: 'Netzteil', function: 'Versorgt Pumpe und Ladeschaltung aus dem Netz, stellt die Netztrennung sicher.', wear: 'niedrig', notes: 'Arbeiten am Netzteil nur durch qualifiziertes Personal nach Herstellerunterlagen.' },
    { id: 'battery', name: 'Akkupack', function: 'Überbrückt Netzausfall und Transport.', wear: 'hoch', notes: 'Kapazitätsverlust und steigender Innenwiderstand durch Alterung.' },
    { id: 'cpu', name: 'Steuer- und Überwachungsrechner', function: 'Berechnet Motortakt aus Rate und Spritzendaten, überwacht Sensoren und Alarmgrenzen redundant.', wear: 'niedrig' },
    { id: 'motor', name: 'Schrittmotor mit Getriebe', function: 'Erzeugt die fein dosierbare Drehbewegung.', wear: 'mittel' },
    { id: 'spindle', name: 'Gewindespindel & Spindelmutter', function: 'Wandelt Drehung in Linearbewegung; Steigung bestimmt Weg pro Umdrehung.', wear: 'mittel', notes: 'Verschleiß und Verschmutzung erhöhen Spiel und Reibung.' },
    { id: 'head', name: 'Antriebskopf mit Kolbenhalter', function: 'Fasst den Spritzenkolben, enthält Kraftsensor (Okklusion) und Kolbenerkennung.', wear: 'mittel', notes: 'Mechanisch stark beansprucht (Einlegen, Stöße).' },
    { id: 'holder', name: 'Spritzenhalter mit Größenerkennung', function: 'Fixiert die Spritze und erfasst den Spritzendurchmesser bzw. die Größe.', wear: 'mittel' },
    { id: 'position', name: 'Wegsensor', function: 'Erfasst die Kolbenposition (Restvolumen, Voralarm „Spritze fast leer“).', wear: 'niedrig' },
    { id: 'ui', name: 'Display, Tastatur, Alarmgeber', function: 'Bedienung, Medikamentenauswahl, Status- und Alarmanzeige.', wear: 'mittel' },
    { id: 'clamp', name: 'Stativklemme / Andockung', function: 'Befestigung am Ständer oder in einer Andockstation.', wear: 'mittel' },
  ],
  signalPath: [
    { id: 'input', label: 'Eingabe', desc: 'Rate, Volumen, Spritzentyp, Druckstufe' },
    { id: 'cpu', label: 'Steuerrechner', desc: 'Rate ÷ Kolbenquerschnitt → Vorschubgeschwindigkeit' },
    { id: 'motor', label: 'Schrittmotor & Getriebe', desc: 'Fein abgestufte Drehbewegung' },
    { id: 'spindle', label: 'Spindel & Mutter', desc: 'Lineare Bewegung des Antriebskopfes' },
    { id: 'syringe', label: 'Spritze', desc: 'Kolbenweg × Querschnitt = Volumen' },
    { id: 'line', label: 'Infusionsleitung', desc: 'Leitung zum Patienten, Rückschlagventil' },
    { id: 'sensors', label: 'Kraft-, Weg-, Größensensoren', desc: 'Okklusion, Restvolumen, Spritzenerkennung' },
    { id: 'alarm', label: 'Überwachung & Alarm', desc: 'Unabhängige Prüfung, Alarmierung, Abschaltung' },
  ],
  faults: [
    { symptom: 'Fördervolumen weicht deutlich ab', causes: ['Falscher Spritzentyp gewählt/erkannt', 'Nicht freigegebene Spritze', 'Spindel/Mutter verschlissen oder verschmutzt'], checks: ['Spritzenauswahl prüfen', 'Förderratenprüfung mit Pumpenprüfgerät', 'Prüfung mit freigegebener Spritze'] },
    { symptom: 'Okklusionsalarm zu spät oder zu früh', causes: ['Falsche Druckstufe eingestellt', 'Kraftsensor dejustiert/defekt', 'Kolben nicht korrekt eingelegt'], checks: ['Okklusionstest mit Pumpenprüfgerät', 'Kraftsensorprüfung nur nach Herstellervorgabe'] },
    { symptom: 'Verzögerter Förderbeginn bei kleinen Raten', causes: ['Mechanisches Spiel nicht vorgespannt (kein Vorschub beim Einlegen)', 'Verschleiß an Mutter/Antriebskopf'], checks: ['Anlaufkurve mit Pumpenprüfgerät', 'Vorgehen laut Gebrauchsanweisung (Vorfüllen/Entlüften über die Pumpe)'] },
    { symptom: 'Meldung „Spritze nicht erkannt“ / „Kolben nicht eingelegt“', causes: ['Spritzenhalter oder Kolbenerkennung verschmutzt/beschädigt', 'Spritze nicht korrekt eingelegt'], checks: ['Sichtprüfung, Reinigung', 'Erkennung mit verschiedenen Spritzengrößen prüfen'] },
    { symptom: 'Kurze Akkulaufzeit / Abschaltung beim Transport', causes: ['Akku gealtert', 'Akku nicht geladen', 'Ladeschaltung defekt'], checks: ['Akkudaten im Ereignisprotokoll', 'Lasttest und Laufzeittest', 'Tauschtest mit bekannt gutem Akku'] },
  ],
  wearParts: ['sp-battery-pack', 'sp-syringe-clamp', 'sp-drive-nut', 'sp-pole-clamp', 'sp-power-cord', 'sp-keypad'],
  functionChecks: [
    'Sichtprüfung (Gehäuse, Spritzenhalter, Antriebskopf, Netzkabel, Kennzeichnung)',
    'Selbsttest beim Einschalten, Akku- und Netzanzeige',
    'Spritzenerkennung mit den freigegebenen Spritzengrößen',
    'Förderratenprüfung mit Pumpenprüfgerät (inkl. kleiner Rate, Anlaufverhalten beachten)',
    'Okklusionsalarm und Bolusreduktion nach Herstellervorgabe',
    'Netzausfall-Umschaltung und Akkulaufzeit',
    'Alarmsystem (u. a. „Spritze fast leer“, „Spritze leer“)',
    'Elektrische Sicherheit nach IEC 62353 (Schutzklasse und Anwendungsteil laut Typschild)',
  ],
  safety: [
    'Pumpe vor Arbeiten gemäß Hygieneplan aufbereiten; Medikamentenreste entfernen.',
    'Okklusionserkennung, Bolusreduktion und Alarmfunktionen dürfen nicht verändert oder überbrückt werden; Justage des Kraftsensors nur nach Servicehandbuch.',
    'Mechanische Arbeiten am Antrieb (Spindel, Mutter, Antriebskopf) nur durch geschultes Personal mit Herstellerunterlagen – Fehler wirken direkt auf die Dosiergenauigkeit.',
    'Li-Ion-Akkus nicht kurzschließen oder öffnen; beschädigte Akkus sicher lagern und fachgerecht entsorgen.',
    'Nach Instandsetzung Funktions- und Sicherheitsprüfung nach Herstellervorgabe und IEC 62353.',
  ],
  regulatory: 'Spritzenpumpen gehören als Infusionspumpen zu den in Anlage 1 der MPBetreibV aufgeführten aktiven Medizinprodukten: u. a. Funktionsprüfung und Einweisung vor Inbetriebnahme, Medizinproduktebuch und sicherheitstechnische Kontrollen nach Herstellerangaben (ohne Herstellerangabe in der Regel spätestens alle zwei Jahre). Maßgeblich ist die jeweils gültige Fassung der Verordnung.',
  instruments: ['pump-analyzer', 'multimeter', 'safety-analyzer'],
});
