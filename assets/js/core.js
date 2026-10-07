/* ==========================================================================
   Brandstore "Galleria" core.js
   Loaded on every page after assets/data/catalog.js and the vendored libs
   (Motion global `Motion`, Lenis global `Lenis`). Everything hangs off window.BS:

     BS.util      formatting, plural, normalize, storage, dates (Europe/Vilnius)
     BS.catalog   product/brand/category lookups and URLs
     BS.ui        productCard, renderProducts, carousel, tabs, toast, dialogs, quick view
     BS.cart      add/remove/setQty/items/totals + drawer
     BS.wishlist  toggle/has/count + drawer, heart sync
     BS.recent    recently viewed product ids
     BS.header    overlay/solid, condense on scroll, lock
     BS.search    predictive search panel
     BS.motion    reveal / split / parallax / counters / countdown / marquee / videos
     BS.onReady   run page code after core init (or listen for the `bs:ready` event)

   Page scripts: BS.onReady(function (BS) { ...render...; }) . Core runs BS.ui.enhance(document)
   right after the ready callbacks, so markup rendered inside them is enhanced automatically.
   Markup injected later must be enhanced with BS.ui.enhance(container).
   ========================================================================== */
(function () {
  'use strict';

  var BS = (window.BS = window.BS || {});
  var doc = document;
  var root = doc.documentElement;
  var NBSP = ' ';
  var MINUS = '−';
  var mq = function (q) { return window.matchMedia(q); };
  var reduceMQ = mq('(prefers-reduced-motion: reduce)');
  var fineMQ = mq('(hover: hover) and (pointer: fine)');
  var desktopMQ = mq('(min-width: 1024px)');

  /* ------------------------------------------------------------------ util */
  function qs(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function qsaSelf(sel, scope) {
    scope = scope || doc;
    var list = qsa(sel, scope);
    if (scope !== doc && scope.matches && scope.matches(sel)) list.unshift(scope);
    return list;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function lcFirst(s) { s = String(s || ''); return s.charAt(0).toLowerCase() + s.slice(1); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function debounce(fn, ms) {
    var t;
    return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); };
  }
  function rafThrottle(fn) {
    var queued = false;
    return function () { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; fn(); }); };
  }
  function isTyping(el) {
    return !!(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)));
  }
  function emit(target, name, detail) {
    target.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: detail }));
  }

  function formatNumber(n) {
    var neg = n < 0;
    var s = String(Math.round(Math.abs(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
    return (neg ? MINUS : '') + s;
  }
  function formatPrice(n) {
    n = Number(n) || 0;
    if (Math.round(n) === n) return formatNumber(n) + NBSP + '€';
    var parts = n.toFixed(2).split('.');
    return formatNumber(Number(parts[0])) + ',' + parts[1] + NBSP + '€';
  }
  function discountLabel(x) {
    var pct = typeof x === 'object' && x ? (x.discount != null ? x.discount : Math.round((1 - x.price / x.regular) * 100)) : x;
    return MINUS + Math.round(Math.abs(Number(pct) || 0)) + NBSP + '%';
  }
  /* Lithuanian plural: forms = ['prekė','prekės','prekių'] (1 / 2-9 / 0,10-20) */
  function plural(n, forms) {
    n = Math.abs(Math.floor(Number(n) || 0));
    var d = n % 10, h = n % 100;
    if (d === 1 && h !== 11) return forms[0];
    if (d >= 2 && d <= 9 && !(h >= 11 && h <= 19)) return forms[1];
    return forms[2];
  }
  function countLabel(n, forms) { return formatNumber(n) + NBSP + plural(n, forms); }
  function normalize(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
  function sizeLabel(label) { return String(label || '').replace(/–|—/g, '-'); }
  /* strips decorative dashes from data text (" – " becomes ", "), keeps ranges as hyphens,
     and writes percentages with a no-break space ("50%" / "50 %" become "50 %") */
  function dashFree(s) {
    return String(s || '').replace(/\s+[–—]\s+/g, ', ').replace(/[–—]/g, '-').replace(/(\d)[ \u00a0]?%/g, '$1' + NBSP + '%');
  }
  function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim()); }

  var storage = {
    get: function (key, fallback) {
      try { var v = window.localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
    remove: function (key) { try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ } }
  };

  /* ---- dates in Europe/Vilnius ---- */
  var TZ = 'Europe/Vilnius';
  var MONTHS_GEN = ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio'];
  var vilniusFmt = null;
  function vilniusParts(date) {
    date = date || new Date();
    try {
      vilniusFmt = vilniusFmt || new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
      });
      var o = {};
      vilniusFmt.formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
      return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second };
    } catch (e) {
      return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate(), h: date.getHours(), mi: date.getMinutes(), s: date.getSeconds() };
    }
  }
  function vilniusOffsetMin(date) {
    var p = vilniusParts(date);
    return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  }
  /* Date for a wall-clock time in Vilnius */
  function vilniusDate(y, m, d, h, mi, s) {
    var guess = Date.UTC(y, m - 1, d, h || 0, mi || 0, s || 0);
    var t = guess - vilniusOffsetMin(new Date(guess)) * 60000;
    var off2 = vilniusOffsetMin(new Date(t));
    return new Date(guess - off2 * 60000);
  }
  /* last second of the current month in Vilnius */
  function monthEnd(date) {
    var p = vilniusParts(date || new Date());
    var last = new Date(Date.UTC(p.y, p.m, 0)).getUTCDate();
    return vilniusDate(p.y, p.m, last, 23, 59, 59);
  }
  function easterMonday(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    var dt = new Date(Date.UTC(y, month - 1, day + 1));
    return pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate());
  }
  var LT_HOLIDAYS = ['01-01', '02-16', '03-11', '05-01', '06-24', '07-06', '08-15', '11-01', '11-02', '12-24', '12-25', '12-26'];
  function isWorkingDay(dt) {
    var wd = dt.getUTCDay();
    if (wd === 0 || wd === 6) return false;
    var md = pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate());
    return LT_HOLIDAYS.indexOf(md) === -1 && md !== easterMonday(dt.getUTCFullYear());
  }
  /* returns a UTC-midnight Date representing the calendar day n working days after today (Vilnius) */
  function addWorkingDays(n, from) {
    var p = vilniusParts(from || new Date());
    var dt = new Date(Date.UTC(p.y, p.m - 1, p.d));
    var added = 0;
    while (added < n) { dt.setUTCDate(dt.getUTCDate() + 1); if (isWorkingDay(dt)) added++; }
    return dt;
  }
  function calParts(dt) {
    /* UTC-midnight calendar dates keep their UTC fields; real instants are converted to Vilnius */
    if (dt.getUTCHours() === 0 && dt.getUTCMinutes() === 0 && dt.getUTCSeconds() === 0) return { m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
    var p = vilniusParts(dt); return { m: p.m, d: p.d };
  }
  function formatDate(dt) { var p = calParts(dt); return MONTHS_GEN[p.m - 1] + ' ' + p.d + ' d.'; }
  function dateRange(a, b) {
    var pa = calParts(a), pb = calParts(b);
    if (pa.m === pb.m && pa.d === pb.d) return formatDate(a);
    if (pa.m === pb.m) return MONTHS_GEN[pa.m - 1] + ' ' + pa.d + '-' + pb.d + ' d.';
    return formatDate(a) + '-' + formatDate(b);
  }
  /* demo assumption: dispatch 1-2 working days, delivery +2..+4 working days from today */
  function deliveryEstimate(opts) {
    opts = opts || {};
    var from = addWorkingDays(opts.min != null ? opts.min : 2, opts.from);
    var to = addWorkingDays(opts.max != null ? opts.max : 4, opts.from);
    return { from: from, to: to, label: dateRange(from, to) };
  }
  function timeLeft(target) {
    var ms = Math.max(0, (target instanceof Date ? target.getTime() : Number(target)) - Date.now());
    var s = Math.floor(ms / 1000);
    return { total: ms, d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  }
  /* 'deal' (default): BS.collections.dealInfo.endsAt; 'month-end'; or an ISO date. Past dates fall back to month end. */
  function countdownTarget(kind) {
    var t = null;
    if (!kind || kind === 'deal' || kind === 'sale') {
      var info = BS.collections && BS.collections.dealInfo;
      t = info && info.endsAt ? new Date(info.endsAt) : null;
    } else if (kind !== 'month-end') {
      t = new Date(kind);
    }
    if (!t || isNaN(t.getTime()) || t.getTime() <= Date.now()) t = monthEnd();
    return t;
  }

  var util = (BS.util = {
    NBSP: NBSP, MINUS: MINUS,
    qs: qs, qsa: qsa, esc: esc, lcFirst: lcFirst, debounce: debounce, rafThrottle: rafThrottle, wait: wait,
    formatNumber: formatNumber, formatPrice: formatPrice, discountLabel: discountLabel,
    plural: plural, countLabel: countLabel, normalize: normalize, sizeLabel: sizeLabel, dashFree: dashFree, isEmail: isEmail,
    storage: storage,
    vilniusParts: vilniusParts, vilniusDate: vilniusDate, monthEnd: monthEnd, addWorkingDays: addWorkingDays,
    formatDate: formatDate, dateRange: dateRange, deliveryEstimate: deliveryEstimate, timeLeft: timeLeft,
    countdownTarget: countdownTarget, isWorkingDay: isWorkingDay,
    prefersReducedMotion: function () { return reduceMQ.matches; },
    isDesktop: function () { return desktopMQ.matches; }
  });

  /* --------------------------------------------------------------- catalog */
  var products = Array.isArray(BS.products) ? BS.products : [];
  var byId = new Map(products.map(function (p) { return [p.id, p]; }));
  var pdpIds = new Set(((BS.collections && BS.collections.pdp) || []).map(Number));
  var brandCounts = products.reduce(function (m, p) { m[p.brandSlug] = (m[p.brandSlug] || 0) + 1; return m; }, {});
  var GENDER = { moterims: 'Moterims', vyrams: 'Vyrams', vaikams: 'Vaikams' };
  var TYPE_LABELS = {
    striukes: 'Striukės ir paltai', dzemperiai: 'Džemperiai ir megztiniai', marskiniai: 'Marškiniai, marškinėliai ir polo',
    kelnes: 'Kelnės ir džinsai', sukneles: 'Suknelės', rankines: 'Rankinės ir krepšiai', pinigines: 'Piniginės',
    aksesuarai: 'Kiti aksesuarai', 'sportiniai-bateliai': 'Sportiniai bateliai', batai: 'Batai ir aulinukai'
  };
  var GROUP_LABELS = { drabuziai: 'Drabužiai', avalyne: 'Avalynė', aksesuarai: 'Aksesuarai' };
  var TYPE_RULES = [
    [/sportiniai bateliai/, 'sportiniai-bateliai', 'avalyne'],
    [/batai|aulinuk|sandal|slepet|sabo/, 'batai', 'avalyne'],
    [/striuk|palt|svark|liemen/, 'striukes', 'drabuziai'],
    [/dzemper|megztin|sportiniai kostium/, 'dzemperiai', 'drabuziai'],
    [/marskin|polo|bodz/, 'marskiniai', 'drabuziai'],
    [/kelne|dzins|sortai/, 'kelnes', 'drabuziai'],
    [/sukne|sijon/, 'sukneles', 'drabuziai'],
    [/rankin|kuprin|kreps|kosmetin/, 'rankines', 'aksesuarai'],
    [/pinigin/, 'pinigines', 'aksesuarai'],
    [/dirz|kepur|salik|akiniai|pirstin/, 'aksesuarai', 'aksesuarai']
  ];
  function groupFromLabel(label) {
    var n = normalize(label);
    if (/avalyne/.test(n)) return 'avalyne';
    if (/aksesuar/.test(n)) return 'aksesuarai';
    if (/drabuz/.test(n)) return 'drabuziai';
    return null;
  }
  function typeOf(label, colLabel) {
    var n = normalize(label);
    for (var i = 0; i < TYPE_RULES.length; i++) {
      if (TYPE_RULES[i][0].test(n)) return { typeSlug: TYPE_RULES[i][1], group: TYPE_RULES[i][2] };
    }
    return { typeSlug: null, group: groupFromLabel(label) || groupFromLabel(colLabel || '') };
  }
  var catCache = null;
  function categories() {
    if (catCache) return catCache;
    catCache = [];
    (BS.nav || []).forEach(function (n) {
      if (n.type !== 'mega') return;
      var gender = n.slug, kids = gender === 'vaikams';
      (n.columns || []).forEach(function (col) {
        (col.items || []).forEach(function (it) {
          var t = kids ? { typeSlug: null, group: groupFromLabel(it.label) } : typeOf(it.label, col.label);
          catCache.push({
            label: kids ? it.label + ' ' + col.label.toLowerCase() : it.label,
            slug: it.slug, gender: gender, genderLabel: GENDER[gender], column: col.label,
            kidsGender: kids ? normalize(col.label) : null,
            count: it.count == null ? null : it.count, typeSlug: t.typeSlug, group: t.group,
            url: catalog.listingUrl({ lytis: gender, kategorija: it.slug })
          });
        });
      });
    });
    return catCache;
  }
  var catalog = (BS.catalog = {
    get: function (id) { return byId.get(Number(id)) || null; },
    getMany: function (ids) {
      return (ids || []).map(function (id) { return id && typeof id === 'object' ? id : byId.get(Number(id)); }).filter(Boolean);
    },
    hasPage: function (p) { return pdpIds.has(Number(p && typeof p === 'object' ? p.id : p)); },
    url: function (p) {
      p = p && typeof p === 'object' ? p : byId.get(Number(p));
      return p && pdpIds.has(p.id) ? 'preke-' + p.slug + '.html' : null;
    },
    imageAlt: function (p) { return p ? p.brand + ' ' + lcFirst(p.title) : ''; },
    isPackshot: function (p, i) {
      if (!p) return false;
      if (!i) return p.imageBg === 'white';
      return (p.modelImages || []).indexOf(i) === -1;
    },
    brand: function (key) {
      var k = normalize(key);
      return (BS.brands || []).filter(function (b) { return b.slug === key || normalize(b.name) === k; })[0] || null;
    },
    brandUrl: function (slug) { return catalog.listingUrl({ zenklas: slug }); },
    listingUrl: function (params) {
      var u = new URLSearchParams();
      Object.keys(params || {}).forEach(function (k) {
        var v = params[k];
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return;
        u.set(k, Array.isArray(v) ? v.join(',') : v);
      });
      var s = u.toString();
      return 'parduotuve.html' + (s ? '?' + s : '');
    },
    genderLabel: function (g) { return GENDER[g] || ''; },
    typeLabels: TYPE_LABELS,
    groupLabels: GROUP_LABELS,
    categories: categories,
    /* resolves any category slug used in links (Woo leaf slug, column slug, typeSlug or group).
       kind: 'leaf' (nav sub-category) | 'kids-item' (Vaikams > Berniukams/Mergaitėms > item) | 'column' (nav column)
       | 'type' | 'group' | 'product' (a product's own category slug). isTypeSlug is true when the slug is ALSO a
       typeSlug (the Woo slugs 'kelnes', 'sukneles', 'sportiniai-bateliai' are both; the nav meaning wins). */
    categoryInfo: function (slug) {
      if (!slug) return null;
      var isType = Object.prototype.hasOwnProperty.call(TYPE_LABELS, slug);
      var c = categories().filter(function (x) { return x.slug === slug; })[0];
      if (c) return { slug: slug, label: c.label, gender: c.gender, group: c.group, typeSlug: c.typeSlug, kidsGender: c.kidsGender, kind: c.kidsGender ? 'kids-item' : 'leaf', isTypeSlug: isType };
      var navCol = null;
      (BS.nav || []).forEach(function (n) {
        (n.columns || []).forEach(function (col) { if (col.slug === slug) navCol = { col: col, gender: n.slug }; });
      });
      if (navCol) {
        var kids = navCol.gender === 'vaikams';
        return { slug: slug, label: navCol.col.label, gender: navCol.gender, group: kids ? null : groupFromLabel(navCol.col.label), typeSlug: null, kidsGender: kids ? normalize(navCol.col.label) : null, kind: 'column', isTypeSlug: isType };
      }
      if (isType) return { slug: slug, label: TYPE_LABELS[slug], gender: null, group: null, typeSlug: slug, kidsGender: null, kind: 'type', isTypeSlug: true };
      if (GROUP_LABELS[slug]) return { slug: slug, label: GROUP_LABELS[slug], gender: null, group: slug, typeSlug: null, kidsGender: null, kind: 'group', isTypeSlug: false };
      var p = products.filter(function (x) { return x.wooCategorySlug === slug || x.categorySlug === slug; })[0];
      if (p) return { slug: slug, label: p.category, gender: p.gender, group: p.group, typeSlug: p.typeSlug, kidsGender: p.kidsGender, kind: 'product', isTypeSlug: false };
      return null;
    },
    /* number of products this brand has in the demo data (0 = its listing can only show an empty state) */
    brandCount: function (slug) { return brandCounts[slug] || 0; }
  });

  /* ---------------------------------------------------------- data stores */
  var KEYS = { cart: 'bs-cart-v1', wish: 'bs-wishlist-v1', recent: 'bs-recent-v1', searches: 'bs-searches-v1' };
  var listeners = { cart: [], wish: [] };

  var recent = (BS.recent = {
    ids: function () { return storage.get(KEYS.recent, []).map(Number).filter(function (id) { return byId.has(id); }); },
    products: function () { return catalog.getMany(recent.ids()); },
    add: function (id) {
      id = Number(id); if (!byId.has(id)) return;
      var list = recent.ids().filter(function (x) { return x !== id; });
      list.unshift(id);
      storage.set(KEYS.recent, list.slice(0, 12));
    },
    clear: function () { storage.remove(KEYS.recent); }
  });

  /* --------------------------------------------------------------- ui bits */
  function icon(name, cls) {
    return '<svg class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>';
  }
  var sr = null;
  function announce(msg) {
    sr = sr || doc.getElementById('sr-status');
    if (!sr) return;
    sr.textContent = '';
    setTimeout(function () { sr.textContent = msg; }, 60);
  }
  function toast(msg, opts) {
    opts = opts || {};
    var region = doc.getElementById('toast-region');
    if (!region) return function () {};
    var t = doc.createElement('div');
    t.className = 'toast' + (opts.type ? ' toast--' + opts.type : '');
    var ic = opts.icon === false ? '' : icon(opts.icon || (opts.type === 'ok' ? 'check-circle' : 'info'));
    t.innerHTML = ic + '<span>' + esc(msg) + '</span>';
    var timer;
    function dismiss() {
      clearTimeout(timer);
      t.classList.remove('is-in');
      setTimeout(function () {
        t.remove();
        if (!region.children.length && region.hidePopover) { try { region.hidePopover(); } catch (e) { /* ignore */ } }
      }, 400);
    }
    if (opts.action) {
      var b = doc.createElement('button');
      b.type = 'button'; b.className = 'toast__action'; b.textContent = opts.action.label;
      b.addEventListener('click', function () { dismiss(); if (opts.action.onClick) opts.action.onClick(); });
      t.appendChild(b);
    }
    while (region.children.length >= 2) region.firstElementChild.remove();
    region.appendChild(t);
    if (region.showPopover) {
      try { if (region.matches(':popover-open')) region.hidePopover(); region.showPopover(); } catch (e) { /* ignore */ }
    }
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.add('is-in'); }); });
    if (opts.announce !== false) announce(msg);
    var dur = opts.duration || 3500;
    timer = setTimeout(dismiss, dur);
    t.addEventListener('mouseenter', function () { clearTimeout(timer); });
    t.addEventListener('mouseleave', function () { timer = setTimeout(dismiss, 1500); });
    return dismiss;
  }
  function demoToast() { toast('Demo versijoje šis puslapis neįtrauktas', { icon: 'info' }); }
  function demoBrandToast(name) { toast('Demo versijoje ' + (name || 'šio prekės ženklo') + ' prekių nėra', { icon: 'info' }); }

  function badgesHTML(p, o) {
    o = o || {};
    var out = '';
    if (p.onSale && p.discount > 0 && o.sale !== false) out += '<span class="badge badge--sale">' + discountLabel(p.discount) + '</span>';
    if (p.isNew && o.isNew !== false) out += '<span class="badge badge--new">Nauja</span>';
    return out;
  }
  function priceHTML(p, o) {
    o = o || {};
    var size = o.size ? ' price--' + o.size : '';
    var cls = o.className ? ' ' + o.className : '';
    var regular = p.regular != null ? p.regular : p.price;
    var onSale = regular > p.price;
    var badge = o.badge && onSale ? ' <span class="badge badge--sale' + (o.size ? ' badge--lg' : '') + '">' + discountLabel({ price: p.price, regular: regular, discount: p.discount }) + '</span>' : '';
    if (onSale) {
      return '<p class="price price--sale' + size + cls + '"><span class="sr-only">Kaina su nuolaida: </span><span class="price__now">' + formatPrice(p.price) +
        '</span><span class="sr-only">, ankstesnė kaina: </span><s class="price__old">' + formatPrice(regular) + '</s>' + badge + '</p>';
    }
    return '<p class="price' + size + cls + '"><span class="price__now">' + formatPrice(p.price) + '</span></p>';
  }
  function savingsHTML(p, cls) {
    if (!(p.regular > p.price)) return '';
    return '<p class="' + (cls || 'savings') + '">Sutaupote <strong>' + formatPrice(p.regular - p.price) + '</strong></p>';
  }
  function stockHTML(p) {
    if (p.stock == null || p.stock > 3 || p.stock < 1) return '';
    return '<p class="stock-line">' + (p.stock === 1 ? 'Liko paskutinis vienetas' : 'Liko tik ' + p.stock) + '</p>';
  }
  function wishButton(p, cls) {
    var on = wishlist.has(p.id);
    return '<button class="icon-btn ' + (cls || '') + '" type="button" data-wishlist="' + p.id + '" aria-pressed="' + on +
      '" aria-label="Įsiminti: ' + esc(catalog.imageAlt(p)) + '">' + icon('heart', 'i-off') + icon('heart-fill', 'i-on') + '</button>';
  }
  /* size chips. mode 'select' (aria-pressed toggles, for quick view / PDP) or 'add' (adds to cart on click) */
  function sizeChipsHTML(p, o) {
    o = o || {};
    var small = o.small ? ' size-chip--sm' : '';
    return (p.sizes || []).map(function (s) {
      var label = esc(sizeLabel(s.label));
      if (!s.available) {
        return '<button class="size-chip' + small + '" type="button" disabled aria-label="' + label + ', šiuo metu nėra">' + label + '</button>';
      }
      if (o.mode === 'add') {
        return '<button class="size-chip' + small + '" type="button" data-add-to-cart="' + p.id + '" data-size="' + esc(s.value) + '"' +
          (o.tabindex != null ? ' tabindex="' + o.tabindex + '"' : '') + ' aria-label="Į krepšelį, dydis ' + label + '">' + label + '</button>';
      }
      var sel = o.selected != null && String(o.selected) === String(s.value);
      return '<button class="size-chip' + small + '" type="button" data-size-value="' + esc(s.value) + '" aria-pressed="' + sel + '">' + label + '</button>';
    }).join('');
  }

  /* Product card. o: { variant: 'default'|'on-dark'|'compact', showSavings, eager, quickAdd (true), swap (true),
     headingLevel (3), badges (true), className } */
  function productCard(input, o) {
    o = o || {};
    var p = input && typeof input === 'object' ? input : catalog.get(input);
    if (!p) return '';
    var url = catalog.url(p);
    var variant = o.variant || 'default';
    var imgs = p.images || [];
    var swap = imgs.length > 1 && o.swap !== false;
    var hl = o.headingLevel || 3;
    var link = url ? 'href="' + url + '"' : 'href="#perziura-' + p.id + '" data-quick-view="' + p.id + '"';
    var cls = ['card', variant !== 'default' ? 'card--' + variant : '', swap ? 'card--swap' : '', o.className || ''].filter(Boolean).join(' ');
    var sizes = p.sizes || [];
    var oneSize = sizes.length <= 1;
    var quick = '';
    if (o.quickAdd !== false && variant !== 'compact') {
      var action = oneSize
        ? '<button class="btn btn--sm btn--block" type="button" data-add-to-cart="' + p.id + '" data-size="' + esc((sizes[0] && sizes[0].value) || 'UNI') + '" tabindex="-1">Į krepšelį</button>'
        : '<div class="card__sizes" role="group" aria-label="Greitai į krepšelį">' + sizeChipsHTML(p, { mode: 'add', small: true, tabindex: -1 }) + '</div>';
      quick = '<div class="card__quick"><p class="card__quick-label">' + (oneSize ? 'Vienas dydis' : 'Greitai į krepšelį') + '</p>' +
        '<button class="icon-btn card__qv" type="button" data-quick-view="' + p.id + '" aria-label="Greita peržiūra: ' + esc(catalog.imageAlt(p)) + '">' + icon('eye') + '</button>' + action + '</div>';
    }
    var badges = o.badges === false ? '' : badgesHTML(p);
    var loading = o.eager ? 'eager" fetchpriority="high' : 'lazy';
    return '<article class="' + cls + '" data-product-id="' + p.id + '">' +
      '<div class="card__media">' +
        '<a class="card__media-link" ' + link + ' tabindex="-1" aria-hidden="true">' +
          '<img class="card__img card__img--main' + (catalog.isPackshot(p, 0) ? ' is-packshot' : '') + '" src="' + esc(imgs[0]) + '" alt="' + esc(catalog.imageAlt(p)) + '" width="800" height="1200" loading="' + loading + '" decoding="async">' +
          (swap ? '<img class="card__img card__img--alt' + (catalog.isPackshot(p, 1) ? ' is-packshot' : '') + '" src="' + esc(imgs[1]) + '" alt="" width="800" height="1200" loading="lazy" decoding="async">' : '') +
        '</a>' +
        (badges ? '<div class="card__badges">' + badges + '</div>' : '') +
        wishButton(p, 'icon-btn--solid card__wish') +
        quick +
      '</div>' +
      '<div class="card__body">' +
        '<p class="card__brand">' + esc(p.brand) + '</p>' +
        '<h' + hl + ' class="card__title"><a class="card__link" ' + link + '>' + esc(p.title) + '</a></h' + hl + '>' +
        priceHTML(p) +
        (o.showSavings ? savingsHTML(p, 'card__savings') : '') +
      '</div>' +
    '</article>';
  }

  /* Fill a container with cards. list: ids or product objects. o: productCard options +
     { wrap: 'li'|'' (auto for UL/OL), slideClass, eagerCount, enhance (true) } */
  function renderProducts(el, list, o) {
    if (!el) return [];
    o = o || {};
    var items = catalog.getMany(list);
    var isList = el.tagName === 'UL' || el.tagName === 'OL';
    var wrap = o.wrap != null ? o.wrap : (isList ? 'li' : '');
    var slideCls = o.slideClass != null ? o.slideClass : (el.classList.contains('carousel__track') ? 'carousel__slide' : '');
    el.innerHTML = items.map(function (p, i) {
      var opts = Object.assign({}, o, { eager: o.eagerCount ? i < o.eagerCount : !!o.eager });
      var card = productCard(p, opts);
      return wrap ? '<' + wrap + (slideCls ? ' class="' + slideCls + '"' : '') + '>' + card + '</' + wrap + '>' : card;
    }).join('');
    if (o.enhance !== false) {
      var car = el.closest('[data-carousel]');
      enhance(car || el);
    }
    return items;
  }

  /* -------------------------------------------------------------- dialogs */
  var locks = new Set();
  function lockScroll(key) {
    locks.add(key);
    root.classList.add('is-locked');
    if (BS.lenis) BS.lenis.stop();
  }
  function unlockScroll(key) {
    locks.delete(key);
    if (!locks.size) {
      root.classList.remove('is-locked');
      if (BS.lenis) BS.lenis.start();
    }
  }
  function getDialog(t) { return typeof t === 'string' ? doc.getElementById(t) : t; }
  function setExpanded(id, val) {
    if (!id) return;
    qsa('[aria-controls="' + id + '"][aria-haspopup="dialog"]').forEach(function (b) { b.setAttribute('aria-expanded', val ? 'true' : 'false'); });
  }
  var dialog = {
    open: function (target, opener) {
      var d = getDialog(target);
      if (!d) return null;
      if (d.open) return d;
      bindDialog(d);
      qsa('dialog[open]').forEach(function (o) { if (o !== d) dialog.close(o, { instant: true }); });
      d._opener = opener || doc.activeElement;
      if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
      lockScroll('dialog:' + d.id);
      setExpanded(d.id, true);
      requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('is-open'); }); });
      emit(d, 'bs:dialog-open', { id: d.id });
      return d;
    },
    close: function (target, o) {
      var d = getDialog(target);
      if (!d || !d.open || d._closing) return;
      o = o || {};
      d.classList.remove('is-open');
      if (o.instant || reduceMQ.matches) { d.close(); return; }
      d._closing = true;
      setTimeout(function () { d._closing = false; if (d.open) d.close(); }, 420);
    },
    closeAll: function (o) {
      o = o || {};
      qsa('dialog[open]').forEach(function (d) {
        if (o.restoreFocus === false) d._noRestore = true;
        dialog.close(d, { instant: true });
      });
    },
    bind: function (d) { bindDialog(getDialog(d)); },
    isOpen: function (target) { var d = getDialog(target); return !!(d && d.open); }
  };
  function initDialogs() { qsa('dialog').forEach(bindDialog); }
  function bindDialog(d) {
    {
      if (d._bsDialog) return;
      d._bsDialog = true;
      d.addEventListener('cancel', function (e) { e.preventDefault(); dialog.close(d); });
      d.addEventListener('close', function () {
        if (d.open) return; /* reopened before the async close event fired */
        d.classList.remove('is-open');
        unlockScroll('dialog:' + d.id);
        setExpanded(d.id, false);
        var op = d._noRestore ? null : d._opener;
        d._opener = null;
        d._noRestore = false;
        if (op && op.isConnected && typeof op.focus === 'function' && !qs('dialog[open]')) {
          try { op.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
        }
        emit(d, 'bs:dialog-close', { id: d.id });
      });
      d.addEventListener('click', function (e) {
        if (e.target !== d) return;
        var r = d.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(d);
      });
    }
  }

  /* ------------------------------------------------------------- wishlist */
  var wishlist = (BS.wishlist = (function () {
    var ids = storage.get(KEYS.wish, []).map(Number).filter(function (id) { return byId.has(id); });
    function save() { storage.set(KEYS.wish, ids); }
    function has(id) { return ids.indexOf(Number(id)) !== -1; }
    function sync(scope) {
      qsaSelf('[data-wishlist]', scope || doc).forEach(function (b) {
        b.setAttribute('aria-pressed', has(b.getAttribute('data-wishlist')) ? 'true' : 'false');
      });
    }
    function badge(bump) {
      qsa('[data-wishlist-count]').forEach(function (b) {
        b.textContent = ids.length;
        b.hidden = !ids.length;
        if (bump) { b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); }
      });
      qsa('[data-wishlist-count-text]').forEach(function (el) { el.textContent = ids.length ? countLabel(ids.length, ['prekė', 'prekės', 'prekių']) : ''; });
    }
    function render() {
      var body = qs('[data-wishlist-body]');
      if (!body) return;
      var list = catalog.getMany(ids);
      if (!list.length) {
        body.innerHTML = '<div class="drawer-empty">' + icon('heart') + '<p class="drawer-empty__title">Norų sąrašas tuščias</p>' +
          '<p class="drawer-empty__text">Spauskite širdelę ant prekės ir ji išliks čia, kol sugrįšite.</p>' +
          '<div class="cluster"><a class="btn btn--ghost btn--sm" href="index.html#naujienos">Naujienos</a><a class="btn btn--sm" href="parduotuve.html">Išpardavimas</a></div></div>';
        return;
      }
      body.innerHTML = '<ul class="line-items" role="list">' + list.map(function (p) {
        var url = catalog.url(p);
        var link = url ? 'href="' + url + '"' : 'href="#perziura-' + p.id + '" data-quick-view="' + p.id + '"';
        return '<li class="line-item" data-wish-line="' + p.id + '">' +
          '<a class="line-item__media media-well" ' + link + ' tabindex="-1" aria-hidden="true"><img class="' + (catalog.isPackshot(p, 0) ? 'packshot' : '') + '" src="' + esc(p.images[0]) + '" alt="" width="800" height="1200" loading="lazy"></a>' +
          '<div class="line-item__info"><p class="card__brand">' + esc(p.brand) + '</p>' +
          '<p class="line-item__title"><a ' + link + '>' + esc(p.title) + '</a></p>' + priceHTML(p) +
          '<div class="line-item__actions"><button class="btn btn--link btn--sm" type="button" data-quick-view="' + p.id + '">Greita peržiūra</button></div></div>' +
          '<button class="icon-btn icon-btn--sm line-item__remove" type="button" data-wishlist="' + p.id + '" aria-pressed="true" aria-label="Pašalinti iš norų sąrašo: ' + esc(catalog.imageAlt(p)) + '">' + icon('x') + '</button>' +
          '</li>';
      }).join('') + '</ul>';
    }
    function set(id, on, o) {
      id = Number(id);
      o = o || {};
      if (!byId.has(id)) return false;
      var was = has(id);
      if (on === was) return was;
      if (on) ids.unshift(id); else ids = ids.filter(function (x) { return x !== id; });
      save();
      sync(doc);
      badge(on);
      render();
      if (!o.silent) {
        if (on) toast('Pridėta į norų sąrašą', { type: 'ok', icon: 'heart-fill', action: { label: 'Peržiūrėti', onClick: function () { api.open(); } } });
        else toast('Pašalinta iš norų sąrašo', { icon: 'heart' });
      }
      var detail = { id: id, added: on, ids: ids.slice() };
      listeners.wish.forEach(function (fn) { fn(detail); });
      emit(doc, 'bs:wishlist', detail);
      return on;
    }
    var api = {
      has: has,
      ids: function () { return ids.slice(); },
      count: function () { return ids.length; },
      add: function (id, o) { return set(id, true, o); },
      remove: function (id, o) { return set(id, false, o); },
      toggle: function (id, o) { return set(id, !has(id), o); },
      sync: sync,
      render: render,
      on: function (fn) { listeners.wish.push(fn); },
      open: function (opener) { render(); dialog.open('wishlist-drawer', opener); },
      init: function () { badge(false); render(); sync(doc); }
    };
    return api;
  })());

  /* ----------------------------------------------------------------- cart */
  var cart = (BS.cart = (function () {
    var facts = (BS.meta && BS.meta.shippingFacts) || {};
    var SHIP_COST = Number(facts.cost) || 3;
    var FREE_FROM = parseInt(facts.freeFrom, 10) || 2;
    var MAX_LINE = 9;
    var lines = storage.get(KEYS.cart, []).filter(function (l) { return l && byId.has(Number(l.id)); });
    function save() { storage.set(KEYS.cart, lines); }
    /* quantity limits: at most 9 per line, and never more units of a product (all sizes together) than its
       stock when the data knows it (p.stock), so "Liko tik 3" and the cart can't disagree */
    function productQty(id, except) {
      return lines.reduce(function (n, l) { return l.id === id && l !== except ? n + l.qty : n; }, 0);
    }
    function lineMax(p, line) {
      var max = MAX_LINE;
      if (p && p.stock != null && isFinite(p.stock)) max = Math.min(max, Math.max(0, Math.floor(p.stock) - productQty(p.id, line)));
      return max;
    }
    function stockLimited(p, line) { return !!(p && p.stock != null && lineMax(p, line) < MAX_LINE); }
    function limitToast(p, line) {
      if (stockLimited(p, line)) toast(p.stock > 0 ? 'Daugiau šios prekės neturime' : 'Šios prekės šiuo metu neturime', { icon: 'info' });
      else toast('Vienos prekės galima įsidėti ne daugiau kaip ' + MAX_LINE + ' vnt.', { icon: 'info' });
    }
    (function clampStored() {
      /* carts saved before the stock cap existed: earlier lines keep their units first */
      var dirty = false, used = {};
      lines.forEach(function (l) {
        l.id = Number(l.id);
        var p = byId.get(l.id), cap = MAX_LINE;
        if (p && p.stock != null && isFinite(p.stock)) cap = Math.min(cap, Math.max(0, Math.floor(p.stock) - (used[l.id] || 0)));
        var q = Math.max(0, Math.min(Math.floor(Number(l.qty) || 0), cap));
        if (q !== l.qty) { l.qty = q; dirty = true; }
        used[l.id] = (used[l.id] || 0) + q;
      });
      var kept = lines.filter(function (l) { return l.qty > 0; });
      if (kept.length !== lines.length) { lines = kept; dirty = true; }
      if (dirty) save();
    })();
    function findSize(p, size) {
      if (!p) return null;
      var s = String(size);
      return (p.sizes || []).filter(function (x) { return x.value === s || x.label === s || sizeLabel(x.label) === s; })[0] || null;
    }
    function find(id, size) {
      id = Number(id);
      return lines.filter(function (l) { return l.id === id && l.size === String(size); })[0] || null;
    }
    function items() {
      return lines.map(function (l) {
        var p = byId.get(l.id), s = findSize(p, l.size);
        return {
          id: l.id, size: l.size, sizeLabel: s ? sizeLabel(s.label) : l.size, qty: l.qty, product: p,
          lineTotal: p.price * l.qty, lineRegular: (p.regular || p.price) * l.qty,
          maxQty: lineMax(p, l), stockLimited: stockLimited(p, l)
        };
      });
    }
    function count() { return lines.reduce(function (n, l) { return n + l.qty; }, 0); }
    function totals() {
      var it = items();
      var c = count();
      var subtotal = it.reduce(function (n, x) { return n + x.lineTotal; }, 0);
      var regularTotal = it.reduce(function (n, x) { return n + x.lineRegular; }, 0);
      var free = c >= FREE_FROM;
      var shipping = c === 0 || free ? 0 : SHIP_COST;
      return {
        count: c, subtotal: subtotal, regularTotal: regularTotal, savings: regularTotal - subtotal,
        freeShipping: free, shipping: shipping, shippingCost: SHIP_COST, freeFrom: FREE_FROM,
        remainingForFree: Math.max(0, FREE_FROM - c), total: subtotal + shipping
      };
    }
    function changed(type, extra) {
      save();
      badge(type === 'add');
      render();
      var detail = Object.assign({ type: type, items: items(), totals: totals() }, extra || {});
      listeners.cart.forEach(function (fn) { fn(detail); });
      emit(doc, 'bs:cart', detail);
    }
    function badge(bump) {
      var c = count();
      qsa('[data-cart-count]').forEach(function (b) {
        b.textContent = c;
        b.hidden = !c;
        if (bump) { b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); }
      });
      qsa('[data-cart-count-text]').forEach(function (el) { el.textContent = c ? countLabel(c, ['prekė', 'prekės', 'prekių']) : ''; });
    }
    function add(id, size, o) {
      o = o || {};
      var p = byId.get(Number(id));
      if (!p) return null;
      var s = size != null && size !== '' ? findSize(p, size) : null;
      if (!s) {
        if ((p.sizes || []).length === 1) s = p.sizes[0];
        else { toast('Pasirinkite dydį', { icon: 'ruler' }); return null; }
      }
      if (!s.available) { toast('Šio dydžio šiuo metu nėra', { icon: 'info' }); return null; }
      var qty = Math.max(1, Math.min(MAX_LINE, Math.floor(Number(o.qty) || 1)));
      var line = find(p.id, s.value);
      var room = lineMax(p, line) - (line ? line.qty : 0);
      if (room <= 0) { limitToast(p, line); return null; }
      qty = Math.min(qty, room);
      if (line) line.qty += qty;
      else { line = { id: p.id, size: s.value, qty: qty, t: Date.now() }; lines.push(line); }
      changed('add', { id: p.id, size: s.value });
      announce(p.brand + ' ' + lcFirst(p.title) + ', dydis ' + sizeLabel(s.label) + ': pridėta į krepšelį');
      if (o.open !== false) api.open(o.opener);
      else if (!o.silent) toast('Pridėta į krepšelį: ' + p.brand, { type: 'ok', icon: 'check-circle', action: { label: 'Krepšelis', onClick: function () { api.open(); } } });
      return line;
    }
    function remove(id, size) {
      var before = lines.length;
      lines = lines.filter(function (l) { return !(l.id === Number(id) && l.size === String(size)); });
      if (lines.length !== before) changed('remove', { id: Number(id), size: String(size) });
    }
    function setQty(id, size, qty) {
      var l = find(id, size);
      if (!l) return;
      qty = Math.floor(Number(qty) || 0);
      if (qty <= 0) { remove(id, size); return; }
      var p = byId.get(l.id), max = lineMax(p, l);
      if (qty > max) { limitToast(p, l); qty = max; }
      if (qty === l.qty) return;
      l.qty = qty;
      changed('qty', { id: Number(id), size: String(size) });
    }
    function clear() { lines = []; changed('clear'); }

    function shippingHTML(t) {
      if (!t.count) return '';
      var n = t.remainingForFree;
      var text = t.freeShipping ? 'Pristatymas nemokamas!' :
        'Įsidėkite dar ' + n + ' ' + plural(n, ['prekę', 'prekes', 'prekių']) + ' ir pristatymas bus nemokamas';
      return '<p class="ship-progress__text">' + icon(t.freeShipping ? 'check-circle' : 'truck') + '<span>' + text + '</span></p>' +
        '<div class="ship-progress__bar" aria-hidden="true"><span style="--p:' + Math.min(1, t.count / t.freeFrom) + '"></span></div>';
    }
    function lineHTML(x) {
      var p = x.product, url = catalog.url(p);
      var link = url ? 'href="' + url + '"' : 'href="#perziura-' + p.id + '" data-quick-view="' + p.id + '"';
      var key = p.id + '|' + x.size;
      var sizeText = (p.sizes || []).length <= 1 ? 'Vienas dydis' : 'Dydis: ' + esc(x.sizeLabel);
      return '<li class="line-item" data-line="' + esc(key) + '">' +
        '<a class="line-item__media media-well" ' + link + ' tabindex="-1" aria-hidden="true"><img class="' + (catalog.isPackshot(p, 0) ? 'packshot' : '') + '" src="' + esc(p.images[0]) + '" alt="" width="800" height="1200" loading="lazy"></a>' +
        '<div class="line-item__info"><p class="card__brand">' + esc(p.brand) + '</p>' +
        '<p class="line-item__title"><a ' + link + '>' + esc(p.title) + '</a></p>' +
        '<p class="line-item__meta">' + sizeText + '</p>' +
        '<div class="line-item__row"><div class="qty" role="group" aria-label="Kiekis: ' + esc(p.brand) + '">' +
          '<button class="qty__btn" type="button" data-cart-dec="' + esc(key) + '" aria-label="Sumažinti kiekį">' + icon('minus') + '</button>' +
          '<span class="qty__val">' + x.qty + '</span>' +
          (x.qty >= x.maxQty
            ? '<button class="qty__btn" type="button" data-cart-inc="' + esc(key) + '" aria-disabled="true" aria-label="' + (x.stockLimited ? 'Pasiektas likutis' : 'Pasiektas didžiausias kiekis') + '">' + icon('plus') + '</button></div>'
            : '<button class="qty__btn" type="button" data-cart-inc="' + esc(key) + '" aria-label="Padidinti kiekį">' + icon('plus') + '</button></div>') +
          priceHTML({ price: x.lineTotal, regular: x.lineRegular }) + '</div></div>' +
        '<button class="icon-btn icon-btn--sm line-item__remove" type="button" data-cart-remove="' + esc(key) + '" aria-label="Pašalinti iš krepšelio: ' + esc(catalog.imageAlt(p)) + '">' + icon('x') + '</button>' +
        '</li>';
    }
    function render() {
      var drawer = doc.getElementById('cart-drawer');
      if (!drawer) return;
      var t = totals();
      var ship = qs('[data-cart-shipping]', drawer), body = qs('[data-cart-body]', drawer), foot = qs('[data-cart-foot]', drawer);
      var focusKey = doc.activeElement && drawer.contains(doc.activeElement) ? doc.activeElement.getAttribute('data-cart-inc') && 'inc:' + doc.activeElement.getAttribute('data-cart-inc') ||
        doc.activeElement.getAttribute('data-cart-dec') && 'dec:' + doc.activeElement.getAttribute('data-cart-dec') : null;
      ship.hidden = !t.count;
      ship.classList.toggle('is-done', t.freeShipping);
      ship.innerHTML = shippingHTML(t);
      foot.hidden = !t.count;
      if (!t.count) {
        body.innerHTML = '<div class="drawer-empty">' + icon('handbag') + '<p class="drawer-empty__title">Jūsų krepšelis tuščias</p>' +
          '<p class="drawer-empty__text">Originalūs prekių ženklai su nuolaidomis jau laukia.</p>' +
          '<div class="cluster"><a class="btn btn--ghost btn--sm" href="index.html#naujienos">Naujienos</a><a class="btn btn--sm" href="parduotuve.html">Išpardavimas</a></div></div>';
        return;
      }
      body.innerHTML = '<ul class="line-items" role="list">' + items().map(lineHTML).join('') + '</ul>';
      foot.innerHTML = '<dl class="totals">' +
        '<div class="totals__row"><dt>Tarpinė suma</dt><dd>' + formatPrice(t.subtotal) + '</dd></div>' +
        (t.savings > 0 ? '<div class="totals__row totals__row--save"><dt>Sutaupote</dt><dd>' + formatPrice(t.savings) + '</dd></div>' : '') +
        '<div class="totals__row' + (t.freeShipping ? ' totals__row--ok' : '') + '"><dt>Pristatymas</dt><dd>' + (t.freeShipping ? 'nemokamas' : formatPrice(t.shipping)) + '</dd></div>' +
        '<div class="totals__row totals__row--total"><dt>Iš viso</dt><dd>' + formatPrice(t.total) + '</dd></div></dl>' +
        '<button class="btn btn--block" type="button" data-cart-checkout>Pereiti prie apmokėjimo' + icon('arrow-right', 'btn__arrow') + '</button>' +
        '<button class="btn btn--ghost btn--block" type="button" data-dialog-close>Tęsti apsipirkimą</button>';
      if (focusKey) {
        var parts = focusKey.split(':');
        var el = qs('[data-cart-' + parts[0] + '="' + parts.slice(1).join(':') + '"]', drawer);
        if (el && !el.disabled) el.focus(); else { var any = qs('.qty__btn:not(:disabled)', drawer); if (any) any.focus(); }
      }
    }
    function bind() {
      var drawer = doc.getElementById('cart-drawer');
      if (!drawer) return;
      drawer.addEventListener('click', function (e) {
        var b = e.target.closest('[data-cart-inc],[data-cart-dec],[data-cart-remove],[data-cart-checkout]');
        if (!b) return;
        if (b.hasAttribute('data-cart-checkout')) { toast('Demo versijoje apmokėjimas neįtrauktas', { icon: 'lock-simple' }); return; }
        var key = b.getAttribute('data-cart-inc') || b.getAttribute('data-cart-dec') || b.getAttribute('data-cart-remove');
        var i = key.indexOf('|'), id = key.slice(0, i), size = key.slice(i + 1);
        var l = find(id, size);
        if (!l) return;
        if (b.hasAttribute('data-cart-inc')) setQty(id, size, l.qty + 1);
        else if (b.hasAttribute('data-cart-dec')) setQty(id, size, l.qty - 1);
        else {
          var li = b.closest('.line-item');
          if (li && !reduceMQ.matches) { li.classList.add('is-leaving'); setTimeout(function () { remove(id, size); }, 240); }
          else remove(id, size);
          announce('Prekė pašalinta iš krepšelio');
        }
      });
    }
    var api = {
      add: add, remove: remove, setQty: setQty, clear: clear, items: items, count: count, totals: totals, render: render,
      on: function (fn) { listeners.cart.push(fn); },
      open: function (opener) { render(); dialog.open('cart-drawer', opener); },
      close: function () { dialog.close('cart-drawer'); },
      init: function () { badge(false); render(); bind(); }
    };
    return api;
  })());

  /* ----------------------------------------------------------- quick view */
  function quickViewHTML(p) {
    var imgs = (p.images || []).slice(0, 3);
    var url = catalog.url(p);
    var one = (p.sizes || []).length <= 1;
    var thumbs = imgs.length > 1 ? '<div class="qv__thumbs">' + imgs.map(function (src, i) {
      return '<button class="qv__thumb" type="button" data-qv-thumb="' + i + '" aria-current="' + (i === 0) + '" aria-label="Nuotrauka ' + (i + 1) + ' iš ' + imgs.length + '"><img class="' + (catalog.isPackshot(p, i) ? 'is-packshot' : '') + '" src="' + esc(src) + '" alt="" width="800" height="1200"></button>';
    }).join('') + '</div>' : '';
    var details = (p.details || []).slice(0, 3).map(function (d) { return '<li>' + esc(dashFree(d)) + '</li>'; }).join('');
    return '<div class="qv__gallery"><div class="qv__main"><img class="' + (catalog.isPackshot(p, 0) ? 'is-packshot' : '') + '" src="' + esc(imgs[0]) + '" alt="' + esc(catalog.imageAlt(p)) + '" width="800" height="1200" data-qv-main></div>' + thumbs + '</div>' +
      '<div class="qv__info">' +
        '<p class="qv__brand"><a href="' + catalog.brandUrl(p.brandSlug) + '">' + esc(p.brand) + '</a></p>' +
        '<h2 class="qv__title" id="qv-title" tabindex="-1" autofocus>' + esc(p.title) + '</h2>' +
        '<div class="qv__price">' + priceHTML(p, { size: 'lg', badge: true }) + savingsHTML(p) + '</div>' +
        (one ? '<p class="small text-2">Vienas dydis</p>' :
          '<div class="qv__sizes"><p class="qv__label" id="qv-size-label"><span>Dydis</span></p>' +
          '<div class="sizes" role="group" aria-labelledby="qv-size-label" data-qv-sizes>' + sizeChipsHTML(p, { mode: 'select' }) + '</div>' +
          '<p class="field__error" data-qv-error hidden>Pasirinkite dydį</p></div>') +
        stockHTML(p) +
        '<div class="qv__actions"><button class="btn btn--block" type="button" data-qv-add>Į krepšelį</button>' + wishButton(p, 'icon-btn--outline') + '</div>' +
        (details ? '<ul class="qv__details">' + details + '</ul>' : '') +
        '<div class="qv__foot">' + (url
          ? '<a class="btn btn--link" href="' + url + '">Visa prekės informacija' + icon('arrow-right', 'btn__arrow') + '</a>'
          : '<p class="qv__note">Demo: pilnas prekės puslapis sukurtas trims prekėms.</p>') +
        '</div>' +
      '</div>';
  }
  function quickView(id, opener) {
    var p = catalog.get(id);
    var d = doc.getElementById('quick-view');
    if (!p || !d) return;
    var body = qs('[data-qv-body]', d);
    body.innerHTML = quickViewHTML(p);
    var selected = (p.sizes || []).length === 1 ? p.sizes[0].value : null;
    var main = qs('[data-qv-main]', body);
    qsa('[data-qv-thumb]', body).forEach(function (b) {
      b.addEventListener('click', function () {
        var i = Number(b.getAttribute('data-qv-thumb'));
        main.src = p.images[i];
        main.classList.toggle('is-packshot', catalog.isPackshot(p, i));
        qsa('[data-qv-thumb]', body).forEach(function (x) { x.setAttribute('aria-current', x === b ? 'true' : 'false'); });
      });
    });
    var sizesEl = qs('[data-qv-sizes]', body), err = qs('[data-qv-error]', body);
    if (sizesEl) {
      sizesEl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-size-value]');
        if (!b) return;
        selected = b.getAttribute('data-size-value');
        qsa('[data-size-value]', sizesEl).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        sizesEl.classList.remove('is-error');
        if (err) err.hidden = true;
      });
    }
    qs('[data-qv-add]', body).addEventListener('click', function () {
      if (!selected) {
        if (err) err.hidden = false;
        if (sizesEl) {
          sizesEl.classList.add('is-error');
          sizesEl.classList.remove('shake'); void sizesEl.offsetWidth; sizesEl.classList.add('shake');
          var first = qs('[data-size-value]', sizesEl); if (first) first.focus();
        }
        return;
      }
      dialog.close(d, { instant: true });
      cart.add(p.id, selected, { opener: opener });
    });
    recent.add(p.id);
    dialog.open(d, opener);
  }

  /* -------------------------------------------------------------- carousel */
  /* markup: [data-carousel] > .carousel__viewport > ul.carousel__track > li.carousel__slide
     optional .carousel__footer with .carousel__progress > .carousel__bar, [data-carousel-prev], [data-carousel-next] */
  function mountCarousel(el) {
    if (el._bsCarousel) { el._bsCarousel.refresh(); return el._bsCarousel; }
    var viewport = qs('.carousel__viewport', el), track = qs('.carousel__track', el);
    if (!viewport || !track) return null;
    var prev = qs('[data-carousel-prev]', el), next = qs('[data-carousel-next]', el);
    var bar = qs('.carousel__bar', el), count = qs('.carousel__count', el);
    el.classList.add('carousel');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'region');
    el.setAttribute('aria-roledescription', 'karuselė');
    if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) el.setAttribute('aria-label', 'Prekės');
    viewport.setAttribute('data-lenis-prevent-horizontal', '');
    if (prev && !prev.hasAttribute('aria-label')) prev.setAttribute('aria-label', 'Ankstesnės prekės');
    if (next && !next.hasAttribute('aria-label')) next.setAttribute('aria-label', 'Kitos prekės');
    function slides() { return qsa(':scope > .carousel__slide', track); }
    function label() {
      var s = slides();
      s.forEach(function (li, i) {
        li.setAttribute('role', 'group');
        li.setAttribute('aria-roledescription', 'skaidrė');
        li.setAttribute('aria-label', (i + 1) + ' iš ' + s.length);
      });
    }
    function step() {
      var s = slides();
      if (s.length < 2) return viewport.clientWidth;
      return s[1].offsetLeft - s[0].offsetLeft || viewport.clientWidth;
    }
    function perView() { return Math.max(1, Math.floor((viewport.clientWidth + 8) / step())); }
    function go(dir) {
      viewport.scrollBy({ left: dir * step() * perView(), behavior: reduceMQ.matches ? 'auto' : 'smooth' });
    }
    function update() {
      var max = viewport.scrollWidth - viewport.clientWidth;
      var x = viewport.scrollLeft;
      if (prev) prev.disabled = x <= 2;
      if (next) next.disabled = x >= max - 2;
      el.classList.toggle('is-static', max <= 2);
      var size = viewport.scrollWidth ? Math.min(1, viewport.clientWidth / viewport.scrollWidth) : 1;
      var pos = max > 0 ? Math.min(1, x / max) : 0;
      if (bar) {
        bar.style.setProperty('--size', size.toFixed(4));
        bar.style.setProperty('--offset', (size >= 1 ? 0 : ((1 - size) / size) * pos * 100).toFixed(2) + '%');
      }
      if (count) {
        var s = slides(), n = s.length, st = step() || 1;
        var first = Math.min(n, Math.round(x / st) + 1), last = Math.min(n, first + perView() - 1);
        count.textContent = first + (last > first ? '-' + last : '') + ' iš ' + n;
      }
    }
    var onScroll = rafThrottle(update);
    viewport.addEventListener('scroll', onScroll, { passive: true });
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    el.addEventListener('keydown', function (e) {
      if (isTyping(e.target)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    /* mouse drag to scroll */
    var drag = null;
    viewport.addEventListener('dragstart', function (e) { e.preventDefault(); });
    viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button, input, select')) return;
      drag = { x: e.clientX, left: viewport.scrollLeft, moved: false, id: e.pointerId };
    });
    viewport.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 6) {
        drag.moved = true;
        el.classList.add('is-dragging');
        try { viewport.setPointerCapture(drag.id); } catch (err) { /* ignore */ }
      }
      if (drag.moved) viewport.scrollLeft = drag.left - dx;
    });
    function endDrag() {
      if (!drag) return;
      var moved = drag.moved;
      drag = null;
      if (!moved) return;
      var block = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
      viewport.addEventListener('click', block, { capture: true, once: true });
      setTimeout(function () { viewport.removeEventListener('click', block, true); }, 50);
      var before = viewport.scrollLeft;
      el.classList.remove('is-dragging');
      /* re-enabling snap may jump; smooth it by snapping to the nearest slide ourselves */
      var st = step();
      if (st) {
        viewport.scrollLeft = before;
        viewport.scrollTo({ left: Math.round(before / st) * st, behavior: reduceMQ.matches ? 'auto' : 'smooth' });
      }
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('lostpointercapture', endDrag);
    if (window.ResizeObserver) new ResizeObserver(onScroll).observe(viewport);
    var api = {
      el: el, viewport: viewport, go: go, update: update,
      refresh: function () { label(); update(); },
      scrollToStart: function () { viewport.scrollTo({ left: 0, behavior: 'auto' }); update(); }
    };
    el._bsCarousel = api;
    api.refresh();
    return api;
  }

  /* ------------------------------------------------------------------ tabs */
  /* [data-tabs] containing [role=tablist] > [role=tab][aria-controls] (+ optional .tabs__ink/.seg__ink).
     Panels are optional: without aria-controls the page listens to `bs:tabchange` and re-renders one panel. */
  function mountTabs(el) {
    if (el._bsTabs) { el._bsTabs.placeInk(); return el._bsTabs; }
    var list = el.matches('[role="tablist"]') ? el : qs('[role="tablist"]', el);
    if (!list) return null;
    var tabs = qsa('[role="tab"]', list);
    if (!tabs.length) return null;
    var ink = qs('.tabs__ink, .seg__ink', list);
    if (ink) list.classList.add('has-ink');
    var current = Math.max(0, tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; }));
    function panelOf(t) { var id = t.getAttribute('aria-controls'); return id ? doc.getElementById(id) : null; }
    function placeInk() {
      if (!ink) return;
      var t = tabs[current];
      if (!t || !t.offsetWidth) return;
      list.style.setProperty('--ink-x', t.offsetLeft + 'px');
      list.style.setProperty('--ink-w', t.offsetWidth + 'px');
    }
    function select(i, o) {
      o = o || {};
      i = (i + tabs.length) % tabs.length;
      var changed = i !== current;
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var p = panelOf(t);
        if (p) p.hidden = !on;
      });
      current = i;
      placeInk();
      if (o.focus) tabs[i].focus();
      if (changed && o.emit !== false) {
        emit(el, 'bs:tabchange', { index: i, tab: tabs[i], panel: panelOf(tabs[i]), value: tabs[i].getAttribute('data-value') });
      }
    }
    tabs.forEach(function (t, k) {
      t.tabIndex = k === current ? 0 : -1;
      var p = panelOf(t);
      if (p) { p.hidden = k !== current; if (!p.hasAttribute('tabindex')) p.tabIndex = 0; }
      t.addEventListener('click', function () { select(k); });
    });
    list.addEventListener('keydown', function (e) {
      var k = tabs.indexOf(doc.activeElement);
      if (k < 0) return;
      var n = null;
      if (e.key === 'ArrowRight') n = k + 1;
      else if (e.key === 'ArrowLeft') n = k - 1;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n === null) return;
      e.preventDefault();
      select(n, { focus: true });
    });
    if (window.ResizeObserver) new ResizeObserver(placeInk).observe(list);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(placeInk);
    placeInk();
    var api = { el: el, tabs: tabs, select: select, placeInk: placeInk, index: function () { return current; } };
    el._bsTabs = api;
    return api;
  }

  /* ------------------------------------------------------------ accordion */
  /* <details class="acc"> with summary.acc__head + .acc__body. Opening fades the body in (transform/opacity only).
     Use the native name="group" attribute on <details> for exclusive groups. */
  function mountAccordion(d) {
    if (d._bsAcc) return;
    d._bsAcc = true;
    var body = qs(':scope > .acc__body', d);
    d.addEventListener('toggle', function () {
      if (!d.open || !body || !root.classList.contains('motion-ok') || !body.animate) return;
      body.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
    });
  }

  /* --------------------------------------------------------------- header */
  var header = (BS.header = (function () {
    var el = null, overlay = false, atTop = true, condensed = false, hidden = false, lastY = 0;
    var holds = new Set();
    var bar = null;
    function sync() {
      if (!el) return;
      var panel = el.classList.contains('is-panel-open') || el.classList.contains('is-search-open');
      el.classList.toggle('is-solid', !overlay || !atTop || panel);
    }
    function syncOffset() {
      root.style.setProperty('--hdr-offset', hidden ? '0px' : condensed ? 'var(--hdr-condensed)' : 'var(--hdr-h)');
    }
    function setCondensed(v) {
      if (!el || condensed === v) return;
      condensed = v;
      el.classList.toggle('is-condensed', v);
      syncOffset();
      emit(el, 'bs:header', { condensed: condensed, hidden: hidden });
    }
    function setHidden(v) {
      if (!el || hidden === v) return;
      hidden = v;
      el.classList.toggle('is-hidden', v);
      syncOffset();
      emit(el, 'bs:header', { condensed: condensed, hidden: hidden });
    }
    function onScroll(y) {
      var dy = y - lastY;
      if (Math.abs(dy) < 6) return;
      var down = dy > 0;
      if (!holds.size) setCondensed(down && y > 320);
      if (bar) bar.classList.toggle('is-hidden', down && y > 240 && !holds.size);
      lastY = y;
    }
    return {
      init: function () {
        el = qs('[data-header]');
        bar = qs('[data-mobile-bar]');
        if (!el) return;
        overlay = el.classList.contains('site-header--overlay');
        var sentinel = doc.createElement('div');
        sentinel.setAttribute('aria-hidden', 'true');
        sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:' + (36 + 40) + 'px;pointer-events:none;visibility:hidden;';
        doc.body.prepend(sentinel);
        if ('IntersectionObserver' in window) {
          new IntersectionObserver(function (entries) { atTop = entries[0].isIntersecting; sync(); }).observe(sentinel);
        }
        sync();
        if (window.Motion && typeof window.Motion.scroll === 'function') {
          window.Motion.scroll(function (progress, info) { onScroll(info.y.current); });
        }
      },
      sync: sync,
      hold: function (key) { holds.add(key || 'x'); setCondensed(false); if (bar) bar.classList.remove('is-hidden'); },
      release: function (key) { holds.delete(key || 'x'); },
      setCondensed: setCondensed,
      setHidden: setHidden,
      isCondensed: function () { return condensed; },
      isHidden: function () { return hidden; },
      get el() { return el; }
    };
  })());

  /* ------------------------------------------------------------ mega menu */
  var mega = (BS.mega = (function () {
    var current = null, openTimer = 0, closeTimer = 0, openedAt = 0, hdr = null;
    function panelFor(t) { return doc.getElementById(t.getAttribute('aria-controls')); }
    function open(t, o) {
      o = o || {};
      clearTimeout(closeTimer); clearTimeout(openTimer);
      if (current === t) return;
      if (current) close(current, true);
      var p = panelFor(t);
      if (!p) return;
      current = t;
      openedAt = performance.now();
      t.setAttribute('aria-expanded', 'true');
      p.classList.add('is-open');
      hdr.classList.add('is-panel-open');
      header.hold('mega');
      header.sync();
      if (o.focusFirst) {
        setTimeout(function () {
          var f = qs(o.focusSelector || 'input, a[href], button:not([disabled])', p);
          if (f) f.focus({ preventScroll: true });
        }, 30);
      }
    }
    function close(t, switching) {
      t = t || current;
      if (!t) return;
      var p = panelFor(t);
      t.setAttribute('aria-expanded', 'false');
      if (p) p.classList.remove('is-open');
      if (t === current) current = null;
      if (!switching) {
        hdr.classList.remove('is-panel-open');
        header.release('mega');
        header.sync();
      }
    }
    function init() {
      hdr = qs('[data-header]');
      if (!hdr) return;
      qsa('[data-mega-trigger]').forEach(function (t) {
        var li = t.closest('.nav__item') || t.parentElement;
        li.addEventListener('pointerenter', function (e) {
          if (e.pointerType !== 'mouse') return;
          clearTimeout(closeTimer);
          if (current === t) return;
          clearTimeout(openTimer);
          openTimer = setTimeout(function () { open(t); }, current ? 0 : 120);
        });
        li.addEventListener('pointerleave', function (e) {
          if (e.pointerType !== 'mouse') return;
          clearTimeout(openTimer);
          closeTimer = setTimeout(function () { if (current === t) close(); }, 200);
        });
        t.addEventListener('click', function () {
          if (current === t) { if (performance.now() - openedAt > 400) close(); }
          else open(t);
        });
        t.addEventListener('keydown', function (e) {
          if (e.key === 'ArrowDown') { e.preventDefault(); open(t, { focusFirst: true }); }
        });
        li.addEventListener('focusout', function () {
          setTimeout(function () {
            if (current === t && !li.contains(doc.activeElement) && !li.matches(':hover')) close();
          }, 0);
        });
      });
      doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && current) { var t = current; close(); t.focus(); }
      });
      doc.addEventListener('pointerdown', function (e) {
        if (!current) return;
        var li = current.closest('.nav__item');
        if (li && !li.contains(e.target)) close();
      });
    }
    return {
      init: init,
      open: function (name, o) {
        var t = qs('[data-mega-trigger][aria-controls="mega-' + name + '"]');
        if (t) open(t, o);
      },
      close: function () { close(); },
      isOpen: function () { return !!current; }
    };
  })());

  /* brand filter (desktop brands panel and mobile drawer). A-Z buttons filter to one letter. */
  function mountBrandFilter(scope) {
    if (!scope || scope._bsBrands) return;
    scope._bsBrands = true;
    var input = qs('[data-brand-filter]', scope), list = qs('[data-brand-list]', scope), empty = qs('[data-brand-empty]', scope);
    if (!input || !list) return;
    var items = qsa('li[data-brand]', list), groups = qsa('.brand-group', list), az = qsa('[data-az]', scope);
    var letter = null;
    function apply() {
      var q = normalize(input.value.trim());
      var n = 0;
      items.forEach(function (li) {
        var g = li.closest('.brand-group');
        var on = (!q || li.getAttribute('data-brand').indexOf(q) !== -1) && (!letter || g.getAttribute('data-letter') === letter);
        li.hidden = !on;
        if (on) n++;
      });
      groups.forEach(function (g) { g.hidden = !qs('li[data-brand]:not([hidden])', g); });
      az.forEach(function (b) {
        b.classList.toggle('is-active', b.getAttribute('data-az') === letter);
        b.setAttribute('aria-pressed', b.getAttribute('data-az') === letter ? 'true' : 'false');
      });
      if (empty) {
        empty.hidden = n > 0;
        if (!n) empty.textContent = 'Pagal „' + input.value.trim() + '“ prekės ženklo neradome.';
      }
    }
    input.addEventListener('input', debounce(function () { letter = null; apply(); }, 60));
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var first = qs('li[data-brand]:not([hidden]) a', list);
        if (first && first.hasAttribute('data-demo-brand')) demoBrandToast(first.getAttribute('data-demo-brand'));
        else if (first) window.location.href = first.getAttribute('href');
      }
    });
    az.forEach(function (b) {
      b.addEventListener('click', function () {
        var L = b.getAttribute('data-az');
        letter = letter === L ? null : L;
        input.value = '';
        apply();
      });
    });
  }
  function openBrands(opener) {
    if (desktopMQ.matches && qs('#mega-zenklai')) {
      header.hold('brands');
      setTimeout(function () { header.release('brands'); }, 600);
      mega.open('zenklai', { focusFirst: true, focusSelector: '[data-brand-filter]' });
      if (BS.lenis && window.scrollY < 1) BS.lenis.scrollTo(0);
      return;
    }
    var d = doc.getElementById('menu-drawer');
    if (!d) return;
    dialog.open(d, opener);
    var det = qs('[data-mobile-brands]', d);
    if (det) {
      det.open = true;
      setTimeout(function () {
        var f = qs('[data-brand-filter]', det);
        if (f) { f.focus({ preventScroll: true }); det.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
      }, 480);
    }
  }

  /* --------------------------------------------------------------- search */
  var search = (BS.search = (function () {
    var POPULAR = ['Striukės', 'Rankinės', 'Sportiniai bateliai', 'Valentino Bags', 'Norway 1963', 'Coccinelle', 'Džemperiai'];
    var panel, results, statusEl, hdr, inputs = [], index = null, isOpen = false, active = -1, current = null;
    function recentList() { return storage.get(KEYS.searches, []).filter(function (s) { return typeof s === 'string' && s.trim(); }).slice(0, 6); }
    function remember(q) {
      q = String(q || '').trim();
      if (q.length < 2) return;
      var list = recentList().filter(function (s) { return normalize(s) !== normalize(q); });
      list.unshift(q);
      storage.set(KEYS.searches, list.slice(0, 6));
    }
    function buildIndex() {
      return {
        prods: products.map(function (p) {
          return {
            p: p,
            hay: normalize([p.brand, p.title, p.category, p.type, GENDER[p.gender], (p.colors || []).map(function (c) { return c.name; }).join(' ')].join(' ')),
            brand: normalize(p.brand), title: normalize(p.title)
          };
        }),
        brands: (BS.brands || []).map(function (b) { return { b: b, hay: normalize(b.name) }; }),
        cats: categories().map(function (c) { return { c: c, label: normalize(c.label), hay: normalize(c.label + ' ' + c.genderLabel) }; })
      };
    }
    function tokensOf(q) { return normalize(q).split(/[\s,]+/).filter(Boolean); }
    function run(q) {
      index = index || buildIndex();
      var tokens = tokensOf(q);
      var all = function (hay) { return tokens.every(function (t) { return hay.indexOf(t) !== -1; }); };
      var brands = index.brands.filter(function (x) { return all(x.hay); })
        .sort(function (a, b) {
          var sa = a.hay.indexOf(tokens[0]) === 0 ? 0 : 1, sb = b.hay.indexOf(tokens[0]) === 0 ? 0 : 1;
          return sa - sb || (b.b.count || 0) - (a.b.count || 0);
        }).slice(0, 4).map(function (x) { return x.b; });
      var seen = {};
      var cats = index.cats.filter(function (x) {
        return all(x.hay) && tokens.some(function (t) { return x.label.indexOf(t) !== -1; });
      }).sort(function (a, b) {
        var sa = a.label.indexOf(tokens[0]) === 0 ? 0 : 1, sb = b.label.indexOf(tokens[0]) === 0 ? 0 : 1;
        return sa - sb || (b.c.count || 0) - (a.c.count || 0);
      }).filter(function (x) { var k = x.c.slug + x.c.gender; if (seen[k]) return false; seen[k] = 1; return true; })
        .slice(0, 5).map(function (x) { return x.c; });
      var prods = index.prods.filter(function (x) { return all(x.hay); }).map(function (x) {
        var score = 0;
        if (x.brand.indexOf(tokens[0]) === 0) score += 3;
        if (x.title.indexOf(tokens[0]) === 0) score += 2;
        if (x.p.onSale) score += 1;
        return { p: x.p, score: score };
      }).sort(function (a, b) { return b.score - a.score || (b.p.discount || 0) - (a.p.discount || 0); });
      return { tokens: tokens, brands: brands, cats: cats, prods: prods.slice(0, 6).map(function (x) { return x.p; }), total: prods.length };
    }
    function highlight(text, tokens) {
      text = String(text);
      if (!tokens || !tokens.length) return esc(text);
      var chars = Array.from(text), norm = '', owner = [];
      chars.forEach(function (c, i) {
        var n = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        for (var k = 0; k < n.length; k++) { norm += n[k]; owner.push(i); }
      });
      var marked = chars.map(function () { return false; });
      tokens.forEach(function (t) {
        if (!t) return;
        var from = 0, k;
        while ((k = norm.indexOf(t, from)) !== -1) {
          for (var j = k; j < k + t.length; j++) marked[owner[j]] = true;
          from = k + t.length;
        }
      });
      var out = '', open = false;
      chars.forEach(function (c, i) {
        if (marked[i] && !open) { out += '<mark>'; open = true; }
        else if (!marked[i] && open) { out += '</mark>'; open = false; }
        out += esc(c);
      });
      return out + (open ? '</mark>' : '');
    }
    function lev(a, b) {
      var m = a.length, n = b.length;
      if (!m) return n;
      if (!n) return m;
      var prev = [], i, j;
      for (j = 0; j <= n; j++) prev[j] = j;
      for (i = 1; i <= m; i++) {
        var cur = [i];
        for (j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = cur;
      }
      return prev[n];
    }
    function suggest(q) {
      var nq = normalize(q.trim());
      if (nq.length < 3) return null;
      var pool = (BS.brands || []).map(function (b) { return b.name; }).concat(categories().map(function (c) { return c.label; }), POPULAR);
      var best = null, bestD = 99;
      pool.forEach(function (c) {
        var nc = normalize(c);
        var d = Math.min(lev(nq, nc), nc.length > nq.length ? lev(nq, nc.slice(0, nq.length)) + 0.5 : 99);
        if (d < bestD) { bestD = d; best = c; }
      });
      var limit = nq.length >= 6 ? 2 : 1;
      return bestD <= limit ? best : null;
    }
    var optSeq = 0;
    function optId() { return 'sr-opt-' + (++optSeq); }
    function chip(term, iconName) {
      return '<li><button class="chip chip--sm sr-chip" type="button" role="option" id="' + optId() + '" data-search-option data-search-term="' + esc(term) + '">' +
        (iconName ? icon(iconName) : '') + esc(term) + '</button></li>';
    }
    function renderIdle() {
      var rec = recentList();
      var top = (BS.brands || []).filter(function (b) { return b.top; }).sort(function (a, b) { return (b.count || 0) - (a.count || 0); }).slice(0, 8);
      results.setAttribute('role', 'listbox');
      results.setAttribute('aria-label', 'Paieškos pasiūlymai');
      results.innerHTML = '<div class="sr-idle">' +
        '<section class="sr-group" role="group" aria-labelledby="sr-pop"><h3 class="sr-group__title" id="sr-pop">Populiarios paieškos</h3>' +
        '<ul class="chips" role="none">' + POPULAR.map(function (t) { return chip(t, 'trend-up'); }).join('') + '</ul></section>' +
        (rec.length
          ? '<section class="sr-group" role="group" aria-labelledby="sr-rec"><div class="sr-recent-head"><h3 class="sr-group__title" id="sr-rec">Naujausi</h3>' +
            '<button class="sr-clear" type="button" data-search-clear-recent>Išvalyti</button></div>' +
            '<ul class="chips" role="none">' + rec.map(function (t) { return chip(t, 'clock-counter-clockwise'); }).join('') + '</ul></section>'
          : '<section class="sr-group" role="group" aria-labelledby="sr-brands"><h3 class="sr-group__title" id="sr-brands">Populiarūs prekių ženklai</h3>' +
            '<ul class="chips" role="none">' + top.map(function (b) {
              return '<li><a class="chip chip--sm" role="option" id="' + optId() + '" data-search-option href="' + catalog.brandUrl(b.slug) + '">' + esc(b.name) + '</a></li>';
            }).join('') + '</ul></section>') +
        '</div>';
    }
    function renderResults(q) {
      var r = run(q);
      var t = r.tokens;
      var enc = encodeURIComponent(q.trim());
      results.setAttribute('role', 'listbox');
      results.setAttribute('aria-label', 'Paieškos rezultatai');
      if (!r.brands.length && !r.cats.length && !r.prods.length) {
        var s = suggest(q);
        results.innerHTML = '<div class="sr-empty"><p class="sr-empty__title">Pagal „' + esc(q.trim()) + '“ nieko neradome.</p>' +
          (s ? '<p class="text-2">Gal ieškojote <button class="chip chip--sm sr-chip" type="button" role="option" id="' + optId() + '" data-search-option data-search-term="' + esc(s) + '">' + esc(s) + '</button></p>' : '') +
          '<p class="text-2 small">Patikrinkite rašybą arba rinkitės iš populiarių paieškų.</p>' +
          '<ul class="chips" role="none">' + POPULAR.map(function (x) { return chip(x); }).join('') + '</ul></div>';
        status('Nieko neradome');
        return;
      }
      var side = '';
      if (r.brands.length) {
        side += '<section class="sr-group" role="group" aria-labelledby="sr-g-b"><h3 class="sr-group__title" id="sr-g-b">Prekių ženklai</h3><ul class="sr-list" role="none">' +
          r.brands.map(function (b) {
            var demoAttr = catalog.brandCount(b.slug) ? '' : ' data-demo-brand="' + esc(b.name) + '"';
            return '<li role="none"><a class="sr-item" role="option" id="' + optId() + '" data-search-option' + demoAttr + ' href="' + catalog.brandUrl(b.slug) + '"><span>' + highlight(b.name, t) + '</span>' +
              (b.count ? '<span class="sr-item__meta">' + countLabel(b.count, ['prekė', 'prekės', 'prekių']) + '</span>' : '') + '</a></li>';
          }).join('') + '</ul></section>';
      }
      if (r.cats.length) {
        side += '<section class="sr-group" role="group" aria-labelledby="sr-g-c"><h3 class="sr-group__title" id="sr-g-c">Kategorijos</h3><ul class="sr-list" role="none">' +
          r.cats.map(function (c) {
            return '<li role="none"><a class="sr-item" role="option" id="' + optId() + '" data-search-option href="' + c.url + '"><span>' + highlight(c.label, t) + '</span>' +
              '<span class="sr-item__meta">' + esc(c.genderLabel) + (c.count ? ' · ' + formatNumber(c.count) : '') + '</span></a></li>';
          }).join('') + '</ul></section>';
      }
      var prodHTML = r.prods.length ? '<section class="sr-group" role="group" aria-labelledby="sr-g-p"><h3 class="sr-group__title" id="sr-g-p">Prekės</h3><ul class="sr-products" role="none">' +
        r.prods.map(function (p) {
          var url = catalog.url(p);
          var link = url ? 'href="' + url + '"' : 'href="#perziura-' + p.id + '" data-quick-view="' + p.id + '"';
          return '<li role="none"><a class="sr-product" role="option" id="' + optId() + '" data-search-option ' + link + '>' +
            '<span class="sr-product__media media-well"><img class="' + (catalog.isPackshot(p, 0) ? 'packshot' : '') + '" src="' + esc(p.images[0]) + '" alt="" width="800" height="1200" loading="lazy"></span>' +
            '<span class="sr-product__body"><span class="card__brand">' + highlight(p.brand, t) + '</span>' +
            '<span class="sr-product__title">' + highlight(p.title, t) + '</span>' + priceHTML(p).replace(/^<p/, '<span').replace(/<\/p>$/, '</span>') + '</span></a></li>';
        }).join('') + '</ul></section>' : '';
      results.innerHTML = '<div class="sr-grid' + (side && prodHTML ? '' : ' sr-grid--single') + '">' + (side ? '<div class="sr-side">' + side + '</div>' : '') + (prodHTML ? '<div>' + prodHTML + '</div>' : '') + '</div>' +
        '<div class="sr-foot"><span class="small text-3">Paieška veikia ir be lietuviškų raidžių: „rankines“ randa „Rankinės“.</span>' +
        '<a class="btn btn--link" data-search-option role="option" id="' + optId() + '" data-search-all href="parduotuve.html?q=' + enc + '">Rodyti visus rezultatus' + icon('arrow-right', 'btn__arrow') + '</a></div>';
      var parts = [];
      if (r.brands.length) parts.push(countLabel(r.brands.length, ['prekės ženklas', 'prekių ženklai', 'prekių ženklų']));
      if (r.cats.length) parts.push(countLabel(r.cats.length, ['kategorija', 'kategorijos', 'kategorijų']));
      if (r.total) parts.push(countLabel(r.total, ['prekė', 'prekės', 'prekių']));
      status('Rasta: ' + parts.join(', '));
    }
    var statusT;
    function status(msg) { clearTimeout(statusT); statusT = setTimeout(function () { if (statusEl) statusEl.textContent = msg; }, 400); }
    function render() {
      var q = current ? current.value : '';
      inputs.forEach(function (i) { if (i !== current) i.value = q; });
      active = -1;
      setActive(-1);
      if (q.trim().length < 1) renderIdle(); else renderResults(q);
    }
    var renderSoon = debounce(render, 120);
    function options() { return qsa('[data-search-option]', results); }
    function setActive(i) {
      var opts = options();
      opts.forEach(function (o, k) { o.classList.toggle('is-active', k === i); o.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      active = i;
      inputs.forEach(function (inp) {
        if (i >= 0 && opts[i]) inp.setAttribute('aria-activedescendant', opts[i].id);
        else inp.removeAttribute('aria-activedescendant');
      });
      if (i >= 0 && opts[i]) opts[i].scrollIntoView({ block: 'nearest' });
    }
    function open(o) {
      o = o || {};
      if (!panel) return;
      var mobile = !desktopMQ.matches;
      current = mobile ? qs('#search-q-m') : qs('#hdr-q');
      if (!current) current = inputs[0];
      if (o.query != null) current.value = o.query;
      if (!isOpen) {
        if (qs('dialog[open]')) dialog.closeAll({ restoreFocus: false });
        isOpen = true;
        mega.close();
        panel.classList.add('is-open');
        hdr.classList.add('is-search-open');
        if (!mobile) hdr.classList.add('is-panel-open');
        header.hold('search');
        header.sync();
        inputs.forEach(function (i) { i.setAttribute('aria-expanded', 'true'); });
        if (mobile) lockScroll('search');
        render();
      } else if (o.query != null) render();
      if (o.focus !== false && doc.activeElement !== current) {
        try { current.focus({ preventScroll: true }); } catch (e) { current.focus(); }
      }
    }
    function close(o) {
      if (!isOpen) return;
      o = o || {};
      isOpen = false;
      panel.classList.remove('is-open');
      hdr.classList.remove('is-search-open', 'is-panel-open');
      header.release('search');
      header.sync();
      inputs.forEach(function (i) { i.setAttribute('aria-expanded', 'false'); i.removeAttribute('aria-activedescendant'); });
      unlockScroll('search');
      if (o.blur && current) current.blur();
    }
    function init() {
      panel = qs('[data-search-panel]');
      hdr = qs('[data-header]');
      if (!panel || !hdr) return;
      results = qs('[data-search-results]', panel);
      statusEl = qs('[data-search-status]', panel);
      inputs = qsa('[data-search-input]');
      inputs.forEach(function (inp) {
        inp.addEventListener('focus', function () { current = inp; if (!isOpen) open({ focus: false }); });
        inp.addEventListener('click', function () { current = inp; if (!isOpen) open({ focus: false }); });
        inp.addEventListener('input', function () { current = inp; if (!isOpen) open({ focus: false }); renderSoon(); });
        inp.addEventListener('keydown', function (e) {
          var opts = options();
          if (e.key === 'ArrowDown') { e.preventDefault(); if (!isOpen) open(); setActive(opts.length ? (active + 1) % opts.length : -1); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(opts.length ? (active <= 0 ? opts.length - 1 : active - 1) : -1); }
          else if (e.key === 'Enter' && active >= 0 && opts[active]) { e.preventDefault(); opts[active].click(); }
          else if (e.key === 'Escape') { e.preventDefault(); if (inp.value && isOpen) { inp.value = ''; render(); } else close({ blur: true }); }
        });
      });
      qsa('[data-search-form]').forEach(function (f) {
        f.addEventListener('submit', function (e) {
          var inp = qs('[data-search-input]', f);
          var q = inp ? inp.value.trim() : '';
          if (!q) { e.preventDefault(); if (inp) inp.focus(); return; }
          remember(q);
        });
      });
      results.addEventListener('click', function (e) {
        var clr = e.target.closest('[data-search-clear-recent]');
        if (clr) { storage.remove(KEYS.searches); renderIdle(); if (current) current.focus(); return; }
        var term = e.target.closest('[data-search-term]');
        if (term) {
          e.preventDefault();
          current.value = term.getAttribute('data-search-term');
          render();
          current.focus();
          return;
        }
        var opt = e.target.closest('a[data-search-option]');
        if (opt) {
          if (current && current.value.trim()) remember(current.value);
          if (opt.hasAttribute('data-quick-view')) close();
        }
      });
      results.addEventListener('mousemove', function (e) {
        var o = e.target.closest('[data-search-option]');
        if (!o) return;
        var i = options().indexOf(o);
        if (i !== active) setActive(i);
      });
      qsa('[data-search-close]').forEach(function (b) { b.addEventListener('click', function () { close({ blur: true }); }); });
      var scrim = qs('[data-header-scrim]');
      if (scrim) scrim.addEventListener('click', function () { close(); mega.close(); });
      doc.addEventListener('pointerdown', function (e) {
        if (!isOpen || !desktopMQ.matches) return;
        if (panel.contains(e.target) || e.target.closest('[data-search-form]') || e.target.closest('[data-open-search]')) return;
        close();
      });
      doc.addEventListener('focusin', function (e) {
        if (!isOpen) return;
        if (panel.contains(e.target) || e.target.closest('[data-search-form]')) return;
        close();
      });
      desktopMQ.addEventListener('change', function () { if (isOpen) close(); });
    }
    return { init: init, open: open, close: close, isOpen: function () { return isOpen; }, run: run, highlight: highlight, remember: remember, recent: recentList };
  })());

  /* --------------------------------------------------------------- motion */
  var motion = (BS.motion = (function () {
    var io = null;
    function enabled() { return root.classList.contains('motion-ok'); }
    function reveal(el) { el.classList.add('is-in'); }
    function observe(el) {
      if (!enabled() || !io) { reveal(el); return; }
      io.observe(el);
    }
    function ensureIO() {
      if (io || !('IntersectionObserver' in window)) return;
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          if (e.target._bsOnReveal) e.target._bsOnReveal();
          else reveal(e.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    }
    /* split-line headings */
    function wrapWords(el) {
      var words = [], pending = false;
      (function walk(node, chain) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = doc.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { pending = true; frag.appendChild(doc.createTextNode(part)); return; }
              var s = doc.createElement('span');
              s.textContent = part;
              s.style.display = 'inline-block';
              frag.appendChild(s);
              words.push({ el: s, text: part, chain: chain.slice(), space: pending && words.length > 0 });
              pending = false;
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1 && n.tagName === 'BR') {
            pending = true;
          } else if (n.nodeType === 1) {
            walk(n, chain.concat([n]));
          }
        });
      })(el, []);
      return words;
    }
    function doSplit(el, original) {
      el.innerHTML = original;
      var words = wrapWords(el);
      var lines = [], lastTop = null;
      words.forEach(function (w) {
        var top = Math.round(w.el.getBoundingClientRect().top);
        if (lastTop === null || Math.abs(top - lastTop) > 4) { lines.push([]); lastTop = top; }
        lines[lines.length - 1].push(w);
      });
      el.innerHTML = '';
      lines.forEach(function (ws, idx) {
        var line = doc.createElement('span'); line.className = 'split-line';
        var inner = doc.createElement('span'); inner.className = 'split-line__inner';
        inner.style.setProperty('--line', idx);
        line.appendChild(inner);
        var stack = [];
        ws.forEach(function (w, i) {
          var k = 0;
          while (k < stack.length && k < w.chain.length && stack[k].orig === w.chain[k]) k++;
          stack = stack.slice(0, k);
          var parentAt = function (lvl) { return lvl === 0 ? inner : stack[lvl - 1].clone; };
          if (i > 0 && w.space) parentAt(k).appendChild(doc.createTextNode(' '));
          for (var j = k; j < w.chain.length; j++) {
            var c = w.chain[j].cloneNode(false);
            c.removeAttribute('id');
            parentAt(j).appendChild(c);
            stack.push({ orig: w.chain[j], clone: c });
          }
          parentAt(w.chain.length).appendChild(doc.createTextNode(w.text));
        });
        el.appendChild(line);
      });
      return lines.length;
    }
    function split(el) {
      if (el._bsSplit) return;
      el._bsSplit = true;
      if (!enabled()) { el.classList.add('is-split-done', 'is-in'); return; }
      var original = el.innerHTML;
      if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
      var revealed = false, width = 0;
      var fonts = doc.fonts && doc.fonts.ready ? Promise.race([doc.fonts.ready, wait(2500)]) : Promise.resolve();
      fonts.then(function () {
        var n = doSplit(el, original);
        width = el.clientWidth;
        el.classList.add('is-split');
        el._bsOnReveal = function () {
          revealed = true;
          requestAnimationFrame(function () {
            el.classList.add('is-in');
            var delay = parseFloat(getComputedStyle(el).getPropertyValue('--delay')) || 0;
            setTimeout(function () {
              el.innerHTML = original;
              el.classList.remove('is-split');
              el.classList.add('is-split-done');
            }, 1100 + n * 90 + delay + 150);
          });
        };
        if (io) io.observe(el); else el._bsOnReveal();
      });
      window.addEventListener('resize', debounce(function () {
        if (revealed || !el.classList.contains('is-split') || el.clientWidth === width) return;
        width = el.clientWidth;
        doSplit(el, original);
      }, 150));
    }
    function parallax(scope) {
      var M = window.Motion;
      if (!M || !enabled()) return;
      var coarse = !fineMQ.matches;
      qsaSelf('[data-parallax]', scope).forEach(function (el) {
        if (el._bsPx) return;
        el._bsPx = true;
        var f = parseFloat(el.getAttribute('data-parallax'));
        if (!(f > 0)) f = 0.12;
        if (coarse) f *= 0.6;
        el.style.setProperty('--parallax-scale', (1 + f + 0.02).toFixed(3));
        var target = el.closest('[data-parallax-frame]') || el.parentElement;
        var anim = M.animate(el, { y: [(-f * 50).toFixed(2) + '%', (f * 50).toFixed(2) + '%'] }, { ease: 'linear', duration: 1 });
        M.scroll(anim, { target: target, offset: ['start end', 'end start'] });
      });
      qsaSelf('[data-zoom-parallax]', scope).forEach(function (el) {
        if (el._bsZoom) return;
        el._bsZoom = true;
        var z = parseFloat(el.getAttribute('data-zoom-parallax'));
        if (!(z > 1)) z = 1.18;
        var target = el.closest('[data-parallax-frame]') || el.parentElement;
        var anim = M.animate(el, { scale: [z, 1] }, { ease: 'linear', duration: 1 });
        M.scroll(anim, { target: target, offset: ['start end', 'end end'] });
      });
    }
    function counters(scope) {
      qsaSelf('[data-count-to]', scope).forEach(function (el) {
        if (el._bsCount) return;
        el._bsCount = true;
        var to = parseFloat(el.getAttribute('data-count-to'));
        var pre = el.getAttribute('data-count-prefix') || '', suf = el.getAttribute('data-count-suffix') || '';
        var fmt = function (v) { return pre + formatNumber(v) + suf; };
        if (!isFinite(to)) return;
        if (!enabled()) { el.textContent = fmt(to); return; }
        el.textContent = fmt(0);
        el._bsOnReveal = function () {
          var dur = 1800, t0 = performance.now();
          (function frame(now) {
            var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
            el.textContent = fmt(to * e);
            if (k < 1) requestAnimationFrame(frame); else el.textContent = fmt(to);
          })(t0);
        };
        observe(el);
      });
    }
    var UNITS = [['d', 'd.'], ['h', 'val.'], ['m', 'min.'], ['s', 'sek.']];
    function countdowns(scope) {
      qsaSelf('[data-countdown]', scope).forEach(function (el) {
        if (el._bsCd) return;
        el._bsCd = true;
        var target = countdownTarget(el.getAttribute('data-countdown'));
        el.classList.add('countdown');
        if (!qs('[data-unit]', el)) {
          el.innerHTML = UNITS.map(function (u) {
            return '<span class="countdown__unit"><span class="countdown__num" data-unit="' + u[0] + '">00</span><span class="countdown__label">' + u[1] + '</span></span>';
          }).join('');
        }
        el.setAttribute('role', 'timer');
        var nums = {};
        qsa('[data-unit]', el).forEach(function (n) { nums[n.getAttribute('data-unit')] = n; });
        var lastLabel = '';
        var iv = 0;
        function tick() {
          var t = timeLeft(target);
          if (nums.d) nums.d.textContent = t.d;
          if (nums.h) nums.h.textContent = pad(t.h);
          if (nums.m) nums.m.textContent = pad(t.m);
          if (nums.s) nums.s.textContent = pad(t.s);
          var label = 'Liko ' + t.d + ' d. ' + t.h + ' val. ' + t.m + ' min.';
          if (label !== lastLabel) { el.setAttribute('aria-label', label); lastLabel = label; }
          if (t.total <= 0) clearInterval(iv);
        }
        tick();
        iv = setInterval(tick, 1000);
        el._bsTarget = target;
      });
    }
    function marquees(scope) {
      qsaSelf('[data-marquee]', scope).forEach(function (el) {
        if (el._bsMq) return;
        el._bsMq = true;
        el.classList.add('marquee');
        var track = qs('.marquee__track', el), group = track && qs('.marquee__group', track);
        if (!group || !enabled()) return;
        var visible = true;
        function fill() {
          qsa('[data-marquee-clone]', track).forEach(function (c) { c.remove(); });
          var gw = group.getBoundingClientRect().width;
          if (!gw) return;
          var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
          var copies = Math.max(1, Math.ceil(el.clientWidth / (gw + gap)));
          for (var i = 0; i < copies; i++) {
            var c = group.cloneNode(true);
            c.setAttribute('data-marquee-clone', '');
            c.setAttribute('aria-hidden', 'true');
            /* clones must not repeat ids (e.g. a page's #brands-marquee hook) */
            qsaSelf('[id]', c).forEach(function (x) { x.removeAttribute('id'); });
            c.removeAttribute('aria-label');
            qsa('a, button', c).forEach(function (a) { a.tabIndex = -1; });
            track.appendChild(c);
          }
          var speed = parseFloat(el.getAttribute('data-marquee-speed')) || 40;
          el.style.setProperty('--marquee-shift', -(gw + gap) + 'px');
          el.style.setProperty('--marquee-duration', ((gw + gap) / speed).toFixed(2) + 's');
          el.classList.toggle('is-running', visible);
        }
        fill();
        if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fill);
        window.addEventListener('resize', debounce(fill, 200));
        if ('IntersectionObserver' in window) {
          new IntersectionObserver(function (en) { visible = en[0].isIntersecting; el.classList.toggle('is-running', visible); }).observe(el);
        }
      });
    }
    /* <video data-inview-play id="x" muted loop playsinline preload="none" poster="..."> plays only in view and only with motion;
       toggle: <button class="video-toggle" data-video-toggle="x"> */
    function videos(scope) {
      qsaSelf('video[data-inview-play]', scope).forEach(function (v) {
        if (v._bsVid) return;
        v._bsVid = true;
        v.muted = true;
        v.playsInline = true;
        var auto = enabled();
        var userPaused = !auto;
        var toggles = v.id ? qsa('[data-video-toggle="' + v.id + '"]') : [];
        function setUI() {
          var paused = v.paused;
          toggles.forEach(function (b) {
            b.classList.toggle('is-paused', paused);
            b.setAttribute('aria-label', paused ? 'Paleisti vaizdo įrašą' : 'Pristabdyti vaizdo įrašą');
          });
        }
        function play() { var pr = v.play(); if (pr && pr.catch) pr.catch(function () { setUI(); }); }
        if (!auto) { v.removeAttribute('autoplay'); v.pause(); }
        v.addEventListener('play', setUI);
        v.addEventListener('pause', setUI);
        toggles.forEach(function (b) {
          b.addEventListener('click', function () {
            if (v.paused) { userPaused = false; play(); } else { userPaused = true; v.pause(); }
          });
        });
        var inView = false;
        if ('IntersectionObserver' in window) {
          new IntersectionObserver(function (en) {
            inView = en[0].isIntersecting;
            if (inView && !userPaused) play(); else if (!inView && !v.paused) v.pause();
          }, { threshold: 0.15 }).observe(v);
        } else if (auto) play();
        doc.addEventListener('visibilitychange', function () {
          if (doc.hidden) v.pause(); else if (inView && !userPaused) play();
        });
        setUI();
      });
    }
    function scan(scope) {
      scope = scope || doc;
      ensureIO();
      qsaSelf('[data-reveal-stagger]', scope).forEach(function (el) {
        Array.prototype.forEach.call(el.children, function (c, i) { c.style.setProperty('--i', Math.min(i, 14)); });
        if (el._bsObs) return;
        el._bsObs = true;
        if (el.hasAttribute('data-reveal-delay')) el.style.setProperty('--delay', el.getAttribute('data-reveal-delay') + 'ms');
        observe(el);
      });
      qsaSelf('[data-reveal]', scope).forEach(function (el) {
        if (el._bsObs) return;
        el._bsObs = true;
        if (el.hasAttribute('data-reveal-delay')) el.style.setProperty('--delay', el.getAttribute('data-reveal-delay') + 'ms');
        observe(el);
      });
      qsaSelf('[data-split]', scope).forEach(function (el) {
        if (el.hasAttribute('data-reveal-delay')) el.style.setProperty('--delay', el.getAttribute('data-reveal-delay') + 'ms');
        split(el);
      });
      parallax(scope);
      counters(scope);
      countdowns(scope);
      marquees(scope);
      videos(scope);
    }
    /* replay a stagger/reveal (e.g. after a tab re-render) */
    function replay(el) {
      if (!el) return;
      if (el.hasAttribute('data-reveal-stagger')) {
        Array.prototype.forEach.call(el.children, function (c, i) { c.style.setProperty('--i', Math.min(i, 14)); });
      }
      if (!enabled()) { el.classList.add('is-in'); return; }
      el.classList.remove('is-in');
      void el.offsetWidth;
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-in'); }); });
    }
    return { enabled: enabled, scan: scan, replay: replay, reveal: reveal };
  })());

  function initLenis() {
    if (!root.classList.contains('motion-ok') || !window.Lenis || !fineMQ.matches) return;
    try {
      BS.lenis = new window.Lenis({ autoRaf: true, anchors: { offset: -84 }, allowNestedScroll: true, stopInertiaOnNavigate: true });
    } catch (e) { BS.lenis = null; }
  }

  function initRotator() {
    var el = qs('[data-rotator]');
    if (!el) return;
    var msgs = qsa('.announce__msg', el);
    if (msgs.length < 2 || reduceMQ.matches) return;
    var i = 0, paused = false;
    var bar = el.closest('.announce') || el;
    bar.addEventListener('mouseenter', function () { paused = true; });
    bar.addEventListener('mouseleave', function () { paused = false; });
    bar.addEventListener('focusin', function () { paused = true; });
    bar.addEventListener('focusout', function () { paused = false; });
    setInterval(function () {
      if (paused || doc.hidden) return;
      msgs[i].classList.remove('is-active');
      i = (i + 1) % msgs.length;
      msgs[i].classList.add('is-active');
    }, 5000);
  }

  /* --------------------------------------------------------- global clicks */
  function onClick(e) {
    var t = e.target.closest('[data-quick-view],[data-add-to-cart],[data-wishlist],[data-open-cart],[data-open-wishlist],[data-open-menu],[data-open-search],[data-open-brands],[data-demo],[data-demo-brand],[data-dialog-open],[data-dialog-close]');
    if (!t) return;
    if (t.hasAttribute('data-demo-brand')) {
      /* brand with no product in the demo data: say so instead of opening an empty listing (modifier clicks stay native) */
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
      e.preventDefault();
      demoBrandToast(t.getAttribute('data-demo-brand'));
      return;
    }
    if (t.hasAttribute('data-wishlist')) {
      e.preventDefault();
      var on = wishlist.toggle(t.getAttribute('data-wishlist'));
      if (on) { t.classList.remove('is-pop'); void t.offsetWidth; t.classList.add('is-pop'); }
      return;
    }
    if (t.hasAttribute('data-add-to-cart')) {
      e.preventDefault();
      var line = cart.add(t.getAttribute('data-add-to-cart'), t.getAttribute('data-size'), { open: t.getAttribute('data-cart-open') !== 'false', opener: t });
      if (line && t.getAttribute('data-cart-open') === 'false') { t.classList.add('is-done'); setTimeout(function () { t.classList.remove('is-done'); }, 1200); }
      return;
    }
    if (t.hasAttribute('data-quick-view')) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      if (search.isOpen()) search.close();
      var openD = qs('dialog[open]');
      if (openD && openD.id !== 'quick-view') dialog.close(openD, { instant: true });
      quickView(t.getAttribute('data-quick-view'), t);
      return;
    }
    if (t.hasAttribute('data-open-cart')) { e.preventDefault(); cart.open(t); return; }
    if (t.hasAttribute('data-open-wishlist')) { e.preventDefault(); wishlist.open(t); return; }
    if (t.hasAttribute('data-open-menu')) { e.preventDefault(); dialog.open('menu-drawer', t); return; }
    if (t.hasAttribute('data-open-search')) { e.preventDefault(); search.open(); return; }
    if (t.hasAttribute('data-open-brands')) { e.preventDefault(); openBrands(t); return; }
    if (t.hasAttribute('data-demo')) { e.preventDefault(); demoToast(); return; }
    if (t.hasAttribute('data-dialog-open')) { e.preventDefault(); dialog.open(t.getAttribute('data-dialog-open'), t); return; }
    if (t.hasAttribute('data-dialog-close')) { e.preventDefault(); dialog.close(t.closest('dialog')); }
  }
  /* On the listing, remember which filtered URL a product link was opened from. pdp.js reads 'bs-plp-return'
     for its "Atgal į rezultatus" link, because document.referrer is empty on file://. Covers product cards,
     quick view "Visa prekės informacija" and search results alike. */
  function rememberListing(e) {
    if (!/(^|\/)parduotuve\.html$/.test(location.pathname)) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || !/(^|\/)preke-[^\/?#]+\.html(?:[?#]|$)/.test(a.getAttribute('href') || '')) return;
    try { window.sessionStorage.setItem('bs-plp-return', JSON.stringify({ url: location.href, to: a.href, t: Date.now() })); } catch (err) { /* storage blocked */ }
  }
  function onKey(e) {
    if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target) && !qs('dialog[open]')) {
      e.preventDefault();
      search.open();
    }
  }

  /* ------------------------------------------------------------- enhance */
  function enhance(scope) {
    scope = scope || doc;
    qsaSelf('[data-carousel]', scope).forEach(mountCarousel);
    qsaSelf('[data-tabs]', scope).forEach(mountTabs);
    qsaSelf('details.acc', scope).forEach(mountAccordion);
    wishlist.sync(scope);
    motion.scan(scope);
  }

  BS.ui = {
    icon: icon,
    priceHTML: priceHTML,
    badgesHTML: badgesHTML,
    savingsHTML: savingsHTML,
    stockHTML: stockHTML,
    wishButton: wishButton,
    sizeChipsHTML: sizeChipsHTML,
    productCard: productCard,
    renderProducts: renderProducts,
    mountCarousel: mountCarousel,
    mountTabs: mountTabs,
    enhance: enhance,
    toast: toast,
    announce: announce,
    quickView: quickView,
    dialog: dialog,
    openCart: function (opener) { cart.open(opener); },
    openWishlist: function (opener) { wishlist.open(opener); },
    openSearch: function (query) { search.open(query != null ? { query: query } : {}); },
    openMenu: function (opener) { dialog.open('menu-drawer', opener); },
    openBrands: openBrands,
    lockScroll: lockScroll,
    unlockScroll: unlockScroll
  };

  /* ---------------------------------------------------------------- init */
  var readyQueue = [];
  BS.ready = false;
  BS.onReady = function (fn) {
    if (BS.ready) { fn(BS); enhance(doc); } else readyQueue.push(fn);
  };
  var started = false;
  function init() {
    if (started) return;
    started = true;
    if (!window.Motion) root.classList.remove('motion-ok');
    initLenis();
    initDialogs();
    header.init();
    mega.init();
    qsa('[data-brands-panel], [data-mobile-brands]').forEach(mountBrandFilter);
    search.init();
    initRotator();
    cart.init();
    wishlist.init();
    doc.addEventListener('click', onClick);
    doc.addEventListener('click', rememberListing, true);
    doc.addEventListener('auxclick', rememberListing, true);
    doc.addEventListener('keydown', onKey);
    BS.ready = true;
    emit(doc, 'bs:ready', BS);
    readyQueue.splice(0).forEach(function (fn) {
      try { fn(BS); } catch (err) { if (window.console) console.error(err); }
    });
    enhance(doc);
    root.classList.add('bs-ready');
  }
  if (doc.readyState === 'complete') init();
  else {
    doc.addEventListener('DOMContentLoaded', init, { once: true });
    window.addEventListener('load', init, { once: true });
  }
})();
