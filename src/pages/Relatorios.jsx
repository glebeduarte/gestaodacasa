import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Hammer, Users, Receipt, LayoutGrid, Wrench, ChevronRight, Printer, Send, Check, Circle, TriangleAlert, Clock, Wallet, ListChecks, FileText, Package } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados, soma } from '../hooks'
import { brl, dataCurta, diasAte, hoje, semanasDesde, semanasTotal } from '../util'
import { BackBar } from '../components/ui/BackBar'
import { useCasa } from '../lib/casa'

const STATUS = { orcamento_pendente: ['warn', 'Orçamento pendente'], em_andamento: ['pool', 'Em andamento'], pausada: ['', 'Pausada'], concluida: ['ok', 'Concluída'], cancelada: ['danger', 'Cancelada'] }
const dataLonga = (d) => d ? d.split('-').reverse().join('/') : '—'
const diasEntre = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000)

// Menu de relatórios
export default function Relatorios() {
  const { casa } = useCasa()
  const mods = casa?.modulos || []
  const itens = [
    { to: '/relatorios/obras', Icon: Hammer, t: 'Obras', s: 'Tempo, execução, pagamentos e saldo de cada obra', ok: mods.includes('obras') },
    { Icon: Receipt, t: 'Contas do período', s: 'Pagas, em aberto e atrasadas, por categoria', breve: true },
    { Icon: Users, t: 'Pessoas', s: 'Quanto cada pessoa recebeu, extras e adiantamentos', breve: true, ok: mods.includes('pessoas') },
    { Icon: LayoutGrid, t: 'Gastos por categoria', s: 'Comparação mês a mês e média', breve: true },
    { Icon: Wrench, t: 'Manutenções', s: 'O que foi feito, atrasos e custo de cada cuidado', breve: true, ok: mods.includes('manutencoes') },
  ].filter(i => i.ok !== false)
  return (
    <>
      <header className="hdr"><div><p className="eyebrow">{casa?.nome}</p><h1>Relatórios</h1></div></header>
      <section className="px"><div className="list">
        {itens.map(i => i.breve ? (
          <div key={i.t} className="row" style={{ opacity: .55 }}><span className="tile t-md c-neutral"><i.Icon size={22} className="i" /></span><div className="grow"><p className="t">{i.t}</p><p className="s">{i.s}</p></div><span className="chip">em breve</span></div>
        ) : (
          <Link key={i.t} to={i.to} className="row"><span className="tile t-md c-obras"><i.Icon size={22} className="i" /></span><div className="grow"><p className="t">{i.t}</p><p className="s">{i.s}</p></div><ChevronRight size={20} className="i chev" /></Link>
        ))}
      </div></section>
    </>
  )
}

// Relatório de obras: escolhe a obra e mostra tudo dela
export function RelatorioObras() {
  const { id } = useParams()
  const [sel, setSel] = useState(id || '')
  const { dados } = useDados(async () => {
    const obras = (await supabase.from('obras').select('id,nome,status,data_inicio').order('criado_em', { ascending: false })).data || []
    return { obras }
  })
  if (!dados) return <p className="carregando">Carregando…</p>
  const atual = sel || dados.obras[0]?.id
  return (
    <>
      <div className="no-print"><BackBar to="/relatorios" titulo="Relatório de obras" /></div>
      {dados.obras.length === 0 ? <div className="px mt16"><div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhuma obra cadastrada ainda.</p></div></div> : (<>
        <div className="px mt12 no-print">
          <select className="input" value={atual} onChange={e => setSel(e.target.value)}>{dados.obras.map(o => <option key={o.id} value={o.id}>{o.nome} · {STATUS[o.status]?.[1] || o.status}</option>)}</select>
        </div>
        {atual && <RelatorioObra key={atual} id={atual} />}
      </>)}
    </>
  )
}

