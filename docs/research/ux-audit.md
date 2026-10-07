# Brandstore.lt – UX auditas ir informacinės architektūros rekomendacijos

> Paskirtis: pagrindas demonstraciniam dizainui (pagrindinis puslapis, išpardavimo / kategorijos sąrašas, 3 prekių puslapiai). Galutinis sprendimas – WordPress + WooCommerce + XStore tema, papildomai naudojami Salient stiliaus elementai.
> Auditas atliktas 2026-10-07: desktop 1440 px ir mobile 375 px, peržiūrėti brandstore.lt HTML ir viešas WooCommerce Store API.

---

## 0. Santrauka: 7 svarbiausi dalykai

1. **Didžiausias pardavimo variklis paslėptas.** Su nuolaida parduodama **4 920 iš 11 310 prekių (43 %)**, bet meniu nuoroda „Išpardavimas %“ veda į žymą „Vasaros išpardavimas“. Ten tik 193 prekės (spalį – basutės), o 10 iš pirmųjų 36 prekių nuolaidos neturi. Išpardavimas turi tapti filtru grįsta kategorija (`on_sale`) su nuolaidų lygiais.
2. **Paieška neatlaiko realių užklausų.** Rašant pasiūlymai nerodomi. Rašybos klaidų sistema neatleidžia („coccinele“ – 0 rezultatų ir aklavietė „Produktų nerasta.“). Kelių žodžių užklausos sujungiamos per ARBA: „nike batai“ grąžina 1 085 rezultatus, pirmieji – Nike šortai ir Balenciaga batai. Mobiliajame paieška pasiekiama tik per ikoną.
3. **Prabangos asortimentas nematomas.** Balenciaga (279 prekės), Saint Laurent (242), Gucci (229), Bottega Veneta (201), Jacquemus (163), Moncler (69), Miu Miu (48) pagrindiniame puslapyje nerodomi, todėl prarandamas „prabangos“ įvaizdis ir didesnis vidutinis krepšelis.
4. **Filtrai neleidžia greitai susiaurinti pasirinkimo.** Nėra spalvos, nuolaidos dydžio, „tik su nuolaida“ ir medžiagos filtrų. Spalvų reikšmės itališkos (Nero, Blu, Bianco). Viename dydžių filtre sumaišytos kelios sistemos (XS–3XL, IT 38–42, vaikų 6A/8A, 18M, UNI). Kiekvienas paspaudimas perkrauna visą puslapį.
5. **Pagrindinis puslapis kalba kiekiu, o ne verte.** Teiginys „Daugiau nei 11 000…“ skamba kaip prekybcentris. Kategorijų įėjimai atsiranda tik po ~2 ekranų. Nuolaidų sekcijos su lygiais nėra. „Mėnesio pasiūlymas“ – didelė nuotrauka be kainos ir CTA.
6. **PDP pagrindas geras (išlaikyti):** dydžiai mygtukais, dydžių lentelė su LT/EU/IT ir cm, pristatymo kaina ir terminas, nemokamo pristatymo progreso juosta, 14 d. grąžinimas, originalumo garantija, Apple/Google Pay, prilipęs „Į krepšelį“ mobiliajame. Silpnybės: 2–3 nuotraukos be priartinimo, neišversti atributai („Color: Blu“), rodomas sandėlio kiekis „Liko 106“, nėra atsiliepimų ir „Derinkite su“.
7. **Našumas ir trukdžiai:** TTFB be talpyklos ~1,4 s, 3 386 DOM mazgai, 513 KB HTML, 49 JS užklausos, 15 trečiųjų šalių domenų. Po ~10 s per visą ekraną iššoka naujienlaiškio langas (Omnisend).

---

## 1. Esamos svetainės auditas (prioritetai)

**P1 – kritiška findability / konversijai, P2 – svarbu, P3 – patobulinimai.** Dabartinė tema – Shoptimizer + CommerceKit (sprendžiant iš CSS klasių), puslapiai kurti su Elementor.

### 1.1 Navigacija ir IA

