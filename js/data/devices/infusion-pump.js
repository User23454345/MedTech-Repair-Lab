/*
 * Gerät: Volumetrische Infusionspumpe (peristaltisch) – generisches Lernmodell
 * Keine realen Hersteller, Modelle oder Servicecodes. Bauteilbezeichnungen,
 * Grenzwerte und Abläufe sind Beispiele für den Lernkontext.
 */
MTRL.registerDevice({
  id: 'infusion-pump',
  name: 'Infusionspumpe (volumetrisch)',
  icon: '💧',
  category: 'Infusionstechnik',
  riskClass: 'Typisch Klasse IIb (aktives Produkt zur Abgabe von Arzneimitteln mit potenziell gefährlicher Wirkung); die Einstufung hängt von der Zweckbestimmung des Herstellers ab',
  summary:
    'Fördert Infusionslösungen und Medikamente über ein Infusionsset mit einstellbarer, konstanter Förderrate (ml/h) aus Beutel oder Flasche in das Gefäßsystem des Patienten und überwacht dabei Druck, Luft und Fördervolumen.',
  principle:
    '<p>Eine <b>volumetrische Infusionspumpe</b> arbeitet meist nach dem <b>Peristaltikprinzip</b>: Ein elastisches <b>Pumpsegment</b> des Infusionssets wird in die Pumpe eingelegt. Mehrere nacheinander bewegte <b>Pumpfinger</b> (linear-peristaltisch) oder Rollen drücken den Schlauch fortlaufend zu und schieben so ein definiertes Volumen pro Motorumdrehung weiter. Die Förderrate ergibt sich aus <b>Volumen pro Takt × Taktfrequenz</b>; deshalb hängt die Genauigkeit wesentlich vom Zustand und Typ des Infusionssets ab (nur vom Hersteller freigegebene Sets verwenden).</p>' +
    '<p>Zur Patientensicherheit überwacht die Pumpe den <b>Druck vor und hinter dem Pumpsegment</b> (Okklusionserkennung, Druckstufen einstellbar), <b>Luft im Schlauch</b> (meist Ultraschall-Luftblasendetektor), die <b>geschlossene Pumpentür</b> mit Schlauchklemme (Schutz vor unkontrolliertem Freifluss, „Free-Flow“) und – je nach Gerät – die Tropfenzahl über einen <b>Tropfensensor</b>. Bei vielen Geräten prüfen sich zwei voneinander unabhängige Rechner (Steuerung und Überwachung) gegenseitig.</p>' +
    '<p>Die Energieversorgung erfolgt über ein <b>Netzteil</b> und einen <b>Akku</b> (meist Li-Ion oder NiMH). Der Akku überbrückt Netzausfall und <b>Patiententransport</b> – er ist damit für die Therapiesicherheit wesentlich. Bei sinkender Akkuspannung warnt die Pumpe („Akku schwach“) und stoppt vor dem Erreichen der Unterspannungsgrenze mit Alarm.</p>' +
    '<p class="muted">Lernmodell: Aufbau, Bezeichnungen und Werte sind generisch und entsprechen keinem bestimmten Hersteller. Besondere Festlegungen für Infusionspumpen enthält u. a. die Normenreihe IEC 60601 (Teil 2-24 für Infusionspumpen und -regler).</p>',
  components: [
    { id: 'psu', name: 'Netzteil', function: 'Wandelt Netzspannung in Kleinspannung, versorgt die Pumpe und die Ladeschaltung, stellt die Netztrennung sicher.', wear: 'niedrig', notes: 'Arbeiten am Netzteil nur durch qualifiziertes Personal nach Herstellerunterlagen.' },
    { id: 'charger', name: 'Ladeschaltung / Akkumanagement', function: 'Lädt den Akku (bei Li-Ion: Konstantstrom, dann Konstantspannung), schätzt den Ladezustand, schaltet bei Netzausfall unterbrechungsfrei auf Akku um.', wear: 'niedrig' },
    { id: 'battery', name: 'Akkupack', function: 'Überbrückt Netzausfall und Transport; enthält Zellen, Schutzschaltung und Temperaturfühler.', wear: 'hoch', notes: 'Alterung durch Ladezyklen, Zeit und Wärme: Kapazität sinkt, Innenwiderstand steigt.' },
    { id: 'cpu', name: 'Steuer- und Überwachungsrechner', function: 'Steuert den Antrieb, berechnet Förderrate und Volumen, prüft Sensorsignale und Alarmgrenzen; zweiter Rechner überwacht unabhängig.', wear: 'niedrig' },
    { id: 'mechanism', name: 'Pumpmechanik (Peristaltik)', function: 'Schrittmotor mit Getriebe, Nockenwelle und Pumpfingern; verdrängt die Flüssigkeit im Pumpsegment.', wear: 'mittel', notes: 'Verschleiß an Lagern und Fingern; Verschmutzung durch ausgelaufene Lösungen.' },
    { id: 'door', name: 'Pumpentür mit Schlauchklemme', function: 'Fixiert das Pumpsegment, schließt die Freifluss-Klemme beim Öffnen, Türsensor meldet den Zustand.', wear: 'mittel', notes: 'Scharnier und Verriegelung sind mechanisch belastet.' },
    { id: 'pressure', name: 'Drucksensoren (vor/hinter dem Pumpsegment)', function: 'Erkennen Verschlüsse (Okklusion) patientenseitig und behälterseitig.', wear: 'niedrig', notes: 'Sicherheitsfunktion – Prüfung und Justage nur nach Herstellervorgabe.' },
    { id: 'air', name: 'Luftblasendetektor', function: 'Erkennt Luft im Schlauch (meist per Ultraschall) und stoppt die Förderung mit Alarm.', wear: 'niedrig', notes: 'Sicherheitsfunktion – Sensorflächen sauber halten.' },
    { id: 'drop', name: 'Tropfensensor (optional)', function: 'Erfasst Tropfen in der Tropfkammer, erkennt leeren Behälter.', wear: 'mittel' },
    { id: 'ui', name: 'Display, Tastatur, Alarmgeber', function: 'Eingabe von Rate/Volumen, Anzeige von Status und Alarmen, akustische und optische Alarmierung.', wear: 'mittel', notes: 'Folientastaturen verschleißen und leiden unter Desinfektionsmitteln.' },
    { id: 'clamp', name: 'Stativklemme / Gehäuse', function: 'Befestigung am Infusionsständer oder an einer Andockstation.', wear: 'mittel' },
    { id: 'interface', name: 'Schnittstellen', function: 'Andockstation, Rufanlage oder Datenanbindung (je nach Gerät).', wear: 'niedrig' },
  ],
  signalPath: [
    { id: 'input', label: 'Eingabe', desc: 'Rate, Volumenvorgabe (VTBI), Druckstufe, Medikament' },
    { id: 'cpu', label: 'Steuerrechner', desc: 'Berechnet Motortakt aus Rate und Set-Kalibrierung' },
    { id: 'drive', label: 'Motortreiber & Schrittmotor', desc: 'Setzt Takte in Drehbewegung um' },
    { id: 'mech', label: 'Nockenwelle & Pumpfinger', desc: 'Peristaltische Verdrängung im Pumpsegment' },
    { id: 'set', label: 'Infusionsset', desc: 'Pumpsegment, Schlauch, Rückschlagventile, Zugang' },
    { id: 'sensors', label: 'Druck-, Luft-, Türsensoren', desc: 'Überwachen den Flüssigkeitsweg' },
    { id: 'monitor', label: 'Überwachungsrechner', desc: 'Unabhängige Plausibilitätsprüfung, Abschaltpfad' },
    { id: 'alarm', label: 'Anzeige & Alarm', desc: 'Status, Volumen, Alarme, Akkuzustand' },
    { id: 'power', label: 'Energieversorgung', desc: 'Netzteil, Ladeschaltung, Akku, Umschaltung' },
  ],
  faults: [
    { symptom: 'Pumpe meldet „Akku schwach/leer“ kurz nach Netztrennung oder schaltet beim Transport ab', causes: ['Akku gealtert (Innenwiderstand erhöht, Kapazität vermindert)', 'Akku vor Gebrauch nicht geladen', 'Ladeschaltung/Netzteil defekt', 'Akkukontakte korrodiert/verbogen'], checks: ['Ereignisprotokoll und Akkudaten (Zyklen, Alter)', 'Leerlaufspannung und Spannung unter definierter Last', 'Kapazitäts-/Laufzeittest', 'Tauschtest mit bekannt gutem Akku'] },
    { symptom: 'Förderrate zu gering (Volumen nach Infusionsende zu klein)', causes: ['Falsches oder nicht freigegebenes Infusionsset', 'Pumpsegment ermüdet (lange Liegedauer)', 'Unterdruck/zu tief hängender Behälter', 'Pumpmechanik verschlissen'], checks: ['Förderratenprüfung mit Pumpenprüfgerät', 'Set-Typ und Einstellung kontrollieren', 'Prüfung mit neuem Set'] },
    { symptom: 'Okklusionsalarm ohne erkennbaren Verschluss', causes: ['Abgeknickter Schlauch / geschlossene Klemme', 'Set nicht korrekt eingelegt', 'Drucksensor verschmutzt oder dejustiert'], checks: ['Set und Zugang prüfen', 'Okklusionstest mit Pumpenprüfgerät', 'Sensorprüfung nur nach Herstellervorgabe'] },
    { symptom: 'Häufiger Luftalarm', causes: ['Mikroblasen/Ausgasen der Lösung', 'Set nicht vollständig im Detektor eingelegt', 'Detektorfläche verschmutzt', 'Detektor defekt'], checks: ['Set richtig einlegen, entlüften', 'Detektor nach Herstellervorgabe reinigen', 'Luftdetektortest laut Servicehandbuch'] },
    { symptom: 'Tür schließt nicht / Meldung „Tür offen“', causes: ['Verriegelung/Scharnier beschädigt', 'Verschmutzung (eingetrocknete Lösung)', 'Türsensor defekt'], checks: ['Sichtprüfung, Reinigung', 'Funktionsprüfung Freifluss-Klemme', 'Türsensor laut Servicehandbuch'] },
  ],
  wearParts: ['ip-battery-pack', 'ip-door-latch', 'ip-pole-clamp', 'ip-drop-sensor', 'ip-power-cord', 'ip-keypad'],
  functionChecks: [
    'Sichtprüfung (Gehäuse, Tür, Klemme, Netzkabel, Akkufach, Kennzeichnung)',
    'Selbsttest beim Einschalten, Akku- und Netzanzeige',
    'Förderratenprüfung mit Pumpenprüfgerät (mehrere Raten, Toleranz laut Hersteller)',
    'Okklusionsalarm (Alarmdruck in der gewählten Druckstufe) und Bolusbegrenzung nach Herstellervorgabe',
    'Luftalarm und Türalarm/Freifluss-Schutz nach Herstellervorgabe',
    'Netzausfall-Umschaltung und Akkulaufzeit',
    'Alarmsystem (akustisch, optisch, ggf. Rufanlage)',
    'Elektrische Sicherheit nach IEC 62353 (Schutzklasse und Anwendungsteil laut Typschild)',
  ],
  safety: [
    'Pumpe vor Arbeiten gemäß Hygieneplan aufbereiten – Infusionslösungen und Medikamentenreste können gefährlich sein.',
    'Alarm- und Schutzfunktionen (Okklusion, Luft, Freifluss, Unterspannung) dürfen nicht verändert oder überbrückt werden; Prüfung und Justage nur nach Servicehandbuch.',
    'Öffnen des Gehäuses, Arbeiten an Netzteil und Ladeschaltung nur durch qualifiziertes, vom Hersteller geschultes Personal.',
    'Li-Ion-Akkus: nicht kurzschließen, nicht öffnen; beschädigte oder aufgeblähte Akkus sofort sicher lagern (Brandgefahr) und fachgerecht entsorgen.',
    'Prüfflüssigkeit und Prüfsets nie für Patienten verwenden; nach Instandsetzung Wiederholungsprüfung nach Herstellervorgabe und IEC 62353.',
  ],
  regulatory: 'Infusionspumpen gehören zu den in Anlage 1 der MPBetreibV aufgeführten aktiven Medizinprodukten: u. a. Funktionsprüfung und Einweisung vor Inbetriebnahme, Medizinproduktebuch und sicherheitstechnische Kontrollen nach Herstellerangaben (ohne Herstellerangabe in der Regel spätestens alle zwei Jahre). Maßgeblich ist die jeweils gültige Fassung der Verordnung.',
  instruments: ['pump-analyzer', 'multimeter', 'safety-analyzer'],
});
