import { useEffect, useState, createContext, useContext } from 'react'
import { Check } from 'lucide-react'
const Ctx = createContext(() => {})
export function useToast() { return useContext(Ctx) }
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null)
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 2200); return () => clearTimeout(t) }, [msg])
  return <Ctx.Provider value={setMsg}>{children}{msg && <div className="toast"><Check size={18} className="i" />{msg}</div>}</Ctx.Provider>
}
