# Wordle ⚔️ — napredna Wordle igra

Napredna verzija Wordlea izrađena u Reactu: više vrsta igre, računi, statistika, ljestvice, prijatelji, izazovi, teme i dvojezično sučelje.

🔗 **Uživo:** https://wordle-app-gamma.vercel.app

---

## ✨ Značajke

### 🎮 Vrste igre (varijante)
Pogađaš više riječi **odjednom** — svaki pokušaj se provjerava protiv svih riječi:
- **1️⃣ Klasik** — 1 riječ, 6 pokušaja
- **2️⃣ Dvojac** — 2 riječi, 7 pokušaja
- **4️⃣ Četvorka** — 4 riječi, 9 pokušaja
- **8️⃣ Osmorka** — 8 riječi, 13 pokušaja

### 📅 Modovi
- **Dnevni / Tjedni / Mjesečni** — ista riječ za sve igrače u tom razdoblju (determinirano iz datuma, bez servera)
- **Neograničeno** — igraj bez kraja

### 👤 Računi i društveno
- Prijava korisničkim imenom + lozinkom (Supabase Auth)
- **Statistika po varijanti** — odigrano, postotak pobjeda, niz, rekord, raspodjela pogodaka, prosjek
- **Ljestvica po varijanti** s prekidačem **Globalno / Prijatelji**
- **Prijatelji** — traženje, zahtjevi, prihvaćanje
- **⚔️ Izazovi** — pošalji prijatelju dvoboj na 10 riječi; pobjeđuje tko ih riješi u manje pokušaja ili kraćem vremenu

### 🎨 Personalizacija
- **9 tema** (tamne i svijetle) + odabir vlastite boje naglaska
- **Vlastiti avatar** (upload slike)
- **Dvojezično sučelje** 🌍 — engleski (zadano) i hrvatski

### 📱 Mobilno
- Responzivan raspored za sve varijante
- Podržava i tipkovnicu na ekranu i nativnu tipkovnicu telefona

---

## 🛠️ Tehnologije

| Sloj | Tehnologija |
|------|-------------|
| Sučelje | React (JSX, hooks) |
| Build | Vite |
| Baza / Auth / Storage | Supabase (Postgres + RLS) |
| Objava | Vercel |
| Stil | čisti CSS (CSS varijable za teme) |

---

## 📂 Struktura projekta

```
src/
├─ App.jsx            # glavna igra (Igra) + router (varijante → modovi → igra/izazov)
├─ main.jsx           # ulazna točka; primjenjuje temu i jezik
├─ rijeci.js          # popisi riječi + ocjenjivanje pogotka (dijele igra i izazov)
├─ varijante.js       # definicije varijanti (Klasik/Dvojac/Četvorka/Osmorka)
├─ moduli.js          # definicije modova (dnevni/tjedni/mjesečni/neograničeno)
├─ i18n.jsx           # prijevodi (EN/HR) + React Context
├─ tema.js            # sustav tema (CSS varijable)
├─ HubVarijanti.jsx   # 1. ekran: odabir vrste igre + akcije
├─ Pocetna.jsx        # 2. ekran: odabir moda
├─ IgraIzazov.jsx     # ekran igranja izazova (10 riječi)
├─ Prijava.jsx        # prijava / registracija
├─ Postavke.jsx       # postavke (jezik, tema, boja, avatar, ime, lozinka)
├─ Statistika.jsx     # detaljna statistika
├─ Ljestvica.jsx      # ljestvica po varijanti
├─ Prijatelji.jsx     # prijatelji
├─ Izazovi.jsx        # popis i slanje izazova
├─ Avatar.jsx         # avatar (slika ili početno slovo)
└─ supabaseClient.js  # Supabase klijent
```

---

## 🧠 Kako radi (zanimljivi dijelovi)

- **Ocjenjivanje pogotka u dvije faze** (`ocijeniRijec`) — prvo se označe točna mjesta, pa "žuta", da se **dupli slovi** ispravno broje.
- **Determinirane riječi iz datuma** — dnevna/tjedna/mjesečna riječ računa se iz broja razdoblja, pa svi igrači dobiju istu riječ **bez servera**. Za više riječi mali generator (LCG) iz jednog "sjemena" izbaci N različitih riječi.
- **Statistika u oblaku** — sprema se u Supabase (JSONB, ugniježđeno po varijanti i modu) uz lokalnu kopiju u `localStorage`.
- **Ljestvica po varijanti** — zasebna tablica `rezultati` (ključ: igrač + varijanta), spojena s profilom preko stranog ključa.
- **Izazovi (asinkroni)** — 10 riječi spremi se pri stvaranju; svaki igrač upisuje svoj rezultat; pobjednik se izračuna kad su oba gotova.

---

## 🗄️ Supabase tablice

| Tablica | Svrha |
|---------|-------|
| `profili` | javni profil (ime, avatar, ukupno pobjeda) |
| `statistike` | detaljna statistika po igraču (JSONB) |
| `rezultati` | pobjede + niz po varijanti (za ljestvicu) |
| `prijateljstva` | zahtjevi i prijateljstva |
| `izazovi` | dvoboji na 10 riječi |

Sve tablice imaju uključen **Row Level Security (RLS)**.

---

## 🚀 Pokretanje lokalno

```bash
npm install     # instaliraj pakete
npm run dev     # pokreni razvojni server (localhost:5173)
npm run build   # produkcijski build
```

> Napomena: Supabase `anon` ključ je namijenjen da bude javan — sigurnost se postiže RLS pravilima u bazi, a ne skrivanjem ključa.

---

## 📈 Kako je nastajalo (faze razvoja)

1. **Jezgra igre** — ploča, tipkanje, ocjenjivanje 🟩🟨⬜, provjera riječi, animacije
2. **Modovi** — dnevni/tjedni/mjesečni/neograničeni + odbrojavanje
3. **Računi (Supabase)** — prijava, statistika u oblaku, ljestvica, prijatelji
4. **Mobilna dostandardizacija** — responzivan raspored + tipkovnica telefona
5. **Postavke** — teme, vlastita boja, avatar, detaljna statistika
6. **Varijante** — 1/2/4/8 riječi odjednom + statistika po varijanti
7. **Ljestvica po varijanti** — Globalno / Prijatelji
8. **Jezik** 🌍 — engleski + hrvatski
9. **Izazovi** ⚔️ — asinkroni dvoboji na 10 riječi

*Sljedeće:* live izazovi na poteze (Supabase Realtime), timer mod.

---

Napravljeno s ❤️ uz React.
