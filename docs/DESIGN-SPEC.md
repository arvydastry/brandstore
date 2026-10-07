# Brandstore demo: design spec ("Galleria")

Internal build spec for the static demo (homepage, sale listing, 3 product pages). Written in English for the build agents; every user-facing string is Lithuanian. The final site is WordPress + WooCommerce + XStore (Elementor), so every pattern here must be reproducible with XStore features, Elementor widgets or a small custom CSS/JS snippet. Research notes: `docs/research/xstore-salient.md`, `docs/research/ux-audit.md`.

## 1. Design read

Luxury multi-brand fashion e-commerce (original designer brands at outlet prices) for Lithuanian style-conscious, value-aware shoppers (25-55). Editorial luxury language ("Milan galleria meets precise retail UX"): monochrome, sharp, lots of air on the homepage, dense and fast where shopping happens. Native CSS + vanilla JS + Motion (motion.dev, vanilla build) + Lenis. Overhaul of visuals; IA, brand logo, category names, brand list, contacts and real products are preserved.

Dials: DESIGN_VARIANCE 7, MOTION_INTENSITY 7 (client explicitly wants lots of parallax and hover), VISUAL_DENSITY 3 on the homepage, 6 on the listing page.

Concept name for the client: **"Galleria"**. Most Brandstore brands are Italian; the display face is Bodoni (Giambattista Bodoni, Parma), the typographic voice of fashion editorial. Everything else is a quiet, precise grotesk.

## 2. Tokens (`assets/css/base.css`, `:root`)

Light theme is locked for the whole site (product packshots are shot on white and rely on `mix-blend-mode: multiply`). Exactly three deliberate dark blocks exist: the hero (video), the sale band on the homepage, and the footer. No other section flips theme.

### Color
| Token | Value | Use |
|---|---|---|
| `--c-bg` | `#F4F4F2` | page background (cool neutral off-white, NOT cream) |
| `--c-surface` | `#FBFBFA` | drawers, dialogs, dropdowns, inputs |
| `--c-media` | `#ECECE9` | product image well; packshots use `mix-blend-mode: multiply` so white becomes this grey |
| `--c-ink` | `#121315` | text, primary buttons |
| `--c-ink-soft` | `#1D1E21` | dark section background (sale band) |
| `--c-ink-deep` | `#0B0C0D` | footer, announcement bar |
| `--c-text-2` | `#55575D` | secondary text (about 6.9:1 on bg) |
| `--c-text-3` | `#6A6C72` | meta text, struck-through prices (about 4.8:1) |
| `--c-line` | `#DCDCD8` | hairlines |
| `--c-line-strong` | `#BDBDB8` | input borders, chip borders |
| `--c-on-dark` | `#F2F2EF` | text on dark |
| `--c-silver` | `#B8BABE` | secondary text on dark |
| `--c-sale` | `#C8261C` | THE single accent. Only for discounts: sale prices, discount badges, "Išpardavimas" nav item, countdown digits. Never for generic buttons. |
| `--c-sale-bright` | `#FF5B4A` | the same accent on dark backgrounds |
| `--c-ok` | `#2F6B4F` | semantic only: "in stock", success messages, free-shipping reached |

No pure #000 or #FFF anywhere. Shadows are tinted ink: `0 24px 80px rgb(18 19 21 / .18)` for drawers only.