| # | Prior. | Problema (įrodymas) | Rekomendacija |
|---|---|---|---|
| N1 | P1 | „Išpardavimas %“ → `/produkto-zyma/vasaros-ispardavimas/` (193 prekės, vasaros pavadinimas spalį), nors su nuolaida yra 4 920 prekių. | Išpardavimas – automatinė `on_sale` kategorija, suskirstyta pagal lytį ir nuolaidos lygį. Pavadinimas be sezono („Išpardavimas“). Meniu punktas paryškintas akcento spalva. |
| N2 | P1 | Šalia stovi dvi raudonos nuorodos („Išpardavimas %“ ir „Top pasiūlymai“) ir konkuruoja tarpusavyje. „Top“ – anglicizmas. | Paliekama viena: „Išpardavimas“. „Geriausi pasiūlymai“ tampa išpardavimo puslapio skiltimi. |
| N3 | P2 | Mega meniu – vien tekstas. „Moterims → Drabužiai“ turi 21 subkategoriją abėcėlės tvarka, nenuosekliai („Apatiniai“ – gale). Nėra „Visi drabužiai“, „Naujienos“, „Išpardavimas moterims“, populiarių prekių ženklų, nuotraukų. | 4–5 stulpelių mega meniu: Drabužiai (8 populiariausi + „Visi“) · Avalynė · Rankinės ir aksesuarai · Populiarūs prekių ženklai · vaizdinė kortelė („Išpardavimas moterims iki −70 %“). Viršuje – greitos nuorodos: Naujienos · −50 % ir daugiau · Iki 50 €. |
| N4 | P2 | „Vaikams“ nuoroda – `#` (neveikia). Kategorijos „Vaikams“ nėra, yra tik „Berniukams“ (389) ir „Mergaitėms“ (113). | Sukurti tėvinę kategoriją „Vaikams“ su savo puslapiu. |
| N5 | P2 | „Prekių ženklai“ – 78 pavadinimų plokščias sąrašas be paieškos, logotipų ir kiekių. Yra dublikatų (BOSS / HUGO BOSS, Ralph Lauren / POLO RALPH LAUREN, NAPAPIJRI / NAPAPIJRI SHOES), rašyba nenuosekli (New Balance, Ugg prieš didžiąsias). | Prekių ženklų meniu: paieškos laukas „Rasti prekės ženklą“, 12 logotipų (pagal prekių kiekį), A–Z sąrašas su kiekiais, atskiras blokas „Dizainerių kolekcija“. Sutvarkyti taksonomiją. |
| N6 | P2 | „VALENTINO moteriška rankinė“ pakartota ~10 kartų, nors tai Valentino Bags (Mario Valentino), ne Valentino Garavani. Prabangos segmente tokia painiava kenkia pasitikėjimui. | Tikslūs prekių ženklų pavadinimai. Prekės pavadinimo šablonas: **Prekės ženklas · tipas „Modelis“, spalva** (pvz., „Valentino Bags · rankinė „Katong“, juoda“). |
| N7 | P3 | Mobiliajame „Išpardavimas“ yra meniu apačioje, po visais akordeonais. | Mobiliojo meniu viršuje – lyties skirtukai ir „Išpardavimas“, tada kategorijos su miniatiūromis. |

### 1.2 Paieška

| # | Prior. | Problema | Rekomendacija |
|---|---|---|---|
| S1 | P1 | Rašant nerodomi jokie pasiūlymai. | Nuspėjamoji paieška (XStore AJAX Search arba FiboSearch / Doofinder / Algolia): pasiūlymai, kategorijos, prekių ženklai, 4–6 prekės su nuotrauka ir kaina, prieš įvedant – „Populiarios paieškos“. |
| S2 | P1 | Rašybos klaidos neatleidžiamos: „coccinele“ grąžina 0 rezultatų ir tuščią puslapį be pasiūlymų. | Klaidų tolerancija (fuzzy) ir „Gal turėjote omenyje…?“. Tuščiame puslapyje – populiarios kategorijos ir prekių ženklai, o ne aklavietė. |
| S3 | P1 | Kelių žodžių užklausos sujungiamos per ARBA: „rankine juoda“ → 2 804 rezultatai, „nike batai“ → 1 085 (pirmieji – šortai). | Iš pradžių IR logika (visi žodžiai), sinonimai („batai“ = „bateliai“, „kedai“ = „sportiniai bateliai“, „kuprinė“ = „kuprine“), spalvos ir lyties atpažinimas užklausoje. |
| S4 | P2 | Mobiliajame paieška slepiasi už ikonos. | Mobiliajame paieškos laukas visada matomas po antrašte (didelis katalogas – Baymard). |
| ✔ | – | Diakritikai ignoruojami („striuke“ randa „striukė“) – gerai. | Išlaikyti. |

### 1.3 Išpardavimo pateikimas

| # | Prior. | Problema | Rekomendacija |
|---|---|---|---|
| D1 | P1 | Pagrindiniame puslapyje nėra sekcijos su dabartinėmis nuolaidomis. Yra tik hero mygtukas „Išpardavimas“ ir pavieniai ženkliukai. | Atskira sekcija „Išpardavimas dabar“: nuolaidų lygių plytelės, „Didžiausios nuolaidos“ karuselė, prekių ženklų akcijos (žr. 3.2, 4 sekcija). |
| D2 | P1 | Teiginiai nenuoseklūs: hero sako „iki 60 %“, kortelėse matosi −76 % ir −78 %. | Didžiausią nuolaidą rodyti dinamiškai, pagal realius duomenis. |
| D3 | P1 | Rūšiuojant negalima pasirinkti „Didžiausia nuolaida“, nėra nuolaidos filtro. | Pridėti abu (žr. 3.4). |
| D4 | P2 | Kortelėse rodoma tik −X %, sutaupyta suma – ne. Kaina rašoma „€73“, „€1,652“ (angliškas formatas). | „73 €“, „1 652 €“, sutaupymas („Sutaupote 87 €“) – PDP ir krepšelyje. |
| D5 | P2 (teisinė) | Pagal Omnibus direktyvą (ES 2019/2161), skelbiant kainos sumažinimą, „ankstesnė kaina“ turi būti mažiausia per 30 d. iki nuolaidos. | PDP: „Mažiausia kaina per 30 d. iki nuolaidos: 253 €“. Atgalinės atskaitos laikmačius rodyti tik tikroms, laike apribotoms akcijoms. |

**Duomenys sprendimams.** Naujausių 200 akcijinių prekių imtyje: 74 % su nuolaida 30–49 %, 13 % – 50–69 %, 13 % – mažiau nei 30 %. 57 % kainuoja iki 50 €. Todėl „Iki 50 €“ yra stiprus įėjimas, o lygis „−70 % ir daugiau“ tinka tik tada, kai prekių jame yra pakankamai (rodyti tik kai > 30 prekių).

### 1.4 PLP (kategorijos sąrašas) ir prekės kortelė

