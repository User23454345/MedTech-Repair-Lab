/*
 * MedTech Repair Lab – Anwendung, Navigation und Router
 */
(function (g) {
  'use strict';
  const MTRL = g.MTRL;
  const { h, clear } = MTRL.dom;

  MTRL.views = MTRL.views || {};

  const NAV = [
    { href: '#/', label: 'Werkstatt', icon: '🏭', match: /^#?\/?$/ },
    { href: '#/faelle', label: 'Reparaturfälle', icon: '🧰', match: /^#\/(faelle|fall)/ },
    { href: '#/geraete', label: 'Geräte', icon: '🩺', match: /^#\/geraete/ },
    { href: '#/messgeraete', label: 'Messgeräte', icon: '📟', match: /^#\/messgeraet/ },
    { href: '#/ersatzteile', label: 'Ersatzteile', icon: '📦', match: /^#\/ersatzteile/ },
    { href: '#/wissen', label: 'Dokumentation', icon: '📚', match: /^#\/wissen/ },
  ];

  function shell() {
    const nav = h(
      'nav.main-nav',
      { 'aria-label': 'Hauptnavigation' },
      NAV.map((n) => h('a.nav-link', { href: n.href, dataset: { nav: n.href } }, h('span.nav-icon', { 'aria-hidden': 'true' }, n.icon), h('span.nav-label', n.label)))
    );
    const header = h(
      'header.app-header',
      h('a.brand', { href: '#/' }, h('span.brand-mark', { 'aria-hidden': 'true' }, '⚕'), h('span.brand-text', h('b', 'MedTech'), ' Repair Lab')),
      nav,
      h('span.sim-badge', { title: 'Alle Inhalte sind Lernsimulationen' }, 'LERNSIMULATION')
    );
    const main = h('main#view', { tabindex: '-1' });
    const footer = h(
      'footer.app-footer',
      h('span', 'MedTech Repair Lab · virtuelle Lernwerkstatt · v' + MTRL.version),
      h('span', 'Kein Ersatz für Herstellerunterlagen, Schulungen oder geltende Vorschriften. '),
      h('a', { href: '#/wissen/lernsimulation-vs-service' }, 'Lernsimulation vs. reale Servicearbeit')
    );
    const root = document.getElementById('app');
    clear(root);
    root.appendChild(header);
    root.appendChild(main);
    root.appendChild(footer);
  }

  function setActive(hash) {
    document.querySelectorAll('.nav-link').forEach((a) => {
      const n = NAV.find((x) => x.href === a.dataset.nav);
      a.classList.toggle('active', !!(n && n.match.test(hash || '#/')));
    });
  }

  const ROUTES = [
    [/^#?\/?$/, () => MTRL.views.workshop()],
    [/^#\/faelle$/, () => MTRL.views.caseList()],
    [/^#\/fall\/([\w-]+)$/, (m) => MTRL.views.caseView(m[1])],
    [/^#\/geraete$/, () => MTRL.views.deviceList()],
    [/^#\/geraete\/([\w-]+)$/, (m) => MTRL.views.deviceDetail(m[1])],
    [/^#\/messgeraete$/, () => MTRL.views.instrumentList()],
    [/^#\/messgeraet\/([\w-]+)(?:\/([\w-]+))?$/, (m) => MTRL.views.instrumentLab(m[1], m[2])],
    [/^#\/ersatzteile$/, () => MTRL.views.partsLibrary()],
    [/^#\/wissen$/, () => MTRL.views.knowledgeList()],
    [/^#\/wissen\/([\w-]+)$/, (m) => MTRL.views.knowledgeArticle(m[1])],
  ];

  function route() {
    const hash = g.location.hash || '#/';
    const main = document.getElementById('view');
    document.querySelectorAll('.modal-back').forEach((m) => m.remove()); // offene Dialoge beim Seitenwechsel schließen
    clear(main);
    setActive(hash);
    let node = null;
    for (const [re, fn] of ROUTES) {
      const m = hash.match(re);
      if (m) {
        try {
          node = fn(m);
        } catch (e) {
          g.console.error(e);
          node = h('div.panel', h('h2', 'Fehler beim Anzeigen'), h('pre', String(e && e.stack ? e.stack : e)));
        }
        break;
      }
    }
    if (!node) node = h('div.panel', h('h2', 'Seite nicht gefunden'), h('a.btn', { href: '#/' }, 'Zur Werkstatt'));
    main.appendChild(node);
    if (!hash.startsWith('#/fall/')) g.scrollTo(0, 0);
    main.focus({ preventScroll: true });
    document.title = (node.dataset && node.dataset.title ? node.dataset.title + ' · ' : '') + 'MedTech Repair Lab';
  }

  MTRL.navigate = function (hash) {
    if (g.location.hash === hash) route();
    else g.location.hash = hash;
  };

  /* ---------- Gemeinsame UI-Bausteine ---------- */
  MTRL.ui = MTRL.ui || {};

  MTRL.ui.pageHead = function (title, sub, extra) {
    return h('div.page-head', h('div', h('h1', title), sub ? h('p.lead', sub) : null), extra || null);
  };

  MTRL.ui.disclaimer = function (compact) {
    return h(
      'div.callout.warn' + (compact ? '.compact' : ''),
      { role: 'note' },
      h('b', '⚠ Lernsimulation – keine Serviceanleitung. '),
      'Gerätemodelle, Belegungen, Testpunkte und Messwerte sind generisch bzw. fiktiv. Für reale Arbeiten an Medizinprodukten sind ausschließlich Herstellerunterlagen, die erforderliche Qualifikation und die geltenden Vorschriften (u. a. MPDG, MPBetreibV, IEC 62353) maßgeblich. Sicherheitskritische Eingriffe und Schutzmechanismen werden hier bewusst nicht als Anleitung beschrieben.'
    );
  };

  MTRL.ui.signalChain = function (path) {
    return h(
      'div.chain',
      path.map((p, i) => [
        h('span.chain-el', { title: p.desc || '' }, h('b', p.label), p.desc ? h('small', p.desc) : null),
        i < path.length - 1 ? h('span.chain-arrow', { 'aria-hidden': 'true' }, '→') : null,
      ])
    );
  };

  MTRL.ui.wearBadge = function (w) {
    const map = { niedrig: 'low', mittel: 'mid', hoch: 'high' };
    return h('span.wear.' + (map[w] || 'low'), 'Verschleiß: ' + (w || 'niedrig'));
  };

  MTRL.ui.instrumentChip = function (id) {
    const inst = MTRL.instruments.get(id);
    if (!inst) return null;
    return h('a.chip', { href: '#/messgeraet/' + id }, (inst.icon || '') + ' ' + inst.name);
  };

  MTRL.ui.partLink = function (id) {
    const p = MTRL.parts.get(id);
    if (!p) return h('span.chip.muted', id);
    return h('a.chip', { href: '#/ersatzteile?part=' + id, on: { click: (e) => { e.preventDefault(); MTRL.views.openPart(id); } } }, '📦 ' + p.name);
  };

  /* ---------- Start ---------- */
  function start() {
    shell();
    g.addEventListener('hashchange', route);
    route();
    if (MTRL.problems.length) g.console.warn('MTRL Validierung:', MTRL.problems);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
