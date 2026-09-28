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
  const [novoOrc, setNovoOrc] = useState(false)

  const { dados, recarregar } = useDados(async () => {
    const [o, itens, atualizacoes, despesas, categorias, pessoas, orcamentos] = await Promise.all([
      supabase.from('obras').select('*, pessoas(nome, telefone), categorias(nome)').eq('id', id).single().then(r => r.data),
      supabase.from('obra_itens').select('*').eq('obra_id', id).order('ordem').then(r => r.data || []),
      supabase.from('obra_atualizacoes').select('*').eq('obra_id', id).order('data', { ascending: false }).then(r => r.data || []),
      q.despesas({ obra_id: id }), q.categorias(), q.pessoas(),
      supabase.from('obra_orcamentos').select('*, pessoas(nome)').eq('obra_id', id).order('valor').then(r => r.data || []),
    ])
    return { o, itens, atualizacoes, despesas, categorias, pessoas, orcamentos }
  }, [id])

  if (!dados) return <p className="carregando">Carregando…</p>
  const { o, itens, atualizacoes, despesas, categorias, pessoas, orcamentos } = dados
  if (!o) return <p className="erro">Obra não encontrada.</p>

  const pago = soma(despesas.filter(d => d.tipo === 'obra'))
  const materiais = soma(despesas.filter(d => d.tipo === 'material'))
  const st = STATUS_OBRA[o.status]
  const aberta = !['concluida', 'cancelada'].includes(o.status)
  const semana = semanasDesde(o.data_inicio)
  const faltas = []
  if (!o.orcamento_total) faltas.push('orçamento total')
  if (o.combinado_verbal) faltas.push('combinado por escrito')
  if (!o.prazo_previsto) faltas.push('prazo')
  if (!o.empreiteiro_id) faltas.push('responsável')

  const toggleItem = async (it) => { await supabase.from('obra_itens').update({ concluido: !it.concluido }).eq('id', it.id); recarregar() }
  const addItem = async (fora = false) => {
    if (!novoItem) return
    await supabase.from('obra_itens').insert({ obra_id: id, descricao: novoItem, fora_do_combinado: fora, ordem: itens.length })
    setNovoItem(''); recarregar()
  }
  const aprovarOrc = async (oc) => {
    if (!confirm(`Aprovar ${oc.fornecedor} por ${brl(oc.valor)}? O orçamento total da obra passa a ser esse valor.`)) return
    await supabase.from('obra_orcamentos').update({ aprovado: false }).eq('obra_id', id)
    await supabase.from('obra_orcamentos').update({ aprovado: true }).eq('id', oc.id)
    const reg = { orcamento_total: oc.valor, combinado_verbal: false }
    if (oc.pessoa_id && !o.empreiteiro_id) reg.empreiteiro_id = oc.pessoa_id
    if (o.status === 'orcamento_pendente') reg.status = 'em_andamento'
    await supabase.from('obras').update(reg).eq('id', id); recarregar()
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
        {o.combinado_verbal && <span className="chip chip-alerta">Combinado verbal</span>}
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

      <div className="secao-titulo"><h2>Orçamentos recebidos</h2><a className="link" href="#" onClick={e => { e.preventDefault(); setNovoOrc(true) }}>+ Orçamento</a></div>
      <div className="cartao">
        {orcamentos.length === 0 && <p className="nota">Peça orçamento antes de começar. Guarde aqui cada proposta recebida para comparar e aprovar.</p>}
        {orcamentos.map(oc => (
          <div key={oc.id} className="linha-item" style={{ justifyContent: 'space-between' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{oc.fornecedor}{oc.aprovado && <span className="chip chip-ok" style={{ marginLeft: 6 }}>aprovado</span>}</div>
              <div className="nota">{oc.validade ? `válido até ${dataCurta(oc.validade)}` : 'sem validade'}{oc.observacoes ? ` · ${oc.observacoes}` : ''}</div>
              {oc.arquivo_url && <a href={oc.arquivo_url} target="_blank" rel="noreferrer" className="link">ver arquivo</a>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}><b>{brl(oc.valor)}</b>{!oc.aprovado && aberta && <div><button className="link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => aprovarOrc(oc)}>aprovar</button></div>}</div>
          </div>
        ))}
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
      {novoOrc && <FolhaOrcamento obraId={id} pessoas={pessoas} onFechar={() => setNovoOrc(false)} onSalvo={recarregar} />}
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

function FolhaOrcamento({ obraId, pessoas, onFechar, onSalvo }) {
  const [f, setF] = useState({ fornecedor: '', pessoa_id: '', valor: '', validade: '', observacoes: '' })
  const [arquivo, setArquivo] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const escolherPessoa = (pid) => { const p = pessoas.find(x => x.id === pid); set('pessoa_id', pid); if (p && !f.fornecedor) set('fornecedor', p.nome) }
  const salvar = async () => {
    if (!f.fornecedor || !f.valor) return setErro('Fornecedor e valor são obrigatórios.')
    setSalvando(true)
    try {
      const urls = arquivo ? await enviarFotos([arquivo], `orcamentos/${obraId}`) : []
      const { error } = await supabase.from('obra_orcamentos').insert({ obra_id: obraId, fornecedor: f.fornecedor, pessoa_id: f.pessoa_id || null, valor: Number(String(f.valor).replace(',', '.')), validade: f.validade || null, observacoes: f.observacoes || null, arquivo_url: urls[0] || null })
      if (error) throw error
      onSalvo(); onFechar()
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }
  return (
    <Folha titulo="Novo orçamento" onFechar={onFechar}>
      <div className="form">
        <div className="campo"><label>Quem orçou (pessoa cadastrada)</label><select value={f.pessoa_id} onChange={e => escolherPessoa(e.target.value)}><option value="">Outro fornecedor</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome} · {p.funcao}</option>)}</select></div>
        <div className="campo"><label>Fornecedor</label><input value={f.fornecedor} onChange={e => set('fornecedor', e.target.value)} placeholder="Nome de quem orçou" /></div>
        <div className="campo-linha">
          <div className="campo"><label>Valor (R$)</label><input inputMode="decimal" value={f.valor} onChange={e => set('valor', e.target.value)} /></div>
          <div className="campo"><label>Válido até</label><input type="date" value={f.validade} onChange={e => set('validade', e.target.value)} /></div>
        </div>
        <div className="campo"><label>O que inclui</label><textarea value={f.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Mão de obra, materiais, prazo prometido" /></div>
        <div className="campo"><label>Foto ou PDF do orçamento</label><input type="file" accept="image/*,application/pdf" onChange={e => setArquivo(e.target.files[0] || null)} /></div>
        {erro && <p className="erro">{erro}</p>}
        <button className="btn largo" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Guardar orçamento'}</button>
      </div>
    </Folha>
  )
}
