import { Link } from 'react-router-dom'
import { ChevronRight, TriangleAlert, Wrench } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados, q, soma } from '../hooks'
import { brl, mesAtual, semanasDesde, dataExtenso, saudacao, primeiroNome, iniciais, dataCurta } from '../util'
import { CatTile } from '../lib/categoryStyle'
import { Meander } from '../components/ui/Meander'
import { useToast } from '../components/ui/Toast'

export default function Inicio({ sessao }) {
  const toast = useToast()
  const email = sessao?.user?.email
  const { dados, recarregar } = useDados(async () => {
    const em7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    const hj = new Date().toISOString().slice(0, 10)
    const [categorias, despesas, obras, fixos, pessoas, manut, estoque] = await Promise.all([
      q.categorias(), q.despesasMes(), q.obras(), q.custosFixos(), q.pessoas(),
      supabase.from('manutencoes').select('id,nome,proxima,categoria_id').eq('ativo', true).not('proxima', 'is', null).lte('proxima', em7).order('proxima').then(r => r.data || []),
      supabase.from('estoque_itens').select('id,nome,quantidade,minimo,categoria_id').eq('ativo', true).then(r => (r.data || []).filter(e => Number(e.quantidade) <= Number(e.minimo))),
    ])
    return { categorias, despesas, obras, fixos, pessoas, manut, estoque, hj }
  })
  const mes = mesAtual()
  if (!dados) return <p className="carregando">Carregando…</p>
  const { categorias, despesas, obras, fixos, manut, estoque, hj } = dados

  const total = soma(despesas)
  const totalFixos = soma(despesas.filter(d => d.tipo === 'fixo' || d.custo_fixo_id))
  const totalObras = soma(despesas.filter(d => d.obra_id))
  const totalPessoas = soma(despesas.filter(d => d.pessoa_id && !d.obra_id))
  const previstoBase = soma(fixos) || total
  const cabe = Math.max(0, previstoBase - total)
  const ativas = obras.filter(o => ['orcamento_pendente', 'em_andamento', 'pausada'].includes(o.status))

  const alertas = []
  const diaHoje = new Date().getDate()
  fixos.filter(fx => fx.dia_vencimento && fx.dia_vencimento >= diaHoje && fx.dia_vencimento <= diaHoje + 3 && !despesas.some(d => d.custo_fixo_id === fx.id)).forEach(fx => {
    const cat = categorias.find(c => c.id === fx.categoria_id)
    alertas.push({ k: 'danger', cat, texto: `${fx.descricao} vence dia ${fx.dia_vencimento}`, sub: `${cat?.nome || ''} · ${brl(fx.valor)}`, acao: 'pagar', fx })
  })
  estoque.forEach(e => { const cat = categorias.find(c => c.id === e.categoria_id); alertas.push({ k: 'warn', cat, texto: `${e.nome} está acabando`, sub: `Resta ${Number(e.quantidade)} · mínimo ${Number(e.minimo)}`, acao: 'comprar' }) })
  manut.forEach(m => { const cat = categorias.find(c => c.id === m.categoria_id); const atras = m.proxima < hj; alertas.push({ k: atras ? 'danger' : 'pool', cat, ic: 'wrench', texto: m.nome, sub: atras ? 'Manutenção atrasada' : `Manutenção ${dataCurta(m.proxima)}`, acao: 'ver-manut' }) })
  const ordem = { danger: 0, warn: 1, pool: 2, ok: 3 }
  alertas.sort((a, b) => ordem[a.k] - ordem[b.k])
  const top3 = alertas.slice(0, 3)

  const pagarFixo = async (fx) => {
    if (!confirm(`Confirmar pagamento de ${brl(fx.valor)} (${fx.descricao})?`)) return
    await supabase.from('despesas').insert({ tipo: fx.pessoa_id ? 'pessoa' : 'fixo', categoria_id: fx.categoria_id, pessoa_id: fx.pessoa_id || null, custo_fixo_id: fx.id, descricao: fx.descricao, valor: fx.valor, data: hj, forma_pagamento: fx.debito_automatico ? 'Débito automático' : 'Pix' })
    toast('Pagamento registrado'); recarregar()
  }

  const catGasto = (c) => soma(despesas.filter(d => d.categoria_id === c.id))
  const pMax = total || 1

  return (
    <>
      <header className="hdr">
        <div><p className="eyebrow">{dataExtenso()}</p><h1>{saudacao()}{email ? `, ${primeiroNome(email)}` : ''}</h1></div>
        <span className="avatar">{iniciais(primeiroNome(email))}</span>
      </header>

      <section className="px">
        <Link className="hero card-link" to="/fechamento">
          <div className="hero-top"><span className="eyebrow">{mes.label} · casa</span><span className="hero-link">Ver resumo <ChevronRight size={16} className="i" /></span></div>
          <p className="hero-label">Gasto até agora</p>
          <p className="hero-value num">{brl(total)}</p>
          <p className="hero-sub">{previstoBase > total ? <>de {brl(previstoBase)} previstos · ainda cabem <b>{brl(cabe)}</b></> : 'somando fixos, obras e pessoas'}</p>
          <div className="sbar">
            <i style={{ width: `${totalFixos / pMax * 100}%`, background: '#fff' }} />
            <i style={{ width: `${totalObras / pMax * 100}%`, background: '#FFC766' }} />
            <i style={{ width: `${totalPessoas / pMax * 100}%`, background: '#8EE3EF' }} />
          </div>
          <div className="legend">
            <div><span className="dot" style={{ background: '#fff' }} />Fixos<b className="num">{brl(totalFixos)}</b></div>
            <div><span className="dot" style={{ background: '#FFC766' }} />Obras<b className="num">{brl(totalObras)}</b></div>
            <div><span className="dot" style={{ background: '#8EE3EF' }} />Pessoas<b className="num">{brl(totalPessoas)}</b></div>
          </div>
          <Meander />
        </Link>
      </section>

      {/* No celular é uma coluna, na ordem abaixo. No desktop vira duas colunas:
          esquerda = atenção + próximos cuidados, direita = categorias + obra. */}
      <div className="home-grid">
        {top3.length > 0 && (
          <section className="sec s-alerts">
            <div className="sec-h"><h2>Precisa de atenção<span className="count">{alertas.length}</span></h2></div>
            <div className="px stack-y">
              {top3.map((a, i) => (
                <div key={i} className={`alert k-${a.k}`}>
                  {a.ic === 'wrench' ? <span className="tile t-md c-manut"><Wrench size={22} className="i" /></span> : <CatTile cat={a.cat} size="md" />}
                  <div className="grow"><p className="t">{a.texto}</p><p className="s">{a.sub}</p></div>
                  {a.acao === 'pagar' && <button className="btn sm dark" onClick={() => pagarFixo(a.fx)}>Paguei</button>}
                  {a.acao === 'comprar' && <Link className="btn sm soft" to="/estoque">Comprar</Link>}
                  {a.acao === 'ver-manut' && <Link className="btn sm" to="/manutencoes">Ver</Link>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="sec s-cats">
          <div className="sec-h"><h2>Categorias</h2><Link to="/categorias">Ver todas <ChevronRight size={16} className="i" /></Link></div>
          <div className="px catgrid">
            {categorias.slice(0, 8).map(c => (
              <Link key={c.id} className="cat card-link" to={`/categorias/${c.id}`}>
                <CatTile cat={c} size="md" /><span className="n">{c.nome}</span><span className="v num">{brl(catGasto(c))}</span>
              </Link>
            ))}
          </div>
        </section>

        {ativas.length > 0 && (
          <section className="sec s-obra">
            <div className="sec-h"><h2>Obra em andamento</h2><Link to="/obras">Ver obras <ChevronRight size={16} className="i" /></Link></div>
            <div className="px">
              {ativas.slice(0, 1).map(o => {
                const pago = soma(despesas.filter(d => d.obra_id === o.id && d.tipo === 'obra'))
                const sem = semanasDesde(o.data_inicio)
                let totalSem = null, pctTempo = 50
                if (o.data_inicio && o.prazo_previsto) { totalSem = Math.max(1, Math.round((new Date(o.prazo_previsto) - new Date(o.data_inicio)) / (7 * 86400000))); pctTempo = Math.min(100, Math.round(sem / totalSem * 100)) }
                const pctDinheiro = o.orcamento_total ? Math.min(100, Math.round(pago / o.orcamento_total * 100)) : null
                const afrente = pctDinheiro !== null && o.prazo_previsto && pctDinheiro - pctTempo > 10
                return (
                  <Link key={o.id} className="card card-link" to={`/obras/${o.id}`}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span className="tile t-md c-obras"><Wrench size={22} className="i" /></span>
                      <div style={{ flex: 1 }}><h3>{o.nome}</h3><p className="sub">{o.pessoas?.nome ? `${o.pessoas.nome} · ` : ''}{o.data_inicio ? `semana ${sem}${totalSem ? ` de ${totalSem}` : ''}` : 'sem data'}</p></div>
                      <span className={`chip ${o.orcamento_total ? 'pool' : 'warn'}`}>{o.orcamento_total ? 'Em andamento' : 'Sem orçamento'}</span>
                    </div>
                    {o.prazo_previsto && <div className="mt16"><div className="barlabel"><span>Tempo</span><b>{pctTempo}%</b></div><div className="bar"><i style={{ width: pctTempo + '%', '--b': 'var(--pool)' }} /></div></div>}
                    {o.orcamento_total ? <div className="mt12"><div className="barlabel"><span>Pago <b className="num">{brl(pago)}</b> de {brl(o.orcamento_total)}</span><b>{pctDinheiro}%</b></div><div className="bar"><i style={{ width: pctDinheiro + '%', '--b': 'var(--warn)' }} /></div></div>
                      : <p className="chip warn mt12"><TriangleAlert size={14} className="i" /> Peça um orçamento por escrito</p>}
                    {afrente && <p className="chip warn mt12"><TriangleAlert size={14} className="i" /> Pagamento à frente do andamento</p>}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {manut.length > 0 && (
          <section className="sec s-manut">
            <div className="sec-h"><h2>Próximos cuidados</h2><Link to="/manutencoes">Agenda <ChevronRight size={16} className="i" /></Link></div>
            <div className="px"><div className="list">
              {manut.slice(0, 2).map(m => { const cat = categorias.find(c => c.id === m.categoria_id); const atras = m.proxima < hj
                return (
                  <div key={m.id} className="row">
                    {cat ? <CatTile cat={cat} size="md" /> : <span className="tile t-md c-manut"><Wrench size={22} className="i" /></span>}
                    <div className="grow"><p className="t">{m.nome}</p><p className="s">{atras ? 'Atrasada' : dataCurta(m.proxima)}</p></div>
                    <span className={`chip ${atras ? 'danger' : ''}`}>{atras ? 'Atrasada' : dataCurta(m.proxima)}</span>
                  </div>
                ) })}
            </div></div>
          </section>
        )}
      </div>
      <div style={{ height: 12 }} />
    </>
  )
}
