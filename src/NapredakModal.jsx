import { useJezik } from './i18n'
import { agregat, izracunajXp, razinaZaXp, POSTIGNUCA } from './napredak'
import './modal.css'
import './Napredak.css'

// Modal: razina + XP traka + postignuća (sve izračunato iz statistike).
function NapredakModal({ podaci, onZatvori }) {
  const { t } = useJezik()
  const a = agregat(podaci)
  const xp = izracunajXp(podaci)
  const r = razinaZaXp(xp)
  const postotak = Math.round((r.uRazini / r.zaSljedecu) * 100)

  return (
    <div className="modal-pozadina" onClick={onZatvori}>
      <div className="modal-kartica" onClick={(e) => e.stopPropagation()}>
        <div className="modal-zaglavlje">
          <h2>{t('progress_title')}</h2>
          <button className="modal-zatvori" onClick={onZatvori}>
            ✕
          </button>
        </div>

        {/* Razina + XP traka */}
        <div className="np-razina">
          <div className="np-krug">{r.razina}</div>
          <div className="np-info">
            <span className="np-oznaka">
              {t('level')} {r.razina}
            </span>
            <div className="np-traka">
              <div className="np-traka-fill" style={{ width: `${postotak}%` }} />
            </div>
            <span className="np-xp">
              {r.uRazini} / {r.zaSljedecu} XP
            </span>
          </div>
        </div>

        {/* Postignuća */}
        <h3 className="np-naslov">{t('achievements')}</h3>
        <div className="np-postignuca">
          {POSTIGNUCA.map((p) => {
            const ostvareno = p.uvjet(a)
            return (
              <div className={`np-post ${ostvareno ? 'ostvareno' : ''}`} key={p.id}>
                <span className="np-post-ikona">{p.ikona}</span>
                <span className="np-post-ime">{t('post_' + p.id)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default NapredakModal