### Type
- `--f-display: "Bodoni Moda", "Bodoni 72", Didot, Georgia, serif` (Google Fonts, `ital,opsz,wght@0,6..96,400..900;1,6..96,400..900`). Used for h1/h2, giant gender words, discount numerals, PDP product title, big stats. Emphasis inside a display headline = Bodoni italic (same family). Never mix in another serif.
- `--f-sans: "Geist", system-ui, -apple-system, "Segoe UI", sans-serif` (Google Fonts `wght@300..700`). Everything else: nav, body, cards, prices (`font-variant-numeric: tabular-nums`).
- Both fonts include latin-ext (ą č ę ė į š ų ū ž). Load with `display=swap` and preconnect.
- Scale (fluid): display-xl `clamp(2.75rem, 1.4rem + 4.8vw, 6.25rem)`/1.02/-0.02em/500; h2 `clamp(2rem, 1.3rem + 2.6vw, 3.75rem)`/1.05/-0.015em/500; h3 `clamp(1.375rem, 1.1rem + 1vw, 2rem)`/1.15; body 1rem/1.6; small .875rem; micro .75rem.
- Labels/nav: Geist 12-13px, uppercase, letter-spacing .12-.16em, weight 500. Card brand line: 11px uppercase .14em weight 600.
- Italic descenders: any Bodoni italic word with g/j/p/y/ą/ę/į/ų gets line-height >= 1.1 and a little bottom padding so descenders are never clipped by reveal masks.

### Shape, space, motion
- Radius: **0 everywhere** (images, cards, buttons, inputs, drawers, dialogs). The only round things: icon buttons (wishlist heart, carousel arrows, video toggle) and filter/category chips (`999px`). This rule is global; no 4px/8px radii anywhere.
- Spacing base 4px. Container `max-width: 1440px; padding-inline: clamp(16px, 4vw, 56px)`. Homepage section padding-block `clamp(72px, 9vw, 152px)`; listing/PDP tighter (`clamp(40px, 5vw, 80px)`).
- Easing `--ease-out: cubic-bezier(.16,1,.3,1)`, `--ease-io: cubic-bezier(.65,0,.35,1)`. Durations 180ms (hover color), 450ms (UI), 900ms (reveals), 1200ms (image reveals).
- Z-index scale (documented as tokens): header 50, mega/search panel 60, mobile bar 55, drawer backdrop 80, drawer 90, dialog 100, toast 110.

## 3. Copy rules (Lithuanian)
- Correct diacritics always. Natural, premium Lithuanian; no anglicisms.
- No em dash anywhere. Avoid en dash as a decorative separator; restructure sentences with a period or comma. Ranges may use a hyphen ("2-4 d. d.").
- Prices: `73 €` (number, no-break space, euro sign; no decimals when the price is whole). Struck-through old price + sale price in `--c-sale`. Discount badge: `−54 %` (U+2212 minus, no-break space, percent).
- Big numbers: `11 000` with a no-break space.
- Dates: "spalio 10 d.", "spalio 10-13 d.".
- Max 1 eyebrow (small uppercase label above a headline) per 3 sections. Section headlines stand alone.
- One label per intent across the site: add to cart = "Į krepšelį"; view all = "Žiūrėti visas" (or "Žiūrėti visus" for masculine nouns, e.g. "Žiūrėti visus pasiūlymus"); checkout = "Pereiti prie apmokėjimo"; remember = "Įsiminti" (wishlist button label); quick view = "Greita peržiūra"; wishlist = "Norų sąrašas".
- No invented facts: counts, discounts, stock and prices come from `window.BS` (real store data). If a number is a demo assumption (countdown end, delivery estimate), it is computed client-side and phrased as an estimate.

## 4. Global components (core layer)

### 4.1 Announcement bar (`--c-ink-deep`, 36px, micro labels)
Left: "100 % originalios prekės". Center: rotating (fade, 5s, pauses on hover/focus, static under reduced motion): "Nemokamas pristatymas perkant 2 ar daugiau prekių" / "14 dienų prekių grąžinimas" / "Apmokėjimas Apple Pay, Google Pay ir el. bankininkyste". Right: `tel:+37061004151` "+370 610 04151" and "Pagalba" (to footer contacts). Mobile: center message only.

