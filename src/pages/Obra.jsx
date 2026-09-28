import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Phone, MessageCircle, Pencil, Check, Plus, FileText, Hammer, Package } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados, soma } from '../hooks'
import { brl, dataCurta, iniciais, diasAte, semanasDesde, semanasTotal } from '../util'
import { BackBar } from '../components/ui/BackBar'
import { FolhaDespesa } from '../components/FolhaDespesa'
import { FolhaObra } from './Obras'
import { Sheet } from '../components/ui/Sheet'
import { catStyle } from '../lib/categoryStyle'
import { useToast } from '../components/ui/Toast'

const STATUS_CHIP = { orcamento_pendente: ['warn', 'Orçamento pendente'], em_andamento: ['pool', 'Em andamento'], pausada: ['', 'Pausada'], concluida: ['ok', 'Concluída'], cancelada: ['danger', 'Cancelada'] }

export default function Obra() {
  const { id } = useParams()
  const toast = useToast()
  const [pagar, setPagar] = useState(false)
  const [editar, setEditar] = useState(false)
  const [orc, setOrc] = useState(false)
  const [att, setAtt] = useState(false)

  const { dados, recarregar } = useDados(async () => {
    const [o, cats, pessoas, despesas, itens, atts, orcs] = await Promise.all([
      supabase.from('obras').select('*, pessoas(nome,telefone,funcao), categorias(*)').eq('id', id).single().then(r => r.data),
      supabase.from('categorias').select('id,nome,cor,icone').eq('ativo', true).then(r => r.data || []),
      supabase.from('pessoas').select('id,nome,funcao').eq('ativo', true).order('nome').then(r => r.data || []),
      supabase.from('despesas').select('*').eq('obra_id', id).order('data', { ascending: false }).then(r => r.data || []),
      supabase.from('obra_itens').select('*').eq('obra_id', id).then(r => r.data || []).catch(() => []),
      supabase.from('obra_atualizacoes').select('*').eq('obra_id', id).order('criado_em', { ascending: false }).then(r => r.data || []).catch(() => []),
      supabase.from('obra_orcamentos').select('*, pessoas(nome)').eq('obra_id', id).order('criado_em', { ascending: false }).then(r => r.data || []).catch(() => []),
    ])
    return { o, cats, pessoas, despesas, itens, atts, orcs }
  }, [id])
  if (!dados) return <p className="carregando">Carregando…</p>
  const { o, cats, pessoas, despesas, atts, orcs } = dados

  const pago = soma(despesas.filter(d => d.tipo === 'obra'))
  const material = soma(despesas.filter(d => d.tipo === 'material'))
  const falta = o.orcamento_total ? Math.max(0, o.orcamento_total - pago) : null
  const pct = o.orcamento_total ? Math.min(100, Math.round(pago / o.orcamento_total * 100)) : null
  const sem = semanasDesde(o.data_inicio)
  const totalSem = semanasTotal(o.data_inicio, o.prazo_previsto)
  const diasRest = o.prazo_previsto ? diasAte(o.prazo_previsto) : null
  const [chipCls, chipTxt] = STATUS_CHIP[o.status] || ['', o.status]
  const fotos = despesas.flatMap(d => d.fotos || [])
  const tel = (o.pessoas?.telefone || '').replace(/\D/g, '')

  const aprovar = async (orcamento) => {
    if (!confirm(`Aprovar orçamento de ${brl(orcamento.valor)}? Isso define o combinado da obra.`)) return
    await supabase.from('obra_orcamentos').update({ aprovado: true }).eq('id', orcamento.id)
    await supabase.from('obras').update({ orcamento_total: orcamento.valor, combinado_verbal: false }).eq('id', id)
    toast('Orçamento aprovado'); recarregar()
  }
  const concluir = async () => { if (!confirm('Marcar esta obra como concluída?')) return; await supabase.from('obras').update({ status: 'concluida', data_conclusao: new Date().toISOString().slice(0, 10) }).eq('id', id); toast('Obra concluída'); recarregar() }

  return (
    <>
      <BackBar to="/obras" titulo="Obra" acao={<button className="iconbtn" onClick={() => setEditar(true)} aria-label="Editar"><Pencil size={18} className="i" /></button>} />
      <div className="px mt16">
        <div className="chips"><span className={`chip ${chipCls}`}>{chipTxt}</span>{o.area_casa && <span className="chip">{o.area_casa}</span>}{o.data_inicio && <span className="chip">{dataCurta(o.data_inicio)}{o.prazo_previsto ? ` a ${dataCurta(o.prazo_previsto)}` : ''}</span>}</div>
        <h1 style={{ marginTop: 10 }}>{o.nome}</h1>
      </div>

      <div className="px mt16">
        <div className="card">
          {o.orcamento_total ? (<>
            <div className="barlabel"><span>Pago</span><span><b className="num">{brl(pago)}</b> de {brl(o.orcamento_total)}</span></div>
            <div className="bar" style={{ height: 12 }}><i style={{ width: pct + '%', '--b': 'linear-gradient(90deg,var(--pool),var(--primary))' }} /></div>
            <div className="stats two mt12">
              <div className="stat" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}><p className="l">Falta pagar</p><p className="v num">{brl(falta)}</p></div>
              <div className="stat" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}><p className="l">Falta de prazo</p><p className="v">{diasRest !== null ? `${diasRest} dias` : '—'}</p></div>
            </div>
          </>) : <div className="note"><b>Sem orçamento definido</b>Registre um orçamento por escrito e aprove para acompanhar o quanto já foi pago.</div>}
          {totalSem && (<>
            <div className="divider" /><p className="sub" style={{ fontWeight: 700 }}>Semana da obra</p>
            <div className="weeks mt8">{Array.from({ length: totalSem }).map((_, i) => { const n = i + 1; const st = n < sem ? 'done' : n === sem ? 'now' : ''; return <div key={n} className={`w ${st}`}><span className="c">{st === 'done' ? <Check size={14} className="i" /> : n}</span>S{n}</div> })}</div>
          </>)}
          {material > 0 && <p className="muted" style={{ marginTop: 12 }}>Material comprado à parte: <b className="num" style={{ color: 'var(--ink)' }}>{brl(material)}</b></p>}
        </div>
      </div>

      {o.pessoas && (
        <div className="px mt12"><div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={`pill-av ${catStyle(o.categorias).cls}`}>{iniciais(o.pessoas.nome)}</div>
          <div style={{ flex: 1 }}><h3>{o.pessoas.nome}</h3><p className="sub">{o.pessoas.funcao || 'Responsável'}</p></div>
          {tel && <a className="iconbtn" style={{ background: '#E3F7EC', color: '#1E9C5A' }} href={`https://wa.me/55${tel}`} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle size={20} className="i" /></a>}
          {tel && <a className="iconbtn" style={{ background: 'var(--surface-2)' }} href={`tel:${tel}`} aria-label="Ligar"><Phone size={20} className="i" /></a>}
        </div></div>
      )}

      {o.descricao && <div className="px mt12"><div className="note"><b>O que foi combinado</b>{o.descricao}</div></div>}

      <section className="sec">
        <div className="sec-h"><h2>Pagamentos</h2><button className="link" onClick={() => setPagar(true)}>+ Registrar</button></div>
        <div className="px">{despesas.length === 0 ? <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhum pagamento ou material registrado ainda.</p></div>
          : <div className="list">{despesas.map(d => (
            <div key={d.id} className="row"><span className={`tile t-md ${d.tipo === 'material' ? 'c-estoque' : 'c-obras'}`}>{d.tipo === 'material' ? <Package size={22} className="i" /> : <Hammer size={22} className="i" />}</span>
              <div className="grow"><p className="t">{d.descricao}</p><p className="s">{dataCurta(d.data)}{d.forma_pagamento ? ` · ${d.forma_pagamento}` : ''}{d.fotos?.length ? ' · nota anexada' : ''}</p></div>
              <p className="num" style={{ fontWeight: 800 }}>{brl(d.valor)}</p></div>
          ))}</div>}</div>
      </section>

      <section className="sec">
        <div className="sec-h"><h2>Orçamentos</h2><button className="link" onClick={() => setOrc(true)}>+ Adicionar</button></div>
        <div className="px">{orcs.length === 0 ? <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhum orçamento guardado. Adicione as propostas dos fornecedores e aprove a escolhida.</p></div>
          : <div className="stack-y">{orcs.map(g => (
            <div key={g.id} className="card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><p style={{ fontWeight: 700 }}>{g.fornecedor || g.pessoas?.nome || 'Fornecedor'}</p><p className="muted">{g.validade ? `válido até ${dataCurta(g.validade)}` : 'sem validade'}{g.observacoes ? ` · ${g.observacoes}` : ''}</p></div>
              <b className="num">{brl(g.valor)}</b></div>
              <div style={{ marginTop: 10 }}>{g.aprovado ? <span className="chip ok"><Check size={13} className="i" />Aprovado</span> : <button className="btn sm dark" onClick={() => aprovar(g)}>Aprovar este</button>}</div>
            </div>
          ))}</div>}</div>
      </section>

      {atts.length > 0 && (
        <section className="sec"><div className="sec-h"><h2>Andamento</h2><button className="link" onClick={() => setAtt(true)}>+ Anotar</button></div>
          <div className="px"><div className="list">{atts.map(a => <div key={a.id} className="row"><div className="grow"><p className="t">{a.titulo || 'Atualização'}</p><p className="s">{a.descricao}</p></div><span className="muted">{dataCurta((a.criado_em || '').slice(0, 10))}</span></div>)}</div></div>
        </section>
      )}

      {fotos.length > 0 && (
        <section className="sec"><div className="sec-h"><h2>Fotos da obra</h2></div>
          <div className="px photos">{fotos.slice(0, 9).map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" /></a>)}</div></section>
      )}

      <div className="px mt24 btnrow">
        <button className="btn dark" onClick={() => setPagar(true)}><Plus size={18} className="i" />Pagamento</button>
        {o.status !== 'concluida' && <button className="btn primary" onClick={concluir}><Check size={18} className="i" />Concluir</button>}
      </div>
      <div style={{ height: 12 }} />

      {pagar && <FolhaDespesa inicial={{ tipo: 'obra', obra_id: o.id, categoria_id: o.categoria_id || '', pessoa_id: o.empreiteiro_id || '', descricao: '' }} onFechar={() => setPagar(false)} onSalvo={recarregar} />}
      {editar && <FolhaObra inicial={o} cats={cats} pessoas={pessoas} onFechar={() => setEditar(false)} onSalvo={recarregar} />}
      {orc && <FolhaOrcamento obra_id={o.id} pessoas={pessoas} onFechar={() => setOrc(false)} onSalvo={recarregar} />}
      {att && <FolhaAtualizacao obra_id={o.id} onFechar={() => setAtt(false)} onSalvo={recarregar} />}
    </>
  )
}

