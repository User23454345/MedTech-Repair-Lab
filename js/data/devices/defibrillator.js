/*
 * Gerät: Defibrillator mit EKG-Monitoring (generisches Lernmodell)
 * Manueller Defibrillator mit optionalem halbautomatischem Modus (AED-Modus).
 * Keine realen Hersteller, Modelle, Artikelnummern oder Servicecodes.
 * Alle Zahlenwerte, die nicht allgemein normativ sind, sind als Beispiel bzw.
 * Lernmodell gekennzeichnet. Maßgeblich sind immer die Herstellerunterlagen.
 *
 * SICHERHEIT: Diese Datei enthält bewusst KEINE Anleitung zum Öffnen des
 * Gerätes, zum Entladen des Hochspannungskondensators oder zu Eingriffen in
 * den Hochspannungsteil. Solche Arbeiten sind ausschließlich vom Hersteller
 * geschultem und autorisiertem Personal nach Servicehandbuch vorbehalten.
 */
MTRL.registerDevice({
  id: 'defibrillator',
  name: 'Defibrillator mit EKG-Monitoring',
  icon: '⚡',
  category: 'Notfall & Therapie',
  riskClass: 'Typisch Klasse IIb (aktives therapeutisches Produkt, das Energie in potenziell gefährlicher Weise abgibt); nur zur Orientierung – maßgeblich ist die Einstufung durch den Hersteller',
  summary:
    'Gibt einen kurzen, energiereichen Stromimpuls über Klebeelektroden oder Paddles durch den Thorax ab, um Kammerflimmern bzw. pulslose ventrikuläre Tachykardie zu beenden. Zusätzlich überwacht das Gerät das EKG, kann synchronisiert kardiovertieren und im halbautomatischen Modus (AED-Modus) den Rhythmus selbst analysieren und eine Schockempfehlung geben.',
  principle:
    '<p><b>Ziel der Defibrillation:</b> Bei Kammerflimmern (VF) erregen sich die Herzmuskelzellen ungeordnet, das Herz pumpt kein Blut mehr. Ein ausreichend starker Stromstoß <b>depolarisiert gleichzeitig einen großen Teil des Myokards</b>. Danach kann – im günstigen Fall – der natürliche Schrittmacher (Sinusknoten) wieder einen geordneten Rhythmus übernehmen.</p>' +
    '<p><b>Energiespeicher:</b> Kein Netzteil und kein Akku kann den benötigten Spitzenstrom direkt liefern. Deshalb lädt ein <b>Hochspannungs-Ladewandler</b> (Gleichspannungswandler mit Transformator) einen <b>Hochspannungskondensator</b> über einige Sekunden auf. Die gespeicherte Energie beträgt</p>' +
    '<p style="text-align:center"><b>E = ½ · C · U²</b></p>' +
    '<p>Beispiel (Lernmodell): Ein Kondensator mit C = 150 µF, geladen auf U = 1,8 kV, speichert E = ½ · 150·10⁻⁶ F · (1800 V)² ≈ <b>243 J</b>. Weil die Energie <b>quadratisch</b> mit der Spannung wächst, bedeutet doppelte Spannung vierfache Energie. Gerätehersteller beziehen die eingestellte Energie üblicherweise auf die <b>abgegebene Energie an einer 50-Ω-Last</b> – das ist auch die Standard-Prüflast von Defibrillator-Analysatoren.</p>' +
    '<p><b>Impulsform:</b> Moderne Geräte arbeiten meist <b>biphasisch</b>: Ein Schaltnetzwerk aus Hochleistungs-Halbleitern (H-Brücke) kehrt die Stromrichtung während des Impulses um. Der Strom hängt von der <b>transthorakalen Impedanz</b> des Patienten ab (Größenordnung typischerweise einige zehn bis über hundert Ohm). Viele Geräte messen diese Impedanz vor bzw. während der Abgabe über einen kleinen Messstrom und passen Impulsdauer oder Spannung an (<b>Impedanzkompensation</b>). Ältere Geräte nutzen <b>monophasische</b> Impulse (gedämpfte Sinus- oder abgeschnittene Exponentialform).</p>' +
    '<p><b>Betriebsarten:</b></p><ul>' +
    '<li><b>Manuelle Defibrillation:</b> Die Anwenderin bzw. der Anwender wählt die Energie, lädt und löst aus.</li>' +
    '<li><b>Synchronisierte Kardioversion:</b> Der Impuls wird <b>auf die R-Zacke synchronisiert</b> abgegeben, damit er nicht in die vulnerable Phase (T-Welle) fällt. Dafür muss das Gerät die R-Zacke zuverlässig erkennen; die Markierung erscheint im EKG-Bild.</li>' +
    '<li><b>Halbautomatischer Modus (AED-Modus):</b> Ein Analysealgorithmus bewertet das über die Klebeelektroden abgeleitete EKG und unterscheidet <b>schockbare</b> (VF, schnelle VT) von <b>nicht schockbaren</b> Rhythmen (z. B. Asystolie, Sinusrhythmus). Das Gerät gibt Sprachanweisungen; ausgelöst wird durch den Anwender.</li>' +
    '<li><b>EKG-Monitoring</b> über separates EKG-Kabel oder über Pads/Paddles; je nach Ausstattung auch weitere Parameter oder ein externer Schrittmacher (Pacing).</li></ul>' +
    '<p><b>Sicherheitsarchitektur:</b> Die Hochspannung ist von Bedien- und Messelektronik isoliert. Ein <b>internes Entladenetzwerk (Sicherheitsentladung)</b> entlädt den Kondensator geräteintern, wenn ein geladener Schock nicht innerhalb einer festgelegten Zeit abgegeben, die Energie geändert oder der Vorgang abgebrochen wird. Die EKG-Eingänge sind <b>defibrillationsgeschützt</b> (Anwendungsteile Typ BF oder CF mit Defibrillationsschutz), damit Monitore am selben Patienten den Schock überstehen.</p>' +
    '<p><b>Einsatzbereitschaft:</b> Da ein Defibrillator im Notfall sofort funktionieren muss, führen viele Geräte regelmäßige <b>automatische Selbsttests</b> durch und zeigen den Status (z. B. Bereitschaftsanzeige) an. Häufigste Ursachen für fehlende Einsatzbereitschaft sind Zubehör und Akku – nicht die Hochspannungselektronik.</p>',
  components: [
    { id: 'battery', name: 'Akku / Batterie', function: 'Liefert die Energie für Ladewandler, Monitoring und Selbsttests; bei AED häufig nicht wiederaufladbare Lithium-Batterie, bei Klinikgeräten wiederaufladbarer Akku.', wear: 'hoch', notes: 'Alterung (Kapazität, Innenwiderstand) verlängert die Ladezeit oder verhindert das Laden – bei hohem Ladestrom bricht die Klemmenspannung ein (U = U₀ − I·Rᵢ).' },
    { id: 'psu', name: 'Netzteil / Ladeeinheit', function: 'Lädt den Akku bei Netzbetrieb und versorgt das Gerät; teils als externes Ladegerät oder Ladehalterung.', wear: 'niedrig', notes: 'Netzführendes Teil – Arbeiten nur nach Herstellerunterlagen durch qualifiziertes Personal.' },
    { id: 'hv-charger', name: 'Hochspannungs-Ladewandler', function: 'Erzeugt aus der Akkuspannung die Hochspannung (Größenordnung kV) und lädt den Energiespeicher-Kondensator.', wear: 'niedrig', notes: 'Hochspannungsteil – kein Eingriff ohne Herstellerschulung und Servicehandbuch.' },
    { id: 'hv-cap', name: 'Hochspannungskondensator (Energiespeicher)', function: 'Speichert die Schockenergie (E = ½·C·U²) bis zur Abgabe.', wear: 'mittel', notes: 'Kann auch bei ausgeschaltetem Gerät oder entnommenem Akku gefährliche Restenergie enthalten. Alterung (Kapazitätsverlust, Leckstrom) zeigt sich z. B. als zu geringe abgegebene Energie oder verlängerte Ladezeit – Bewertung nur über Prüfung mit Defibrillator-Analysator und Herstellerdiagnose.' },
    { id: 'hv-switch', name: 'Schockschaltnetzwerk (H-Brücke / Relais)', function: 'Schaltet den Kondensator auf die Elektroden und formt den (biphasischen) Impuls.', wear: 'niedrig', notes: 'Sicherheitskritisch; nur Herstellerservice.' },
    { id: 'safety-discharge', name: 'Interne Sicherheitsentladung', function: 'Entlädt den Kondensator geräteintern bei Abbruch, Energieänderung oder Zeitüberschreitung.', wear: 'niedrig', notes: 'Schutzfunktion – darf nicht verändert oder umgangen werden.' },
    { id: 'impedance', name: 'Impedanzmessung', function: 'Misst die Patientenimpedanz über einen kleinen Messstrom (Elektrodenkontakt, Impedanzkompensation).', wear: 'niedrig' },
    { id: 'ecg-frontend', name: 'EKG-Front-End (defibrillationsgeschützt)', function: 'Verstärkt das EKG aus EKG-Kabel oder Pads/Paddles, erkennt R-Zacken (Synchronisation) und Elektrodenablösung.', wear: 'niedrig' },
    { id: 'control', name: 'Steuerung & Rhythmusanalyse', function: 'Ablaufsteuerung (Laden, Abgabe, Sicherheitsentladung), AED-Analysealgorithmus, Selbsttests, Ereignisspeicher.', wear: 'niedrig' },
    { id: 'therapy-connector', name: 'Therapiebuchse & Therapiekabel', function: 'Verbindung zu Klebeelektroden-Adapterkabel oder Paddles; überträgt den Schock und das EKG.', wear: 'hoch', notes: 'Stecker, Kabel und Knickschutz unterliegen mechanischer Belastung.' },
    { id: 'paddles', name: 'Externe Paddles (optional)', function: 'Handelektroden mit Lade-/Auslösetasten; bei vielen Geräten zusätzlich EKG-Ableitung über die Paddles.', wear: 'hoch', notes: 'Elektrodenflächen (Kratzer, Gelreste), Tasten, Kabel.' },
    { id: 'pads', name: 'Einweg-Klebeelektroden (Pads)', function: 'Großflächige Gelelektroden zur Schockabgabe, EKG-Ableitung und ggf. Stimulation.', wear: 'hoch', notes: 'Begrenzte Haltbarkeit (Verfallsdatum), Gel trocknet aus; Einwegprodukt.' },
    { id: 'ui', name: 'Display, Bedienelemente, Sprachausgabe', function: 'EKG-Darstellung, Energiewahl, Lade-/Schocktasten, Statusanzeige, Sprachanweisungen im AED-Modus.', wear: 'mittel' },
    { id: 'recorder', name: 'Thermodrucker (optional)', function: 'Ausdruck von EKG-Streifen und Ereignissen.', wear: 'mittel', notes: 'Druckkopf und Papierantrieb verschleißen.' },
  ],
  signalPath: [
    { id: 'battery', label: 'Akku / Netzteil', desc: 'Primäre Energiequelle (Kleinspannung)' },
    { id: 'charger', label: 'HV-Ladewandler', desc: 'Wandelt auf Hochspannung (kV-Bereich), Ladezeit einige Sekunden' },
    { id: 'cap', label: 'HV-Kondensator', desc: 'Speichert E = ½·C·U²' },
    { id: 'switch', label: 'Schockschaltnetzwerk', desc: 'Formt biphasischen Impuls; Sicherheitsentladung bei Abbruch' },
    { id: 'cable', label: 'Therapiekabel', desc: 'Buchse, Kabel, Paddles bzw. Pads-Adapter' },
    { id: 'electrodes', label: 'Elektroden', desc: 'Klebeelektroden oder Paddles mit Gel' },
    { id: 'patient', label: 'Patient (Thorax)', desc: 'Transthorakale Impedanz bestimmt den Strom' },
    { id: 'ecg', label: 'EKG-Rückweg', desc: 'EKG über Pads/Kabel → defibrillationsgeschütztes Front-End' },
    { id: 'control', label: 'Steuerung & Analyse', desc: 'R-Zacken-Sync, AED-Analyse, Impedanz, Ablaufsteuerung' },
  ],
  faults: [
    {
      symptom: 'Gerät meldet beim Selbsttest „nicht einsatzbereit“ bzw. Statusanzeige zeigt Fehler',
      causes: ['Akku/Batterie erschöpft oder gealtert', 'Pads abgelaufen, nicht angeschlossen oder Verpackung beschädigt (bei vorkonnektierten Pads)', 'Interner Fehler (z. B. Ladeschaltung, Speicher) – Fehlerprotokoll beachten'],
      checks: ['Statusanzeige und Selbsttestprotokoll auslesen (Gerätefunktion laut Gebrauchsanweisung)', 'Akku/Batterie: Ladezustand, Alter, Herstellerangaben', 'Zubehör: Verfallsdatum und Anschluss der Pads', 'Bei internen Fehlermeldungen: Herstellerservice'],
    },
    {
      symptom: 'Ladezeit deutlich länger als üblich bzw. Laden bricht ab',
      causes: ['Akku gealtert (hoher Innenwiderstand → Spannungseinbruch unter Ladelast)', 'Akku nicht vollständig geladen, Ladehalterung/Ladegerät defekt', 'Fehler im Ladewandler oder Energiespeicher (nur Herstellerservice)'],
      checks: ['Ladezeitmessung bei maximaler Energie mit Defibrillator-Analysator (mit Akku, ohne Netz – Herstellervorgabe)', 'Vergleich mit bekannt gutem, vollgeladenem Akku', 'Akkuspannung unter Last bzw. Akkutest laut Hersteller', 'Hinweis: Ladezeitgrenzen sind herstellerspezifisch'],
    },
    {
      symptom: 'Abgegebene Energie außerhalb der Toleranz (Prüfung an 50-Ω-Last)',
      causes: ['Alterung des Energiespeichers oder Fehler im Schaltnetzwerk', 'Hoher Übergangswiderstand in Therapiekabel, Stecker oder Paddles', 'Fehlbedienung bei der Prüfung (falsche Last, falsche Adapter, Messung ohne geeigneten Analysator)'],
      checks: ['Energiemessung mit Defibrillator-Analysator bei mehreren Energiestufen', 'Tauschtest des Therapiekabels/Paddles', 'Sichtprüfung der Kontaktflächen', 'Toleranzen laut Herstellerangaben bzw. IEC 60601-2-4; bei Abweichung Herstellerservice'],
    },
    {
      symptom: 'Meldung „Elektroden prüfen“ / „Schlechter Elektrodenkontakt“ / Impedanz außerhalb des Bereichs',
      causes: ['Pads ausgetrocknet, abgelaufen oder schlecht geklebt (Haare, Feuchtigkeit)', 'Aderbruch im Pads-Adapter-/Therapiekabel', 'Verschmutzte oder beschädigte Kontakte an Buchse/Stecker'],
      checks: ['Neue Pads, korrekte Platzierung', 'Prüfung mit Defibrillator-Analysator bzw. Prüflast (Impedanzanzeige plausibel?)', 'Sicht- und Biegeprüfung des Kabels, Tauschtest', 'Durchgangsprüfung des Kabels nur am stromlosen, vom Gerät getrennten Zubehör'],
    },
    {
      symptom: 'EKG-Darstellung gestört, „Ableitung ab“ oder keine R-Zacken-Markierung bei Kardioversion',
      causes: ['Defektes EKG-Kabel (Aderbruch, Schirm)', 'Falsche Ableitungsquelle gewählt (Pads statt EKG-Kabel oder umgekehrt)', 'Zu kleine EKG-Amplitude für die R-Zacken-Erkennung', 'Elektroden/Gel ausgetrocknet'],
      checks: ['EKG-Simulator: Amplitude, Herzfrequenz, Ableitungen, Lead-off', 'Synchronisation prüfen: Markierung auf jeder R-Zacke? Verzögerung mit Defibrillator-Analysator messen', 'Ableitungsquelle und Verstärkung prüfen', 'Tauschtest des EKG-Kabels'],
    },
    {
      symptom: 'AED-Modus: keine oder unplausible Schockempfehlung',
      causes: ['Artefakte durch Bewegung, Transport oder laufende Thoraxkompressionen während der Analyse', 'Schlechter Elektrodenkontakt', 'Softwarestand/Konfiguration (nur nach Herstellervorgabe änderbar)'],
      checks: ['Analyseprüfung mit Rhythmussimulator des Defibrillator-Analysators (schockbar / nicht schockbar)', 'Elektrodenkontakt und Impedanz prüfen', 'Ereignisprotokoll auswerten; bei Verdacht auf Algorithmusfehler Herstellerservice'],
    },
    {
      symptom: 'Kein Ausdruck / Ausdruck blass',
      causes: ['Falsches oder falsch eingelegtes Thermopapier', 'Druckkopf verschmutzt oder verschlissen', 'Papierklappe nicht geschlossen (Sensor)'],
      checks: ['Papier und Einlegerichtung prüfen', 'Druckkopf nach Herstellerangabe reinigen', 'Testausdruck'],
    },
  ],
  wearParts: ['defi-pads', 'defi-pads-cable', 'defi-paddles', 'defi-battery', 'defi-ecg-cable', 'defi-recorder-paper'],
  functionChecks: [
    'Sichtprüfung: Gehäuse, Display, Tasten, Therapiebuchse, Kabel und Knickschutz, Paddles (Elektrodenflächen), Kennzeichnung, Zubehör vollständig und nicht abgelaufen (Pads, Gel)',
    'Selbsttest beim Einschalten und Statusanzeige; Fehlerprotokoll auslesen',
    'Akku/Batterie: Ladezustand, Alter, ggf. Kapazitätstest nach Herstellervorgabe',
    'Energieabgabe mit Defibrillator-Analysator an 50-Ω-Prüflast bei mehreren Energiestufen (Toleranzen laut Hersteller/IEC 60601-2-4)',
    'Ladezeit bei maximaler Energie (Akkubetrieb), Grenzwert laut Hersteller',
    'Interne Sicherheitsentladung: Verhalten bei Abbruch bzw. nach Ablauf der Wartezeit nach Herstellerprüfanweisung beobachten (keine Eingriffe)',
    'Synchronisierte Kardioversion: R-Zacken-Markierung und Verzögerung zwischen R-Zacke und Impuls mit Analysator',
    'AED-Modus: Rhythmusanalyse mit Simulator (schockbarer und nicht schockbarer Rhythmus), Sprachanweisungen',
    'EKG-Monitoring mit EKG-Simulator: Herzfrequenz, Amplitude, Ableitungen, Elektrodenüberwachung, Alarme',
    'Ggf. externer Schrittmacher (Pacing): Stimulationsstrom und -frequenz mit Analysator',
    'Elektrische Sicherheit nach IEC 62353 (Schutzleiter bei Netzbetrieb Schutzklasse I, Ableitströme inkl. Anwendungsteile)',
  ],
  safety: [
    'LEBENSGEFAHR durch Hochspannung und gespeicherte Energie: Der Hochspannungskondensator kann auch bei ausgeschaltetem Gerät oder entnommenem Akku geladen sein. Das Gerät wird im Rahmen dieser Lernwerkstatt NICHT geöffnet; Arbeiten am Hochspannungsteil und jede Form des Entladens sind ausschließlich vom Hersteller geschultem und autorisiertem Personal nach Servicehandbuch vorbehalten.',
    'Schockabgabe zu Prüfzwecken nur in einen geeigneten Defibrillator-Analysator (Prüflast). Niemals in die Luft, gegeneinander gehaltene Paddles, Metallflächen oder Personen auslösen.',
    'Während Lade- und Schockvorgängen niemand berührt Patient, Prüflast, Elektroden oder leitfähige Teile; deutliche Warnung („Weg vom Patienten!“) auch im Prüfbetrieb.',
    'Kein Multimeter, Oszilloskop oder sonstiges Messgerät an Therapieelektroden, Therapiebuchse oder Hochspannungsteile anschließen – Zerstörungs- und Lebensgefahr. Energie, Impulsform und Synchronisation werden ausschließlich mit einem Defibrillator-Analysator gemessen.',
    'Schutz- und Sicherheitsfunktionen (Sicherheitsentladung, Energiebegrenzung, Analysealgorithmus, Alarme) dürfen nicht verändert oder umgangen werden.',
    'Nach jeder Instandsetzung: Funktionsprüfung inkl. Energieabgabe und Wiederholungsprüfung nach IEC 62353, bevor das Gerät wieder freigegeben wird. Ein Notfallgerät ohne Ersatz außer Betrieb zu nehmen, muss mit dem Betreiber abgestimmt werden (Ersatzgerät bereitstellen).',
    'Nur freigegebenes Originalzubehör verwenden (Pads, Kabel, Akkus) – Zubehör ist Teil der Sicherheitsbewertung des Systems.',
  ],
  regulatory:
    'Defibrillatoren zählen zu den in Anlage 1 der MPBetreibV genannten aktiven Medizinprodukten. Für sie gelten u. a. Funktionsprüfung und Einweisung vor Inbetriebnahme, Einweisung der Anwender durch beauftragte Personen sowie sicherheitstechnische Kontrollen (STK) nach Herstellervorgaben; die Dokumentation erfolgt im Medizinproduktebuch. Gerätespezifische Norm: IEC 60601-2-4. Wiederholungsprüfungen der elektrischen Sicherheit nach IEC 62353. Für AED im öffentlichen Raum, die für die Anwendung durch Laien vorgesehen sind, enthält die Verordnung teilweise abweichende bzw. besondere Regelungen (z. B. zu Einweisung und Kontrollen). Konkrete Fristen und Anforderungen bitte stets in der geltenden Fassung der Verordnung und in den Herstellerunterlagen prüfen.',
  instruments: ['safety-analyzer', 'ecg-simulator', 'patient-simulator', 'oscilloscope', 'multimeter'],
});
