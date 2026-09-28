import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados, q, soma } from '../hooks'
import { brl, mesAtual, variacao } from '../util'
import { CatTile } from '../lib/categoryStyle'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export default function Categorias() {
  const [offset, setOffset] = useState(0)
  const [ordem, setOrdem] = useState('gasto')
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
      <header className="hdr">
        <div><p className="eyebrow">Onde o dinheiro vai</p><h1>Categorias</h1></div>
        <Link to="/historico" className="iconbtn" aria-label="Histórico"><ChevronRight size={20} className="i" /></Link>
      </header>

      <div className="px" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <button className="iconbtn" onClick={() => setOffset(o => o - 1)} aria-label="Mês anterior"><ChevronLeft size={20} className="i" /></button>
        <b style={{ textTransform: 'capitalize', fontSize: 15 }}>{label}</b>
        <button className="iconbtn" onClick={() => setOffset(o => Math.min(0, o + 1))} aria-label="Próximo mês" disabled={offset >= 0} style={{ opacity: offset >= 0 ? .4 : 1 }}><ChevronRight size={20} className="i" /></button>
      </div>

      {total > 0 && (
        <section className="px mt16">
          <div className="card">
            <p className="muted" style={{ marginBottom: 10 }}>Como o mês se dividiu</p>
            <div style={{ display: 'flex', height: 12, borderRadius: 7, overflow: 'hidden', gap: 2 }}>
              {linhas.filter(l => l.gasto > 0).sort((a, b) => b.gasto - a.gasto).map(l => (
                <i key={l.id} className={l.cor || 'c-neutral'} title={l.nome} style={{ width: `${l.gasto / total * 100}%`, background: 'var(--c)', display: 'block' }} />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="hscroll mt16">
        <button className={`pick ${ordem === 'gasto' ? 'on' : ''}`} onClick={() => setOrdem('gasto')}>Maior gasto</button>
        <button className={`pick ${ordem === 'az' ? 'on' : ''}`} onClick={() => setOrdem('az')}>A a Z</button>
        <button className={`pick ${ordem === 'fixos' ? 'on' : ''}`} onClick={() => setOrdem('fixos')}>Só fixos</button>
      </div>

      <section className="px mt16">
        <div className="list">
          {visiveis.map(l => (
            <Link key={l.id} className="row" to={`/categorias/${l.id}`}>
              <CatTile cat={l} size="md" />
              <div className="grow"><p className="t">{l.nome}</p><p className="s">{l.fixo > 0 ? `Fixo ${brl(l.fixo)}${l.avulso > 0 ? ` + avulsos ${brl(l.avulso)}` : ''}` : l.gasto > 0 ? 'Só avulsos' : 'Sem gasto'}</p></div>
              <div className="r"><div className="v num">{brl(l.gasto)}</div>
                {l.varia !== null && (Math.abs(l.varia) < 3
                  ? <span className="chip" style={{ height: 20, fontSize: 11 }}><Minus size={12} className="i" />igual</span>
                  : <span className={`chip ${l.varia > 0 ? 'danger' : 'ok'}`} style={{ height: 20, fontSize: 11 }}>{l.varia > 0 ? <ArrowUp size={12} className="i" /> : <ArrowDown size={12} className="i" />}{Math.abs(l.varia)}%</span>)}
              </div>
            </Link>
          ))}
        </div>
      </section>
      <div style={{ height: 12 }} />
    </>
  )
}
