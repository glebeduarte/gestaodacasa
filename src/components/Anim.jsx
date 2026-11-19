import { useEffect, useRef, useState } from 'react'
import { brl } from '../util'

const reduzir = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Valor que "roda" até o número final
export function useConta(alvo, ms = 900) {
  const [v, setV] = useState(reduzir() ? alvo : 0)
  const de = useRef(0)
  useEffect(() => {
    if (reduzir()) { setV(alvo); return }
    const ini = performance.now(), a = de.current
    let id
    const passo = (t) => { const p = Math.min(1, (t - ini) / ms), e = 1 - Math.pow(1 - p, 3); setV(a + (alvo - a) * e); if (p < 1) id = requestAnimationFrame(passo); else de.current = alvo }
    id = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(id)
  }, [alvo, ms])
  return v
}
export function Conta({ valor, fmt = brl, ms }) { return <>{fmt(useConta(Number(valor) || 0, ms))}</> }

// Medidor em arco com ponteiro (0 a 100+)
export function Medidor({ pct, rotulo, sub, cor = 'var(--v2-ac2)' }) {
  const p = useConta(Math.max(0, pct || 0), 1100)
  const lim = Math.min(p, 100)
  const R = 80, cx = 100, cy = 100
  const ang = (g) => (g * Math.PI) / 180
  const pt = (g, r = R) => [cx + r * Math.cos(ang(g)), cy + r * Math.sin(ang(g))]
  const arco = (a, b) => { const [x1, y1] = pt(a), [x2, y2] = pt(b); return `M${x1} ${y1} A${R} ${R} 0 ${b - a > 180 ? 1 : 0} 1 ${x2} ${y2}` }
  const span = 200 // arco de 170° a 370°
  const a0 = 170, aP = a0 + span * (lim / 100)
  const [nx, ny] = pt(aP, R - 32)
  return (
    <div className="v2-gauge">
      <svg viewBox="0 0 200 130" aria-hidden="true">
        <path d={arco(a0, a0 + span)} className="trk" />
        {lim > 0.5 && <path d={arco(a0, aP)} className="val" style={{ stroke: cor }} />}
        {Array.from({ length: 11 }).map((_, i) => { const a = a0 + span * i / 10; const [x1, y1] = pt(a, R - 24), [x2, y2] = pt(a, R - 30); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="tick" /> })}
        <line x1={cx} y1={cy} x2={nx} y2={ny} className="ptr" />
        <circle cx={cx} cy={cy} r="7" className="hub" />
      </svg>
      <div className="v2-gauge-n"><b>{p.toFixed(1).replace('.', ',')}%</b>{rotulo && <small>{rotulo}</small>}</div>
      {sub && <p className="v2-gauge-sub">{sub}</p>}
    </div>
  )
}