### 4.2 Header (XStore Header Builder)
- Desktop row 1 (72px): logo left (`assets/img/brand/logo-dark.png` (dark, for light backgrounds), height 34px desktop / 28px mobile and condensed; over the hero and in the footer the white variant `assets/img/brand/logo-light.png` is used), wide search field in the middle (max 560px, placeholder "Ieškokite prekės, kategorijos ar prekės ženklo", keyboard hint "/"), right: icon buttons Paskyra, Norų sąrašas (count badge), Krepšelis (count badge). Icon buttons are 44px targets with visually hidden labels.
- Desktop row 2 (48px): Naujienos, Moterims, Vyrams, Vaikams, Prekių ženklai, Dizainerių kolekcija, Išpardavimas (in `--c-sale`, with a small "%", last item). "Top pasiūlymai" is retired (anglicism, competed with sale). One line at >= 1024px.
- Modes: `header--overlay` on the homepage (transparent over hero, white text/icons, logo inverted) switches to solid (`--c-bg` at 92% + `backdrop-filter: blur(14px)`, ink text) once the page scrolls past ~40px (IntersectionObserver sentinel). On every page: after ~320px, scrolling down hides row 2 and condenses the header to a single 60px row; scrolling up brings it back. Use Lenis' scroll event or Motion's `scroll()` for direction; never a raw `window.addEventListener('scroll')`.
- Nav links: 1px underline grows from left on hover/focus (directional, 300ms).

### 4.3 Mega menus (XStore static blocks / Elementor mega menu)
- Moterims / Vyrams / Vaikams: full-width panel under the header, opens on hover with ~120ms intent delay and on click/Enter/ArrowDown (`aria-expanded`, `aria-controls`), closes on Esc, outside click, focus leaving, mouse leaving (with ~200ms grace). Content: three link columns Drabužiai / Avalynė / Aksesuarai (Vaikams: Berniukams / Mergaitėms) with category counts in `--c-text-3` when known, a "Populiarūs prekių ženklai" column (8 links), and a promo tile (image + "Išpardavimas moterims" + "Žiūrėti visus pasiūlymus"). Columns fade/slide in with a 40ms stagger.
- Prekių ženklai: panel with a filter input ("Raskite prekės ženklą"), A-Z letter index, the full brand list in columns (filters live, diacritic-insensitive), and a "Populiariausi" row of top brands.

### 4.4 Predictive search (XStore ajax search)
Opens on search focus, click, or "/" key; on mobile from the bottom bar. Panel under the header (mobile: full screen). Before typing: "Populiarios paieškos" chips (Striukės, Rankinės, Sportiniai bateliai, Valentino Bags, Norway 1963, Coccinelle, Džemperiai) and "Naujausi" (recent searches from localStorage). While typing (debounce ~120ms): matching brands, matching categories (with gender), and up to 6 product results (image, brand, title, price) from `window.BS.products`. Matching is case- and diacritic-insensitive ("rankines" finds "Rankinės", "zalia" finds "Žalia"), the matched part is highlighted. Arrow keys move through results, Enter opens, Esc closes. Footer link "Rodyti visus rezultatus" goes to `parduotuve.html?q=...`. Empty state: "Pagal „…“ nieko neradome." plus suggestion chips.

### 4.5 Product card (XStore product archive: image swap hover + quick add)
- Media well `aspect-ratio: 2/3`, background `--c-media`, image `mix-blend-mode: multiply` (only when `imageBg === "white"`). Hover (desktop, pointer:fine): crossfade to the second image + `scale(1.035)` over 900ms.
- Top-left: discount badge `−54 %` (`--c-sale` background, `--c-on-dark` text, sharp, 11px semibold) and/or "Nauja" (ink). Top-right: round wishlist button (always visible on touch, fades in on hover on desktop).
- Quick add: on hover a panel slides up from the bottom of the image: label "Greitai į krepšelį" + available size chips (unavailable ones crossed out and disabled). Clicking a size adds to cart and opens the cart drawer. One-size products ("UNI") show a single "Į krepšelį" button. Eye button "Greita peržiūra" opens the quick-view dialog.
- Below the image: brand (micro uppercase), title (14px, 2-line clamp), price row: sale price (`--c-sale`, 600) + old price (`--c-text-3`, line-through) or the regular price in ink. Optional "Sutaupote 87 €" in small text on listing pages.
- Click behaviour: products listed in `BS.collections.pdp` link to their page `preke-<slug>.html`; all others open the quick-view dialog (with a note "Demo: pilnas prekės puslapis sukurtas trims prekėms").
- Card markup is produced by one JS renderer in core (`BS.ui.productCard(product, options)`) so every page uses identical cards. Variant `on-dark` for the sale band (text on dark, media well stays light).