| # | Prior. | Problema | Rekomendacija |
|---|---|---|---|
| L1 | P1 | Filtrai tik keturi: kategorija, kaina, prekės ženklas, dydis. Spalvos, nuolaidos, medžiagos filtrų nėra. Spalvų atributų reikšmės itališkos (Nero 37 %, Blu, Bianco, Verde…). | Išversti atributus (Nero → juoda), sujungti į ~12 bazinių spalvų su spalvų taškeliais. Filtrų rinkinys – 3.4. |
| L2 | P1 | Viename dydžių filtre sumaišytos kelios sistemos: XS–3XL, IT 38–42, 6A/8A/14A (vaikų), 18M, 6X, UNI. | Dydžio filtrą rodyti pagal kontekstą (drabužiai / avalynė / vaikai). Vaikų dydžius pervadinti „6 m.“ ir pan. IT dydžiai su EU atitikmeniu („IT 40 / EU 36“). |
| L3 | P2 | Kiekvienas filtro paspaudimas perkrauna visą puslapį. Kainos filtrui reikia mygtuko „Filtruoti“. | AJAX filtrai, gyvas rezultatų skaičius, pritaikytų filtrų „čipai“ virš tinklelio, „Išvalyti viską“. |
| L4 | P2 | Kortelėje prekės ženklas sulietas su pavadinimu didžiosiomis raidėmis („NORWAY 1963 vyriška mėlyna striukė“). Vizualinės hierarchijos nėra. | Kortelė: **PREKĖS ŽENKLAS** (mažas, retintas), pavadinimas (sakinio raidžių dydžiu), kaina. |
| L5 | P2 | Užvedus pelę antra nuotrauka nerodoma. Kiekvienoje kortelėje – dydžių pasirinkimas ir „Įdėti į krepšelį“: dvigubos formos labai padidina DOM. | Hover: antra nuotrauka ir galimi dydžiai. Greitas įdėjimas – paspaudus dydį (be dvigubos formos). |
| L6 | P3 | Puslapiavimas – 113 puslapių po 36 prekes, mobiliajame puslapiavimas stovi virš prekių. | „Rodyti daugiau“ su progreso tekstu („Peržiūrėjote 36 iš 4 052“), puslapiavimas – apačioje (SEO). |
| ✔ | – | Kategorijos antraštėje yra subkategorijų čipai su kiekiais, matomi pritaikyti filtrai, mobiliajame prilipusi juosta „Rodyti filtrus“, kortelėse – galimi dydžiai. | Išlaikyti ir patobulinti. |

### 1.5 PDP (prekės puslapis)

| # | Prior. | Problema | Rekomendacija |
|---|---|---|---|
| P1 | P1 | Daugumai prekių 2–3 packshot nuotraukos (imtyje 57 % turi 2), priartinimo ir viso ekrano peržiūros nėra. | Priartinimas užvedus pelę / suspaudžiant pirštais, viso ekrano galerija. Svarbiausioms prekėms – nuotrauka su modeliu (Baymard: 75 % drabužių svetainių jų neturi). |
| P2 | P1 | Atributai neišversti: „Color: Nėra pasirinkimo – Blu“. | „Spalva: mėlyna“. Spalvų variantai – sampleriais, nuorodos į kitas to paties modelio spalvas. |
| P3 | P2 | Rodomas sandėlio kiekis „Liko 106“ (imtyje visos 300 prekių turi „Liko N“). Prabangai tai netinka ir realaus trūkumo nerodo. | Kiekį rodyti tik kai ≤ 3: „Liko paskutinis vienetas“, „Liko tik 2“. |
| P4 | P2 | PDP nėra atsiliepimų, nors pagrindiniame puslapyje jie yra. | Įvertinimas prie pavadinimo, atsiliepimai su nuotraukomis. |
| P5 | P2 | Aprašymai šabloniniai, sudėtis ir priežiūra paslėpti tekste. | Akordeonai: Aprašymas · Sudėtis ir priežiūra · Dydis ir kirpimas · Pristatymas ir grąžinimas · Apie prekės ženklą. |
| P6 | P3 | Rodomi tik „Panašūs produktai“. | „Derinkite su“ (complete the look), „Daugiau iš {prekės ženklas}“, „Neseniai žiūrėtos“. |
| ✔ | – | Dydžiai mygtukais, dydžių lentelė (LT/EU/IT, cm, patarimas dėl itališkų dydžių), „Pristatymo kaina 3 €, išsiunčiame per 1–2 d. d.“, nemokamo pristatymo progreso juosta, 14 d. grąžinimas, originalumo garantija, mokėjimo logotipai, Apple/Google Pay, prilipęs „Į krepšelį“. | Išlaikyti, sugrupuoti į vieną aiškų bloką. |

### 1.6 Mobilusis, vizualinė hierarchija, pasitikėjimas, našumas

