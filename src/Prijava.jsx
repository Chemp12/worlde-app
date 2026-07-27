import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useJezik } from './i18n'
import './Prijava.css'

// Pretvori tehničku grešku Supabasea u razumljivu poruku (t = prijevod).
function prevediGresku(poruka, t) {
  if (poruka.includes('Invalid login credentials')) return t('login_err_credentials')
  if (poruka.includes('already registered')) return t('login_err_taken')
  if (poruka.includes('Password should be')) return t('login_err_pass_min')
  return poruka // ako ne prepoznamo -> pokaži original
}

function Prijava() {
  const { t } = useJezik()
  const [jeRegistracija, setJeRegistracija] = useState(false) // false = prijava, true = registracija
  const [username, setUsername] = useState('')
  const [lozinka, setLozinka] = useState('')
  const [greska, setGreska] = useState('')
  const [ucitava, setUcitava] = useState(false)

  async function posalji(event) {
    event.preventDefault() // spriječi da preglednik osvježi stranicu
    setGreska('')

    if (username.trim().length < 3) {
      setGreska(t('login_err_name_min'))
      return
    }
    if (lozinka.length < 6) {
      setGreska(t('login_err_pass_min'))
      return
    }

    setUcitava(true)
    const uneseno = username.trim()

    if (jeRegistracija) {
      // Je li ime slobodno?
      const { data: zauzet } = await supabase
        .from('profili')
        .select('user_id')
        .ilike('username', uneseno)
        .limit(1)
      if (zauzet && zauzet.length > 0) {
        setGreska(t('login_err_taken'))
        setUcitava(false)
        return
      }

      // Email za prijavu je NASUMIČAN i stalan (nije vezan uz ime -> ime se može mijenjati/osloboditi).
      const email = `${crypto.randomUUID()}@wordle.local`
      const { data, error } = await supabase.auth.signUp({
        email,
        password: lozinka,
        options: { data: { username: uneseno } },
      })
      if (error) {
        setGreska(prevediGresku(error.message, t))
        setUcitava(false)
        return
      }

      // Kreiraj profil: prikazano ime + skriveni email za prijavu.
      if (data.user) {
        const { error: greskaProfil } = await supabase
          .from('profili')
          .insert({ user_id: data.user.id, username: uneseno, login_email: email })
        if (greskaProfil) {
          setGreska(t('login_err_taken'))
          setUcitava(false)
          return
        }
      }
    } else {
      // Prijava: nađi skriveni email za prijavu prema (prikazanom) imenu.
      const { data: profil } = await supabase
        .from('profili')
        .select('login_email')
        .ilike('username', uneseno)
        .limit(1)
      const email = profil?.[0]?.login_email
      if (!email) {
        setGreska(t('login_err_credentials'))
        setUcitava(false)
        return
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password: lozinka })
      if (error) setGreska(prevediGresku(error.message, t))
    }

    setUcitava(false)
    // Ako je uspjelo, App to primijeti (onAuthStateChange) i prikaže igru.
  }

  return (
    <div className="prijava-pozadina">
      <form className="prijava-kutija" onSubmit={posalji}>
        <h1 className="prijava-logo">WORDLE</h1>
        <p className="prijava-podnaslov">
          {jeRegistracija ? t('register_subtitle') : t('login_subtitle')}
        </p>

        <input
          className="prijava-polje"
          type="text"
          placeholder={t('login_username')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <input
          className="prijava-polje"
          type="password"
          placeholder={t('login_password')}
          value={lozinka}
          onChange={(e) => setLozinka(e.target.value)}
          autoComplete={jeRegistracija ? 'new-password' : 'current-password'}
        />

        {jeRegistracija && <p className="prijava-napomena">{t('register_warning')}</p>}
        {greska && <p className="prijava-greska">{greska}</p>}

        <button className="prijava-gumb" type="submit" disabled={ucitava}>
          {ucitava ? t('moment') : jeRegistracija ? t('register_submit') : t('login_submit')}
        </button>

        <button
          className="prijava-prebaci"
          type="button"
          onClick={() => {
            setJeRegistracija(!jeRegistracija)
            setGreska('')
          }}
        >
          {jeRegistracija ? t('login_switch_to_login') : t('login_switch_to_register')}
        </button>
      </form>
    </div>
  )
}

export default Prijava
