/*
 * Wissensartikel: Prüfung & Recht
 * ------------------------------------------------------------------
 * Elektrische Sicherheit, Funktionskontrolle nach Instandsetzung,
 * Dokumentation, rechtlicher Rahmen, Hygiene in der Werkstatt.
 *
 * Hinweis: Normen und Rechtsvorschriften werden laufend überarbeitet.
 * Die Artikel geben einen allgemeinen Überblick zu Lernzwecken und
 * ersetzen weder den Normtext noch den aktuellen Rechtsstand.
 * Grenzwerte sind ausdrücklich nur zur Orientierung angegeben.
 */
(function () {
  'use strict';

  /* ======================= Elektrische Sicherheit ======================= */
  MTRL.registerKnowledge({
    id: 'elektrische-sicherheit',
    title: 'Elektrische Sicherheit medizinischer Geräte',
    icon: '⚡',
    category: 'Recht & Prüfung',
    summary:
      'Schutzklassen, Anwendungsteile B/BF/CF, Ableitströme und der Unterschied zwischen der Konstruktionsnorm IEC 60601-1 und der Prüfnorm IEC 62353 für Wiederholungsprüfungen.',
    sections: [
      {
        title: 'Warum Medizingeräte besonders geschützt sein müssen',
        html: `
<p>Bei Medizingeräten sind die Bedingungen ungünstiger als bei normalen Elektrogeräten: Die Haut des Patienten kann durch Elektroden, Gel oder Desinfektion schlechter isolieren, der Patient kann sich nicht wegbewegen, und Katheter oder Elektroden können Strom <b>direkt in die Nähe des Herzens</b> leiten.</p>
<table class="plain">
  <thead><tr><th>Begriff</th><th>Bedeutung</th><th>Größenordnung (50/60 Hz, nur Orientierung)</th></tr></thead>
  <tbody>
    <tr><td><b>Makroschock</b></td><td>Strom fließt über die Körperoberfläche durch den Körper</td><td>Wahrnehmung ab etwa 0,5–1 mA; Loslassschwelle etwa 10 mA; Kammerflimmern ab einigen 10 mA möglich</td></tr>
    <tr><td><b>Mikroschock</b></td><td>Strom gelangt über einen leitfähigen Zugang (z. B. Katheter) direkt ans Herz</td><td>bereits Ströme im Bereich von einigen 10 µA gelten als potenziell gefährlich</td></tr>
  </tbody>
</table>
<p>Die Schutzmaßnahmen und Grenzwerte für Medizingeräte sind deshalb deutlich strenger als für Haushaltsgeräte.</p>`,
      },
      {
        title: 'Schutzklassen',
        html: `
<table class="plain">
  <thead><tr><th>Schutzklasse</th><th>Schutzprinzip</th><th>Erkennungsmerkmal / Prüfschwerpunkt</th></tr></thead>
  <tbody>
    <tr><td><b>I</b></td><td>Basisisolierung <b>plus Schutzleiter</b>: Berührbare leitfähige Teile sind mit PE verbunden. Bei einem Isolationsfehler fließt der Fehlerstrom über PE ab, die Sicherung bzw. Schutzeinrichtung löst aus.</td><td>dreipoliger Netzanschluss (Schutzkontakt); Schutzleiterwiderstand ist zu prüfen</td></tr>
    <tr><td><b>II</b></td><td><b>Doppelte oder verstärkte Isolierung</b>, kein Schutzleiter</td><td>Symbol: zwei ineinanderliegende Quadrate; kein Schutzleiteranschluss</td></tr>
    <tr><td><b>Intern gespeist</b></td><td>Betrieb aus interner Energiequelle (Akku/Batterie) ohne Netzverbindung</td><td>Während des Ladens am Netz gilt die Schutzklasse des Netzteils bzw. Ladegeräts</td></tr>
  </tbody>
</table>`,
      },
      {
        title: 'Anwendungsteile B, BF und CF',
        html: `
<p>Ein <b>Anwendungsteil</b> ist der Teil eines Geräts, der bei bestimmungsgemäßem Gebrauch den Patienten berührt (z. B. EKG-Elektroden, SpO₂-Sensor, Blutdruckmanschette). Nach dem Schutzgrad gegen elektrischen Schlag unterscheidet man:</p>
<table class="plain">
  <thead><tr><th>Typ</th><th>Bedeutung</th><th>Typische Anwendung</th></tr></thead>
  <tbody>
    <tr><td><b>B</b> (Body)</td><td>Grundschutz; das Anwendungsteil darf mit Erde verbunden sein</td><td>z. B. Auflageflächen von Patientenliegen oder Untersuchungstischen</td></tr>
    <tr><td><b>BF</b> (Body Floating)</td><td>Anwendungsteil <b>schwebend</b>, d. h. von Erde und übriger Elektronik isoliert</td><td>Anwendung auf der Körperoberfläche, z. B. SpO₂, NIBP, Temperatur, viele EKG-Eingänge</td></tr>
    <tr><td><b>CF</b> (Cardiac Floating)</td><td>schwebend mit <b>höchstem Schutzgrad</b>, sehr niedrige zulässige Ableitströme</td><td>Anwendungen mit möglichem direkten Herzbezug, z. B. invasive Druckmessung, EKG bei kardialen Eingriffen</td></tr>
  </tbody>
</table>
<p>Ist ein Symbol zusätzlich mit „Defibrillator-Paddeln“ dargestellt, ist das Anwendungsteil <b>defibrillationsgeschützt</b>: Es übersteht eine Defibrillation am Patienten, ohne Schaden zu nehmen oder den Anwender zu gefährden.</p>
<div class="callout info"><b>Warum ist CF strenger?</b> Bei CF-Anwendungen kann ein Strom über eine leitfähige Verbindung unmittelbar das Herz erreichen (Mikroschockgefahr). Der Hautwiderstand fehlt als „Puffer“, und schon sehr kleine Ströme können Herzrhythmusstörungen auslösen. Deshalb sind die zulässigen Patientenableitströme für CF etwa um den Faktor 10 (Normalbetrieb) bis 100 (Netzspannung am Anwendungsteil) niedriger als bei BF.</div>`,
      },
      {
        title: 'Ableitströme',
        html: `
<p>Auch ein intaktes Gerät hat <b>Ableitströme</b>: Isolationen sind nicht ideal, und Kapazitäten (z. B. Entstörkondensatoren, Leitungen, Transformatorwicklungen) koppeln Netzwechselspannung auf Gehäuse und Anwendungsteile. Ableitströme sind also normal – sie dürfen nur <b>Grenzwerte</b> nicht überschreiten.</p>
<ul>
  <li><b>Erdableitstrom</b>: fließt über den Schutzleiter ab.</li>
  <li><b>Berührungsstrom</b> (früher Gehäuseableitstrom): fließt von berührbaren Teilen über eine Person zur Erde.</li>
  <li><b>Patientenableitstrom</b>: fließt vom Anwendungsteil über den Patienten zur Erde.</li>
  <li><b>Patientenhilfsstrom</b>: fließt zwischen Elementen des Anwendungsteils durch den Patienten (z. B. zwischen EKG-Elektroden) und ist nicht für eine physiologische Wirkung bestimmt.</li>
  <li>Bei der Wiederholungsprüfung nach IEC 62353 werden <b>Geräteableitstrom</b> (Summenwirkung von Gehäuse und Anwendungsteilen) und <b>Ableitstrom vom Anwendungsteil</b> gemessen.</li>
</ul>
<p>Messverfahren nach IEC 62353 sind u. a. die <b>direkte Methode</b>, die <b>Differenzstrommethode</b> und die <b>Ersatzableitstrommethode</b> (alternative Methode). Welche geeignet ist, hängt vom Gerät ab und wird nach Herstellerunterlagen und Normtext festgelegt.</p>
<div class="callout warn">Ein steigender Ableitstrom gegenüber früheren Prüfungen kann auf Feuchtigkeit, Verschmutzung, Isolationsschäden oder Bauteilalterung hinweisen – auch wenn der Grenzwert noch eingehalten ist.</div>`,
      },
      {
        title: 'IEC 60601-1 und IEC 62353 – der Unterschied',
        html: `
<table class="plain">
  <thead><tr><th></th><th>IEC 60601-1 (DIN EN 60601-1)</th><th>IEC 62353 (DIN EN 62353, VDE 0751-1)</th></tr></thead>
  <tbody>
    <tr><td><b>Art</b></td><td>Konstruktions- und Typprüfnorm (Basissicherheit und wesentliche Leistungsmerkmale)</td><td>Prüfnorm für <b>wiederkehrende Prüfungen</b> und Prüfungen <b>nach Instandsetzung</b></td></tr>
    <tr><td><b>Zielgruppe</b></td><td>Hersteller, Prüflabore</td><td>Betreiber, Medizintechnik, Service</td></tr>
    <tr><td><b>Prüfbedingungen</b></td><td>Laborbedingungen, u. a. Normal- und Erstfehlerbedingungen, erhöhte Netzspannung, Feuchtekonditionierung</td><td>Praxisgerechte Messungen am Einsatzort/in der Werkstatt mit festgelegten Messverfahren</td></tr>
    <tr><td><b>Grenzwerte</b></td><td>für Typprüfung unter Normal- und Erstfehlerbedingung</td><td>eigene, auf das Messverfahren abgestimmte Grenzwerte; Vergleich mit Vorwerten (Trend) ist ausdrücklich Teil der Bewertung</td></tr>
  </tbody>
</table>
<p>Merke: Die Prüfung nach IEC 62353 <b>wiederholt nicht</b> die Typprüfung nach IEC 60601-1. Sie weist nach, dass die beim Hersteller nachgewiesene Sicherheit im Betrieb und nach einer Instandsetzung <b>erhalten geblieben</b> ist.</p>`,
      },
      {
        title: 'Grenzwerte zur Orientierung',
        html: `
<div class="callout warn"><b>Nur zur Orientierung!</b> Die folgenden Werte geben die Größenordnung häufig zitierter Grenzwerte wieder. Verbindlich sind ausschließlich der aktuelle Normtext, die Herstellerangaben und die Prüfanweisung des Betreibers. Normen werden überarbeitet; Ausgabe und Gültigkeit sind vor jeder Prüfung zu kontrollieren.</div>
<p><b>Wiederholungsprüfung nach IEC 62353 (Beispielwerte)</b></p>
<table class="plain">
  <thead><tr><th>Messung</th><th>Orientierungswert</th></tr></thead>
  <tbody>
    <tr><td>Schutzleiterwiderstand (Schutzklasse I, Gerät einschließlich Netzanschlussleitung)</td><td>≤ 0,3 Ω</td></tr>
    <tr><td>Geräteableitstrom Schutzklasse I</td><td>≤ 500 µA</td></tr>
    <tr><td>Geräteableitstrom Schutzklasse II</td><td>≤ 100 µA</td></tr>
    <tr><td>Ableitstrom vom Anwendungsteil, Typ BF</td><td>≤ 5000 µA</td></tr>
    <tr><td>Ableitstrom vom Anwendungsteil, Typ CF</td><td>≤ 50 µA</td></tr>
    <tr><td>Isolationswiderstand</td><td>Bewertung nach Herstellerangaben bzw. Normtext; Trend gegenüber Vorprüfungen beachten</td></tr>
  </tbody>
</table>
<p><b>Typprüfung nach IEC 60601-1, Patientenableitstrom (Wechselstrom, Beispielwerte)</b></p>
<table class="plain">
  <thead><tr><th>Anwendungsteil</th><th>Normalbedingung</th><th>Erstfehlerbedingung</th></tr></thead>
  <tbody>
    <tr><td>Typ B / BF</td><td>100 µA</td><td>500 µA</td></tr>
    <tr><td>Typ CF</td><td>10 µA</td><td>50 µA</td></tr>
  </tbody>
</table>
<p>In den Fällen dieser App verwendete Grenzwerte sind ebenfalls <b>Lernmodell-Werte</b>.</p>`,
      },
    ],
    related: ['funktionskontrolle', 'rechtlicher-rahmen', 'dokumentation', 'geraeteaufbau'],
  });

  /* ======================= Funktionskontrolle ======================= */
  MTRL.registerKnowledge({
    id: 'funktionskontrolle',
    title: 'Prüfungen nach der Instandsetzung',
    icon: '✅',
    category: 'Recht & Prüfung',
    summary:
      'Sichtprüfung, Funktionsprüfung, Alarmprüfung und elektrische Sicherheitsprüfung nach IEC 62353 – erst wenn alle Prüfungen bestanden und dokumentiert sind, darf ein Gerät freigegeben werden.',
    sections: [
      {
        title: 'Grundsatz',
        html: `
<p>Eine Instandsetzung ist erst abgeschlossen, wenn <b>nachgewiesen</b> ist, dass das Gerät wieder sicher und bestimmungsgemäß funktioniert. Jeder Eingriff – auch ein „einfacher“ Kabeltausch – kann neue Fehler verursachen: vertauschte Adern, eingeklemmte Leitungen, fehlende Schutzleiterverbindung, vergessene Schrauben, nicht gesteckte Verbinder.</p>
<p>Art und Umfang der Prüfungen legt der <b>Hersteller</b> fest (Serviceunterlagen, Prüfanweisung). Die folgenden Schritte zeigen den typischen Ablauf.</p>
<div class="chain">
  <span class="chain-el">Sichtprüfung</span><span class="chain-arrow">→</span>
  <span class="chain-el">Elektrische Sicherheit</span><span class="chain-arrow">→</span>
  <span class="chain-el">Funktionsprüfung</span><span class="chain-arrow">→</span>
  <span class="chain-el">Alarmprüfung</span><span class="chain-arrow">→</span>
  <span class="chain-el">Bewertung &amp; Dokumentation</span><span class="chain-arrow">→</span>
  <span class="chain-el">Kennzeichnung &amp; Freigabe</span>
</div>`,
      },
      {
        title: 'Sichtprüfung',
        html: `
<ul>
  <li>Gehäuse vollständig, unbeschädigt, alle Schrauben und Abdeckungen vorhanden, keine Risse.</li>
  <li>Netzanschlussleitung, Stecker, Knickschutz, Zugentlastung unbeschädigt.</li>
  <li>Patientenkabel, Sensoren, Schläuche: keine Quetschungen, Risse, Verfärbungen, Korrosion.</li>
  <li>Sicherungen mit dem vom Hersteller angegebenen Wert und Typ.</li>
  <li>Aufschriften, Warnhinweise, Typschild und Symbole lesbar.</li>
  <li>Zubehör vollständig und freigegeben; Gebrauchsanweisung verfügbar.</li>
</ul>
<p>Die Sichtprüfung ist der erste Schritt – viele Mängel sind ohne Messgerät erkennbar.</p>`,
      },
      {
        title: 'Elektrische Sicherheitsprüfung nach IEC 62353',
        html: `
<p>Nach einer Instandsetzung an elektrischen Medizingeräten ist in der Regel eine elektrische Sicherheitsprüfung durchzuführen – typischerweise nach IEC 62353 mit einem geeigneten, kalibrierten Sicherheitsprüfgerät. Typischer Ablauf:</p>
<ol>
  <li><b>Sichtprüfung</b> (siehe oben).</li>
  <li><b>Schutzleiterwiderstand</b> bei Schutzklasse I: zwischen Schutzkontakt des Netzsteckers und berührbaren, mit PE verbundenen Teilen; die Netzanschlussleitung dabei bewegen, um Unterbrechungen zu erkennen.</li>
  <li><b>Isolationswiderstand</b>, sofern anwendbar und vom Hersteller nicht ausgeschlossen (z. B. Netzteil gegen PE, Anwendungsteile gegen Netz).</li>
  <li><b>Ableitströme</b>: Geräteableitstrom und Ableitstrom vom Anwendungsteil (bei BF/CF) mit dem geeigneten Messverfahren.</li>
  <li><b>Funktionsprüfung</b> (siehe unten).</li>
  <li><b>Bewertung</b>: Vergleich mit Grenzwerten <b>und</b> mit früheren Messwerten.</li>
  <li><b>Dokumentation</b> aller Messwerte mit Prüfgerät, Messverfahren, Datum und Prüfer.</li>
</ol>
<div class="callout warn">Messungen nach IEC 62353 werden am <b>betriebsbereiten, geschlossenen Gerät</b> von außen durchgeführt. Die Durchführung setzt Kenntnis des Prüfgeräts, der Norm und des Prüflings voraus; Herstellervorgaben gehen vor. Konkrete Grenzwerte siehe Artikel „Elektrische Sicherheit“ (nur Orientierung).</div>`,
      },
      {
        title: 'Funktions- und Alarmprüfung',
        html: `
<p>Die <b>Funktionsprüfung</b> weist nach, dass das Gerät seine Aufgabe erfüllt – mit definierten Prüfsignalen und Referenzmessmitteln:</p>
<table class="plain">
  <thead><tr><th>Gerät (Beispiel)</th><th>Prüfmittel</th><th>Geprüft wird</th></tr></thead>
  <tbody>
    <tr><td>Patientenmonitor</td><td>Patientensimulator, EKG-Simulator</td><td>Anzeige von Herzfrequenz, SpO₂, Kurven; Ableitungen; Sensorerkennung</td></tr>
    <tr><td>Blutdruckmessgerät</td><td>Referenzdruckmessgerät</td><td>Druckanzeige gegen Referenz, Dichtheit, Überdruckabschaltung</td></tr>
    <tr><td>Infusionspumpe</td><td>Infusionspumpen-Analysator</td><td>Förderrate, Okklusionsdruck/-alarm</td></tr>
    <tr><td>Beatmungsgerät</td><td>Gasfluss-Analysator</td><td>Volumen, Druck, Frequenz, O₂-Konzentration – nach Herstellerprüfanweisung</td></tr>
  </tbody>
</table>
<p>Die <b>Alarmprüfung</b> ist ein eigener Schritt: Alarme werden gezielt ausgelöst (z. B. Alarmgrenze unterschreiten, Sensor abziehen, Okklusion simulieren) und optisch <b>und</b> akustisch kontrolliert. Auch der Alarm bei Netzausfall bzw. Akkubetrieb gehört je nach Gerät dazu.</p>
<div class="callout info">Eine Funktionsprüfung prüft <b>das, was repariert wurde, und das, was durch den Eingriff beeinflusst sein könnte</b> – nicht nur das ursprüngliche Symptom.</div>`,
      },
      {
        title: 'Kennzeichnung und Freigabe',
        html: `
<ul>
  <li><b>Bestanden:</b> Prüfkennzeichnung (z. B. Prüfplakette mit Datum der nächsten Prüfung, sofern im Betrieb so festgelegt), Dokumentation abschließen, Gerät durch die befugte Person <b>freigeben</b> und an den Betreiber übergeben.</li>
  <li><b>Nicht bestanden:</b> Gerät <b>nicht</b> freigeben, deutlich als „gesperrt/defekt – nicht benutzen“ kennzeichnen, sicher verwahren, Befund dokumentieren und weiteres Vorgehen klären (erneute Instandsetzung, Hersteller, Aussonderung).</li>
  <li>Eine Freigabe ist eine <b>verantwortliche Entscheidung</b>: Sie setzt voraus, dass alle vorgeschriebenen Prüfungen bestanden und dokumentiert sind.</li>
</ul>`,
      },
    ],
    related: ['elektrische-sicherheit', 'dokumentation', 'rechtlicher-rahmen', 'systematische-fehlersuche'],
  });

  /* ======================= Dokumentation ======================= */
  MTRL.registerKnowledge({
    id: 'dokumentation',
    title: 'Dokumentation in der Medizintechnik',
    icon: '📝',
    category: 'Recht & Prüfung',
    summary:
      'Instandsetzungsbericht, Medizinproduktebuch und Bestandsverzeichnis, Prüfprotokolle, Prüfmittel mit Kalibrierstatus, Freigabe und Meldepflichten bei Vorkommnissen.',
    sections: [
      {
        title: 'Warum dokumentieren?',
        html: `
<p>„Was nicht dokumentiert ist, gilt als nicht gemacht.“ Dokumentation</p>
<ul>
  <li>weist nach, dass Instandhaltung und Prüfungen <b>fachgerecht</b> durchgeführt wurden,</li>
  <li>macht die <b>Gerätehistorie</b> nachvollziehbar (wiederkehrende Fehler, Trends),</li>
  <li>ermöglicht <b>Rückverfolgbarkeit</b> von Ersatzteilen und Prüfmitteln,</li>
  <li>ist Grundlage für Freigabe, Haftungsfragen und behördliche Überprüfungen.</li>
</ul>
<p>Dokumentation muss <b>vollständig, eindeutig, wahrheitsgemäß und zeitnah</b> sein. Nachträgliche Änderungen müssen erkennbar bleiben.</p>`,
      },
      {
        title: 'Instandsetzungsbericht',
        html: `
<table class="plain">
  <thead><tr><th>Inhalt</th><th>Beispiel</th></tr></thead>
  <tbody>
    <tr><td>Geräteidentifikation</td><td>Gerätetyp, Inventarnummer, Seriennummer, Standort/Betreiber</td></tr>
    <tr><td>Auftrag und Fehlerbeschreibung</td><td>Meldung des Anwenders im Wortlaut, Datum</td></tr>
    <tr><td>Befunde</td><td>Messwerte mit Messgerät und Bezugspunkt, Beobachtungen, Tauschtests</td></tr>
    <tr><td>Ursache</td><td>belegte Fehlerursache (nicht Vermutung)</td></tr>
    <tr><td>Maßnahmen</td><td>durchgeführte Arbeiten, eingebaute Teile mit Teile- und Chargen-/Seriennummer</td></tr>
    <tr><td>Prüfungen</td><td>Sicht-, Funktions-, Alarm-, Sicherheitsprüfung mit Ergebnissen</td></tr>
    <tr><td>Prüfmittel</td><td>verwendete Mess- und Prüfgeräte mit Identnummer und Kalibrierstatus</td></tr>
    <tr><td>Ergebnis und Freigabe</td><td>bestanden/nicht bestanden, Datum, Name und Unterschrift der verantwortlichen Person</td></tr>
  </tbody>
</table>`,
      },
      {
        title: 'Bestandsverzeichnis und Medizinproduktebuch',
        html: `
<p>Die Medizinprodukte-Betreiberverordnung (MPBetreibV) verpflichtet den Betreiber zu zwei Arten von Aufzeichnungen (Umfang und Details im aktuellen Verordnungstext prüfen):</p>
<ul>
  <li><b>Bestandsverzeichnis:</b> für die aktiven nichtimplantierbaren Medizinprodukte einer Einrichtung – u. a. Bezeichnung, Hersteller, Typ, Seriennummer, Anschaffungsjahr, Standort, Fristen für Kontrollen.</li>
  <li><b>Medizinproduktebuch:</b> für bestimmte, in den Anlagen der Verordnung genannte Produkte (z. B. solche mit sicherheitstechnischen oder messtechnischen Kontrollen). Es enthält u. a. Nachweise über Funktionsprüfung und Einweisung, Ergebnisse der Kontrollen, Funktionsstörungen und Instandhaltungsmaßnahmen sowie Meldungen von Vorkommnissen.</li>
</ul>
<p>Beide können auch <b>elektronisch</b> geführt werden (z. B. in einer Medizintechnik-Verwaltungssoftware), sofern die Daten während der Aufbewahrungsfrist verfügbar sind.</p>`,
      },
      {
        title: 'Prüfprotokolle und Prüfmittel',
        html: `
<p>Ein <b>Prüfprotokoll</b> hält Messwerte, Grenzwerte, Messverfahren und Bewertung fest. Für Vergleiche über die Jahre (Trendbewertung) müssen die Werte <b>mit Zahlen</b> dokumentiert sein – ein Häkchen „i. O.“ genügt dafür nicht.</p>
<p><b>Prüfmittel</b> (Multimeter, Sicherheitsprüfgerät, Simulatoren, Analysatoren, Referenzdruckmessgeräte) müssen</p>
<ul>
  <li>eindeutig identifizierbar sein (Inventar-/Seriennummer),</li>
  <li>regelmäßig <b>kalibriert</b> werden – der Kalibrierstatus (Datum, nächste Fälligkeit) ist am Gerät erkennbar und wird im Protokoll vermerkt,</li>
  <li>für die Messaufgabe geeignet sein (Messbereich, Genauigkeit),</li>
  <li>vor Gebrauch auf offensichtliche Schäden geprüft werden.</li>
</ul>
<div class="callout warn">Stellt sich heraus, dass ein Prüfmittel außerhalb der Toleranz war, müssen die damit durchgeführten Prüfungen bewertet und ggf. wiederholt werden – nur mit dokumentiertem Prüfmitteleinsatz ist das möglich.</div>`,
      },
      {
        title: 'Vorkommnisse und Meldepflichten',
        html: `
<p>Hat ein Medizinprodukt möglicherweise zu einer schwerwiegenden Verschlechterung des Gesundheitszustands oder zum Tod eines Menschen beigetragen oder hätte es dazu beitragen können, kann eine <b>Meldepflicht</b> bestehen. In Deutschland regeln dies das Medizinprodukterecht-Durchführungsgesetz (MPDG) und die zugehörige Verordnung über Meldungen (Medizinprodukte-Anwendermelde- und Informationsverordnung, MPAMIV). Meldungen von Betreibern und Anwendern gehen an die zuständige Bundesoberbehörde – in der Regel das <b>BfArM</b>.</p>
<ul>
  <li>Wer meldet, welche Fristen gelten und welche Ereignisse meldepflichtig sind, ist im <b>aktuellen Rechtstext</b> und in den internen Regelungen der Einrichtung festgelegt (oft ist der Beauftragte für Medizinproduktesicherheit zuständig).</li>
  <li>Ein beteiligtes Gerät samt Zubehör und Verbrauchsmaterial wird bei Verdacht auf ein Vorkommnis <b>nicht repariert, verändert oder entsorgt</b>, sondern gesichert, bis das weitere Vorgehen geklärt ist. Eine vorschnelle Reparatur kann die Ursachenklärung unmöglich machen.</li>
  <li>Auffälligkeiten, die auf einen systematischen Produktfehler hindeuten, werden an die zuständige Stelle weitergegeben.</li>
</ul>`,
      },
    ],
    related: ['funktionskontrolle', 'rechtlicher-rahmen', 'ersatzteilkunde', 'lernsimulation-vs-service'],
  });

  /* ======================= Rechtlicher Rahmen ======================= */
  MTRL.registerKnowledge({
    id: 'rechtlicher-rahmen',
    title: 'Rechtlicher Rahmen: MDR, MPDG, MPBetreibV',
    icon: '📜',
    category: 'Recht & Prüfung',
    summary:
      'Ein vorsichtiger Überblick über die wichtigsten Regelwerke für Betrieb und Instandhaltung von Medizinprodukten in Deutschland – Betreiberpflichten, Qualifikation, Einweisung, STK und MTK.',
    sections: [
      {
        title: 'Vorbemerkung',
        html: `
<div class="callout warn"><b>Kein Rechtsrat.</b> Dieser Artikel gibt einen allgemeinen, vereinfachten Überblick zu Lernzwecken. Rechtsvorschriften und Normen werden regelmäßig geändert. Maßgeblich ist immer der <b>aktuelle Gesetzes- und Verordnungstext</b>; im Einzelfall sind die Fachabteilung, der Beauftragte für Medizinproduktesicherheit oder eine rechtliche Beratung hinzuzuziehen.</div>`,
      },
      {
        title: 'Die Ebenen des Medizinprodukterechts',
        html: `
<table class="plain">
  <thead><tr><th>Regelwerk</th><th>Ebene</th><th>Inhalt (vereinfacht)</th></tr></thead>
  <tbody>
    <tr><td><b>MDR</b> – Verordnung (EU) 2017/745 über Medizinprodukte</td><td>EU, unmittelbar geltend</td><td>Anforderungen an Medizinprodukte und Hersteller: Klassifizierung, Konformitätsbewertung, CE-Kennzeichnung, klinische Bewertung, Überwachung nach dem Inverkehrbringen, Vigilanz, UDI</td></tr>
    <tr><td><b>MPDG</b> – Medizinprodukterecht-Durchführungsgesetz</td><td>national (Deutschland)</td><td>Ergänzt und konkretisiert die MDR in Deutschland, z. B. Zuständigkeiten von Behörden, Straf- und Bußgeldvorschriften; Grundlage für Verordnungen</td></tr>
    <tr><td><b>MPBetreibV</b> – Medizinprodukte-Betreiberverordnung</td><td>national</td><td>Pflichten beim <b>Betreiben und Anwenden</b>: Einweisung, Instandhaltung, Kontrollen, Dokumentation</td></tr>
    <tr><td><b>MPAMIV</b></td><td>national</td><td>Meldungen von Vorkommnissen und Maßnahmen</td></tr>
    <tr><td><b>Normen</b> (z. B. IEC 60601-Reihe, IEC 62353)</td><td>technische Regeln</td><td>Konkretisieren den Stand der Technik; harmonisierte Normen können die Vermutung der Konformität begründen</td></tr>
  </tbody>
</table>
<p>Daneben gelten weitere Vorschriften, z. B. aus dem Arbeitsschutz (Arbeitsschutzgesetz, Betriebssicherheitsverordnung, Biostoffverordnung, Unfallverhütungsvorschriften der Unfallversicherungsträger).</p>`,
      },
      {
        title: 'Betreiberpflichten nach MPBetreibV',
        html: `
<p><b>Betreiber</b> ist, vereinfacht gesagt, wer für den Betrieb der Gesundheitseinrichtung verantwortlich ist, in der Medizinprodukte angewendet werden (z. B. Klinikträger, Praxisinhaber). Zu seinen Pflichten gehören insbesondere:</p>
<ul>
  <li>Medizinprodukte nur ihrer <b>Zweckbestimmung</b> entsprechend und nach den Vorschriften der Verordnung sowie den allgemein anerkannten Regeln der Technik betreiben und anwenden zu lassen;</li>
  <li>nur Personen mit der dafür erforderlichen <b>Ausbildung oder Kenntnis und Erfahrung</b> mit Anwendung und Instandhaltung zu betrauen;</li>
  <li>die <b>Instandhaltung</b> (Wartung, Inspektion, Instandsetzung, Aufbereitung) nach den Angaben des Herstellers durchführen zu lassen – und zwar durch Personen, Betriebe oder Einrichtungen, die die <b>erforderliche Sachkenntnis, Voraussetzungen und Mittel</b> besitzen;</li>
  <li>nach Instandhaltungsmaßnahmen die für die Sicherheit und Funktionstüchtigkeit wesentlichen <b>konstruktiven und funktionellen Merkmale</b> prüfen zu lassen, soweit sie durch die Maßnahme beeinflusst werden können;</li>
  <li><b>Bestandsverzeichnis</b> und ggf. <b>Medizinproduktebuch</b> zu führen;</li>
  <li>in Gesundheitseinrichtungen ab einer bestimmten Größe (nach derzeitiger Regelung regelmäßig mehr als 20 Beschäftigte) einen <b>Beauftragten für Medizinproduktesicherheit</b> zu bestimmen.</li>
</ul>`,
      },
      {
        title: 'Einweisung',
        html: `
<ul>
  <li>Anwender dürfen ein Medizinprodukt nur anwenden, wenn sie in seine sachgerechte Handhabung <b>eingewiesen</b> sind (Ausnahmen für selbsterklärende Produkte sind im Verordnungstext geregelt).</li>
  <li>Für bestimmte aktive Medizinprodukte (in einer Anlage der MPBetreibV aufgeführt) gelten erweiterte Anforderungen: u. a. <b>Funktionsprüfung am Betriebsort</b> und Einweisung einer vom Betreiber <b>beauftragten Person</b> durch den Hersteller oder eine von ihm befugte Person vor der ersten Inbetriebnahme; die Einweisungen werden dokumentiert.</li>
  <li>Auch Servicepersonal benötigt für die Instandhaltung bestimmter Geräte häufig eine produktspezifische Schulung des Herstellers.</li>
</ul>`,
      },
      {
        title: 'Sicherheitstechnische und messtechnische Kontrollen',
        html: `
<table class="plain">
  <thead><tr><th></th><th>STK – sicherheitstechnische Kontrolle</th><th>MTK – messtechnische Kontrolle</th></tr></thead>
  <tbody>
    <tr><td><b>Ziel</b></td><td>rechtzeitig Mängel erkennen, die die Sicherheit beeinträchtigen können</td><td>nachweisen, dass die Messfunktion die zulässigen Fehlergrenzen einhält</td></tr>
    <tr><td><b>Betrifft</b></td><td>Produkte, für die der Hersteller STK vorschreibt, sowie die in einer Anlage der MPBetreibV genannten aktiven Medizinprodukte</td><td>Medizinprodukte mit Messfunktion, die in einer Anlage der MPBetreibV genannt sind (z. B. bestimmte Blutdruckmessgeräte, Thermometer), sowie solche, für die der Hersteller MTK vorsieht</td></tr>
    <tr><td><b>Fristen</b></td><td>nach Herstellerangaben; die Verordnung enthält ergänzende Vorgaben für fehlende Herstellerangaben</td><td>nach Herstellerangaben bzw. den Fristen der Verordnung</td></tr>
    <tr><td><b>Durchführung</b></td><td>durch Personen mit der erforderlichen Qualifikation, ohne Weisungen hinsichtlich der Kontrolltätigkeit, mit geeigneten Mess- und Prüfeinrichtungen</td><td>durch zuständige Behörden oder entsprechend qualifizierte Personen mit rückgeführten Messmitteln</td></tr>
  </tbody>
</table>
<p>Ergebnisse von STK und MTK werden dokumentiert (Protokoll, Medizinproduktebuch); Produkte mit MTK werden zusätzlich gekennzeichnet. Die genauen Fristen, Anforderungen und Ausnahmen sind dem <b>aktuellen Verordnungstext</b> zu entnehmen.</p>`,
      },
    ],
    related: ['dokumentation', 'funktionskontrolle', 'elektrische-sicherheit', 'lernsimulation-vs-service'],
  });

  /* ======================= Hygiene in der Werkstatt ======================= */
  MTRL.registerKnowledge({
    id: 'hygiene-werkstatt',
    title: 'Hygiene in der Werkstatt',
    icon: '🧤',
    category: 'Recht & Prüfung',
    summary:
      'Gebrauchte Medizinprodukte können infektiös sein. Aufbereitungsnachweis vor der Annahme, persönliche Schutzausrüstung und der sichere Umgang mit kontaminierten Geräten schützen Techniker und Patienten.',
    sections: [
      {
        title: 'Warum Hygiene Arbeitsschutz ist',
        html: `
<p>Medizingeräte aus Patientenbereichen können mit Blut, Körperflüssigkeiten oder Krankheitserregern verunreinigt sein – auch an Stellen, die man nicht sieht (Spalten, Steckverbinder, Lüftungsöffnungen, innere Schlauchsysteme). Der Umgang damit ist Tätigkeit mit möglichen <b>biologischen Arbeitsstoffen</b> und unterliegt dem Arbeitsschutz (u. a. Biostoffverordnung und die Technische Regel TRBA 250 für das Gesundheitswesen).</p>
<p>Gleichzeitig darf die Werkstatt <b>keine Keime zurück zum Patienten</b> tragen: Ein instand gesetztes Gerät verlässt die Werkstatt sauber und wird vor der Anwendung nach den Vorgaben der Einrichtung aufbereitet.</p>`,
      },
      {
        title: 'Aufbereitungsnachweis vor der Annahme',
        html: `
<ul>
  <li>Geräte werden zur Instandsetzung grundsätzlich nur <b>gereinigt und desinfiziert</b> angenommen – mit einer <b>Bestätigung</b> (z. B. Dekontaminations- bzw. Unbedenklichkeitsbescheinigung, Aufbereitungsnachweis) der abgebenden Stelle.</li>
  <li>Die Bestätigung nennt Gerät, Datum, Verfahren/Mittel und die verantwortliche Person.</li>
  <li>Bei Geräten mit inneren Flüssigkeits- oder Gaswegen (z. B. Dialysegeräte, Beatmungsgeräte) gehört dazu auch die <b>Desinfektion der inneren Wege</b> nach Herstellerangaben, soweit vorgesehen.</li>
  <li>Auch für den Versand an Hersteller oder externe Dienstleister ist ein solcher Nachweis üblich und häufig Voraussetzung für die Annahme.</li>
</ul>
<div class="callout info">Fehlt der Nachweis, wird das Gerät nicht „trotzdem schnell angeschaut“, sondern nach dem in der Einrichtung festgelegten Verfahren behandelt (zurück zur Aufbereitung oder Annahme unter besonderen Schutzmaßnahmen).</div>`,
      },
      {
        title: 'Persönliche Schutzausrüstung und Basishygiene',
        html: `
<table class="plain">
  <thead><tr><th>Maßnahme</th><th>Wann</th></tr></thead>
  <tbody>
    <tr><td><b>Händehygiene</b> (Händedesinfektion)</td><td>vor und nach der Arbeit, nach dem Ausziehen von Handschuhen, vor Pausen</td></tr>
    <tr><td><b>Schutzhandschuhe</b></td><td>beim Umgang mit nicht sicher aufbereiteten oder sichtbar verschmutzten Geräten; beim Öffnen von Geräten mit möglicher innerer Kontamination</td></tr>
    <tr><td><b>Schutzbrille, ggf. Mund-Nasen-Schutz</b></td><td>wenn Spritzer oder Aerosole möglich sind (z. B. Öffnen von Schlauchsystemen, Flüssigkeitsreste)</td></tr>
    <tr><td><b>Schutzkittel / Arbeitskleidung</b></td><td>getrennt von Privatkleidung; bei Kontamination wechseln</td></tr>
  </tbody>
</table>
<p>Weitere Grundregeln: kein Essen und Trinken am Arbeitsplatz, Arbeitsflächen und Werkzeuge regelmäßig reinigen und desinfizieren, Impfstatus nach arbeitsmedizinischer Beratung. Welche Schutzausrüstung konkret erforderlich ist, legt die <b>Gefährdungsbeurteilung</b> der Einrichtung fest.</p>`,
      },
      {
        title: 'Umgang mit kontaminierten Geräten',
        html: `
<ol>
  <li><b>Erkennen:</b> sichtbare Verschmutzungen, eingetrocknete Flüssigkeit, Geruch, Flüssigkeitseintritt in das Gehäuse.</li>
  <li><b>Stoppen:</b> Arbeit unterbrechen, nicht weiter zerlegen.</li>
  <li><b>Kennzeichnen und separieren:</b> Gerät als kontaminiert kennzeichnen, in geeigneter Verpackung getrennt ablegen.</li>
  <li><b>Informieren:</b> Abgebende Stelle und Vorgesetzte informieren; Aufbereitung nach Herstellerangaben veranlassen.</li>
  <li><b>Sich selbst schützen:</b> Bei Haut- oder Schleimhautkontakt oder Verletzung (z. B. Schnitt an kontaminiertem Teil) sofort die betrieblichen Sofortmaßnahmen einleiten und den Vorfall dem Betriebsarzt/Durchgangsarzt melden.</li>
</ol>
<div class="callout warn">Spitze und scharfe Gegenstände (z. B. vergessene Kanülen in Zubehörtaschen, Glasbruch) sind eine besondere Verletzungsgefahr – vor dem Hineingreifen Taschen und Fächer sichten.</div>`,
      },
      {
        title: 'Hygiene beim Instandsetzen selbst',
        html: `
<ul>
  <li>Bei der Instandsetzung keine Materialien verwenden, die die <b>Reinigbarkeit</b> verschlechtern (z. B. offene Klebebänder auf Gehäusen, poröse Provisorien).</li>
  <li>Gehäusedichtungen und Abdeckungen vollständig und korrekt montieren – sie verhindern das Eindringen von Flüssigkeiten bei der späteren Reinigung.</li>
  <li>Nur <b>freigegebene Reinigungs- und Desinfektionsmittel</b> verwenden (siehe Gebrauchsanweisung) – ungeeignete Mittel schädigen Kunststoffe und Dichtungen.</li>
  <li>Bei Eingriffen in Flüssigkeits- oder Gaswege (z. B. Blutkreislauf der Dialyse, Sauerstoffführung) gelten besondere Anforderungen an Hygiene und Sicherheit; solche Arbeiten erfolgen ausschließlich nach Herstellerunterlagen durch dafür qualifiziertes Personal.</li>
</ul>`,
      },
    ],
    related: ['dokumentation', 'rechtlicher-rahmen', 'funktionskontrolle'],
  });
})();
