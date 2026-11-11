/*
 * Gerät: Elektrisches Absauggerät (generisches Lernmodell)
 * Keine realen Hersteller, Modelle oder Servicecodes.
 */
MTRL.registerDevice({
  id: 'suction-device',
  name: 'Elektrisches Absauggerät',
  icon: '🧪',
  category: 'Beatmung & Atemtherapie',
  riskClass: 'Typisch Klasse IIa (aktives Produkt zum Absaugen von Sekreten bzw. Körperflüssigkeiten); Einstufung hängt von der Zweckbestimmung des Herstellers ab',
  summary:
    'Erzeugt einen einstellbaren Unterdruck, um Sekret, Blut oder Spülflüssigkeit aus Atemwegen, Mund-Rachen-Raum oder Operationsgebiet abzusaugen – stationär (Klinik) oder tragbar (Notfall, Transport, Heimversorgung).',
  principle:
    '<p>Eine elektrisch angetriebene <b>Vakuumpumpe</b> (meist Membran- oder Kolbenpumpe) saugt Luft aus dem <b>Sekretbehälter</b> ab. Dadurch entsteht im Behälter und im daran angeschlossenen <b>Patientenschlauch</b> ein Unterdruck. Das abgesaugte Sekret sammelt sich im Behälter; nur Luft gelangt über einen <b>hydrophoben Bakterienfilter</b> zur Pumpe.</p>' +
    '<p>Ein <b>Vakuumregler</b> begrenzt den Unterdruck auf den eingestellten Wert, ein <b>Vakuummeter</b> zeigt ihn an. Ein <b>Überlaufschutz</b> (z. B. Schwimmerventil im Behälterdeckel) verschließt die Saugleitung, bevor Flüssigkeit in Filter und Pumpe gelangen kann. Zwei Kenngrößen beschreiben die Leistung: der erreichbare <b>Unterdruck</b> (Endvakuum) und die <b>Saugleistung</b> (freier Luftdurchsatz in l/min).</p>' +
    '<p class="muted">Unterdruckangaben erfolgen je nach Gerät in kPa, mbar oder mmHg (1 kPa = 10 mbar ≈ 7,5 mmHg); Anforderungen an elektrisch betriebene Absauggeräte beschreibt u. a. die Normenreihe ISO 10079.</p>',
  components: [
    { id: 'pump', name: 'Vakuumpumpe mit Motor', function: 'Erzeugt den Unterdruck (Membran- oder Kolbenpumpe).', wear: 'mittel', notes: 'Membranen und Ventilplättchen verschleißen; Austausch nur nach Herstellerunterlagen.' },
    { id: 'regulator', name: 'Vakuumregler', function: 'Begrenzt den Unterdruck auf den eingestellten Wert (z. B. für Kinder niedrigere Werte).', wear: 'niedrig' },
    { id: 'gauge', name: 'Vakuummeter', function: 'Zeigt den aktuellen Unterdruck an (analog oder digital).', wear: 'niedrig' },
    { id: 'canister', name: 'Sekretbehälter mit Deckel', function: 'Sammelt das abgesaugte Sekret; Deckel mit Anschlüssen für Patienten- und Vakuumschlauch.', wear: 'hoch', notes: 'Deckeldichtung ist eine häufige Leckagequelle; Mehrweg- oder Einwegbeutelsysteme.' },
    { id: 'overflow', name: 'Überlaufschutz', function: 'Schwimmerventil o. Ä. sperrt die Saugleitung bei vollem Behälter.', wear: 'mittel', notes: 'Schutzfunktion – muss frei beweglich und funktionsfähig sein.' },
    { id: 'filter', name: 'Hydrophober Bakterienfilter', function: 'Schützt Pumpe und Umgebung vor Flüssigkeit und Keimen.', wear: 'hoch', notes: 'Nach Kontakt mit Flüssigkeit oder gemäß Intervall ersetzen; verstopfter Filter reduziert die Saugleistung.' },
    { id: 'tubing', name: 'Schläuche und Absaugkatheter', function: 'Verbinden Behälter, Pumpe und Patient.', wear: 'hoch' },
    { id: 'power', name: 'Netzteil / Akku', function: 'Energieversorgung; tragbare Geräte mit Akku.', wear: 'mittel' },
    { id: 'switch', name: 'Bedienelemente (Schalter, ggf. Fußschalter)', function: 'Ein/Aus, Regler, ggf. Fußbedienung.', wear: 'mittel' },
  ],
  signalPath: [
    { id: 'patient', label: 'Absaugkatheter', desc: 'Sekret und Luft werden angesaugt' },
    { id: 'tube', label: 'Patientenschlauch', desc: 'Verbindung zum Behälter' },
    { id: 'canister', label: 'Sekretbehälter', desc: 'Sekret wird abgeschieden' },
    { id: 'overflow', label: 'Überlaufschutz', desc: 'Sperrt bei vollem Behälter' },
    { id: 'filter', label: 'Bakterienfilter', desc: 'Nur Luft passiert (hydrophob)' },
    { id: 'regulator', label: 'Vakuumregler & Vakuummeter', desc: 'Unterdruck begrenzen und anzeigen' },
    { id: 'pump', label: 'Vakuumpumpe', desc: 'Erzeugt Unterdruck, Abluft über Auslass' },
  ],
  faults: [
    { symptom: 'Eingestellter Unterdruck wird nicht erreicht', causes: ['Sekretbehälterdeckel/Dichtung undicht', 'Schlauch undicht oder falsch angeschlossen', 'Pumpenmembran/Ventile verschlissen', 'Vakuumregler verstellt oder defekt'], checks: ['Vakuumprüfung mit Referenzmanometer bei verschlossenem Patientenschlauch', 'Behälter und Schläuche einzeln prüfen (Tauschtest)', 'Dichtheitsprüfung'] },
    { symptom: 'Unterdruck wird angezeigt, aber keine Saugwirkung', causes: ['Überlaufschutz hat ausgelöst (Behälter voll)', 'Bakterienfilter durch Flüssigkeit verschlossen', 'Schlauch abgeknickt oder verstopft'], checks: ['Behälterfüllstand und Schwimmerventil prüfen', 'Filter auf Feuchtigkeit prüfen und ersetzen', 'Saugleistung (freier Durchsatz) messen'] },
    { symptom: 'Vakuummeter zeigt falsch an', causes: ['Vakuummeter dejustiert oder defekt'], checks: ['Vergleich mit Referenzmanometer bei mehreren Unterdruckstufen'] },
    { symptom: 'Gerät laut, heiß oder läuft nicht an', causes: ['Pumpe verschlissen', 'Kühlluftöffnungen verlegt', 'Akku/Netzteil defekt'], checks: ['Sichtprüfung, Geräuschbeurteilung', 'Akkutest', 'Herstellerservice bei internen Defekten'] },
  ],
  wearParts: ['suc-canister-lid-seal', 'suc-bacterial-filter', 'suc-patient-tubing', 'suc-overflow-valve', 'suc-pump-diaphragm', 'suc-battery'],
  functionChecks: [
    'Sichtprüfung (Gehäuse, Netzkabel, Behälter, Deckel, Schläuche, Filter, Kennzeichnung)',
    'Erreichbarer Unterdruck und Anzeigegenauigkeit mit Referenzmanometer (mehrere Stufen)',
    'Regelbarkeit des Unterdrucks über den gesamten Einstellbereich',
    'Saugleistung (freier Luftdurchsatz) nach Herstellervorgabe',
    'Funktion des Überlaufschutzes',
    'Akkubetrieb (bei tragbaren Geräten)',
    'Elektrische Sicherheit nach IEC 62353 (Umfang nach Herstellervorgabe und Betreiberfestlegung)',
  ],
  safety: [
    'Absauggeräte und Zubehör sind potenziell hoch kontaminiert: vor Arbeiten gemäß Hygieneplan aufbereiten, Schutzausrüstung tragen.',
    'Überlaufschutz und Bakterienfilter sind Schutzfunktionen – nie entfernen, überbrücken oder durch nicht freigegebene Teile ersetzen.',
    'Öffnen des Gehäuses und Arbeiten an Pumpe, Netzteil oder Akku nur durch qualifiziertes Personal nach Herstellerunterlagen; danach Wiederholungsprüfung.',
    'Notfall-Absauggeräte müssen jederzeit einsatzbereit sein: Ersatzgerät bereitstellen, bevor ein Gerät aus der Versorgung genommen wird.',
  ],
  regulatory: 'Elektrische Absauggeräte sind weder in Anlage 1 noch in Anlage 2 der MPBetreibV ausdrücklich genannt. Sicherheitstechnische Kontrollen erfolgen, wenn und wie der Hersteller sie vorschreibt; messtechnische Kontrollen nach Anlage 2 sind nicht vorgesehen. Allgemeine Betreiberpflichten (Instandhaltung nach Herstellerangaben, Einweisung, Bestandsverzeichnis) gelten unabhängig davon; Umfang und Fristen elektrischer Wiederholungsprüfungen (z. B. nach IEC 62353) legt der Betreiber auf Grundlage der Herstellervorgaben fest. Gerätespezifische Anforderungen enthält u. a. die Normenreihe ISO 10079. Angaben stets mit der geltenden Fassung der Vorschriften abgleichen.',
  instruments: ['pressure-meter', 'safety-analyzer', 'multimeter'],
});
