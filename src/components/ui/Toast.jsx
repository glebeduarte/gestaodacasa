import { useEffect, useState, createContext, useContext } from 'react'
import { Check, TriangleAlert } from 'lucide-react'
const Ctx = createContext(() => {})
export function useToast() { return useContext(Ctx) }
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null)
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), msg.erro ? 5000 : 2200); return () => clearTimeout(t) }, [msg])
  useEffect(() => {
    const h = (e) => setMsg({ txt: `Não foi salvo: ${e.detail}`, erro: true })
    window.addEventListener('erro-db', h)
    // Erro não tratado de gravação: não deixa a tela quebrar
    const r = (e) => { if (e.reason?.original) e.preventDefault() }
    window.addEventListener('unhandledrejection', r)
    return () => { window.removeEventListener('erro-db', h); window.removeEventListener('unhandledrejection', r) }
  }, [])
  const mostrar = (m) => setMsg(typeof m === 'string' ? { txt: m } : m)
  return <Ctx.Provider value={mostrar}>{children}{msg && <div className={`toast ${msg.erro ? 'erro' : ''}`}>{msg.erro ? <TriangleAlert size={18} className="i" /> : <Check size={18} className="i" />}{msg.txt}</div>}</Ctx.Provider>
}
