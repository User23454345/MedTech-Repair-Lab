/*
 * Ersatz- und Verschleißteile: Infusions- und Spritzenpumpe (generisch, Lernmodell)
 * Keine realen Artikelnummern – Beschaffung ausschließlich nach Ersatzteilliste des Herstellers.
 */
MTRL.registerParts([
  /* ---------- Volumetrische Infusionspumpe ---------- */
  {
    id: 'ip-battery-pack', name: 'Akkupack (Li-Ion) für Infusionspumpe', category: 'Energieversorgung', devices: ['infusion-pump'],
    function: 'Netzunabhängiger Betrieb bei Transport und Netzausfall. Lernmodell: 3 Li-Ion-Zellen in Reihe (Nennspannung 10,8 V, Nennkapazität 2,2 Ah) mit Schutzschaltung und Temperaturfühler (NTC).',
    wear: 'hoch', wearInfo: 'Zyklische und kalendarische Alterung: Kapazität sinkt, Innenwiderstand steigt (beschleunigt durch Wärme, Dauerladung bei hoher Spannung, Tiefentladung).',
    failureModes: ['„Akku schwach“ kurz nach Netztrennung trotz voller Ladeanzeige', 'Abschaltung unter Last (Spannungseinbruch durch hohen Innenwiderstand)', 'Laufzeit deutlich verkürzt', 'Akkufehlermeldung (z. B. Temperaturfühler, Schutzschaltung)'],
    replacement: 'Austausch gemäß Herstellervorgabe gegen freigegebenen Originalakku (bei vielen Geräten über ein Akkufach ohne Öffnen des Gehäuses). Keine Akkus aus Einzelzellen selbst bauen. Altakku: Pole isolieren, fachgerecht nach Batterierecht entsorgen.',
    checksAfter: ['Ladeanzeige und vollständige Erstladung', 'Laufzeit-/Kapazitätstest', 'Netzausfall-Umschaltung', 'Förderratenprüfung im Akkubetrieb'],
    notes: 'Aufgeblähte, beschädigte oder heiß gewordene Li-Ion-Akkus sofort außer Betrieb nehmen und sicher (nicht brennbar, ggf. in Sand/Brandschutzbehälter) lagern.',
  },
  {
    id: 'ip-door-latch', name: 'Pumpentür-Verriegelung / Scharnier', category: 'Mechanik', devices: ['infusion-pump'],
    function: 'Hält die Pumpentür geschlossen und drückt das Pumpsegment definiert gegen die Pumpfinger; mit der Tür ist die Freifluss-Klemme gekoppelt.',
    wear: 'mittel', wearInfo: 'Scharnier- und Rastverschleiß, Bruch nach Stößen, eingetrocknete Infusionslösung.',
    failureModes: ['Tür schließt nicht sicher („Tür offen“)', 'Ungenaue Förderung durch ungleichmäßigen Anpressdruck', 'Freifluss-Klemme arbeitet nicht zuverlässig'],
    replacement: 'Nur durch geschultes Personal nach Servicehandbuch; Freifluss-Schutz ist eine Sicherheitsfunktion.',
    checksAfter: ['Tür- und Freifluss-Schutzprüfung nach Herstellervorgabe', 'Förderratenprüfung', 'Okklusionstest'],
  },
  {
    id: 'ip-pole-clamp', name: 'Stativklemme', category: 'Mechanik', devices: ['infusion-pump'],
    function: 'Befestigt die Pumpe sicher am Infusionsständer oder an der Bettschiene.',
    wear: 'mittel', wearInfo: 'Gewinde- und Spindelverschleiß, Risse im Kunststoff nach Stürzen.',
    failureModes: ['Pumpe hält nicht sicher – Sturzgefahr', 'Klemme schwergängig'],
    replacement: 'Austausch nach Herstellervorgabe; Befestigungsschrauben mit vorgegebenem Drehmoment.',
    checksAfter: ['Sichtprüfung', 'Belastungsprobe am Ständer'],
  },
  {
    id: 'ip-drop-sensor', name: 'Tropfensensor', category: 'Sensorik', devices: ['infusion-pump'],
    function: 'Erkennt Tropfen in der Tropfkammer (Lichtschranke) und meldet leeren Behälter bzw. fehlenden Durchfluss.',
    wear: 'mittel', wearInfo: 'Kabelbruch am Stecker, verschmutzte Optik, Bruch der Halterung.',
    failureModes: ['Fehlalarm „Kein Tropfen“', 'Keine Erkennung eines leeren Behälters'],
    replacement: 'Austausch gegen freigegebenes Originalzubehör.',
    checksAfter: ['Funktionsprüfung mit Tropfkammer', 'Alarmprüfung'],
  },
  {
    id: 'ip-power-cord', name: 'Netzanschlussleitung', category: 'Energieversorgung', devices: ['infusion-pump'],
    function: 'Verbindet die Pumpe mit dem Netz (abnehmbare Leitung).',
    wear: 'mittel', wearInfo: 'Knicke, gequetschte Isolierung, beschädigter Gerätestecker.',
    failureModes: ['Kein Netzbetrieb / Wackelkontakt', 'Beschädigte Isolation'],
    replacement: 'Austausch gegen geeignete, vom Hersteller freigegebene Leitung.',
    checksAfter: ['Sichtprüfung', 'Elektrische Sicherheitsprüfung nach IEC 62353'],
  },
  {
    id: 'ip-keypad', name: 'Folientastatur / Bedienfront', category: 'Bedienung', devices: ['infusion-pump'],
    function: 'Eingabe von Rate, Volumen und Bestätigung von Alarmen.',
    wear: 'mittel', wearInfo: 'Abrieb, Risse durch Desinfektionsmittel, Feuchtigkeitseintritt.',
    failureModes: ['Taste reagiert nicht oder prellt', 'Feuchtigkeitsschaden'],
    replacement: 'Nur nach Servicehandbuch; Dichtheit und Funktion nach Tausch prüfen.',
    checksAfter: ['Tastenprüfung', 'Selbsttest', 'Funktionsprüfung'],
  },

  /* ---------- Spritzenpumpe ---------- */
  {
    id: 'sp-battery-pack', name: 'Akkupack für Spritzenpumpe', category: 'Energieversorgung', devices: ['syringe-pump'],
    function: 'Netzunabhängiger Betrieb bei Transport und Netzausfall (Lernmodell: Li-Ion mit Schutzschaltung).',
    wear: 'hoch', wearInfo: 'Kapazitätsverlust und steigender Innenwiderstand durch Zyklen, Alter und Wärme.',
    failureModes: ['Laufzeit verkürzt', 'Abschaltung unter Last', 'Akkufehlermeldung'],
    replacement: 'Austausch gemäß Herstellervorgabe gegen freigegebenen Originalakku; Altakku mit isolierten Polen fachgerecht entsorgen.',
    checksAfter: ['Ladeanzeige', 'Laufzeit-/Kapazitätstest', 'Netzausfall-Umschaltung'],
    notes: 'Beschädigte oder aufgeblähte Li-Ion-Akkus sofort sicher lagern (Brandgefahr).',
  },
  {
    id: 'sp-syringe-clamp', name: 'Spritzenhalter mit Größenerkennung', category: 'Mechanik & Sensorik', devices: ['syringe-pump'],
    function: 'Fixiert die Spritze und erfasst über die Halterposition die Spritzengröße.',
    wear: 'mittel', wearInfo: 'Federermüdung, Verschmutzung, Bruch nach Stößen.',
    failureModes: ['„Spritze nicht erkannt“', 'Falsche Spritzengröße erkannt', 'Spritze sitzt locker'],
    replacement: 'Nur durch geschultes Personal nach Servicehandbuch; Größenerkennung danach mit allen freigegebenen Spritzengrößen prüfen.',
    checksAfter: ['Spritzenerkennung (alle Größen)', 'Förderratenprüfung'],
  },
  {
    id: 'sp-drive-nut', name: 'Spindelmutter / Halbmutter des Antriebs', category: 'Antrieb', devices: ['syringe-pump'],
    function: 'Greift in die Gewindespindel und überträgt deren Drehung auf den Antriebskopf.',
    wear: 'mittel', wearInfo: 'Gewindeverschleiß erhöht das Spiel; Verschmutzung erhöht die Reibung.',
    failureModes: ['Verzögerter Förderbeginn', 'Ungleichmäßige Förderung bei kleinen Raten', 'Mutter rastet nicht sicher ein'],
    replacement: 'Nur durch vom Hersteller geschultes Personal nach Servicehandbuch – wirkt direkt auf die Dosiergenauigkeit.',
    checksAfter: ['Förderratenprüfung inkl. Anlaufverhalten', 'Okklusionstest'],
  },
  {
    id: 'sp-pole-clamp', name: 'Stativklemme (Spritzenpumpe)', category: 'Mechanik', devices: ['syringe-pump'],
    function: 'Befestigt die Pumpe sicher an Ständer oder Bettschiene.',
    wear: 'mittel', wearInfo: 'Gewindeverschleiß, Risse nach Stürzen.',
    failureModes: ['Pumpe hält nicht sicher', 'Klemme schwergängig'],
    replacement: 'Austausch nach Herstellervorgabe.',
    checksAfter: ['Sichtprüfung', 'Belastungsprobe'],
    notes: 'Spritzenpumpen sollten möglichst auf Höhe des Patienten befestigt werden – Höhenunterschiede können durch Siphoneffekte die Förderung beeinflussen.',
  },
  {
    id: 'sp-power-cord', name: 'Netzanschlussleitung (Spritzenpumpe)', category: 'Energieversorgung', devices: ['syringe-pump'],
    function: 'Verbindet die Pumpe mit dem Netz.',
    wear: 'mittel', wearInfo: 'Knicke, beschädigte Isolierung oder Stecker.',
    failureModes: ['Kein Netzbetrieb', 'Beschädigte Isolation'],
    replacement: 'Austausch gegen geeignete, vom Hersteller freigegebene Leitung.',
    checksAfter: ['Sichtprüfung', 'Elektrische Sicherheitsprüfung nach IEC 62353'],
  },
  {
    id: 'sp-keypad', name: 'Folientastatur (Spritzenpumpe)', category: 'Bedienung', devices: ['syringe-pump'],
    function: 'Eingabe von Rate, Volumen und Spritzentyp, Alarmquittierung.',
    wear: 'mittel', wearInfo: 'Abrieb, Desinfektionsmittel, Feuchtigkeit.',
    failureModes: ['Taste ohne Funktion', 'Feuchtigkeitsschaden'],
    replacement: 'Nur nach Servicehandbuch.',
    checksAfter: ['Tastenprüfung', 'Selbsttest'],
  },
]);
