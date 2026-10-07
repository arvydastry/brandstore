# XStore + Salient: platformos tyrimas ir elementų žemėlapis (Brandstore)

> Paskirtis: kad statinis demo (pagrindinis, išpardavimo sąrašas, 3 PDP) būtų 1:1 atkuriamas WordPress + WooCommerce + **XStore** (Elementor) aplinkoje, o Salient stiliaus efektai turėtų aiškų įgyvendinimo kelią.
> Data: 2026-10-07. Versijos: **XStore 9.7.9** ([8theme](https://www.8theme.com/woocommerce-themes/xstore/)), Elementor 4.2.x + Elementor Pro (esamoje svetainėje jau 4.2.4 ir Pro), **Salient 18** (išleista 2025-11-23, [ThemeNectar](https://themenectar.com/salient/introducing-salient-version-18/)).
> Metodika: pavadinimai paimti iš oficialios dokumentacijos ir **iš XStore demo puslapių HTML** (valdiklių klasės `elementor-widget-*`, `data-settings` raktai, `product-view-*` klasės). Kur sąsajoje (UI) rodomas pavadinimas gali šiek tiek skirtis, skliaustuose pateikta techninė reikšmė.

## 0. Santrauka

1. **Importo bazė:** importuoti visą **Fashion01** demo (naujausias mados demo, 2025 m. spalis-lapkritis). PDP, PLP ir pavienius blokus imti iš **Minimal Fashion 02** (jame pademonstruoti visi XStore elementai) per XStudio. Meniu ir filtrų logiką 11 000+ prekių katalogui imti iš **Electronic Mega Market**.
2. Beveik viskas, ką numato DESIGN-SPEC, sprendžiama **iš XStore dėžutės**: Ajax paieška su „Trending searches“, mega meniu iš Static Blocks, išmanus „sticky“ headeris, Mobile Panel, kortelė su Swap hover ir dydžių swatches, Quick View off-canvas, PDP builderis su Sticky Add To Cart, Size Guide, Estimated Delivery ir Safe Checkout, Ajax filtrai su „Load More“.
3. Salient efektai: 9 iš 16 turi tiesioginį XStore arba Elementor atitikmenį (Banner hover, Flipbox, Hotspot, Marquee, Animated Headline, XStore Parallax, Sticky Content, Horizontal Scroll, Video lightbox). Kitiems reikia mažų CSS/JS fragmentų vaikinėje temoje: Split Line reveal, Morphing outline, Text with inline media, Page transitions, Lenis.
4. **Trys dalykai, kurių XStore nedaro taip, kaip reikia Brandstore:** (a) nemokamo pristatymo juosta skaičiuoja tik **sumą**, o Brandstore taisyklė priklauso nuo **kiekio** (2+ prekės); (b) WooCommerce negali rikiuoti ir filtruoti pagal **nuolaidos %**; (c) XStore Brands valdikliai **neveikia su WooCommerce Brands**, o būtent juos dabar naudoja svetainė (`/brand/...`). Visiems trims reikia nedidelių fragmentų arba duomenų migracijos (žr. §4.6).
5. Teisinė pastaba: XStore „Fake Live Viewing“, „Fake Sale Popup“ ir „Fake Sold Counter“ **neįjungti**. Būtina rodyti **Omnibus** mažiausią 30 d. kainą (§4.7).
6. Našumas: 11 310 prekių kataloge XStore Ajax filtrus būtina išbandyti testinėje aplinkoje (yra vartotojų skundų dėl lėtumo 7 000+ kataloguose). Paieškai rekomenduojamas **FiboSearch Pro** su integruota XStore integracija.
7. Įskiepių sumažės: XStore pakeičia Shoptimizer, CommerceKit, Variation Swatches ir Ultimate Addons for Elementor (§5).

---

## 1. XStore funkcijos, kurias naudosime

### 1.1 Bazė ir builderiai

| Builderis | Kur konfigūruojama | Pastabos |
|---|---|---|
| **Header Builder (Elementor)** | XStore Dashboard → XStore Builders → Header Builder | Reikia **Elementor Pro arba PRO Elements**. Kiekvienas konteineris turi „sticky“ nustatymą atskirai Desktop/Tablet/Mobile. Yra **Overlap** (permatomas headeris) ir keli headeriai su rodymo sąlygomis ([doc](https://www.8theme.com/documentation/xstore/xstore-builders/new-xstore-header-builder-with-elementor/)). Demo `data-settings` rodo sticky tipus `custom`, **`smart`** (slepiasi slenkant žemyn, grįžta slenkant aukštyn) ir `stacked`. |
| Header Builder (Customizer) | Theme Options → Header Builder | Alternatyva be Elementor Pro: elementai „Promo text“, „Connection block“ ir kt.; Header Overlap & Transparent ([doc](https://www.8theme.com/documentation/xstore/troubleshooting/how-to-enable-header-overlap/)). Brandstore jau turi Elementor Pro, todėl renkamės Elementor variantą. |
| **Single Product Builder** | XStore Builders → Single Product Builder (Elementor) arba Theme Options → WooCommerce (Shop) → Single Product Builder | [doc](https://www.8theme.com/documentation/xstore/xstore-builders/xstore-single-product-builder-with-elementor/), [doc](https://www.8theme.com/documentation/xstore/woocommerce/single-product-page/) |
| **Products Archive Builder** | XStore Builders → Product Archive Builders → Builder → Products Archive → Add New | Produktams rodyti naudoti elementą **„Archive products“**, ne „Products Grid“ ([doc](https://www.8theme.com/documentation/xstore/xstore-builders/xstore-products-archive-builder-with-elementor/)) |
| Kiti builderiai | XStore Builders | Cart, Checkout (Advanced Cart & Checkout: Separated / Multistep / Classic), My Account, Search Results, 404, Footer, WooCommerce el. laiškų builderis ([landing](https://xstore.8theme.com/)) |
| **Static Blocks** | Dashboard → Static Block → Add New | Turinys mega meniu, dydžių lentelei ir Mobile Panel elementui „More“ |
| **XStudio** + Cross domain copy/paste | Elementor redaktoriuje | 900+ išdėstymų ir sekcijų iš visų demo, galima įterpti pavieniui ([landing](https://xstore.8theme.com/)) |

### 1.2 Headeris, navigacija, paieška, krepšelis

| Funkcija | XStore elementas / nustatymas | Kur / šaltinis |
|---|---|---|
| Viršutinė juosta su besikeičiančiais pranešimais | Customizer HB **„Promo text“** arba Elementor konteineris su **Marquee** ar **Slides** valdikliu | [forumas](https://www.8theme.com/topic/header-issues-promo-text-settings-and-sticky-header-not-working-correctly/) |
| Logotipas, meniu | Header valdikliai: Site Logo, **Nav Menu**, **Mega Menu**, **Departments Menu**, Mobile Menu | demo HTML: `theme-etheme_nav_menu`, `theme-etheme_mega_menu`, `theme-etheme_departments_menu` ([Electronic Mega Market](https://xstore.8theme.com/elementor3/electronic-mega-market/)) |
| **Mega meniu** | Appearance → Menus → **8theme Options**: Design „MegaMenu“, Columns, Column width, Widget area, meniu punkto paveikslėlis; turinys per **Static Block** (Elementor); header nustatymas **„Mega Menu Dropdown Full-Width“** (rekomenduojamas konteinerio plotis 1400 px) | [doc](https://www.8theme.com/documentation/xstore/menu-set-up/mega-menu/), [forumas](https://www.8theme.com/topic/elementor-and-static-block-mega-menu-issue/) |
| Mega meniu greitis | Theme Options → Speed Optimization → Menu Dropdown Ajax Loading, Menu Cache, Static Blocks Cache (redaguojant blokus laikinai išjungti) | [forumas](https://www.8theme.com/topic/mega-menu-static-block-not-showing-properly-on-website/) |
| **Ajax paieška** | Elementor valdikliai **„Ajax Search“** ir **„Ajax Search Popup“**. Nustatymai iš demo `data-settings`: Categories (kategorijų išskleidžiamasis sąrašas, dinaminis plotis), **Animated placeholder** (rotuojamas tekstas), **Trending searches** (sąrašas ir limitas), rezultatų antraštės **Headings / Tabs**, įrašų tipai (product, post, page), rodyti stock / category / price, turinys mobiliajame (image, title, price), iššokančio lango animacija | [Ajax Search demo](https://xstore.8theme.com/elementor/demos/minimal-fashion02/ajax-search-element/) |
| Paieškos papildomi nustatymai | Header Builder → Search: **Ajax Search History** (paskutinės paieškos, slapukas), How Many History Requests To Show, Search Results Limit, Search product variations, Search Extra content (full-width tipui), Search label, Search popup type for mobile; paieška pagal SKU; **Search Analytics**; Speed Optimization → Ajax search results cache | [changelog](https://xstore.8theme.com/change-log.php), [landing](https://xstore.8theme.com/) |
| Paskyra | Account valdiklis + Sales Booster „Account Login/Register Tabs“ | [Sales Booster](https://www.8theme.com/documentation/xstore/xstore-features/sales-booster/) |
| Norų sąrašas, palyginimas | Integruoti XStore Wishlist ir Compare; header elementas gali būti off-canvas | [landing](https://xstore.8theme.com/) |
| **Krepšelis (off-canvas)** | Header valdiklis „Cart“: off-canvas, `automatically_open_canvas: yes` (atsidaro įdėjus prekę), `linked_products: upsell` (rodo papildomus pasiūlymus) | demo `data-settings` ([Minimal Fashion 02](https://xstore.8theme.com/elementor/demos/minimal-fashion02/animated-headline-element/)) |
| Nemokamo pristatymo juosta | **XStore → Sales Booster → Progress bar**: Price for the count, progress message, success message. **Tik pagal sumą** | [doc](https://www.8theme.com/documentation/xstore/xstore-features/progress-bar/), [doc](https://www.8theme.com/documentation/xstore/xstore-features/cart-checkout-progress-bar/) |
| **Mobile Panel** (apatinė juosta) | Theme Options → **Mobile Panel**: Home, Shop, Cart, Wishlist, Account, Search, More / More 02 (gali rodyti Static Block), custom; **Show Labels** (skaitliukai), **Show Texts**; savos SVG ikonos | [doc](https://www.8theme.com/documentation/xstore/xstore-features/xstore-mobile-panel/), [changelog](https://xstore.8theme.com/change-log.php) |

### 1.3 XStore Elementor valdikliai, kuriuos naudosime

Valdiklių sąrašą skelbia [XStore landing](https://xstore.8theme.com/) („80+ / 100+ Elementor widgets“). Žemiau pateikti tie, kurių reikia mums, ir jų variantai, patikrinti demo puslapiuose.

| Valdiklis (slug) | Naudojimas Brandstore | Variantai / svarbūs nustatymai |
|---|---|---|
| **Products** / **Product Carousel** / **Product Grid** / **Product List** (`etheme_products`, `etheme_product_carousel`, `etheme_product_grid`, `etheme_product_list`) | Naujienos, išpardavimo karuselė, „Jums gali patikti“ | „Products Style 1-8“ ([demo](https://xstore.8theme.com/elementor/demos/minimal-fashion02/products-element/)), Image Hover Effects, Hover Color Scheme, **Overlay Content on image**, Box Shadow On Hover, swatches kortelėje, užklausa pagal kategoriją, žymą ir prekės ženklą, „on sale“ |
| **Ajax Products Tabs** | „Išpardavimas“: skirtukai Visi / Striukės / Rankinės / Avalynė; „Naujienos“: Moterims / Vyrams / Aksesuarai | Kiekvieno skirtuko turinys kraunamas Ajax būdu ([demo](https://xstore.8theme.com/elementor/demos/minimal-fashion02/ajax-products-tabs-element/)) |
| **Product Categories** (`etheme_categories`) + **Categories lists** | „Ko ieškote šiandien?“ plytelės, PLP kategorijų lustai | Carousel, Grid, Full Width, Banners, Rounded, Masonry 1/2, **Mouse Tilt Effect**; Circle Images ([demo](https://xstore.8theme.com/elementor/demos/minimal-fashion02/product-categories-element/)) |
| **Brands** (Brands Carousel, `etheme_brands`) | Prekių ženklų logotipų tinklelis | „Show only names“. Veikia **tik su XStore Brands** ([doc](https://www.8theme.com/documentation/xstore/woocommerce/differences-between-brands-from-the-woocommerce-plugin-and-from-xstore-theme-which-to-choose-and-how-to-disable-unnecessary-ones/)) |
| **Banner** / **Banner Carousel** | „Jai / Jam“, mega meniu akcijos plytelė, sezono kampanija | Hover efektai: **Zoom In, Zoom Out, Scale Out, Diagonal, Border Animation, Mouse Tilt**; Button on hover; content effect on hover ([demo](https://xstore.8theme.com/elementor/demos/minimal-fashion02/banner-element/)) |
| **Countdown** (`etheme-countdown`) | Išpardavimo laikmatis | Fiksuota pabaigos data; `show_empty_counter` |
| **Hotspot** (`etheme_hotspot`) | „Sukurkite įvaizdį“ (shop the look) | `tooltip_trigger` hover/click, prekės kortelė tooltip'e, suderinama su XStore Parallax ([demo](https://xstore.8theme.com/elementor/demos/minimal-fashion02/hotspot-element/)) |
| **Marquee** (`etheme_marquee`) | Prekių ženklų bėganti juosta | `animation_type` (pvz., `auto`) |
| **Slides** / **Slideshow** („XStore Slider“) | Atsiliepimų karuselė, kelių kadrų hero | effect `slide`, autoplay, pause on hover/interaction |
| **General Tabs**, **Content Switcher**, **Toggle Text** | Moterims / Vyrams / Vaikams perjungiklis | [doc](https://www.8theme.com/documentation/xstore/plugins/new-elementor-xstore-features/) |
| **Animated Headline** / **Advanced Headline** | Rotuojami žodžiai; tekstas su vaizdo kauke | Animated Headline tipai: clip, drop-in, flip, slide, slide-down, typing, wave, zoom, highlight ([demo](https://xstore.8theme.com/elementor/demos/minimal-fashion02/animated-headline-element/)). Advanced Headline: mask |
| **Horizontal Scroll** | Horizontaliai slenkantis „lookbook“ (Salient Sticky horizontal) | [demo](https://xstore.8theme.com/elementor/demos/minimal-fashion02/horizontal-scroll-element/) |
| **Flipbox**, **Testimonials**, **Icon Box**, **Icon List**, **Text Button**, **Lottie Animation**, **Scroll Progress**, **Modal Popup**, **Image Comparison**, **360° Product Viewer**, **Media Carousel**, **Instagram** | Pagal poreikį | [landing](https://xstore.8theme.com/) |

### 1.4 XStore Parallax ir judesio efektai (bet kurio valdiklio Advanced skirtukas)

- **XStore Parallax** ([changelog](https://xstore.8theme.com/change-log.php): „XStore Parallax effects in Elementor widgets (advanced tab)“). `data-settings` raktai: `etheme_parallax_type` = **`scroll_effects`** (X, Y, Z, Rotate, Scale, Perspective, Smoothness), **`floating_effects`** (translate, rotate ir scale su duration ir delay) bei `3d_hover_effects`. Demo puslapyje pademonstruoti Vertical, Horizontal, Rotate, Zoom, **Mouse Movement**, **Fixed Background** ir **3D** variantai ([demo](https://xstore.8theme.com/elementor/demos/minimal-fashion02/parallax-scrolling-effects/)).
- **XStore Sticky Content** (stulpelio Advanced skirtukas, atskirai Desktop/Tablet/Mobile). Tai Salient „Sticky media“ pagrindas ([doc](https://www.8theme.com/documentation/xstore/plugins/new-elementor-xstore-features/)).
- Content Animations (Zoom In, Fade In Up, Slide in up ir kt.), Floating Effects, Tooltip ([animacijų demo](https://xstore.8theme.com/elementor/demos/minimal-fashion02/animations/)).
- Alternatyva su Elementor Pro **Motion Effects**: Scrolling Effects (Vertical, Horizontal, Transparency, Blur, Rotate, Scale), Mouse Effects (Mouse Track, 3D Tilt), Sticky ([Elementor](https://elementor.com/help/motion-effects/)). Elementor 4.0 (2026 m. kovas) prideda **Interactions** su trigeriais load, scroll into view, hover ir click bei scroll-linked Start/End. Tai Pro funkcija ([Elementor developers](https://developers.elementor.com/elementor-editor-4-0-developers-update/)).

### 1.5 Prekės kortelė (archyvai, karuselės)

| Ko reikia (DESIGN-SPEC §4.5) | XStore nustatymas | Kelias / šaltinis |
|---|---|---|
| Kortelės išdėstymas | **Product Content Effect**: Default, Bottom (`mask`), Right (`mask2`), **Middle (`mask3`)**, Information (`info`), Light, Booking, **Overlay content on image** (`overlay`) | Theme Options → WooCommerce → Shop → Product style → Product Content Effect ([forumas](https://www.8theme.com/topic/how-to-change-quick-view-in-quick-shop/)). Reikšmės patikrintos [demo presetuose](https://xstore.8theme.com/product-category/all/?preset=effect_middle) |
| Antros nuotraukos hover | **Image hover effect: Swap** (arba Images Slider, Disable). Taip pat Hover Blur Effect, Box Shadow On Hover, Hover Color Scheme (white/dark) | [forumas](https://www.8theme.com/topic/i-want-product-image-slider/), [landing](https://xstore.8theme.com/) |
| Nuolaidos ženklelis `−54 %` | **Product badges**: Sale (procentais), New (dienų intervalas), Hot (Featured), Out of stock; spalva, forma, pozicija | Theme Options → WooCommerce → Shop Elements → Product badges ([doc](https://www.8theme.com/documentation/xstore/xstore-features/xstore-badges-on-products/)) |
| Dydžių lustai kortelėje, greitas įdėjimas | **Variation swatches** (Swatch design, shape, out-of-stock dizainas, Position kortelėje, išjungimas tik shop puslapyje). Įdėjimas į krepšelį iš tinklelio pasirinkus swatch; jei pasirinkta ne viskas, atsidaro langas su jau pažymėtais atributais („Open popup with selected swatches attributes“) | Theme Options → WooCommerce → Shop Elements → Variation swatches ([doc](https://www.8theme.com/documentation/xstore/woocommerce/variation-swatches-3/), [changelog](https://xstore.8theme.com/change-log.php)). **Veikia tik su globaliais atributais** |
| Greita peržiūra | **Quick View** (popup arba off-canvas; elementų pasirinkimas) | Theme Options → WooCommerce → Shop elements → Quick View ([forumas](https://www.8theme.com/topic/how-to-change-quick-view-in-quick-shop/)) |
| „Liko tik 3 vnt.“ | **Advanced Product stock**: Enable advanced stock (+ on archives). Rodo spalvotą likučio liniją (`stock-line`, step-1/2/3) | Theme Options → WooCommerce → Shop Elements → Advanced Product stock ([changelog](https://xstore.8theme.com/change-log.php)) |
| Prekės ženklas virš pavadinimo | Product brands on archives (option) | [changelog](https://xstore.8theme.com/change-log.php) |
| Krovimo būsena | **Seamless Loader Skeletons** | [doc](https://www.8theme.com/documentation/xstore/xstore-features/seamless-loader-skeletons/) |

### 1.6 Prekės puslapis (PDP)

- **Single Product Builder valdikliai**, rasti demo PDP: Product Images, Title, Price, Rating, Short Description, Add to Cart, **Size Guide**, Wishlist, Compare, Meta, Tabs, Breadcrumb, **Sales Booster Estimated Delivery**, **Sales Booster Safe Checkout**, Sales Booster Fake Live Viewing, Request a Quote, Product Carousel ([demo PDP](https://xstore.8theme.com/elementor/demos/minimal-fashion02/product/drawstring-shirt-dress-2/)).
- **Galerijos išdėstymai:** Vertical Gallery, Image right, Center Fixed Image, Fixed Image, Fixed content, Small, Large, Full Width Image, Booking design. Taip pat zoom, lightbox, **Product with video**, 360° viewer, **Variation Gallery** ([landing](https://xstore.8theme.com/)).
- **Skirtukai:** Left side tabs, **Accordion style tabs**, Reviews next to tabs, Tabs next to image; „Open all tabs“, „Collapsed reviews on mobile“ ([changelog](https://xstore.8theme.com/change-log.php)).
- **Sticky Description** ir **Sticky Add To Cart Bar**: Theme Options → WooCommerce → Single Product Builder → Add to Cart & Quantity ([forumas](https://www.8theme.com/topic/sticky-add-to-cart-button-on-product-page/)). Taip pat yra **Buy Now** mygtukas.
- **Size Guide:** tipas Popup arba Download, turinys iš **Static Block**, paveikslėlis kategorijai (Products → Categories → Edit Category) arba prekei (8theme Product Options) ([doc](https://www.8theme.com/documentation/xstore/xstore-features/xstore-size-guide-on-product-page/)).
- **Sales Booster** (XStore → Sales Booster, [doc](https://www.8theme.com/documentation/xstore/xstore-features/sales-booster/)):
  - **Estimated Delivery:** tekstas, days arba range tipas, min. ir maks. dienos, **Non-working Days**, pozicija, datos formatas; trumpasis kodas `[etheme_sales_booster_estimated_delivery]` ([doc](https://www.8theme.com/documentation/xstore/xstore-features/xstore-setup-booster-sales-estimate-delivery/)).
  - Safe & Secure Checkout, Quantity Discounts ([doc](https://www.8theme.com/documentation/xstore/xstore-features/how-to-setup-booster-sales-quantity-discounts/)), Cart/Checkout Countdown, Progress Bar, Review Images, Advanced Reviews, Request a Quote, Product Sold Counter, Fake Live Viewing, Fake Sale Popup.
  - **Linked Variations Products:** atskiri simple produktai susiejami pagal spalvą ar dydį. Veikia **tik su simple tipo produktais** ([doc](https://www.8theme.com/documentation/xstore/xstore-features/linked-variations-products-link-separate-products-together-by-size-color-and-more/)).
  - **Frequently Bought Together** (nustatoma redaguojant prekę), **Product Countdown Timer** (suplanuotai akcijai), Waitlist (Back-in-Stock), Recently Viewed, Cross-sells iššokantis langas po „Į krepšelį“ ([landing](https://xstore.8theme.com/)).

### 1.7 Prekių sąrašas (PLP) ir filtrai

- **Pagination Type:** Pagination / **Load More** / Infinite scroll. Kelias: Theme Options → WooCommerce → Shop → Shop page layout → Pagination Type ([forumas](https://www.8theme.com/topic/i-cant-turn-on-infinite-scrolling-on-the-store-page-2/)).
- **Filtrų išdėstymas:** Vertical, Horizontal arba **Off-Canvas Product Filters** ([landing](https://xstore.8theme.com/)). Archive builderyje filtrų skydelis yra Elementor off-canvas (`etheme-elementor-off-canvas`).
- **Filtrų valdikliai** (rasti demo shop puslapiuose): **8theme - Swatches filter** (dydis, spalva), **Product categories filter** (Ajax), **Filter Products by Brands** (su „Display type“), **Price filter**, **Product Status Filters** (on sale, in stock), **Active Product Filters** (su „Clear All“), **Apply All Filters** (mobiliajam). Papildomos parinktys: „Show More Filters After“, **„Search for Filters“** (paieška filtro sąraše, svarbu 78 prekių ženklams), „Scroll To Top After Ajax Product Filters“, valdiklių suskleidimas tik mobiliajame ([Minimal Fashion 02 shop](https://xstore.8theme.com/elementor/demos/minimal-fashion02/shop/), [Minimal Fashion 03 shop](https://xstore.8theme.com/elementor/demos/minimal-fashion03/shop/), [changelog](https://xstore.8theme.com/change-log.php)).
- Tinklelio ir sąrašo perjungiklis, stulpelių skaičius, **Small categories menu**, **Product categories search** (Ajax kategorijų tinklelis), Shop banner, Archive Breadcrumbs ([Electronic Mega Market shop](https://xstore.8theme.com/elementor3/electronic-mega-market/shop/), [Grocery Mega Market shop](https://xstore.8theme.com/elementor3/grocery-mega-market/shop/)).

### 1.8 Kurį demo importuoti

| Demo | Kodėl tinka Brandstore | Ką imti |
|---|---|---|
| **Fashion01** ★ ([žiūrėti](https://xstore.8theme.com/elementor3/fashion01/)) | Naujausias mados demo (įkelti failai 2025-10/11), minimalistinė prabanga: headeris su plačia paieška, pasitikėjimo juosta, „trending“ karuselė su sale ženkleliais, apvalios kategorijos, banneriai, prekių ženklų karuselė. Valdikliai: Banner, Product Carousel, Categories, Brands | **Visas importas** kaip globalių stilių, headerio, footerio ir pagrindinio puslapio karkasas |
| **Minimal Fashion 02** ([žiūrėti](https://xstore.8theme.com/elementor/demos/minimal-fashion02/)) | XStore „vitrina“: kiekvienam elementui skirtas puslapis; PDP su Size Guide, Estimated Delivery ir Safe Checkout; shop su swatches, Brands ir Status filtrais, Swap hover | PDP ir PLP šablonai, pavieniai blokai per XStudio |
| **Electronic Mega Market** / **Grocery Mega Market** | Didelio katalogo navigacija: Mega Menu + Departments Menu, Ajax kategorijų tinklelis, paieška filtruose, Small categories menu, Animated Search Line | Tik struktūra (headeris, PLP), ne vizualinis stilius |
| **Luxury Jewelry** ([žiūrėti](https://xstore.8theme.com/elementor2/luxury-jewelry/)) | Prabangi nuotaika: Flipbox, Hotspot, Slides, Countdown, Brands | Akcijų ir „lookbook“ blokai |
| **Minimal Fashion 03** | Off-canvas filtrų shop išdėstymas | PLP filtrų skydelis |

Rekomendacija: testinėje aplinkoje importuoti **vieną** pilną demo (Fashion01), o kitus blokus įkelti per XStudio. Keli pilni importai užteršia duomenų bazę demo prekėmis ir meniu.

---

## 2. Salient efektai → XStore / Elementor atitikmenys

Žymėjimas: **N** = natyviai XStore arba Elementor; **B** = beveik natyviai (natyvūs valdikliai ir keli CSS nustatymai); **F** = mažas fragmentas vaikinėje temoje (`xstore-child`).

| Salient elementas (kaip veikia) | XStore / Elementor atitikmuo | Papildomai | |
|---|---|---|---|
| **Split Line Heading / Animated Text**: žodžiai ar eilutės iškyla iš už kaukės, blur, fade, rotate, twist, raidės, „scroll opacity“ ([doc](https://themenectar.com/docs/salient/animated-text/)) | XStore Animated Headline turi tik žodžių keitimo tipus. Elementor 4 Interactions (Pro) animuoja visą elementą, ne eilutes | **F:** GSAP **SplitText** + ScrollTrigger (nuo 3.13 nemokami, [GSAP](https://gsap.com/blog/3-13/)) arba CSS `animation-timeline: view()` ([caniuse](https://caniuse.com/mdn-css_properties_animation-timeline_view)). Klasė `.bs-split` ant Heading valdiklio, apie 25 eilutes JS. Gerbti `prefers-reduced-motion` | F |
| **Fancy Box**: Bottom Color Bar, Color Box, **Parallax Hover**, **Description on Hover**, Image Above Text ([doc](https://themenectar.com/docs/salient/fancy-box/)) | **XStore Banner**: Zoom In/Out, Scale Out, Diagonal, Border Animation, **Mouse Tilt** (atitinka Parallax Hover), **content effect on hover** ir **Button on hover** (atitinka Description on Hover) | Nieko | N |
| **Flip Box** ([doc](https://themenectar.com/docs/salient/flip-box/)) | **XStore Flipbox** (arba Elementor Pro Flip Box) | Mobiliajame vartosi palietus, naudoti saikingai | N |
| **Image With Hotspots**: plus arba numeriai, hover, click arba visada rodomi ([doc](https://themenectar.com/docs/salient/image-with-hotspots/)) | **XStore Hotspot**: tooltip'e gali būti **prekės kortelė** (galingiau nei Salient), `tooltip_trigger` hover/click | Mobiliajame naudoti click | N |
| **Sticky Content Sections**: sticky media + slenkantis turinys, prisegamos sekcijos, horizontalus slinkimas, sluoksniuotos kortelės ([doc](https://themenectar.com/docs/salient/sticky-content-sections/)) | **XStore Sticky Content** stulpeliui + slenkantis stulpelis; **XStore Horizontal Scroll**; Elementor Pro Sticky („Stay in column“) | Sluoksniuotos kortelės: `position: sticky` su skirtingu `top` (apie 10 eilučių CSS) | N/B |
| **Scrolling Tabs** („Vertical Sticky Scrolling“) ([doc](https://themenectar.com/docs/salient/tabs/)) | **XStore General Tabs** (vertikalūs) lipniame stulpelyje arba Elementor Nested Tabs | **F:** IntersectionObserver „scrollspy“, apie 20 eilučių | B |
| **Parallax rows** (Subtle…Fixed), **Mouse-based parallax scene**, fono animacijos Zoom Out Reveal ir Clip Path Inset ([doc](https://themenectar.com/docs/salient/page-builder-row/)) | **XStore Parallax**: Scroll effects Y, Fixed Background, Mouse Movement, Zoom (Scale); Elementor Pro konteinerio Background → Motion Effects | Clip-path reveal: CSS `animation-timeline: view()` su atsargine būsena | N |
| **Nectar Slider su video** (fonas image arba video, parallax pagal slinkimą) ([doc](https://themenectar.com/docs/salient/nectar-slider-plugin/)) | Elementor konteinerio **Background Type: Video** (savo MP4, Background Fallback, „Play On Mobile“ išjungta) + XStore Parallax tekstui; keliems kadrams XStore Slides | Slider Revolution yra XStore pakete, bet per sunkus hero blokui. Nenaudoti | N |
| **Scrolling Text**: bėganti juosta, priešinga kryptis, outline, fono vaizdas tekste ([doc](https://themenectar.com/docs/salient/scrolling-text/)) | **XStore Marquee** | CSS: `-webkit-text-stroke` (outline), `background-clip: text`; dvi eilės priešingomis kryptimis | N+CSS |
| **Cascading Images**: iki 4 sluoksnių su poslinkiu, posūkiu ir mastelio keitimu, atsiranda paeiliui ([doc](https://themenectar.com/docs/salient/cascading-images/)) | 3-4 Image valdikliai su Elementor Position: Absolute + entrance animacijos su delay + XStore Parallax (skirtingas Y greitis) arba Floating effects | Šešėliai per Custom CSS | B |
| **Video Lightbox**: play mygtuko stiliai, sekantis pelę indikatorius, Zoom BG ([doc](https://themenectar.com/docs/salient/video-lightbox/)) | Elementor Video valdiklis su Image Overlay + Lightbox (nemokama versija) arba XStore Modal Popup | Pulsuojantis mygtukas: CSS keyframes | N |
| **Morphing Outline**: rėmelis aplink žodį keičia formą per hover ([doc](https://themenectar.com/docs/salient/morphing-outline/)) | Atitikmens nėra | **F:** CSS `::after` + `border-radius` keyframes arba SVG kelias, apie 15 eilučių | F |
| **Animated Title / Rotating Words** | **XStore Animated Headline** (typing, clip, flip, slide, zoom, wave, drop-in) / Elementor Pro Animated Headline | Nieko | N |
| **Page Transitions** (Fade, Gradient Wipe, Reveal From Bottom; View Transitions API) ([Salient 17](https://themenectar.com/salient/salient-17-a-deep-dive-into-all-the-new-design-performance-workflow-tools/)) | Elementor Pro Site Settings → **Page Transitions** su preloaderiu ([Elementor](https://elementor.com/help/page-transitions/)) | **F (rekomenduojama):** 3 eilutės CSS `@view-transition { navigation: auto; }` (Chrome 126+, Safari 18.2+, Firefox iš dalies, [caniuse](https://caniuse.com/cross-document-view-transitions)). Nenaudoti cart ir checkout puslapiuose | F |
| **Text With Inline Media**: mažos nuotraukos ar video antraštės eilutėje, Scroll Reveal, Circle Mask Reveal ([doc](https://themenectar.com/docs/salient/text-with-inline-media/)) | Elementor Heading su HTML `<span class="bs-inline-media"><img …></span>` | **F:** CSS dydžiui, apvalinimui ir atsiradimui | F |
| **Smooth scrolling (Lenis)**, Salient 17 | XStore jo neturi | **F:** Lenis tik desktop, su išimtimis (§4.3) | F |
| **Content Trail**, **Dynamic Background Colors** (Salient 18) | Nėra | Neprivaloma; IntersectionObserver keičia CSS kintamąjį. Demo nereikia | F |

---

## 3. Sekcija → elementas (pagal DESIGN-SPEC)

### 3.1 Globalūs komponentai

| DESIGN-SPEC | XStore įgyvendinimas | Fragmentai / pastabos |
|---|---|---|
| 4.1 Viršutinė juosta | Header Builder: viršutinis konteineris + **Slides** (fade, autoplay 5 s, pause on hover) arba Customizer „Promo text“ | Kairėje ir dešinėje: Icon List |
| 4.2 Headeris (overlay → solid → kompaktiškas) | Elementor Header Builder: 2 konteineriai; **Overlap** pagrindiniam puslapiui; **Sticky tipas `smart`** antrai eilutei (slepiasi slenkant žemyn) | Logotipo inversija ir `backdrop-filter`: Custom CSS ant sticky būsenos klasės (`etheme-elementor-header-sticky`) |
| 4.3 Mega meniu Moterims / Vyrams / Vaikams | **Mega Menu** valdiklis + **Static Block** (3 nuorodų stulpeliai, „Populiarūs prekių ženklai“, akcijos plytelė su **Banner** Zoom Out); „Mega Menu Dropdown Full-Width“ | Kategorijų kiekiai: dinaminis tag arba statinis tekstas |
| 4.3 Prekių ženklų skydelis su A-Z ir paieška | Static Block su **Brands** (Show only names) arba Elementor Loop | **F:** apie 30 eilučių JS filtrui be diakritikų jautrumo (A-Z indeksas). XStore to neturi |
| 4.4 Nuspėjamoji paieška | **Ajax Search** su Categories, **Trending searches** („Populiarios paieškos“), **Ajax Search History** („Naujausi“), **Animated placeholder**, Results heading **Tabs** | Prekių ženklai ir kategorijos rezultatuose bei „rankines“ → „Rankinės“ paieška be diakritikų: patikimiau su **FiboSearch Pro** (§5) |
| 4.5 Prekės kortelė | Product Content Effect **Middle (`mask3`)** arba **Overlay content on image** + **Image hover: Swap** + Product badges (Sale %) + Variation swatches kortelėje (dydžiai) + Quick View off-canvas + Wishlist | „Greitai į krepšelį“ skydelis, išslystantis iš apačios: swatches pozicija + CSS `transform`. Įdėjus atsidaro krepšelio stalčius (`automatically_open_canvas`) |
| 4.6 Karuselė | **Product Carousel** (Swiper; `slides_per_view`, navigation arrows) | Progreso linija: Swiper `scrollbar` per CSS |
| 4.7 Krepšelio stalčius | Header **Cart** off-canvas + upsell | **F:** nemokamo pristatymo žinutė pagal **kiekį** (§4.6) vietoje Sales Booster Progress bar |
| 4.8 Quick view, norų sąrašas | **Quick View** (off-canvas arba popup), XStore Wishlist | Nieko |
| 4.9 Footeris | Footer Builder | Mokėjimo ženklai: Icon List / Image |
| 4.10 Mobilusis | **Mobile Panel** (Home, Shop/Kategorijos, Search, Wishlist, Cart; Show Labels) + Mobile Menu (off-canvas) | PDP puslapyje paslėpti Mobile Panel, nes ten rodoma Sticky Add To Cart Bar |

### 3.2 Pagrindinis puslapis (DESIGN-SPEC §5)

| # | Sekcija | XStore / Elementor | Salient įkvėpimas | Pastabos |
|---|---|---|---|---|
| 1 | Hero su video | Elementor konteineris, Background Video (MP4, Background Fallback = poster) + XStore Parallax (Y, Scale) tekstui; 3 Text Button | Nectar Slider, Split Line Heading | Antraštei `.bs-split` (F). Video mygtukas „pause“: mažas JS. Poster turi būti LCP (§4.1) |
| 2 | Pasitikėjimo juosta | **Icon List** (horizontalus) arba Icon Box | Nėra | Nieko |
| 3 | „Ko ieškote šiandien?“ | **General Tabs** (Moterims / Vyrams / Vaikams) → kiekviename **Product Categories** (Carousel, Mouse Tilt) | Fancy Box | Kiekiai iš kategorijų (count) |
| 4 | Išpardavimas (tamsus blokas) | Konteineris su XStore Parallax fonu + **Countdown** + 3 **Banner** (−30 / −50 / −70 %, Border Animation hover) + **Ajax Products Tabs** (on sale, kategorijų skirtukai) | Parallax row, Scrolling Text | Nuolaidos lygiams reikia žymų arba atributo (§4.6). Countdown tik su tikra akcijos pabaiga |
| 5 | Mėnesio pasiūlymas | **Products** (1 prekė, style su stock line) arba Elementor Pro Loop Grid + **Countdown** + Advanced Product stock | Sticky media | XStore neturi atskiro „spotlight“ valdiklio. Jei produktui suplanuota akcija, galima naudoti **Product Countdown Timer** |
| 6 | Jai / Jam | 2 **Banner** (Zoom Out + content effect on hover, mygtukai rodomi per hover) + XStore Parallax (Y) vidiniam vaizdui | Fancy Box (Description on Hover) | Mobiliajame nuorodos visada matomos (CSS) |
| 7 | Naujienos | **Ajax Products Tabs** (Moterims / Vyrams / Aksesuarai) + vienas aukštas **Banner** tinklelio langelis | Nėra | Įvairovė (ne daugiau kaip 2 prekės nuo vieno ženklo): rankinis prekių parinkimas arba „orderby rand“ |
| 8 | Įvaizdis (shop the look) | **Hotspot** (3 taškai, prekių tooltip, click mobiliajame) + **Product List** (3 prekės) + **Frequently Bought Together** logika | Image With Hotspots | Mygtukas „Visą įvaizdį į krepšelį“: FBT valdiklis arba nedidelis fragmentas |
| 9 | Prekių ženklai | **Marquee** (pavadinimai Bodoni, outline) + **Brands** (pilki logotipai, spalvoti per hover) | Scrolling Text | Brands reikalauja XStore Brands (§4.6) |
| 10 | Sezono kampanija | Pilno pločio **Banner** + XStore Parallax **Zoom** (Scale 1.18 → 1) arba Elementor Pro Scrolling Effects → Scale | Parallax row, Zoom Out Reveal | Nieko |
| 11 | Kodėl Brandstore | Kairysis stulpelis su **XStore Sticky Content** ir vaizdu, dešiniajame Counter (Elementor) + Icon List | Sticky Content Sections | Skaičiai iš realių duomenų |
| 12 | Atsiliepimai | **Testimonials** arba **Slides** | Testimonial Slider | Tikri 7 atsiliepimai |
| 13 | Naujienlaiškis | **Omnisend** forma (įskiepis jau įdiegtas) Elementor konteineryje | Nėra | Ne MailPoet: svetainė jau naudoja Omnisend |

### 3.3 Išpardavimo / kategorijos sąrašas (DESIGN-SPEC §6)

| Dalis | XStore |
|---|---|
| Puslapio viršus (breadcrumbs, H1, kiekis, parallax juosta) | Archive Builder: Breadcrumb, Archive Title, Result Count; konteineris su XStore Parallax fonu |
| Kategorijų lustai ir lyties segmentas | **Product Categories** (Rounded arba Categories lists) / **Small categories menu**; lyties segmentas: Text Button nuorodos su URL parametrais |
| Kairysis lipnus filtrų stulpelis | Stulpelis su **XStore Sticky Content**. Valdikliai: Nuolaida (atributo filtras `pa_nuolaida`, §4.6), **Filter Products by Brands** + **Search for Filters**, **Product categories filter**, Dydis (**8theme - Swatches filter**, label), Spalva (Swatches filter, color), **Price filter**, **Product Status Filters** (in stock) |
| Aktyvūs filtrai, „Išvalyti visus“, rikiavimas, tankis | **Active Product Filters** (Clear All), WooCommerce ordering (Ajax), grid switcher (2/3/4) |
| „Didžiausia nuolaida“ rikiavimas | **F:** `orderby=discount` pagal meta laukelį `_bs_discount` (§4.6) |
| Tinklelis | **Archive products** su ta pačia kortele (§3.1) |
| „Rodyti daugiau“ (Rodoma 24 iš 46) | **Pagination Type: Load More** + Seamless Loader Skeletons. Rodomų prekių skaitliukas: mažas CSS/JS |
| Mobilusis: filtrų apatinis lapas su „Rodyti N prekių“ | **Off-Canvas Product Filters** + **Apply All Filters** |

### 3.4 Prekės puslapis (DESIGN-SPEC §7)

| Dalis | XStore |
|---|---|
| Galerija (vertikalios miniatiūros, zoom, lightbox, mobiliajame swipe) | **Product Images**: Vertical Gallery, zoom, lightbox; Product with video |
| Lipnus informacijos stulpelis | **Sticky Description** arba XStore Sticky Content stulpeliui |
| Prekės ženklas, H1, kaina, `−78 %`, „Sutaupote“, Omnibus | Meta / Brand, Title, **Price** + Product badges. **F:** „Sutaupote X €“ ir Omnibus eilutė per įskiepį (§5) |
| Spalva ir dydžiai | **Variation swatches** (color, label; out-of-stock perbrauktas); kitos spalvos kaip atskiros prekės: **Linked Variations** (tik simple produktams) |
| Dydžių lentelė | **Size Guide** (Popup, Static Block; paveikslėlis kategorijai: drabužiai IT/EU/INT, avalynė EU/UK/cm) |
| Likutis | **Advanced Product stock** („Liko tik N vnt.“) |
| Numatomas pristatymas | **Sales Booster → Estimated Delivery** (range 3-6 d., Non-working Days: šeštadienis, sekmadienis) |
| Pasitikėjimo eilutė, mokėjimai | **Safe & Secure Checkout** + Icon List |
| Į krepšelį + norų sąrašas | **Add to Cart** + **Wishlist** (be Buy Now, kad būtų paprasčiau) |
| Akordeonai | **Tabs → Accordion style tabs** (Aprašymas atidarytas) |
| Lipni pirkimo juosta | **Sticky Add To Cart Bar** |
| „Užbaikite įvaizdį“ | **Frequently Bought Together** (rankiniu būdu) arba Cross-sells |
| „Daugiau iš {brand}“, „Jums gali patikti“, „Neseniai žiūrėtos“ | Products (užklausa pagal prekės ženklą), Related **Product Carousel**, **Recently Viewed** |

### 3.5 DESIGN-SPEC terminų pataisos (kad komentarai demo kode atitiktų XStore)

- „Advanced Tabs“ → **General Tabs** (turinio skirtukai) arba **Ajax Products Tabs** (prekių skirtukai).
- „Image Hotspot“ → **Hotspot**. „Text scroller“ → **Marquee**. „Buy together“ → **Frequently Bought Together**.
- „XStore single product widget“ → tokio nėra. Naudoti **Products** (1 prekė) arba Elementor Pro **Loop Grid** + **Countdown**.
- „Sales Booster free-shipping bar“ → XStore juosta skaičiuoja tik **sumą**; Brandstore „2+ prekės“ taisyklei reikia fragmento.
- „Elementor form / MailPoet“ → **Omnisend** forma.
- Hero → Elementor **Background Video** (XStore Slides video fono nedemonstruoja).

---

## 4. Ribojimai ir našumas

### 4.1 Hero video svoris ir LCP
- LCP gerai, kai ≤ **2,5 s** (75-asis procentilis). `<video>` atveju skaičiuojamas **poster arba pirmas kadras**, žiūrint kuris ankstesnis ([web.dev](https://web.dev/articles/lcp)).
- Video: 1280×720, H.264 MP4, 8-12 s ciklas, be garso, **≤ 3 MB** (papildomai galima WebM). Mobiliajame rodyti tik poster (Elementor „Play On Mobile“ išjungtas) arba vertikalų ≤ 1,5 MB variantą. **Nenaudoti YouTube fono:** sunkus ir mobiliajame negroja automatiškai ([Salient doc](https://themenectar.com/docs/salient/page-builder-row/) aprašo tą patį ribojimą).
- Poster: AVIF/WebP ≤ 150 KB. Elementor fallback yra **CSS fonas**, kurio naršyklė anksti neranda, todėl jį reikia **preload'inti** su `fetchpriority="high"`. LCP vaizdo **niekada** nekrauti lazy būdu ([web.dev](https://web.dev/articles/optimize-lcp)). XStore nustatymuose: Speed Optimization → Image loading offset, išimtis pirmam ekranui.

### 4.2 Parallax mobiliuosiuose
- `background-attachment: fixed` iOS Safari palaikomas tik iš dalies ir mobiliuosiuose vėluoja ([caniuse](https://caniuse.com/background-attachment)). Fixed parallax mobiliajame **išjungti**.
- Elementor Pro efektams naudoti „Apply Effects On: Desktop (Tablet)“. XStore Parallax įrenginių valdiklį patikrinti testinėje aplinkoje. Jei jo nėra, efektą išjungti CSS media query (`transform: none !important` žemiau 1024 px).
- Viename ekrane ne daugiau kaip 2-3 parallax sluoksniai, animuoti tik `transform` ir `opacity`. Vienas globalus `prefers-reduced-motion` jungiklis išjungia XStore Parallax, Marquee, Lenis ir automatinį video.

### 4.3 Lenis (smooth scroll) su WooCommerce
- Lenis 1.3.26: įdėtiems slinkimo konteineriams būtini `data-lenis-prevent` atributai, modaliniams langams `lenis.stop()` ir `start()`. `syncTouch` pagal nutylėjimą false (lietimui paliekamas natūralus slinkimas). **iframe** praranda pelės ratuko įvykius, CSS `scroll-snap` nepalaikomas, Safari ribojamas iki 60 fps ([Lenis](https://github.com/darkroomengineering/lenis)).
- XStore elementai, kuriems reikia `data-lenis-prevent`: off-canvas krepšelis, filtrai ir meniu (`.etheme-elementor-off-canvas__main`, `…_content`), Quick View, mega meniu skydeliai, paieškos rezultatai. Jiems atsidarius kviesti `lenis.stop()`.
- Lenis **neįjungti** cart, checkout ir my-account puslapiuose (mokėjimų iframe, Google Pay ar Apple Pay langai), ir neįjungti lietimo įrenginiuose. Inkarų nuorodoms nurodyti `offset` pagal sticky headerio aukštį.
- Rekomendacija klientui: Lenis yra „wow“ efektas demo versijai. Produkcijoje jį įjungti tik pagrindiniame ir kampanijų puslapiuose desktop'e, kai bus atlikti testai.

### 4.4 CWV kontrolinis sąrašas XStore svetainei
- Šriftai: Bodoni Moda + Geist talpinti savame serveryje (latin-ext), ne daugiau kaip 2 šeimos, `font-display: swap`.
- Pirma prekių eilė krauti iš karto (eager), kitos lazy. Kortelėms nurodyti `width` ir `height` (CLS).
- XStore 9.5 (2026-05-12) skelbia iki 40 % mažesnes CPU ir atminties sąnaudas ([8theme atsakymas](https://etheme.userjot.com/board/p/please-speed-up-the-theme-2)). Vis dėlto reikia įjungti Speed Optimization talpyklas (Ajax search results cache, Static Blocks cache, Menu cache) ir objektų talpyklą (Redis, jei hostingas leidžia).

### 4.5 Katalogo mastas (11 310 prekių)
- Vartotojai skundžiasi lėtais kategorijų filtrais **7 000+ prekių** kataloguose ([userjot](https://etheme.userjot.com/board/p/please-speed-up-the-theme-2)). **Testinėje aplinkoje** su pilnu katalogu išmatuoti filtro atsako laiką. Jei jis viršija apie 1 s, pereiti prie indeksuojamo filtro (FacetWP).
- Paieška per 11 000+ prekių ir variacijų: **FiboSearch Pro** (indeksas, XStore integracija vienu žymimuoju langeliu: „Replace all XStore search bars with FiboSearch“, [FiboSearch](https://fibosearch.com/documentation/themes-integrations/xstore-theme/)). Testuoti lietuviškus diakritikus („rankines“ → „Rankinės“).

### 4.6 Duomenų paruošimas (būtina prieš XStore)
- **Atributų dublikatai.** Store API rodo `pa_color` ir `pa_spalva`, `pa_size` ir `pa_dydis`. Prieš įjungiant swatches ir filtrus juos reikia sujungti į vieną spalvos ir vieną dydžio atributą (swatches veikia **tik su globaliais atributais**).
- **Spalvų pavadinimai itališki** („Bianco“, „Nero“). Reikia susieti su lietuviškais pavadinimais ir hex reikšmėmis swatch spalvai.
- **Prekių ženklai.** Dabar naudojami WooCommerce Brands (`/brand/calvin-klein/`), o XStore Brands karuselė ir Brands filtras veikia **tik su XStore Brands** ([doc](https://www.8theme.com/documentation/xstore/woocommerce/differences-between-brands-from-the-woocommerce-plugin-and-from-xstore-theme-which-to-choose-and-how-to-disable-unnecessary-ones/)). 78 ženklų katalogui filtras pagal ženklą yra esminis, todėl rekomenduojama **migruoti** į XStore Brands (skriptas perkelia terminus ir logotipus, `/brand/…` adresams 301 peradresavimai) ir išjungti WC Brands.
- **Nuolaidos lygiai.** WooCommerce negali užklausti pagal nuolaidos procentą. **F:** išsaugant prekę (`save_post_product`) apskaičiuoti didžiausią nuolaidą per variacijas, įrašyti `_bs_discount` (rikiavimui) ir priskirti globalų atributą `pa_nuolaida` (30+, 50+, 70+; filtrams) bei žymą (Ajax Products Tabs užklausoms). Esamoms prekėms vienkartinis WP-CLI paleidimas.
- **Nemokamas pristatymas nuo 2 prekių.** XStore Progress bar ir Cart/Checkout Progress Bar palaiko **tik sumą** ([doc](https://www.8theme.com/documentation/xstore/xstore-features/cart-checkout-progress-bar/)). **F:** apie 20 eilučių PHP mini krepšelyje ir krepšelyje (`WC()->cart->get_cart_contents_count()`). Pristatymo taisyklę WooCommerce Shipping nustatymuose aprašyti pagal kiekį.

### 4.7 Teisiniai ribojimai (ES / LT)
- **Omnibus** (Direktyva 2019/2161, 98/6/EB 6a str.): skelbiant nuolaidą, ankstesnė kaina turi būti **mažiausia per 30 d. iki nuolaidos**. Nuolaidų parduotuvei tai privaloma. Sprendimas: įskiepis, pvz., [Omnibus — show the lowest price](https://wordpress.org/plugins/omnibus/).
- **Tamsieji šablonai (dark patterns):** Europos Komisijos patikra rado manipuliacijas 148 iš 399 e. parduotuvių, iš jų 42 naudojo netikrus laikmačius ([EK, 2023-01-30](https://ec.europa.eu/commission/presscorner/detail/en/ip_23_418)). Todėl **išjungti** Fake Live Viewing, Fake Sale Popup ir netikrą Sold Counter. Countdown naudoti tik su tikra akcijos pabaigos data, likutį rodyti tik tikrą (dabar rodomas „Liko N“).

### 4.8 Elementor 4
- XStore valdikliai yra „v3“ tipo. Elementor 4 leidžia hibridinį režimą, kai v3 valdikliai ir Atomic elementai naudojami viename puslapyje ([Elementor](https://developers.elementor.com/elementor-editor-4-0-developers-update/)). Atomic elementų kol kas nenaudoti. XStore 9.7.8 ištaisė suderinamumą su Elementor 4.2.3 ([ThemeForest changelog](https://themeforest.net/item/xstore-responsive-woocommerce-theme/15780546)). Prieš atnaujinant Elementor būtina testuoti testinėje aplinkoje.

---

## 5. Rekomenduojami įskiepiai (kuo mažiau)

| Statusas | Įskiepis | Kodėl |
|---|---|---|
| Būtinas | WooCommerce | Pagrindas |
| Būtinas | XStore + **XStore Core** (paketas) | Tema, builderiai, Sales Booster, swatches, wishlist, compare, filtrai, mega meniu, Mobile Panel |
| Būtinas | Elementor + **Elementor Pro** (jau turima licencija) | Header Builder reikalauja Pro; Theme Builder sąlygos, Loop Grid, Motion Effects |
| Rekomenduojamas | **FiboSearch Pro** | Indeksuota paieška 11 000+ prekių, kategorijos ir ženklai rezultatuose, integracija su XStore |
| Rekomenduojamas | **Omnibus** (mažiausia 30 d. kaina) | Teisinis reikalavimas |
| Rekomenduojamas | Vienas spartinimo įskiepis: **LiteSpeed Cache** (jei LiteSpeed serveris) arba **WP Rocket** | Puslapių talpykla, kritinis CSS, LCP preload, AVIF/WebP |
| Palikti | Rank Math Pro, Omnisend, vienas sekimo sprendimas (GTM4WP **arba** PixelYourSite), slapukų sutikimo platforma su Google Consent Mode v2 | Jau naudojami. XStore „Cookies & GDPR“ pranešimo Consent Mode v2 reikalavimams nepakanka |
| Tik jei reikės | FacetWP | Jei XStore Ajax filtrai su 11 000 prekių per lėti |
| Pašalinti | Shoptimizer (+ child), **CommerceKit**, **Variation Swatches for WooCommerce**, **Ultimate Addons for Elementor** | Jų funkcijas (Ajax paieška, swatches, wishlist, waitlist, sticky ATC, pristatymo pranešimas, valdikliai) atlieka XStore |
| Neaktyvuoti | Slider Revolution ir kiti XStore „premium“ paketo įskiepiai | Nereikalingas svoris |

**Fragmentai vaikinėje temoje (be įskiepių):** (1) nemokamo pristatymo žinutė pagal kiekį; (2) `_bs_discount`, `pa_nuolaida` ir rikiavimas „Didžiausia nuolaida“; (3) „Sutaupote X €“; (4) `.bs-split` eilučių atsiradimas (GSAP SplitText arba CSS); (5) Morphing outline ir inline media CSS; (6) `@view-transition` CSS; (7) `prefers-reduced-motion` jungiklis ir (pasirinktinai) Lenis desktop'ui; (8) prekių ženklų A-Z filtras mega meniu.

---

## Šaltiniai

- XStore: [landing ir funkcijų sąrašas](https://xstore.8theme.com/) · [versija 9.7.9](https://www.8theme.com/woocommerce-themes/xstore/) · [ThemeForest changelog](https://themeforest.net/item/xstore-responsive-woocommerce-theme/15780546) · [senesnis changelog su tiksliais nustatymų pavadinimais](https://xstore.8theme.com/change-log.php) · [Header Builder](https://www.8theme.com/documentation/xstore/xstore-builders/new-xstore-header-builder-with-elementor/) · [Single Product Builder](https://www.8theme.com/documentation/xstore/xstore-builders/xstore-single-product-builder-with-elementor/) · [Products Archive Builder](https://www.8theme.com/documentation/xstore/xstore-builders/xstore-products-archive-builder-with-elementor/) · [Sales Booster](https://www.8theme.com/documentation/xstore/xstore-features/sales-booster/) · [Progress bar](https://www.8theme.com/documentation/xstore/xstore-features/progress-bar/) · [Cart/Checkout Progress Bar](https://www.8theme.com/documentation/xstore/xstore-features/cart-checkout-progress-bar/) · [Estimated Delivery](https://www.8theme.com/documentation/xstore/xstore-features/xstore-setup-booster-sales-estimate-delivery/) · [Quantity Discounts](https://www.8theme.com/documentation/xstore/xstore-features/how-to-setup-booster-sales-quantity-discounts/) · [Mobile Panel](https://www.8theme.com/documentation/xstore/xstore-features/xstore-mobile-panel/) · [Mega Menu](https://www.8theme.com/documentation/xstore/menu-set-up/mega-menu/) · [Size Guide](https://www.8theme.com/documentation/xstore/xstore-features/xstore-size-guide-on-product-page/) · [Linked Variations](https://www.8theme.com/documentation/xstore/xstore-features/linked-variations-products-link-separate-products-together-by-size-color-and-more/) · [Badges](https://www.8theme.com/documentation/xstore/xstore-features/xstore-badges-on-products/) · [Variation Swatches](https://www.8theme.com/documentation/xstore/woocommerce/variation-swatches-3/) · [WC Brands ir XStore Brands](https://www.8theme.com/documentation/xstore/woocommerce/differences-between-brands-from-the-woocommerce-plugin-and-from-xstore-theme-which-to-choose-and-how-to-disable-unnecessary-ones/) · [Nauji Elementor elementai](https://www.8theme.com/documentation/xstore/plugins/new-elementor-xstore-features/) · [Seamless Loader Skeletons](https://www.8theme.com/documentation/xstore/xstore-features/seamless-loader-skeletons/) · [Header Overlap](https://www.8theme.com/documentation/xstore/troubleshooting/how-to-enable-header-overlap/) · [Pagination Type](https://www.8theme.com/topic/i-cant-turn-on-infinite-scrolling-on-the-store-page-2/) · [Quick View](https://www.8theme.com/topic/how-to-change-quick-view-in-quick-shop/) · [Sticky Add To Cart](https://www.8theme.com/topic/sticky-add-to-cart-button-on-product-page/) · [našumo užklausa ir 9.5](https://etheme.userjot.com/board/p/please-speed-up-the-theme-2)
- XStore demo (patikrinta HTML): [Fashion01](https://xstore.8theme.com/elementor3/fashion01/) · [Minimal Fashion 02](https://xstore.8theme.com/elementor/demos/minimal-fashion02/) · [Parallax](https://xstore.8theme.com/elementor/demos/minimal-fashion02/parallax-scrolling-effects/) · [Banner](https://xstore.8theme.com/elementor/demos/minimal-fashion02/banner-element/) · [Product Categories](https://xstore.8theme.com/elementor/demos/minimal-fashion02/product-categories-element/) · [Ajax Search](https://xstore.8theme.com/elementor/demos/minimal-fashion02/ajax-search-element/) · [Hotspot](https://xstore.8theme.com/elementor/demos/minimal-fashion02/hotspot-element/) · [Horizontal Scroll](https://xstore.8theme.com/elementor/demos/minimal-fashion02/horizontal-scroll-element/) · [PDP](https://xstore.8theme.com/elementor/demos/minimal-fashion02/product/drawstring-shirt-dress-2/) · [Electronic Mega Market](https://xstore.8theme.com/elementor3/electronic-mega-market/) · [Luxury Jewelry](https://xstore.8theme.com/elementor2/luxury-jewelry/)
- Salient: [v18](https://themenectar.com/salient/introducing-salient-version-18/) · [v17](https://themenectar.com/salient/salient-17-a-deep-dive-into-all-the-new-design-performance-workflow-tools/) · [Animated Text](https://themenectar.com/docs/salient/animated-text/) · [Sticky Content Sections](https://themenectar.com/docs/salient/sticky-content-sections/) · [Scrolling Text](https://themenectar.com/docs/salient/scrolling-text/) · [Cascading Images](https://themenectar.com/docs/salient/cascading-images/) · [Fancy Box](https://themenectar.com/docs/salient/fancy-box/) · [Flip Box](https://themenectar.com/docs/salient/flip-box/) · [Image With Hotspots](https://themenectar.com/docs/salient/image-with-hotspots/) · [Tabs](https://themenectar.com/docs/salient/tabs/) · [Text With Inline Media](https://themenectar.com/docs/salient/text-with-inline-media/) · [Morphing Outline](https://themenectar.com/docs/salient/morphing-outline/) · [Video Lightbox](https://themenectar.com/docs/salient/video-lightbox/) · [Row](https://themenectar.com/docs/salient/page-builder-row/) · [Nectar Slider](https://themenectar.com/docs/salient/nectar-slider-plugin/)
- Elementor, technologijos ir teisė: [Motion Effects](https://elementor.com/help/motion-effects/) · [Page Transitions](https://elementor.com/help/page-transitions/) · [Elementor 4.0](https://developers.elementor.com/elementor-editor-4-0-developers-update/) · [GSAP 3.13](https://gsap.com/blog/3-13/) · [Lenis](https://github.com/darkroomengineering/lenis) · [LCP](https://web.dev/articles/lcp) · [Optimize LCP](https://web.dev/articles/optimize-lcp) · [caniuse background-attachment](https://caniuse.com/background-attachment) · [caniuse view transitions](https://caniuse.com/cross-document-view-transitions) · [caniuse animation-timeline](https://caniuse.com/mdn-css_properties_animation-timeline_view) · [FiboSearch + XStore](https://fibosearch.com/documentation/themes-integrations/xstore-theme/) · [EK dark patterns](https://ec.europa.eu/commission/presscorner/detail/en/ip_23_418) · [Omnibus įskiepis](https://wordpress.org/plugins/omnibus/)
