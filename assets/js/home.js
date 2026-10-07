/* ==========================================================================
   Brandstore "Galleria": home.js (index.html only)
   Renders every data-driven block of the homepage from window.BS and adds the
   page-specific motion (hero scroll, hotspots). Runs inside BS.onReady, i.e.
   before core's BS.ui.enhance(document), so carousels, tabs, reveals, counters
   and countdowns in the rendered markup are enhanced by core.
   ========================================================================== */
(function () {
  'use strict';
  if (!window.BS || !window.BS.onReady) return;

  window.BS.onReady(function (BS) {
    var u = BS.util, cat = BS.catalog, ui = BS.ui;
    var meta = BS.meta || {}, col = BS.collections || {};
    var qs = u.qs, qsa = u.qsa, esc = u.esc;
    var NBSP = ' ';
    var PRODUCT_FORMS = ['prekė', 'prekės', 'prekių'];

    function safe(name, fn) {
      try { fn(); } catch (err) { if (window.console) console.error('[home] ' + name, err); }
    }
    function countText(n) { return u.countLabel(n, PRODUCT_FORMS); }
    function hideSection(el) { if (el) el.hidden = true; }

    /* ------------------------------------------------------------ meta numbers */
    function syncMeta() {
      var total = Number(meta.totalProducts) || 0;
      var rounded = Math.floor(total / 1000) * 1000;
      var raw = {
        totalRounded: rounded,
        brandsCount: Number(meta.brandsCount) || 0,
        onSaleCount: Number(meta.onSaleCount) || 0,
        returnsDays: Number(meta.returnsDays) || 0,
        maxDiscount: Number(meta.maxDiscount) || 0
      };
      var text = {
        totalRounded: u.formatNumber(raw.totalRounded),
        brandsCount: u.formatNumber(raw.brandsCount),
        onSaleCount: u.formatNumber(raw.onSaleCount),
        returnsDays: String(raw.returnsDays),
        maxDiscount: u.discountLabel(raw.maxDiscount)
      };
      qsa('[data-meta]').forEach(function (el) {
        var k = el.getAttribute('data-meta');
        if (raw[k]) el.textContent = text[k];
      });
      qsa('[data-plural-of]').forEach(function (el) {
        var k = el.getAttribute('data-plural-of'), forms = (el.getAttribute('data-forms') || '').split('|');
        if (raw[k] && forms.length === 3) el.textContent = u.plural(raw[k], forms);
      });
      /* counters read data-count-to when core scans them (after this callback) */
      qsa('[data-count-meta]').forEach(function (el) {
        var k = el.getAttribute('data-count-meta');
        if (!raw[k]) return;
        el.setAttribute('data-count-to', String(raw[k]));
        el.textContent = text[k] + (el.getAttribute('data-count-suffix') || '');
      });
    }

    /* at most 2 products of one brand in any 5 consecutive slides (one desktop view), never two in a row when avoidable.
       Accepts ids or products; it prefers earlier items, so a pre-sorted list keeps its order wherever the brand rule allows. */
    function interleave(ids) {
      var pool = cat.getMany(ids), out = [];
      while (pool.length) {
        var last = out[out.length - 1];
        var recent = out.slice(-4);
        var score = function (p) { return recent.filter(function (q) { return q.brand === p.brand; }).length; };
        var idx = pool.findIndex(function (p) { return (!last || p.brand !== last.brand) && score(p) < 2; });
        if (idx < 0) idx = pool.findIndex(function (p) { return score(p) < 2; });
        if (idx < 0) idx = 0;
        out.push(pool.splice(idx, 1)[0]);
      }
      return out;
    }

    function refreshCarousel(el) {
      if (!el) return;
      ui.enhance(el);
      if (el._bsCarousel) el._bsCarousel.scrollToStart();
    }
    function byDiscount(a, b) { return (b.discount || 0) - (a.discount || 0); }

    /* --------------------------------------------------- one product per block
       The demo holds 92 products, so the homepage blocks are planned together and a product shown in one
       default view is not shown again in another. Fixed blocks first (sale band "Visi", deal, look), then
       category tile images, then the designer cards, then "Ką tik atkeliavo" takes whatever is left. */
    /* curated from BS.products as a SIMILAR look for lookbook.jpg (the photo's own pieces are not in the catalogue);
       hotspot positions from the media manifest (left %, top %) */
    var LOOK = [
      { id: 176590, x: 44, y: 45, name: 'Striukė' },
      { id: 175775, x: 35, y: 67, name: 'Rankinė' },
      { id: 225681, x: 73, y: 89, name: 'Sportbačiai' }
    ];
    /* tile image hints when the curated tile product already sits in another block (keeps the rail's colours varied) */
    var TILE_HINTS = { 'rankines-ir-aksesuarai-moterims': [188274], 'striukes-drabuziai-moterims': [173593] };
    var NI_SHOW = 6, DK_SHOW = 4, DK_MAX = 12;
    var HOUSE_ORDER = ['Gucci', 'Saint Laurent', 'Miu Miu', 'Moncler', 'Jacquemus', 'Stone Island', 'Canada Goose', 'AMI Paris', 'Polo Ralph Lauren'];

    function buildPlan() {
      var products = BS.products || [];
      var newIn = col.newIn || {}, saleTabs = col.saleTabs || {}, tiles = col.categoryTiles || {};
      var firstSale = saleTabs.visi || saleTabs[Object.keys(saleTabs)[0]] || [];
      var inAnySale = new Set();
      Object.keys(saleTabs).forEach(function (k) { (saleTabs[k] || []).forEach(function (id) { inAnySale.add(id); }); });
      var fixed = new Set([].concat(firstSale, [col.deal || (col.dealInfo || {}).id], LOOK.map(function (l) { return l.id; })).filter(Boolean));
      var allNewIn = new Set();
      Object.keys(newIn).forEach(function (k) { (newIn[k] || []).forEach(function (id) { allNewIn.add(id); }); });

      /* 1. category tiles: same Woo category, packshot, not used by another block (tile counts and links stay as curated) */
      var tileImg = {}, usedByTiles = new Set();
      Object.keys(tiles).forEach(function (g) {
        (tiles[g] || []).forEach(function (t) {
          var keep = !fixed.has(t.productId) && !usedByTiles.has(t.productId);
          var pick = null;
          if (!keep) {
            var hints = TILE_HINTS[t.slug] || [];
            var cands = products.filter(function (p) {
              return p.wooCategorySlug === t.slug && p.gender === g && p.id !== t.productId && cat.isPackshot(p, 0) &&
                !fixed.has(p.id) && !allNewIn.has(p.id) && !p.isLuxury && !usedByTiles.has(p.id);
            }).sort(function (a, b) {
              var ha = hints.indexOf(a.id), hb = hints.indexOf(b.id);
              return (ha < 0 ? 99 : ha) - (hb < 0 ? 99 : hb) || (inAnySale.has(a.id) ? 1 : 0) - (inAnySale.has(b.id) ? 1 : 0);
            });
            pick = cands[0] || null;
          }
          var id = pick ? pick.id : t.productId;
          if (pick) tileImg[g + '|' + t.slug] = { productId: pick.id, image: pick.images[0] };
          usedByTiles.add(id);
        });
      });

      /* 2. designer cards: one piece per house, leading houses first, preferring pieces "Ką tik atkeliavo" can spare
         (every luxury item is also a new arrival, so each tab keeps at least NI_SHOW unique products) */
      var taken = new Set([].concat(Array.from(fixed), Array.from(usedByTiles)));
      var lux = products.filter(function (p) { return p.isLuxury; });
      var houseRank = function (p) { var i = HOUSE_ORDER.indexOf(p.brand); return i < 0 ? 99 : i; };
      lux.sort(function (a, b) { return houseRank(a) - houseRank(b); });
      var slack = {};
      Object.keys(newIn).forEach(function (k) {
        slack[k] = (newIn[k] || []).filter(function (id) { return !taken.has(id); }).length - NI_SHOW;
      });
      var tabsOf = function (p) { return Object.keys(newIn).filter(function (k) { return (newIn[k] || []).indexOf(p.id) !== -1; }); };
      var free = function (p) { return tabsOf(p).every(function (k) { return slack[k] > 0; }); };
      var picks = [], houses = [];
      function take(p) { picks.push(p); houses.push(p.brand); tabsOf(p).forEach(function (k) { slack[k]--; }); }
      [true, false].forEach(function (strict) {
        lux.forEach(function (p) {
          if (picks.length >= DK_SHOW || houses.indexOf(p.brand) !== -1 || taken.has(p.id)) return;
          if (strict && !free(p)) return;
          var lastGroup = picks.length ? picks[picks.length - 1].group : null;
          /* prefer another piece of the same house that changes the group */
          var alt = lux.filter(function (q) { return q.brand === p.brand && q.group !== lastGroup && !taken.has(q.id) && (!strict || free(q)); })[0];
          take(alt || p);
        });
      });
      /* alternate bags and ready-to-wear so the row never reads as two bags side by side */
      var bags = picks.filter(function (p) { return p.group === 'aksesuarai'; }), rtw = picks.filter(function (p) { return p.group !== 'aksesuarai'; });
      var dk = [];
      while (bags.length || rtw.length) { if (bags.length) dk.push(bags.shift()); if (rtw.length) dk.push(rtw.shift()); }
      /* "Rodyti daugiau": the remaining luxury pieces, same house order, alternating groups */
      var restB = lux.filter(function (p) { return dk.indexOf(p) === -1 && p.group === 'aksesuarai'; });
      var restR = lux.filter(function (p) { return dk.indexOf(p) === -1 && p.group !== 'aksesuarai'; });
      var more = [];
      while (restB.length || restR.length) { if (restR.length) more.push(restR.shift()); if (restB.length) more.push(restB.shift()); }
      more = more.slice(0, Math.max(0, DK_MAX - dk.length));

      var used = new Set(Array.from(taken));
      dk.forEach(function (p) { used.add(p.id); });
      return { tileImg: tileImg, designers: dk, designersMore: more, used: used };
    }
    var plan = { tileImg: {}, designers: [], designersMore: [], used: new Set() };
    safe('plan', function () { plan = buildPlan(); });

    /* a model photo as the main image reads as a white tile among the grey packshot wells: when image 2 is a
       packshot, show it first and keep the model photo for the hover swap (display copy only, ids unchanged) */
    function packshotFirst(p) {
      if (!p || cat.isPackshot(p, 0) || !p.images || p.images.length < 2 || !cat.isPackshot(p, 1)) return p;
      var imgs = p.images.slice();
      imgs.splice(0, 2, p.images[1], p.images[0]);
      var models = (p.modelImages || [0]).map(function (i) { return i === 0 ? 1 : i === 1 ? 0 : i; });
      if (models.indexOf(1) === -1) models.push(1);
      return Object.assign({}, p, { images: imgs, imageBg: 'white', modelImages: models });
    }

    /* ------------------------------------------------------------------- hero */
    function heroMotion() {
      var M = window.Motion, hero = qs('[data-hero]');
      if (!hero || !M || !M.scroll || !M.animate || !BS.motion.enabled()) return;
      var media = qs('[data-hero-media]', hero), content = qs('[data-hero-content]', hero);
      /* progress 0 at the top of the page, 1 once the hero has scrolled away. Driven from the page scroll
         callback (not a target timeline) so the hero starts at rest whatever timeline Motion picks natively. */
      var anims = [];
      if (media) anims.push(M.animate(media, { scale: [1, 1.14], y: ['0%', '16%'] }, { ease: 'linear', duration: 1 }));
      if (content) anims.push(M.animate(content, { y: [0, -110], opacity: [1, 1, 0] }, { ease: 'linear', duration: 1 }));
      anims.forEach(function (a) { a.pause(); a.time = 0; });
      var height = hero.offsetHeight || 1;
      var last = -1;
      function update(y) {
        var p = Math.min(1, Math.max(0, y / height));
        if (Math.abs(p - last) < 0.0005) return;
        last = p;
        anims.forEach(function (a) { a.time = p; });
      }
      M.scroll(function (progress, info) { update(info && info.y ? info.y.current : window.scrollY); });
      window.addEventListener('resize', u.debounce(function () { height = hero.offsetHeight || 1; last = -1; update(window.scrollY); }, 150));
      update(window.scrollY);
    }

    /* -------------------------------------------------------- category finder */
    function initCats() {
      var track = qs('#cats-track'), tabsEl = qs('#cats-tabs'), carEl = qs('#cats-carousel');
      var tiles = col.categoryTiles || {};
      if (!track || !tiles.moterims) { hideSection(qs('#kategorijos')); return; }
      var cc = meta.categoryCounts || {};
      var navKids = (BS.nav || []).filter(function (n) { return n.slug === 'vaikams'; })[0];
      var totals = {
        moterims: cc.moterims,
        vyrams: cc.vyrams,
        vaikams: navKids && navKids.count ? navKids.count : (cc.berniukams || 0) + (cc.mergaitems || 0)
      };
      var allLabel = { moterims: 'moterims', vyrams: 'vyrams', vaikams: 'vaikams' };

      function tileHTML(t, g) {
        /* the image may come from another product of the same category when the curated one is shown elsewhere */
        var swap = plan.tileImg[g + '|' + t.slug];
        var p = cat.get(swap ? swap.productId : t.productId);
        var packshot = p ? cat.isPackshot(p, 0) : true;
        var href = cat.listingUrl({ lytis: g, kategorija: t.slug });
        return '<li class="carousel__slide"><a class="cat-tile" href="' + esc(href) + '">' +
          '<span class="cat-tile__media"><img' + (packshot ? ' class="packshot"' : '') + ' src="' + esc(swap ? swap.image : t.image) + '" alt="" width="800" height="1200" loading="lazy" decoding="async">' +
          '<span class="cat-tile__arrow" aria-hidden="true">' + ui.icon('arrow-right') + '</span></span>' +
          '<span class="cat-tile__body"><span>' + (t.parent ? '<span class="cat-tile__parent">' + esc(t.parent) + '</span>' : '') +
          '<span class="cat-tile__label">' + esc(t.name) + '</span></span>' +
          (t.count ? '<span class="cat-tile__count">' + countText(t.count) + '</span>' : '') +
          '</span></a></li>';
      }
      function allHTML(g) {
        var n = totals[g];
        return '<li class="carousel__slide"><a class="cat-tile cat-tile--all" href="' + esc(cat.listingUrl({ lytis: g })) + '">' +
          '<span class="cat-tile__media"><span class="cat-tile__big">Visos prekės <em>' + allLabel[g] + '</em></span>' +
          (n ? '<span class="cat-tile__sum">' + countText(n) + '</span>' : '') +
          '<span class="cat-tile__arrow" aria-hidden="true">' + ui.icon('arrow-right') + '</span></span>' +
          '<span class="cat-tile__body"><span class="cat-tile__label">Žiūrėti visas</span></span></a></li>';
      }
      function render(g) {
        var list = tiles[g] || [];
        track.innerHTML = list.map(function (t) { return tileHTML(t, g); }).join('') + allHTML(g);
      }
      render('moterims');
      if (tabsEl) {
        tabsEl.addEventListener('bs:tabchange', function (e) {
          var g = e.detail.value;
          if (!tiles[g]) return;
          render(g);
          refreshCarousel(carEl);
          BS.motion.replay(track);
          ui.announce('Rodomos kategorijos: ' + e.detail.tab.textContent.trim());
        });
      }
    }

    /* -------------------------------------------------------------- sale band */
    function initSale() {
      var tabs = col.saleTabs || {}, labels = col.saleTabLabels || {};
      var list = qs('#sale-tablist'), track = qs('#sale-track'), wrap = qs('#sale-tabs');
      var keys = Object.keys(tabs).filter(function (k) { return tabs[k] && tabs[k].length; });
      if (!track || !keys.length) { hideSection(qs('.sale__shop')); return; }
      list.innerHTML = keys.map(function (k, i) {
        return '<button class="tabs__btn" role="tab" type="button" aria-selected="' + (i === 0) + '" data-value="' + esc(k) + '">' + esc(labels[k] || k) + '</button>';
      }).join('') + '<span class="tabs__ink" aria-hidden="true"></span>';
      /* "Didžiausios nuolaidos": biggest discount first, then the brand rhythm rule */
      function render(k) { ui.renderProducts(track, interleave(cat.getMany(tabs[k]).sort(byDiscount)), { variant: 'on-dark' }); }
      render(keys[0]);
      wrap.addEventListener('bs:tabchange', function (e) {
        if (!tabs[e.detail.value]) return;
        render(e.detail.value);
        refreshCarousel(track.closest('[data-carousel]'));
        BS.motion.replay(track);
        ui.announce('Rodomos išpardavimo prekės: ' + e.detail.tab.textContent.trim() + ', ' + countText(tabs[e.detail.value].length));
      });
    }

    /* ---------------------------------------------------------- deal of month */
    var DEAL_COPY = 'Itališkas stilius, kurio verta laukti visus metus. Šį mėnesį su ypatinga kaina.';
    function initDeal() {
      var root = qs('#deal-root'), info = col.dealInfo || {};
      var p = cat.get(col.deal || info.id);
      if (!root || !p) { hideSection(qs('#menesio-pasiulymas')); return; }
      var imgs = p.images || [];
      var size = (p.sizes && p.sizes[0]) || null;
      var oneSize = !p.sizes || p.sizes.length <= 1;
      var alt = cat.imageAlt(p);
      var brand = cat.brand(p.brandSlug) || {};
      var logo = info.brandLogo || brand.logo;
      var facts = (p.details || []).slice(0, 3).map(function (d) {
        return '<li>' + ui.icon('check', 'i--sm') + '<span>' + esc(u.dashFree(d).replace(/(\d) (%|€)/g, '$1' + NBSP + '$2')) + '</span></li>';
      }).join('');
      var buy = oneSize
        ? '<button class="btn btn--lg" type="button" data-add-to-cart="' + p.id + '" data-size="' + esc(size ? size.value : 'UNI') + '">Į krepšelį</button>'
        : '<button class="btn btn--lg" type="button" data-quick-view="' + p.id + '">Į krepšelį</button>';
      var link = cat.url(p);
      var frameOpen = link
        ? '<a class="deal__frame" href="' + esc(link) + '" aria-label="' + esc(alt) + '">'
        : '<a class="deal__frame" href="#perziura-' + p.id + '" data-quick-view="' + p.id + '" aria-label="Greita peržiūra: ' + esc(alt) + '">';
      root.innerHTML =
        '<div class="deal__media" data-reveal>' +
          frameOpen +
            '<span class="deal__canvas" data-parallax="0.06">' +
              '<img class="deal__img deal__img--main' + (cat.isPackshot(p, 0) ? ' packshot' : '') + '" src="' + esc(imgs[0]) + '" alt="' + esc(alt) + '" width="800" height="1200" loading="lazy" decoding="async">' +
              (imgs[1] ? '<img class="deal__img deal__img--alt' + (cat.isPackshot(p, 1) ? ' packshot' : '') + '" src="' + esc(imgs[1]) + '" alt="" width="800" height="1200" loading="lazy" decoding="async">' : '') +
            '</span>' +
            '<span class="deal__pct" aria-hidden="true">' + u.discountLabel(p) + '</span>' +
          '</a>' +
          ui.wishButton(p, 'icon-btn--solid deal__wish') +
        '</div>' +
        '<div class="deal__info" data-reveal-stagger>' +
          '<p class="deal__label"><span class="badge badge--sale badge--label">' + esc(info.title || 'Mėnesio pasiūlymas') + '</span></p>' +
          (logo ? '<img class="deal__logo" src="' + esc(logo) + '" alt="' + esc(p.brand) + '" height="22" loading="lazy">' : '<p class="card__brand">' + esc(p.brand) + '</p>') +
          '<h2 class="h2 deal__title" id="deal-title"><span class="sr-only">Mėnesio pasiūlymas: ' + esc(p.brand) + ' </span>' + esc(p.title) + '</h2>' +
          '<p class="deal__text">' + DEAL_COPY + '</p>' +
          /* the discount is already the giant outlined numeral on the image: no second badge here */
          '<div class="deal__price"><p class="sr-only">Nuolaida ' + u.discountLabel(p) + '</p>' + ui.priceHTML(p, { size: 'xl' }) + ui.savingsHTML(p) + ui.stockHTML(p) + '</div>' +
          '<div class="deal__timer"><span class="deal__timer-label">' + ui.icon('timer', 'i--sm') + 'Pasiūlymas baigsis po</span><div class="countdown countdown--inline" data-countdown="deal"></div></div>' +
          '<div class="deal__actions">' + buy +
            '<button class="btn btn--ghost btn--lg" type="button" data-quick-view="' + p.id + '">Greita peržiūra</button></div>' +
          (facts ? '<ul class="deal__facts" role="list">' + facts + '</ul>' : '') +
        '</div>';
    }

    /* ----------------------------------------------------------------- brands */
    function initBrands() {
      var brands = (BS.brands || []).slice();
      /* only brands the demo can actually list: a name or logo that opens "Rasta 0 prekių" would contradict its own count */
      var has = new Set((BS.products || []).map(function (p) { return p.brandSlug; }));
      var mq = qs('#brands-marquee');
      if (mq) {
        var names = brands.filter(function (b) { return (b.top || b.luxury) && has.has(b.slug); })
          .sort(function (a, b) { return (b.count || 0) - (a.count || 0); });
        /* alternate luxury houses and best sellers so the band reads as one mix */
        var lux = names.filter(function (b) { return b.luxury; }), rest = names.filter(function (b) { return !b.luxury; });
        var mixed = [];
        while (lux.length || rest.length) { if (rest.length) mixed.push(rest.shift()); if (lux.length) mixed.push(lux.shift()); }
        mq.innerHTML = mixed.map(function (b) {
          return '<li><a href="' + esc(cat.brandUrl(b.slug)) + '">' + esc(b.name) + '</a></li>';
        }).join('');
      }
      var grid = qs('#brands-logos');
      if (grid) {
        var logos = (BS.brandLogos || {});
        var withLogo = brands.filter(function (b) { return b.logo && has.has(b.slug); })
          .sort(function (a, b) { return (b.count || 0) - (a.count || 0); });
        /* the closing "Visi" tile fills the last row: 3 columns from 640px, 2 below */
        var n = withLogo.length;
        var span3 = 3 - (n % 3), span2 = n % 2 ? 1 : 2;
        grid.innerHTML = withLogo.map(function (b) {
          var L = logos[b.slug] || {};
          /* size by the visible mark, not the file: PNGs carry transparent padding, BS.brandLogos[slug].box is the measured ink box.
             Height falls softly with width (exponent .5 = equal area), wide wordmarks are capped at 168px of ink */
          var W = L.width || 300, H = L.height || 100;
          var box = L.box || { w: W - 38, h: H - 38 };
          var cw = Math.max(1, box.w), ch = Math.max(1, box.h), cr = cw / ch;
          var hc = Math.max(14, Math.min(40, 48 / Math.sqrt(cr)));
          var wc = Math.min(168, hc * cr);
          var w = Math.round(wc * W / cw);
          return '<li><a class="logo-tile" href="' + esc(cat.brandUrl(b.slug)) + '">' +
            '<img src="' + esc(b.logo) + '" alt="' + esc(b.name) + '"' + (L.width ? ' width="' + L.width + '" height="' + L.height + '"' : '') + ' style="width:' + w + 'px" loading="lazy" decoding="async">' +
            (b.count ? '<span class="logo-tile__count">' + countText(b.count) + '</span>' : '<span class="logo-tile__count">' + esc(b.name) + '</span>') +
            '</a></li>';
        }).join('') +
        '<li class="logo-grid__all" style="--span-3:' + span3 + ';--span-2:' + span2 + '"><button class="logo-tile logo-tile--all" type="button" data-open-brands aria-controls="mega-zenklai">' +
          '<span class="logo-tile__big">Visi ' + u.countLabel(meta.brandsCount || brands.length, ['prekės ženklas', 'prekių ženklai', 'prekių ženklų']) + '</span>' +
          '<span class="logo-tile__count">A-Z sąrašas ' + ui.icon('arrow-right', 'i--sm') + '</span></button></li>';
      }
      initBrandFinder(brands);
    }

    function initBrandFinder(brands) {
      var form = qs('[data-bfind]'), input = qs('#bfind-input'), list = qs('#bfind-list'), status = qs('#bfind-status');
      if (!form || !input || !list) return;
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-expanded', 'false');
      input.setAttribute('aria-controls', 'bfind-list');
      input.setAttribute('aria-autocomplete', 'list');
      var index = brands.map(function (b) { return { b: b, n: u.normalize(b.name) }; });
      var top = brands.filter(function (b) { return b.top; }).sort(function (a, b) { return (b.count || 0) - (a.count || 0); }).slice(0, 6);
      var results = [], active = -1;

      function match(q) {
        var n = u.normalize(q).trim();
        if (!n) return [];
        var starts = [], inside = [];
        index.forEach(function (x) {
          var words = x.n.split(/[\s.&-]+/);
          if (x.n.indexOf(n) === 0 || words.some(function (w) { return w.indexOf(n) === 0; })) starts.push(x.b);
          else if (x.n.indexOf(n) !== -1) inside.push(x.b);
        });
        var sorter = function (a, b) { return (b.count || 0) - (a.count || 0); };
        return starts.sort(sorter).concat(inside.sort(sorter)).slice(0, 6);
      }
      function optHTML(b, i, tokens) {
        var name = tokens ? BS.search.highlight(b.name, tokens) : esc(b.name);
        return '<li class="bfind__opt" role="option" id="bfind-opt-' + i + '" aria-selected="false" data-index="' + i + '">' +
          '<span>' + name + '</span>' + (b.count ? '<span class="bfind__opt-count">' + countText(b.count) + '</span>' : '') + '</li>';
      }
      function open(items, head, tokens) {
        results = items; active = -1;
        input.removeAttribute('aria-activedescendant');
        if (!items.length) {
          list.innerHTML = '<li class="bfind__empty" role="presentation">Tokio prekės ženklo neradome. Paspauskite Enter ir ieškosime tarp visų prekių.</li>';
        } else {
          list.innerHTML = (head ? '<li class="bfind__head" role="presentation">' + head + '</li>' : '') + items.map(function (b, i) { return optHTML(b, i, tokens); }).join('');
        }
        list.hidden = false;
        input.setAttribute('aria-expanded', 'true');
      }
      function close() {
        list.hidden = true; active = -1;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
      }
      function setActive(i) {
        var opts = qsa('.bfind__opt', list);
        if (!opts.length) return;
        active = (i + opts.length) % opts.length;
        opts.forEach(function (o, k) { o.classList.toggle('is-active', k === active); o.setAttribute('aria-selected', k === active ? 'true' : 'false'); });
        input.setAttribute('aria-activedescendant', opts[active].id);
        opts[active].scrollIntoView({ block: 'nearest' });
      }
      function go(b) { if (b) window.location.href = cat.brandUrl(b.slug); }
      var update = u.debounce(function () {
        var q = input.value;
        if (!q.trim()) { open(top, 'Populiariausi'); status.textContent = ''; return; }
        var r = match(q);
        open(r, '', u.normalize(q).split(/\s+/).filter(Boolean));
        status.textContent = r.length ? 'Rasta prekių ženklų: ' + r.length : 'Prekių ženklų nerasta';
      }, 80);

      input.addEventListener('input', update);
      input.addEventListener('focus', function () { if (!input.value.trim()) open(top, 'Populiariausi'); else update(); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) update(); else setActive(active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
        else if (e.key === 'Escape') { if (!list.hidden) { e.preventDefault(); e.stopPropagation(); close(); } }
        else if (e.key === 'Enter') {
          if (active >= 0 && results[active]) { e.preventDefault(); go(results[active]); }
          else if (input.value.trim() && results.length && !list.hidden && u.normalize(results[0].name).indexOf(u.normalize(input.value.trim())) !== -1) { e.preventDefault(); go(results[0]); }
        }
      });
      list.addEventListener('mousedown', function (e) { e.preventDefault(); });
      list.addEventListener('click', function (e) {
        var o = e.target.closest('.bfind__opt');
        if (o) go(results[Number(o.getAttribute('data-index'))]);
      });
      list.addEventListener('mousemove', function (e) {
        var o = e.target.closest('.bfind__opt');
        if (o && Number(o.getAttribute('data-index')) !== active) setActive(Number(o.getAttribute('data-index')));
      });
      input.addEventListener('blur', function () { setTimeout(close, 120); });
      form.addEventListener('submit', function (e) {
        var q = input.value.trim();
        if (!q) { e.preventDefault(); input.focus(); return; }
        var r = match(q);
        if (r.length) { e.preventDefault(); go(r[0]); }
        /* otherwise the native GET goes to parduotuve.html?q=... */
      });
    }

    /* ------------------------------------------------------ designer collection */
    function initDesigners() {
      var lux = (BS.products || []).filter(function (p) { return p.isLuxury; });
      var grid = qs('#dk-grid'), line = qs('#dk-line');
      if (!lux.length || !plan.designers.length) { hideSection(qs('.designers__products')); return; }
      var houses = [];
      lux.forEach(function (p) { if (houses.indexOf(p.brand) === -1) houses.push(p.brand); });
      houses.sort(function (a, b) {
        var ia = HOUSE_ORDER.indexOf(a), ib = HOUSE_ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
      if (line) {
        var named = houses.slice(0, 4);
        line.textContent = named.join(', ') + (houses.length > named.length ? ' ir kiti.' : '.') + ' Kiekviena prekė originali.';
      }
      ui.renderProducts(grid, plan.designers, {});

      /* note: real catalogue size of the luxury houses (Store API counts in BS.brands), new information rather than
         a second "original" claim */
      var note = qs('#dk-note'), noteText = qs('#dk-note-text');
      var luxTotal = (BS.brands || []).reduce(function (n, b) { return n + (b.luxury && b.count ? b.count : 0); }, 0);
      if (note && noteText && luxTotal) {
        noteText.textContent = 'Kataloge ' + u.countLabel(luxTotal, ['prabangos mados namų prekė', 'prabangos mados namų prekės', 'prabangos mados namų prekių']);
        note.hidden = false;
      }

      /* "Rodyti daugiau": the demo has no collection page, so the rest of the luxury pieces open in place */
      var more = qs('#dk-more');
      if (!more || !plan.designersMore.length) return;
      more.hidden = false;
      more.addEventListener('click', function () {
        if (more.getAttribute('aria-expanded') === 'true') return;
        var first = grid.children.length;
        grid.insertAdjacentHTML('beforeend', plan.designersMore.map(function (p, i) {
          return '<li data-reveal data-reveal-delay="' + Math.min(i, 7) * 60 + '">' + ui.productCard(p, {}) + '</li>';
        }).join(''));
        ui.enhance(grid);
        if (BS.wishlist && BS.wishlist.sync) BS.wishlist.sync(grid);
        /* stagger index restarts at the first new card (enhance re-numbers every child) */
        Array.prototype.slice.call(grid.children, first).forEach(function (li) { li.style.setProperty('--i', 0); });
        more.setAttribute('aria-expanded', 'true');
        more.hidden = true;
        ui.announce('Parodyta dar ' + countText(plan.designersMore.length));
        var link = grid.children[first] && qs('.card__link', grid.children[first]);
        if (link) link.focus();
      });
    }

    /* ------------------------------------------------------------- hero video
       8 MB clip: phones keep the LCP poster only. Runs before core binds video[data-inview-play]. */
    function heroVideoMobile() {
      if (!window.matchMedia('(max-width: 767.98px)').matches) return;
      var v = qs('#hero-video');
      if (!v) return;
      v.removeAttribute('data-inview-play');
      v.removeAttribute('autoplay');
      qsa('[data-video-toggle="hero-video"]').forEach(function (b) { b.hidden = true; });
    }

    /* ------------------------------------------------------------- Jai / Jam
       At rest the giant word sits where the link row will appear; the row wraps to one or two lines depending
       on the panel width, so its real height drives the offset and both words share one bottom margin. */
    function initGenderPanels() {
      var panels = qsa('.gpanel');
      if (!panels.length) return;
      function measure(panel) {
        var links = qs('.gpanel__links', panel);
        if (links) panel.style.setProperty('--links-h', links.offsetHeight + 'px');
      }
      panels.forEach(measure);
      if ('ResizeObserver' in window) {
        var ro = new ResizeObserver(function (entries) {
          entries.forEach(function (en) { var p = en.target.closest('.gpanel'); if (p) measure(p); });
        });
        panels.forEach(function (p) { var l = qs('.gpanel__links', p); if (l) ro.observe(l); });
      }
    }

    /* ----------------------------------------------------------------- kids row */
    function initKids() {
      var cc = meta.categoryCounts || {};
      qsa('[data-kids-count]').forEach(function (el) {
        var n = cc[el.getAttribute('data-kids-count')];
        el.textContent = n ? countText(n) : '';
      });
    }

    /* ------------------------------------------------------------------ new in */
    var NI_TILES = {
      moterims: {
        img: 'assets/media/outerwear.jpg', pos: '52% 62%',
        alt: 'Vyras smėlio spalvos ir moteris konjako spalvos paltu eina rudenine miesto gatve',
        title: 'Paltai ir striukės', text: 'Šiltos rudens spalvos ir klasikiniai kirpimai moterims.',
        cta: 'Žiūrėti striukes', params: { lytis: 'moterims', kategorija: 'striukes-drabuziai-moterims' },
        all: { lytis: 'moterims', rikiuoti: 'naujausi' }
      },
      vyrams: {
        img: 'assets/media/outerwear.jpg', pos: '36% 62%',
        alt: 'Vyras smėlio spalvos ir moteris konjako spalvos paltu eina rudenine miesto gatve',
        title: 'Paltai ir striukės', text: 'Rudens sluoksniai vyrams: nuo lengvų striukių iki pūkinių parkų.',
        cta: 'Žiūrėti striukes', params: { lytis: 'vyrams', kategorija: 'striukes-drabuziai' },
        all: { lytis: 'vyrams', rikiuoti: 'naujausi' }
      },
      aksesuarai: {
        img: 'assets/media/accessories.jpg', pos: '50% 55%',
        alt: 'Moteris juodu paltu laiko rudą odinę rankinę su atvartu',
        title: 'Rankinės ir aksesuarai', text: 'Odinės rankinės ir piniginės, kurios užbaigia įvaizdį.',
        cta: 'Žiūrėti rankines', params: { lytis: 'moterims', kategorija: 'rankines-ir-aksesuarai-moterims' },
        all: { kategorija: 'aksesuarai', rikiuoti: 'naujausi' }
      }
    };
    function initNewIn() {
      var newIn = col.newIn || {};
      var grid = qs('#ni-grid'), tabsEl = qs('#ni-tabs'), tile = qs('#ni-tile'), all = qs('#ni-all');
      if (!grid || !newIn.moterims) { hideSection(qs('#naujienos')); return; }
      var img = qs('#ni-tile-img'), title = qs('#ni-tile-title'), text = qs('#ni-tile-text'), cta = qs('#ni-tile-cta');
      var swapT = 0;
      function setTile(k, animate) {
        var t = NI_TILES[k];
        if (!t || !tile) return;
        var apply = function () {
          if (img.getAttribute('src') !== t.img) img.setAttribute('src', t.img);
          img.alt = t.alt;
          img.style.objectPosition = t.pos;
          if (t.img.indexOf('accessories') !== -1) { img.width = 1067; img.height = 1600; } else { img.width = 2200; img.height = 1464; }
          title.textContent = t.title; text.textContent = t.text; cta.textContent = t.cta;
          tile.href = cat.listingUrl(t.params);
          tile.classList.toggle('ni-tile--street', t.img.indexOf('outerwear') !== -1);
          if (all) all.href = cat.listingUrl(t.all);
        };
        clearTimeout(swapT);
        if (animate && BS.motion.enabled()) {
          tile.classList.add('is-swapping');
          swapT = setTimeout(function () { apply(); requestAnimationFrame(function () { tile.classList.remove('is-swapping'); }); }, 320);
        } else apply();
      }
      /* products already shown elsewhere on the page go last (used only if fewer than six remain); within each set
         native packshots first, then model-first products shown packshot-first, then model-only shots, so the
         wells read as one surface */
      function pick(k) {
        var list = cat.getMany(newIn[k] || []);
        var order = function (arr) {
          var shown = arr.map(packshotFirst);
          return shown.filter(function (p, i) { return cat.isPackshot(arr[i], 0); })
            .concat(shown.filter(function (p, i) { return !cat.isPackshot(arr[i], 0) && cat.isPackshot(p, 0); }))
            .concat(shown.filter(function (p) { return !cat.isPackshot(p, 0); }));
        };
        var fresh = list.filter(function (p) { return !plan.used.has(p.id); });
        var seen = list.filter(function (p) { return plan.used.has(p.id); });
        return order(fresh).concat(order(seen)).slice(0, NI_SHOW);
      }
      function render(k) { ui.renderProducts(grid, pick(k), {}); }
      render('moterims');
      setTile('moterims', false);
      if (tabsEl) {
        tabsEl.addEventListener('bs:tabchange', function (e) {
          var k = e.detail.value;
          if (!newIn[k]) return;
          render(k);
          setTile(k, true);
          BS.motion.replay(grid);
          ui.announce('Rodomos naujienos: ' + e.detail.tab.textContent.trim());
        });
      }
    }

    /* ----------------------------------------------------------- shop the look */
    /* LOOK (similar pieces, not the photographed ones) is defined with the page plan above */
    function firstSize(p) {
      var s = (p.sizes || []).filter(function (x) { return x.available; })[0];
      return s || null;
    }
    function initLook() {
      var canvas = qs('#look-canvas'), listEl = qs('#look-list'), totalEl = qs('#look-total');
      var items = LOOK.map(function (l) { var p = cat.get(l.id); return p ? Object.assign({ p: p }, l) : null; }).filter(Boolean);
      if (!canvas || items.length < 2) { hideSection(qs('#ivaizdis')); return; }

      function media(p, cls) {
        var pack = cat.isPackshot(p, 0);
        return '<span class="' + cls + '"><img' + (pack ? ' class="packshot"' : '') + ' src="' + esc(p.images[0]) + '" alt="" width="800" height="1200" loading="lazy" decoding="async"></span>';
      }
      function linkAttrs(p) {
        var url = cat.url(p);
        return url ? 'href="' + esc(url) + '"' : 'href="#perziura-' + p.id + '" data-quick-view="' + p.id + '"';
      }

      var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      /* touch: keep the photo still so taps land exactly on the markers (core reads data-parallax after this callback) */
      if (!finePointer) canvas.removeAttribute('data-parallax');
      /* hotspots + popovers inside the parallax canvas so they move with the photo */
      canvas.insertAdjacentHTML('beforeend', items.map(function (it, i) {
        var p = it.p, n = i + 1;
        var side = it.x > 55 ? 'left' : 'right';
        var v = it.y > 74 ? 'up' : 'mid';
        var one = !p.sizes || p.sizes.length <= 1;
        var buy = one
          ? '<button class="btn btn--sm btn--block" type="button" data-add-to-cart="' + p.id + '" data-size="' + esc((p.sizes && p.sizes[0] && p.sizes[0].value) || 'UNI') + '">Į krepšelį</button>'
          : '<span class="look-pop__buy-label">Greitai į krepšelį</span><div class="sizes" role="group" aria-label="Dydis, ' + esc(p.brand) + '">' + ui.sizeChipsHTML(p, { mode: 'add', small: finePointer }) + '</div>';
        /* the photo's own pieces are not in the catalogue: every marker offers a similar product and says so */
        return '<button class="hotspot" type="button" style="--x:' + it.x + '%;--y:' + it.y + '%" data-hotspot="' + i + '" aria-expanded="false" aria-controls="look-pop-' + i + '">' +
            '<span class="hotspot__dot" aria-hidden="true">' + n + '</span><span class="sr-only">' + n + '. Panaši prekė: ' + esc(cat.imageAlt(p)) + '</span></button>' +
          '<div class="look-pop" id="look-pop-' + i + '" role="group" aria-label="Panaši prekė: ' + esc(cat.imageAlt(p)) + '" data-side="' + side + '" data-v="' + v + '" style="--x:' + it.x + '%;--y:' + it.y + '%">' +
            media(p, 'look-pop__media') +
            '<div><p class="look-pop__kicker">Panaši prekė</p><p class="look-pop__brand">' + esc(p.brand) + '</p><p class="look-pop__title"><a class="link" ' + linkAttrs(p) + '>' + esc(p.title) + '</a></p>' + ui.priceHTML(p) + '</div>' +
            '<div class="look-pop__buy">' + buy + '</div>' +
            '<button class="icon-btn look-pop__close" type="button" data-look-close aria-label="Uždaryti">' + ui.icon('x') + '</button>' +
          '</div>';
      }).join(''));

      listEl.innerHTML = items.map(function (it, i) {
        var p = it.p;
        return '<li class="look-row" data-look-row="' + i + '">' +
          '<span class="look-row__num" aria-hidden="true">' + (i + 1) + '</span>' +
          media(p, 'look-row__media') +
          '<div><p class="look-row__brand">' + esc(p.brand) + '</p><p class="look-row__title"><a class="look-row__link" ' + linkAttrs(p) + '>' + esc(p.title) + '</a></p></div>' +
          ui.priceHTML(p) + '</li>';
      }).join('');

      var sum = items.reduce(function (n, it) { return n + it.p.price; }, 0);
      var reg = items.reduce(function (n, it) { return n + (it.p.regular || it.p.price); }, 0);
      totalEl.innerHTML =
        '<div class="look__sum"><span class="look__sum-label">Derinio kaina</span>' + ui.priceHTML({ price: sum, regular: reg }, { size: 'lg' }) + '</div>' +
        (reg > sum ? '<p class="savings">Sutaupote <strong>' + u.formatPrice(reg - sum) + '</strong></p>' : '') +
        '<button class="btn btn--lg btn--block" type="button" id="look-buy">Pirkti visą derinį<svg class="i btn__arrow" aria-hidden="true" focusable="false"><use href="#i-handbag-simple"></use></svg></button>' +
        '<p class="look__note">Prekėms su dydžiais parinksime pirmą turimą dydį. Jį pakeisti galėsite krepšelyje arba prekės peržiūroje.</p>';

      /* popover behaviour: hover (fine pointer), focus, click/tap toggles, Esc and outside click close */
      var spots = qsa('.hotspot', canvas), pops = qsa('.look-pop', canvas), rows = qsa('.look-row', listEl);
      var openIdx = -1, hoverT = 0;
      var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
      function link(i, on) {
        if (spots[i]) spots[i].classList.toggle('is-linked', on);
        if (rows[i]) rows[i].classList.toggle('is-linked', on);
      }
      function openPop(i) {
        if (openIdx === i) return;
        closePop();
        openIdx = i;
        pops[i].classList.add('is-open');
        spots[i].setAttribute('aria-expanded', 'true');
        link(i, true);
      }
      function closePop(focusBack) {
        if (openIdx < 0) return;
        var i = openIdx;
        pops[i].classList.remove('is-open');
        spots[i].setAttribute('aria-expanded', 'false');
        link(i, false);
        openIdx = -1;
        if (focusBack) spots[i].focus();
      }
      spots.forEach(function (s, i) {
        s.addEventListener('click', function (e) {
          e.preventDefault();
          /* a mouse click after hover keeps the card open; keyboard and touch toggle */
          if (fine.matches && e.detail > 0) { openPop(i); return; }
          if (openIdx === i) closePop(); else openPop(i);
        });
        s.addEventListener('focus', function () { if (fine.matches) openPop(i); });
        s.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { clearTimeout(hoverT); openPop(i); } });
        s.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hoverT = setTimeout(function () { if (openIdx === i && !pops[i].matches(':hover, :focus-within')) closePop(); }, 220); } });
      });
      pops.forEach(function (p, i) {
        p.addEventListener('pointerenter', function () { clearTimeout(hoverT); });
        p.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hoverT = setTimeout(function () { if (openIdx === i && !p.matches(':focus-within')) closePop(); }, 220); } });
        p.addEventListener('focusout', function (e) {
          if (!p.contains(e.relatedTarget) && e.relatedTarget !== spots[i]) setTimeout(function () { if (openIdx === i && !p.matches(':focus-within') && document.activeElement !== spots[i]) closePop(); }, 0);
        });
      });
      canvas.addEventListener('click', function (e) { if (e.target.closest('[data-look-close]')) { e.preventDefault(); closePop(true); } });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openIdx >= 0 && !qs('dialog[open]')) closePop(true); });
      document.addEventListener('pointerdown', function (e) { if (openIdx >= 0 && !e.target.closest('.hotspot, .look-pop')) closePop(); });
      rows.forEach(function (r, i) {
        r.addEventListener('pointerenter', function () { link(i, true); });
        r.addEventListener('pointerleave', function () { if (openIdx !== i) link(i, false); });
      });

      var buyBtn = qs('#look-buy');
      if (buyBtn) buyBtn.addEventListener('click', function () {
        var chosen = [];
        items.forEach(function (it) {
          var p = it.p, s = firstSize(p);
          if (!s) return;
          var line = BS.cart.add(p.id, s.value, { open: false, silent: true });
          if (line && p.sizes && p.sizes.length > 1) chosen.push(it.name.toLowerCase() + ' ' + u.sizeLabel(s.label));
        });
        BS.cart.open(buyBtn);
        ui.toast('Derinys įdėtas į krepšelį' + (chosen.length ? '. Dydžiai: ' + chosen.join(', ') : ''), { type: 'ok', icon: 'check-circle', duration: 5000 });
      });
    }

    /* ----------------------------------------------------------- why Brandstore */
    function initWhy() {
      var benefits = meta.benefits || [];
      qsa('[data-benefit]').forEach(function (row) {
        var key = row.getAttribute('data-benefit');
        var b = benefits.filter(function (x) { return x.title.indexOf(key) === 0; })[0];
        if (!b) return;
        var title = qs('.why__row-title', row), text = qs('.why__row-text', row);
        var t = String(b.text || '').replace(/GooglePay/g, 'Google Pay').replace(/ApplePay/g, 'Apple Pay').trim();
        if (t && !/[.!?]$/.test(t)) t += '.';
        if (title) title.textContent = b.title;
        if (text && t) text.textContent = t;
      });
    }

    /* ----------------------------------------------------------------- reviews */
    function initReviews() {
      var track = qs('#rv-track'), reviews = BS.reviews || [];
      if (!track || !reviews.length) { hideSection(qs('.reviews')); return; }
      var stars = function (n) {
        var out = '';
        for (var i = 0; i < 5; i++) out += ui.icon(i < n ? 'star-fill' : 'star');
        return '<p class="rv__stars" role="img" aria-label="Įvertinimas: ' + n + ' iš 5">' + out + '</p>';
      };
      track.innerHTML = reviews.map(function (r) {
        var prod = (r.brand ? r.brand + ' ' : '') + u.lcFirst(r.productTitle || '');
        var photo = r.photo
          ? '<div class="rv__media"><img src="' + esc(r.photo) + '" alt="Pirkėjo nuotrauka: ' + esc(prod) + '" loading="lazy" decoding="async"><span class="rv__tag">' + ui.icon('seal-check-fill') + 'Pirkėjo nuotrauka</span></div>'
          : '<div class="rv__media"><img class="packshot" src="' + esc(r.productImage) + '" alt="' + esc(prod) + '" loading="lazy" decoding="async"></div>';
        var text = u.dashFree(String(r.text || '').trim());
        return '<li class="carousel__slide"><figure class="rv">' + photo +
          '<div class="rv__body">' + stars(Number(r.rating) || 5) +
            '<blockquote class="rv__quote"><p>„' + esc(text) + '“</p></blockquote>' +
            '<figcaption class="rv__meta"><span class="rv__author">' + esc(r.author) + '</span>' +
              '<span class="rv__product"><span class="rv__thumb"><img src="' + esc(r.productImage) + '" alt="" loading="lazy" decoding="async"></span>' +
              '<span><span class="sr-only">Įsigyta prekė: </span><span class="rv__brand">' + esc(r.brand || '') + '</span><span class="rv__title">' + esc(r.productTitle || '') + '</span></span></span>' +
            '</figcaption>' +
          '</div></figure></li>';
      }).join('');
    }

    /* -------------------------------------------------------------- newsletter */
    function initNewsletter() {
      var form = qs('#nl-form'), field = qs('#nl-field'), input = qs('#nl-email'), err = qs('#nl-err');
      var done = qs('#nl-success'), doneEmail = qs('#nl-success-email');
      if (!form) return;
      function setError(on) {
        field.classList.toggle('is-invalid', on);
        input.setAttribute('aria-invalid', on ? 'true' : 'false');
        err.hidden = !on;
      }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = input.value.trim();
        if (!u.isEmail(v)) { setError(true); input.focus(); return; }
        setError(false);
        doneEmail.textContent = v;
        form.hidden = true;
        done.hidden = false;
        done.focus();
      });
      input.addEventListener('input', function () { if (field.classList.contains('is-invalid') && u.isEmail(input.value)) setError(false); });
      input.addEventListener('blur', function () { if (input.value.trim() && !u.isEmail(input.value)) setError(true); });
    }

    safe('hero-video', heroVideoMobile);
    safe('meta', syncMeta);
    safe('cats', initCats);
    safe('sale', initSale);
    safe('deal', initDeal);
    safe('brands', initBrands);
    safe('designers', initDesigners);
    safe('gender', initGenderPanels);
    safe('kids', initKids);
    safe('newin', initNewIn);
    safe('look', initLook);
    safe('why', initWhy);
    safe('reviews', initReviews);
    safe('newsletter', initNewsletter);
    safe('hero', heroMotion);
  });
})();