### 4.6 Carousel
Horizontal scroll-snap track, prev/next round buttons (44px), drag to scroll with a mouse, a thin scrub/progress line, keyboard arrows, `aria-roledescription="carousel"`, slides labelled "3 iš 12". Shows partial next card to signal more content. No autoplay.

### 4.7 Cart drawer (XStore off-canvas cart + Sales Booster free-shipping bar)
Right drawer (440px, full width on mobile), backdrop, focus trap, Esc closes. Free-shipping progress (rule: 2+ items, otherwise delivery 3 €): with 1 item "Įsidėkite dar 1 prekę ir pristatymas bus nemokamas", with 2+ items "Pristatymas nemokamas!" (`--c-ok`). Line items: image, brand, title, size, quantity stepper, price, remove. Totals: "Tarpinė suma", "Sutaupote" (sum of regular minus sale), shipping line ("Pristatymas: 3 €" or "nemokamas"), primary "Pereiti prie apmokėjimo" (demo toast), secondary "Tęsti apsipirkimą". Empty state: "Jūsų krepšelis tuščias" + links to Naujienos and Išpardavimas. State persists in localStorage (all storage access wrapped in try/catch).

### 4.8 Wishlist, toast, quick view, dialogs
- Heart toggles persist in localStorage, header badge updates, toast "Pridėta į norų sąrašą" / "Pašalinta iš norų sąrašo".
- Toast: bottom center, ink, 3.5s, `role="status"`.
- Quick view: native `<dialog>`: gallery (2-3 images), brand, title, price, size chips, "Į krepšelį", link to the full page when it exists.

### 4.9 Footer (`--c-ink-deep`)
Columns: Brandstore (inverted logo, one-line description "Originalūs drabužiai, avalynė ir aksesuarai iš pasaulio prekių ženklų.", Facebook/Instagram), "Pirkėjams" (Pristatymas, Apmokėjimas, Grąžinimo politika, Pirkimo taisyklės, DUK), "Kategorijos" (Moterims, Vyrams, Vaikams, Prekių ženklai, Išpardavimas), "Kontaktai" (+370 610 04151, info@brandstore.lt, Pilkalnio g. 7, Vilnius). Bottom row: payment marks (Apple Pay, Google Pay, Visa, Mastercard, "El. bankininkystė"), "© 2026 Brandstore.lt. Visos teisės saugomos.", "Individualios veiklos pažymėjimo nr. 1393761", Privatumo politika.

### 4.10 Mobile (< 1024px)
- Header: menu button, centered logo, search and cart buttons.
- A full-width search field is always visible directly under the mobile header (tapping it opens the full-screen predictive search).
- Bottom bar (XStore Mobile panel), fixed, 64px + safe-area: Pradžia, Katalogas (opens menu drawer), Išpardavimas (accent), Norai, Krepšelis (with badges). Hides on scroll down, returns on scroll up. Hidden on PDP where the sticky add-to-cart bar takes its place.
- Menu drawer (left): gender tabs Moterims | Vyrams | Vaikams, accordion groups with links, then Prekių ženklai, Naujienos, Išpardavimas (accent), contacts.
- Every multi-column layout collapses to a single column below 768px; product grids are 2 columns on phones.

