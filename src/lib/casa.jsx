import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, definirCasaAtual } from '../supabase'

const Ctx = createContext(null)
export const useCasa = () => useContext(Ctx)
const CHAVE = 'gd.casa'
const lerSalva = () => { try { return localStorage.getItem(CHAVE) } catch { return null } }
const salvar = (id) => { try { localStorage.setItem(CHAVE, id) } catch { /* sem storage */ } }

// Carrega as casas do usuário (com o papel dele) e mantém a casa em uso
export function CasaProvider({ sessao, children }) {
  const [casas, setCasas] = useState(null)
  const [casa, setCasa] = useState(null)
  const uid = sessao?.user?.id

  const carregar = useCallback(async (preferir) => {
    await supabase.rpc('aceitar_convites').then(() => null, () => null)
    const { data } = await supabase.from('casa_membros').select('papel, casas(*)').eq('user_id', uid)
    const lista = (data || []).filter(m => m.casas).map(m => ({ ...m.casas, papel: m.papel })).sort((a, b) => a.criado_em.localeCompare(b.criado_em))
    setCasas(lista)
    const alvo = lista.find(c => c.id === (preferir || lerSalva())) || lista[0] || null
    definirCasaAtual(alvo?.id || null); setCasa(alvo)
    if (alvo) salvar(alvo.id)
    return lista
  }, [uid])

  useEffect(() => { if (uid) carregar() }, [uid, carregar])

  const trocar = (id) => { const c = casas.find(x => x.id === id); if (!c) return; definirCasaAtual(c.id); salvar(c.id); setCasa(c) }
  const valor = { casas, casa, trocar, recarregar: carregar, podeEditar: casa && casa.papel !== 'leitura', ehDono: casa?.papel === 'dono' }
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}