| # | Prior. | Problema | Rekomendacija |
|---|---|---|---|
| M1 | P1 | Hero užima visą pirmą ekraną, antraštė – 4 eilutės, mygtukas vienas. Po hero visą ekraną užima logotipų tinklelis, o kategorijos atsiranda tik ~3-iame ekrane. | Hero ≤ 70 vh mobiliajame, 2–3 CTA (Moterims / Vyrams / Išpardavimas), iškart po jo – horizontaliai slenkamos kategorijų plytelės. |
| M2 | P2 | Apatinės navigacijos juostos nėra. Krepšelis ir paieška – tik viršuje. | XStore Mobile Panel: Pradžia · Katalogas · Išpardavimas · Norai · Krepšelis. |
| M3 | P2 | Po ~10 s per visą ekraną iššoka naujienlaiškio langas (desktop ir mobile). | Lango įėjimo metu nerodyti. Naujienlaiškį dėti puslapyje arba švelniai išslenkantį iš apačios po 2-o peržiūrėto puslapio / bandant išeiti. |
| M4 | P2 | Atsiliepimų sekcijoje nėra bendro įvertinimo ir šaltinio, nematyti trečiosios šalies patvirtinimo. | „4,9 / 5 · 1 200+ atsiliepimų“ (tik realūs duomenys), Google / Trustpilot ženklelis, jei yra. |
| M5 | P2 | Našumas: TTFB be talpyklos ~1,4 s, 3 386 DOM mazgai, 513 KB HTML, 49 JS, 15 trečiųjų šalių (GTM, Facebook, Hotjar, Omnisend, CookieYes, Sentry…). | Tikslai: LCP < 2,5 s, DOM < 1 500. Puslapio podėlis (cache), AVIF/WebP, kortelės be formų, trečiųjų šalių skriptai – po sutikimo ir atidėtai. |
| M6 | P3 | Svetainės pavadinimas „Vardiniai drabužiai“ tinka SEO, bet ne prabangiam tonui. | SEO frazę palikti, sąsajoje rašyti „originalūs prekių ženklai“. |

---

## 2. Lyginamoji analizė (benchmark)

| Svetainė | Ką daro gerai | Ką perimti Brandstore |
|---|---|---|
| **Mytheresa** (prabangos etalonas) | Redakcinis pagrindinis puslapis: didelės kampanijų nuotraukos, daug baltos erdvės, mažai teksto. Mega meniu – dizainerių A–Z sąrašas su paieška. Naujienos akcentuojamos kas savaitę. Nuolaida rodoma santūriai. | Redakcinį ritmą (nuotrauka – tekstas – prekės), elegantišką tipografiją, santūrų nuolaidų žymėjimą, A–Z prekių ženklų meniu su paieška. |
| **SSENSE** | Minimalizmas: juoda ir balta, PLP kairėje – tekstinis kategorijų medis, dizaineriai abėcėlės tvarka, viršuje perjungiama lytis, išpardavimo kaina išskirta spalva. | Principą „mažiau ženkliukų – daugiau vertės“ ir aiškų tekstinį kategorijų stulpelį PLP. |
| **END. Clothing** | Išpardavimo puslapyje – įėjimai pagal kategorijas (striukės, megztiniai, avalynė…) ir sąrašas „Visi išpardavimo prekių ženklai“. Antraštėje „Iki 60 %“, kortelėse nuolaida rašoma žodžiais. | Išpardavimo nukreipimo puslapį su kategorijų ir prekių ženklų įėjimais. |
| **Farfetch** | Milžinišką asortimentą (tūkstančiai dizainerių) suvaldo per dizainerių paiešką, standartinius filtrus (kategorija, dizaineris, dydis, spalva, kaina) ir dydžių sistemų perskaičiavimą PDP. | Dydžių sistemos pasirinkimą (IT/EU), „Prekės ženklas“ filtrą su paieška. |
| **Zalando / Lounge by Zalando** | Lyties kontekstas viršuje, išpardavimas – pagrindiniame meniu akcento spalva, filtrų juosta virš tinklelio. Lounge: prekių ženklų kampanijos startuoja kasdien 7:00, trunka iki 72 val., nuolaidos iki 75 %, rodomas laikmatis. | Horizontalią filtrų juostą desktop versijoje. „Savaitės prekės ženklo“ kampanijos plytelę su tikru laikmačiu. |
| **Boozt (LT rinka)** | Aiški USP juosta (nemokamas pristatymas nuo sumos, 30 d. grąžinimas, pristatymo terminas), lyties skirtukai, atskira „Pasiūlymų“ kategorija, kortelėse prekės ženklas atskirtas nuo pavadinimo. | USP juostą ir kortelių hierarchiją. Lietuviškų terminų pavyzdys. |
| **Outlet46** (outlet modelis) | Kainų lygių įėjimai („viskas iki X €“), „Limited deals“, prekių ženklai A–Z, procentai kortelėse (−25…−92 %), USP „100 % originalios naujos prekės“ ir „kasdien nauji pasiūlymai“. | Kainų lygių įėjimus („Iki 50 €“, „Iki 100 €“) ir pažadą „kasdien naujos prekės“ – tik prabangesniu tonu. |

### Baymard Institute įžvalgos, aktualios Brandstore

- 2025 m. 58 % desktop ir 67 % mobiliųjų svetainių pagrindinio puslapio ir kategorijų navigacija įvertinta „vidutiniškai–prastai“.
- Drabužių sektoriuje svarbiau investuoti į kategorijų navigaciją ir kuruotus kelius nei į paiešką. Dydžio filtras turi būti viršuje ir išskleistas.
- Dalis pirkėjų atėję į svetainę pirmiausia ieško išpardavimo. 16 % svetainių neturi filtru grįstos kategorijos „Išpardavimas“, dar 16 % ją įgyvendina blogai.
- 61 % svetainių nekelia svarbių filtrų virš sąrašo. Drabužiams tai dydis, medžiaga, kaina. 32 % nerodo pritaikytų filtrų apžvalgos.
- Iki 27 % paieškos užklausų turi klaidų arba alternatyvių formų. 69 % svetainių nesiūlo tinkamų pasiūlymų su rašybos klaidomis. 41 % nepalaiko 8 pagrindinių užklausų tipų.
- 83 % desktop ir 87 % mobiliųjų drabužių svetainių pateikia nepakankamai informacijos apie dydžius. 84 % testų dalyvių naudojosi dydžių informacija. 75 % svetainių neturi nuotraukų su modeliu.

