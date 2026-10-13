import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados, q, soma } from '../hooks'
import { brl, mesAtual, variacao } from '../util'
import { CatTile } from '../lib/categoryStyle'
import { SectionHero, SectionTile } from '../components/Secao'
import { SECOES, temaCategoria } from '../lib/sectionThemes'
import { useAdicionar } from '../components/Adicionar'
import { useNavigate } from 'react-router-dom'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export default function Categorias() {
  const [offset, setOffset] = useState(0)
  const [ordem, setOrdem] = useState('gasto')
  const nav = useNavigate()
  const { abrir } = useAdicionar()
  const { dados } = useDados(async () => {
    const d = new Date(); d.setMonth(d.getMonth() + offset)
    const y = d.getFullYear(), m = d.getMonth()
    const ini = new Date(y, m, 1).toISOString().slice(0, 10), fim = new Date(y, m + 1, 0).toISOString().slice(0, 10)
    const iniA = new Date(y, m - 1, 1).toISOString().slice(0, 10), fimA = new Date(y, m - 1, 0).toISOString().slice(0, 10)
    const [categorias, despesas, anteriores, fixos] = await Promise.all([
      q.categorias(),
      supabase.from('despesas').select('categoria_id,valor').gte('data', ini).lte('data', fim).then(r => r.data || []),
      supabase.from('despesas').select('categoria_id,valor').gte('data', iniA).lte('data', fimA).then(r => r.data || []),
      q.custosFixos(),
    ])
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    return { categorias, despesas, anteriores, fixos, label }
  }, [offset])
  if (!dados) return <p className="carregando">Carregando…</p>
  const { categorias, despesas, anteriores, fixos, label } = dados

  const linhas = categorias.map(c => {
    const gasto = soma(despesas.filter(d => d.categoria_id === c.id))
    const ant = soma(anteriores.filter(d => d.categoria_id === c.id))
    const fixo = soma(fixos.filter(f => f.categoria_id === c.id))
    return { ...c, gasto, ant, fixo, avulso: Math.max(0, gasto - fixo), varia: variacao(gasto, ant) }
  })
  const total = soma(despesas)
  const visiveis = [...linhas].filter(l => ordem !== 'fixos' || l.fixo > 0)
  if (ordem === 'gasto') visiveis.sort((a, b) => b.gasto - a.gasto)
  if (ordem === 'az') visiveis.sort((a, b) => a.nome.localeCompare(b.nome))

  return (
    <>
      <SectionHero chave="categorias" g={SECOES.categorias.g} Icon={SECOES.categorias.Icon} titulo="Categorias" subtitulo="Toque numa categoria para ver e lançar" valor={brl(total)}>
        <div className="mes-nav">
          <button onClick={() => setOffset(o => o - 1)} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
          <b>{label.charAt(0).toUpperCase() + label.slice(1)}</b>
          <button onClick={() => setOffset(o => Math.min(0, o + 1))} aria-label="Próximo mês" disabled={offset >= 0}><ChevronRight size={18} /></button>
        </div>
      </SectionHero>

      <div className="hscroll">
        <button className={`pick ${ordem === 'gasto' ? 'on' : ''}`} onClick={() => setOrdem('gasto')}>Maior gasto</button>
        <button className={`pick ${ordem === 'az' ? 'on' : ''}`} onClick={() => setOrdem('az')}>A a Z</button>
      </div>

      <div className="s-grid mt12">
        {visiveis.map((l, i) => { const tc = temaCategoria(l, i); return (
          <SectionTile key={l.id} chave={`cat_${l.id}`} arteChave={tc.arte} g={tc.g} Icon={tc.Icon} nome={l.nome}
            resumo={`${brl(l.gasto)}${l.varia !== null && Math.abs(l.varia) >= 3 ? ` · ${l.varia > 0 ? '+' : ''}${l.varia}%` : ''}`}
            onAbrir={() => nav(`/categorias/${l.id}`)} onMais={() => abrir({ tipo: 'gasto', categoria_id: l.id })} />
        ) })}
      </div>
      <div style={{ height: 12 }} />
    </>
  )
}
