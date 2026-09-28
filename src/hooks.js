import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { mesAtual } from './util'

export function useDados(fn, deps = []) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const recarregar = useCallback(() => { setErro(null); fn().then(setDados).catch(e => setErro(e.message)) }, deps) // eslint-disable-line
  useEffect(() => { recarregar() }, [recarregar])
  return { dados, erro, recarregar }
}

export const soma = (lista, campo = 'valor') => (lista || []).reduce((t, x) => t + Number(x[campo] || 0), 0)

export const q = {
  categorias: () => supabase.from('categorias').select('*').eq('ativo', true).order('ordem').then(r => r.data || []),
  pessoas: () => supabase.from('pessoas').select('*, categorias(*)').eq('ativo', true).order('nome').then(r => r.data || []),
  custosFixos: () => supabase.from('custos_fixos').select('*, categorias(*), pessoas(nome, telefone)').eq('ativo', true).then(r => r.data || []),
  obras: () => supabase.from('obras').select('*, pessoas(nome, telefone, funcao), categorias(*)').order('criado_em', { ascending: false }).then(r => r.data || []),
  despesasMes: (m = mesAtual()) => supabase.from('despesas').select('*, categorias(*), pessoas(nome), obras(nome)').gte('data', m.ini).lte('data', m.fim).order('data', { ascending: false }).then(r => r.data || []),
  despesas: (filtro = {}) => {
    let s = supabase.from('despesas').select('*, categorias(*), pessoas(nome), obras(nome)').order('data', { ascending: false }).limit(300)
    if (filtro.categoria_id) s = s.eq('categoria_id', filtro.categoria_id)
    if (filtro.obra_id) s = s.eq('obra_id', filtro.obra_id)
    if (filtro.pessoa_id) s = s.eq('pessoa_id', filtro.pessoa_id)
    return s.then(r => r.data || [])
  },
  // Contadores de pendências para os badges da navegação
  pendencias: async () => {
    const hoje = new Date().toISOString().slice(0, 10)
    const em30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    const [manut, docs, estoque] = await Promise.all([
      supabase.from('manutencoes').select('id,proxima').eq('ativo', true).not('proxima', 'is', null).lte('proxima', hoje).then(r => (r.data || []).length),
      supabase.from('documentos').select('id,validade').not('validade', 'is', null).lte('validade', em30).then(r => (r.data || []).length),
      supabase.from('estoque_itens').select('id,quantidade,minimo').eq('ativo', true).then(r => (r.data || []).filter(e => Number(e.quantidade) <= Number(e.minimo)).length),
    ])
    return { manut, docs, estoque, total: manut + docs + estoque }
  },
}
