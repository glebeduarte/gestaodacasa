import { useState } from 'react'
import { supabase } from '../supabase'
import { useDados, soma } from '../hooks'
import { brl2, dataCurta, STATUS_OBRA } from '../util'

const nomeMes = (ym) => new Date(ym + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

export default function Fechamento() {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const { dados } = useDados(async () => {
    const [y, m] = mes.split('-').map(Number)
    const ini = new Date(y, m - 1, 1).toISOString().slice(0, 10), fim = new Date(y, m, 0).toISOString().slice(0, 10)
    const iniAnt = new Date(y, m - 2, 1).toISOString().slice(0, 10), fimAnt = new Date(y, m - 1, 0).toISOString().slice(0, 10)
    const [cats, despesas, anteriores, obras, fixos, manut, docs, estoque] = await Promise.all([
      supabase.from('categorias').select('*').eq('ativo', true).order('ordem').then(r => r.data || []),
      supabase.from('despesas').select('*, categorias(nome), pessoas(nome), obras(nome)').gte('data', ini).lte('data', fim).order('data').then(r => r.data || []),
      supabase.from('despesas').select('categoria_id, valor').gte('data', iniAnt).lte('data', fimAnt).then(r => r.data || []),
      supabase.from('obras').select('*, pessoas(nome)').in('status', ['orcamento_pendente', 'em_andamento', 'pausada']).then(r => r.data || []),
      supabase.from('custos_fixos').select('*, categorias(nome)').eq('ativo', true).then(r => r.data || []),
      supabase.from('manutencoes').select('nome, proxima').eq('ativo', true).lt('proxima', fim).then(r => r.data || []),
      supabase.from('documentos').select('nome, validade').not('validade', 'is', null).lte('validade', new Date(y, m + 1, 0).toISOString().slice(0, 10)).then(r => r.data || []),
      supabase.from('estoque_itens').select('nome, quantidade, minimo').eq('ativo', true).then(r => r.data || []),
    ])
    const pagosObra = await supabase.from('despesas').select('obra_id, valor, tipo').not('obra_id', 'is', null).then(r => r.data || [])
    return { cats, despesas, anteriores, obras, fixos, manut, docs, estoque: estoque.filter(e => Number(e.quantidade) <= Number(e.minimo)), pagosObra, ini, fim }
  }, [mes])

  const opcoes = []
  for (let i = 0; i < 12; i++) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); opcoes.push(d.toISOString().slice(0, 7)) }

  if (!dados) return <p className="carregando">Carregando…</p>
  const { cats, despesas, anteriores, obras, fixos, manut, docs, estoque, pagosObra } = dados
  const total = soma(despesas), totalAnt = soma(anteriores)
  const fixosNaoPagos = fixos.filter(f => !despesas.some(d => d.custo_fixo_id === f.id))
  const porCat = cats.map(c => ({ ...c, total: soma(despesas.filter(d => d.categoria_id === c.id)), ant: soma(anteriores.filter(d => d.categoria_id === c.id)), consumo: despesas.filter(d => d.categoria_id === c.id && d.consumo).reduce((t, d) => t + Number(d.consumo), 0), un: despesas.find(d => d.categoria_id === c.id && d.unidade_consumo)?.unidade_consumo })).filter(c => c.total || c.ant)
  const porPessoa = Object.values(despesas.filter(d => d.pessoa_id).reduce((acc, d) => { const k = d.pessoa_id; acc[k] = acc[k] || { nome: d.pessoas?.nome, total: 0 }; acc[k].total += Number(d.valor); return acc }, {}))
  const varia = (a, b) => b ? Math.round((a - b) / b * 100) : null

  return (
    <div className="pilha fechamento">
      <div className="cabecalho no-print">
        <div><div className="sobre">Resumo do mês</div><h1>Fechamento</h1></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="campo-select" value={mes} onChange={e => setMes(e.target.value)} style={{ height: 44, borderRadius: 10, border: '1px solid #BFD0DC', padding: '0 10px', background: '#fff' }}>{opcoes.map(o => <option key={o} value={o}>{nomeMes(o)}</option>)}</select>
          <button className="btn" onClick={() => window.print()}>Gerar PDF</button>
        </div>
      </div>
      <div className="print-only"><div className="sobre">Gestão da Casa</div><h1 style={{ textTransform: 'capitalize' }}>Fechamento de {nomeMes(mes)}</h1></div>

      <div className="grade-3">
        <div className="cartao-escuro"><div className="rotulo">Total do mês</div><div className="grande">{brl2(total)}</div>{totalAnt > 0 && <div className="destaque">{varia(total, totalAnt) >= 0 ? '+' : ''}{varia(total, totalAnt)}% em relação ao mês anterior ({brl2(totalAnt)})</div>}</div>
        <div className="cartao"><div className="rotulo">Obras</div><div className="valor">{brl2(soma(despesas.filter(d => d.obra_id)))}</div><div className="nota">{obras.length} em andamento</div></div>
        <div className="cartao"><div className="rotulo">Pessoas</div><div className="valor">{brl2(soma(despesas.filter(d => d.pessoa_id && !d.obra_id)))}</div><div className="nota">{porPessoa.length} pagas</div></div>
      </div>

      <div className="secao-titulo"><h2>Por categoria</h2></div>
      <div className="cartao">
        {porCat.length === 0 && <p className="nota">Nenhuma despesa neste mês.</p>}
        {porCat.map(c => (
          <div key={c.id} className="linha-item" style={{ justifyContent: 'space-between' }}>
            <div><div style={{ fontSize: 14, fontWeight: 700 }}>{c.nome}</div><div className="nota">{c.ant ? `mês anterior ${brl2(c.ant)}` : 'sem registro no mês anterior'}{c.consumo ? ` · consumo ${c.consumo} ${c.un || ''}` : ''}</div></div>
            <div style={{ textAlign: 'right' }}><b>{brl2(c.total)}</b>{varia(c.total, c.ant) !== null && <div className={'nota' + (varia(c.total, c.ant) >= 25 ? ' alerta' : '')}>{varia(c.total, c.ant) >= 0 ? '+' : ''}{varia(c.total, c.ant)}%</div>}</div>
          </div>
        ))}
      </div>

      {obras.length > 0 && <>
        <div className="secao-titulo"><h2>Obras em andamento</h2></div>
        <div className="cartao">
          {obras.map(o => {
            const pago = soma(pagosObra.filter(p => p.obra_id === o.id && p.tipo === 'obra'))
            return (
              <div key={o.id} className="linha-item" style={{ justifyContent: 'space-between' }}>
                <div><div style={{ fontSize: 14, fontWeight: 700 }}>{o.nome}</div><div className="nota">{STATUS_OBRA[o.status].label}{o.combinado_verbal ? ' · combinado verbal' : ''}{o.pessoas?.nome ? ` · ${o.pessoas.nome}` : ''}{o.prazo_previsto ? ` · prazo ${dataCurta(o.prazo_previsto)}` : ' · sem prazo'}</div></div>
                <div style={{ textAlign: 'right' }}><b>{brl2(pago)}</b><div className={'nota' + (o.orcamento_total ? '' : ' alerta')}>{o.orcamento_total ? `de ${brl2(o.orcamento_total)}` : 'sem orçamento'}</div></div>
              </div>
            )
          })}
        </div>
      </>}

      {porPessoa.length > 0 && <>
        <div className="secao-titulo"><h2>Pagamentos a pessoas</h2></div>
        <div className="cartao">{porPessoa.map((p, i) => <div key={i} className="linha-item" style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 14, fontWeight: 600 }}>{p.nome}</span><b>{brl2(p.total)}</b></div>)}</div>
      </>}

      <div className="secao-titulo"><h2>Pendências</h2></div>
      <div className="cartao">
        {fixosNaoPagos.length === 0 && manut.length === 0 && docs.length === 0 && estoque.length === 0 && <p className="nota">Nada pendente.</p>}
        {fixosNaoPagos.map(f => <div key={f.id} className="linha-item"><span className="chip chip-alerta">fixo</span><span style={{ fontSize: 13 }}>{f.descricao} ({f.categorias?.nome}) não registrado como pago</span></div>)}
        {manut.map((m, i) => <div key={i} className="linha-item"><span className="chip chip-info">manutenção</span><span style={{ fontSize: 13 }}>{m.nome} vencia em {dataCurta(m.proxima)}</span></div>)}
        {docs.map((d, i) => <div key={i} className="linha-item"><span className="chip chip-neutra">documento</span><span style={{ fontSize: 13 }}>{d.nome} vence em {dataCurta(d.validade)}</span></div>)}
        {estoque.map((e, i) => <div key={i} className="linha-item"><span className="chip chip-neutra">estoque</span><span style={{ fontSize: 13 }}>{e.nome} está acabando</span></div>)}
      </div>

      <div className="secao-titulo"><h2>Todas as despesas</h2><span className="nota">{despesas.length}</span></div>
      <div className="cartao">
        {despesas.map(d => <div key={d.id} className="linha-item" style={{ justifyContent: 'space-between' }}><div><div style={{ fontSize: 13, fontWeight: 600 }}>{d.descricao}</div><div className="nota">{dataCurta(d.data)} · {d.categorias?.nome}{d.pessoas?.nome ? ` · ${d.pessoas.nome}` : ''}{d.obras?.nome ? ` · ${d.obras.nome}` : ''}</div></div><b style={{ fontSize: 13 }}>{brl2(d.valor)}</b></div>)}
      </div>
    </div>
  )
}