function RelatorioObra({ id }) {
  const { casa } = useCasa()
  const { dados } = useDados(async () => {
    const [o, despesas, itens, atts, orcs] = await Promise.all([
      supabase.from('obras').select('*, pessoas(nome,telefone,funcao), categorias(nome)').eq('id', id).single().then(r => r.data),
      supabase.from('despesas').select('*').eq('obra_id', id).order('data').then(r => r.data || []),
      supabase.from('obra_itens').select('*').eq('obra_id', id).order('ordem').then(r => r.data || []),
      supabase.from('obra_atualizacoes').select('*').eq('obra_id', id).order('data').then(r => r.data || []),
      supabase.from('obra_orcamentos').select('*, pessoas(nome)').eq('obra_id', id).order('valor').then(r => r.data || []),
    ])
    return { o, despesas, itens, atts, orcs }
  }, [id])
  if (!dados) return <p className="carregando">Carregando…</p>
  const { o, despesas, itens, atts, orcs } = dados

  // Tempo
  const fim = o.data_conclusao || hoje()
  const diasCorridos = o.data_inicio ? Math.max(0, diasEntre(o.data_inicio, fim)) : null
  const prazoDias = o.data_inicio && o.prazo_previsto ? diasEntre(o.data_inicio, o.prazo_previsto) : null
  const atraso = o.prazo_previsto ? (o.data_conclusao ? diasEntre(o.prazo_previsto, o.data_conclusao) : -diasAte(o.prazo_previsto)) : null
  const sem = semanasDesde(o.data_inicio), totalSem = semanasTotal(o.data_inicio, o.prazo_previsto)
  const pctTempo = prazoDias ? Math.min(100, Math.round(diasCorridos / prazoDias * 100)) : null

  // Execução
  const feitos = itens.filter(i => i.concluido), pendentes = itens.filter(i => !i.concluido)
  const extras = itens.filter(i => i.fora_do_combinado)
  const pctExec = itens.length ? Math.round(feitos.length / itens.length * 100) : null

  // Dinheiro
  const pagamentos = despesas.filter(d => d.tipo !== 'material'), materiais = despesas.filter(d => d.tipo === 'material')
  const pago = soma(pagamentos), material = soma(materiais)
  const orc = Number(o.orcamento_total || 0)
  const falta = orc ? orc - pago : null
  const pctPago = orc ? Math.round(pago / orc * 100) : null
  let acc = 0
  const linhas = pagamentos.map(d => { acc += Number(d.valor); return { ...d, saldo: orc ? orc - acc : null } })
  const aprovado = orcs.find(g => g.aprovado)

  // Pontos de atenção
  const alertas = []
  if (!orc) alertas.push(o.combinado_verbal ? 'Combinado só de boca, sem orçamento escrito.' : 'Obra sem valor de orçamento definido.')
  if (pctPago !== null && pctExec !== null && pctPago - pctExec > 15) alertas.push(`Pagamento à frente da execução: ${pctPago}% pago para ${pctExec}% do checklist feito.`)
  if (falta !== null && falta < 0) alertas.push(`Pagamentos passaram ${brl(-falta)} do combinado.`)
  if (atraso > 0) alertas.push(o.data_conclusao ? `Concluída com ${atraso} dias de atraso.` : `Prazo vencido há ${atraso} dias.`)
  if (extras.length) alertas.push(`${extras.length} item(ns) fora do combinado original.`)
  if (!itens.length) alertas.push('Sem checklist: não há como medir o que foi entregue.')

  const [stCls, stTxt] = STATUS[o.status] || ['', o.status]
  const enviar = () => {
    const t = [`*Relatório da obra: ${o.nome}*`, `${casa?.nome} · ${stTxt}`, '',
      `*Tempo*`, `Início: ${dataLonga(o.data_inicio)} · Prazo: ${dataLonga(o.prazo_previsto)}${o.data_conclusao ? ` · Concluída: ${dataLonga(o.data_conclusao)}` : ''}`,
      diasCorridos !== null ? `${diasCorridos} dias corridos${prazoDias ? ` de ${prazoDias} previstos` : ''}${atraso > 0 ? ` · ${atraso} dias de atraso` : ''}` : '', '',
      `*Execução* ${itens.length ? `${feitos.length} de ${itens.length} itens (${pctExec}%)` : 'sem checklist'}`,
      ...feitos.map(i => `✅ ${i.descricao}`), ...pendentes.map(i => `⬜ ${i.descricao}`), '',
      `*Financeiro*`, orc ? `Combinado: ${brl(orc)}` : 'Sem orçamento definido', `Pago: ${brl(pago)}${pctPago !== null ? ` (${pctPago}%)` : ''}`,
      falta !== null ? (falta >= 0 ? `Falta pagar: ${brl(falta)}` : `Acima do combinado: ${brl(-falta)}`) : '', material ? `Material à parte: ${brl(material)}` : '',
      `Total gasto: ${brl(pago + material)}`, '', ...(alertas.length ? ['*Atenção*', ...alertas.map(a => `• ${a}`)] : [])].filter(x => x !== '').join('\n')
    window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank')
  }

  return (
    <div className="relatorio">
      <div className="px mt16">
        <div className="rel-cab">
          <p className="eyebrow">{casa?.nome} · relatório de obra · {dataLonga(hoje())}</p>
          <h1>{o.nome}</h1>
          <div className="chips mt8"><span className={`chip ${stCls}`}>{stTxt}</span>{o.area_casa && <span className="chip">{o.area_casa}</span>}{o.categorias?.nome && <span className="chip">{o.categorias.nome}</span>}</div>
          {o.pessoas && <p className="sub mt8">Responsável: <b>{o.pessoas.nome}</b>{o.pessoas.funcao ? ` · ${o.pessoas.funcao}` : ''}{o.pessoas.telefone ? ` · ${o.pessoas.telefone}` : ''}</p>}
        </div>
      </div>

      <div className="px mt16 rel-kpis">
        <div className="stat"><p className="l">Execução</p><p className="v">{pctExec !== null ? `${pctExec}%` : '—'}</p><p className="muted">{itens.length ? `${feitos.length} de ${itens.length} itens` : 'sem checklist'}</p></div>
        <div className="stat"><p className="l">Pago</p><p className="v num">{brl(pago)}</p><p className="muted">{pctPago !== null ? `${pctPago}% do combinado` : 'sem orçamento'}</p></div>
        <div className="stat"><p className="l" style={{ color: falta < 0 ? 'var(--danger)' : undefined }}>{falta < 0 ? 'Acima do combinado' : 'Falta pagar'}</p><p className="v num">{falta !== null ? brl(Math.abs(falta)) : '—'}</p><p className="muted">{orc ? `de ${brl(orc)}` : ''}</p></div>
        <div className="stat"><p className="l">Tempo</p><p className="v">{diasCorridos !== null ? `${diasCorridos}d` : '—'}</p><p className="muted">{prazoDias ? `de ${prazoDias} previstos` : 'sem prazo'}</p></div>
      </div>

      {alertas.length > 0 && <div className="px mt16"><div className="rel-alerta"><b><TriangleAlert size={16} className="i" /> Pontos de atenção</b><ul>{alertas.map(a => <li key={a}>{a}</li>)}</ul></div></div>}

      <Secao Icon={Clock} titulo="Tempo">
        <div className="rel-grid">
          <Campo l="Início" v={dataLonga(o.data_inicio)} /><Campo l="Prazo previsto" v={dataLonga(o.prazo_previsto)} />
          <Campo l="Conclusão" v={o.data_conclusao ? dataLonga(o.data_conclusao) : 'em aberto'} /><Campo l="Semana da obra" v={totalSem ? `${Math.min(sem, totalSem)} de ${totalSem}` : sem ? `${sem}ª` : '—'} />
          <Campo l="Dias corridos" v={diasCorridos ?? '—'} /><Campo l={atraso > 0 ? 'Atraso' : 'Folga'} v={atraso === null ? '—' : `${Math.abs(atraso)} dias`} cor={atraso > 0 ? 'var(--danger)' : 'var(--ok)'} />
        </div>
        {pctTempo !== null && <Barra rotulo="Tempo decorrido" pct={pctTempo} cor="var(--pool)" />}
        {pctExec !== null && <Barra rotulo="Execução (checklist)" pct={pctExec} cor="var(--ok)" />}
        {pctPago !== null && <Barra rotulo="Pagamento" pct={Math.min(100, pctPago)} cor="var(--warn)" />}
      </Secao>

      <Secao Icon={ListChecks} titulo={`O que foi feito · ${feitos.length}`}>
        {feitos.length === 0 ? <p className="muted">Nada marcado como feito ainda.</p> : <ul className="rel-lista">{feitos.map(i => <li key={i.id}><Check size={15} className="i ok" /><span>{i.descricao}{i.fora_do_combinado && <em> · fora do combinado</em>}</span><small>{i.concluido_em ? dataCurta(i.concluido_em) : ''}</small></li>)}</ul>}
      </Secao>

      <Secao Icon={Circle} titulo={`O que falta fazer · ${pendentes.length}`}>
        {pendentes.length === 0 ? <p className="muted">{itens.length ? 'Tudo do checklist foi feito.' : 'Sem checklist cadastrado.'}</p> : <ul className="rel-lista">{pendentes.map(i => <li key={i.id}><Circle size={15} className="i" /><span>{i.descricao}{i.fora_do_combinado && <em> · fora do combinado</em>}</span></li>)}</ul>}
      </Secao>

      <Secao Icon={Wallet} titulo="Financeiro">
        <div className="rel-grid">
          <Campo l="Combinado" v={orc ? brl(orc) : 'não definido'} /><Campo l="Orçamento" v={aprovado ? `aprovado (${aprovado.fornecedor || aprovado.pessoas?.nome || 'fornecedor'})` : orcs.length ? `${orcs.length} recebido(s), nenhum aprovado` : o.combinado_verbal ? 'só verbal' : 'nenhum'} />
          <Campo l="Pago ao responsável" v={brl(pago)} /><Campo l={falta < 0 ? 'Acima do combinado' : 'Falta pagar'} v={falta !== null ? brl(Math.abs(falta)) : '—'} cor={falta < 0 ? 'var(--danger)' : undefined} />
          <Campo l="Material comprado à parte" v={brl(material)} /><Campo l="Custo total até agora" v={brl(pago + material)} forte />
        </div>
        <p className="step mt16" style={{ margin: '16px 0 6px' }}>Pagamentos</p>
        {linhas.length === 0 ? <p className="muted">Nenhum pagamento registrado.</p> : (
          <table className="rel-tab"><thead><tr><th>Data</th><th>Descrição</th><th className="r">Valor</th>{orc ? <th className="r">Saldo</th> : null}</tr></thead>
            <tbody>{linhas.map(d => <tr key={d.id}><td>{dataCurta(d.data)}</td><td>{d.descricao}{d.forma_pagamento ? <small> · {d.forma_pagamento}</small> : null}</td><td className="r num">{brl(d.valor)}</td>{orc ? <td className="r num" style={{ color: d.saldo < 0 ? 'var(--danger)' : undefined }}>{brl(d.saldo)}</td> : null}</tr>)}</tbody>
            <tfoot><tr><td colSpan={2}>Total pago</td><td className="r num">{brl(pago)}</td>{orc ? <td className="r num">{brl(falta)}</td> : null}</tr></tfoot></table>
        )}
        {materiais.length > 0 && (<>
          <p className="step" style={{ margin: '16px 0 6px' }}><Package size={14} className="i" /> Material</p>
          <table className="rel-tab"><tbody>{materiais.map(d => <tr key={d.id}><td>{dataCurta(d.data)}</td><td>{d.descricao}</td><td className="r num">{brl(d.valor)}</td></tr>)}</tbody>
            <tfoot><tr><td colSpan={2}>Total em material</td><td className="r num">{brl(material)}</td></tr></tfoot></table>
        </>)}
        {orcs.length > 1 && (<>
          <p className="step" style={{ margin: '16px 0 6px' }}>Orçamentos recebidos</p>
          <table className="rel-tab"><tbody>{orcs.map(g => <tr key={g.id}><td>{g.fornecedor || g.pessoas?.nome || 'Fornecedor'}{g.aprovado ? <small> · aprovado</small> : null}</td><td className="r num">{brl(g.valor)}</td></tr>)}</tbody></table>
        </>)}
      </Secao>

      {atts.length > 0 && (
        <Secao Icon={FileText} titulo="Andamento">
          <ul className="rel-tempo">{atts.map(a => <li key={a.id}><b>{dataCurta(a.data || a.criado_em?.slice(0, 10))}</b><span>{a.texto}</span></li>)}</ul>
        </Secao>
      )}

      {o.descricao && <Secao Icon={FileText} titulo="Descritivo combinado"><p className="descritivo">{o.descricao}</p></Secao>}

      <div className="px mt24 btnrow no-print">
        <button className="btn dark" style={{ flex: 1 }} onClick={() => window.print()}><Printer size={17} className="i" />Imprimir / PDF</button>
        <button className="btn wa" style={{ flex: 1 }} onClick={enviar}><Send size={17} className="i" />WhatsApp</button>
      </div>
      <div className="px mt12 no-print"><Link className="btn block" to={`/obras/${o.id}`}>Abrir a obra</Link></div>
      <div style={{ height: 16 }} />
    </div>
  )
}

const Secao = ({ Icon, titulo, children }) => (
  <section className="px mt16"><div className="card rel-sec"><h2><Icon size={18} className="i" />{titulo}</h2>{children}</div></section>
)
const Campo = ({ l, v, cor, forte }) => <div><span>{l}</span><b style={{ color: cor, fontSize: forte ? 16 : undefined }}>{v}</b></div>
const Barra = ({ rotulo, pct, cor }) => <div className="mt12"><div className="barlabel"><span>{rotulo}</span><b>{pct}%</b></div><div className="bar"><i style={{ width: pct + '%', '--b': cor }} /></div></div>
