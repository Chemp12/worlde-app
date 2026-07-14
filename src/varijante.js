// Vrste Wordlea — koliko riječi pogađaš ODJEDNOM.
// brojRedova = broj pokušaja koje imaš (standard: brojRijeci + 5).
export const VARIJANTE = [
  { id: 'klasik', ime: 'Klasik', ikona: '1️⃣', brojRijeci: 1, brojRedova: 6, opis: 'Jedna riječ' },
  { id: 'dvojac', ime: 'Dvojac', ikona: '2️⃣', brojRijeci: 2, brojRedova: 7, opis: 'Dvije riječi odjednom' },
  { id: 'cetvorka', ime: 'Četvorka', ikona: '4️⃣', brojRijeci: 4, brojRedova: 9, opis: 'Četiri riječi odjednom' },
  { id: 'osmorka', ime: 'Osmorka', ikona: '8️⃣', brojRijeci: 8, brojRedova: 13, opis: 'Osam riječi odjednom' },
]

// Pronađi varijantu po id-u (fallback na klasik ako id ne postoji).
export function varijantaPoId(id) {
  return VARIJANTE.find((v) => v.id === id) || VARIJANTE[0]
}