### 4.11 Motion system (`assets/js/core.js`)
- Libraries vendored locally: `assets/js/vendor/motion.js` (motion@12.43.0 UMD, global `Motion`) and `assets/js/vendor/lenis.min.js` (lenis@1.3.26).
- Content is fully visible without JS. Hidden initial states apply only under `html.motion-ok`, which core.js sets when Motion loaded AND `prefers-reduced-motion: no-preference`.
- Lenis smooth scroll on desktop pointer devices only; disabled for reduced motion. Anchor links and drawers (`data-lenis-prevent`) work.
- `[data-reveal]` fade + 24px rise; `[data-reveal-stagger]` staggers children (60ms). `[data-reveal="clip"]` image clip-path reveal from bottom. `[data-split]` Salient-style split-line heading: text split into lines, each line slides up from a mask.
- `[data-parallax="0.12"]` translateY tied to the element's progress through the viewport (Motion `scroll()` with target offsets), the image sits inside an `overflow:hidden` frame and is pre-scaled so no gaps appear. `[data-zoom-parallax]` image scales 1.18 to 1 through the viewport.
- `[data-count-to]` number counters (once). `[data-countdown]` live countdown (days/hours/minutes/seconds) to `BS.collections.dealInfo.endsAt` (the real campaign end, 2026-10-31); if that date has passed, fall back to the end of the current month (Europe/Vilnius) so the demo never shows an expired timer. No other urgency devices (no fake "people viewing", no fake sold counters).
- Marquee: max one per page (brands). CSS animation, pauses on hover/focus, static wrap under reduced motion.
- Every animation must justify itself (hierarchy, storytelling, feedback, state change). Under reduced motion: no parallax, no smooth scroll, no marquee, no autoplaying hero video (poster shown, play button available).

## 5. Homepage (`index.html`) section map

| # | Section | Layout family | XStore / Salient source |
|---|---|---|---|
| 1 | Hero | full-bleed video, content bottom-left | Elementor container background video + XStore Parallax; Salient Nectar slider + Split Line Heading |
| 2 | Trust strip | inline row with hairline separators | Icon List / Icon Box |
| 3 | "Ko ieškote šiandien?" category finder | tabbed tile rail | General Tabs + Product Categories |
| 4 | Išpardavimas (dark block) | parallax header + discount numerals + tabbed carousel | XStore Parallax + Banners (Border Animation) + Countdown + Ajax Products Tabs; Salient parallax row |
| 5 | Mėnesio pasiūlymas | split product spotlight | Products (1 item) / Loop Grid + Countdown + Advanced Product stock |
| 6 | Prekių ženklai | marquee + brand finder + logo grid | Marquee + XStore Brands; Salient Scrolling Text |
| 7 | Dizainerių kolekcija | full-bleed video band + 4 luxury cards | Container background video + XStore Parallax; Salient Zoom Out Reveal |
| 8 | Jai / Jam | offset diptych with parallax, hover reveals links | 2 Banners (Zoom Out + content on hover) + XStore Parallax; Salient Fancy Box |
| 9 | Ką tik atkeliavo (new in) | editorial grid (tall image tile + products) with tabs | Ajax Products Tabs + Banner |
| 10 | Įvaizdis (shop the look) | image with hotspots + product list | Hotspot + Frequently Bought Together; Salient Image With Hotspots |
| 11 | Kodėl Brandstore | sticky media + counters + value rows | XStore Sticky Content + Counter + Icon List; Salient Sticky Media Sections |
| 12 | Atsiliepimai | quote carousel with product thumbnails | Testimonials |
| 13 | Naujienlaiškis | form band over soft image | Omnisend form (already on the site) |

