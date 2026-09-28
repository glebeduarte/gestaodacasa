import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Hammer, Plus, Lightbulb } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados, q, soma } from '../hooks'
import { brl, brlCurto, dataCurta, semanasDesde, semanasTotal } from '../util'
import { CatTile } from '../lib/categoryStyle'
import { Sheet } from '../components/ui/Sheet'

const ABERTAS = ['orcamento_pendente', 'em_andamento', 'pausada']

export default function Obras() {
  const [aba, setAba] = useState('abertas')
  const [nova, setNova] = useState(false)
  const { dados, recarregar } = useDados(async () => {
    const [obras, cats, pessoas, despesas] = await Promise.all([
      q.obras(),
      supabase.from('categorias').select('id,nome,cor,icone').eq('ativo', true).then(r => r.data || []),
      supabase.from('pessoas').select('id,nome,funcao').eq('ativo', true).order('nome').then(r => r.data || []),
      supabase.from('despesas').select('obra_id,valor,tipo').not('obra_id', 'is', null).then(r => r.data || []),
    ])
    return { obras, cats, pessoas, despesas }
  })
  if (!dados) return <p className="carregando">Carregando…</p>
  const { obras, cats, pessoas, despesas } = dados
  const abertas = obras.filter(o => ABERTAS.includes(o.status))
  const concluidas = obras.filter(o => o.status === 'concluida')
  const lista = aba === 'abertas' ? abertas : concluidas
  const pagoDe = (id) => soma(despesas.filter(d => d.obra_id === id && d.tipo === 'obra'))

  return (
    <>
      <header className="hdr"><div><p className="eyebrow">Reformas e reparos</p><h1>Obras</h1></div>
        <button className="iconbtn" onClick={() => setNova(true)} aria-label="Nova obra"><Plus size={20} className="i" /></button></header>

      <div className="px"><div className="seg">
        <button className={aba === 'abertas' ? 'on' : ''} onClick={() => setAba('abertas')}>Abertas · {abertas.length}</button>
        <button className={aba === 'concluidas' ? 'on' : ''} onClick={() => setAba('concluidas')}>Concluídas · {concluidas.length}</button>
      </div></div>

      {aba === 'abertas' && <div className="px mt16"><div className="tip"><Lightbulb size={20} className="i" style={{ color: 'var(--pool)' }} /><div><p className="t">Registre antes de pagar</p><p className="s">Mesmo sem orçamento, anote o que foi combinado, o prazo e quem é o responsável.</p></div></div></div>}

      <section className="px mt16 stack-y">
        {lista.length === 0 && <div className="tip"><p className="s" style={{ marginTop: 0 }}>{aba === 'abertas' ? 'Nenhuma obra aberta. Toque em nova obra para começar a acompanhar uma reforma.' : 'Nenhuma obra concluída ainda.'}</p></div>}
        {lista.map(o => {
          const pago = pagoDe(o.id)
          const sem = semanasDesde(o.data_inicio)
          const totalSem = semanasTotal(o.data_inicio, o.prazo_previsto)
          const pctTempo = totalSem ? Math.min(100, Math.round(sem / totalSem * 100)) : null
          const pctDinheiro = o.orcamento_total ? Math.min(100, Math.round(pago / o.orcamento_total * 100)) : null
          return (
            <Link key={o.id} className="card card-link" to={`/obras/${o.id}`}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {o.categorias ? <CatTile cat={o.categorias} size="md" /> : <span className="tile t-md c-obras"><Hammer size={22} className="i" /></span>}
                <div style={{ flex: 1, minWidth: 0 }}><h3>{o.nome}</h3><p className="sub">{o.pessoas?.nome ? `${o.pessoas.nome}` : 'Sem responsável'}{o.area_casa ? ` · ${o.area_casa}` : ''}</p></div>
                {o.status === 'concluida' ? <span className="chip ok">Concluída</span>
                  : o.orcamento_total ? <span className="chip pool">{totalSem ? `Semana ${sem}/${totalSem}` : 'Em andamento'}</span>
                    : <span className="chip warn">Sem orçamento</span>}
              </div>
              {o.orcamento_total ? (<>
                <div className="stats mt16">
                  <div className="stat" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}><p className="l">Combinado</p><p className="v num">{brlCurto(o.orcamento_total)}</p></div>
                  <div className="stat" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}><p className="l">Pago</p><p className="v num">{brlCurto(pago)}</p></div>
                  <div className="stat" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}><p className="l">Entrega</p><p className="v">{o.prazo_previsto ? dataCurta(o.prazo_previsto) : '—'}</p></div>
                </div>
                {pctTempo !== null && <div className="mt12"><div className="barlabel"><span>Tempo</span><b>{pctTempo}%</b></div><div className="bar"><i style={{ width: pctTempo + '%', '--b': 'var(--pool)' }} /></div></div>}
                <div className="mt8"><div className="barlabel"><span>Dinheiro</span><b>{pctDinheiro}%</b></div><div className="bar"><i style={{ width: pctDinheiro + '%', '--b': 'var(--warn)' }} /></div></div>
              </>) : (<>
                <div className="note mt12"><b>{o.combinado_verbal ? 'Combinado só de boca' : 'Sem orçamento'}</b>Peça um orçamento escrito antes do próximo pagamento.</div>
                <div className="mt12"><div className="barlabel"><span>Pago até agora</span><b className="num">{brl(pago)}</b></div><div className="bar"><i style={{ width: pago ? '30%' : '4%', '--b': 'var(--muted)' }} /></div></div>
              </>)}
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

export function FolhaObra({ inicial = {}, cats, pessoas, onFechar, onSalvo }) {
  const [f, setF] = useState({ nome: '', area_casa: '', categoria_id: '', empreiteiro_id: '', status: 'em_andamento', data_inicio: '', prazo_previsto: '', orcamento_total: '', combinado_verbal: false, descricao: '', ...inicial })
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.nome) return
    const payload = { nome: f.nome, area_casa: f.area_casa || null, categoria_id: f.categoria_id || null, empreiteiro_id: f.empreiteiro_id || null, status: f.status, data_inicio: f.data_inicio || null, prazo_previsto: f.prazo_previsto || null, orcamento_total: f.orcamento_total ? Number(f.orcamento_total) : null, combinado_verbal: f.combinado_verbal, descricao: f.descricao || null }
    if (f.id) await supabase.from('obras').update(payload).eq('id', f.id)
    else await supabase.from('obras').insert(payload)
    onSalvo(); onFechar()
  }
  return (
    <Sheet titulo={f.id ? 'Editar obra' : 'Nova obra'} onFechar={onFechar}>
      <div className="stack-y">
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
        <label className="field"><span className="l">Orçamento total (R$)</span><input className="input" inputMode="decimal" value={f.orcamento_total} onChange={e => set('orcamento_total', e.target.value)} placeholder="Deixe vazio se ainda não tem" /></label>
        <label className="field" style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'row' }}><input type="checkbox" checked={f.combinado_verbal} onChange={e => set('combinado_verbal', e.target.checked)} style={{ width: 20, height: 20 }} /><span style={{ fontSize: 14 }}>Combinado só verbalmente</span></label>
        <label className="field"><span className="l">Status</span><select className="input" value={f.status} onChange={e => set('status', e.target.value)}>{[['orcamento_pendente', 'Orçamento pendente'], ['em_andamento', 'Em andamento'], ['pausada', 'Pausada'], ['concluida', 'Concluída'], ['cancelada', 'Cancelada']].map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
        <label className="field"><span className="l">O que foi combinado</span><textarea className="input" value={f.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Escopo, etapas de pagamento, quem fornece material" /></label>
        <button className="btn primary block" onClick={salvar}>Salvar obra</button>
      </div>
    </Sheet>
  )
}
