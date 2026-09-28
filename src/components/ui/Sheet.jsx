import { useEffect } from 'react'
import { X } from 'lucide-react'
export function Sheet({ titulo, onFechar, children, footer }) {
  useEffect(() => { const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = o } }, [])
  return (
    <>
      <div className="sheet-bg" onClick={onFechar} />
      <div className="sheet-wrap" role="dialog" aria-label={titulo}>
        <div className="handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2>{titulo}</h2>
          <button className="iconbtn" onClick={onFechar} aria-label="Fechar"><X size={20} className="i" /></button>
        </div>
        {children}
        {footer}
      </div>
    </>
  )
}