Section details:
1. **Hero** (`min-height: calc(100svh - 36px)` desktop, about 72svh on phones so the next section peeks): `assets/media/hero.mp4` (muted, loop, playsinline, poster `hero-poster.jpg` preloaded as LCP, preload metadata), slow parallax + scale on scroll, strong dark gradient from bottom-left (the clip is bright daylight). Content bottom-left: h1 (Bodoni, 2 lines max, split-line reveal) "Tikri prekių ženklai. *Tikros nuolaidos.*"; subtext (<= 20 words) "Daugiau nei 11 000 originalių drabužių, avalynės ir aksesuarų iš {brandsCount} prekių ženklų, su nuolaidomis iki −{maxDiscount} %."; three buttons: "Moterims", "Vyrams" (light outline over the scrim, hover fills) and "Išpardavimas" (filled light button). Bottom-right: round pause/play video toggle (WCAG 2.2.2). No eyebrow, no extra strips. Under reduced motion: poster only, play button available.
2. **Trust strip**: 4 items with Phosphor light icons: "100 % originalios prekės", "Nemokamas pristatymas perkant 2+ prekes", "Išsiunčiame per 1-2 darbo dienas", "14 dienų grąžinimas". Not cards: one row, hairline separators, 2x2 on mobile.
3. **Category finder**: h2 "Ko ieškote šiandien?", segmented tabs Moterims | Vyrams | Vaikams (`role="tablist"`), rail of tiles from `BS.collections.categoryTiles[gender]`: packshot on `--c-media` (4:5), label + count ("Striukės" / "312 prekių" with correct Lithuanian plural: 1 prekė, 2-9 prekės, 10-20 prekių, 21 prekė, 22 prekės...). Hover: image lifts and scales, label underline. Tab change re-animates tiles (stagger). Horizontal swipe rail on mobile. Links to `parduotuve.html?lytis=...&kategorija=...`.
4. **Išpardavimas** (`--c-ink-soft`, the one dark content block; the strongest moment after the hero): header area over `sale-bg.jpg` (parallax, dark overlay): eyebrow allowed here ("Rudens išpardavimas"), h2 "Išpardavimas dabar" (very large Bodoni), line "{onSaleCount} prekių su nuolaida. Iki −{maxDiscount} %." and the live countdown "Rudens išpardavimas baigsis po" (see motion rules). Then "Rinkitės pagal nuolaidą": giant outlined Bodoni numerals "−30 %", "−50 %", "−70 %" (each with "ir daugiau" in micro text) plus a fourth smaller tile "Viskas iki 50 €"; hover fills with `--c-sale-bright`; links to `parduotuve.html?nuolaida=30|50|70` and `?kaina_iki=50`. Then category tabs from `BS.collections.saleTabs` + `saleTabLabels` driving a product carousel (on-dark cards, ideally max 2 products per brand in view). Footer button "Peržiūrėti visą išpardavimą ({onSaleCount})" to `parduotuve.html`.
5. **Mėnesio pasiūlymas** (light again): `BS.collections.deal` / `dealInfo`. Split layout: large packshot in a media well with gentle parallax on the left (second image on hover), info on the right: label badge "Mėnesio pasiūlymas" (sale accent), brand logo or name, Bodoni title, big price block with old price and "Sutaupote X €", stock line only when stock <= 3 ("Liko paskutinis vienetas" / "Liko tik 2"), the countdown, "Į krepšelį" (one-size bag) and "Greita peržiūra". Copy: "Itališkas stilius, kurio verta laukti visus metus. Šį mėnesį su ypatinga kaina."
6. **Prekių ženklai** (moved up: many shoppers come for a brand): the page's only marquee, brand names in Bodoni (alternating filled / outlined via `-webkit-text-stroke`), slow, pause on hover, each name a link. Below: h2 "Mylimiausi prekių ženklai", an inline brand finder input "Raskite prekės ženklą" (live suggestions from `BS.brands`, diacritic-insensitive, Enter goes to the listing filtered by brand), and a grid of the real logos in `assets/img/brands/` (grayscale, full colour + lift on hover, "N prekių" when `count` is known). Button "Visi prekių ženklai A-Z" opens the brands mega panel.
7. **Dizainerių kolekcija** (luxury editorial, the exclusivity statement): full-bleed band with `assets/media/ambient.mp4` as background video (lazy: `preload="none"`, starts when in view, poster `ambient-poster.jpg`, paused under reduced motion) and zoom parallax; over it h2 "Dizainerių kolekcija" + one line naming the luxury houses present in `BS.products` with `isLuxury` (e.g. "Gucci, Saint Laurent, Miu Miu, Moncler ir kiti. Kiekviena prekė originali."). Then 4 luxury product cards (`isLuxury`) on the light background directly under the band (overlapping the band bottom by ~120px on desktop for depth) and an "Atrasti kolekciją" link.
8. **Jai / Jam**: two tall panels (desktop 7/5 offset: right panel starts ~96px lower), `jai.jpg` / `jam.jpg` with inner parallax, giant Bodoni words "Jai" / "Jam" bottom-left over a scrim. On hover/focus-within a link list slides up: Rankinės, Drabužiai, Avalynė, Striukės + "Visos prekės" (links to `parduotuve.html?lytis=...`). Mobile: stacked, links always visible. A slim row "Vaikams" (`vaikams.jpg` thumbnail + links Berniukams / Mergaitėms) may sit under the diptych.
9. **Ką tik atkeliavo**: h2 "Ką tik atkeliavo", tabs Moterims | Vyrams | Aksesuarai (`BS.collections.newIn`), "Žiūrėti visas" link. Grid: first cell is a tall editorial tile (`outerwear.jpg` for Moterims/Vyrams, crop away the storefront sign in its top-right; `accessories.jpg` for Aksesuarai; spans 2 rows) with a short line and link, then 6 product cards (desktop 4 columns). Mobile: editorial tile full width, products 2 columns.
10. **Įvaizdis (shop the look)**: `lookbook.jpg` large (parallax) with 3 numbered hotspots at the manifest positions (coat 44%/45%, bag 35%/67%, sneaker 73%/89%; functional markers, not decoration); hover/focus (tap on mobile) opens a mini product popover (image, brand, title, price, "Į krepšelį"). Right side: h2 "Sezono įvaizdis", the 3 matching products from `BS.products` as compact rows, total price, button "Pirkti visą derinį" (adds all three; for sized items use the first available size and say so in the toast).
11. **Kodėl Brandstore**: sticky media layout. Left (5/12): `story.jpg` sticks while the right column scrolls, with gentle scale parallax. Right: h2 "Kodėl verta rinktis Brandstore", three big Bodoni numbers with counters "11 000+" ("originalių prekių"), "{brandsCount}" ("prekių ženklų"), "14" ("dienų grąžinimui") and four value rows (icon + title + one sentence) from `BS.meta.benefits` (Patvirtinta kokybė, Nemokamas pristatymas, Patogus grąžinimas, Saugus mokėjimas).
12. **Atsiliepimai**: h2 "Ką sako mūsų pirkėjai", carousel of the 7 real reviews (`BS.reviews`): stars, quote (max 3 lines, Lithuanian quotes „…“), author, purchased product with thumbnail, and the real customer photo when `photo` exists. No invented aggregate rating.
13. **Naujienlaiškis**: soft `newsletter.jpg` background (light scrim), h2 "Pirmieji sužinokite apie išpardavimus", label above input "El. pašto adresas", button "Prenumeruoti", consent microcopy with a link to Privatumo politika, inline validation (error below input, success state replaces the form). No invented discount codes. Never a popup.

