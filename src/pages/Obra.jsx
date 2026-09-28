import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useDados, q, soma } from '../hooks'
import { brl, dataCurta, hoje, semanasDesde, STATUS_OBRA } from '../util'
import { Folha } from '../components/Folha'
import { FolhaDespesa } from '../components/FolhaDespesa'
import { enviarFotos } from '../components/Upload'
import { Ic } from '../components/Icones'
import { FolhaObra } from './Obras'

export default function Obra() {
  const { id } = useParams()
  const [editar, setEditar] = useState(false)
  const [atualizar, setAtualizar] = useState(false)
  const [pagar, setPagar] = useState(null)
  const [novoItem, setNovoItem] = useState('')

  const { dados, recarregar } = useDados(async () => {
    const [o, itens, atualizacoes, despesas, categorias, pessoas] = await Promise.all([
      supabase.from('obras').select('*, pessoas(nome, telefone), categorias(nome)').eq('id', id).single().then(r => r.data),
      supabase.from('obra_itens').select('*').eq('obra_id', id).order('ordem').then(r => r.data || []),
      supabase.from('obra_atualizacoes').select('*').eq('obra_id', id).order('data', { ascending: false }).then(r => r.data || []),
      q.despesas({ obra_id: id }), q.categorias(), q.pessoas(),
    ])
    return { o, itens, atualizacoes, despesas, categorias, pessoas }
  }, [id])

  if (!dados) return <p className="carregando">Carregando…</p>
  const { o, itens, atualizacoes, despesas, categorias, pessoas } = dados
  if (!o) return <p className="erro">Obra não encontrada.</p>

  const pago = soma(despesas.filter(d => d.tipo === 'obra'))
  const materiais = soma(despesas.filter(d => d.tipo === 'material'))
  const st = STATUS_OBRA[o.status]
  const aberta = !['concluida', 'cancelada'].includes(o.status)
  const semana = semanasDesde(o.data_inicio)
  const faltas = []
  if (!o.orcamento_total) faltas.push('orçamento total')
  if (!o.prazo_previsto) faltas.push('prazo')
  if (!o.empreiteiro_id) faltas.push('responsável')

  const toggleItem = async (it) => { await supabase.from('obra_itens').update({ concluido: !it.concluido }).eq('id', it.id); recarregar() }
  const addItem = async (fora = false) => {
    if (!novoItem) return
    await supabase.from('obra_itens').insert({ obra_id: id, descricao: novoItem, fora_do_combinado: fora, ordem: itens.length })
    setNovoItem(''); recarregar()
  }
  const mudarStatus = async (s) => {
    const reg = { status: s }
    if (s === 'concluida') reg.data_conclusao = hoje()
    await supabase.from('obras').update(reg).eq('id', id); recarregar()
  }

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div className="voltar-linha">
          <Link to="/obras" className="icone-btn" aria-label="Voltar"><Ic n="voltar" s={20} w={2.2} /></Link>
          <div><div className="sobre">Obra{o.categorias?.nome ? ` · ${o.categorias.nome}` : ''}</div><h1>{o.nome}</h1></div>
        </div>
        <button className="btn claro pequeno" onClick={() => setEditar(true)}>Editar</button>
      </div>

      <div className="chips">
        <span className={`chip ${!o.orcamento_total && aberta ? 'chip-alerta' : st.cls}`}>{!o.orcamento_total && aberta ? 'Sem orçamento' : st.label}</span>
        {o.data_inicio && aberta && <span className="chip chip-info">Semana {semana}</span>}
        {o.pessoas?.nome && <span className="chip chip-neutra">{o.pessoas.nome}</span>}
        {o.area_casa && <span className="chip chip-neutra">{o.area_casa}</span>}
      </div>

      <div className="grade-4">
        <div className="cartao"><div className="rotulo">Já pago</div><div className="valor">{brl(pago)}</div><div className="nota">{despesas.filter(d => d.tipo === 'obra').length} pagamento{despesas.filter(d => d.tipo === 'obra').length !== 1 ? 's' : ''}</div></div>
        <div className="cartao"><div className="rotulo">Orçamento total</div>{o.orcamento_total ? <><div className="valor">{brl(o.orcamento_total)}</div><div className="nota">Falta {brl(Math.max(0, o.orcamento_total - pago))}</div></> : <div className="valor alerta">Não informado</div>}</div>
        <div className="cartao"><div className="rotulo">Materiais</div><div className="valor">{brl(materiais)}</div><div className="nota">Fora da mão de obra</div></div>
        <div className="cartao"><div className="rotulo">Prazo</div>{o.prazo_previsto ? <><div className="valor">{dataCurta(o.prazo_previsto)}</div><div className="nota">Início {dataCurta(o.data_inicio)}</div></> : <div className="valor alerta">Sem prazo</div>}</div>
      </div>

      {o.orcamento_total > 0 && <div className="barra" style={{ height: 8 }}><div className="info" style={{ width: Math.min(100, Math.round(pago / o.orcamento_total * 100)) + '%' }} /></div>}

      {aberta && faltas.length > 0 && (
        <div className="cartao-alerta">
          <span><b>Falta para ficar sob controle:</b> {faltas.join(', ')}.</span>
          <button className="btn pequeno" onClick={() => setEditar(true)}>Registrar agora</button>
        </div>
      )}

      {o.descricao && <div className="cartao"><div className="rotulo">O que foi combinado</div><p className="texto" style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{o.descricao}</p></div>}

      <div className="acoes">
        <button className="btn escuro" onClick={() => setAtualizar(true)}>+ Atualização</button>
        <button className="btn claro" onClick={() => setPagar({ tipo: 'obra', obra_id: id, categoria_id: o.categoria_id, pessoa_id: o.empreiteiro_id || '' })}>+ Pagamento</button>
      </div>

      <div className="secao-titulo"><h2>Escopo</h2><span className="nota">{itens.filter(i => i.concluido).length} de {itens.length} feitos</span></div>
      <div className="cartao">
        {itens.length === 0 && <p className="nota">Liste o que está combinado. Se a obra crescer, marque o item como fora do combinado.</p>}
        {itens.map(it => (
          <label key={it.id} className="check"><input type="checkbox" checked={it.concluido} onChange={() => toggleItem(it)} /><span style={it.concluido ? { textDecoration: 'line-through', color: 'var(--cinza)' } : {}}>{it.descricao}</span>{it.fora_do_combinado && <span className="chip chip-alerta">fora do combinado</span>}</label>
        ))}
        <div className="campo-linha" style={{ gridTemplateColumns: '1fr auto auto', marginTop: 6 }}>
          <div className="campo"><input value={novoItem} onChange={e => setNovoItem(e.target.value)} placeholder="Novo item" /></div>
          <button className="btn pequeno escuro" style={{ height: 46 }} onClick={() => addItem(false)}>Adicionar</button>
          <button className="btn pequeno claro" style={{ height: 46 }} onClick={() => addItem(true)}>Fora do combinado</button>
        </div>
      </div>

      <div className="secao-titulo"><h2>Linha do tempo</h2><span className="nota">{atualizacoes.length} registro{atualizacoes.length !== 1 ? 's' : ''}</span></div>
      <div className="cartao">
        {atualizacoes.length === 0 && <p className="nota">Registre o andamento semana a semana: o que foi feito, o que mudou, o que foi pago.</p>}
        <div className="tempo">
          {atualizacoes.map((a, i) => (
            <div key={a.id} className="tempo-item">
              <div className="tempo-eixo"><div className={'ponto' + (i === 0 ? ' ativo' : '')} />{i < atualizacoes.length - 1 && <div className="fio" />}</div>
              <div className="tempo-corpo">
                <div className="entre"><span className="quando">{a.semana ? `Semana ${a.semana} · ` : ''}{dataCurta(a.data)}</span>{a.tipo !== 'andamento' && <span className={`chip ${a.tipo === 'escopo_ampliado' || a.tipo === 'problema' ? 'chip-alerta' : a.tipo === 'conclusao' ? 'chip-ok' : 'chip-neutra'}`}>{{ escopo_ampliado: 'Escopo ampliado', problema: 'Problema', pagamento: 'Pagamento', conclusao: 'Conclusão' }[a.tipo]}</span>}</div>
                <p className="texto" style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>{a.texto}</p>
                {a.fotos?.length > 0 && <div className="fotos">{a.fotos.map(u => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" /></a>)}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="secao-titulo"><h2>Pagamentos e materiais</h2><span className="nota">{brl(pago + materiais)}</span></div>
      <div className="cartao">
        {despesas.length === 0 && <p className="nota">Nenhum pagamento registrado.</p>}
        {despesas.map(d => (
          <div key={d.id} className="linha-item" style={{ justifyContent: 'space-between' }}>
            <div><div style={{ fontSize: 13, fontWeight: 600 }}>{d.descricao}</div><div className="nota">{dataCurta(d.data)} · {d.tipo === 'material' ? 'material' : 'mão de obra'}{d.forma_pagamento ? ` · ${d.forma_pagamento}` : ''}{d.pessoas?.nome ? ` · ${d.pessoas.nome}` : ''}</div></div>
            <b style={{ fontSize: 14 }}>{brl(d.valor)}</b>
          </div>
        ))}
      </div>

      {aberta && (
        <div className="opcoes">
          {o.status !== 'pausada' && <button onClick={() => mudarStatus('pausada')}>Pausar obra</button>}
          {o.status === 'pausada' && <button onClick={() => mudarStatus(o.orcamento_total ? 'em_andamento' : 'orcamento_pendente')}>Retomar</button>}
          <button onClick={() => { if (confirm('Marcar esta obra como concluída?')) mudarStatus('concluida') }}>Concluir obra</button>
        </div>
      )}

      {editar && <FolhaObra obra={o} categorias={categorias} pessoas={pessoas} onFechar={() => setEditar(false)} onSalvo={recarregar} />}
      {atualizar && <FolhaAtualizacao obra={o} semana={semana} onFechar={() => setAtualizar(false)} onSalvo={recarregar} />}
      {pagar && <FolhaDespesa inicial={pagar} onFechar={() => setPagar(null)} onSalvo={recarregar} />}
    </div>
  )
}

function FolhaAtualizacao({ obra, semana, onFechar, onSalvo }) {
  const [f, setF] = useState({ data: hoje(), semana: semana || '', texto: '', tipo: 'andamento' })
  const [fotos, setFotos] = useState([])
  const [salvando, setSalvando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.texto) return
    setSalvando(true)
    const urls = fotos.length ? await enviarFotos(fotos, `obras/${obra.id}`) : []
    await supabase.from('obra_atualizacoes').insert({ obra_id: obra.id, data: f.data, semana: f.semana ? Number(f.semana) : null, texto: f.texto, tipo: f.tipo, fotos: urls })
    setSalvando(false); onSalvo(); onFechar()
  }
  const tipos = [['andamento', 'Andamento'], ['escopo_ampliado', 'Escopo ampliado'], ['problema', 'Problema'], ['conclusao', 'Conclusão']]
  return (
    <Folha titulo="Atualização da obra" onFechar={onFechar}>
      <div className="form">
        <div className="campo"><label>Tipo</label><div className="opcoes">{tipos.map(([v, l]) => <button key={v} type="button" className={f.tipo === v ? 'marcado' : ''} onClick={() => set('tipo', v)}>{l}</button>)}</div></div>
        <div className="campo-linha">
          <div className="campo"><label>Data</label><input type="date" value={f.data} onChange={e => set('data', e.target.value)} /></div>
          <div className="campo"><label>Semana da obra</label><input inputMode="numeric" value={f.semana} onChange={e => set('semana', e.target.value)} /></div>
        </div>
        <div className="campo"><label>O que aconteceu</label><textarea value={f.texto} onChange={e => set('texto', e.target.value)} placeholder="Ex.: começaram a parte elétrica. Pediram adiantamento para fiação." /></div>
        <div className="campo"><label>Fotos</label><input type="file" accept="image/*" multiple onChange={e => setFotos([...e.target.files])} /></div>
        <button className="btn largo" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar atualização'}</button>
      </div>
    </Folha>
  )
}
