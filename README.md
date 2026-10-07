# Brandstore.lt: naujo dizaino demo („Galleria“)

Statinė HTML/CSS/JS demonstracinė versija klientui. Galutinis tinklapis bus WordPress + WooCommerce su **XStore** tema ir Salient stiliaus efektais. Demo naudoja tikrus brandstore.lt duomenis: 92 prekes su kainomis ir nuolaidomis, 266 nuotraukas, 76 prekių ženklus ir 7 tikrus atsiliepimus.

## Kaip atidaryti

Užtenka atidaryti `index.html` naršyklėje: puslapiai veikia ir iš failų, be serverio. Šriftams reikia interneto ryšio.

Arba su vietiniu serveriu:

```bash
python3 -m http.server 8765
```

ir naršyklėje atidaryti http://localhost:8765

## Puslapiai

| Failas | Kas tai |
|---|---|
| `index.html` | Pirmas puslapis: video hero, kategorijų paieška „Ko ieškote šiandien?“, **išpardavimo blokas** (nuolaidų lygiai −30/−50/−70 %, „iki 50 €“, laikmatis, karuselė), mėnesio pasiūlymas, prekių ženklai, dizainerių kolekcija, Jai / Jam, naujienos, įvaizdis su taškais, kodėl Brandstore, atsiliepimai, naujienlaiškis |
| `parduotuve.html` | Išpardavimo sąrašas su filtrais (dydis, prekės ženklas, kategorija, kaina, nuolaida, spalva, lytis), rikiavimu ir URL parametrais, pvz. `parduotuve.html?lytis=vyrams&kategorija=striukes` arba `?nuolaida=50` |
| `preke-norway-1963-vyriska-melyna-striuke.html` | Prekės puslapis: drabužis su dydžiais |
| `preke-furla-smelio-spalvos-moteriska-rankine-iride.html` | Prekės puslapis: vieno dydžio rankinė |
| `preke-calvin-klein-vyriski-sportiniai-batai-juodi.html` | Prekės puslapis: avalynė su EU dydžiais |

Visuose puslapiuose veikia:
- mega meniu;
- greita paieška su pasiūlymais (randa ir be lietuviškų raidžių, pvz. „rankines“);
- krepšelis su nemokamo pristatymo juosta (2+ prekės);
- norų sąrašas ir greita peržiūra;
- mobili apatinė juosta.

Ekrano nuotraukos klientui: `docs/perziura/`.

## Dizaino kryptis

- **Spalvos.** Vėsi monochrominė paletė (`#F4F4F2` fonas, `#121315` tekstas). Vienintelis akcentas, raudona `#C8261C`, naudojama tik nuolaidoms.
- **Šriftai.** Bodoni Moda (antraštės; Bodoni yra italų šriftas, kaip ir dauguma prekių ženklų) ir Geist (sąsaja).
- **Formos.** Aštrūs kampai, apvalūs tik ikonų mygtukai ir filtrų „čipai“.
- **Judesys.** Parallax, hover ir antraščių atsiradimas eilutėmis (Motion + Lenis). Viskas išjungiama, jei lankytojo sistemoje įjungtas „mažiau judesio“ nustatymas.

Visa specifikacija: `docs/DESIGN-SPEC.md`.

## Įgyvendinimas XStore temoje

`docs/research/xstore-salient.md` aprašo kiekvienos sekcijos atitikmenis XStore Elementor valdikliuose ir Salient efektus. Ten pat surašyti rekomenduojami įskiepiai ir apribojimai. Svarbiausia iš jo:
- importuoti demo **Fashion01**;
- XStore nemokamo pristatymo juosta skaičiuoja tik sumą, o Brandstore taisyklė yra „2+ prekės“, todėl reikės nedidelio PHP fragmento;
- rikiavimui ir filtrams pagal nuolaidą reikės išsaugoti nuolaidos procentą prekės meta laukuose;
- prekių ženklus reikia perkelti iš WooCommerce Brands į XStore Brands.

UX auditas ir rekomendacijos: `docs/research/ux-audit.md`.

## Ką reikia patvirtinti su klientu

- **Nuolaidų teiginys.** Demo rašo „iki −80 %“, nes toks šiuo metu didžiausias nuolaidos dydis duomenyse. Esamame tinklapyje parašyta „iki 60 %“.
- **Mokėjimo kortelės.** Rodomi tik Apple Pay, Google Pay ir el. bankininkystė, nes tik juos nurodo esamas tinklapis. Jei priimamos ir kortelės, `build.py` faile į `PAYMENT_MARKS` reikia pridėti Visa ir Mastercard.
- **Laikmatis.** Rudens išpardavimo laikmatis skaičiuoja iki 2026-10-31. Jam pasibaigus, demo automatiškai skaičiuoja iki einamojo mėnesio pabaigos.
- **Omnibus eilutė.** „Mažiausia kaina per 30 d. iki nuolaidos“ demo rodo ankstesnę kainą. Tikrame tinklapyje ją turi skaičiuoti įskiepis.
- **Pexels nuotraukos.** Nuotraukų ir video su atpažįstamais žmonėmis modelių sutikimai negarantuoti. Jas vertėtų pakeisti prieš naudojant reklamoje (žr. `docs/research/media-credits.md`).

## Struktūra ir redagavimas

```
src/pages/        puslapių turinys (index, parduotuve)
src/partials/     bendros dalys: antraštė, meniu, poraštė, krepšelis, ikonos
src/generators/   pdp.py sugeneruoja prekių puslapius iš duomenų
assets/css/       base.css (sistema) + home.css, plp.css, pdp.css
assets/js/        core.js (sistema) + home.js, plp.js, pdp.js, vendor/ (Motion, Lenis)
assets/data/      catalog.js (window.BS, tikri brandstore.lt duomenys)
assets/media/     Pexels video ir nuotraukos (manifest.json)
assets/img/       prekių, prekių ženklų ir atsiliepimų nuotraukos, logotipas
```

Redaguojami tik failai `src/` ir `assets/` kataloguose. Šakniniai `*.html` failai generuojami, juos perrašo:

```bash
python3 build.py
```

Komponentų pavyzdžių puslapis (vidiniam naudojimui) sugeneruojamas su `python3 build.py --include-private` ir atsiranda `_kitchen-sink.html` faile.