---

## 3. Rekomendacijos

### 3.1 IA principai

1. **Pirmiausia lytis, tada kategorija.** Pagrindinis meniu: `Naujienos · Moterims · Vyrams · Vaikams · Prekių ženklai · Dizainerių kolekcija · Išpardavimas` (7 punktai, „Išpardavimas“ – akcento spalva).
2. **Trys greiti keliai į bet kurią prekę:** (a) kategorijų plytelės pagrindiniame puslapyje ir mega meniu, (b) nuspėjamoji paieška, (c) prekių ženklai A–Z su paieška. Kiekvienas kelias iki sąrašo – ne daugiau kaip 2 paspaudimai.
3. **Išpardavimas – filtras, ne žyma.** Bet kurią kategoriją galima pasiekti per „Išpardavimą“ ir atvirkščiai: „Moterims → Striukės → tik su nuolaida“.
4. **Subkategorijos rikiuojamos pagal populiarumą, ne abėcėlę:** Marškinėliai (1 438), Džemperiai (1 136), Polo (566), Megztiniai (556)…, gale – „Visi drabužiai“.
5. **Prabanga – atskiras kuruotas kelias** („Dizainerių kolekcija“): Balenciaga, Saint Laurent, Gucci, Bottega Veneta, Jacquemus, Moncler, Miu Miu, Celine, Stone Island, Canada Goose, AMI Paris.

### 3.2 Pagrindinio puslapio sekcijų tvarka

| # | Sekcija | Paskirtis | Pagrindiniai elementai | XStore / Salient elementas |
|---|---|---|---|---|
| 0 | **USP juosta** | Iškart atsakyti į „ar verta čia pirkti?“ | Keičiasi 3 teiginiai: nemokamas pristatymas perkant 2+, 14 d. grąžinimas, 100 % originalu. Dešinėje – telefonas. | Header Builder → Top bar |
| 1 | **Antraštė ir mega meniu** | Greita orientacija | Logotipas, platus paieškos laukas su keičiamais pavyzdžiais, paskyra, norai, krepšelis su suma. Prilipusi, slenkant žemyn susitraukia. | Header Builder, Mega menu (Static blocks), AJAX Search |
| 2 | **Hero** (pilno pločio, parallax / video) | Prabangos įspūdis ir aiškus pasirinkimas | Antraštė apie vertę, ne kiekį. 3 CTA: Moterims · Vyrams · Išpardavimas. Smulki pasitikėjimo eilutė. Lėtas Ken Burns arba Pexels video (be garso, su plakatu). Desktop 80–90 vh, mobile ≤ 70 vh. | Salient: fullscreen parallax row / Nectar slider; XStore: Banner |
| 3 | **„Ko ieškote šiandien?“** – kategorijų plytelės | Iki kategorijos – per vieną slinkimą | Perjungiklis Moterims / Vyrams. 8 plytelės su nuotrauka ir kiekiu (Striukės, Rankinės, Sportiniai bateliai, Džemperiai, Marškinėliai, Megztiniai, Piniginės, Vaikams). Hover: priartinimas ir rodyklė. Mobiliajame – horizontalus slinkimas. | XStore: Product Categories (grid/slider) + Tabs |
| 4 | **„Išpardavimas dabar“** – PRIVALOMA | Dabartinės nuolaidos: būtina klientui, svarbiausias pardavimo variklis | Tamsus, kontrastingas blokas su parallax fonu. (a) 4 lygių plytelės su kiekiais: **−30 %**, **−50 %**, **−70 % ir daugiau** (jei > 30 prekių), **Iki 50 €**. (b) Karuselė „Didžiausios nuolaidos“ (rikiuota pagal %, max 2 prekės nuo vieno prekės ženklo). (c) Jei vyksta tikra akcija – kampanijos plytelė su laikmačiu („Savaitgalio pasiūlymai baigiasi po 2 d. 14 val.“). CTA „Peržiūrėti visą išpardavimą (4 920)“. | XStore: Banner grid + Product carousel + Countdown (Sales Booster) |
| 5 | **Mylimiausi prekių ženklai** | Pirkėjai, kurie ieško pagal prekės ženklą | 12 logotipų (pagal prekių kiekį: North Sails, Calvin Klein, Norway 1963, Tommy Hilfiger, Guess Jeans, Desigual, Napapijri, Valentino Bags, Diesel, FILA, Timberland, Coccinelle). Hover: logotipas nuspalvinamas ir parodo „iki −60 % · 1 201 prekė“. Laukas „Rasti prekės ženklą“ ir nuoroda „Visi prekių ženklai A–Z“. | XStore: Brands carousel; Salient: marquee |
| 6 | **Dizainerių kolekcija** (redakcinis) | Prabangos įvaizdis, didesnis vidutinis krepšelis | Skaidytas blokas: didelė parallax nuotrauka ir tekstas („Balenciaga, Saint Laurent, Gucci, Bottega Veneta – originalūs, su autentiškumo garantija“). 4 prekės, CTA „Atrasti kolekciją“. Lėtas teksto atsiradimas. | Salient: split heading reveal, image with parallax; XStore: Product grid |
| 7 | **Sezono įkvėpimas** (lookbook) | Emocija ir kryžminis pardavimas | Viena didelė nuotrauka su taškais (hotspots) – paspaudus rodoma prekė ir kaina. Du blokai: Jai / Jam. CTA „Pirkti visą derinį“. | Salient: Image with hotspots |
| 8 | **„Ką tik atkeliavo“** – naujienos | Grįžtantiems pirkėjams („kas naujo?“) | Karuselė su įvairove (max 2 prekės nuo vieno prekės ženklo – dabar čia 7 Desigual iš eilės), skirtukai Moterims / Vyrams / Aksesuarai. | XStore: Product carousel + Tabs |
| 9 | **Dažniausiai perkama** | Socialinis įrodymas, sprendimo palengvinimas | 8 prekės, skirtukai pagal kategorijas. Kortelė: hover su antra nuotrauka ir dydžiais. | XStore: Products (tabs) |
| 10 | **Pasitikėjimas** | Rizikos mažinimas | Atsiliepimai su nuotraukomis ir bendru įvertinimu. 4 USP su ikonomis: originalumas · išsiunčiame per 1–2 d. d. · nemokamas pristatymas perkant 2+ · 14 d. grąžinimas. Mokėjimo logotipai. | XStore: Testimonials, Icon box; Salient: fancy box |
| 11 | **Naujienlaiškis** (puslapyje, ne iššokantis) | Kontaktų rinkimas be trukdžių | „Pirmieji sužinokite apie išpardavimus“ ir −10 % pirmajam užsakymui. Laukas ir sutikimo varnelė. | XStore: Newsletter (Omnisend forma) |
| 12 | **Poraštė** | Informacija ir SEO | Pagalba (Pristatymas, Grąžinimas, Dydžių lentelės, DUK), Apie (Apie mus, Kontaktai, Pilkalnio g. 7, Vilnius), mokėjimo būdai, socialiniai tinklai, telefonas ir el. paštas. | Footer Builder |

