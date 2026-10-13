import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Hammer, Plus, Lightbulb, X, ListChecks, Camera } from 'lucide-react'
import { SectionHero } from '../components/Secao'
import { SECOES, degrade } from '../lib/sectionThemes'
import { useAdicionar } from '../components/Adicionar'
import { supabase } from '../supabase'
import { useDados, q, soma } from '../hooks'
import { brl, brlCurto, dataCurta, semanasDesde, semanasTotal, numero, mascaraReais, exibirReais } from '../util'
import { CatTile } from '../lib/categoryStyle'
import { Sheet } from '../components/ui/Sheet'

const ABERTAS = ['orcamento_pendente', 'em_andamento', 'pausada']

export default function Obras() {
  const [aba, setAba] = useState('todos')
  const { abrir } = useAdicionar()
  const nav = useNavigate()
  const [nova, setNova] = useState(false)
  const { dados, recarregar } = useDados(async () => {
    const [obras, cats, pessoas, despesas, itens] = await Promise.all([
      q.obras(),
      supabase.from('categorias').select('id,nome,cor,icone').eq('ativo', true).then(r => r.data || []),
      supabase.from('pessoas').select('id,nome,funcao').eq('ativo', true).order('nome').then(r => r.data || []),
      supabase.from('despesas').select('obra_id,valor,tipo').not('obra_id', 'is', null).then(r => r.data || []),
      supabase.from('obra_itens').select('obra_id,concluido').then(r => r.data || []),
    ])
    return { obras, cats, pessoas, despesas, itens }
  })
  if (!dados) return <p className="carregando">Carregando…</p>
  const { obras, cats, pessoas, despesas, itens } = dados
  const pagoDe = (id) => soma(despesas.filter(d => d.obra_id === id && d.tipo !== 'material'))
  const ordemStatus = (s) => (ABERTAS.includes(s) ? 0 : s === 'concluida' ? 1 : 2)
  const todas = [...obras].sort((a, b) => ordemStatus(a.status) - ordemStatus(b.status))
  const semPagamento = todas.filter(o => !despesas.some(d => d.obra_id === o.id))
  const lista = aba === 'todos' ? todas : semPagamento

  return (
    <>
      <SectionHero chave="obras" g={SECOES.obras.g} Icon={SECOES.obras.Icon} titulo="Obras" subtitulo="Orçamento, prazo e quanto já foi pago">
        <div className="btnrow mt12"><button className="btn sm" onClick={() => setNova(true)}><Plus size={15} className="i" />Nova obra</button></div>
      </SectionHero>
      <div className="s-note">💡 Toda obra começa com 3 coisas: responsável, orçamento por escrito e prazo.</div>

      <div className="px"><div className="seg">
        <button className={aba === 'todos' ? 'on' : ''} onClick={() => setAba('todos')}>Todos · {todas.length}</button>
        <button className={aba === 'sem' ? 'on' : ''} onClick={() => setAba('sem')}>Sem pagamentos · {semPagamento.length}</button>
      </div></div>


      <section className="px mt16 stack-y">
        {lista.length === 0 && <div className="tip"><p className="s" style={{ marginTop: 0 }}>{aba === 'todos' ? 'Nenhuma obra cadastrada. Toque em nova obra para começar a acompanhar uma reforma.' : 'Todas as obras já receberam algum pagamento.'}</p></div>}
        {lista.map(o => {
          const pago = pagoDe(o.id)
          const sem = semanasDesde(o.data_inicio)
          const totalSem = semanasTotal(o.data_inicio, o.prazo_previsto)
          const pctTempo = totalSem ? Math.min(100, Math.round(sem / totalSem * 100)) : null
          const its = itens.filter(i => i.obra_id === o.id)
          const feitos = its.filter(i => i.concluido).length
          const pctDinheiro = o.orcamento_total ? Math.min(100, Math.round(pago / o.orcamento_total * 100)) : null
          return (
            <Link key={o.id} className="card card-link" to={`/obras/${o.id}`}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {o.categorias ? <CatTile cat={o.categorias} size="md" /> : <span className="tile t-md c-obras"><Hammer size={22} className="i" /></span>}
                <div style={{ flex: 1, minWidth: 0 }}><h3>{o.nome}</h3><p className="sub">{o.pessoas?.nome ? `${o.pessoas.nome}` : 'Sem responsável'}{o.area_casa ? ` · ${o.area_casa}` : ''}</p></div>
                {o.status === 'concluida' ? <span className="chip ok">Concluída</span>
                  : o.status === 'cancelada' ? <span className="chip danger">Cancelada</span>
                  : o.status === 'pausada' ? <span className="chip">Pausada</span>
                  : o.orcamento_total ? <span className="chip pool">{totalSem ? `Semana ${sem}/${totalSem}` : 'Em andamento'}</span>
                    : <span className="chip">Em andamento</span>}
              </div>
              <div className="chips mt8"><span className={`chip ${o.orcamento_total ? 'ok' : 'danger'}`}>{o.orcamento_total ? 'Com orçamento' : 'Sem orçamento'}</span>{!o.pessoas && <span className="chip">Sem responsável</span>}{!o.prazo_previsto && <span className="chip">Sem prazo</span>}</div>
              {its.length > 0 && <div className="mt12"><div className="barlabel"><span><ListChecks size={14} className="i" style={{ verticalAlign: -2 }} /> Checklist</span><b>{feitos} de {its.length}</b></div><div className="bar"><i style={{ width: Math.round(feitos / its.length * 100) + '%', '--b': 'var(--ok)' }} /></div></div>}
              {o.orcamento_total ? (<>
                <div className="stats mt16">
                  <div className="stat" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}><p className="l">Combinado</p><p className="v num">{brlCurto(o.orcamento_total)}</p></div>
                  <div className="stat" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}><p className="l">Pago</p><p className="v num">{brlCurto(pago)}</p></div>
                  <div className="stat" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}><p className="l">Falta pagar</p><p className="v num" style={{ color: pago > o.orcamento_total ? 'var(--danger)' : 'inherit' }}>{pago > o.orcamento_total ? `+${brlCurto(pago - o.orcamento_total)}` : brlCurto(o.orcamento_total - pago)}</p></div>
                </div>
                {pctTempo !== null && <div className="mt12"><div className="barlabel"><span>Tempo</span><b>{pctTempo}%</b></div><div className="bar"><i style={{ width: pctTempo + '%', '--b': 'var(--pool)' }} /></div></div>}
                <div className="mt8"><div className="barlabel"><span>Dinheiro</span><b>{pctDinheiro}%</b></div><div className="bar"><i style={{ width: pctDinheiro + '%', '--b': degrade(SECOES.obras.g) }} /></div></div>
              </>) : (<>
                <div className="note mt12"><b>{o.combinado_verbal ? 'Combinado só de boca' : 'Sem orçamento'}</b>Peça um orçamento escrito antes do próximo pagamento.</div>
                <div className="mt12"><div className="barlabel"><span>Pago até agora</span><b className="num">{brl(pago)}</b></div><div className="bar"><i style={{ width: pago ? '30%' : '4%', '--b': 'var(--muted)' }} /></div></div>
              </>)}
              <div className="obra-acoes" onClick={e => e.preventDefault()}>
                <button className="link" onClick={e => { e.preventDefault(); e.stopPropagation(); abrir({ tipo: 'obra', obra_id: o.id }) }}><Plus size={15} className="i" />Pagamento</button>
                <button className="link" onClick={e => { e.preventDefault(); e.stopPropagation(); nav(`/obras/${o.id}?orcamento=1`) }}><Camera size={15} className="i" />Orçamento</button>
              </div>
            </Link>
          )
        })}
      </section>
      <div className="px mt24"><button className="btn dark block" onClick={() => setNova(true)}><Plus size={18} className="i" />Nova obra</button></div>
      <div style={{ height: 12 }} />
      {nova && <FolhaObra cats={cats} pessoas={pessoas} onFechar={() => setNova(false)} onSalvo={recarregar} />}
    </>
  )
}

