import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Phone, MessageCircle } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados, q, soma } from '../hooks'
import { brl, dataCurta, iniciais, hoje, mesAtual, UNIDADE } from '../util'
import { catStyle } from '../lib/categoryStyle'
import { BackBar } from '../components/ui/BackBar'
import { Sheet } from '../components/ui/Sheet'
import { useToast } from '../components/ui/Toast'

const DIAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] // seg..dom
const DIAS_KEY = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']

// Classe de cor do avatar a partir da categoria da pessoa
export function corAvatar(pessoa) {
  return catStyle(pessoa?.categorias).cls
}
// Valor previsto no mês para uma pessoa
export function previstoMes(p) {
  const v = Number(p.valor_combinado || 0)
  if (p.unidade_valor === 'mes' || p.frequencia === 'mensal') return v
  if (p.frequencia === 'semanal') return v * 4
  if (p.frequencia === 'quinzenal') return v * 2
  return v
}

export default function Pessoas() {
  const [filtro, setFiltro] = useState('todos')
  const [nova, setNova] = useState(null)
  const toast = useToast()
  const { dados, recarregar } = useDados(async () => {
    const [pessoas, cats, obras, despesas] = await Promise.all([
      q.pessoas(),
      supabase.from('categorias').select('id,nome,cor,icone').eq('ativo', true).then(r => r.data || []),
      supabase.from('obras').select('id,nome,empreiteiro_id,status').in('status', ['orcamento_pendente', 'em_andamento', 'pausada']).then(r => r.data || []),
      q.despesasMes(),
    ])
    return { pessoas, cats, obras, despesas }
  })
  if (!dados) return <p className="carregando">Carregando…</p>
  const { pessoas, cats, obras, despesas } = dados
  const m = mesAtual()

  const comStatus = pessoas.map(p => {
    const pagoMes = despesas.filter(d => d.pessoa_id === p.id)
    const totalPago = soma(pagoMes)
    const ultimo = pagoMes[0]
    const prev = previstoMes(p)
    const obra = obras.find(o => o.empreiteiro_id === p.id)
    let status, chip
    if (p.frequencia === 'por_obra' || p.unidade_valor === 'obra') { status = 'obra'; chip = obra ? { cls: 'pool', txt: `Obra: ${obra.nome}` } : { cls: '', txt: 'Por obra' } }
    else if (totalPago >= prev && prev > 0) { status = 'pago'; chip = { cls: 'ok', txt: ultimo ? `Pago em ${dataCurta(ultimo.data)}` : 'Pago' } }
    else { status = 'apagar'; chip = { cls: 'warn', txt: 'A pagar este mês' } }
    return { ...p, prev, totalPago, status, chip, obra }
  })

  const previsto = comStatus.reduce((t, p) => t + (p.status === 'obra' ? 0 : p.prev), 0)
  const jaPago = soma(comStatus.map(p => ({ v: p.totalPago })), 'v')
  const falta = Math.max(0, previsto - jaPago)
  const apagar = comStatus.filter(p => p.status === 'apagar').length

  let lista = comStatus
  if (filtro === 'apagar') lista = comStatus.filter(p => p.status === 'apagar')
  if (filtro === 'semana') lista = comStatus.filter(p => (p.dias_semana || []).length > 0)
  if (filtro === 'obras') lista = comStatus.filter(p => p.status === 'obra')

  const tel = (p) => (p.telefone || '').replace(/\D/g, '')

  return (
    <>
      <BackBar titulo="Pessoas" acao={<button className="iconbtn" onClick={() => setNova({})} aria-label="Nova"><Plus size={20} className="i" /></button>} />
      <header className="hdr" style={{ paddingTop: 12, paddingBottom: 8 }}><div><p className="eyebrow">Quem cuida da casa</p><h1>Pessoas</h1></div></header>

      <div className="px stats">
        <div className="stat"><p className="l">Previsto</p><p className="v num">{brl(previsto)}</p></div>
        <div className="stat"><p className="l" style={{ color: 'var(--ok)' }}>Já pago</p><p className="v num">{brl(jaPago)}</p></div>
        <div className="stat"><p className="l" style={{ color: 'var(--danger)' }}>Falta</p><p className="v num">{brl(falta)}</p></div>
      </div>

      <div className="hscroll mt16">
        <button className={`pick ${filtro === 'todos' ? 'on' : ''}`} onClick={() => setFiltro('todos')}>Todos</button>
        <button className={`pick ${filtro === 'apagar' ? 'on' : ''}`} onClick={() => setFiltro('apagar')}>A pagar{apagar ? ` · ${apagar}` : ''}</button>
        <button className={`pick ${filtro === 'semana' ? 'on' : ''}`} onClick={() => setFiltro('semana')}>Vêm esta semana</button>
        <button className={`pick ${filtro === 'obras' ? 'on' : ''}`} onClick={() => setFiltro('obras')}>Obras</button>
      </div>

      <section className="px mt12 stack-y">
        {lista.length === 0 && <div className="tip"><p className="s" style={{ marginTop: 0 }}>Ninguém aqui ainda. Toque em + para cadastrar diaristas, piscineiro, jardineiro e outros.</p></div>}
        {lista.map(p => (
          <div key={p.id} className="card">
            <Link to={`/pessoas/${p.id}`} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className={`pill-av ${corAvatar(p)}`}>{iniciais(p.nome)}</div>
              <div style={{ flex: 1, minWidth: 0 }}><h3>{p.nome}</h3><p className="sub">{p.funcao}</p></div>
              <div style={{ textAlign: 'right' }}><p style={{ fontWeight: 800 }} className="num">{brl(p.valor_combinado)}</p><p className="muted">{UNIDADE[p.unidade_valor] || p.frequencia || ''}</p></div>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 8 }}>
              {(p.dias_semana || []).length > 0
                ? <div className="days">{DIAS.map((d, i) => <span key={i} className={(p.dias_semana || []).includes(DIAS_KEY[i]) ? 'on' : ''}>{d}</span>)}</div>
                : <span className="chip">{p.frequencia === 'por_demanda' ? 'Por demanda' : p.frequencia || ''}</span>}
              <span className={`chip ${p.chip.cls}`}>{p.chip.txt}</span>
            </div>
            <div className="btnrow mt12">
              {tel(p) && <a className="btn sm wa" href={`https://wa.me/55${tel(p)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} className="i" />WhatsApp</a>}
              {tel(p) && <a className="btn sm call" href={`tel:${tel(p)}`}><Phone size={15} className="i" />Ligar</a>}
              {p.status !== 'pago' && p.status !== 'obra' && <Link className="btn sm primary" to={`/pessoas/${p.id}`}>Pagar</Link>}
            </div>
          </div>
        ))}
      </section>
      <div style={{ height: 12 }} />
      {nova && <FolhaPessoa inicial={nova} cats={cats} onFechar={() => setNova(null)} onSalvo={recarregar} />}
    </>
  )
}

export function FolhaPessoa({ inicial = {}, cats, onFechar, onSalvo }) {
  const [f, setF] = useState({ nome: '', funcao: '', categoria_id: '', frequencia: 'mensal', valor_combinado: '', unidade_valor: 'mes', telefone: '', dias_semana: [], forma_pagamento: 'Pix', observacoes: '', ...inicial })
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const toggleDia = (d) => set('dias_semana', f.dias_semana.includes(d) ? f.dias_semana.filter(x => x !== d) : [...f.dias_semana, d])
  const salvar = async () => {
    if (!f.nome) return
    const payload = { nome: f.nome, funcao: f.funcao || null, categoria_id: f.categoria_id || null, frequencia: f.frequencia, valor_combinado: f.valor_combinado ? Number(f.valor_combinado) : null, unidade_valor: f.unidade_valor, telefone: f.telefone || null, dias_semana: f.dias_semana, forma_pagamento: f.forma_pagamento, observacoes: f.observacoes || null, ativo: true }
    if (f.id) await supabase.from('pessoas').update(payload).eq('id', f.id)
    else await supabase.from('pessoas').insert(payload)
    onSalvo(); onFechar()
  }
  return (
    <Sheet titulo={f.id ? 'Editar pessoa' : 'Nova pessoa'} onFechar={onFechar}>
      <div className="stack-y">
        <label className="field"><span className="l">Nome</span><input className="input" value={f.nome} onChange={e => set('nome', e.target.value)} /></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}><span className="l">Função</span><input className="input" value={f.funcao} onChange={e => set('funcao', e.target.value)} placeholder="Diarista, piscineiro…" /></label>
          <label className="field" style={{ flex: 1 }}><span className="l">Telefone</span><input className="input" inputMode="tel" value={f.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(84) 9…" /></label>
        </div>
        <label className="field"><span className="l">Categoria</span><select className="input" value={f.categoria_id} onChange={e => set('categoria_id', e.target.value)}><option value="">Nenhuma</option>{(cats || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}><span className="l">Valor combinado</span><input className="input" inputMode="decimal" value={f.valor_combinado} onChange={e => set('valor_combinado', e.target.value)} /></label>
          <label className="field" style={{ flex: 1 }}><span className="l">Unidade</span><select className="input" value={f.unidade_valor} onChange={e => set('unidade_valor', e.target.value)}>{Object.entries(UNIDADE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        </div>
        <label className="field"><span className="l">Frequência</span><select className="input" value={f.frequencia} onChange={e => set('frequencia', e.target.value)}>{['semanal', 'quinzenal', 'mensal', 'por_demanda', 'por_obra'].map(v => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}</select></label>
        <div className="field"><span className="l">Dias da semana</span><div className="days">{DIAS.map((d, i) => <button key={i} type="button" className={f.dias_semana.includes(DIAS_KEY[i]) ? 'on' : ''} onClick={() => toggleDia(DIAS_KEY[i])} style={{ width: 34, height: 34, borderRadius: 10, fontWeight: 800, fontSize: 12, background: f.dias_semana.includes(DIAS_KEY[i]) ? 'var(--pool-soft)' : 'var(--surface-2)', color: f.dias_semana.includes(DIAS_KEY[i]) ? '#08798C' : '#A8B7C6' }}>{d}</button>)}</div></div>
        <label className="field"><span className="l">Observações</span><textarea className="input" value={f.observacoes} onChange={e => set('observacoes', e.target.value)} /></label>
        <button className="btn primary block" onClick={salvar}>Salvar pessoa</button>
      </div>
    </Sheet>
  )
}
