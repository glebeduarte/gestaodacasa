import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useDados, q, soma } from '../hooks'
import { brl, semanasDesde, STATUS_OBRA, hoje } from '../util'
import { Folha } from '../components/Folha'
import { Ic } from '../components/Icones'

export default function Obras() {
  const { dados, recarregar } = useDados(async () => {
    const [obras, categorias, pessoas, pagos] = await Promise.all([
      q.obras(), q.categorias(), q.pessoas(),
      supabase.from('despesas').select('obra_id, valor, tipo').not('obra_id', 'is', null).then(r => r.data || []),
    ])
    return { obras, categorias, pessoas, pagos }
  })
  const [nova, setNova] = useState(false)
  const [mostrarFechadas, setMostrarFechadas] = useState(false)
  if (!dados) return <p className="carregando">Carregando…</p>

  const abertas = dados.obras.filter(o => !['concluida', 'cancelada'].includes(o.status))
  const fechadas = dados.obras.filter(o => ['concluida', 'cancelada'].includes(o.status))
  const lista = mostrarFechadas ? fechadas : abertas

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div><div className="sobre">Reformas e reparos</div><h1>Obras</h1></div>
        <button className="icone-btn escuro" aria-label="Nova obra" onClick={() => setNova(true)}><Ic n="mais" s={20} w={2.5} /></button>
      </div>
      <div className="opcoes">
        <button className={!mostrarFechadas ? 'marcado' : ''} onClick={() => setMostrarFechadas(false)}>Abertas ({abertas.length})</button>
        <button className={mostrarFechadas ? 'marcado' : ''} onClick={() => setMostrarFechadas(true)}>Concluídas ({fechadas.length})</button>
      </div>
      {lista.length === 0 && <div className="cartao vazio">{mostrarFechadas ? 'Nenhuma obra concluída ainda.' : 'Nenhuma obra aberta. Registre a obra antes do primeiro pagamento, mesmo sem orçamento.'}</div>}
      <div className="grade-2">
        {lista.map(o => {
          const pago = soma(dados.pagos.filter(p => p.obra_id === o.id && p.tipo === 'obra'))
          const mat = soma(dados.pagos.filter(p => p.obra_id === o.id && p.tipo === 'material'))
          const pct = o.orcamento_total ? Math.min(100, Math.round(pago / o.orcamento_total * 100)) : 55
          const st = STATUS_OBRA[o.status]
          const semOrc = !o.orcamento_total && !['concluida', 'cancelada'].includes(o.status)
          return (
            <Link key={o.id} to={`/obras/${o.id}`} className="cartao">
              <div className="entre"><span className="titulo-cartao">{o.nome}</span><span className={`chip ${semOrc || o.combinado_verbal ? 'chip-alerta' : st.cls}`}>{semOrc ? 'Sem orçamento' : o.combinado_verbal ? 'Combinado verbal' : st.label}</span></div>
              <div className="nota">{o.area_casa ? `${o.area_casa} · ` : ''}{o.data_inicio ? `Semana ${semanasDesde(o.data_inicio)}` : 'Sem data de início'}{o.pessoas?.nome ? ` · ${o.pessoas.nome}` : ''}</div>
              <div className="barra"><div className={o.orcamento_total ? 'info' : ''} style={{ width: pct + '%' }} /></div>
              <div className="nota">Pago <b>{brl(pago)}</b>{o.orcamento_total ? ` de ${brl(o.orcamento_total)}` : ' · total não informado'}{mat ? ` · materiais ${brl(mat)}` : ''}</div>
            </Link>
          )
        })}
      </div>
      {nova && <FolhaObra categorias={dados.categorias} pessoas={dados.pessoas} onFechar={() => setNova(false)} onSalvo={recarregar} />}
    </div>
  )
}

export function FolhaObra({ obra, categorias, pessoas, onFechar, onSalvo }) {
  const estrutura = categorias.find(c => c.nome === 'Estrutura')
  const [f, setF] = useState({
    nome: obra?.nome || '', area_casa: obra?.area_casa || '', categoria_id: obra?.categoria_id || estrutura?.id || '',
    empreiteiro_id: obra?.empreiteiro_id || '', status: obra?.status || 'em_andamento', data_inicio: obra?.data_inicio || hoje(),
    prazo_previsto: obra?.prazo_previsto || '', orcamento_total: obra?.orcamento_total || '', descricao: obra?.descricao || '', combinado_verbal: obra?.combinado_verbal || false,
  })
  const [erro, setErro] = useState(null)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.nome) return setErro('Dê um nome para a obra.')
    const reg = {
      nome: f.nome, area_casa: f.area_casa || null, categoria_id: f.categoria_id || null, empreiteiro_id: f.empreiteiro_id || null,
      status: f.status, data_inicio: f.data_inicio || null, prazo_previsto: f.prazo_previsto || null,
      orcamento_total: f.orcamento_total ? Number(String(f.orcamento_total).replace(',', '.')) : null, descricao: f.descricao || null, combinado_verbal: !!f.combinado_verbal,
    }
    if (!reg.orcamento_total && reg.status === 'em_andamento') reg.status = 'orcamento_pendente'
    const r = obra ? await supabase.from('obras').update(reg).eq('id', obra.id) : await supabase.from('obras').insert(reg)
    if (r.error) return setErro(r.error.message)
    onSalvo(); onFechar()
  }
  return (
    <Folha titulo={obra ? 'Editar obra' : 'Nova obra'} onFechar={onFechar}>
      <div className="form">
        <div className="campo"><label>Nome da obra</label><input value={f.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex.: Reforma da cozinha" /></div>
        <div className="campo-linha">
          <div className="campo"><label>Área da casa</label><input value={f.area_casa} onChange={e => set('area_casa', e.target.value)} placeholder="Cozinha, quintal…" /></div>
          <div className="campo"><label>Categoria</label><select value={f.categoria_id} onChange={e => set('categoria_id', e.target.value)}>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
        </div>
        <div className="campo"><label>Empreiteiro / responsável</label><select value={f.empreiteiro_id} onChange={e => set('empreiteiro_id', e.target.value)}><option value="">Escolher pessoa</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome} · {p.funcao}</option>)}</select></div>
        <div className="campo-linha">
          <div className="campo"><label>Início</label><input type="date" value={f.data_inicio} onChange={e => set('data_inicio', e.target.value)} /></div>
          <div className="campo"><label>Prazo previsto</label><input type="date" value={f.prazo_previsto} onChange={e => set('prazo_previsto', e.target.value)} /></div>
        </div>
        <div className="campo"><label>Orçamento total combinado (R$)</label><input inputMode="decimal" value={f.orcamento_total} onChange={e => set('orcamento_total', e.target.value)} placeholder="Deixe vazio se ainda não tem" /></div>
        <label className="check"><input type="checkbox" checked={f.combinado_verbal} onChange={e => set('combinado_verbal', e.target.checked)} />Combinado só verbalmente (sem orçamento por escrito)</label>
        <div className="campo"><label>Situação</label><div className="opcoes">{Object.entries(STATUS_OBRA).map(([v, s]) => <button key={v} type="button" className={f.status === v ? 'marcado' : ''} onClick={() => set('status', v)}>{s.label}</button>)}</div></div>
        <div className="campo"><label>O que foi combinado</label><textarea value={f.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Descreva o combinado, mesmo que verbal" /></div>
        {erro && <p className="erro">{erro}</p>}
        <button className="btn largo" onClick={salvar}>{obra ? 'Salvar alterações' : 'Criar obra'}</button>
      </div>
    </Folha>
  )
}
