/*
 * Wissensartikel: Grundlagen
 * ------------------------------------------------------------------
 * Lernsimulation vs. reale Servicearbeit, Geräteaufbau, Schaltplan-
 * verständnis, systematische Fehlersuche, Verschleiß, Ersatzteilkunde.
 *
 * Alle Beispiele (Belegungen, Testpunkte, Werte) sind generische
 * Lernmodelle und beziehen sich auf kein reales Produkt.
 */
(function () {
  'use strict';

  /* ======================= Lernsimulation vs. reale Servicearbeit ======================= */
  MTRL.registerKnowledge({
    id: 'lernsimulation-vs-service',
    title: 'Lernsimulation vs. reale Servicearbeit',
    icon: '⚖️',
    category: 'Grundlagen',
    summary:
      'Was diese Lernwerkstatt leisten kann – und was nicht. Warum in der Realität ausschließlich Herstellerunterlagen, Qualifikation, Einweisung und die geltenden Vorschriften maßgeblich sind.',
    sections: [
      {
        title: 'Wofür diese App gedacht ist',
        html: `
<p>Der <b>MedTech Repair Lab</b> ist eine <b>virtuelle Lernwerkstatt</b>. Sie trainiert das <b>methodische Vorgehen</b> bei der Fehlersuche an Medizinprodukten: Informationen sammeln, Hypothesen bilden, gezielt messen, Befunde belegen, eine Ursache begründen, die Instandsetzung prüfen und dokumentieren.</p>
<ul>
  <li>Alle Geräte sind <b>generische Lernmodelle</b>. Sie bilden typische Funktionsprinzipien ab, aber <b>kein reales Produkt</b> eines bestimmten Herstellers.</li>
  <li>Steckerbelegungen, Testpunkte, Servicemenüs, Fehlercodes und Sollwerte in den Fällen sind <b>fiktiv</b> und nur innerhalb der Simulation gültig.</li>
  <li>Die Messgeräte sind vereinfachte, generische Oberflächen. Sie zeigen das Prinzip einer Messung, ersetzen aber nicht die Bedienungsanleitung eines echten Prüfgeräts.</li>
</ul>
<div class="callout info"><b>Kurz gesagt:</b> Die App vermittelt <b>Denk- und Arbeitsweisen</b>. Sie ist <b>keine</b> Serviceanleitung, <b>keine</b> Schulung im Sinne der Herstellerfreigabe und <b>kein</b> Nachweis einer Qualifikation.</div>`,
      },
      {
        title: 'Grenzen der Simulation',
        html: `
<table class="plain">
  <thead><tr><th>In der Simulation</th><th>In der Realität</th></tr></thead>
  <tbody>
    <tr><td>Ein Fehler ist eindeutig definiert und reproduzierbar.</td><td>Fehler sind oft mehrdeutig, überlagert, intermittierend oder durch Bedienung, Umgebung und Zubehör beeinflusst.</td></tr>
    <tr><td>Messwerte werden aus einem Modell berechnet.</td><td>Messwerte hängen von Messmittel, Messaufbau, Kontaktierung, Störungen und Messunsicherheit ab.</td></tr>
    <tr><td>Fehlgriffe haben keine Folgen.</td><td>Falsche Eingriffe können Patienten, Anwender und Techniker gefährden (Stromschlag, Fehlfunktion, ausbleibender Alarm).</td></tr>
    <tr><td>Belegungen, Grenzwerte und Abläufe sind vereinfachte Beispiele.</td><td>Maßgeblich sind ausschließlich die gültigen Herstellerunterlagen und die anwendbaren Normen und Vorschriften in ihrer aktuellen Fassung.</td></tr>
    <tr><td>Sicherheitskritische Baugruppen werden nur erklärt, nicht „repariert“.</td><td>Eingriffe an Netzteil, Hochspannung, Isolationsbarriere, Schutz- und Alarmfunktionen, Gasversorgung oder Blutkreislauf sind autorisiertem, qualifiziertem Personal mit Herstellerunterlagen vorbehalten.</td></tr>
  </tbody>
</table>`,
      },
      {
        title: 'Was in der Realität gilt',
        html: `
<ol>
  <li><b>Herstellerunterlagen:</b> Gebrauchsanweisung, Service- bzw. Technikhandbuch, Prüfanweisungen, Sicherheitsinformationen und Software-Stände des Herstellers sind verbindliche Grundlage jeder Instandhaltung. Ohne diese Unterlagen wird nicht eingegriffen.</li>
  <li><b>Schulung und Einweisung:</b> Viele Hersteller verlangen für bestimmte Servicearbeiten eine produktspezifische Schulung. Anwender müssen in die Handhabung von Medizinprodukten eingewiesen sein.</li>
  <li><b>Qualifikation:</b> Instandhaltung darf nur von Personen, Betrieben oder Einrichtungen durchgeführt werden, die die dafür <b>erforderliche Sachkenntnis, Voraussetzungen und Mittel</b> besitzen (vgl. Medizinprodukte-Betreiberverordnung, MPBetreibV). Arbeiten an elektrischen Anlagen und Betriebsmitteln setzen zusätzlich die entsprechende elektrotechnische Qualifikation voraus.</li>
  <li><b>Befähigung im Einzelfall:</b> Eine Ausbildung allein genügt nicht – es kommt darauf an, ob die Person für <b>genau dieses Gerät und genau diese Tätigkeit</b> befähigt und beauftragt ist.</li>
  <li><b>Prüfung und Freigabe:</b> Nach jeder Instandsetzung folgen die vom Hersteller vorgesehenen Prüfungen (Funktion, Alarme, elektrische Sicherheit, ggf. messtechnische Prüfung). Erst danach wird das Gerät freigegeben.</li>
  <li><b>Dokumentation:</b> Befund, Maßnahmen, verwendete Ersatzteile, Prüfmittel und Prüfergebnisse werden nachvollziehbar dokumentiert.</li>
</ol>`,
      },
      {
        title: 'Verantwortung und Haftung',
        html: `
<p>Wer ein Medizinprodukt instand setzt, übernimmt Verantwortung dafür, dass es danach wieder <b>sicher und bestimmungsgemäß</b> funktioniert. Eigenmächtige, nicht vom Hersteller vorgesehene Eingriffe (z. B. nicht freigegebene Ersatzteile, Umbauten, „Bastellösungen“) können</p>
<ul>
  <li>die <b>Sicherheit</b> von Patienten und Anwendern gefährden,</li>
  <li>die <b>Konformität</b> des Produkts infrage stellen,</li>
  <li>zu <b>straf-, zivil- und arbeitsrechtlichen Konsequenzen</b> führen und Gewährleistungs- bzw. Garantieansprüche beeinträchtigen.</li>
</ul>
<p>Die Verantwortung für den sicheren Betrieb trägt der <b>Betreiber</b> (z. B. Klinik, Praxis); die ausführende Fachkraft verantwortet die fachgerechte Ausführung ihrer Arbeit. Die konkrete rechtliche Bewertung hängt immer vom Einzelfall ab und ist nicht Gegenstand dieser App.</p>
<div class="callout warn"><b>Wichtig:</b> Nichts aus dieser Lernwerkstatt darf als Anleitung für Arbeiten an realen Medizinprodukten verwendet werden. Im Zweifel gilt: <b>nicht eingreifen</b>, Gerät außer Betrieb nehmen, kennzeichnen und die zuständige Stelle (Medizintechnik, Hersteller, autorisierter Service) informieren.</div>`,
      },
      {
        title: 'Wie man die App sinnvoll nutzt',
        html: `
<ul>
  <li>Konzentriere dich auf den <b>Weg zur Diagnose</b>: Warum messe ich hier? Was erwarte ich? Was schließt das Ergebnis aus?</li>
  <li>Lies die <b>Grundlagenabschnitte</b> jedes Falls – sie erklären Messprinzipien, die in der Realität ebenso gelten.</li>
  <li>Übe im <b>Messgerätelabor</b>, Messergebnisse zu deuten, bevor du sie in einem Fall brauchst.</li>
  <li>Übertrage das Gelernte in Ausbildung und Studium immer <b>unter Anleitung</b> und mit den <b>echten Unterlagen</b> des jeweiligen Geräts.</li>
</ul>`,
      },
    ],
    related: ['rechtlicher-rahmen', 'systematische-fehlersuche', 'funktionskontrolle', 'dokumentation'],
  });

  /* ======================= Geräteaufbau ======================= */
  MTRL.registerKnowledge({
    id: 'geraeteaufbau',
    title: 'Typischer Aufbau aktiver Medizinprodukte',
    icon: '🧩',
    category: 'Grundlagen',
    summary:
      'Vom Netzteil bis zum Alarmsystem: die Funktionsblöcke, aus denen fast jedes aktive Medizinprodukt besteht – und warum diese Gliederung bei der Fehlersuche hilft.',
    sections: [
      {
        title: 'Das Blockmodell',
        html: `
<p>Ob Patientenmonitor, Infusionspumpe oder Beatmungsgerät – <b>aktive Medizinprodukte</b> (also Produkte, die eine Energiequelle benötigen) lassen sich in wiederkehrende Funktionsblöcke gliedern:</p>
<div class="chain">
  <span class="chain-el">Energieversorgung<small>Netzteil, Akku</small></span><span class="chain-arrow">→</span>
  <span class="chain-el">Steuerung<small>Mikrocontroller, Software</small></span><span class="chain-arrow">↔</span>
  <span class="chain-el">Sensorik / Aktorik<small>messen, wirken</small></span><span class="chain-arrow">↔</span>
  <span class="chain-el">Anwendungsteil<small>Kontakt zum Patienten</small></span>
</div>
<div class="chain">
  <span class="chain-el">Bedienung &amp; Anzeige<small>Tasten, Display</small></span><span class="chain-arrow">↔</span>
  <span class="chain-el">Alarmsystem<small>optisch, akustisch</small></span><span class="chain-arrow">↔</span>
  <span class="chain-el">Schnittstellen<small>Netzwerk, Schwesternruf</small></span>
</div>
<p>Wer diese Blöcke kennt, kann ein Symptom schnell einem Bereich zuordnen („Anzeige dunkel, aber Lüfter läuft“ → Versorgung vermutlich vorhanden, eher Anzeige oder Steuerung).</p>`,
      },
      {
        title: 'Energieversorgung',
        html: `
<ul>
  <li><b>Netzteil:</b> Wandelt die Netzspannung (in Europa 230 V AC) in sichere Kleinspannungen (z. B. 12 V, 5 V, 3,3 V). Es enthält die erste <b>Isolationsbarriere</b> zwischen Netz und Gerätelektronik.</li>
  <li><b>Akku:</b> Überbrückt Netzausfälle und ermöglicht Transport. Ein <b>Lademanagement</b> überwacht Spannung, Strom und Temperatur. Die Akkukapazität nimmt mit Alter und Zyklen ab (siehe Artikel Verschleiß).</li>
  <li><b>Spannungsregler</b> auf der Hauptplatine erzeugen die einzelnen Betriebsspannungen; Überwachungsschaltungen lösen bei Unter- oder Überspannung einen Reset oder Alarm aus.</li>
</ul>
<div class="callout warn">Netzteil und Netzeingang führen <b>gefährliche Spannungen</b> – auch nach dem Abschalten können Kondensatoren noch geladen sein. Arbeiten daran sind nur qualifiziertem Personal nach Herstellerunterlagen erlaubt.</div>`,
      },
      {
        title: 'Steuerung und Software',
        html: `
<p>Ein oder mehrere <b>Mikrocontroller</b> bzw. Prozessoren werten Sensorsignale aus, steuern Aktoren, verwalten die Bedienoberfläche und das Alarmsystem. Bei sicherheitsrelevanten Funktionen findet man oft eine <b>zweikanalige Architektur</b>: Ein zweiter, unabhängiger Controller überwacht den ersten (z. B. Förderrate einer Pumpe) und kann das Gerät in einen sicheren Zustand versetzen.</p>
<ul>
  <li><b>Software</b> ist Teil des Medizinprodukts. Sie wird nach geregelten Prozessen entwickelt (z. B. nach IEC 62304) und darf nur mit vom Hersteller freigegebenen Versionen und Werkzeugen aktualisiert werden.</li>
  <li><b>Selbsttests</b> beim Einschalten (Power-On-Self-Test) prüfen Speicher, Sensoren, Alarmgeber und Versorgung – ihre Meldungen sind wertvolle Diagnosehinweise.</li>
  <li><b>Fehlerspeicher/Logbuch:</b> Viele Geräte protokollieren Ereignisse. Auslesen und Deutung erfolgen nach Herstellerunterlagen.</li>
</ul>`,
      },
      {
        title: 'Sensorik, Aktorik und Anwendungsteile',
        html: `
<table class="plain">
  <thead><tr><th>Block</th><th>Aufgabe</th><th>Beispiele</th></tr></thead>
  <tbody>
    <tr><td><b>Sensorik</b></td><td>Physikalische Größe → elektrisches Signal</td><td>EKG-Elektroden, SpO₂-Photodiode, Drucksensor, Flusssensor, Temperaturfühler, Luftblasendetektor</td></tr>
    <tr><td><b>Signalaufbereitung</b></td><td>Verstärken, filtern, digitalisieren</td><td>Instrumentenverstärker, Transimpedanzverstärker, Tiefpass, A/D-Wandler</td></tr>
    <tr><td><b>Aktorik</b></td><td>Elektrisches Signal → Wirkung</td><td>Schrittmotor einer Spritzenpumpe, Ventile, Gebläse, Heizung, Defibrillator-Entladekreis</td></tr>
    <tr><td><b>Anwendungsteil</b></td><td>Teil, der bestimmungsgemäß den Patienten berührt</td><td>EKG-Kabel mit Elektroden, Blutdruckmanschette, SpO₂-Sensor, Beatmungsschlauch-Interface</td></tr>
  </tbody>
</table>
<p>Anwendungsteile werden nach ihrem Schutzgrad gegen elektrischen Schlag in die Typen <b>B, BF und CF</b> eingeteilt (siehe Artikel Elektrische Sicherheit).</p>`,
      },
      {
        title: 'Isolation und Schutzkonzept',
        html: `
<p>Der Patient darf auch im Fehlerfall keinem gefährlichen Strom ausgesetzt sein. Deshalb trennen <b>Isolationsbarrieren</b> die Stromkreise:</p>
<ol>
  <li><b>Netzteil-Isolation:</b> trennt Netzspannung von der Gerätelektronik (Transformator, Optokoppler im Regelkreis).</li>
  <li><b>Patientenisolation:</b> trennt das Anwendungsteil (bei BF/CF „schwebend“, englisch <i>floating</i>) von der übrigen Elektronik und vom Schutzleiter – z. B. mit isolierenden DC/DC-Wandlern und Optokopplern bzw. digitalen Isolatoren für die Signale.</li>
</ol>
<p>Kriech- und Luftstrecken, Isolationsmaterialien und Bauteile dieser Barrieren sind <b>sicherheitsrelevant</b> und nach Norm ausgelegt. Sie dürfen weder verändert noch durch nicht freigegebene Teile ersetzt werden.</p>
<div class="callout info">Merksatz: <b>Die Isolationsbarriere ist eine Schutzmaßnahme, keine Reparaturstelle.</b> Ihre Wirksamkeit wird nach der Instandsetzung messtechnisch (Ableitströme) nachgewiesen.</div>`,
      },
      {
        title: 'Alarmsystem',
        html: `
<p>Das <b>Alarmsystem</b> soll Anwender zuverlässig auf gefährliche Situationen aufmerksam machen – physiologische Alarme (z. B. SpO₂ zu niedrig) ebenso wie technische Alarme (z. B. Sensor ab, Akku leer, Okklusion). Anforderungen an Alarmsysteme beschreibt die Ergänzungsnorm <b>IEC 60601-1-8</b>, u. a. Prioritäten (hoch, mittel, niedrig) mit unterscheidbaren optischen und akustischen Signalen.</p>
<ul>
  <li>Alarmgeber (Lautsprecher, Summer, Leuchten) werden oft beim Einschalten selbst getestet.</li>
  <li>Ein ausbleibender Alarm ist ein <b>schwerwiegender Fehler</b> – Alarmfunktionen werden nach jeder Instandsetzung geprüft.</li>
  <li>Alarmgrenzen, Lautstärke-Mindestwerte und Stummschaltlogik dürfen nur im vom Hersteller vorgesehenen Rahmen verändert werden.</li>
</ul>`,
      },
    ],
    related: ['schaltplanverstaendnis', 'elektrische-sicherheit', 'systematische-fehlersuche', 'verschleiss'],
  });

  /* ======================= Schaltplanverständnis ======================= */
  const SVG_EXAMPLE = `
<svg viewBox="0 0 470 300" width="100%" style="max-width:560px;color:#e3edf2;background:#0f191f;border-radius:10px;border:1px solid #2a3b47" role="img" aria-label="Beispielschaltung: Spannungsteiler aus R1 und R2 speist einen nichtinvertierenden Verstärker mit Rf und Rg; Testpunkte TP1 und TP2">
  <g fill="none" stroke="currentColor" stroke-width="2">
    <!-- Versorgung und Spannungsteiler -->
    <line x1="60" y1="30" x2="60" y2="50"/>
    <rect x="52" y="50" width="16" height="40"/>
    <line x1="60" y1="90" x2="60" y2="130"/>
    <rect x="52" y="130" width="16" height="40"/>
    <line x1="60" y1="170" x2="60" y2="190"/>
    <line x1="50" y1="190" x2="70" y2="190"/><line x1="54" y1="194" x2="66" y2="194"/><line x1="58" y1="198" x2="62" y2="198"/>
    <!-- Verbindung zum OPV -->
    <line x1="60" y1="110" x2="200" y2="110"/>
    <!-- OPV -->
    <polygon points="200,90 200,170 280,130"/>
    <line x1="280" y1="130" x2="400" y2="130"/>
    <!-- Gegenkopplung -->
    <line x1="200" y1="150" x2="170" y2="150"/>
    <line x1="170" y1="150" x2="170" y2="210"/>
    <line x1="170" y1="210" x2="230" y2="210"/>
    <rect x="230" y="202" width="40" height="16"/>
    <line x1="270" y1="210" x2="330" y2="210"/>
    <line x1="330" y1="210" x2="330" y2="130"/>
    <line x1="170" y1="210" x2="170" y2="225"/>
    <rect x="162" y="225" width="16" height="40"/>
    <line x1="170" y1="265" x2="170" y2="280"/>
    <line x1="160" y1="280" x2="180" y2="280"/><line x1="164" y1="284" x2="176" y2="284"/><line x1="168" y1="288" x2="172" y2="288"/>
  </g>
  <g fill="currentColor">
    <circle cx="60" cy="30" r="3"/>
    <circle cx="60" cy="110" r="4"/>
    <circle cx="170" cy="210" r="4"/>
    <circle cx="330" cy="130" r="4"/>
    <circle cx="400" cy="130" r="3"/>
  </g>
  <g fill="none" stroke="#14b8a6" stroke-width="2">
    <circle cx="110" cy="110" r="7"/>
    <circle cx="370" cy="130" r="7"/>
  </g>
  <g fill="currentColor" font-family="sans-serif" font-size="13">
    <text x="72" y="26">U<tspan font-size="10" dy="3">E</tspan><tspan dy="-3"> = +5 V</tspan></text>
    <text x="76" y="68">R1</text><text x="76" y="83" font-size="11">10 kΩ</text>
    <text x="76" y="148">R2</text><text x="76" y="163" font-size="11">10 kΩ</text>
    <text x="206" y="115">+</text>
    <text x="206" y="155">−</text>
    <text x="220" y="80" font-size="11">OPV (Versorgung ±12 V)</text>
    <text x="236" y="236">Rf 10 kΩ</text>
    <text x="186" y="243">Rg</text><text x="186" y="258" font-size="11">10 kΩ</text>
    <text x="408" y="134">U<tspan font-size="10" dy="3">A</tspan></text>
  </g>
  <g fill="#14b8a6" font-family="sans-serif" font-size="12" font-weight="bold">
    <text x="98" y="96">TP1</text>
    <text x="356" y="116">TP2</text>
  </g>
  <text x="20" y="296" fill="#8fa3b0" font-family="sans-serif" font-size="11">Lernbeispiel – keine reale Geräteschaltung</text>
</svg>`;

  MTRL.registerKnowledge({
    id: 'schaltplanverstaendnis',
    title: 'Schaltpläne lesen und verstehen',
    icon: '📐',
    category: 'Grundlagen',
    summary:
      'Schaltzeichen, Blockschaltbild und Stromlaufplan, Bezugspotentiale und Testpunkte: das Handwerkszeug, um Signale gezielt zu verfolgen – mit einem durchgerechneten Beispiel.',
    sections: [
      {
        title: 'Blockschaltbild und Stromlaufplan',
        html: `
<table class="plain">
  <thead><tr><th></th><th>Blockschaltbild</th><th>Stromlaufplan (Schaltplan)</th></tr></thead>
  <tbody>
    <tr><td><b>Zeigt</b></td><td>Funktionsblöcke und Signalfluss (z. B. Sensor → Verstärker → A/D-Wandler → Prozessor)</td><td>Jedes Bauteil mit Bezeichner (R12, C5, U3), Wert und jede Verbindung</td></tr>
    <tr><td><b>Zweck</b></td><td>Überblick, Eingrenzen der fehlerhaften Baugruppe</td><td>Detaillierte Fehlersuche auf Bauteilebene, Messpunkte festlegen</td></tr>
    <tr><td><b>Leserichtung</b></td><td>meist links (Eingang) → rechts (Ausgang)</td><td>ebenso; Versorgung oben, Masse unten; Verbindungen über Netznamen und Querverweise zwischen Blättern</td></tr>
  </tbody>
</table>
<p>Vorgehen in der Praxis: <b>erst</b> mit dem Blockschaltbild die betroffene Baugruppe eingrenzen, <b>dann</b> im Stromlaufplan gezielt messen. Echte Schaltpläne stellt – wenn überhaupt – nur der Hersteller im Rahmen seiner Serviceunterlagen zur Verfügung.</p>`,
      },
      {
        title: 'Wichtige Schaltzeichen',
        html: `
<p>Schaltzeichen sind international genormt (IEC 60617); daneben begegnen dir in Unterlagen auch nordamerikanische Darstellungen.</p>
<table class="plain">
  <thead><tr><th>Bauteil</th><th>Darstellung</th><th>Kennbuchstabe (typisch)</th><th>Hinweis</th></tr></thead>
  <tbody>
    <tr><td>Widerstand</td><td>Rechteck (IEC); Zickzacklinie (US)</td><td>R</td><td>Wert in Ω, kΩ, MΩ; „4k7“ bedeutet 4,7 kΩ</td></tr>
    <tr><td>Kondensator</td><td>zwei parallele Striche</td><td>C</td><td>Elektrolytkondensator mit „+“ bzw. einer gebogenen/gefüllten Platte – <b>gepolt</b></td></tr>
    <tr><td>Spule / Drossel</td><td>Rechteck gefüllt oder Bögen</td><td>L</td><td>Filter, Schaltregler</td></tr>
    <tr><td>Transformator</td><td>zwei gekoppelte Wicklungen</td><td>T, TR</td><td>oft Teil einer Isolationsbarriere</td></tr>
    <tr><td>Diode</td><td>Dreieck mit Querstrich (Kathode)</td><td>D, V</td><td>Strom fließt in Pfeilrichtung</td></tr>
    <tr><td>Z-Diode</td><td>Diode mit abgewinkeltem Querstrich</td><td>D, Z</td><td>Spannungsbegrenzung/-referenz</td></tr>
    <tr><td>LED / Photodiode</td><td>Diode mit Pfeilen nach außen / nach innen</td><td>D</td><td>Lichtsender / Lichtempfänger (z. B. SpO₂)</td></tr>
    <tr><td>Transistor</td><td>Kreis mit Basis, Kollektor, Emitter (bzw. Gate, Drain, Source)</td><td>Q, T</td><td>Schalter oder Verstärker</td></tr>
    <tr><td>Operationsverstärker</td><td>Dreieck mit Eingängen „+“ und „−“</td><td>U, IC, N</td><td>Versorgungsanschlüsse oft nicht eingezeichnet</td></tr>
    <tr><td>Optokoppler</td><td>LED und Phototransistor in gemeinsamem Rahmen, Lichtpfeile dazwischen</td><td>U, OK</td><td>überträgt Signale über eine Isolationsbarriere</td></tr>
    <tr><td>Sicherung</td><td>Rechteck mit durchgehender Linie</td><td>F</td><td>Nennstrom und Auslösecharakteristik beachten</td></tr>
    <tr><td>Masse / Bezugspotential</td><td>waagerechte Striche, nach unten kürzer werdend (bzw. Dreieck)</td><td>GND</td><td>verschiedene Massen haben eigene Symbole/Namen</td></tr>
    <tr><td>Schutzleiter</td><td>Erdungszeichen im Kreis</td><td>PE</td><td>sicherheitsrelevant, siehe Elektrische Sicherheit</td></tr>
    <tr><td>Testpunkt</td><td>kleiner Kreis / Pad mit Bezeichnung</td><td>TP</td><td>vorgesehene Messstelle</td></tr>
  </tbody>
</table>`,
      },
      {
        title: 'Bezugspotentiale und Masse',
        html: `
<p>Eine Spannung ist immer eine <b>Potentialdifferenz zwischen zwei Punkten</b>. Ein Schaltplan nennt daher, worauf sich Spannungen beziehen. In Medizinprodukten gibt es oft <b>mehrere, voneinander getrennte Bezugspotentiale</b>:</p>
<ul>
  <li><b>PE</b> – Schutzleiter, mit dem Gehäuse (Schutzklasse I) verbunden.</li>
  <li><b>GND / DGND / AGND</b> – Masse der Geräteelektronik, oft getrennt in Digital- und Analogmasse, die an einem Punkt zusammengeführt werden.</li>
  <li><b>Primärseite</b> des Netzteils – liegt auf Netzpotential! Ein dort gemessenes „0 V“ ist <b>nicht</b> berührungssicher.</li>
  <li><b>Isolierte Patientenmasse</b> (z. B. „ISO-GND“) – Bezugspunkt des schwebenden Anwendungsteils, galvanisch getrennt von GND und PE.</li>
</ul>
<div class="callout warn"><b>Achtung bei der Messung:</b> Die Masseklemme eines netzbetriebenen Oszilloskops ist in der Regel mit dem Schutzleiter verbunden. Wird sie an ein anderes Bezugspotential angeschlossen, kann das einen Kurzschluss verursachen, die Isolation überbrücken oder Messergebnisse verfälschen. Welche Messungen zulässig sind und mit welchen Messmitteln (z. B. Differenztastkopf), legen die Herstellerunterlagen fest.</div>`,
      },
      {
        title: 'Typische Baugruppen',
        html: `
<table class="plain">
  <thead><tr><th>Baugruppe</th><th>Funktion</th><th>Was man typischerweise prüft</th></tr></thead>
  <tbody>
    <tr><td><b>Linear- oder Schaltregler</b></td><td>erzeugt aus einer höheren Spannung eine stabile Betriebsspannung (z. B. 12 V → 3,3 V)</td><td>Eingang vorhanden? Ausgang im Sollbereich? Restwelligkeit (Oszilloskop)? Bauteil ungewöhnlich heiß?</td></tr>
    <tr><td><b>Operationsverstärker (OPV)</b></td><td>verstärkt Spannungsdifferenzen; Verstärkung durch äußere Widerstände bestimmt</td><td>Versorgung, Eingangs- und Ausgangsspannung; Ausgang dauerhaft an einer Versorgungsgrenze = übersteuert oder Rückkopplung unterbrochen</td></tr>
    <tr><td><b>Transimpedanzverstärker (TIA)</b></td><td>wandelt kleinen Strom (z. B. Photostrom im nA–µA-Bereich) in Spannung: U<sub>A</sub> = −I · R<sub>f</sub></td><td>Ausgangssignal mit und ohne Licht; sehr störempfindlich, Schirmung beachten</td></tr>
    <tr><td><b>Instrumentenverstärker</b></td><td>verstärkt kleine Differenzsignale (z. B. EKG im mV-Bereich) und unterdrückt Gleichtaktstörungen</td><td>Signal am Ausgang, Gleichtaktunterdrückung (z. B. 50-Hz-Brumm)</td></tr>
    <tr><td><b>A/D-Wandler</b></td><td>tastet die Analogspannung ab und wandelt sie in Zahlen; Auflösung (z. B. 12 bit), Referenzspannung und Abtastrate bestimmen die Qualität</td><td>Referenzspannung; Eingang im zulässigen Bereich</td></tr>
    <tr><td><b>Optokoppler / digitaler Isolator</b></td><td>überträgt Signale über die Isolationsbarriere ohne leitende Verbindung</td><td>Signal auf beiden Seiten vorhanden? – Eingriffe an der Barriere nur nach Herstellerunterlagen</td></tr>
  </tbody>
</table>`,
      },
      {
        title: 'Beispiel: Spannungsteiler mit Verstärker',
        html: `
${SVG_EXAMPLE}
<p><b>Spannungsteiler:</b> R1 und R2 teilen die Eingangsspannung. Ohne Belastung gilt</p>
<p class="formula">U<sub>TP1</sub> = U<sub>E</sub> · R2 / (R1 + R2) = 5 V · 10 kΩ / 20 kΩ = 2,5 V</p>
<p>Der OPV-Eingang ist sehr hochohmig und belastet den Teiler praktisch nicht.</p>
<p><b>Nichtinvertierender Verstärker:</b> Der OPV regelt seinen Ausgang so, dass am „−“-Eingang dieselbe Spannung liegt wie am „+“-Eingang. Daraus folgt die Verstärkung</p>
<p class="formula">v = 1 + R<sub>f</sub> / R<sub>g</sub> = 1 + 10 kΩ / 10 kΩ = 2 &nbsp;→&nbsp; U<sub>TP2</sub> = 2 · 2,5 V = 5,0 V</p>
<p><b>Fehler lesen lernen</b> – was bedeuten abweichende Messwerte (gegen Masse gemessen)?</p>
<table class="plain">
  <thead><tr><th>TP1</th><th>TP2</th><th>Plausible Deutung</th></tr></thead>
  <tbody>
    <tr><td>2,5 V</td><td>5,0 V</td><td>Schaltung in Ordnung</td></tr>
    <tr><td>5,0 V</td><td>≈ 10 V</td><td>R2 hochohmig/unterbrochen: kein Strom durch R1 → kein Spannungsabfall, TP1 liegt auf U<sub>E</sub>; der Verstärker verdoppelt korrekt (bei kleinerer Versorgung würde er an seine Aussteuergrenze stoßen)</td></tr>
    <tr><td>0 V</td><td>0 V</td><td>R1 unterbrochen, R2 kurzgeschlossen oder keine Eingangsspannung → Eingang prüfen</td></tr>
    <tr><td>2,5 V</td><td>2,5 V</td><td>Verstärkung 1: R<sub>g</sub> unterbrochen (oder R<sub>f</sub> überbrückt)</td></tr>
    <tr><td>2,5 V</td><td>≈ Versorgungsgrenze</td><td>Gegenkopplung unterbrochen (R<sub>f</sub> offen) oder OPV defekt</td></tr>
  </tbody>
</table>
<div class="callout info">Erkenntnis: <b>Ein einziger Messwert sagt wenig – erst der Vergleich Eingang ↔ Ausgang einer Stufe grenzt den Fehler ein.</b></div>`,
      },
      {
        title: 'Signalverfolgung und Testpunkte',
        html: `
<ol>
  <li><b>Sollwerte klären:</b> Welche Spannung bzw. welches Signal erwarte ich an jedem Punkt? (Herstellerunterlagen, Berechnung, Vergleichsgerät)</li>
  <li><b>Versorgung zuerst:</b> Ohne korrekte Betriebsspannung sind alle weiteren Messungen an einer Stufe wertlos.</li>
  <li><b>Am Eingang beginnen</b> und Stufe für Stufe in Signalrichtung messen – oder bei langen Ketten in der Mitte (Halbierungsmethode).</li>
  <li><b>Ort des Übergangs finden:</b> Der Fehler liegt zwischen dem letzten Punkt mit richtigem und dem ersten Punkt mit falschem Signal.</li>
  <li><b>Bezugspunkt notieren:</b> Messwert immer mit Bezugspotential, Messgerät und Einstellung dokumentieren.</li>
</ol>
<p><b>Testpunkte (TP)</b> sind vom Hersteller vorgesehene Messstellen. Ihre Bezeichnung und die zugehörigen Sollwerte stehen nur in den Serviceunterlagen. In den Fällen dieser App sind alle Testpunkte <b>fiktiv</b> (Lernmodell).</p>`,
      },
    ],
    related: ['geraeteaufbau', 'systematische-fehlersuche', 'elektrische-sicherheit'],
  });

  /* ======================= Systematische Fehlersuche ======================= */
  MTRL.registerKnowledge({
    id: 'systematische-fehlersuche',
    title: 'Systematische Fehlersuche',
    icon: '🔍',
    category: 'Fehlersuche',
    summary:
      'Vom Fehlerbericht zur belegten Ursache: Anamnese, Reproduzieren, Halbierungsmethode, Signalverfolgung, Tauschtest und Hypothesenarbeit – und warum „Tausch auf Verdacht“ keine Methode ist.',
    sections: [
      {
        title: 'Grundhaltung',
        html: `
<p>Gute Fehlersuche ist <b>kein Raten</b>, sondern ein strukturierter Erkenntnisprozess. Jede Maßnahme soll eine Frage beantworten: <i>„Was weiß ich nach dieser Messung mehr als vorher?“</i></p>
<div class="chain">
  <span class="chain-el">1 Informationen sammeln</span><span class="chain-arrow">→</span>
  <span class="chain-el">2 Fehler reproduzieren</span><span class="chain-arrow">→</span>
  <span class="chain-el">3 Hypothesen bilden</span><span class="chain-arrow">→</span>
  <span class="chain-el">4 gezielt prüfen</span><span class="chain-arrow">→</span>
  <span class="chain-el">5 Ursache belegen</span><span class="chain-arrow">→</span>
  <span class="chain-el">6 beheben &amp; prüfen</span><span class="chain-arrow">→</span>
  <span class="chain-el">7 dokumentieren</span>
</div>
<p>Vor jeder Fehlersuche stehen: <b>Aufbereitungsnachweis</b> (siehe Hygiene in der Werkstatt), passende <b>Herstellerunterlagen</b> und die Frage, ob man für diese Arbeit <b>qualifiziert und beauftragt</b> ist.</p>`,
      },
      {
        title: 'Anamnese: Informationen sammeln',
        html: `
<p>Wie in der Medizin beginnt die Diagnose mit der <b>Anamnese</b> – der Befragung und Sammlung von Vorinformationen:</p>
<ul>
  <li><b>Was genau</b> ist aufgefallen? (Wortlaut der Meldung, Anzeige, Geräusch, Geruch)</li>
  <li><b>Wann</b> tritt es auf? (immer, sporadisch, nach dem Einschalten, bei Bewegung, nach Reinigung, bei Akkubetrieb)</li>
  <li><b>Was</b> wurde vorher gemacht? (Sturz, Flüssigkeitseintritt, Zubehörwechsel, Softwareupdate)</li>
  <li><b>Mit welchem Zubehör</b>? Tritt der Fehler auch an einem anderen Bettplatz/mit anderem Kabel auf?</li>
  <li><b>Gerätehistorie:</b> frühere Reparaturen, Prüfprotokolle, Fehlerspeicher, bekannte Sicherheitsinformationen des Herstellers.</li>
</ul>
<p>Erfahrungsgemäß lassen sich viele gemeldete „Gerätedefekte“ bereits hier auf Zubehör, Bedienung oder Einstellungen zurückführen.</p>`,
      },
      {
        title: 'Reproduzieren und Hypothesen bilden',
        html: `
<p><b>Reproduzieren</b> heißt: den Fehler unter kontrollierten Bedingungen selbst beobachten. Ein Fehler, den man nicht sieht, kann man auch nicht sicher als behoben erklären.</p>
<p>Dann folgen <b>Hypothesen</b> – mögliche Ursachen, die das beobachtete Verhalten vollständig erklären. Zu jeder Hypothese gehört eine Vorhersage:</p>
<table class="plain">
  <thead><tr><th>Hypothese</th><th>Wenn sie stimmt, dann …</th><th>Prüfung</th></tr></thead>
  <tbody>
    <tr><td>Sensor defekt</td><td>… funktioniert ein bekannt guter Sensor am selben Kabel</td><td>Tauschtest Sensor</td></tr>
    <tr><td>Adapterkabel unterbrochen</td><td>… zeigt die Durchgangsprüfung der betroffenen Ader „offen“</td><td>Widerstandsmessung je Ader, Biegetest</td></tr>
    <tr><td>Messmodul defekt</td><td>… bleibt der Fehler mit bekannt gutem Zubehör / Simulator bestehen</td><td>Patientensimulator direkt am Gerät</td></tr>
  </tbody>
</table>
<p>Wähle zuerst Prüfungen, die <b>einfach, sicher und aussagekräftig</b> sind und <b>mehrere Hypothesen gleichzeitig</b> bestätigen oder ausschließen. Eine Hypothese gilt erst als <b>belegt</b>, wenn ein Befund sie bestätigt und plausible Alternativen ausgeschlossen sind.</p>`,
      },
      {
        title: 'Halbierungsmethode und Signalverfolgung',
        html: `
<p><b>Halbierungsmethode</b> (englisch <i>split half</i>): Bei einer langen Signalkette misst man zuerst in der <b>Mitte</b>. Ist das Signal dort korrekt, liegt der Fehler in der hinteren Hälfte, sonst in der vorderen. Mit jeder Messung halbiert sich der Suchraum – bei 16 Stufen genügen höchstens 4 Messungen statt bis zu 15.</p>
<p><b>Signalverfolgung</b>: Man speist ein definiertes Signal ein (z. B. mit einem Patientensimulator) und verfolgt es Stufe für Stufe bis zu der Stelle, an der es verschwindet oder verfälscht wird.</p>
<ul>
  <li>Vom Bekannten zum Unbekannten: zuerst Versorgung, dann Signal.</li>
  <li>Immer <b>Ein- und Ausgang derselben Stufe</b> vergleichen.</li>
  <li>Prüfsignale bevorzugen, deren Sollwert bekannt ist (Simulator, Referenz).</li>
</ul>`,
      },
      {
        title: 'Tauschtest mit bekannt guten Teilen',
        html: `
<p>Beim <b>Tauschtest</b> wird ein verdächtiges, leicht steckbares Teil (Kabel, Sensor, Akku, Zubehör) vorübergehend durch ein <b>bekannt gutes Teil</b> (englisch <i>known good</i>) ersetzt. Verschwindet der Fehler, ist das getauschte Teil stark verdächtig; bleibt er, ist es weitgehend entlastet.</p>
<ul>
  <li>Nur <b>ein</b> Teil auf einmal tauschen – sonst ist das Ergebnis nicht eindeutig.</li>
  <li>Das Tauschteil muss <b>nachweislich in Ordnung</b> und für das Gerät freigegeben sein.</li>
  <li>Den Befund am ausgebauten Teil <b>bestätigen</b> (z. B. durch Messung), bevor es endgültig ausgesondert wird.</li>
  <li>Tauschtests im Geräteinneren (Platinen, Module) nur, wenn die Herstellerunterlagen dies vorsehen.</li>
</ul>
<div class="callout warn"><b>Kein Tausch auf Verdacht!</b> Wer Teile „auf gut Glück“ wechselt, verursacht Kosten, verschleiert die wahre Ursache, riskiert Folgefehler und lernt nichts. Ersetzt wird, was durch Befunde als defekt <b>belegt</b> ist.</div>`,
      },
      {
        title: 'Intermittierende Fehler',
        html: `
<p><b>Intermittierende</b> (zeitweise auftretende) Fehler sind besonders tückisch: Beim Test ist „alles in Ordnung“. Typische Ursachen sind Aderbrüche an Knickschutzstellen, Wackelkontakte an Steckern, kalte Lötstellen, Haarrisse in Leiterbahnen sowie temperatur- oder feuchtigkeitsabhängige Fehler.</p>
<ul>
  <li><b>Bedingungen nachstellen:</b> Kabel gezielt bewegen (Biegetest), Stecker leicht belasten, Gerät erwärmen lassen, längere Laufzeit beobachten.</li>
  <li><b>Messen während der Bewegung:</b> Ein Widerstand, der beim Biegen zwischen „offen“ und wenigen Ohm springt, ist ein starker Befund.</li>
  <li><b>Protokollieren:</b> Fehlerspeicher, Zeitpunkte, Begleitumstände.</li>
  <li>Nicht vorschnell „kein Fehler feststellbar“ melden – Rückfrage beim Anwender kann den entscheidenden Hinweis liefern.</li>
</ul>`,
      },
    ],
    related: ['schaltplanverstaendnis', 'verschleiss', 'ersatzteilkunde', 'dokumentation', 'funktionskontrolle'],
  });

  /* ======================= Verschleiß ======================= */
  MTRL.registerKnowledge({
    id: 'verschleiss',
    title: 'Verschleißmechanismen und vorbeugende Instandhaltung',
    icon: '⏳',
    category: 'Instandhaltung',
    summary:
      'Warum Kabel brechen, Akkus nachlassen, Pumpen undicht werden und Sensoren driften – und wie Inspektion und Wartung Ausfällen vorbeugen.',
    sections: [
      {
        title: 'Verschleiß verstehen',
        html: `
<p><b>Verschleiß</b> ist die fortschreitende Veränderung eines Bauteils durch Gebrauch, Zeit und Umgebung. Er ist <b>erwartbar</b> – deshalb sehen Hersteller Wartungsintervalle, Austauschfristen für Verschleißteile und Prüfungen vor.</p>
<p>Instandhaltung gliedert sich (vgl. DIN 31051) in <b>Wartung</b> (Abnutzungsvorrat erhalten), <b>Inspektion</b> (Ist-Zustand feststellen und beurteilen), <b>Instandsetzung</b> (Funktion wiederherstellen) und <b>Verbesserung</b>. Wer Verschleißmechanismen kennt, findet Fehler schneller, weil er weiß, <b>wo</b> er zuerst suchen sollte.</p>`,
      },
      {
        title: 'Mechanische Mechanismen',
        html: `
<table class="plain">
  <thead><tr><th>Mechanismus</th><th>Typische Stellen</th><th>Erscheinungsbild</th></tr></thead>
  <tbody>
    <tr><td><b>Biegewechsel</b></td><td>Patientenkabel am Knickschutz, Netzkabel am Stecker, Kabel in Gelenken</td><td>Aderbruch, zunächst intermittierend; Störsignale, Signalverlust bei Bewegung</td></tr>
    <tr><td><b>Steckzyklen</b></td><td>Sensorbuchsen, Akkukontakte, Netzbuchsen</td><td>ausgeweitete Kontaktfedern, abgeriebene Kontaktbeschichtung, erhöhter Übergangswiderstand</td></tr>
    <tr><td><b>Pumpen und Ventile</b></td><td>Membranpumpen (NIBP), Gebläse, Magnetventile, Pumpenmechanik von Infusionspumpen</td><td>sinkende Förderleistung, längere Aufpumpzeiten, Undichtigkeit, Geräusche</td></tr>
    <tr><td><b>Dichtungen und Schläuche</b></td><td>O-Ringe, Schlauchverbindungen, Manschetten</td><td>Leckage, Druckabfall, Versprödung, Risse</td></tr>
    <tr><td><b>Lager, Getriebe, Antriebe</b></td><td>Lüfter, Spindeln, Rollenpumpen</td><td>Geräusche, erhöhter Strom, Blockieren</td></tr>
  </tbody>
</table>`,
      },
      {
        title: 'Elektrische und elektrochemische Alterung',
        html: `
<p><b>Akkus</b> verlieren durch Lade-/Entladezyklen, Lagerdauer und Temperatur an <b>Kapazität</b>; gleichzeitig steigt ihr <b>Innenwiderstand R<sub>i</sub></b>. Unter Last sinkt die Klemmenspannung nach</p>
<p class="formula">U = U<sub>0</sub> − I · R<sub>i</sub></p>
<p>Beispiel (Lernmodell): Leerlaufspannung U<sub>0</sub> = 12,4 V, Laststrom I = 2 A. Neu (R<sub>i</sub> = 0,1 Ω): U = 12,2 V. Gealtert (R<sub>i</sub> = 0,8 Ω): U = 10,8 V – das Gerät meldet „Akku schwach“ oder schaltet bei Lastspitzen ab, obwohl die Leerlaufspannung unauffällig ist. Darum sagt eine Spannungsmessung <b>ohne Last</b> wenig über den Akkuzustand aus; aussagekräftig sind Kapazitäts- bzw. Laufzeittests nach Herstellervorgabe.</p>
<p><b>Elektrolytkondensatoren</b> trocknen mit der Zeit aus, besonders bei hoher Temperatur (Faustregel: je 10 K mehr ungefähr halbe Lebensdauer). Folgen: sinkende Kapazität, steigender Serienwiderstand (ESR), höhere Restwelligkeit, Startprobleme von Netzteilen. Erkennbar manchmal an gewölbten Böden oder ausgetretenem Elektrolyt.</p>
<div class="callout warn">Alterung in Netzteilen ist ein typischer Ausfallgrund – der Eingriff selbst ist jedoch <b>Netzteilarbeit</b> und damit qualifiziertem Personal nach Herstellerunterlagen vorbehalten.</div>`,
      },
      {
        title: 'Umwelt, Reinigung und Sensordrift',
        html: `
<ul>
  <li><b>Desinfektionsmittelangriff:</b> Nicht freigegebene oder zu konzentrierte Mittel (z. B. bestimmte Alkohole, Aldehyde, Oxidationsmittel) können Kunststoffe verspröden, Spannungsrisse in Gehäusen erzeugen, Folientastaturen und Displays trüben und Kabelmäntel aufquellen lassen. Eindringende Flüssigkeit führt zu Korrosion und Kriechströmen. Nur die in der Gebrauchsanweisung genannten Mittel und Verfahren verwenden.</li>
  <li><b>Sensordrift:</b> Drucksensoren, Flusssensoren, Sauerstoffsensoren (elektrochemische O₂-Zellen sind Verbrauchsteile), Temperaturfühler verändern über die Zeit ihre Kennlinie (Nullpunkt, Empfindlichkeit). Das zeigt sich erst bei der <b>Messung gegen eine Referenz</b>.</li>
  <li><b>Feuchte und Temperatur:</b> Kondensation, thermische Zyklen (Lötstellenrisse), Staub (Lüfter, Kühlkörper).</li>
  <li><b>Mechanische Einwirkung:</b> Stürze, Transporte, Einklemmen von Kabeln an Bettgittern.</li>
</ul>`,
      },
      {
        title: 'Vorbeugende Instandhaltung',
        html: `
<p>Ziel ist, Verschleiß zu erkennen, <b>bevor</b> er zum Ausfall am Patienten führt:</p>
<ol>
  <li><b>Herstellervorgaben umsetzen:</b> Wartungsintervalle, Austausch von Verschleißteilen (z. B. Akkus, Filter, Dichtungen, O₂-Zellen) nach Zeit oder Betriebsstunden.</li>
  <li><b>Regelmäßige Inspektion:</b> Sichtprüfung von Kabeln, Steckern, Gehäusen; Funktions- und Alarmprüfung; vorgeschriebene sicherheits- und messtechnische Kontrollen.</li>
  <li><b>Trends beobachten:</b> Messwerte früherer Prüfungen vergleichen (z. B. Schutzleiterwiderstand, Ableitströme, Akkulaufzeit, Druckanzeige gegen Referenz). Eine schleichende Verschlechterung ist ein Frühwarnzeichen, auch wenn der Grenzwert noch eingehalten ist.</li>
  <li><b>Anwender schulen:</b> richtige Kabelführung, Reinigung nach Gebrauchsanweisung, Melden von Auffälligkeiten.</li>
</ol>`,
      },
    ],
    related: ['systematische-fehlersuche', 'ersatzteilkunde', 'funktionskontrolle', 'geraeteaufbau'],
  });

  /* ======================= Ersatzteilkunde ======================= */
  MTRL.registerKnowledge({
    id: 'ersatzteilkunde',
    title: 'Ersatzteilkunde',
    icon: '📦',
    category: 'Instandhaltung',
    summary:
      'Originalteile, Freigaben und Kompatibilität, Rückverfolgbarkeit, Lagerung und Haltbarkeit, Akkus sowie Einmal- und Mehrwegprodukte – worauf es beim Ersatzteil wirklich ankommt.',
    sections: [
      {
        title: 'Warum das richtige Teil sicherheitsrelevant ist',
        html: `
<p>Ein Medizinprodukt wurde vom Hersteller mit bestimmten Bauteilen bewertet und in Verkehr gebracht. Ein Ersatzteil muss die Eigenschaften des ursprünglichen Teils <b>vollständig</b> erfüllen – nicht nur die offensichtlichen (passt, Spannung stimmt), sondern auch verdeckte: Isolationseigenschaften, Ableitströme, Biokompatibilität, Brandverhalten, EMV, Software-Kompatibilität.</p>
<div class="callout warn">Ein „baugleich aussehendes“ Kabel kann z. B. andere Schirmung, keinen Schutzwiderstand oder eine andere Sensorkodierung haben – mit Folgen für Messgenauigkeit und Patientensicherheit.</div>`,
      },
      {
        title: 'Originalteile, Freigaben und Kompatibilität',
        html: `
<ul>
  <li><b>Originalteile</b> bzw. <b>vom Hersteller freigegebene</b> Teile sind der Regelfall. Welche Teile freigegeben sind, steht in den Serviceunterlagen oder Ersatzteillisten.</li>
  <li><b>Kompatibilität</b> hängt oft von Geräterevision, Seriennummernbereich, Hardware- und Softwarestand ab. Vor dem Einbau prüfen!</li>
  <li><b>Zubehör</b> (Sensoren, Kabel, Manschetten) muss für die Kombination mit dem Gerät vorgesehen sein; Angaben dazu finden sich in der Gebrauchsanweisung.</li>
  <li><b>Fremdteile</b> und Nachbauten: Werden nicht freigegebene Teile eingesetzt, kann sich die Verantwortung für die Sicherheit des Produkts verschieben. Ein solches Vorgehen erfordert eine fundierte fachliche und rechtliche Bewertung und ist nicht Gegenstand dieser Lernwerkstatt.</li>
</ul>`,
      },
      {
        title: 'Rückverfolgbarkeit',
        html: `
<p>Medizinprodukte und viele Ersatzteile tragen Kennzeichnungen für die <b>Rückverfolgbarkeit</b>: Artikelnummer, Chargen- oder Seriennummer, ggf. eine eindeutige Produktkennung (UDI) nach MDR. Im Instandsetzungsbericht werden die eingebauten Teile mit diesen Angaben dokumentiert.</p>
<p>Warum? Wenn ein Hersteller eine <b>Sicherheitskorrekturmaßnahme</b> (z. B. Rückruf einer Akku-Charge) veröffentlicht, muss der Betreiber feststellen können, <b>welche Geräte betroffen</b> sind. Ohne Dokumentation ist das unmöglich.</p>`,
      },
      {
        title: 'Lagerung und Haltbarkeit',
        html: `
<table class="plain">
  <thead><tr><th>Aspekt</th><th>Worauf achten</th></tr></thead>
  <tbody>
    <tr><td>Verfallsdatum</td><td>Viele Sensoren, Elektroden, Dichtungen und Sterilgüter haben ein Verfallsdatum. Abgelaufene Teile nicht verwenden.</td></tr>
    <tr><td>Lagerbedingungen</td><td>Temperatur, Luftfeuchte, Licht (UV versprödet Kunststoffe und Gummi) gemäß Herstellerangabe.</td></tr>
    <tr><td>ESD-Schutz</td><td>Elektronikbaugruppen in antistatischer Verpackung lagern und nur an ESD-geschützten Arbeitsplätzen auspacken.</td></tr>
    <tr><td>Lagerprinzip</td><td>„First in – first out“: ältere Teile zuerst verwenden.</td></tr>
    <tr><td>Kennzeichnung</td><td>Defekte, gesperrte und geprüfte Teile klar getrennt lagern und kennzeichnen.</td></tr>
  </tbody>
</table>`,
      },
      {
        title: 'Akkus als Ersatzteil',
        html: `
<ul>
  <li>Akkus <b>altern auch im Regal</b> (Selbstentladung, kalendarische Alterung). Lithium-Ionen-Akkus werden für die Lagerung typischerweise teilgeladen und kühl gelagert – maßgeblich sind die Herstellerangaben.</li>
  <li>Tiefentladene Akkus können dauerhaft geschädigt sein und dürfen nicht einfach „wieder aufgeladen“ werden.</li>
  <li>Nur freigegebene Akkus verwenden: Ladeverfahren, Schutzschaltung und Ladezustandsanzeige sind auf das Gerät abgestimmt.</li>
  <li>Nach dem Wechsel: Funktions- und Laufzeitprüfung nach Herstellerunterlagen, Austauschdatum dokumentieren.</li>
  <li>Beschädigte, aufgeblähte oder überhitzte Lithium-Akkus sind ein Brandrisiko – sicher lagern und nach den betrieblichen Vorgaben entsorgen.</li>
</ul>`,
      },
      {
        title: 'Einmal- und Mehrwegprodukte',
        html: `
<p><b>Einmalprodukte</b> (z. B. Einmal-SpO₂-Sensoren, Infusionsleitungen, Klebeelektroden) sind für die einmalige Anwendung vorgesehen. Ihre Wiederverwendung oder Aufbereitung ist nicht vorgesehen und kann Hygiene, Material und Funktion gefährden; eine Aufbereitung von Einmalprodukten unterliegt besonderen rechtlichen Anforderungen.</p>
<p><b>Mehrwegprodukte</b> (z. B. wiederverwendbare Fingerclip-Sensoren, Mehrweg-Manschetten, Patientenkabel) werden nach den Angaben des Herstellers aufbereitet und haben eine begrenzte Lebensdauer (Anzahl Aufbereitungszyklen, Sichtprüfung auf Beschädigung).</p>
<div class="callout info">Bei der Fehlersuche gilt: Zubehör ist ein häufiger Fehlerort. Ein defektes Mehrwegkabel ist kein „Geräteschaden“, wohl aber ein Befund, der dokumentiert und behoben werden muss.</div>`,
      },
    ],
    related: ['verschleiss', 'systematische-fehlersuche', 'dokumentation', 'lernsimulation-vs-service'],
  });
})();
