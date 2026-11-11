/*
 * Gerät: Hämodialysegerät (generisches Lernmodell)
 * Keine realen Hersteller, Modelle, Artikelnummern oder Servicecodes.
 * Es werden ausschließlich FUNKTIONSPRINZIPIEN erklärt. Eingriffe in den
 * extrakorporalen Blutkreislauf, die Schutzsysteme, die Dialysataufbereitung
 * oder die Wasserversorgung werden bewusst NICHT als Anleitung beschrieben –
 * maßgeblich sind Herstellerunterlagen, Qualifikation und geltende Vorschriften.
 */
MTRL.registerDevice({
  id: 'dialysis',
  name: 'Hämodialysegerät',
  icon: '🩸',
  category: 'Therapie & Organersatz',
  riskClass: 'Typisch Klasse IIb (extrakorporale Blutbehandlung); maßgeblich ist die Einstufung durch den Hersteller',
  summary:
    'Ersetzt bei Nierenversagen teilweise die Entgiftungs- und Entwässerungsfunktion der Niere: Das Blut der Patientin bzw. des Patienten wird in einem extrakorporalen Kreislauf durch einen Dialysator (künstliche Niere) gepumpt, wo harnpflichtige Substanzen in eine aufbereitete Spüllösung (Dialysat) übertreten und überschüssiges Wasser entzogen wird. Zahlreiche Schutzsysteme überwachen Blut- und Dialysatseite.',
  principle:
    '<p><b>Zwei Kreisläufe, eine Membran:</b> Im <b>Dialysator</b> (Kapillar- bzw. Hohlfaserdialysator) strömt das Blut durch Tausende feiner Hohlfasern, das Dialysat umspült sie im <b>Gegenstrom</b>. Die halbdurchlässige Membran lässt Wasser und kleine bzw. mittelgroße Moleküle passieren, Blutzellen und große Proteine nicht. Blut und Dialysat dürfen sich nie direkt vermischen.</p>' +
    '<p><b>Stofftransport:</b></p><ul>' +
    '<li><b>Diffusion:</b> Gelöste Stoffe wandern vom Ort hoher zum Ort niedriger Konzentration – z. B. Harnstoff, Kreatinin und Kalium vom Blut ins Dialysat. Die Zusammensetzung des Dialysats (Elektrolyte, Bikarbonat) bestimmt, welche Stoffe ausgeglichen werden.</li>' +
    '<li><b>Ultrafiltration (UF):</b> Ein Druckunterschied über der Membran (transmembraner Druck, TMP) presst Wasser aus dem Blut ins Dialysat. So wird die zwischen zwei Behandlungen eingelagerte Flüssigkeit entzogen.</li>' +
    '<li><b>Konvektion:</b> Mit dem Wasserstrom werden gelöste Stoffe mitgerissen (bei Hämodiafiltration gezielt genutzt).</li></ul>' +
    '<p><b>Extrakorporaler Blutkreislauf (Blutseite):</b> Über den Gefäßzugang (meist arteriovenöse Fistel oder Katheter) fördert eine <b>Rollenpumpe</b> das Blut durch das Einweg-<b>Blutschlauchsystem</b>. Der <b>arterielle Druck</b> vor der Pumpe (meist negativ) und der <b>venöse Druck</b> hinter dem Dialysator werden kontinuierlich gemessen. Eine <b>Antikoagulation</b> (z. B. Heparin über eine integrierte Spritzenpumpe) verhindert Gerinnung im Kreislauf. Vor der Rückgabe passiert das Blut die <b>venöse Tropfkammer</b> mit dem <b>Luftdetektor</b> und die <b>venöse Schlauchklemme</b>.</p>' +
    '<p><b>Dialysataufbereitung (Hydraulik):</b> Das Gerät erhält <b>aufbereitetes Wasser</b> (Umkehrosmose-Anlage), erwärmt und entgast es und mischt es im richtigen Verhältnis mit <b>Konzentraten</b> (saures Konzentrat und Bikarbonat). Die korrekte Mischung wird über die <b>elektrische Leitfähigkeit</b> überwacht: Je mehr Ionen gelöst sind, desto höher die Leitfähigkeit (Einheit mS/cm). Ein <b>Bilanzierungssystem</b> (z. B. Bilanzkammern oder volumetrische Flussmessung) sorgt dafür, dass genau so viel Dialysat zu- wie abfließt; nur die gewünschte UF-Menge wird zusätzlich gezielt entnommen. Ein <b>Dialysatfilter</b> kann das Dialysat zusätzlich von Keimen und Endotoxinen befreien.</p>' +
    '<p><b>Schutzsysteme (Prinzip):</b> Weil Fehler unmittelbar das Leben gefährden können, überwachen <b>voneinander unabhängige</b> Schutzsysteme die wichtigsten Größen. Bei einer Grenzwertverletzung wird ein <b>sicherer Zustand</b> hergestellt, z. B.:</p><ul>' +
    '<li><b>Luftdetektor</b> (meist Ultraschall-Prinzip an der venösen Tropfkammer bzw. Leitung) → Blutpumpe stoppt, venöse Klemme schließt (Schutz vor Luftembolie).</li>' +
    '<li><b>Blutleckdetektor</b> (optisch, im Dialysatablauf) → erkennt Blut im Dialysat bei Membranruptur; Blutpumpe stoppt.</li>' +
    '<li><b>Leitfähigkeits- und Temperaturüberwachung</b> → bei falscher Mischung oder Temperatur wird der Dialysator über einen <b>Bypass</b> umgangen, damit kein fehlerhaftes Dialysat an die Membran gelangt.</li>' +
    '<li><b>Druckalarme</b> (arteriell, venös, TMP) → z. B. bei Diskonnektion, Knick oder Gerinnung.</li>' +
    '<li><b>UF-/Bilanzüberwachung</b> → schützt vor unkontrolliertem Flüssigkeitsentzug.</li></ul>' +
    '<p><b>Hygiene und Wasser:</b> Die Qualität von Dialysewasser und Dialysat (chemisch und mikrobiologisch) ist für die Patientensicherheit wesentlich; Anforderungen beschreibt u. a. die Normenreihe ISO 23500. Die Hydraulik des Gerätes wird nach jeder Behandlung bzw. nach Herstellerplan <b>desinfiziert</b> (thermisch und/oder chemisch) und <b>entkalkt</b>.</p>' +
    '<p class="muted">Alle Funktionsbeschreibungen sind vereinfacht. Grenzwerte, Abläufe und Prüfungen legt der Hersteller fest.</p>',
  components: [
    { id: 'blood-pump', name: 'Blutpumpe (Rollenpumpe)', function: 'Fördert das Blut durch Blutschlauchsystem und Dialysator; Rollen quetschen das Pumpsegment des Schlauchs.', wear: 'mittel', notes: 'Rollen, Lager und Rotor verschleißen; Förderrate hängt auch von Segmentdurchmesser und arteriellem Unterdruck ab. Einstellungen und Kalibrierung nur nach Herstellerunterlagen.' },
    { id: 'heparin', name: 'Heparinpumpe (Spritzenpumpe)', function: 'Kontinuierliche Gabe des Antikoagulans in den Blutkreislauf.', wear: 'mittel' },
    { id: 'pressure-sensors', name: 'Drucksensoren (arteriell, venös, Dialysatdruck)', function: 'Messen die Drücke im Kreislauf; daraus u. a. TMP; Grundlage für Druckalarme.', wear: 'niedrig', notes: 'Anschluss an das Blutschlauchsystem über Transducer-Protektoren (hydrophobe Filter) – Nässe oder Blut am Filter verfälscht die Messung und ist ein Hygienerisiko.' },
    { id: 'air-detector', name: 'Luftdetektor', function: 'Erkennt Luft bzw. Mikroschaum in der venösen Leitung (meist Ultraschall-Prinzip) und löst den Schutz aus.', wear: 'niedrig', notes: 'Schutzsystem – Prüfung nur nach Herstellerprüfanweisung, keine Veränderung, kein Überbrücken.' },
    { id: 'venous-clamp', name: 'Venöse Schlauchklemme', function: 'Schließt die venöse Rückleitung bei Alarm (sicherer Zustand).', wear: 'mittel', notes: 'Schutzsystem; Funktion wird im Gerätetest geprüft.' },
    { id: 'blood-leak', name: 'Blutleckdetektor', function: 'Optische Erkennung von Blut im Dialysatablauf (Membranruptur).', wear: 'niedrig', notes: 'Verschmutzung/Ablagerungen der Messstrecke können Fehlalarme auslösen; Schutzsystem.' },
    { id: 'water-inlet', name: 'Wasserzulauf & Heizung', function: 'Übernimmt aufbereitetes Wasser aus der Ringleitung, erwärmt es auf Behandlungstemperatur.', wear: 'mittel', notes: 'Temperaturüberwachung ist Schutzfunktion.' },
    { id: 'degassing', name: 'Entgasung', function: 'Entfernt gelöste Luft aus dem Wasser (Unterdruck), damit keine Blasen Messung und Bilanzierung stören.', wear: 'niedrig' },
    { id: 'mixing', name: 'Konzentratmischung', function: 'Dosiert saures Konzentrat und Bikarbonat (flüssig oder Kartusche) zum Wasser.', wear: 'mittel', notes: 'Konzentratansaugung, Dichtungen und Pumpen; Kristallisation (Bikarbonat) und Kalk.' },
    { id: 'conductivity', name: 'Leitfähigkeits- und Temperaturmessung', function: 'Überwacht die Zusammensetzung des Dialysats; Haupt- und unabhängiges Schutzsystem.', wear: 'niedrig', notes: 'Schutzsystem; Kalibrierung nur nach Herstellerunterlagen mit geeignetem Referenzmessgerät.' },
    { id: 'balancing', name: 'Bilanzierungssystem & UF-Pumpe', function: 'Gleicht Zu- und Ablauf des Dialysats exakt aus; UF-Pumpe entzieht die eingestellte Flüssigkeitsmenge.', wear: 'mittel', notes: 'Ventile, Membranen und Dichtungen verschleißen; Undichtigkeiten führen zu Bilanzfehlern – wird im Gerätetest geprüft.' },
    { id: 'bypass', name: 'Bypassventil', function: 'Leitet Dialysat am Dialysator vorbei, wenn es nicht den Vorgaben entspricht.', wear: 'mittel' },
    { id: 'dialysate-filter', name: 'Dialysatfilter', function: 'Filtert Keime und Endotoxine aus dem Dialysat (sofern vorhanden).', wear: 'hoch', notes: 'Wechsel nach Standzeit bzw. Behandlungszahl laut Hersteller.' },
    { id: 'disinfection', name: 'Desinfektions- und Spülsystem', function: 'Thermische und/oder chemische Desinfektion sowie Entkalkung der Hydraulik.', wear: 'niedrig' },
    { id: 'control', name: 'Steuer- und Schutzrechner', function: 'Steuerung, Bedienung, Behandlungsprotokoll; unabhängiger Schutzkanal für sicherheitsrelevante Größen.', wear: 'niedrig' },
    { id: 'ui', name: 'Bedieneinheit / Display & Alarmsystem', function: 'Einstellung der Behandlung, Anzeige von Drücken, UF, Leitfähigkeit; akustische und optische Alarme.', wear: 'mittel' },
    { id: 'battery', name: 'Notstromakku', function: 'Überbrückt Netzausfall, damit das Blut zurückgegeben werden kann (Funktionsumfang herstellerabhängig).', wear: 'hoch', notes: 'Kapazität regelmäßig prüfen.' },
    { id: 'tubing', name: 'Blutschlauchsystem & Dialysator (Einweg)', function: 'Steriles Einwegsystem für den extrakorporalen Kreislauf.', wear: 'hoch', notes: 'Einwegartikel; nur freigegebene, zum Gerät passende Systeme (Pumpsegment!).' },
  ],
  signalPath: [
    { id: 'access', label: 'Gefäßzugang (arteriell)', desc: 'Blutentnahme über Fistel bzw. Katheter' },
    { id: 'art-pressure', label: 'Arterieller Druck', desc: 'Überwachung vor der Pumpe (meist Unterdruck)' },
    { id: 'blood-pump', label: 'Blutpumpe + Heparin', desc: 'Rollenpumpe, Antikoagulation' },
    { id: 'dialyzer', label: 'Dialysator', desc: 'Membran: Diffusion & Ultrafiltration (Gegenstrom mit Dialysat)' },
    { id: 'ven-chamber', label: 'Venöse Tropfkammer + venöser Druck', desc: 'Luftabscheidung, Druckmessung' },
    { id: 'air', label: 'Luftdetektor & venöse Klemme', desc: 'Schutzsystem vor Luftembolie' },
    { id: 'return', label: 'Rückgabe (venös)', desc: 'Blut zurück zum Patienten' },
    { id: 'water', label: 'Dialysatseite: Wasser (RO)', desc: 'Aufbereitetes Wasser, Erwärmung, Entgasung' },
    { id: 'mix', label: 'Konzentratmischung + Leitfähigkeit/Temperatur', desc: 'Bei Abweichung → Bypass' },
    { id: 'balance', label: 'Bilanzierung & UF', desc: 'Exakter Ausgleich, gezielter Flüssigkeitsentzug' },
    { id: 'blood-leak', label: 'Blutleckdetektor → Ablauf', desc: 'Erkennung von Membranruptur' },
  ],
  faults: [
    {
      symptom: 'Alarm „venöser Druck hoch“ während der Behandlung',
      causes: ['Knick oder Klemme in der venösen Leitung', 'Gerinnung in Tropfkammer oder Dialysator', 'Problem am Gefäßzugang (Nadellage, Stenose)', 'Seltener: Messfehler (nasser Transducer-Protektor, Sensordrift)'],
      checks: ['Anwenderseitig: Leitungsverlauf, Klemmen, Tropfkammer, Zugang prüfen (pflegerisch/ärztlich)', 'Transducer-Protektor auf Nässe/Blut prüfen – Hygieneverfahren nach Herstellerangabe und Hygieneplan', 'Technisch: Drucksensorprüfung mit Referenzdruckmessgerät gemäß Herstellerprüfanweisung (Lernmodell)'],
    },
    {
      symptom: 'Leitfähigkeitsalarm, Gerät geht in Bypass',
      causes: ['Konzentratkanister leer, falsches Konzentrat oder Ansaugstab nicht eingetaucht', 'Bikarbonatkartusche erschöpft oder nicht korrekt eingesetzt', 'Luft in der Konzentratleitung, undichte Dichtung', 'Kalk-/Kristallablagerungen; Messzelle oder Mischpumpe defekt'],
      checks: ['Konzentrat: Art, Füllstand, Anschluss', 'Leitfähigkeit mit unabhängigem, kalibriertem Referenzmessgerät vergleichen (nach Herstellervorgabe)', 'Desinfektions-/Entkalkungsprotokoll prüfen', 'Bei Abweichung der Messsysteme: Herstellerservice – keine Justage ohne Unterlagen'],
    },
    {
      symptom: 'Temperaturalarm bzw. Dialysattemperatur instabil',
      causes: ['Zulaufwasser zu kalt/zu warm, Wasserdruck schwankend', 'Heizung oder Temperaturfühler defekt', 'Durchflussproblem in der Hydraulik'],
      checks: ['Zulauf (Druck, Temperatur) der Wasserversorgung prüfen', 'Temperatur mit Referenzthermometer vergleichen (Herstellerprüfanweisung)', 'Herstellerservice bei Hardwarefehler'],
    },
    {
      symptom: 'Blutleckalarm',
      causes: ['Tatsächliche Membranruptur des Dialysators (Blut im Dialysat!)', 'Luftblasen oder Verschmutzung in der Messstrecke (Fehlalarm)', 'Ablagerungen nach unzureichender Desinfektion/Entkalkung'],
      checks: ['Alarm immer ernst nehmen: Vorgehen nach Gebrauchsanweisung und klinischer Anweisung (Dialysat auf Verfärbung prüfen, ggf. Teststreifen)', 'Technisch: Blutleckdetektor nach Herstellerprüfanweisung prüfen (Prüfmedium/Prüffilter laut Hersteller)', 'Entkalkung/Desinfektion durchführen; bei Wiederholung Herstellerservice'],
    },
    {
      symptom: 'Gerätetest vor der Behandlung schlägt fehl (z. B. Druckhaltetest/Bilanztest)',
      causes: ['Undichtigkeit in der Hydraulik (Dichtungen, Dialysatkupplungen)', 'Defekte Ventile im Bilanzierungssystem', 'Dialysatfilter undicht oder Standzeit überschritten', 'Falsch eingelegtes Schlauchsystem'],
      checks: ['Meldungstext und Fehlerprotokoll auswerten', 'Sichtprüfung auf Leckagen (Feuchtigkeit, Kristalle unter dem Gerät)', 'Dichtungen der Dialysatkupplungen prüfen', 'Weitere Fehlersuche nur nach Servicehandbuch – Gerät bis zur Klärung nicht für Behandlungen freigeben'],
    },
    {
      symptom: 'Luftalarm ohne sichtbare Luft bzw. häufige Luftalarme',
      causes: ['Tropfkammer nicht korrekt eingesetzt oder Füllstand zu niedrig', 'Mikroschaum durch undichte Verbindungen auf der arteriellen Seite (Unterdruck saugt Luft an)', 'Ankopplung des Sensors gestört (Verschmutzung)'],
      checks: ['Anwenderseitig: Einlegen der Tropfkammer und Füllstand nach Gebrauchsanweisung', 'Arterielle Konnektionen prüfen', 'Technisch: Funktionsprüfung des Luftdetektors ausschließlich nach Herstellerprüfanweisung – Schutzsystem nie überbrücken'],
    },
    {
      symptom: 'Blutpumpe fördert ungleichmäßig oder Förderrate unplausibel',
      causes: ['Falsches oder nicht korrekt eingelegtes Pumpsegment', 'Hoher arterieller Unterdruck (Zugang) verringert die tatsächliche Förderrate', 'Verschleiß an Rotor/Rollen, Rollenabstand (Okklusion) nicht korrekt'],
      checks: ['Pumpsegment und Einlegen prüfen', 'Arteriellen Druck beachten', 'Förderrate volumetrisch bzw. mit Prüfmittel nach Herstellerprüfanweisung prüfen (Lernmodell)', 'Rotor/Rollen auf Verschleiß sichten; Einstellung nur nach Servicehandbuch'],
    },
  ],
  wearParts: ['dia-blood-tubing-set', 'dia-transducer-protector', 'dia-dialysate-filter', 'dia-blood-pump-rotor', 'dia-coupling-seals', 'dia-concentrate-wand', 'dia-battery'],
  functionChecks: [
    'Sichtprüfung: Gehäuse, Bedieneinheit, Pumpen, Halterungen, Wasser- und Abflussanschlüsse, Leckagespuren, Kennzeichnung',
    'Automatischer Gerätetest (Selbsttest) vor der Behandlung bestanden; Fehlerprotokoll ohne offene Meldungen',
    'Schutzsysteme nach Herstellerprüfanweisung: Luftdetektor mit venöser Klemme, Blutleckdetektor, Leitfähigkeits- und Temperaturüberwachung, Bypass, Druckalarme – nur mit vom Hersteller vorgesehenen Prüfmitteln und Verfahren',
    'Drucksensoren (arteriell, venös, Dialysat) mit kalibriertem Referenzdruckmessgerät',
    'Leitfähigkeit und Temperatur des Dialysats mit unabhängigem, kalibriertem Referenzmessgerät',
    'Förderraten (Blutpumpe, Heparinpumpe) und UF-/Bilanzgenauigkeit nach Herstellervorgabe',
    'Netzausfallverhalten und Notstromakku',
    'Desinfektionsprogramm läuft vollständig durch (Protokoll); Dialysatfilter-Standzeit',
    'Elektrische Sicherheit nach IEC 62353 (Schutzleiter, Ableitströme inkl. Anwendungsteile)',
    'Freigabe erst nach Desinfektion/Spülung gemäß Herstellerangaben (keine Rückstände von Desinfektionsmittel)',
  ],
  safety: [
    'Extrakorporaler Blutkreislauf: Fehler können unmittelbar lebensbedrohlich sein (Luftembolie, Blutverlust, Hämolyse, Gerinnung, Fehlbilanzierung). Eingriffe in Blutseite, Hydraulik und Schutzsysteme ausschließlich durch vom Hersteller geschultes und autorisiertes Personal nach Servicehandbuch.',
    'Schutzsysteme (Luftdetektor, venöse Klemme, Blutleckdetektor, Leitfähigkeits-/Temperaturüberwachung, Bypass, Druck- und Bilanzüberwachung) dürfen niemals überbrückt, verstellt oder außer Funktion gesetzt werden – auch nicht kurzzeitig zu Prüf- oder Testzwecken außerhalb der Herstellerprüfanweisung.',
    'Infektionsschutz: Gerät gilt nach Gebrauch als potenziell kontaminiert (Blut). Vor technischen Arbeiten Desinfektion nach Hygieneplan und Herstellerangaben; persönliche Schutzausrüstung tragen. Kontakt mit blutbenetzten Teilen vermeiden.',
    'Chemische Gefährdung: Desinfektions- und Entkalkungsmittel sowie Konzentrate können ätzend sein – Sicherheitsdatenblätter beachten, Schutzbrille und Handschuhe.',
    'Wasser und Strom: Leckagen können elektrische Gefährdungen verursachen. Netzführende Teile und Netzteil nur durch qualifiziertes Personal; nach jedem Eingriff Wiederholungsprüfung nach IEC 62353.',
    'Wasseraufbereitung (Umkehrosmose, Ringleitung) ist Teil des Behandlungssystems: Arbeiten daran beeinflussen alle angeschlossenen Geräte und erfordern Abstimmung mit Betreiber, Hygiene und Hersteller der Anlage.',
    'Nach Instandsetzung: vollständiger Gerätetest, Prüfung der Schutzsysteme, Desinfektion und dokumentierte Freigabe vor der nächsten Behandlung.',
  ],
  regulatory:
    'Hämodialysegeräte sind sicherheitskritische aktive Medizinprodukte. Ob und in welchem Umfang besondere Pflichten der MPBetreibV (z. B. Anlage 1: Einweisung, Funktionsprüfung vor Inbetriebnahme, sicherheitstechnische Kontrollen) zutreffen, ist anhand der geltenden Fassung der Verordnung und der Herstellerunterlagen zu klären; in der Praxis schreiben Hersteller regelmäßige sicherheitstechnische Kontrollen und Wartungen vor. Gerätespezifische Norm: IEC 60601-2-16; Anforderungen an Dialysewasser und Dialysierflüssigkeit u. a. in der Normenreihe ISO 23500. Hygieneanforderungen nach Hygieneplan bzw. einschlägigen Empfehlungen. Wiederholungsprüfung der elektrischen Sicherheit nach IEC 62353.',
  instruments: ['safety-analyzer', 'pressure-meter', 'multimeter'],
});