**Judesio taisyklės.** Parallax – tik hero, išpardavimo bloko fone, dizainerių ir lookbook sekcijose. Prekių tinkleliuose parallax nenaudoti. Hover: antra nuotrauka, lengvas priartinimas (1,03–1,05), CTA ištraukimas. Būtina gerbti `prefers-reduced-motion`. Mobiliajame parallax pakeičiamas statišku vaizdu (našumas).

### 3.3 Išpardavimo / kategorijos sąrašo (PLP) puslapis demonstracijai

1. Antraštė: H1 „Išpardavimas“, prekių skaičius, trumpa eilutė („Originalūs prekių ženklai – iki 78 % pigiau“).
2. Nuolaidų lygių čipai (−30 % · −50 % · −70 %+ · Iki 50 €) ir lyties skirtukai.
3. Iškelti filtrai: dydžių čipai (XS–3XL) ir 6 populiariausi prekių ženklai.
4. Kairėje filtrų stulpelis (desktop), viršuje rūšiavimas, pagal nutylėjimą – „Didžiausia nuolaida“.
5. Tinklelis 4 stulpeliais (perjungiama 3/4), kas 12 prekių – redakcinis intarpas (prekės ženklo baneris).
6. „Rodyti daugiau“ ir progreso tekstas, grįžus atgal išsaugoma slinkimo vieta ir filtrai.

### 3.4 PLP filtrų rinkinys (prioriteto tvarka)

1. **Dydis** – išskleistas, pagal kontekstą (drabužiai / avalynė / vaikai), su EU/IT atitikmenimis, kiekiais, galima rinktis kelis.
2. **Prekės ženklas** – su paieškos lauku, kiekiais, populiariausi viršuje, kelių pasirinkimas.
3. **Kategorija / tipas** – medis su kiekiais (Striukės, Džemperiai…).
4. **Kaina** – slankiklis su laukais ir greitais intervalais (iki 50 €, 50–100 €, 100–200 €, 200 € ir daugiau). Be mygtuko „Filtruoti“.
5. **Nuolaida** – jungiklis „Tik prekės su nuolaida“ ir lygiai „−30 % ir daugiau“, „−50 % ir daugiau“, „−70 % ir daugiau“.
6. **Spalva** – išversta, ~12 bazinių spalvų su spalvų taškeliais.
7. **Lytis** – paieškos, prekių ženklų ir išpardavimo puslapiuose.
8. **Medžiaga** – oda, vilna, kašmyras, medvilnė, pūkai, linas (reikia duomenų iš aprašymų).
9. **Sezonas** – ruduo–žiema / pavasaris–vasara.
10. **Dizainerių kolekcija** (prabangos žymė) – jungiklis.

**Rūšiavimas:** Rekomenduojami · Naujausi · Didžiausia nuolaida · Kaina: nuo mažiausios · Kaina: nuo didžiausios · Populiariausi.
**Elgsena:** AJAX, pritaikytų filtrų čipai su ×, „Išvalyti viską“, nulinio rezultato reikšmės paslėptos arba neaktyvios, filtrai įrašomi į URL (dalinimuisi ir SEO).

### 3.5 PDP privalomi elementai