function FolhaOrcamento({ obra_id, pessoas, onFechar, onSalvo }) {
  const [f, setF] = useState({ fornecedor: '', pessoa_id: '', valor: '', validade: '', observacoes: '' })
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => { if (!f.valor) return; await supabase.from('obra_orcamentos').insert({ obra_id, fornecedor: f.fornecedor || null, pessoa_id: f.pessoa_id || null, valor: Number(f.valor), validade: f.validade || null, observacoes: f.observacoes || null, aprovado: false }); onSalvo(); onFechar() }
  return (
    <Sheet titulo="Novo orçamento" onFechar={onFechar}>
      <div className="stack-y">
        <label className="field"><span className="l">Fornecedor</span><input className="input" value={f.fornecedor} onChange={e => set('fornecedor', e.target.value)} placeholder="Nome de quem orçou" /></label>
        <label className="field"><span className="l">Ou pessoa cadastrada</span><select className="input" value={f.pessoa_id} onChange={e => set('pessoa_id', e.target.value)}><option value="">Nenhuma</option>{(pessoas || []).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}><span className="l">Valor (R$)</span><input className="input" inputMode="decimal" value={f.valor} onChange={e => set('valor', e.target.value)} /></label>
          <label className="field" style={{ flex: 1 }}><span className="l">Validade</span><input className="input" type="date" value={f.validade} onChange={e => set('validade', e.target.value)} /></label>
        </div>
        <label className="field"><span className="l">Observações</span><textarea className="input" value={f.observacoes} onChange={e => set('observacoes', e.target.value)} /></label>
        <button className="btn primary block" onClick={salvar}>Salvar orçamento</button>
      </div>
    </Sheet>
  )
}

function FolhaAtualizacao({ obra_id, onFechar, onSalvo }) {
  const [f, setF] = useState({ titulo: '', descricao: '' })
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => { if (!f.descricao) return; await supabase.from('obra_atualizacoes').insert({ obra_id, titulo: f.titulo || null, descricao: f.descricao }); onSalvo(); onFechar() }
  return (
    <Sheet titulo="Anotar andamento" onFechar={onFechar}>
      <div className="stack-y">
        <label className="field"><span className="l">Título</span><input className="input" value={f.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex.: estrutura pronta" /></label>
        <label className="field"><span className="l">O que aconteceu</span><textarea className="input" value={f.descricao} onChange={e => set('descricao', e.target.value)} /></label>
        <button className="btn primary block" onClick={salvar}>Salvar</button>
      </div>
    </Sheet>
  )
}
