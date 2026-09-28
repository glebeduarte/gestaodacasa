import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
export function BackBar({ to = '/', titulo, acao }) {
  return (
    <div className="backbar">
      <Link className="iconbtn" to={to} aria-label="Voltar"><ChevronLeft size={22} className="i" /></Link>
      <div className="t">{titulo}</div>
      {acao || <span style={{ width: 42 }} />}
    </div>
  )
}