## 6. Listing page (`parduotuve.html`, "Išpardavimas")
- Compact page head: breadcrumbs "Pradžia / Išpardavimas", h1 "Išpardavimas", line "Originalūs prekių ženklai iki −{max} %", result count. Slim parallax strip of `sale-bg.jpg` behind the head is allowed.
- Quick chips row (categories) + gender segmented control (Visi | Moterims | Vyrams | Vaikams).
- Desktop: sticky left filter column (280px), in this order: Dydis (chip grid, grouped: drabužiai / avalynė / vaikai / vienas dydis), Prekės ženklas (search box + checkboxes with counts, top brands first), Kategorija (by `typeSlug` with labels and counts), Kaina (dual range + number inputs + quick ranges "iki 50 €", "50-100 €", "100-200 €", "200 € ir daugiau"; applies instantly, no "Filtruoti" button), Nuolaida (−30 %+ / −50 %+ / −70 %+), Spalva (swatches with translated names), Lytis. Collapsible groups showing the number of active selections; options with zero results are disabled.
- Toolbar: active filter chips with remove buttons + "Išvalyti visus", sort select (Didžiausia nuolaida (default on this sale page), Rekomenduojami, Naujausi, Kaina: nuo mažiausios, Kaina: nuo didžiausios), grid density toggle (2/3/4 columns), "Rasta N prekių".
- Grid uses the core product card. Filtering is instant and client-side over `BS.collections.plp`, state synced to URL params (`q`, `lytis`, `kategorija`, `zenklas`, `dydis`, `spalva`, `nuolaida`, `kaina_nuo`, `kaina_iki`, `rikiuoti`) so homepage links pre-filter. Re-render animates (fade/stagger, no layout jump). "Rodyti daugiau" button with "Rodoma 24 iš 46". Empty state with a reset button and suggestion chips.
- Mobile: sticky toolbar "Filtrai (3)" + "Rikiuoti"; filters open in a bottom sheet with a sticky "Rodyti N prekių" button.

