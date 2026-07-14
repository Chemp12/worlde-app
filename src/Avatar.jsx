import './Avatar.css'

// Mali okrugli avatar: pokaže sliku ako postoji, inače prvo slovo imena.
function Avatar({ url, ime, size = 32 }) {
  const inicijal = (ime || '?').charAt(0).toUpperCase()
  return (
    <span
      className="avatar"
      style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.45)}px` }}
    >
      {url ? <img src={url} alt="" /> : inicijal}
    </span>
  )
}

export default Avatar
