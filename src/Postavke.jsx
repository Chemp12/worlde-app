import { useState, useRef } from 'react'
import { supabase } from './supabaseClient'
import { TEME, ucitajTemuId, postaviTemu, ucitajBoju, postaviBoju } from './tema'
import { useJezik, JEZICI } from './i18n'
import Statistika from './Statistika'

// Ponuđene boje naglaska
const BOJE = ['#538d4e', '#4a90d9', '#8b5cf6', '#d9534f', '#e08e0b', '#159a8c', '#d6568c']
import './modal.css'
import './Postavke.css'

function Postavke({ korisnik, ime, onOdjava, onZatvori }) {
  const { t, jezik, postaviJezik } = useJezik()
  const [noviUsername, setNoviUsername] = useState('')
  const [novaLozinka, setNovaLozinka] = useState('')
  const [poruka, setPoruka] = useState('')
  const [radi, setRadi] = useState(false)
  const [prikaziStat, setPrikaziStat] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(korisnik.user_metadata?.avatar_url || null)
  const [temaId, setTemaId] = useState(ucitajTemuId())
  const [boja, setBoja] = useState(
    ucitajBoju() || TEME.find((t) => t.id === ucitajTemuId())?.accent || '#538d4e'
  )
  const fileRef = useRef(null)

  function odaberiTemu(id) {
    setTemaId(id)
    postaviTemu(id) // primijeni cijelu temu + zapamti (resetira vlastitu boju)
    const t = TEME.find((x) => x.id === id)
    setBoja(t?.accent || '#538d4e')
  }

  function odaberiBoju(novaBoja) {
    setBoja(novaBoja)
    postaviBoju(novaBoja)
  }

  async function promijeniAvatar(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPoruka(t('set_pick_image'))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setPoruka(t('set_image_too_big'))
      return
    }

    setRadi(true)
    const putanja = `${korisnik.id}/avatar` // svaki korisnik u svojoj mapi

    // Uploadaj (upsert: true -> prebriši staru sliku)
    const { error: greskaUpload } = await supabase.storage
      .from('avatari')
      .upload(putanja, file, { upsert: true, contentType: file.type })
    if (greskaUpload) {
      setPoruka('❌ ' + greskaUpload.message)
      setRadi(false)
      return
    }

    // Dohvati javni URL (+ ?t=... da preglednik ne pokaže staru keširanu sliku)
    const { data } = supabase.storage.from('avatari').getPublicUrl(putanja)
    const url = data.publicUrl + '?t=' + Date.now()

    // Spremi URL u račun (za brzi prikaz) i u profil (za ljestvicu/prijatelje)
    await supabase.auth.updateUser({ data: { avatar_url: url } })
    await supabase.from('profili').update({ avatar_url: url }).eq('user_id', korisnik.id)

    setAvatarUrl(url)
    setPoruka(t('set_image_updated'))
    setRadi(false)
  }

  async function promijeniUsername() {
    setPoruka('')
    const zeljeno = noviUsername.trim()
    if (zeljeno.length < 3) {
      setPoruka(t('set_name_min'))
      return
    }
    setRadi(true)

    // 1) Je li ime slobodno? (samo prikazano ime -> oslobođena imena su dostupna)
    const { data: postojeci } = await supabase
      .from('profili')
      .select('user_id')
      .ilike('username', zeljeno)
    const zauzeto = (postojeci || []).some((r) => r.user_id !== korisnik.id)
    if (zauzeto) {
      setPoruka(t('set_name_taken'))
      setRadi(false)
      return
    }

    // 2) Ažuriraj prikazano ime u profilu (jedinstveni indeks u bazi je krajnja zaštita).
    //    login_email se NE dira -> prijava i dalje radi.
    const { error: greskaProfil } = await supabase
      .from('profili')
      .update({ username: zeljeno })
      .eq('user_id', korisnik.id)
    if (greskaProfil) {
      setPoruka(t('set_name_taken'))
      setRadi(false)
      return
    }

    // 3) Ažuriraj i metapodatke (za prikaz imena u kutu ekrana).
    await supabase.auth.updateUser({ data: { username: zeljeno } })

    setPoruka(t('set_username_changed'))
    setNoviUsername('')
    setRadi(false)
  }

  async function promijeniLozinku() {
    setPoruka('')
    if (novaLozinka.length < 6) {
      setPoruka(t('set_pass_min'))
      return
    }
    setRadi(true)
    const { error } = await supabase.auth.updateUser({ password: novaLozinka })
    if (error) {
      setPoruka('❌ ' + error.message)
      setRadi(false)
      return
    }
    setPoruka(t('set_pass_changed'))
    setNovaLozinka('')
    setRadi(false)
  }

  return (
    <>
    <div className="modal-pozadina" onClick={onZatvori}>
      <div className="modal-kartica postavke-kartica" onClick={(e) => e.stopPropagation()}>
        <div className="modal-zaglavlje">
          <h2>{t('set_title')}</h2>
          <button className="modal-zatvori" onClick={onZatvori}>
            ✕
          </button>
        </div>

        {/* Kartica računa s avatarom (klik na avatar mijenja sliku) */}
        <div className="postavke-racun">
          <div
            className="postavke-avatar"
            onClick={() => fileRef.current?.click()}
            title={t('set_change_pic')}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" />
            ) : (
              (ime || '?').charAt(0).toUpperCase()
            )}
            <span className="postavke-avatar-badge">+</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={promijeniAvatar}
            style={{ display: 'none' }}
          />
          <div className="postavke-racun-info">
            <span className="postavke-oznaka">{t('set_logged_as')}</span>
            <span className="postavke-username">{ime}</span>
          </div>
        </div>

        {/* Gumb statistike — kao settings redak */}
        <button className="postavke-red-gumb" onClick={() => setPrikaziStat(true)}>
          <span>{t('set_detailed_stats')}</span>
          <span className="postavke-chevron">›</span>
        </button>

        {/* Odabir jezika */}
        <h3 className="postavke-naslov">{t('set_language')}</h3>
        <div className="postavke-jezici">
          {JEZICI.map((j) => (
            <button
              key={j.id}
              className={`jezik-gumb ${jezik === j.id ? 'aktivan' : ''}`}
              onClick={() => postaviJezik(j.id)}
            >
              {j.ime}
            </button>
          ))}
        </div>

        {/* Galerija tema */}
        <h3 className="postavke-naslov">{t('set_theme')}</h3>
        <div className="postavke-teme">
          {TEME.map((tema) => (
            <button
              key={tema.id}
              className={`tema-izbor ${temaId === tema.id ? 'aktivna' : ''}`}
              style={{
                background: tema.vars['--bg'] || (tema.osnova === 'svijetla' ? '#ffffff' : '#121213'),
                color: tema.accent,
              }}
              onClick={() => odaberiTemu(tema.id)}
            >
              {t('tema_' + tema.id + '_ime')}
            </button>
          ))}
        </div>

        {/* Odabir boje naglaska */}
        <h3 className="postavke-naslov">{t('set_color')}</h3>
        <div className="postavke-boje">
          {BOJE.map((b) => (
            <button
              key={b}
              className={`boja-krug ${boja.toLowerCase() === b ? 'aktivna' : ''}`}
              style={{ background: b }}
              onClick={() => odaberiBoju(b)}
              title={b}
            />
          ))}
          {/* Vlastita boja (otvara birač boja) */}
          <label className="boja-krug boja-custom">
            🎨
            <input
              type="color"
              value={boja}
              onChange={(e) => odaberiBoju(e.target.value)}
            />
          </label>
        </div>

        {/* Promjena korisničkog imena */}
        <h3 className="postavke-naslov">{t('set_change_username')}</h3>
        <div className="postavke-forma">
          <input
            className="postavke-polje"
            type="text"
            placeholder={t('set_new_username')}
            value={noviUsername}
            onChange={(e) => setNoviUsername(e.target.value)}
          />
          <button className="postavke-gumb" onClick={promijeniUsername} disabled={radi}>
            {t('save')}
          </button>
        </div>

        {/* Promjena lozinke */}
        <h3 className="postavke-naslov">{t('set_change_password')}</h3>
        <div className="postavke-forma">
          <input
            className="postavke-polje"
            type="password"
            placeholder={t('set_new_password')}
            value={novaLozinka}
            onChange={(e) => setNovaLozinka(e.target.value)}
          />
          <button className="postavke-gumb" onClick={promijeniLozinku} disabled={radi}>
            {t('save')}
          </button>
        </div>

        {poruka && <p className="postavke-poruka">{poruka}</p>}

        <button className="postavke-odjava" onClick={onOdjava}>
          {t('logout')}
        </button>

        <p className="postavke-info">{t('set_made_with')}</p>
      </div>
    </div>

    {prikaziStat && (
      <Statistika korisnik={korisnik} onZatvori={() => setPrikaziStat(false)} />
    )}
    </>
  )
}

export default Postavke
