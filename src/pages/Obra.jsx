import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Phone, MessageCircle, Pencil, Check, Plus, FileText, Hammer, Package, ListChecks, ChevronDown, RotateCcw } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados, soma } from '../hooks'
import { brl, dataCurta, iniciais, diasAte, semanasDesde, semanasTotal, numero, mascaraReais, exibirReais } from '../util'
import { BackBar } from '../components/ui/BackBar'
import { FolhaDespesa } from '../components/FolhaDespesa'
import { FolhaObra } from './Obras'
import { Sheet } from '../components/ui/Sheet'
import { catStyle } from '../lib/categoryStyle'
import { useToast } from '../components/ui/Toast'
import { FolhaEditarDespesa } from '../components/FolhaEditarDespesa'
import { Trash2 } from 'lucide-react'

const STATUS_CHIP = { orcamento_pendente: ['warn', 'Orçamento pendente'], em_andamento: ['pool', 'Em andamento'], pausada: ['', 'Pausada'], concluida: ['ok', 'Concluída'], cancelada: ['danger', 'Cancelada'] }

export default function Obra() {
  const { id } = useParams()
  const toast = useToast()
  const [pagar, setPagar] = useState(false)
  const [editar, setEditar] = useState(false)
  const [orc, setOrc] = useState(false)
  const [att, setAtt] = useState(false)
  const [editDespesa, setEditDespesa] = useState(null)
  const [novoItem, setNovoItem] = useState('')
  const [filtroCk, setFiltroCk] = useState('todos')

  const { dados, recarregar } = useDados(async () => {
    const [o, cats, pessoas, despesas, itens, atts, orcs] = await Promise.all([
      supabase.from('obras').select('*, pessoas(nome,telefone,funcao), categorias(*)').eq('id', id).single().then(r => r.data),
      supabase.from('categorias').select('id,nome,cor,icone').eq('ativo', true).then(r => r.data || []),
      supabase.from('pessoas').select('id,nome,funcao').eq('ativo', true).order('nome').then(r => r.data || []),
      supabase.from('despesas').select('*').eq('obra_id', id).order('data', { ascending: false }).then(r => r.data || []),
      supabase.from('obra_itens').select('*').eq('obra_id', id).order('ordem').then(r => r.data || []).catch(() => []),
      supabase.from('obra_atualizacoes').select('*').eq('obra_id', id).order('criado_em', { ascending: false }).then(r => r.data || []).catch(() => []),
      supabase.from('obra_orcamentos').select('*, pessoas(nome)').eq('obra_id', id).order('criado_em', { ascending: false }).then(r => r.data || []).catch(() => []),
    ])
    return { o, cats, pessoas, despesas, itens, atts, orcs }
  }, [id])
  if (!dados) return <p className="carregando">Carregando…</p>
  const { o, cats, pessoas, despesas, itens, atts, orcs } = dados
  const feitos = itens.filter(i => i.concluido).length
  const pctCk = itens.length ? Math.round(feitos / itens.length * 100) : 0
  const itensVis = filtroCk === 'pendentes' ? itens.filter(i => !i.concluido) : filtroCk === 'feitos' ? itens.filter(i => i.concluido) : itens

  const pagamentos = despesas.filter(d => d.tipo !== 'material')
  const pago = soma(pagamentos)
  // saldo que restava depois de cada pagamento (do mais antigo para o mais recente)
  const saldoApos = {}
  if (o?.orcamento_total) { let acc = 0; [...pagamentos].sort((a, b) => (a.data + a.criado_em).localeCompare(b.data + b.criado_em)).forEach(d => { acc += Number(d.valor); saldoApos[d.id] = Number(o.orcamento_total) - acc }) }
  const material = soma(despesas.filter(d => d.tipo === 'material'))
  const falta = o.orcamento_total ? Math.max(0, o.orcamento_total - pago) : null
  const excedente = o.orcamento_total ? Math.max(0, pago - o.orcamento_total) : 0
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
  const marcar = async (it) => {
    const concluido = !it.concluido
    await supabase.from('obra_itens').update({ concluido, concluido_em: concluido ? new Date().toISOString().slice(0, 10) : null }).eq('id', it.id)
    recarregar()
  }
  const addItem = async () => {
    const t = novoItem.trim(); if (!t) return
    await supabase.from('obra_itens').insert({ obra_id: id, descricao: t, concluido: false, ordem: itens.length })
    setNovoItem(''); recarregar()
  }
  const mudarStatus = async (status) => {
    if (status === o.status) return
    try {
      await supabase.from('obras').update({ status, data_conclusao: status === 'concluida' ? (o.data_conclusao || new Date().toISOString().slice(0, 10)) : null }).eq('id', id)
      toast(`Status: ${STATUS_CHIP[status][1]}`); recarregar()
    } catch { /* aviso já mostrado */ }
  }
  const concluir = async () => { if (!confirm('Marcar esta obra como concluída?')) return; await supabase.from('obras').update({ status: 'concluida', data_conclusao: new Date().toISOString().slice(0, 10) }).eq('id', id); toast('Obra concluída'); recarregar() }

  return (
    <>
      <BackBar to="/obras" titulo="Obra" acao={<button className="btn sm" onClick={() => setEditar(true)}><Pencil size={15} className="i" />Editar</button>} />
      <div className="px mt16">
        <div className="chips"><label className={`chip ${chipCls} status-pick`}>{chipTxt}<ChevronDown size={13} className="i" /><select value={o.status} onChange={e => mudarStatus(e.target.value)} aria-label="Mudar status">{Object.entries(STATUS_CHIP).map(([k, [, t]]) => <option key={k} value={k}>{t}</option>)}</select></label>{o.area_casa && <span className="chip">{o.area_casa}</span>}{o.data_inicio && <span className="chip">{dataCurta(o.data_inicio)}{o.prazo_previsto ? ` a ${dataCurta(o.prazo_previsto)}` : ''}</span>}</div>
        <h1 style={{ marginTop: 10 }}>{o.nome}</h1>
      </div>

      <div className="px mt16">
        <div className="card">
          {o.orcamento_total ? (<>
            <div className="barlabel"><span>Pago</span><span><b className="num">{brl(pago)}</b> de {brl(o.orcamento_total)}</span></div>
            <div className="bar" style={{ height: 12 }}><i style={{ width: pct + '%', '--b': 'linear-gradient(90deg,var(--pool),var(--primary))' }} /></div>
            <div className="stats two mt12">
              <div className="stat" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}><p className="l">{excedente > 0 ? 'Acima do combinado' : 'Falta pagar'}</p><p className="v num" style={{ color: excedente > 0 ? 'var(--danger)' : 'inherit' }}>{brl(excedente > 0 ? excedente : falta)}</p></div>
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

      <section className="sec">
        <div className="sec-h"><h2>Descritivo</h2>{!o.descricao && <button className="link" onClick={() => setEditar(true)}>+ Escrever</button>}</div>
        <div className="px">{o.descricao
          ? <div className="card descritivo">{o.descricao}</div>
          : <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nada descrito ainda. Anote o escopo, as etapas de pagamento e quem fornece o material.</p></div>}</div>
      </section>

      <section className="sec">
        <div className="sec-h"><h2>Checklist</h2>{itens.length > 0 && <span className="chip ok">{feitos} de {itens.length} feitos</span>}</div>
        <div className="px"><div className="card">
          {itens.length > 0 && (<>
            <div className="barlabel"><span><ListChecks size={15} className="i" style={{ verticalAlign: -3 }} /> Progresso do combinado</span><b>{pctCk}%</b></div>
            <div className="bar" style={{ height: 10 }}><i style={{ width: pctCk + '%', '--b': 'var(--ok)' }} /></div>
            <div className="seg mt12">
              <button className={filtroCk === 'todos' ? 'on' : ''} onClick={() => setFiltroCk('todos')}>Todos</button>
              <button className={filtroCk === 'pendentes' ? 'on' : ''} onClick={() => setFiltroCk('pendentes')}>Falta · {itens.length - feitos}</button>
              <button className={filtroCk === 'feitos' ? 'on' : ''} onClick={() => setFiltroCk('feitos')}>Feitos · {feitos}</button>
            </div>
            <div className="ck-list">{itensVis.map(it => (
              <button key={it.id} type="button" className={`ck-row ${it.concluido ? 'on' : ''}`} onClick={() => marcar(it)}>
                <span className="ck-box">{it.concluido && <Check size={15} strokeWidth={3} className="i" />}</span>
                <span className="ck-t">{it.descricao}{it.concluido && it.concluido_em && <small>feito em {dataCurta(it.concluido_em)}</small>}</span>
              </button>))}
              {itensVis.length === 0 && <p className="muted" style={{ padding: '10px 2px' }}>Nada aqui.</p>}
            </div>
          </>)}
          {itens.length === 0 && <p className="muted" style={{ marginBottom: 10 }}>Liste o que será feito nesta obra para ir marcando o que já ficou pronto.</p>}
          <div className="ck-add">
            <input className="input" value={novoItem} onChange={e => setNovoItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="Novo item do checklist" />
            <button className="btn sm dark" onClick={addItem}><Plus size={15} className="i" />Item</button>
          </div>
        </div></div>
      </section>

      <section className="sec">
        <div className="sec-h"><h2>Pagamentos</h2><button className="link" onClick={() => setPagar(true)}>+ Registrar</button></div>
        <div className="px">{despesas.length === 0 ? <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhum pagamento ou material registrado ainda.</p></div>
          : <div className="list">{despesas.map(d => (
            <button key={d.id} type="button" className="row" onClick={() => setEditDespesa(d)}><span className={`tile t-md ${d.tipo === 'material' ? 'c-estoque' : 'c-obras'}`}>{d.tipo === 'material' ? <Package size={22} className="i" /> : <Hammer size={22} className="i" />}</span>
              <div className="grow"><p className="t">{d.descricao}</p><p className="s">{dataCurta(d.data)}{d.forma_pagamento ? ` · ${d.forma_pagamento}` : ''}{d.fotos?.length ? ' · nota anexada' : ''}</p>
                {saldoApos[d.id] !== undefined && <p className="s" style={{ color: saldoApos[d.id] < 0 ? 'var(--danger)' : 'var(--ink-2)', fontWeight: 700 }}>{saldoApos[d.id] > 0 ? `Faltava ${brl(saldoApos[d.id])} após este` : saldoApos[d.id] === 0 ? 'Quitou o combinado' : `Passou ${brl(-saldoApos[d.id])} do combinado`}</p>}</div>
              <p className="num" style={{ fontWeight: 800 }}>{brl(d.valor)}</p></button>
          ))}</div>}</div>
      </section>

      <section className="sec">
        <div className="sec-h"><h2>Orçamentos</h2><button className="link" onClick={() => setOrc(true)}>+ Adicionar</button></div>
        <div className="px">{orcs.length === 0 ? <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhum orçamento guardado. Adicione as propostas dos fornecedores e aprove a escolhida.</p></div>
          : <div className="stack-y">{orcs.map(g => (
            <div key={g.id} className="card"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><p style={{ fontWeight: 700 }}>{g.fornecedor || g.pessoas?.nome || 'Fornecedor'}</p><p className="muted">{g.validade ? `válido até ${dataCurta(g.validade)}` : 'sem validade'}{g.observacoes ? ` · ${g.observacoes}` : ''}</p></div>
              <b className="num">{brl(g.valor)}</b></div>
              <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>{g.aprovado ? <span className="chip ok"><Check size={13} className="i" />Aprovado</span> : <button className="btn sm dark" onClick={() => aprovar(g)}>Aprovar este</button>}
                <span style={{ flex: 1 }} /><button className="iconbtn" style={{ width: 34, height: 34 }} onClick={() => setOrc(g)} aria-label="Editar"><Pencil size={15} className="i" /></button></div>
            </div>
          ))}</div>}</div>
      </section>

      <section className="sec"><div className="sec-h"><h2>Andamento</h2><button className="link" onClick={() => setAtt(true)}>+ Anotar</button></div>
        <div className="px">{atts.length === 0 ? <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhuma anotação. Registre o que aconteceu em cada visita ou semana.</p></div>
          : <div className="list">{atts.map(a => <button key={a.id} type="button" className="row" onClick={() => setAtt(a)}><div className="grow"><p className="s" style={{ marginTop: 0, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{a.texto}</p></div><span className="muted">{dataCurta(a.data || (a.criado_em || '').slice(0, 10))}</span></button>)}</div>}</div>
      </section>

      {fotos.length > 0 && (
        <section className="sec"><div className="sec-h"><h2>Fotos da obra</h2></div>
          <div className="px photos">{fotos.slice(0, 9).map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" /></a>)}</div></section>
      )}

      <div className="px mt16"><Link className="btn block" to={`/relatorios/obras/${o.id}`}><FileText size={17} className="i" />Ver relatório da obra</Link></div>
      <div className="px mt12 btnrow">
        <button className="btn dark" onClick={() => setPagar(true)}><Plus size={18} className="i" />Pagamento</button>
        {o.status !== 'concluida' ? <button className="btn primary" onClick={concluir}><Check size={18} className="i" />Concluir</button>
          : <button className="btn soft" onClick={() => mudarStatus('em_andamento')}><RotateCcw size={18} className="i" />Reabrir obra</button>}
      </div>
      <div style={{ height: 12 }} />

      {pagar && <FolhaDespesa inicial={{ tipo: 'obra', obra_id: o.id, categoria_id: o.categoria_id || '', pessoa_id: o.empreiteiro_id || '', descricao: '' }} onFechar={() => setPagar(false)} onSalvo={recarregar} />}
      {editar && <FolhaObra inicial={(({ pessoas: _p, categorias: _c, ...r }) => r)(o)} itensIniciais={itens} cats={cats} pessoas={pessoas} onFechar={() => setEditar(false)} onSalvo={recarregar} />}
      {editDespesa && <FolhaEditarDespesa despesa={editDespesa} onFechar={() => setEditDespesa(null)} onSalvo={recarregar} />}
      {orc && <FolhaOrcamento inicial={orc === true ? {} : orc} obra_id={o.id} pessoas={pessoas} onFechar={() => setOrc(false)} onSalvo={recarregar} />}
      {att && <FolhaAtualizacao inicial={att === true ? {} : att} obra_id={o.id} onFechar={() => setAtt(false)} onSalvo={recarregar} />}
    </>
  )
}

function FolhaOrcamento({ inicial = {}, obra_id, pessoas, onFechar, onSalvo }) {
  const [f, setF] = useState({ fornecedor: '', pessoa_id: '', valor: '', validade: '', observacoes: '', ...Object.fromEntries(Object.entries(inicial).filter(([k]) => k !== 'pessoas').map(([k, v]) => [k, v ?? ''])), ...(inicial.valor != null ? { valor: String(inicial.valor).replace('.', ',') } : {}) })
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    const valor = numero(f.valor); if (!valor) return alert('Informe um valor válido.')
    const payload = { fornecedor: f.fornecedor || null, pessoa_id: f.pessoa_id || null, valor, validade: f.validade || null, observacoes: f.observacoes || null }
    try {
      if (f.id) await supabase.from('obra_orcamentos').update(payload).eq('id', f.id)
      else await supabase.from('obra_orcamentos').insert({ ...payload, obra_id, aprovado: false })
      onSalvo(); onFechar()
    } catch { /* aviso já mostrado */ }
  }
  const excluir = async () => { if (!confirm('Excluir este orçamento?')) return; try { await supabase.from('obra_orcamentos').delete().eq('id', f.id); onSalvo(); onFechar() } catch { /* aviso já mostrado */ } }
  return (
    <Sheet titulo={f.id ? 'Editar orçamento' : 'Novo orçamento'} onFechar={onFechar}>
      <div className="stack-y">
        <label className="field"><span className="l">Fornecedor</span><input className="input" value={f.fornecedor} onChange={e => set('fornecedor', e.target.value)} placeholder="Nome de quem orçou" /></label>
        <label className="field"><span className="l">Ou pessoa cadastrada</span><select className="input" value={f.pessoa_id} onChange={e => set('pessoa_id', e.target.value)}><option value="">Nenhuma</option>{(pessoas || []).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}><span className="l">Valor (R$)</span><input className="input" inputMode="numeric" value={exibirReais(f.valor)} onChange={e => set('valor', mascaraReais(e.target.value))} /></label>
          <label className="field" style={{ flex: 1 }}><span className="l">Validade</span><input className="input" type="date" value={f.validade} onChange={e => set('validade', e.target.value)} /></label>
        </div>
        <label className="field"><span className="l">Observações</span><textarea className="input" value={f.observacoes} onChange={e => set('observacoes', e.target.value)} /></label>
        <button className="btn primary block" onClick={salvar}>Salvar orçamento</button>
        {f.id && <button className="btn block" style={{ color: 'var(--danger)' }} onClick={excluir}><Trash2 size={16} className="i" />Excluir orçamento</button>}
      </div>
    </Sheet>
  )
}

function FolhaAtualizacao({ inicial = {}, obra_id, onFechar, onSalvo }) {
  const [f, setF] = useState({ data: new Date().toISOString().slice(0, 10), texto: '', ...Object.fromEntries(Object.entries(inicial).map(([k, v]) => [k, v ?? ''])) })
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.texto.trim()) return
    try {
      if (f.id) await supabase.from('obra_atualizacoes').update({ data: f.data, texto: f.texto }).eq('id', f.id)
      else await supabase.from('obra_atualizacoes').insert({ obra_id, data: f.data, texto: f.texto, tipo: 'nota' })
      onSalvo(); onFechar()
    } catch { /* aviso já mostrado */ }
  }
  const excluir = async () => { if (!confirm('Excluir esta anotação?')) return; try { await supabase.from('obra_atualizacoes').delete().eq('id', f.id); onSalvo(); onFechar() } catch { /* aviso já mostrado */ } }
  return (
    <Sheet titulo={f.id ? 'Editar anotação' : 'Anotar andamento'} onFechar={onFechar}>
      <div className="stack-y">
        <label className="field"><span className="l">Data</span><input className="input" type="date" value={f.data} onChange={e => set('data', e.target.value)} /></label>
        <label className="field"><span className="l">O que aconteceu</span><textarea className="input" value={f.texto} onChange={e => set('texto', e.target.value)} placeholder="Ex.: estrutura pronta, faltou material" /></label>
        <button className="btn primary block" onClick={salvar}>Salvar</button>
        {f.id && <button className="btn block" style={{ color: 'var(--danger)' }} onClick={excluir}><Trash2 size={16} className="i" />Excluir anotação</button>}
      </div>
    </Sheet>
  )
}
