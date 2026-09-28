import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { mesAtual } from './util'

// Carrega dados com recarga manual
export function useDados(fn, deps = []) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const recarregar = useCallback(() => {
    setErro(null)
    fn().then(setDados).catch(e => setErro(e.message))
  }, deps) // eslint-disable-line
  useEffect(() => { recarregar() }, [recarregar])
  return { dados, erro, recarregar }
}

export const q = {
  categorias: () => supabase.from('categorias').select('*').order('ordem').then(r => r.data || []),
  pessoas: () => supabase.from('pessoas').select('*, categorias(nome)').eq('ativo', true).order('nome').then(r => r.data || []),
  custosFixos: () => supabase.from('custos_fixos').select('*, categorias(nome), pessoas(nome)').eq('ativo', true).then(r => r.data || []),
  obras: () => supabase.from('obras').select('*, pessoas(nome), categorias(nome)').order('criado_em', { ascending: false }).then(r => r.data || []),
  despesasMes: () => {
    const { ini, fim } = mesAtual()
    return supabase.from('despesas').select('*, categorias(nome), pessoas(nome), obras(nome)').gte('data', ini).lte('data', fim).order('data', { ascending: false }).then(r => r.data || [])
  },
  despesas: (filtro = {}) => {
    let s = supabase.from('despesas').select('*, categorias(nome), pessoas(nome), obras(nome)').order('data', { ascending: false }).limit(200)
    if (filtro.categoria_id) s = s.eq('categoria_id', filtro.categoria_id)
    if (filtro.obra_id) s = s.eq('obra_id', filtro.obra_id)
    if (filtro.pessoa_id) s = s.eq('pessoa_id', filtro.pessoa_id)
    return s.then(r => r.data || [])
  },
}

export const soma = (lista, campo = 'valor') => (lista || []).reduce((t, x) => t + Number(x[campo] || 0), 0)
