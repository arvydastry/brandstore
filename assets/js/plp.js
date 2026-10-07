/* ==========================================================================
   Brandstore "Galleria": sale listing (parduotuve.html)
   Instant client-side filtering over BS.collections.plp with live facet counts,
   URL sync (q, lytis, kategorija, zenklas, dydis, spalva, nuolaida, kaina_nuo,
   kaina_iki, rikiuoti) with real history entries, "Rodyti daugiau" paging,
   an honest demo empty state with suggestions and a mobile bottom sheet that
   reuses the same filter markup.
   Uses only the core API (BS.util, BS.catalog, BS.ui, BS.motion, BS.lenis).
   ========================================================================== */
(function () {
  'use strict';
  if (!window.BS || typeof window.BS.onReady !== 'function') return;

  window.BS.onReady(function (BS) {
    var doc = document;
    var u = BS.util, cat = BS.catalog, ui = BS.ui;
    var qs = u.qs, qsa = u.qsa, esc = u.esc, NB = u.NBSP;
    var grid = doc.getElementById('plp-grid');
    var filtersEl = doc.getElementById('plp-filters');
    if (!grid || !filtersEl) return;

    /* ------------------------------------------------------------ data */
    var PAGE = 24;
    var BRAND_LIMIT = 8;
    var META = BS.meta || {};
    var ALL = cat.getMany((BS.collections && BS.collections.plp) || []);
    var PLP_IDS = new Set(ALL.map(function (p) { return p.id; }));
    var ORDER = new Map(ALL.map(function (p, i) { return [p.id, i]; }));
    var SALE_TOTAL = Number(META.onSaleCount) || 0;
    var FORMS = ['prekė', 'prekės', 'prekių'];
    var FORMS_ACC = ['prekę', 'prekes', 'prekių'];
    var LQ = '„', RQ = '“';
    /* every packshot of 171318 carries a printed "REVERSE" caption above the jacket: it reads like
       a broken overlay in the most prominent slot. Model shots (imageBg "model") keep a pure white
       studio background and read as a white tile among the grey wells. Neither opens the grid. */
    var NOT_FIRST_ROW = new Set([171318]);
    function firstRowOk(p) { return !NOT_FIRST_ROW.has(p.id) && p.imageBg !== 'model'; }

    var TYPE_ORDER = ['striukes', 'dzemperiai', 'marskiniai', 'kelnes', 'sukneles', 'sportiniai-bateliai', 'batai', 'rankines', 'pinigines', 'aksesuarai'];
    var TYPE_SHORT = {
      striukes: 'Striukės', dzemperiai: 'Džemperiai', marskiniai: 'Marškiniai', kelnes: 'Kelnės', sukneles: 'Suknelės',
      'sportiniai-bateliai': 'Sportiniai bateliai', batai: 'Batai', rankines: 'Rankinės', pinigines: 'Piniginės', aksesuarai: 'Aksesuarai'
    };
    var TYPE_GROUP = {
      striukes: 'drabuziai', dzemperiai: 'drabuziai', marskiniai: 'drabuziai', kelnes: 'drabuziai', sukneles: 'drabuziai',
      'sportiniai-bateliai': 'avalyne', batai: 'avalyne', rankines: 'aksesuarai', pinigines: 'aksesuarai', aksesuarai: 'aksesuarai'
    };
    var GROUPS = ['drabuziai', 'avalyne', 'aksesuarai'];
    var GROUP_ALL = { drabuziai: 'Visi drabužiai', avalyne: 'Visa avalynė', aksesuarai: 'Visi aksesuarai' };
    ALL.forEach(function (p) { if (p.typeSlug && !TYPE_GROUP[p.typeSlug]) TYPE_GROUP[p.typeSlug] = p.group; });

    function countBy(keyOf) {
      var m = new Map();
      ALL.forEach(function (p) { var k = keyOf(p); m.set(k, (m.get(k) || 0) + 1); });
      return m;
    }
    var typeTotals = countBy(function (p) { return p.typeSlug; });
    var TYPES = TYPE_ORDER.filter(function (t) { return typeTotals.has(t); })
      .concat(Array.from(typeTotals.keys()).filter(function (t) { return t && TYPE_ORDER.indexOf(t) === -1; }));
    var GROUP_TYPES = {};
    GROUPS.forEach(function (g) { GROUP_TYPES[g] = TYPES.filter(function (t) { return TYPE_GROUP[t] === g; }); });
    function isTypeKey(s) { return !!(TYPE_GROUP[s] || (cat.typeLabels && cat.typeLabels[s])); }
    function typeShort(t) { return TYPE_SHORT[t] || (cat.typeLabels && cat.typeLabels[t]) || t; }
    function typeLong(t) { return (cat.typeLabels && cat.typeLabels[t]) || TYPE_SHORT[t] || t; }
    function groupLabel(g) { return (cat.groupLabels && cat.groupLabels[g]) || g; }

    /* nav slugs that stand for a whole column (Drabužiai moterims ...) or a kids column item
       (Avalynė berniukams): those filter by group, every other Woo slug is a leaf category */
    var COLUMN_SLUGS = new Set();
    var KIDS_ITEM_SLUGS = new Set();
    (BS.nav || []).forEach(function (n) {
      (n.columns || []).forEach(function (col) {
        if (col.slug) COLUMN_SLUGS.add(col.slug);
        if (n.slug === 'vaikams') (col.items || []).forEach(function (it) { if (it.slug) KIDS_ITEM_SLUGS.add(it.slug); });
      });
    });

    /* brands present in the sale set: top brands first (by count), then A-Z */
    var brandTotals = countBy(function (p) { return p.brandSlug; });
    var brandNames = {};
    ALL.forEach(function (p) { brandNames[p.brandSlug] = p.brand; });
    function brandName(slug) {
      if (brandNames[slug]) return brandNames[slug];
      var b = cat.brand(slug);
      return b ? b.name : slug;
    }
    var BRANDS = Array.from(brandTotals.keys()).map(function (slug) {
      var b = cat.brand(slug);
      return { key: slug, label: brandNames[slug], top: !!(b && b.top), luxury: !!(b && b.luxury), n: brandTotals.get(slug) };
    }).sort(function (a, b) {
      if (a.top !== b.top) return a.top ? -1 : 1;
      if (a.top && a.n !== b.n) return b.n - a.n;
      return a.label.localeCompare(b.label, 'lt');
    });

    /* sizes, grouped by context. Drabužiai (letters) and Avalynė are the default view,
       the rest sits behind "Visi dydžiai" unless the context calls for it */
    var SIZE_GROUPS = [['drabuziai', 'Drabužiai'], ['dzinsai', 'Džinsai (W/L)'], ['avalyne', 'Avalynė'], ['vaikai', 'Vaikams'], ['vienas', '']];
    var SIZE_PRI = { drabuziai: 0, dzinsai: 1, avalyne: 2, vaikai: 3, vienas: 4 };
    var CLOTH = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL'];
    function sizeGroupOf(p, s) {
      if (s.value === 'UNI') return 'vienas';
      if (p.gender === 'vaikams') return 'vaikai';
      if (p.group === 'avalyne') return 'avalyne';
      if (/^\d+L\d+$/i.test(String(s.value))) return 'dzinsai';
      return 'drabuziai';
    }
    var sizeMap = new Map();
    ALL.forEach(function (p) {
      (p.sizes || []).forEach(function (s) {
        var g = sizeGroupOf(p, s), cur = sizeMap.get(s.value);
        if (!cur) sizeMap.set(s.value, { key: s.value, label: u.sizeLabel(s.label), group: g });
        else if (SIZE_PRI[g] < SIZE_PRI[cur.group]) cur.group = g;
      });
    });
    function sizeRank(z) {
      var v = String(z.key).toUpperCase();
      var ci = CLOTH.indexOf(v);
      if (ci !== -1) return [0, ci];
      var w = v.match(/^(\d+)L(\d+)$/);
      if (w) return [1, Number(w[1]) * 100 + Number(w[2])];
      var a = v.match(/^(\d+)(?:-(\d+))?A$/);
      if (a) return [2, Number(a[1]) + (a[2] ? 0.5 : 0)];
      var n = parseFloat(v);
      if (!isNaN(n)) return [3, n];
      return [4, 0];
    }
    var SIZES = Array.from(sizeMap.values()).sort(function (a, b) {
      var ra = sizeRank(a), rb = sizeRank(b);
      return ra[0] - rb[0] || ra[1] - rb[1];
    });
    var SIZE_LOOKUP = {};
    SIZES.forEach(function (z) {
      SIZE_LOOKUP[String(z.key).toLowerCase()] = z.key;
      SIZE_LOOKUP[z.label.toLowerCase().replace(/\s+/g, '')] = z.key;
    });
    function sizeName(key) { var z = sizeMap.get(key); return z ? z.label : key; }

    /* colours: translated names from the data, canonical swatch per name */
    var SWATCH = {
      juoda: '#1C1C1E', balta: '#F6F5F1', smelio: '#D5C09D', raudona: '#C23E48', melyna: '#46507A',
      'tamsiai-melyna': '#262C44', zalia: '#7B8A63', ruda: '#9C6A42', zydra: '#8FC9D2', rozine: '#E2A0A8',
      garstyciu: '#CFA23A', pilka: '#9C9DA0', kremine: '#EFE7D4', violetine: '#7A5C90', geltona: '#E6C547',
      oranzine: '#E08A3C', bordo: '#6E2532', auksine: '#C9A85A', sidabrine: '#C4C6C9'
    };
    function ckey(name) { return u.normalize(name).trim().replace(/\s+/g, '-'); }
    var colorKeysById = new Map();
    function colorKeys(p) {
      var k = colorKeysById.get(p.id);
      if (!k) {
        k = Array.from(new Set((p.colors || []).map(function (c) { return ckey(c.name); })));
        colorKeysById.set(p.id, k);
      }
      return k;
    }
    var colorMap = new Map();
    ALL.forEach(function (p) {
      (p.colors || []).forEach(function (c) {
        var k = ckey(c.name), cur = colorMap.get(k);
        if (!cur) colorMap.set(k, { key: k, label: c.name, hex: SWATCH[k] || c.hex || '#BDBDB8', n: 1 });
        else cur.n++;
      });
    });
    function isLight(hex) {
      var m = String(hex).replace('#', '');
      if (m.length !== 6) return false;
      var r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 150;
    }
    var COLORS = Array.from(colorMap.values()).sort(function (a, b) { return b.n - a.n || a.label.localeCompare(b.label, 'lt'); });
    function colorName(key) { var c = colorMap.get(key); return c ? c.label : key; }

    /* price bounds and quick ranges */
    var prices = ALL.map(function (p) { return p.price; });
    var P_LO = prices.length ? Math.floor(Math.min.apply(null, prices) / 10) * 10 : 0;
    var P_HI = prices.length ? Math.ceil(Math.max.apply(null, prices) / 10) * 10 : 100;
    if (P_HI <= P_LO) P_HI = P_LO + 10;
    var PRICE_QUICK = [
      { min: null, max: 50, label: 'Iki 50' + NB + '€' },
      { min: 50, max: 100, label: '50-100' + NB + '€' },
      { min: 100, max: 200, label: '100-200' + NB + '€' },
      { min: 200, max: null, label: '200' + NB + '€ ir daugiau' }
    ];
    var DISCS = [30, 50, 70];
    var GENDER_KEYS = ['', 'moterims', 'vyrams', 'vaikams'];
    var KIDS_LABEL = { berniukams: 'Berniukams', mergaitems: 'Mergaitėms' };
    var hasKids = { berniukams: false, mergaitems: false };
    ALL.forEach(function (p) { if (p.kidsGender && hasKids.hasOwnProperty(p.kidsGender)) hasKids[p.kidsGender] = true; });

    var SORTS = {
      nuolaida: 'Didžiausia nuolaida', rekomenduojami: 'Rekomenduojami', naujausi: 'Naujausi',
      'kaina-nuo-maziausios': 'Kaina: nuo mažiausios', 'kaina-nuo-didziausios': 'Kaina: nuo didžiausios'
    };
    function ord(a, b) { return ORDER.get(a.id) - ORDER.get(b.id); }
    function band(p) { return Math.floor((p.discount || 0) / 10); }
    var SORTERS = {
      /* 10 % bands, the curated order inside a band; diversify() then spreads brands */
      nuolaida: function (a, b) { return (band(b) - band(a)) || ord(a, b); },
      rekomenduojami: ord,
      naujausi: function (a, b) { return ((b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)) || (b.id - a.id); },
      'kaina-nuo-maziausios': function (a, b) { return (a.price - b.price) || (b.discount - a.discount) || ord(a, b); },
      'kaina-nuo-didziausios': function (a, b) { return (b.price - a.price) || (b.discount - a.discount) || ord(a, b); }
    };
    /* brand rhythm inside the discount sort: never the same brand twice side by side, at most 2 per
       brand on the first screen (8 cards) and at most 2 in any run of 4 after it, so the order still
       follows the discount bands closely */
    function diversify(list) {
      var rest = list.slice(), out = [];
      while (rest.length) {
        var pick = -1, i, j, seen, p, prev = out[out.length - 1];
        var win = out.length < 8 ? 8 : 4;
        for (i = 0; i < rest.length; i++) {
          p = rest[i];
          if (out.length < 4 && !firstRowOk(p)) continue;
          if (prev && prev.brandSlug === p.brandSlug) continue;
          seen = 0;
          for (j = Math.max(0, out.length - (win - 1)); j < out.length; j++) if (out[j].brandSlug === p.brandSlug) seen++;
          if (seen < 2) { pick = i; break; }
        }
        if (pick < 0) {
          pick = 0;
          if (out.length < 4) for (i = 0; i < rest.length; i++) if (firstRowOk(rest[i])) { pick = i; break; }
        }
        out.push(rest.splice(pick, 1)[0]);
      }
      return out;
    }

    /* search haystack (diacritic-insensitive), for the whole catalogue (fallback suggestions use it too) */
    var HAY = new Map();
    (BS.products || []).forEach(function (p) {
      HAY.set(p.id, u.normalize([
        p.brand, p.title, p.name, p.category, p.type, typeLong(p.typeSlug),
        groupLabel(p.group), cat.genderLabel(p.gender),
        p.kidsGender === 'berniukams' ? 'berniukams berniukai' : p.kidsGender === 'mergaitems' ? 'mergaitems mergaites' : '',
        (p.colors || []).map(function (c) { return c.name; }).join(' '), p.sku || ''
      ].join(' ')));
    });

    /* ----------------------------------------------------------- state */
    function blank() {
      return {
        q: '', gender: '', kids: '', types: new Set(), leaves: new Map(), brands: new Set(), sizes: new Set(), colors: new Set(),
        discount: 0, min: null, max: null, inStock: true, sort: 'nuolaida'
      };
    }
    var state = blank();
    var qTok = [];
    var shown = PAGE;
    var current = [];

    function setGender(v) {
      if (v === 'berniukams' || v === 'mergaitems') { state.gender = 'vaikams'; state.kids = v; }
      else { state.gender = GENDER_KEYS.indexOf(v) > 0 ? v : ''; state.kids = ''; }
    }
    function toggleIn(set, v) { if (set.has(v)) set.delete(v); else set.add(v); }
    function setIn(set, v, on) { if (on) set.add(v); else set.delete(v); }
    /* choosing a type supersedes leaf categories under it (Batai covers Aulinukai, Šlepetės) */
    function addType(t) {
      state.types.add(t);
      state.leaves.forEach(function (l, k) { if (l.typeSlug === t) state.leaves.delete(k); });
    }
    function toggleType(t) { if (state.types.has(t)) state.types.delete(t); else addType(t); }
    function addGroup(g) { (GROUP_TYPES[g] || []).forEach(addType); }
    function num(v) {
      if (v == null || v === '') return null;
      var n = parseFloat(String(v).replace(',', '.'));
      return isFinite(n) && n >= 0 ? Math.round(n) : null;
    }
    function normPrice() {
      if (state.min != null && state.max != null && state.min > state.max) { var t = state.min; state.min = state.max; state.max = t; }
      if (state.min != null && state.min <= P_LO) state.min = null;
      if (state.max != null && state.max >= P_HI) state.max = null;
    }

    function parseURL() {
      var sp;
      try { sp = new URLSearchParams(window.location.search); } catch (e) { return; }
      function list(k) { return (sp.get(k) || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
      state.q = (sp.get('q') || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      var g = u.normalize(sp.get('lytis') || '').trim();
      if (g) setGender(g);
      var hasG = !!state.gender;
      list('kategorija').forEach(function (raw) {
        var slug = raw.toLowerCase();
        if (isTypeKey(slug)) { addType(slug); return; }
        if (GROUP_TYPES[slug]) { addGroup(slug); return; }
        var info = cat.categoryInfo(slug);
        if (!info) return;
        var groupLevel = COLUMN_SLUGS.has(slug) || KIDS_ITEM_SLUGS.has(slug);
        if (groupLevel) {
          if (info.group && GROUP_TYPES[info.group]) addGroup(info.group);
        } else {
          /* a Woo leaf (Šlepetės, Sijonai, Kepurės): keep it, never widen it to the coarse type */
          state.leaves.set(slug, {
            slug: slug, label: info.label, norm: u.normalize(info.label).trim(),
            typeSlug: info.typeSlug || null, group: info.group || (info.typeSlug ? TYPE_GROUP[info.typeSlug] : null) || null
          });
        }
        if (!hasG && info.gender) {
          setGender(info.kidsGender || info.gender);
          hasG = true;
        } else if (state.gender === 'vaikams' && !state.kids && info.kidsGender) {
          state.kids = info.kidsGender;
        }
      });
      list('zenklas').forEach(function (s) { state.brands.add(s.toLowerCase()); });
      list('dydis').forEach(function (s) {
        var k = SIZE_LOOKUP[s.toLowerCase().replace(/\s+/g, '')] || SIZE_LOOKUP[u.sizeLabel(s).toLowerCase().replace(/\s+/g, '')];
        state.sizes.add(k || s);
      });
      list('spalva').forEach(function (s) { state.colors.add(ckey(s)); });
      var d = parseInt(sp.get('nuolaida'), 10);
      if (d > 0 && d < 100) state.discount = d;
      state.min = num(sp.get('kaina_nuo'));
      state.max = num(sp.get('kaina_iki'));
      normPrice();
      if (sp.get('turimos') === '0') state.inStock = false;
      var s = sp.get('rikiuoti');
      if (s && SORTS[s]) state.sort = s;
    }

    function catParam() {
      var arr = TYPES.filter(function (t) { return state.types.has(t); })
        .concat(Array.from(state.types).filter(function (t) { return TYPES.indexOf(t) === -1; }));
      for (var i = 0; i < GROUPS.length; i++) {
        var g = GROUPS[i], gt = GROUP_TYPES[g];
        if (!isTypeKey(g) && gt.length > 1 && arr.length === gt.length && gt.every(function (t) { return state.types.has(t); })) { arr = [g]; break; }
      }
      return arr.concat(Array.from(state.leaves.keys()));
    }
    function query() {
      var p = {};
      if (state.q) p.q = state.q;
      if (state.kids) p.lytis = state.kids; else if (state.gender) p.lytis = state.gender;
      var cats = catParam();
      if (cats.length) p.kategorija = cats;
      if (state.brands.size) p.zenklas = Array.from(state.brands);
      if (state.sizes.size) p.dydis = Array.from(state.sizes);
      if (state.colors.size) p.spalva = Array.from(state.colors);
      if (state.discount) p.nuolaida = state.discount;
      if (state.min != null) p.kaina_nuo = state.min;
      if (state.max != null) p.kaina_iki = state.max;
      if (state.sort !== 'nuolaida') p.rikiuoti = state.sort;
      if (!state.inStock) p.turimos = '0';
      var s = cat.listingUrl(p), i = s.indexOf('?');
      return i === -1 ? '' : s.slice(i).replace(/%2C/gi, ',');
    }
    /* discrete changes push a history entry (Back undoes the last filter), drags and paging replace it */
    var pendingPush = false;
    var writeURL = u.debounce(function () {
      var loc = window.location;
      var url = loc.pathname + query() + loc.hash;
      var push = pendingPush && url !== loc.pathname + loc.search + loc.hash;
      pendingPush = false;
      try {
        if (push) window.history.pushState({ plpShown: shown }, '', url);
        else window.history.replaceState(Object.assign({}, window.history.state || {}, { plpShown: shown }), '', url);
      } catch (e) { /* file:// or sandboxed: ignore */ }
    }, 220);
    function syncURL(mode) {
      if (mode === 'push') pendingPush = true;
      writeURL();
    }

    /* -------------------------------------------------------- matching */
    function tokenize(q) { return q ? u.normalize(q).split(/[\s,.;:!?"„“]+/).filter(Boolean) : []; }
    function leafOk(p, l) {
      return p.wooCategorySlug === l.slug || p.categorySlug === l.slug || u.normalize(p.category || '').trim() === l.norm;
    }
    function catOk(p) {
      if (!state.types.size && !state.leaves.size) return true;
      if (state.types.has(p.typeSlug)) return true;
      var ok = false;
      state.leaves.forEach(function (l) { if (!ok && leafOk(p, l)) ok = true; });
      return ok;
    }
    function sizeOk(p) {
      return (p.sizes || []).some(function (z) { return state.sizes.has(z.value) && (z.available || !state.inStock); });
    }
    function qOk(p) {
      if (!qTok.length) return true;
      var h = HAY.get(p.id) || '';
      for (var i = 0; i < qTok.length; i++) if (h.indexOf(qTok[i]) === -1) return false;
      return true;
    }
    function genderOk(p) {
      if (state.gender && p.gender !== state.gender) return false;
      if (state.kids && p.kidsGender !== state.kids) return false;
      return true;
    }
    function match(p, ex) {
      if (ex !== 'q' && !qOk(p)) return false;
      if (ex !== 'gender' && !genderOk(p)) return false;
      if (ex !== 'type' && !catOk(p)) return false;
      if (ex !== 'brand' && state.brands.size && !state.brands.has(p.brandSlug)) return false;
      if (ex !== 'size' && state.sizes.size && !sizeOk(p)) return false;
      if (ex !== 'color' && state.colors.size && !colorKeys(p).some(function (k) { return state.colors.has(k); })) return false;
      if (ex !== 'disc' && state.discount && (p.discount || 0) < state.discount) return false;
      if (ex !== 'price') {
        if (state.min != null && p.price < state.min) return false;
        if (state.max != null && p.price > state.max) return false;
      }
      if (state.inStock && !(p.sizes || []).some(function (z) { return z.available; })) return false;
      return true;
    }
    function inRange(price, r) { return (r.min == null || price >= r.min) && (r.max == null || price <= r.max); }
    function tally(ex, keysOf) {
      var m = new Map();
      ALL.forEach(function (p) {
        if (!match(p, ex)) return;
        keysOf(p).forEach(function (k) { m.set(k, (m.get(k) || 0) + 1); });
      });
      return m;
    }
    function results() {
      var list = ALL.filter(function (p) { return match(p); }).sort(SORTERS[state.sort] || SORTERS.nuolaida);
      return state.sort === 'nuolaida' ? diversify(list) : list;
    }
    function activeCount() {
      return (state.q ? 1 : 0) + (state.gender ? 1 : 0) + state.types.size + state.leaves.size + state.brands.size + state.sizes.size +
        state.colors.size + (state.discount ? 1 : 0) + (state.min != null || state.max != null ? 1 : 0);
    }
    /* how many items a hypothetical category choice would show, keeping every other filter */
    function countWithCats(types, leaves) {
      var t = state.types, l = state.leaves;
      state.types = new Set(types || []);
      state.leaves = leaves || new Map();
      var n = ALL.filter(function (p) { return match(p); }).length;
      state.types = t; state.leaves = l;
      return n;
    }

    /* ------------------------------------------------- filter markup */
    function accIcon() {
      return '<span class="acc__icon" aria-hidden="true">' + ui.icon('plus', 'acc__plus') + ui.icon('minus', 'acc__minus') + '</span>';
    }
    function groupHTML(key, title, body, open) {
      return '<details class="acc plp-fg" data-fg="' + key + '"' + (open ? ' open' : '') + '>' +
        '<summary class="acc__head"><span class="plp-fg__title">' + title +
        '<span class="plp-fg__sel" data-fg-sel hidden><span class="sr-only">, pasirinkta: </span><span class="plp-badge" data-fg-num></span></span></span>' +
        accIcon() + '</summary><div class="acc__body plp-fg__body">' + body + '</div></details>';
    }
    function checkRow(f, v, label, attrs) {
      return '<li' + (attrs || '') + '><label class="check plp-check"><input type="checkbox" data-f="' + f + '" value="' + esc(v) + '">' +
        '<span class="check__box">' + ui.icon('check') + '</span><span class="plp-check__label">' + esc(label) + '</span>' +
        '<span class="check__count" data-c></span></label></li>';
    }
    function radioRow(v, label, kind) {
      return '<label class="plp-radio plp-radio--' + kind + '"><input type="radio" name="plp-lytis" data-f="gender" value="' + v + '">' +
        '<span class="plp-radio__box" aria-hidden="true"></span><span class="plp-radio__label">' + label + '</span><span class="check__count" data-c></span></label>';
    }

    function buildFilters() {
      var desk = deskMQ.matches;
      var open = function (key, sel) {
        if (desk) return true;
        return key === 'dydis' || key === 'zenklas' || sel > 0;
      };

      var sizesBody = '<div class="plp-sizes-body" id="plp-sizes-body">' + SIZE_GROUPS.map(function (g) {
        var items = SIZES.filter(function (z) { return z.group === g[0]; });
        if (!items.length) return '';
        var id = 'plp-sz-' + g[0];
        return '<div class="plp-sizes__group" data-size-group="' + g[0] + '">' +
          (g[1] ? '<p class="plp-sub" id="' + id + '">' + g[1] + '</p>' : '') +
          '<div class="sizes plp-sizes" role="group" ' + (g[1] ? 'aria-labelledby="' + id + '"' : 'aria-label="Vienas dydis"') + '>' +
          items.map(function (z) {
            return '<button class="size-chip" type="button" data-f="size" data-v="' + esc(z.key) + '" aria-pressed="false">' + esc(z.label) + '</button>';
          }).join('') + '</div></div>';
      }).join('') + '</div>' +
        '<p class="plp-hint" data-plp-size-none hidden>Su pasirinktais filtrais dydžių nėra</p>' +
        '<button class="plp-toggle" type="button" data-plp-size-toggle aria-controls="plp-sizes-body" aria-expanded="false" hidden></button>';

      var extraBrands = Array.from(state.brands).filter(function (s) { return !brandTotals.has(s); })
        .map(function (s) { return { key: s, label: brandName(s), top: false, n: 0 }; });
      var brandList = extraBrands.concat(BRANDS);
      var brandsBody =
        '<div class="search-field search-field--line plp-bsearch"><label class="sr-only" for="plp-bq">Raskite prekės ženklą</label>' +
        ui.icon('magnifying-glass', 'search-field__icon') +
        '<input class="search-field__input" id="plp-bq" type="search" placeholder="Raskite prekės ženklą" autocomplete="off" spellcheck="false" enterkeyhint="search" data-plp-bq></div>' +
        '<ul class="plp-checks" role="list" id="plp-brand-list" data-plp-brands>' +
        brandList.map(function (b) { return checkRow('brand', b.key, b.label, ' data-norm="' + esc(u.normalize(b.label)) + '"'); }).join('') +
        '</ul><p class="plp-hint" data-plp-brand-none hidden>Prekių ženklų nerasta</p>' +
        '<button class="plp-toggle" type="button" data-plp-brand-toggle aria-controls="plp-brand-list" aria-expanded="false" hidden></button>';

      var typesBody = '<ul class="plp-checks plp-leaves" role="list" data-plp-leaves="" hidden></ul>' + GROUPS.map(function (g) {
        var ts = GROUP_TYPES[g];
        if (!ts.length) return '';
        var id = 'plp-tg-' + g;
        return '<div class="plp-tgroup" role="group" aria-labelledby="' + id + '"><p class="plp-sub" id="' + id + '">' + esc(groupLabel(g)) + '</p>' +
          '<ul class="plp-checks" role="list" data-plp-leaves="' + g + '"></ul>' +
          '<ul class="plp-checks" role="list">' + ts.map(function (t) { return checkRow('type', t, typeLong(t)); }).join('') + '</ul></div>';
      }).join('');

      var priceBody =
        '<div class="plp-range" data-plp-range>' +
          '<div class="plp-range__track"><span class="plp-range__fill"></span></div>' +
          '<input class="plp-range__input" type="range" id="plp-pmin" min="' + P_LO + '" max="' + P_HI + '" step="1" value="' + P_LO + '" aria-label="Mažiausia kaina">' +
          '<input class="plp-range__input" type="range" id="plp-pmax" min="' + P_LO + '" max="' + P_HI + '" step="1" value="' + P_HI + '" aria-label="Didžiausia kaina">' +
        '</div>' +
        '<div class="plp-price__fields">' +
          '<label class="plp-price__field"><span class="plp-price__lab" aria-hidden="true">Nuo</span><input type="number" inputmode="numeric" id="plp-pmin-n" min="0" step="1" placeholder="' + P_LO + '" aria-label="Kaina nuo, eurais"><span class="plp-price__cur" aria-hidden="true">€</span></label>' +
          '<span class="plp-price__sep" aria-hidden="true"></span>' +
          '<label class="plp-price__field"><span class="plp-price__lab" aria-hidden="true">Iki</span><input type="number" inputmode="numeric" id="plp-pmax-n" min="0" step="1" placeholder="' + P_HI + '" aria-label="Kaina iki, eurais"><span class="plp-price__cur" aria-hidden="true">€</span></label>' +
        '</div>' +
        '<ul class="chips plp-price__quick" role="list">' + PRICE_QUICK.map(function (r, i) {
          return '<li><button class="chip chip--sm" type="button" data-f="pq" data-v="' + i + '" aria-pressed="false">' + r.label + '<span class="chip__count" data-c></span></button></li>';
        }).join('') + '</ul>';

      var discBody = '<div class="plp-disc" role="group" aria-label="Nuolaida">' + DISCS.map(function (d) {
        return '<button class="plp-disc__tile" type="button" data-f="disc" data-v="' + d + '" aria-pressed="false">' +
          '<span class="plp-disc__num">' + u.discountLabel(d) + '</span><span class="plp-disc__more">ir daugiau</span>' +
          '<span class="plp-disc__count" data-c></span></button>';
      }).join('') + '</div>';

      var colorsBody = '<ul class="plp-colors" role="list">' + COLORS.map(function (c) {
        return '<li><label class="plp-swatch"><input type="checkbox" data-f="color" value="' + esc(c.key) + '">' +
          '<span class="plp-swatch__dot' + (isLight(c.hex) ? ' is-light' : '') + '" style="--sw:' + esc(c.hex) + '">' + ui.icon('check') + '</span>' +
          '<span class="plp-swatch__name">' + esc(c.label) + '</span><span class="plp-swatch__count" data-c></span></label></li>';
      }).join('') + '</ul>';

      /* desktop keeps only the segmented control for gender: the sidebar shows the kids options
         (Vaikams / Berniukams / Mergaitėms) while Vaikams is active. The sheet keeps the full group. */
      var genderBody = '<div class="plp-radios" role="radiogroup" aria-label="Lytis">' +
        radioRow('', 'Visi', 'main') + radioRow('moterims', 'Moterims', 'main') + radioRow('vyrams', 'Vyrams', 'main') + radioRow('vaikams', 'Vaikams', 'kids') +
        (hasKids.berniukams ? radioRow('berniukams', 'Berniukams', 'sub') : '') +
        (hasKids.mergaitems ? radioRow('mergaitems', 'Mergaitėms', 'sub') : '') + '</div>';

      var stockBody = '<div class="plp-stock"><label class="check plp-check"><input type="checkbox" data-f="stock"' + (state.inStock ? ' checked' : '') + '>' +
        '<span class="check__box">' + ui.icon('check') + '</span><span class="plp-check__label">Rodyti tik turimas prekes</span></label></div>';

      filtersEl.innerHTML =
        groupHTML('dydis', 'Dydis', sizesBody, open('dydis', state.sizes.size)) +
        groupHTML('zenklas', 'Prekės ženklas', brandsBody, open('zenklas', state.brands.size)) +
        groupHTML('kategorija', 'Kategorija', typesBody, open('kategorija', state.types.size + state.leaves.size)) +
        groupHTML('kaina', 'Kaina', priceBody, open('kaina', state.min != null || state.max != null ? 1 : 0)) +
        groupHTML('nuolaida', 'Nuolaida', discBody, open('nuolaida', state.discount ? 1 : 0)) +
        groupHTML('spalva', 'Spalva', colorsBody, open('spalva', state.colors.size)) +
        groupHTML('lytis', 'Lytis', genderBody, open('lytis', state.gender ? 1 : 0)) +
        stockBody;
      leafKey = null;
    }
    /* rebuild keeping each group's open state (used when history brings back a brand that has no row) */
    function rebuildFilters() {
      var openMap = {};
      qsa('[data-fg]', filtersEl).forEach(function (d) { openMap[d.getAttribute('data-fg')] = d.open; });
      buildFilters();
      qsa('[data-fg]', filtersEl).forEach(function (d) {
        var k = d.getAttribute('data-fg');
        if (openMap.hasOwnProperty(k)) d.open = openMap[k] || d.open;
      });
      ui.enhance(filtersEl);
    }

    /* category chips (quick row): sorted by how many sale items they hold; a leaf from the
       menu shows as its own pressed chip right after "Visos" */
    var catsList = doc.getElementById('plp-cats');
    var catsWrap = catsList && catsList.parentNode;
    function buildCats() {
      if (!catsList) return;
      var ts = TYPES.slice().sort(function (a, b) { return (typeTotals.get(b) || 0) - (typeTotals.get(a) || 0); });
      catsList.innerHTML = '<li data-cat-all><button class="chip" type="button" data-f="type-all" aria-pressed="false">Visos<span class="chip__count" data-c></span></button></li>' +
        ts.map(function (t) {
          return '<li><button class="chip" type="button" data-f="type" data-v="' + esc(t) + '" aria-pressed="false">' + esc(typeShort(t)) + '<span class="chip__count" data-c></span></button></li>';
        }).join('');
    }
    function catsEdges() {
      if (!catsList || !catsWrap) return;
      var max = catsList.scrollWidth - catsList.clientWidth;
      catsWrap.classList.toggle('is-scrollable', max > 2);
      catsWrap.classList.toggle('is-start', catsList.scrollLeft <= 2);
      catsWrap.classList.toggle('is-end', catsList.scrollLeft >= max - 2);
    }
    /* keep the pressed chip in view inside the horizontal row (never scrolls the page) */
    function revealPressedChip(smooth) {
      if (!catsList || catsList.scrollWidth - catsList.clientWidth <= 2) return;
      var b = qs('button[aria-pressed="true"]', catsList);
      if (!b) return;
      var lr = catsList.getBoundingClientRect(), br = b.getBoundingClientRect();
      var pad = 28, dx = 0;
      if (br.left < lr.left + pad) dx = br.left - lr.left - pad;
      else if (br.right > lr.right - pad) dx = br.right - lr.right + pad;
      if (!dx) return;
      var behavior = smooth && !u.prefersReducedMotion() ? 'smooth' : 'auto';
      try { catsList.scrollBy({ left: dx, behavior: behavior }); } catch (e) { catsList.scrollLeft += dx; }
    }

    /* leaf rows (sidebar) and leaf chips (quick row), re-rendered only when the leaves change */
    var leafKey = null;
    function renderLeaves() {
      var key = Array.from(state.leaves.keys()).join(',');
      if (key === leafKey) return;
      leafKey = key;
      qsa('[data-plp-leaves]', filtersEl).forEach(function (ul) { ul.innerHTML = ''; ul.hidden = true; });
      state.leaves.forEach(function (l) {
        var ul = (l.group && qs('[data-plp-leaves="' + l.group + '"]', filtersEl)) || qs('[data-plp-leaves=""]', filtersEl);
        if (!ul) return;
        ul.insertAdjacentHTML('beforeend', checkRow('leaf', l.slug, l.label, ' class="plp-leaf"'));
        ul.hidden = false;
      });
      if (!catsList) return;
      qsa('[data-cat-leaf]', catsList).forEach(function (li) { li.remove(); });
      var anchor = qs('[data-cat-all]', catsList);
      var html = Array.from(state.leaves.values()).map(function (l) {
        return '<li data-cat-leaf><button class="chip" type="button" data-f="leaf" data-v="' + esc(l.slug) + '" aria-pressed="true">' + esc(l.label) + '<span class="chip__count" data-c></span></button></li>';
      }).join('');
      if (anchor && html) anchor.insertAdjacentHTML('afterend', html);
      /* a leaf named like a type chip (Striukės) takes that chip's place instead of doubling it */
      qsa('button[data-f="type"]', catsList).forEach(function (b) {
        var n = u.normalize(typeShort(b.getAttribute('data-v'))).trim(), dup = false;
        state.leaves.forEach(function (l) { if (l.norm === n) dup = true; });
        b.parentNode.hidden = dup;
      });
    }

    /* --------------------------------------------- facet state + counts */
    function setCount(el, n, formatted) {
      var c = el && qs('[data-c]', el);
      if (c) c.textContent = formatted != null ? formatted : u.formatNumber(n);
    }
    function priceIs(r) { return state.min === r.min && state.max === r.max; }

    function syncFacets() {
      renderLeaves();
      var cType = tally('type', function (p) { return ['*', p.typeSlug]; });
      var cLeaf = tally('type', function (p) {
        var ks = [];
        state.leaves.forEach(function (l, k) { if (leafOk(p, l)) ks.push(k); });
        return ks;
      });
      var cBrand = tally('brand', function (p) { return [p.brandSlug]; });
      var cSize = tally('size', function (p) {
        return Array.from(new Set((p.sizes || []).filter(function (z) { return z.available || !state.inStock; }).map(function (z) { return z.value; })));
      });
      var cColor = tally('color', colorKeys);
      var cGender = tally('gender', function (p) { return ['*', p.gender].concat(p.kidsGender ? [p.kidsGender] : []); });
      var cDisc = tally('disc', function (p) { return DISCS.filter(function (d) { return (p.discount || 0) >= d; }).map(String); });
      var cPrice = tally('price', function (p) {
        return PRICE_QUICK.map(function (r, i) { return inRange(p.price, r) ? 'p' + i : null; }).filter(Boolean);
      });
      var genderSel = state.kids || state.gender;

      qsa('input[data-f]', filtersEl).forEach(function (inp) {
        var f = inp.getAttribute('data-f'), v = inp.value, n = 0, on = false;
        if (f === 'stock') { inp.checked = state.inStock; return; }
        if (f === 'type') { n = cType.get(v) || 0; on = state.types.has(v); }
        else if (f === 'leaf') { n = cLeaf.get(v) || 0; on = state.leaves.has(v); }
        else if (f === 'brand') { n = cBrand.get(v) || 0; on = state.brands.has(v); }
        else if (f === 'color') { n = cColor.get(v) || 0; on = state.colors.has(v); }
        else if (f === 'gender') { n = cGender.get(v || '*') || 0; on = v === genderSel; }
        inp.checked = on;
        inp.disabled = !on && n === 0;
        var lab = inp.closest('label');
        if (lab) { lab.classList.toggle('is-disabled', inp.disabled); setCount(lab, n); }
      });

      var buttons = qsa('button[data-f]', filtersEl).concat(catsList ? qsa('button[data-f]', catsList) : []);
      buttons.forEach(function (b) {
        var f = b.getAttribute('data-f'), v = b.getAttribute('data-v'), n = 0, on = false, label = null;
        if (f === 'size') { n = cSize.get(v) || 0; on = state.sizes.has(v); }
        else if (f === 'type') { n = cType.get(v) || 0; on = state.types.has(v); }
        else if (f === 'leaf') { n = cLeaf.get(v) || 0; on = state.leaves.has(v); }
        else if (f === 'type-all') { n = cType.get('*') || 0; on = state.types.size === 0 && state.leaves.size === 0; }
        else if (f === 'disc') { n = cDisc.get(v) || 0; on = state.discount === Number(v); label = u.countLabel(n, FORMS); }
        else if (f === 'pq') { n = cPrice.get('p' + v) || 0; on = priceIs(PRICE_QUICK[Number(v)]); }
        else return;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.disabled = !on && n === 0;
        if (f === 'size') b.hidden = !on && n === 0;
        setCount(b, n, label);
      });

      syncSizeGroups();

      var sel = {
        dydis: state.sizes.size, zenklas: state.brands.size, kategorija: state.types.size + state.leaves.size,
        kaina: state.min != null || state.max != null ? 1 : 0, nuolaida: state.discount ? 1 : 0,
        spalva: state.colors.size, lytis: state.gender ? 1 : 0
      };
      qsa('[data-fg]', filtersEl).forEach(function (d) {
        var n = sel[d.getAttribute('data-fg')] || 0;
        var wrap = qs('[data-fg-sel]', d);
        if (!wrap) return;
        wrap.hidden = !n;
        qs('[data-fg-num]', wrap).textContent = n;
      });
      filtersEl.classList.toggle('is-kids', state.gender === 'vaikams');

      syncBrandList();
      syncPriceUI();
      syncSeg();
    }

    /* sizes: zero-result chips are hidden; the default view is Drabužiai + Avalynė (+ Vaikams
       when the gender is Vaikams), everything else waits behind "Visi dydžiai (N)" */
    var sizeExpanded = false;
    function syncSizeGroups() {
      var groups = qsa('[data-size-group]', filtersEl);
      if (!groups.length) return;
      var primary = ['drabuziai', 'avalyne'];
      if (state.gender === 'vaikams') primary.push('vaikai');
      var info = groups.map(function (g) {
        var chips = qsa('.size-chip', g);
        return {
          el: g, key: g.getAttribute('data-size-group'),
          live: chips.filter(function (c) { return !c.hidden; }).length,
          pressed: chips.some(function (c) { return c.getAttribute('aria-pressed') === 'true'; })
        };
      });
      var liveTotal = info.reduce(function (s, x) { return s + x.live; }, 0);
      var primaryLive = info.some(function (x) { return x.live && primary.indexOf(x.key) !== -1; });
      var extra = 0;
      info.forEach(function (x) {
        var core = !primaryLive || primary.indexOf(x.key) !== -1 || x.pressed;
        if (x.live && !core) extra++;
        x.el.hidden = !x.live || !(core || sizeExpanded);
      });
      var none = qs('[data-plp-size-none]', filtersEl);
      if (none) none.hidden = liveTotal > 0;
      var tg = qs('[data-plp-size-toggle]', filtersEl);
      if (tg) {
        if (!extra) sizeExpanded = false;
        tg.hidden = !extra;
        tg.setAttribute('aria-expanded', sizeExpanded ? 'true' : 'false');
        tg.textContent = sizeExpanded ? 'Rodyti mažiau' : 'Visi dydžiai (' + liveTotal + ')';
      }
    }

    /* brand list: search + top-8 live brands (checked ones always visible); disabled rows only
       show up while searching */
    var brandExpanded = false, brandQ = '';
    function syncBrandList() {
      var list = qs('[data-plp-brands]', filtersEl);
      if (!list) return;
      var rows = qsa(':scope > li', list);
      var nq = u.normalize(brandQ).trim();
      var matches = 0, live = 0, liveTotal = 0, visible = 0;
      rows.forEach(function (li) { if (!qs('input', li).disabled) liveTotal++; });
      rows.forEach(function (li) {
        var inp = qs('input', li);
        var ok = !nq || (li.getAttribute('data-norm') || '').indexOf(nq) !== -1;
        if (ok) matches++;
        var isLive = !inp.disabled;
        var inTop = isLive && live < BRAND_LIMIT;
        if (isLive) live++;
        li.hidden = !(ok && (nq || inp.checked || inTop || (isLive && brandExpanded)));
        if (!li.hidden) visible++;
      });
      var none = qs('[data-plp-brand-none]', filtersEl);
      if (none) {
        none.hidden = visible > 0;
        none.textContent = nq ? 'Prekių ženklų nerasta' : 'Su pasirinktais filtrais prekių ženklų nėra';
      }
      var tg = qs('[data-plp-brand-toggle]', filtersEl);
      if (tg) {
        if (liveTotal <= BRAND_LIMIT) brandExpanded = false;
        tg.hidden = !!nq || liveTotal <= BRAND_LIMIT;
        tg.setAttribute('aria-expanded', brandExpanded ? 'true' : 'false');
        tg.textContent = brandExpanded ? 'Rodyti mažiau' : 'Rodyti visus (' + liveTotal + ')';
      }
    }

    /* price slider + fields */
    function priceEls() {
      return {
        range: qs('[data-plp-range]', filtersEl), lo: doc.getElementById('plp-pmin'), hi: doc.getElementById('plp-pmax'),
        loN: doc.getElementById('plp-pmin-n'), hiN: doc.getElementById('plp-pmax-n')
      };
    }
    function paintRange(lo, hi) {
      var e = priceEls();
      if (!e.range) return;
      var span = P_HI - P_LO;
      e.range.style.setProperty('--lo', ((lo - P_LO) / span * 100).toFixed(2) + '%');
      e.range.style.setProperty('--hi', ((hi - P_LO) / span * 100).toFixed(2) + '%');
      e.lo.setAttribute('aria-valuetext', u.formatPrice(lo));
      e.hi.setAttribute('aria-valuetext', u.formatPrice(hi));
      e.lo.style.zIndex = lo > P_LO + span / 2 ? 4 : 3;
    }
    function syncPriceUI() {
      var e = priceEls();
      if (!e.range) return;
      var lo = state.min != null ? Math.max(P_LO, Math.min(state.min, P_HI)) : P_LO;
      var hi = state.max != null ? Math.max(P_LO, Math.min(state.max, P_HI)) : P_HI;
      e.lo.value = lo; e.hi.value = hi;
      if (doc.activeElement !== e.loN) e.loN.value = state.min != null ? state.min : '';
      if (doc.activeElement !== e.hiN) e.hiN.value = state.max != null ? state.max : '';
      paintRange(lo, hi);
    }

    /* gender segmented control (core tabs, no panels) */
    var segWrap = doc.getElementById('plp-gender');
    var segApi = null;
    function syncSeg() {
      if (!segApi) return;
      var i = Math.max(0, GENDER_KEYS.indexOf(state.gender));
      if (segApi.index() !== i) segApi.select(i, { emit: false });
    }

    /* ---------------------------------------------------- active chips */
    var activeWrap = qs('[data-plp-active]');
    var activeList = qs('[data-plp-active-list]');
    function priceLabel() {
      if (state.min != null && state.max != null) return u.formatNumber(state.min) + '-' + u.formatPrice(state.max);
      if (state.min != null) return 'Nuo ' + u.formatPrice(state.min);
      return 'Iki ' + u.formatPrice(state.max);
    }
    function activeItems() {
      var a = [];
      if (state.q) a.push({ f: 'q', label: LQ + state.q + RQ, name: 'Paieška ' + state.q });
      if (state.gender) a.push({ f: 'gender', label: state.kids ? KIDS_LABEL[state.kids] : cat.genderLabel(state.gender) });
      var covered = new Set();
      GROUPS.forEach(function (g) {
        var gt = GROUP_TYPES[g];
        if (gt.length > 1 && gt.every(function (t) { return state.types.has(t); })) {
          gt.forEach(function (t) { covered.add(t); });
          a.push({ f: 'group', v: g, label: groupLabel(g) });
        }
      });
      TYPES.concat(Array.from(state.types).filter(function (t) { return TYPES.indexOf(t) === -1; })).forEach(function (t) {
        if (state.types.has(t) && !covered.has(t)) a.push({ f: 'type', v: t, label: typeShort(t) });
      });
      state.leaves.forEach(function (l) { a.push({ f: 'leaf', v: l.slug, label: l.label }); });
      state.brands.forEach(function (b) { a.push({ f: 'brand', v: b, label: brandName(b) }); });
      SIZES.map(function (z) { return z.key; }).concat(Array.from(state.sizes).filter(function (s) { return !sizeMap.has(s); })).forEach(function (s) {
        if (state.sizes.has(s)) a.push({ f: 'size', v: s, label: 'Dydis ' + sizeName(s) });
      });
      state.colors.forEach(function (c) { a.push({ f: 'color', v: c, label: colorName(c) }); });
      if (state.discount) a.push({ f: 'disc', label: u.discountLabel(state.discount) + ' ir daugiau' });
      if (state.min != null || state.max != null) a.push({ f: 'price', label: priceLabel() });
      return a;
    }
    function renderActive() {
      if (!activeWrap || !activeList) return;
      var items = activeItems();
      activeWrap.hidden = !items.length;
      activeList.innerHTML = items.map(function (it) {
        return '<li><button class="chip chip--sm plp-chip" type="button" data-plp-remove="' + it.f + '"' + (it.v != null ? ' data-v="' + esc(it.v) + '"' : '') +
          ' aria-label="Pašalinti filtrą ' + LQ + esc(it.name || it.label) + RQ + '">' + esc(it.label) + ui.icon('x', 'i--xs') + '</button></li>';
      }).join('');
    }
    function removeFilter(f, v) {
      if (f === 'q') { state.q = ''; qTok = []; }
      else if (f === 'gender') setGender('');
      else if (f === 'type') state.types.delete(v);
      else if (f === 'leaf') state.leaves.delete(v);
      else if (f === 'group') (GROUP_TYPES[v] || []).forEach(function (t) { state.types.delete(t); });
      else if (f === 'brand') state.brands.delete(v);
      else if (f === 'size') state.sizes.delete(v);
      else if (f === 'color') state.colors.delete(v);
      else if (f === 'disc') state.discount = 0;
      else if (f === 'price') { state.min = null; state.max = null; }
    }

    /* ------------------------------------------------- counts, labels */
    var sortSel = doc.getElementById('plp-sort');
    function syncCounts(n) {
      var txt = 'Rasta <strong>' + u.formatNumber(n) + '</strong>' + NB + u.plural(n, FORMS);
      qsa('[data-plp-count]').forEach(function (el) { el.innerHTML = txt; });
      qsa('[data-plp-count-short]').forEach(function (el) { el.textContent = u.countLabel(n, FORMS); });
      var a = activeCount();
      qsa('[data-plp-fcount]').forEach(function (el) { el.hidden = !a; el.textContent = a; });
      var fb = qs('[data-plp-open-filters]');
      if (fb) fb.setAttribute('aria-label', 'Filtrai' + (a ? ', pasirinkta: ' + a : '') + '. Rasta ' + u.countLabel(n, FORMS));
      var apply = qs('[data-plp-apply]');
      if (apply) {
        if (n) { apply.textContent = 'Rodyti ' + u.countLabel(n, FORMS_ACC); apply.removeAttribute('aria-disabled'); }
        else { apply.textContent = 'Prekių nerasta'; apply.setAttribute('aria-disabled', 'true'); }
      }
      qsa('.plp-side [data-plp-clear]').forEach(function (b) { b.hidden = !a; });
      var cur = qs('[data-plp-sort-cur]');
      if (cur) cur.textContent = SORTS[state.sort];
      if (sortSel && sortSel.value !== state.sort) sortSel.value = state.sort;
    }
    var moreWrap = qs('[data-plp-more]');
    function syncMore(total) {
      if (!moreWrap) return;
      var s = Math.min(shown, total);
      moreWrap.hidden = total <= PAGE;
      qs('[data-plp-more-text]', moreWrap).textContent = 'Rodoma ' + s + ' iš ' + total;
      qs('[data-plp-more-bar]', moreWrap).style.setProperty('--p', total ? (s / total).toFixed(3) : 0);
      qs('[data-plp-more-btn]', moreWrap).hidden = s >= total;
    }

    /* ------------------------------------------------------------ grid */
    var CARD = { showSavings: true };
    var lastKey = '', lastIds = [];
    function animateIn(els) {
      if (!els.length || !BS.motion.enabled() || !grid.classList.contains('is-in') || !els[0].animate) return;
      els.forEach(function (el, i) {
        el.animate(
          [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }],
          { duration: 620, delay: Math.min(i, 11) * 40, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }
        );
      });
    }
    function renderGrid(list, o) {
      o = o || {};
      if (!list.length) {
        grid.innerHTML = '';
        grid.hidden = true;
        lastKey = ''; lastIds = [];
        renderEmpty();
        return;
      }
      var empty = qs('[data-plp-empty]');
      if (empty && !empty.hidden) { empty.hidden = true; empty.innerHTML = ''; }
      grid.hidden = false;
      var ids = list.slice(0, shown).map(function (p) { return p.id; });
      var key = ids.join(',');
      if (key === lastKey) return;
      var append = o.append && lastIds.length && key.indexOf(lastKey + ',') === 0;
      if (append) {
        var start = lastIds.length;
        grid.insertAdjacentHTML('beforeend', list.slice(start, shown).map(function (p) { return '<li>' + ui.productCard(p, CARD) + '</li>'; }).join(''));
        ui.enhance(grid);
        var fresh = Array.prototype.slice.call(grid.children, start);
        animateIn(fresh);
        var link = fresh[0] && qs('.card__link', fresh[0]);
        if (link && o.focusNew) { try { link.focus({ preventScroll: true }); } catch (e) { link.focus(); } }
      } else {
        ui.renderProducts(grid, ids, Object.assign({ eagerCount: o.initial ? 4 : 0 }, CARD));
        if (!o.initial) animateIn(Array.prototype.slice.call(grid.children));
      }
      lastKey = key; lastIds = ids;
    }

    /* ------------------------------------------------------ empty state */
    function joinNames(arr) {
      if (arr.length < 2) return arr.join('');
      return arr.slice(0, -1).join(', ') + ' ir ' + arr[arr.length - 1];
    }
    function looseMatch(p, keys) {
      if (keys.q && !qOk(p)) return false;
      if (keys.brand && state.brands.size && !state.brands.has(p.brandSlug)) return false;
      if (keys.gender && !genderOk(p)) return false;
      if (keys.type && !catOk(p)) return false;
      if (keys.color && state.colors.size && !colorKeys(p).some(function (k) { return state.colors.has(k); })) return false;
      return true;
    }
    function fallbackList() {
      var pool = (BS.products || []).filter(function (p) { return !PLP_IDS.has(p.id); });
      var levels = [
        { q: 1, brand: 1, gender: 1, type: 1, color: 1 },
        { q: 1, brand: 1, gender: 1, type: 1 },
        { q: 1, brand: 1, type: 1 },
        { q: 1, brand: 1 }
      ];
      for (var i = 0; i < levels.length; i++) {
        var L = levels[i];
        var specific = (L.q && qTok.length) || (L.brand && state.brands.size) || (L.type && (state.types.size || state.leaves.size));
        if (!specific) continue;
        var list = pool.filter(function (p) { return looseMatch(p, L); });
        if (list.length) return list.sort(SORTERS.nuolaida).slice(0, 8);
      }
      return [];
    }
    /* the nearest broader choice for an empty category: a leaf's type, then its group
       (every other filter is kept, so nobody gets boots for slippers without asking) */
    function catParent() {
      var leaf = Array.from(state.leaves.values())[0];
      var t = leaf ? leaf.typeSlug : Array.from(state.types)[0];
      if (leaf && t && TYPES.indexOf(t) !== -1) {
        var n = countWithCats([t]);
        if (n) return { act: 'swap-type:' + t, label: typeShort(t), n: n };
      }
      var g = (leaf && leaf.group) || (t && TYPE_GROUP[t]);
      if (g && GROUP_TYPES[g] && GROUP_TYPES[g].some(function (x) { return !state.types.has(x); })) {
        var m = countWithCats(GROUP_TYPES[g]);
        if (m) return { act: 'swap-group:' + g, label: GROUP_ALL[g] || groupLabel(g), n: m };
      }
      return null;
    }
    function catLabels() {
      return Array.from(state.types).map(typeShort).concat(Array.from(state.leaves.values()).map(function (l) { return l.label; }));
    }
    /* brands in the sale set for a brand missing from the demo: same gender first, then the same tier,
       then top brands by count (the sale set holds no luxury house, so the row is labelled "popular") */
    function similarBrands(missing) {
      var refs = missing.map(function (s) { return cat.brand(s); }).filter(Boolean);
      var luxury = refs.some(function (b) { return !!b.luxury; });
      var genders = new Set();
      if (state.gender) genders.add(state.gender);
      else (BS.products || []).forEach(function (p) { if (missing.indexOf(p.brandSlug) !== -1) genders.add(p.gender); });
      return BRANDS.map(function (b) {
        var mine = ALL.filter(function (p) { return p.brandSlug === b.key; });
        var n = mine.filter(genderOk).length;
        var gFit = !genders.size || mine.some(function (p) { return genders.has(p.gender); });
        return { b: b, n: n, score: (gFit ? 4 : 0) + (b.luxury === luxury ? 2 : 0) + (b.top ? 1 : 0) };
      }).filter(function (x) { return x.n > 0; })
        .sort(function (a, b) { return b.score - a.score || b.n - a.n || a.b.label.localeCompare(b.b.label, 'lt'); })
        .slice(0, 6);
    }
    function suggestChip(act, label, n) {
      return '<li><button class="chip chip--sm" type="button" data-plp-suggest="' + esc(act) + '">' + esc(label) + '<span class="chip__count">' + u.formatNumber(n) + '</span></button></li>';
    }
    function renderEmpty() {
      var empty = qs('[data-plp-empty]');
      if (!empty) return;
      var qText = state.q ? LQ + esc(state.q) + RQ : '';
      var others = activeCount() - (state.q ? 1 : 0);
      var missing = Array.from(state.brands).filter(function (b) { return !brandTotals.has(b); });
      var demoLine = SALE_TOTAL > ALL.length
        ? 'Demonstracinėje versijoje rodoma ' + u.formatNumber(ALL.length) + ' iš ' + u.formatNumber(SALE_TOTAL) + ' išpardavimo prekių.'
        : '';
      var hasCat = state.types.size > 0 || state.leaves.size > 0;
      var catOnlyEmpty = hasCat && !state.q && ALL.filter(function (p) { return genderOk(p) && catOk(p); }).length === 0;
      var brandCase = missing.length && missing.length === state.brands.size && !state.q;
      var title, text, media = '', meta = '', brandRow = '', parent = null, catsLabel = 'Populiariausios kategorijos';

      if (brandCase) {
        /* brands that exist in the store data but have nothing on sale (the luxury houses) vs brands with no demo items at all */
        var inStore = missing.every(function (s) { return cat.brandCount(s) > 0; });
        title = inStore
          ? esc(joinNames(missing.map(brandName))) + ' prekių išpardavime šiuo metu nėra'
          : 'Šiame demonstraciniame pavyzdyje ' + esc(joinNames(missing.map(brandName))) + ' prekių nėra';
        text = demoLine || 'Peržiūrėkite kitus pasiūlymus arba išvalykite filtrus.';
        if (missing.length === 1) {
          var slug = missing[0], b = cat.brand(slug);
          var lg = (BS.brandLogos && BS.brandLogos[slug]) || null;
          var file = (lg && lg.file) || (b && b.logo) || '';
          if (file) {
            media = '<img class="plp-empty__logo" src="' + esc(file) + '" alt="" ' +
              (lg && lg.width ? 'width="' + lg.width + '" height="' + lg.height + '" ' : '') + 'loading="lazy" decoding="async">';
          }
          if (b && b.count) meta = 'Parduotuvėje: ' + u.countLabel(b.count, FORMS);
        }
        var sim = similarBrands(missing);
        if (sim.length) {
          brandRow = '<p class="label plp-empty__label">Populiarūs prekių ženklai išpardavime</p>' +
            '<ul class="chips plp-empty__chips" role="list">' + sim.map(function (x) { return suggestChip('brand:' + x.b.key, x.b.label, x.n); }).join('') + '</ul>';
        }
      } else if (catOnlyEmpty) {
        var labels = catLabels();
        title = 'Šiame demonstraciniame pavyzdyje ' +
          (labels.length === 1 ? 'kategorijos ' + LQ + esc(labels[0]) + RQ : 'pasirinktų kategorijų') + ' prekių nėra';
        text = demoLine || 'Peržiūrėkite artimiausią kategoriją.';
        parent = catParent();
        catsLabel = 'Rinkitės kitą kategoriją';
      } else if (state.q && !others) {
        title = 'Pagal ' + qText + ' nieko neradome';
        text = (demoLine ? demoLine + ' ' : '') + 'Patikrinkite rašybą arba rinkitės iš populiariausių kategorijų.';
      } else if (state.q) {
        title = 'Pagal ' + qText + ' su pasirinktais filtrais nieko neradome';
        text = 'Pašalinkite kelis filtrus arba išvalykite juos visus.';
      } else {
        title = 'Pagal pasirinktus filtrus prekių neradome';
        text = 'Pašalinkite kelis filtrus arba rinkitės iš populiariausių kategorijų.';
        if (hasCat) { parent = catParent(); if (parent) catsLabel = 'Rinkitės kitą kategoriją'; }
      }

      var sugg = [];
      var parentType = parent && parent.act.indexOf('swap-type:') === 0 ? parent.act.slice(10) : null;
      if (parent) sugg.push(suggestChip(parent.act, parent.label, parent.n));
      TYPES.slice().sort(function (a, b) { return (typeTotals.get(b) || 0) - (typeTotals.get(a) || 0); })
        .filter(function (t) { return t !== parentType; }).slice(0, parent ? 3 : 4)
        .forEach(function (t) { sugg.push(suggestChip('type:' + t, typeShort(t), typeTotals.get(t) || 0)); });
      var n50 = ALL.filter(function (p) { return p.discount >= 50; }).length;
      if (n50) sugg.push(suggestChip('disc:50', u.discountLabel(50) + ' ir daugiau', n50));
      var nCheap = ALL.filter(function (p) { return p.price <= 50; }).length;
      if (nCheap) sugg.push(suggestChip('pq:0', PRICE_QUICK[0].label, nCheap));

      var fb = fallbackList();
      var fbTitle = state.brands.size === 1 && !state.q ? esc(brandName(Array.from(state.brands)[0])) + ' prekės parduotuvėje'
        : state.q ? 'Kitos prekės pagal ' + qText : 'Kitos prekės, kurios gali patikti';

      empty.innerHTML =
        '<div class="plp-empty__inner">' + (media || ui.icon('magnifying-glass', 'i--xl plp-empty__icon')) +
          '<h3 class="plp-empty__title">' + title + '</h3><p class="plp-empty__text">' + text + '</p>' +
          (meta ? '<p class="plp-empty__meta">' + esc(meta) + '</p>' : '') +
          '<button class="btn" type="button" data-plp-clear>Išvalyti visus</button>' +
          brandRow +
          '<p class="label plp-empty__label">' + catsLabel + '</p>' +
          '<ul class="chips plp-empty__chips" role="list">' + sugg.join('') + '</ul>' +
        '</div>' +
        (fb.length ? '<div class="plp-fallback"><div class="plp-fallback__head"><h3 class="h3">' + fbTitle + '</h3>' +
          '<p class="plp-fallback__text">Šių prekių išpardavimo sąraše nėra, bet jos gali jus sudominti.</p></div>' +
          '<ul class="product-grid plp-fallback__grid" data-plp-fallback></ul></div>' : '');
      empty.hidden = false;
      var fg = qs('[data-plp-fallback]', empty);
      if (fg) ui.renderProducts(fg, fb, CARD);
      if (BS.motion.enabled() && empty.animate) {
        empty.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    }

    /* ---------------------------------------------- scroll to results */
    var resultsEl = doc.getElementById('plp-results');
    function scrollToResults(force) {
      if (!resultsEl) return;
      var hdr = BS.header && BS.header.el;
      var off = hdr ? hdr.offsetHeight : 0;
      var top = resultsEl.getBoundingClientRect().top;
      if (!force && top >= off - 4) return;
      var y = Math.max(0, window.pageYOffset + top - off - 12);
      if (BS.lenis) BS.lenis.scrollTo(y, { duration: 0.9 });
      else window.scrollTo({ top: y, behavior: u.prefersReducedMotion() ? 'auto' : 'smooth' });
    }

    /* ------------------------------------------------------------ update */
    var sheet = doc.getElementById('plp-sheet');
    var sheetDirty = false;
    var announceCount = u.debounce(function (n) { ui.announce('Rasta ' + u.countLabel(n, FORMS)); }, 650);

    /* page head mirrors the active context, so links from the mega menu, PDP breadcrumbs and brand CTAs
       land on "Striukės vyrams" or "Norway 1963" instead of a generic "Išpardavimas" */
    var headTitle = qs('#plp-title'), headCrumbs = qs('.plp-head .breadcrumbs ol');
    var GENDER_DAT = { moterims: 'moterims', vyrams: 'vyrams', vaikams: 'vaikams', berniukams: 'berniukams', mergaitems: 'mergaitėms' };
    var lastHead = 'Išpardavimas';
    function renderHead() {
      if (!headTitle) return;
      var brands = Array.from(state.brands), cats = catLabels();
      var brand = brands.length === 1 ? brandName(brands[0]) : '';
      var catL = cats.length === 1 ? cats[0] : '';
      var g = GENDER_DAT[state.kids || state.gender] || '';
      var base = brand && catL ? brand + ' ' + catL.toLowerCase() : (brand || catL);
      var label = base ? base + (g ? ' ' + g : '') : (g ? 'Išpardavimas ' + g : 'Išpardavimas');
      if (label === lastHead) return;
      lastHead = label;
      headTitle.textContent = label;
      if (headCrumbs) {
        headCrumbs.innerHTML = '<li><a href="index.html">Pradžia</a></li>' + (label === 'Išpardavimas'
          ? '<li><span aria-current="page">Išpardavimas</span></li>'
          : '<li><a href="parduotuve.html">Išpardavimas</a></li><li><span aria-current="page">' + esc(base ? label : g.charAt(0).toUpperCase() + g.slice(1)) + '</span></li>');
      }
      doc.title = (label === 'Išpardavimas' ? 'Išpardavimas' : label + ' | Išpardavimas') + ' | Brandstore.lt';
    }

    function update(o) {
      o = o || {};
      if (!o.keepPage) shown = PAGE;
      qTok = tokenize(state.q);
      current = results();
      renderHead();
      syncFacets();
      renderActive();
      renderGrid(current, o);
      syncCounts(current.length);
      syncMore(current.length);
      requestAnimationFrame(function () { revealPressedChip(!o.initial); });
      if (o.initial) return;
      announceCount(current.length);
      if (o.fromPop) return;
      syncURL(o.hist || 'push');
      var sheetOpen = sheet && sheet.open;
      if (sheetOpen) sheetDirty = true;
      else if (o.scroll !== false) scrollToResults();
    }

    /* ------------------------------------------------------------ events */
    function onFacetClick(e) {
      var b = e.target.closest('button[data-f]');
      if (!b || b.disabled) return;
      var f = b.getAttribute('data-f'), v = b.getAttribute('data-v');
      if (f === 'size') toggleIn(state.sizes, v);
      else if (f === 'type') toggleType(v);
      else if (f === 'leaf') state.leaves.delete(v);
      else if (f === 'type-all') { state.types.clear(); state.leaves.clear(); }
      else if (f === 'disc') state.discount = state.discount === Number(v) ? 0 : Number(v);
      else if (f === 'pq') {
        var r = PRICE_QUICK[Number(v)];
        if (priceIs(r)) { state.min = null; state.max = null; } else { state.min = r.min; state.max = r.max; }
      } else return;
      update({ scroll: !b.closest('#plp-cats') });
    }
    function onFacetChange(e) {
      var t = e.target;
      if (!t.matches('input[data-f]')) return;
      var f = t.getAttribute('data-f'), v = t.value;
      if (f === 'type') { if (t.checked) addType(v); else state.types.delete(v); }
      else if (f === 'leaf') { if (!t.checked) state.leaves.delete(v); }
      else if (f === 'brand') setIn(state.brands, v, t.checked);
      else if (f === 'color') setIn(state.colors, v, t.checked);
      else if (f === 'gender') { if (t.checked) setGender(v); }
      else if (f === 'stock') state.inStock = t.checked;
      else return;
      update();
    }
    filtersEl.addEventListener('click', onFacetClick);
    filtersEl.addEventListener('change', onFacetChange);
    if (catsList) catsList.addEventListener('click', onFacetClick);

    /* brand search + list toggles */
    filtersEl.addEventListener('input', function (e) {
      if (e.target.matches('[data-plp-bq]')) { brandQ = e.target.value; syncBrandList(); }
    });
    filtersEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !e.target.matches('[data-plp-bq]')) return;
      e.preventDefault();
      var first = qsa('[data-plp-brands] > li:not([hidden]) input', filtersEl).filter(function (i) { return !i.disabled && !i.checked; })[0];
      if (first) { first.checked = true; state.brands.add(first.value); update(); }
    });
    filtersEl.addEventListener('click', function (e) {
      if (e.target.closest('[data-plp-brand-toggle]')) { brandExpanded = !brandExpanded; syncBrandList(); }
      else if (e.target.closest('[data-plp-size-toggle]')) { sizeExpanded = !sizeExpanded; syncSizeGroups(); }
    });

    /* price: slider drags update the fields live and apply after a short pause (history: replace) */
    var applyPrice = u.debounce(function () { update({ hist: 'replace' }); }, 180);
    filtersEl.addEventListener('input', function (e) {
      var t = e.target;
      if (t.id !== 'plp-pmin' && t.id !== 'plp-pmax') return;
      var el = priceEls();
      var lo = Number(el.lo.value), hi = Number(el.hi.value);
      if (lo > hi) { if (t === el.lo) { lo = hi; el.lo.value = lo; } else { hi = lo; el.hi.value = hi; } }
      state.min = lo <= P_LO ? null : lo;
      state.max = hi >= P_HI ? null : hi;
      el.loN.value = state.min != null ? state.min : '';
      el.hiN.value = state.max != null ? state.max : '';
      paintRange(lo, hi);
      applyPrice();
    });
    function commitField(t) {
      var el = priceEls();
      var v = num(t.value);
      if (t === el.loN) state.min = v; else state.max = v;
      normPrice();
      update();
    }
    filtersEl.addEventListener('change', function (e) {
      if (e.target.id === 'plp-pmin-n' || e.target.id === 'plp-pmax-n') commitField(e.target);
    });
    filtersEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.target.id === 'plp-pmin-n' || e.target.id === 'plp-pmax-n')) { e.preventDefault(); commitField(e.target); }
    });

    /* page-level actions */
    var focusAfter = null;
    function resetKeep(keepGender) {
      var s = state.sort, g = state.gender, k = state.kids;
      state = blank();
      state.sort = s;
      if (keepGender) { state.gender = g; state.kids = k; }
    }
    doc.addEventListener('click', function (e) {
      var t = e.target.closest('[data-plp-remove],[data-plp-clear],[data-plp-suggest],[data-plp-more-btn],[data-plp-apply],[data-plp-open-filters],[data-density],[data-plp-skip]');
      if (!t) return;
      if (t.hasAttribute('data-plp-skip')) {
        e.preventDefault();
        e.stopPropagation();
        var h = doc.getElementById('plp-results-title');
        scrollToResults(true);
        if (h) { try { h.focus({ preventScroll: true }); } catch (err) { h.focus(); } }
        return;
      }
      if (t.hasAttribute('data-plp-remove')) {
        var chips = qsa('[data-plp-remove]', activeList);
        var idx = chips.indexOf(t);
        removeFilter(t.getAttribute('data-plp-remove'), t.getAttribute('data-v'));
        update();
        var next = qsa('[data-plp-remove]', activeList);
        focusAfter = next[Math.min(idx, next.length - 1)] || doc.getElementById('plp-results-title');
      } else if (t.hasAttribute('data-plp-clear')) {
        var inSide = !!t.closest('.plp-side');
        resetKeep(false);
        brandQ = '';
        var bq = qs('[data-plp-bq]', filtersEl);
        if (bq) bq.value = '';
        update();
        if (!(sheet && sheet.open)) focusAfter = inSide ? qs('.plp-fg .acc__head', filtersEl) : doc.getElementById('plp-results-title');
      } else if (t.hasAttribute('data-plp-suggest')) {
        var act = t.getAttribute('data-plp-suggest');
        var i = act.indexOf(':'), kind = act.slice(0, i), val = act.slice(i + 1);
        if (kind === 'swap-type') { state.leaves.clear(); state.types.clear(); addType(val); }
        else if (kind === 'swap-group') { state.leaves.clear(); state.types.clear(); addGroup(val); }
        else if (kind === 'brand') { resetKeep(true); state.brands.add(val); }
        else {
          resetKeep(false);
          if (kind === 'type') addType(val);
          else if (kind === 'disc') state.discount = Number(val);
          else if (kind === 'pq') { state.min = PRICE_QUICK[Number(val)].min; state.max = PRICE_QUICK[Number(val)].max; }
        }
        update();
        focusAfter = doc.getElementById('plp-results-title');
      } else if (t.hasAttribute('data-plp-more-btn')) {
        shown += PAGE;
        renderGrid(current, { append: true, focusNew: true });
        syncMore(current.length);
        syncURL('replace');
        ui.announce('Rodoma ' + Math.min(shown, current.length) + ' iš ' + current.length);
        return;
      } else if (t.hasAttribute('data-plp-apply')) {
        if (t.getAttribute('aria-disabled') === 'true') {
          ui.announce('Prekių nerasta. Pakeiskite arba išvalykite filtrus.');
          return;
        }
        sheetDirty = true;
        ui.dialog.close('plp-sheet');
        return;
      } else if (t.hasAttribute('data-plp-open-filters')) {
        place();
        ui.dialog.open('plp-sheet', t);
        return;
      } else if (t.hasAttribute('data-density')) {
        setDensity(Number(t.getAttribute('data-density')));
        return;
      }
      if (focusAfter) {
        var f = focusAfter;
        focusAfter = null;
        requestAnimationFrame(function () { try { f.focus({ preventScroll: true }); } catch (err) { f.focus(); } });
      }
    });

    if (sheet) {
      sheet.addEventListener('bs:dialog-close', function () {
        if (sheetDirty) { sheetDirty = false; setTimeout(scrollToResults, 60); }
      });
      sheet.addEventListener('bs:dialog-open', function () { sheetDirty = false; });
    }

    /* sort */
    if (sortSel) {
      sortSel.addEventListener('change', function () {
        if (!SORTS[sortSel.value]) return;
        state.sort = sortSel.value;
        update();
      });
    }

    /* Back / Forward: restore the filters of that entry */
    window.addEventListener('popstate', function () {
      state = blank();
      parseURL();
      var known = new Set(qsa('[data-plp-brands] input', filtersEl).map(function (i) { return i.value; }));
      if (Array.from(state.brands).some(function (b) { return !known.has(b); })) rebuildFilters();
      var hs = window.history.state;
      shown = hs && hs.plpShown > PAGE ? Math.min(Number(hs.plpShown) || PAGE, 480) : PAGE;
      update({ keepPage: true, fromPop: true, scroll: false });
    });

    /* density: explicit choice persists per viewer (convenience only) */
    var DKEY = 'bs-plp-density';
    var mq1280 = window.matchMedia('(min-width: 1280px)');
    var density = Number(u.storage.get(DKEY, 0));
    if ([2, 3, 4].indexOf(density) === -1) density = 0;
    function applyDensity() {
      if (density) grid.setAttribute('data-cols', String(density)); else grid.removeAttribute('data-cols');
      var eff = density || (mq1280.matches ? 4 : 3);
      qsa('[data-density]').forEach(function (b) { b.setAttribute('aria-pressed', Number(b.getAttribute('data-density')) === eff ? 'true' : 'false'); });
    }
    function setDensity(n) {
      density = n;
      u.storage.set(DKEY, n);
      applyDensity();
      if (BS.motion.enabled() && grid.animate) grid.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 380, easing: 'ease-out' });
    }

    /* filters live in the sidebar on desktop and in the bottom sheet below 1024px */
    var deskMQ = window.matchMedia('(min-width: 1024px)');
    var sideMount = qs('[data-plp-side-mount]');
    var sheetMount = qs('[data-plp-sheet-mount]');
    function place() {
      var target = deskMQ.matches ? sideMount : sheetMount;
      if (target && filtersEl.parentNode !== target) target.appendChild(filtersEl);
      if (deskMQ.matches && sheet && sheet.open) ui.dialog.close('plp-sheet', { instant: true });
    }
    function onMQ(mq, fn) { if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); }

    /* sticky sidebar: fade the bottom edge while more groups wait below */
    var sideInner = qs('.plp-side__inner');
    function sideEdges() {
      if (!sideInner) return;
      var max = sideInner.scrollHeight - sideInner.clientHeight;
      sideInner.classList.toggle('is-scrollable', max > 2);
      sideInner.classList.toggle('is-end', sideInner.scrollTop >= max - 2);
    }

    /* --------------------------------------------------------------- init */
    parseURL();
    qTok = tokenize(state.q);

    /* the lead is written in the page; only correct it if the data says otherwise */
    var maxD = Number(META.maxDiscount) || ALL.reduce(function (m, p) { return Math.max(m, p.discount || 0); }, 0);
    var maxEl = qs('[data-plp-max]');
    if (maxEl && maxD) {
      var lab = u.discountLabel(maxD);
      if (maxEl.textContent !== lab) maxEl.textContent = lab;
    }

    buildFilters();
    buildCats();
    place();
    onMQ(deskMQ, place);
    onMQ(mq1280, applyDensity);
    applyDensity();

    if (segWrap) {
      var gi = Math.max(0, GENDER_KEYS.indexOf(state.gender));
      qsa('[role="tab"]', segWrap).forEach(function (b, i) { b.setAttribute('aria-selected', i === gi ? 'true' : 'false'); });
      segApi = ui.mountTabs(segWrap);
      segWrap.addEventListener('bs:tabchange', function (e) {
        setGender((e.detail && e.detail.value) || '');
        update({ scroll: false });
      });
    }

    if (catsList) {
      catsList.addEventListener('scroll', u.rafThrottle(catsEdges), { passive: true });
      if (window.ResizeObserver) new ResizeObserver(catsEdges).observe(catsList);
      /* a vertical mouse wheel scrolls the row sideways while it overflows (Lenis would take it) */
      catsList.addEventListener('wheel', function (e) {
        var max = catsList.scrollWidth - catsList.clientWidth;
        if (max <= 2 || e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
        var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? catsList.clientWidth : 1);
        var next = Math.max(0, Math.min(max, catsList.scrollLeft + dy));
        if (Math.abs(next - catsList.scrollLeft) < 1) return;
        e.preventDefault();
        e.stopPropagation();
        catsList.scrollLeft = next;
      }, { passive: false });
      catsEdges();
    }

    if (sideInner) {
      sideInner.addEventListener('scroll', u.rafThrottle(sideEdges), { passive: true });
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(sideEdges);
        ro.observe(sideInner);
        ro.observe(filtersEl);
      }
    }

    try {
      var hs = window.history.state;
      if (hs && hs.plpShown > PAGE) shown = Math.min(Number(hs.plpShown) || PAGE, 480);
    } catch (e) { /* ignore */ }
    update({ initial: true, keepPage: true });
    sideEdges();
  });
})();
