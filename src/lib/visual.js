import { useEffect, useState } from 'react'

// Visual em teste ("Noite"): tema escuro de vidro fosco com animações. Fica salvo só neste aparelho.
const CH = 'gd-visual'
const ler = () => { try { return localStorage.getItem(CH) === 'noite' } catch { return false } }
const aplicar = (on) => document.documentElement.classList.toggle('v2', on)
aplicar(ler())

export function useVisual() {
  const [noite, setNoite] = useState(ler)
  useEffect(() => { aplicar(noite); try { localStorage.setItem(CH, noite ? 'noite' : 'padrao') } catch { /* sem armazenamento */ } }, [noite])
  return { noite, alternar: () => setNoite(v => !v) }
}