export function FolhaObra({ inicial = {}, itensIniciais = [], cats, pessoas, onFechar, onSalvo }) {
  const limpo = Object.fromEntries(Object.entries(inicial).map(([k, v]) => [k, v ?? '']))
  const [f, setF] = useState({ nome: '', area_casa: '', categoria_id: '', empreiteiro_id: '', status: 'em_andamento', data_inicio: '', prazo_previsto: '', orcamento_total: '', combinado_verbal: false, descricao: '', ...limpo })
  const [itens, setItens] = useState(() => [...itensIniciais].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)))
  const [novoItem, setNovoItem] = useState('')
  const [salvando, setSalvando] = useState(false)
  const addItem = () => {
    const linhas = novoItem.split('\n').map(t => t.replace(/^[-*•\s]+/, '').trim()).filter(Boolean)
    if (!linhas.length) return
    setItens(x => [...x, ...linhas.map(descricao => ({ chave: Math.random().toString(36).slice(2), descricao, concluido: false }))])
    setNovoItem('')
  }
  const editItem = (i, k, v) => setItens(x => x.map((it, j) => j === i ? { ...it, [k]: v } : it))
  const delItem = (i) => setItens(x => x.filter((_, j) => j !== i))
  const excluirObra = async () => {
    if (!confirm(`Excluir a obra "${f.nome}"? Checklist, orçamentos e anotações serão apagados. Os pagamentos continuam no histórico, sem vínculo com a obra.`)) return
    try {
      await supabase.from('despesas').update({ obra_id: null }).eq('obra_id', f.id)
      await supabase.from('documentos').update({ obra_id: null }).eq('obra_id', f.id)
      await Promise.all(['obra_itens', 'obra_atualizacoes', 'obra_orcamentos'].map(t => supabase.from(t).delete().eq('obra_id', f.id)))
      await supabase.from('obras').delete().eq('id', f.id)
      onSalvo(); onFechar(); if (location.pathname !== '/obras') location.assign('/obras')
    } catch { /* aviso já mostrado */ }
  }
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.nome || salvando) return
    setSalvando(true)
    try {
    const payload = { nome: f.nome, area_casa: f.area_casa || null, categoria_id: f.categoria_id || null, empreiteiro_id: f.empreiteiro_id || null, status: f.status, data_conclusao: f.status === 'concluida' ? (f.data_conclusao || new Date().toISOString().slice(0, 10)) : null, data_inicio: f.data_inicio || null, prazo_previsto: f.prazo_previsto || null, orcamento_total: f.orcamento_total ? numero(f.orcamento_total) : null, combinado_verbal: f.combinado_verbal, descricao: f.descricao || null }
    let obraId = f.id
    if (obraId) await supabase.from('obras').update(payload).eq('id', obraId)
    else obraId = (await supabase.from('obras').insert(payload).select('id').single()).data?.id
    if (obraId) {
      const ficam = itens.filter(it => it.descricao.trim())
      const removidos = itensIniciais.filter(a => !ficam.some(b => b.id === a.id)).map(a => a.id)
      if (removidos.length) await supabase.from('obra_itens').delete().in('id', removidos)
      await Promise.all(ficam.map((it, ordem) => it.id
        ? supabase.from('obra_itens').update({ descricao: it.descricao.trim(), ordem }).eq('id', it.id)
        : supabase.from('obra_itens').insert({ obra_id: obraId, descricao: it.descricao.trim(), concluido: false, ordem })))
    }
    setSalvando(false); onSalvo(); onFechar()
    } catch { setSalvando(false) }
  }
  return (
    <Sheet titulo={f.id ? 'Editar obra' : 'Nova obra'} onFechar={onFechar}>
      <div className="stack-y">
        <label className="field"><span className="l">Status</span><select className="input" value={f.status} onChange={e => set('status', e.target.value)}>{[['orcamento_pendente', 'Orçamento pendente'], ['em_andamento', 'Em andamento'], ['pausada', 'Pausada'], ['concluida', 'Concluída'], ['cancelada', 'Cancelada']].map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
        <label className="field"><span className="l">Nome da obra</span><input className="input" value={f.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex.: deck da piscina" /></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}><span className="l">Área da casa</span><input className="input" value={f.area_casa} onChange={e => set('area_casa', e.target.value)} placeholder="piscina, quintal…" /></label>
          <label className="field" style={{ flex: 1 }}><span className="l">Categoria</span><select className="input" value={f.categoria_id} onChange={e => set('categoria_id', e.target.value)}><option value="">Nenhuma</option>{(cats || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
        </div>
        <label className="field"><span className="l">Responsável</span><select className="input" value={f.empreiteiro_id} onChange={e => set('empreiteiro_id', e.target.value)}><option value="">Nenhum</option>{(pessoas || []).map(p => <option key={p.id} value={p.id}>{p.nome} · {p.funcao}</option>)}</select></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}><span className="l">Início</span><input className="input" type="date" value={f.data_inicio} onChange={e => set('data_inicio', e.target.value)} /></label>
          <label className="field" style={{ flex: 1 }}><span className="l">Prazo</span><input className="input" type="date" value={f.prazo_previsto} onChange={e => set('prazo_previsto', e.target.value)} /></label>
        </div>
        <label className="field"><span className="l">Orçamento total (R$)</span><input className="input" inputMode="numeric" value={exibirReais(f.orcamento_total)} onChange={e => set('orcamento_total', mascaraReais(e.target.value))} placeholder="Deixe vazio se ainda não tem" /></label>
        <label className="field" style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'row' }}><input type="checkbox" checked={f.combinado_verbal} onChange={e => set('combinado_verbal', e.target.checked)} style={{ width: 20, height: 20 }} /><span style={{ fontSize: 14 }}>Combinado só verbalmente</span></label>

        <label className="field"><span className="l">O que foi combinado</span><textarea className="input" value={f.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Escopo, etapas de pagamento, quem fornece material" /></label>
        <div className="field"><span className="l">Checklist do que será feito</span>
          {itens.length > 0 && <div className="ck-edit">{itens.map((it, i) => (
            <div key={it.id || it.chave} className="ck-edit-row">
              <span className={`ck-dot ${it.concluido ? 'on' : ''}`} />
              <input className="input" value={it.descricao} onChange={e => editItem(i, 'descricao', e.target.value)} />
              <button type="button" className="iconbtn" onClick={() => delItem(i)} aria-label="Remover item"><X size={16} className="i" /></button>
            </div>))}</div>}
          <div className="ck-add">
            <textarea className="input" rows={2} value={novoItem} onChange={e => setNovoItem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addItem() } }} placeholder="Ex.: trocar piso do deck. Cole uma lista para criar vários itens de uma vez" />
            <button type="button" className="btn sm dark" onClick={addItem}><Plus size={15} className="i" />Item</button>
          </div>
        </div>
        <button className="btn primary block" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar obra'}</button>
        {f.id && <button className="btn block" style={{ color: 'var(--danger)' }} onClick={excluirObra}>Excluir obra</button>}
      </div>
    </Sheet>
  )
}
