import { Link } from 'react-router-dom'
import { ChevronRight, TriangleAlert, Wrench } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados, q, soma } from '../hooks'
import { brl, mesAtual, semanasDesde, dataExtenso, saudacao, nomeUsuario, iniciais, dataCurta } from '../util'
import { CatTile } from '../lib/categoryStyle'
import { Meander } from '../components/ui/Meander'
import { useToast } from '../components/ui/Toast'
import { useCasa } from '../lib/casa'
import { SectionHero, QuickAdd } from '../components/Secao'
import { GradeAreas } from '../components/Areas'
import { SECOES, degrade, temaCategoria } from '../lib/sectionThemes'
import { avisarMudanca } from '../hooks'
import { ContaLinha } from '../components/FolhaConta'
import { useAcoesConta } from './Contas'
import { statusConta, gerarContasMes } from '../lib/contas'
import { Plus } from 'lucide-react'

export default function Inicio({ sessao }) {
  const toast = useToast()
  const { casa } = useCasa()
  const mods = casa?.modulos || []
  const email = sessao?.user?.email
  const { dados, recarregar } = useDados(async () => {
    const em7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    const hj = new Date().toISOString().slice(0, 10)
    await gerarContasMes()
    const [categorias, despesas, obras, fixos, pessoas, manut, estoque, contas] = await Promise.all([
      q.categorias(), q.despesasMes(), q.obras(), q.custosFixos(), q.pessoas(),
      supabase.from('manutencoes').select('id,nome,proxima,categoria_id').eq('ativo', true).not('proxima', 'is', null).lte('proxima', em7).order('proxima').then(r => r.data || []),
      supabase.from('estoque_itens').select('id,nome,quantidade,minimo,categoria_id').eq('ativo', true).then(r => (r.data || []).filter(e => Number(e.quantidade) <= Number(e.minimo))),
      supabase.from('contas').select('*, categorias(*)').or(`pago_em.is.null,pago_em.gte.${mesAtual().ini}`).order('vencimento').then(r => r.data || [], () => []),
    ])
    return { categorias, despesas, obras, fixos, pessoas, manut, estoque, contas, hj }
  })
  const mes = mesAtual()
  const acoesConta = useAcoesConta(recarregar)
  if (!dados) return <p className="carregando">Carregando…</p>
  const { categorias, despesas, obras, fixos, manut, estoque, contas, hj } = dados
  const cAtras = contas.filter(c => statusConta(c) === 'atrasada')
  const cVencer = contas.filter(c => statusConta(c) === 'avencer')
  const cPagas = contas.filter(c => statusConta(c) === 'paga')
  const cLista = [...cAtras, ...cVencer].slice(0, 5)

  const total = soma(despesas)
  const totalFixos = soma(despesas.filter(d => !d.obra_id && !(d.pessoa_id && !d.obra_id)))
  const totalObras = soma(despesas.filter(d => d.obra_id))
  const totalPessoas = soma(despesas.filter(d => d.pessoa_id && !d.obra_id))
  const previstoBase = total
  const cabe = Math.max(0, previstoBase - total)
  const ativas = obras.filter(o => ['orcamento_pendente', 'em_andamento', 'pausada'].includes(o.status))

  const alertas = []
  const diaHoje = new Date().getDate()
  fixos.filter(fx => fx.pessoa_id && fx.dia_vencimento && fx.dia_vencimento >= diaHoje && fx.dia_vencimento <= diaHoje + 3 && !despesas.some(d => d.custo_fixo_id === fx.id)).forEach(fx => {
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
      <div className="hello">
        <div><small>{casa?.nome} · {dataExtenso()}</small><h1>{saudacao()}{email ? `, ${nomeUsuario(sessao.user)}` : ''}</h1></div>
        <span className="avatar">{iniciais(nomeUsuario(sessao?.user))}</span>
      </div>

      <Link to="/fechamento" style={{ display: 'block' }}>
        <SectionHero chave="inicio" g={SECOES.inicio.g} Icon={SECOES.inicio.Icon} titulo={mes.label.replace(/^./, c => c.toUpperCase())} subtitulo="Gasto até agora, somando contas, obras e pessoas" valor={brl(total)} />
      </Link>

      <div className="s-stats">
        <Link to="/contas" className="stat"><span>Contas</span><b className="num">{brl(totalFixos)}</b></Link>
        <Link to={mods.includes('obras') ? '/obras' : '/historico'} className="stat"><span>Obras</span><b className="num">{brl(totalObras)}</b></Link>
        <Link to={mods.includes('pessoas') ? '/pessoas' : '/historico'} className="stat"><span>Pessoas</span><b className="num">{brl(totalPessoas)}</b></Link>
      </div>

      <div className="sec-h mt24"><h2>Lançar rápido</h2></div>
      <QuickAdd placeholder="O que você pagou? Ex: gás, jardineiro…" onSalvar={async (d, v) => {
        if (!v) { toast({ txt: 'Informe o valor.', erro: true }); throw new Error('sem valor') }
        await supabase.from('despesas').insert({ tipo: 'variavel', descricao: d || 'Gasto', valor: v, data: hj, forma_pagamento: 'Pix', fotos: [] })
        toast('Salvo'); avisarMudanca()
      }} />

      {top3.length > 0 && (
        <section className="sec">
          <div className="sec-h"><h2>Precisa de atenção<span className="count">{alertas.length + cAtras.length}</span></h2></div>
          <div className="px stack-y">
            {cAtras.slice(0, 3).map(c => <ContaLinha key={c.id} c={c} onAbrir={acoesConta.abrir} onPagar={acoesConta.pagar} />)}
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
      {top3.length === 0 && cAtras.length > 0 && (
        <section className="sec"><div className="sec-h"><h2>Contas atrasadas<span className="count">{cAtras.length}</span></h2></div>
          <div className="px stack-y">{cAtras.slice(0, 3).map(c => <ContaLinha key={c.id} c={c} onAbrir={acoesConta.abrir} onPagar={acoesConta.pagar} />)}</div></section>
      )}

      <div className="sec-h mt24"><h2>Áreas da casa</h2><Link to="/areas">Ver tudo <ChevronRight size={16} className="i" /></Link></div>
      <GradeAreas />

      {cVencer.length > 0 && (
        <section className="sec"><div className="sec-h"><h2>A vencer</h2><Link to="/contas">Contas <ChevronRight size={16} className="i" /></Link></div>
          <div className="px stack-y">{cVencer.slice(0, 4).map(c => <ContaLinha key={c.id} c={c} onAbrir={acoesConta.abrir} onPagar={acoesConta.pagar} />)}</div></section>
      )}

      <div className="sec-h mt24"><h2>Últimos lançamentos</h2><Link to="/historico">Ver todos <ChevronRight size={16} className="i" /></Link></div>
      <div className="px"><div className="list">
        {despesas.length === 0 && <div className="s-empty">Nada lançado neste mês ainda. Use o campo acima.</div>}
        {despesas.slice(0, 6).map(d => { const tc = temaCategoria(d.categorias || { nome: d.pessoa_id ? 'diaristas' : d.obra_id ? 'obras' : '' }); return (
          <Link key={d.id} to="/historico" className="row"><span className="s-dot" style={{ background: degrade(tc.g) }}><tc.Icon size={18} /></span>
            <div className="grow"><p className="t">{d.descricao}</p><p className="s">{d.categorias?.nome || d.pessoas?.nome || d.obras?.nome || 'Sem categoria'} · {dataCurta(d.data)}</p></div>
            <b className="num">{brl(d.valor)}</b></Link>) })}
      </div></div>
      <div style={{ height: 12 }} />
      {acoesConta.folhas}
    </>
  )
}
