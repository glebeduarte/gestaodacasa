import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Phone, MessageCircle, Pencil, HandCoins } from 'lucide-react'
import { restante } from '../lib/adiantamentos'
import { supabase } from '../supabase'
import { useDados, soma } from '../hooks'
import { brl, dataCurta, iniciais, mesAtual, UNIDADE } from '../util'
import { BackBar } from '../components/ui/BackBar'
import { FolhaPagamento, FolhaVerPagamento, FolhaAdiantamento, TIPO_ITEM } from '../components/FolhaPagamento'
import { FolhaPessoa, corAvatar } from './Pessoas'

export default function Pessoa() {
  const { id } = useParams()
  const [pagar, setPagar] = useState(false)
  const [editar, setEditar] = useState(false)
  const [ver, setVer] = useState(null)
  const [adiantar, setAdiantar] = useState(false)
  const [todos, setTodos] = useState(false)
  const { dados, recarregar } = useDados(async () => {
    const seis = new Date(); seis.setMonth(seis.getMonth() - (todos ? 120 : 6))
    const [p, cats, despesas, abertos] = await Promise.all([
      supabase.from('pessoas').select('*, categorias(*)').eq('id', id).single().then(r => r.data),
      supabase.from('categorias').select('id,nome,cor,icone').eq('ativo', true).then(r => r.data || []),
      supabase.from('despesas').select('*, pagamento_itens(*)').eq('pessoa_id', id).gte('data', seis.toISOString().slice(0, 10)).order('data', { ascending: false }).then(r => r.data || []),
      supabase.from('despesas').select('id,valor,descontado,data,explicacao').eq('pessoa_id', id).eq('adiantamento', true).order('data').then(r => (r.data || []).filter(a => restante(a) > 0.004)),
    ])
    return { p, cats, despesas, abertos }
  }, [id, todos])
  if (!dados) return <p className="carregando">Carregando…</p>
  const { p, cats, despesas, abertos } = dados
  const saldoAdiant = abertos.reduce((t, a) => t + restante(a), 0)
  const m = mesAtual()
  const doMes = despesas.filter(d => d.data >= m.ini && d.data <= m.fim)
  const pago = soma(doMes)
  const tel = (p.telefone || '').replace(/\D/g, '')

  return (
    <>
      <BackBar to="/pessoas" titulo={p.nome} acao={<button className="iconbtn" onClick={() => setEditar(true)} aria-label="Editar"><Pencil size={18} className="i" /></button>} />
      <header className="hdr" style={{ paddingTop: 12 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div className={`pill-av ${corAvatar(p)}`} style={{ width: 60, height: 60, fontSize: 20, borderRadius: 18 }}>{iniciais(p.nome)}</div>
          <div><h1 style={{ fontSize: 24 }}>{p.nome}</h1><p className="sub">{p.funcao}{p.valor_combinado ? ` · ${brl(p.valor_combinado)} ${UNIDADE[p.unidade_valor] || ''}` : ''}</p><span className={`chip ${p.recorrente === false ? '' : 'pool'}`} style={{ marginTop: 6 }}>{p.recorrente === false ? 'Pagamento avulso' : `Recorrente · ${p.frequencia || 'mensal'}`}</span></div>
        </div>
      </header>

      <div className="px btnrow">
        {tel && <a className="btn wa" href={`https://wa.me/55${tel}`} target="_blank" rel="noreferrer"><MessageCircle size={18} className="i" />WhatsApp</a>}
        {tel && <a className="btn call" href={`tel:${tel}`}><Phone size={18} className="i" />Ligar</a>}
      </div>

      <div className="px stats mt16">
        <div className="stat"><p className="l" style={{ color: 'var(--ok)' }}>Pago no mês</p><p className="v num">{brl(pago)}</p></div>
        <div className="stat"><p className="l">Pagamentos no mês</p><p className="v num">{doMes.length}</p></div>
        <div className="stat"><p className="l">Último</p><p className="v">{despesas[0] ? dataCurta(despesas[0].data) : '—'}</p></div>
      </div>

      {p.observacoes && <div className="px mt16"><div className="tip"><p className="s" style={{ marginTop: 0 }}>{p.observacoes}</p></div></div>}

      {saldoAdiant > 0 && (
        <div className="px mt16"><div className="adiant-card">
          <div className="adiant-top"><HandCoins size={20} className="i" /><div className="grow"><p className="t">Adiantamentos em aberto</p><p className="s">{abertos.length} · serão descontados no próximo pagamento</p></div><b className="num">{brl(saldoAdiant)}</b></div>
          <div className="adiant-lista">{abertos.map(a => <div key={a.id}><span>{dataCurta(a.data)}{a.explicacao ? ` · ${a.explicacao}` : ''}{Number(a.descontado) > 0 ? ' · restante' : ''}</span><span className="num">{brl(restante(a))}</span></div>)}</div>
        </div></div>
      )}

      <div className="px mt16 btnrow">
        <button className="btn primary" style={{ flex: 1.4 }} onClick={() => setPagar(true)}>Registrar pagamento</button>
        <button className="btn soft" style={{ flex: 1 }} onClick={() => setAdiantar(true)}><HandCoins size={17} className="i" />Adiantamento</button>
      </div>

      <div className="sec-h mt24"><h2>Pagamentos</h2>{!todos && <button className="link" onClick={() => setTodos(true)}>Ver histórico completo</button>}</div>
      <div className="px">
        {despesas.length === 0 ? <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhum pagamento registrado ainda.</p></div>
          : <div className="list">{despesas.map(d => (
            <button key={d.id} type="button" className="row pg-row" onClick={() => setVer(d)}><div className="grow"><p className="t">{d.descricao}</p><p className="s">{dataCurta(d.data)}{d.forma_pagamento ? ` · ${d.forma_pagamento}` : ''}</p>
              {d.adiantamento && <div className="chips" style={{ marginTop: 6 }}><span className={`chip ${restante(d) > 0 ? 'warn' : ''}`}>{restante(d) > 0 ? `Adiantamento · ${brl(restante(d))} a descontar` : 'Adiantamento · descontado'}</span></div>}
              {(d.pagamento_itens || []).length > 1 && <div className="chips" style={{ marginTop: 6 }}>{['base', 'extra', 'abatimento'].map(t => { const n = d.pagamento_itens.filter(i => i.tipo === t).length; return n ? <span key={t} className={`chip ${TIPO_ITEM[t].cls}`}>{n} {TIPO_ITEM[t].txt.toLowerCase()}{n > 1 && t !== 'base' ? 's' : ''}</span> : null })}</div>}</div><b className="num">{brl(d.valor)}</b></button>
          ))}</div>}
      </div>
      <div style={{ height: 12 }} />
      {pagar && <FolhaPagamento pessoa={p} onFechar={() => setPagar(false)} onSalvo={recarregar} />}
      {adiantar && <FolhaAdiantamento pessoa={p} onFechar={() => setAdiantar(false)} onSalvo={recarregar} />}
      {ver && <FolhaVerPagamento despesa={ver} onFechar={() => setVer(null)} onSalvo={recarregar} />}
      {editar && <FolhaPessoa inicial={p} cats={cats} onFechar={() => setEditar(false)} onSalvo={recarregar} />}
    </>
  )
}
