/*
 * MedTech Repair Lab – kleine DOM-Hilfsbibliothek (ohne Abhängigkeiten)
 */
(function (g) {
  'use strict';
  const MTRL = g.MTRL;

  /**
   * h('div.class#id', {attrs, on: {click}}, ...children)
   * Kinder: Strings (als Text), Nodes, Arrays, null/false (ignoriert).
   * attrs.html setzt innerHTML (nur für vertrauenswürdige, eigene Inhalte).
   */
  function h(sel, attrs, ...children) {
    const m = sel.match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i);
    const tag = (m && m[1]) || 'div';
    const el = document.createElement(tag);
    if (m && m[2]) {
      m[2].replace(/([.#])([\w-]+)/g, (_, t, n) => {
        if (t === '.') el.classList.add(n);
        else el.id = n;
        return '';
      });
    }
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
      children.unshift(attrs);
      attrs = null;
    }
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (v === undefined || v === null || v === false) return;
        if (k === 'on') Object.entries(v).forEach(([ev, fn]) => el.addEventListener(ev, fn));
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'class') String(v).split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked') el.checked = !!v;
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    append(el, children);
    return el;
  }

  function append(el, children) {
    children.forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) append(el, c);
      else if (c instanceof Node) el.appendChild(c);
      else el.appendChild(document.createTextNode(String(c)));
    });
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  /** <select> mit Optionen [{value,label,group?}] */
  function select(options, value, onChange, attrs) {
    const s = h('select', attrs || {});
    const groups = new Map();
    options.forEach((o) => {
      const opt = h('option', { value: o.value }, o.label);
      if (o.value === value) opt.selected = true;
      if (o.group) {
        if (!groups.has(o.group)) {
          const og = h('optgroup', { label: o.group });
          groups.set(o.group, og);
          s.appendChild(og);
        }
        groups.get(o.group).appendChild(opt);
      } else s.appendChild(opt);
    });
    if (onChange) s.addEventListener('change', () => onChange(s.value));
    return s;
  }

  /** Segmentierte Knopfgruppe (Drehschalter-Ersatz) */
  function segmented(options, value, onChange, cls) {
    const wrap = h('div.segmented' + (cls ? '.' + cls : ''), { role: 'radiogroup' });
    options.forEach((o) => {
      const b = h(
        'button',
        {
          type: 'button',
          class: o.value === value ? 'active' : '',
          title: o.title || o.label,
          'aria-pressed': o.value === value ? 'true' : 'false',
          on: {
            click: () => {
              wrap.querySelectorAll('button').forEach((x) => {
                x.classList.remove('active');
                x.setAttribute('aria-pressed', 'false');
              });
              b.classList.add('active');
              b.setAttribute('aria-pressed', 'true');
              onChange(o.value);
            },
          },
        },
        o.label
      );
      wrap.appendChild(b);
    });
    return wrap;
  }

  /** Zahlen-Stepper mit Grenzen */
  function stepper(label, value, opts, onChange) {
    const o = Object.assign({ min: 0, max: 100, step: 1, unit: '', digits: 0 }, opts || {});
    let v = value;
    const out = h('output.numstep-value');
    const render = () => {
      out.textContent = MTRL.util.fmt(v, o.digits) + (o.unit ? ' ' + o.unit : '');
    };
    const set = (nv) => {
      v = MTRL.util.clamp(Math.round(nv / o.step) * o.step, o.min, o.max);
      render();
      onChange(v);
    };
    render();
    return h(
      'div.numstep',
      h('span.numstep-label', label),
      h('button', { type: 'button', 'aria-label': label + ' verringern', on: { click: () => set(v - o.step) } }, '−'),
      out,
      h('button', { type: 'button', 'aria-label': label + ' erhöhen', on: { click: () => set(v + o.step) } }, '+')
    );
  }

  /** Kurzer Hinweis-Toast */
  function toast(msg, kind) {
    let host = document.getElementById('toast-host');
    if (!host) {
      host = h('div#toast-host', { 'aria-live': 'polite' });
      document.body.appendChild(host);
    }
    const t = h('div.toast' + (kind ? '.' + kind : ''), msg);
    host.appendChild(t);
    while (host.children.length > 4) host.removeChild(host.firstChild);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3800);
  }

  /** Modaler Dialog; liefert {close} */
  function modal(title, content, opts) {
    const o = opts || {};
    const back = h('div.modal-back');
    const close = () => {
      back.remove();
      document.removeEventListener('keydown', onKey);
      if (o.onClose) o.onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    const box = h(
      'div.modal' + (o.wide ? '.wide' : ''),
      { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div.modal-head', h('h2', title), h('button.icon-btn', { type: 'button', 'aria-label': 'Schließen', on: { click: close } }, '✕')),
      h('div.modal-body', content)
    );
    back.appendChild(box);
    back.addEventListener('click', (e) => {
      if (e.target === back) close();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    return { close, box };
  }

  /** Canvas mit Geräte-Pixelverhältnis vorbereiten */
  function setupCanvas(canvas, w, hgt) {
    const dpr = Math.min(g.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hgt * dpr);
    canvas.style.width = '100%';
    canvas.style.maxWidth = w + 'px';
    canvas.style.aspectRatio = w + ' / ' + hgt;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  /** Animationsschleife mit automatischem Stopp, wenn das Element entfernt wurde. */
  function animate(el, fn) {
    let stopped = false;
    let last = null;
    const loop = (ts) => {
      if (stopped) return;
      if (!el.isConnected && last !== null) {
        stopped = true;
        return;
      }
      const dt = last === null ? 0 : Math.min((ts - last) / 1000, 0.1);
      last = ts;
      fn(dt, ts / 1000);
      g.requestAnimationFrame(loop);
    };
    g.requestAnimationFrame(loop);
    return () => {
      stopped = true;
    };
  }

  MTRL.dom = { h, clear, select, segmented, stepper, toast, modal, setupCanvas, animate, append };
})(window);