1. **Galerija:** 5–8 vaizdai (packshot, modelis, detalė, nugara), priartinimas užvedus pelę, viso ekrano peržiūra, mobiliajame – braukimas su skaitikliu „1/5“, video, jei yra.
2. **Pavadinimo blokas:** PREKĖS ŽENKLAS (nuoroda į jo puslapį), tada modelis ir spalva, įvertinimas žvaigždutėmis su atsiliepimų skaičiumi.
3. **Kaina:** didelė dabartinė kaina, perbraukta ankstesnė, „−78 %“, „Sutaupote 198 €“, Omnibus eilutė, „Kaina su PVM“.
4. **Spalvos:** sampleriai su nuorodomis į kitas to paties modelio spalvas.
5. **Dydžiai:** mygtukai, išparduoti – perbraukti su „Pranešti, kai atsiras“, šalia nuoroda „Dydžių lentelė“, kirpimo patarimas („Itališkas kirpimas – siauresnis, rekomenduojame rinktis vienu dydžiu didesnį“), „IT 40 = EU 36“.
6. **Likutis:** rodomas tik kai ≤ 3 („Liko paskutinis vienetas“).
7. **CTA:** „Į krepšelį“ (neaktyvus, kol nepasirinktas dydis, su paaiškinimu), širdelė „Įsiminti“, Apple Pay / Google Pay, mobiliajame – prilipusi juosta su kaina ir dydžiu.
8. **Pristatymas:** „Užsakykite iki 14:00 – išsiųsime šiandien“ / „Pristatysime spalio 9–10 d.“, būdai ir kainos (paštomatai, kurjeris), nemokamo pristatymo progreso juosta.
9. **Pasitikėjimas:** 100 % originalu (garantija), 14 d. grąžinimas, saugus atsiskaitymas – viena eilutė ikonų.
10. **Akordeonai:** Aprašymas · Sudėtis ir priežiūra · Dydis ir kirpimas (modelio ūgis ir dėvimas dydis) · Pristatymas ir grąžinimas · Apie prekės ženklą.
11. **Atsiliepimai** su nuotraukomis.
12. **Kryžminis pardavimas:** „Derinkite su“, „Panašios prekės“, „Daugiau iš {prekės ženklas}“, „Neseniai žiūrėtos“.
13. **Techniniai dalykai:** duonos trupiniai su lytimi ir kategorija, „Atgal į rezultatus“ (su išsaugotais filtrais), Product/Offer schema, išversti atributai.
14. **Nenaudoti:** sandėlio kiekio „Liko 106“, netikrų „Dabar žiūri 12 žmonių“, nuolat atsinaujinančių laikmačių.

### 3.6 Mobilieji šablonai

1. **Apatinė juosta** (XStore Mobile Panel): Pradžia · Katalogas · Išpardavimas · Norai · Krepšelis (su skaičiumi). Paslepiama slenkant žemyn, grąžinama slenkant aukštyn.
2. **Visada matomas paieškos laukas** po antrašte. Paspaudus atsidaro viso ekrano paieška su „Populiariomis paieškomis“ ir „Neseniai ieškota“.
3. **Meniu – viso ekrano stalčius:** viršuje lyties skirtukai, „Išpardavimas“ ir „Naujienos“ – pirmi, toliau kategorijos su miniatiūromis, apačioje prekių ženklų paieška ir kontaktai.
4. **PLP prilipusi juosta** su dviem mygtukais: „Filtrai (2)“ | „Rikiuoti“. Po ja – horizontaliai slenkami iškelti čipai (dydžiai, −50 %, prekių ženklai).
5. **Filtrai – apatinis lapas / viso ekrano langas** su mygtuku „Rodyti 248 prekes“ (gyvas skaičius) ir „Išvalyti“.
6. **Kortelės – 2 stulpeliai**, nuotraukas galima braukti, širdelė – nykščio zonoje, be „Į krepšelį“ mygtukų kiekvienoje kortelėje.
7. **PDP:** galerija ~60 vh, kad pavadinimas ir kaina matytųsi pirmame ekrane. Prilipęs „Į krepšelį“ atidaro dydžio pasirinkimo apatinį lapą. Akordeonai, express apmokėjimas.
8. **Paspaudžiamos zonos ≥ 44 px**, nė viena funkcija nepriklauso nuo hover.
9. **Iššokantys langai:** įėjus į svetainę – jokių viso ekrano langų (Google intrusive interstitials). Naujienlaiškis – puslapyje arba švelniu išslenkančiu bloku.
10. **Našumas:** LCP < 2,5 s, hero mobiliajame – statinis paveikslėlis vietoje video, AVIF/WebP, atidėtas įkėlimas (lazy-load) žemiau pirmo ekrano.

### 3.7 Lietuviškas mikrotekstas

**Taisyklės.** Rašoma „55 €“ (tarpas, ženklas po skaičiaus), „1 652 €“, „49,90 €“, „−78 %“ (minuso ženklas ir tarpas prieš %). Kreipiamasi „jūs“. Be anglicizmų: ne „Sale“, „Outlet“, „Top“, „Shop now“, „Must-have“.

**Navigacija ir hero**
- Meniu: Naujienos · Moterims · Vyrams · Vaikams · Prekių ženklai · Dizainerių kolekcija · Išpardavimas
- Hero antraštė: „Originalūs prekių ženklai. Itališka kokybė. Iki 78 % pigiau.“
- Hero paantraštė: „Daugiau nei 11 000 originalių drabužių, avalynės ir rankinių – nuo kasdienių klasikų iki dizainerių kolekcijų.“
- CTA: „Moterims“ · „Vyrams“ · „Peržiūrėti išpardavimą“

**Sekcijų pavadinimai**
- „Ko ieškote šiandien?“ · „Išpardavimas dabar“ · „Didžiausios nuolaidos“ · „Mylimiausi prekių ženklai“ · „Dizainerių kolekcija“ · „Sezono įkvėpimas“ · „Ką tik atkeliavo“ · „Dažniausiai perkama“ · „Ką sako mūsų pirkėjai“ · „Kodėl verta rinktis Brandstore“