## 7. Product pages (`preke-<slug>.html`, 3 pages)
- Breadcrumbs (Pradžia / Vyrams / Striukės / title).
- Gallery (left ~58%): vertical thumbnails + main image in the media well; hover zoom (pan follows cursor) on desktop; click opens a fullscreen lightbox with arrows/swipe/Esc. Mobile: swipe carousel with dots.
- Info (sticky right column): brand link (micro uppercase), h1 title (Bodoni ~2rem), price block (sale price large in `--c-sale`, old price struck, badge `−78 %`, "Sutaupote 198 €", the EU Omnibus line "Mažiausia kaina per 30 d. iki nuolaidos: 253 €" (demo uses the regular price), "Kaina su PVM"), colour (name + swatch), size chips (unavailable crossed with "Praneškite, kai atsiras" link), "Dydžių lentelė" link (dialog with LT/EU/IT + cm table for clothing or EU/UK/cm for shoes; bags show a dimensions note instead), stock line only when stock <= 3 ("Liko paskutinis vienetas" / "Liko tik 2"), delivery info: "Išsiunčiame per 1-2 darbo dienas" + estimate "Numatomas pristatymas: spalio 9-13 d." (computed +2..+4 working days) + "Pristatymas 3 €, perkant 2 ir daugiau prekių nemokamai", "Į krepšelį" (full width) + square wishlist button. No size selected: inline error "Pasirinkite dydį" + gentle shake. Trust row (3 items), payment marks, SKU line "Prekės kodas: …".
- Accordions: Aprašymas (open, real description), Detalės (bullets from data), Pristatymas ir grąžinimas (free delivery for 2+ items, 14-day returns, payment methods).
- Sticky add-to-cart bar appears once the main button leaves the viewport (thumb, brand/title, price, size select, "Į krepšelį"). On mobile it is fixed at the bottom.
- Below: "Užbaikite įvaizdį" (3-4 complementary items with quick add, XStore "Buy together"), brand strip "Daugiau iš {brand}" with link, "Jums gali patikti" carousel (related 8), "Neseniai žiūrėtos" (localStorage, hidden when empty).

## 8. Build and files
- `build.py` (python3 stdlib only) assembles `src/pages/*.html` with `src/partials/*` into the project root. It first runs every `src/generators/*.py` (they write generated pages into `src/pages/`). Page meta via a first-line comment, e.g. `<!-- @page title="..." description="..." body="page-home" header="overlay" css="home" js="home" -->`. Include directive: `<!-- @include header -->`.
- `assets/css/base.css` (tokens + components) is loaded on every page, plus one page stylesheet (`home.css`, `plp.css`, `pdp.css`). `assets/js/core.js` on every page, plus one page script. `assets/data/catalog.js` before core.js.
- Icons: Phosphor (light weight) SVGs copied from `@phosphor-icons/core` into an inline sprite partial (`src/partials/icons.svg`), referenced with `<svg class="i"><use href="#i-name"/></svg>`. Never hand-draw icon paths. Payment marks from Simple Icons (inlined SVG).
- Everything works from `file://` (no runtime fetch) and from any static server.
- Performance: hero poster preloaded, product images `loading="lazy"` with width/height set (CLS), videos `preload="metadata"`, fonts preconnected, no layout-animating properties (transform/opacity only).
- Accessibility: semantic landmarks, skip link "Pereiti prie turinio", visible focus rings (2px ink/white outline with offset), 44px touch targets, `aria-*` for menus/tabs/dialogs/carousels, alt text in Lithuanian, colour contrast AA.
