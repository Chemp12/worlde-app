import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useJezik } from './i18n'
import Avatar from './Avatar'
import './modal.css'
import './Prijatelji.css'

function Prijatelji({ korisnik, onZatvori }) {
  const { t } = useJezik()
  const [prijateljstva, setPrijateljstva] = useState([]) // sirovi redovi iz baze
  const [imena, setImena] = useState({})                 // mapa: user_id -> username
  const [upit, setUpit] = useState('')                   // tekst pretrage
  const [rezultati, setRezultati] = useState([])         // rezultati pretrage
  const [poruka, setPoruka] = useState('')

  // Učitaj sva moja prijateljstva + imena drugih korisnika.
  async function ucitaj() {
    const { data, error } = await supabase.from('prijateljstva').select('*')
    if (error) {
      console.error('Čitanje prijateljstava nije uspjelo:', error.message)
      return
    }
    setPrijateljstva(data)

    // Skupi ID-eve "drugih" osoba pa dohvati njihova imena iz profila.
    const drugiIds = data.map((p) =>
      p.posiljatelj === korisnik.id ? p.primatelj : p.posiljatelj
    )
    if (drugiIds.length > 0) {
      const { data: profili } = await supabase
        .from('profili')
        .select('user_id, username, avatar_url')
        .in('user_id', drugiIds)
      const mapa = {}
      profili?.forEach((pr) => (mapa[pr.user_id] = pr)) // spremi cijeli profil (ime + avatar)
      setImena(mapa)
    }
  }

  useEffect(() => {
    ucitaj()
  }, [])

  // Pretraži korisnike po imenu (iz javne tablice profila).
  async function trazi(tekst) {
    setUpit(tekst)
    setPoruka('')
    if (tekst.trim().length < 2) {
      setRezultati([])
      return
    }
    const { data } = await supabase
      .from('profili')
      .select('user_id, username, avatar_url')
      .ilike('username', `%${tekst.trim()}%`) // ilike = pretraga bez obzira na velika/mala slova
      .limit(5)
    // makni sebe iz rezultata
    setRezultati((data || []).filter((u) => u.user_id !== korisnik.id))
  }

  async function posaljiZahtjev(primateljId) {
    const { error } = await supabase.from('prijateljstva').insert({
      posiljatelj: korisnik.id,
      primatelj: primateljId,
      status: 'na_cekanju',
    })
    if (error) {
      setPoruka(t('fr_request_exists'))
    } else {
      setPoruka(t('fr_request_sent'))
      setUpit('')
      setRezultati([])
      ucitaj()
    }
  }

  async function prihvati(id) {
    await supabase.from('prijateljstva').update({ status: 'prihvaceno' }).eq('id', id)
    ucitaj()
  }

  async function ukloni(id) {
    await supabase.from('prijateljstva').delete().eq('id', id)
    ucitaj()
  }

  // Podijeli prijateljstva u kategorije
  const prijatelji = prijateljstva.filter((p) => p.status === 'prihvaceno')
  const zahtjeviZaMene = prijateljstva.filter(
    (p) => p.status === 'na_cekanju' && p.primatelj === korisnik.id
  )
  const poslaniZahtjevi = prijateljstva.filter(
    (p) => p.status === 'na_cekanju' && p.posiljatelj === korisnik.id
  )

  // Vrati ime "druge" osobe u nekom prijateljstvu
  function drugiId(p) {
    return p.posiljatelj === korisnik.id ? p.primatelj : p.posiljatelj
  }
  function drugoIme(p) {
    return imena[drugiId(p)]?.username || '...'
  }
  function drugiAvatar(p) {
    return imena[drugiId(p)]?.avatar_url
  }

  return (
    <div className="modal-pozadina" onClick={onZatvori}>
      <div className="modal-kartica" onClick={(e) => e.stopPropagation()}>
        <div className="modal-zaglavlje">
          <h2>{t('fr_title')}</h2>
          <button className="modal-zatvori" onClick={onZatvori}>
            ✕
          </button>
        </div>

        {/* Pretraga */}
        <input
          className="prij-pretraga"
          type="text"
          placeholder={t('fr_search')}
          value={upit}
          onChange={(e) => trazi(e.target.value)}
        />
        {poruka && <p className="prij-poruka">{poruka}</p>}

        {rezultati.map((u) => (
          <div className="prij-red" key={u.user_id}>
            <span className="prij-osoba">
              <Avatar url={u.avatar_url} ime={u.username} size={30} />
              {u.username}
            </span>
            <button className="prij-gumb dodaj" onClick={() => posaljiZahtjev(u.user_id)}>
              {t('fr_add')}
            </button>
          </div>
        ))}

        {/* Zahtjevi za mene */}
        {zahtjeviZaMene.length > 0 && (
          <>
            <h3 className="prij-naslov">{t('fr_requests')}</h3>
            {zahtjeviZaMene.map((p) => (
              <div className="prij-red" key={p.id}>
                <span className="prij-osoba">
                  <Avatar url={drugiAvatar(p)} ime={drugoIme(p)} size={30} />
                  {drugoIme(p)}
                </span>
                <span>
                  <button className="prij-gumb dodaj" onClick={() => prihvati(p.id)}>
                    {t('fr_accept')}
                  </button>
                  <button className="prij-gumb odbij" onClick={() => ukloni(p.id)}>
                    {t('fr_decline')}
                  </button>
                </span>
              </div>
            ))}
          </>
        )}

        {/* Prijatelji */}
        <h3 className="prij-naslov">{t('fr_my_friends', { n: prijatelji.length })}</h3>
        {prijatelji.length === 0 && <p className="prij-info">{t('fr_none')}</p>}
        {prijatelji.map((p) => (
          <div className="prij-red" key={p.id}>
            <span>👤 {drugoIme(p)}</span>
            <button className="prij-gumb odbij" onClick={() => ukloni(p.id)}>
              {t('fr_remove')}
            </button>
          </div>
        ))}

        {/* Poslani zahtjevi (na čekanju) */}
        {poslaniZahtjevi.length > 0 && (
          <>
            <h3 className="prij-naslov">{t('fr_sent')}</h3>
            {poslaniZahtjevi.map((p) => (
              <div className="prij-red" key={p.id}>
                <span className="prij-osoba">
                  <Avatar url={drugiAvatar(p)} ime={drugoIme(p)} size={30} />
                  {drugoIme(p)}
                </span>
                <span className="prij-info">{t('fr_pending')}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

export default Prijatelji