**Išpardavimas**
- „Iki −78 %“ · „−30 % ir daugiau“ · „−50 % ir daugiau“ · „−70 % ir daugiau“ · „Viskas iki 50 €“
- „Sutaupote 198 €“ · „Ankstesnė kaina: 253 €“ · „Mažiausia kaina per 30 d. iki nuolaidos: 253 €“
- „Pasiūlymas baigiasi po 2 d. 14 val. 05 min.“ · „Savaitgalio pasiūlymai“ · „Spėkite, kol yra jūsų dydis“
- „Liko paskutinis vienetas“ · „Liko tik 2“

**Pasitikėjimas**
- „100 % originalios prekės – garantuojame“
- „Išsiunčiame per 1–2 darbo dienas“
- „Nemokamas pristatymas perkant 2 ir daugiau prekių“
- „Grąžinimas per 14 dienų – paprastai ir greitai“
- „Saugus atsiskaitymas: Apple Pay, Google Pay, el. bankininkystė“
- „Prekės iš oficialių Italijos platintojų“ *(patikslinti su klientu prieš skelbiant)*

**CTA ir veiksmai**
- „Į krepšelį“ · „Pasirinkite dydį“ · „Įsiminti“ · „Žiūrėti visas“ · „Atrasti kolekciją“ · „Pirkti visą derinį“ · „Pranešti, kai atsiras“ · „Dydžių lentelė“ · „Tęsti apsipirkimą“ · „Pereiti prie apmokėjimo“ · „Rodyti 248 prekes“ · „Išvalyti filtrus“ · „Rodyti daugiau“

**Paieška ir filtrai**
- Laukas: „Ieškokite prekės ženklo, prekės ar kategorijos“
- Skiltys: „Populiarios paieškos“ · „Prekių ženklai“ · „Kategorijos“ · „Prekės“ · „Rodyti visus rezultatus (124)“
- Tuščias rezultatas: „Pagal „coccinele“ nieko neradome. Gal ieškojote „Coccinelle“?“
- Filtrai: „Filtrai“ · „Rikiuoti“ · „Tik prekės su nuolaida“ · „Rekomenduojami“ · „Naujausi“ · „Didžiausia nuolaida“ · „Kaina: nuo mažiausios“ · „Kaina: nuo didžiausios“

**Krepšelis ir naujienlaiškis**
- „Įsidėkite dar 1 prekę – pristatymas bus nemokamas“ · „Pristatymas nemokamas!“ · „Jūsų krepšelis tuščias“
- „Pirmieji sužinokite apie išpardavimus“ · „Užsiprenumeravę gausite −10 % pirmajam užsakymui“ · CTA „Gauti nuolaidą“

**Pakeisti esamus užrašus**

| Dabar | Siūloma |
|---|---|
| Top pasiūlymai | Geriausi pasiūlymai |
| Akcija! | Nuolaida |
| Panašūs produktai | Panašios prekės |
| Noriu | Įsiminti |
| Rinktis | Žiūrėti |
| Naujas papildymas | Ką tik atkeliavo |
| Nauja! | Nauja |
| Liko 106 | (nerodyti) |
| Color: Blu | Spalva: mėlyna |
| €55 / €1,652 | 55 € / 1 652 € |
| Vasaros išpardavimas (spalį) | Išpardavimas |

---

## 4. Demonstracijos fokusas (ką parodyti klientui)

- **Pagrindinis puslapis:** visos 3.2 sekcijos. Akcentai – parallax hero, kategorijų plytelės, išpardavimo blokas, dizainerių kolekcija.
- **PLP:** „Išpardavimas“ su nuolaidų lygiais, iškeltais dydžių čipais, filtrų stulpeliu ir mobiliąja filtrų juosta.
- **3 PDP, rodantys skirtingus scenarijus:** (1) Norway 1963 striukė su didele nuolaida (dydžiai, Omnibus, sutaupymas), (2) moteriška rankinė (Furla / Coccinelle / Valentino Bags: be dydžio, spalvų sampleriai, „Derinkite su“), (3) dizainerių prekė (Balenciaga / Saint Laurent: prabangos pateikimas, autentiškumo garantija).

---

## Šaltiniai

- [Baymard – Homepage & Category Navigation (2025 benchmark)](https://baymard.com/research/homepage-and-category-usability)
- [Baymard – Apparel & Accessories research](https://baymard.com/research/apparel-and-accessories)
- [Baymard – Sales / Deals filter-based category](https://baymard.com/blog/sales-filter-based-category)
- [Baymard – Promoting product filters](https://baymard.com/blog/promoting-product-filters)
- [Baymard – Autocomplete suggestions for misspellings](https://baymard.com/blog/offer-autocomplete-suggestions-for-misspellings)
- [Baymard – Apparel size information](https://baymard.com/blog/apparel-size-information)
- [Baymard – Applied filters on mobile](https://baymard.com/guidelines/2572-applied-filters-on-mobile)
- [Baymard – Mobile search field examples](https://baymard.com/mcommerce-usability/benchmark/mobile-page-types/search-field)
- [Zalando partner university – Lounge by Zalando](https://partner.zalando.com/university/article/introduction-to-lounge-by-zalando)
- [XStore Mobile Panel dokumentacija](https://xstore.helpscoutdocs.com/article/167-xstore-mobile-panel)
- Peržiūrėta tiesiogiai: brandstore.lt (pagrindinis, /produkto-kategorija/moterims/, /produkto-zyma/vasaros-ispardavimas/, /parduotuve/norway-1963-mens-blue-jacket-17/, paieška), boozt.com/lt, outlet46.de, endclothing.com/gb/sale, WooCommerce Store API (prekių, kategorijų, prekių ženklų kiekiai).
