import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useDados, q, soma } from '../hooks'
import { brl, mesAtual, semanasDesde, STATUS_OBRA } from '../util'
import { Ic } from '../components/Icones'

const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

export default function Inicio() {
  const { dados, erro } = useDados(async () => {
    const [categorias, despesas, obras, fixos, pessoas, manut, docs, estoque] = await Promise.all([
      q.categorias(), q.despesasMes(), q.obras(), q.custosFixos(), q.pessoas(),
      supabase.from('manutencoes').select('id,nome,proxima').eq('ativo', true).not('proxima', 'is', null).lte('proxima', new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)).then(r => r.data || []),
      supabase.from('documentos').select('id,nome,validade').not('validade', 'is', null).lte('validade', new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)).then(r => r.data || []),
      supabase.from('estoque_itens').select('id,nome,quantidade,minimo').eq('ativo', true).then(r => (r.data || []).filter(e => Number(e.quantidade) <= Number(e.minimo))),
    ])
    return { categorias, despesas, obras, fixos, pessoas, manut, docs, estoque }
  })
  const mes = mesAtual()
  if (erro) return <p className="erro">{erro}</p>
  if (!dados) return <p className="carregando">Carregando…</p>

  const { categorias, despesas, obras, fixos, pessoas, manut, docs, estoque } = dados
  const total = soma(despesas)
  const totalFixos = soma(fixos)
  const totalObras = soma(despesas.filter(d => d.obra_id))
  const totalPessoas = soma(despesas.filter(d => d.pessoa_id && !d.obra_id))
  const mediaTotal = soma(categorias, 'media_mensal')
  const ativas = obras.filter(o => ['orcamento_pendente', 'em_andamento', 'pausada'].includes(o.status))
  const semOrcamento = ativas.filter(o => !o.orcamento_total)

  const porCat = categorias.map(c => {
    const gasto = soma(despesas.filter(d => d.categoria_id === c.id))
    const fixo = soma(fixos.filter(f => f.categoria_id === c.id))
    const media = Number(c.media_mensal || 0)
    const desvio = media ? Math.round((gasto - media) / media * 100) : null
    const nObras = ativas.filter(o => o.categoria_id === c.id).length
    return { ...c, gasto, fixo, media, desvio, nObras }
  })

  // Vencimentos dos próximos 7 dias (custos fixos com dia de vencimento)
  const hojeD = new Date(); const diaHoje = hojeD.getDate()
  const proximos = fixos.filter(f => f.dia_vencimento && f.dia_vencimento >= diaHoje && f.dia_vencimento <= diaHoje + 7)
    .map(f => {
      const d = new Date(hojeD.getFullYear(), hojeD.getMonth(), f.dia_vencimento)
      const pago = despesas.some(x => x.custo_fixo_id === f.id)
      return { ...f, dia: DIAS[d.getDay()], pago }
    }).filter(f => !f.pago)

  const alertas = [
    ...semOrcamento.map(o => ({ tipo: 'alerta', ic: 'alerta', texto: `${o.nome} sem orçamento registrado`, to: `/obras/${o.id}` })),
    ...ativas.filter(o => o.orcamento_total && o.combinado_verbal).map(o => ({ tipo: 'alerta', ic: 'alerta', texto: `${o.nome}: combinado só verbal`, to: `/obras/${o.id}` })),
    ...manut.map(m => ({ tipo: m.proxima < new Date().toISOString().slice(0, 10) ? 'alerta' : 'info', ic: 'ferramenta', texto: `${m.nome}: ${m.proxima < new Date().toISOString().slice(0, 10) ? 'manutenção atrasada' : 'manutenção esta semana'}`, to: '/manutencoes' })),
    ...docs.map(d => ({ tipo: 'info', ic: 'doc', texto: `${d.nome} vence em breve`, to: '/documentos' })),
    ...(estoque.length ? [{ tipo: 'info', ic: 'caixa', texto: `${estoque.length} item${estoque.length > 1 ? 'ns' : ''} do estoque acabando`, to: '/estoque' }] : []),
    ...proximos.slice(0, 2).map(f => ({ tipo: 'info', ic: 'relogio', texto: `${f.categorias?.nome}: ${f.descricao} vence dia ${f.dia_vencimento}`, to: `/casa/${f.categoria_id}` })),
    ...porCat.filter(c => c.desvio !== null && c.desvio >= 25).map(c => ({ tipo: 'alerta', ic: 'grafico', texto: `${c.nome} ${c.desvio}% acima da média`, to: `/casa/${c.id}` })),
  ]

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div>
          <div className="sobre">{mes.label}</div>
          <h1>Como a casa está este mês</h1>
        </div>
        <Link to="/admin" className="icone-btn" aria-label="Admin"><Ic n="engrenagem" s={20} /></Link>
      </div>

      <div className="grade-3">
        <div className="cartao-escuro">
          <div className="rotulo">Gasto do mês</div>
          <div className="grande">{brl(total)}</div>
          {mediaTotal > 0 && <div className="destaque">{total >= mediaTotal ? `${brl(total - mediaTotal)} acima da média` : `${brl(mediaTotal - total)} abaixo da média`} ({brl(mediaTotal)})</div>}
          <div className="linha-fina">
            <div><span>Fixos</span><b>{brl(totalFixos)}</b></div>
            <div><span>Obras</span><b>{brl(totalObras)}</b></div>
            <div><span>Pessoas</span><b>{brl(totalPessoas)}</b></div>
          </div>
        </div>
        <div className="cartao">
          <div className="rotulo">Custos fixos cadastrados</div>
          <div className="valor">{brl(totalFixos)}</div>
          <div className="nota">{fixos.length} itens · {fixos.filter(f => despesas.some(d => d.custo_fixo_id === f.id)).length} pagos este mês</div>
        </div>
        <div className="cartao">
          <div className="rotulo">Obras em andamento</div>
          <div className="valor">{ativas.length}</div>
          {semOrcamento.length > 0 ? <div className="nota alerta">{semOrcamento.length} sem orçamento registrado</div> : <div className="nota">{ativas.length ? 'Todas com orçamento' : 'Nenhuma aberta'}</div>}
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="lista">
          {alertas.map((a, i) => (
            <Link key={i} to={a.to} className={`faixa faixa-${a.tipo}`}><Ic n={a.ic} s={18} w={2.2} /><span>{a.texto}</span><Ic n="seta" s={16} /></Link>
          ))}
        </div>
      )}

      <div className="secao-titulo"><h2>Categorias</h2><Link to="/categorias">Ver todas</Link></div>
      <div className="grade-4">
        {porCat.map(c => (
          <Link key={c.id} to={`/categorias/${c.id}`} className="cartao">
            <div className="entre"><span className="titulo-cartao">{c.nome}</span>
              {c.desvio !== null && c.desvio >= 25 ? <span className="chip chip-alerta">+{c.desvio}%</span>
                : c.nObras ? <span className="chip chip-alerta">{c.nObras} obra{c.nObras > 1 ? 's' : ''}</span>
                : c.gasto > 0 ? <span className="chip chip-ok">em dia</span> : null}
            </div>
            <div className="valor">{brl(c.gasto)}</div>
            <div className="nota">{c.fixo ? `Fixo ${brl(c.fixo)}` : 'Variável'}{c.media ? ` · média ${brl(c.media)}` : ''}</div>
          </Link>
        ))}
      </div>

      <div className="secao-titulo"><h2>Obras</h2><Link to="/obras">Ver todas</Link></div>
      {ativas.length === 0 ? <div className="cartao vazio">Nenhuma obra aberta. Quando começar uma, registre aqui antes do primeiro pagamento.</div> : (
        <div className="grade-2">
          {ativas.map(o => {
            const pago = soma(despesas.filter(d => d.obra_id === o.id && d.tipo === 'obra'))
            const pct = o.orcamento_total ? Math.min(100, Math.round(pago / o.orcamento_total * 100)) : 55
            const st = STATUS_OBRA[o.status]
            return (
              <Link key={o.id} to={`/obras/${o.id}`} className="cartao">
                <div className="entre"><span className="titulo-cartao">{o.nome}</span><span className={`chip ${o.orcamento_total ? st.cls : 'chip-alerta'}`}>{o.orcamento_total ? st.label : 'Sem orçamento'}</span></div>
                <div className="nota">{o.data_inicio ? `Semana ${semanasDesde(o.data_inicio)}` : 'Sem data de início'}{o.pessoas?.nome ? ` · ${o.pessoas.nome}` : ''}</div>
                <div className="barra"><div className={o.orcamento_total ? 'info' : ''} style={{ width: pct + '%' }} /></div>
                <div className="nota">Pago <b>{brl(pago)}</b>{o.orcamento_total ? ` de ${brl(o.orcamento_total)}` : ' · total não informado'}</div>
              </Link>
            )
          })}
        </div>
      )}

      {proximos.length > 0 && (
        <>
          <div className="secao-titulo"><h2>Esta semana</h2></div>
          <div className="cartao">
            {proximos.map(f => (
              <div key={f.id} className="linha-item">
                <div className="dia info">{f.dia}</div>
                <div style={{ flex: 1 }}><div className="titulo-cartao">{f.pessoas?.nome ? `${f.pessoas.nome} · ` : ''}{f.descricao}</div><div className="nota">{f.categorias?.nome} · {brl(f.valor)}</div></div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
