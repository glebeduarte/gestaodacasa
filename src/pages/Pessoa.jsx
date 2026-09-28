import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Phone, MessageCircle, Pencil } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados, soma } from '../hooks'
import { brl, dataCurta, iniciais, mesAtual, UNIDADE } from '../util'
import { BackBar } from '../components/ui/BackBar'
import { FolhaDespesa } from '../components/FolhaDespesa'
import { FolhaPessoa, corAvatar, previstoMes } from './Pessoas'

export default function Pessoa() {
  const { id } = useParams()
  const [pagar, setPagar] = useState(false)
  const [editar, setEditar] = useState(false)
  const { dados, recarregar } = useDados(async () => {
    const seis = new Date(); seis.setMonth(seis.getMonth() - 6)
    const [p, cats, despesas] = await Promise.all([
      supabase.from('pessoas').select('*, categorias(*)').eq('id', id).single().then(r => r.data),
      supabase.from('categorias').select('id,nome,cor,icone').eq('ativo', true).then(r => r.data || []),
      supabase.from('despesas').select('*').eq('pessoa_id', id).gte('data', seis.toISOString().slice(0, 10)).order('data', { ascending: false }).then(r => r.data || []),
    ])
    return { p, cats, despesas }
  }, [id])
  if (!dados) return <p className="carregando">Carregando…</p>
  const { p, cats, despesas } = dados
  const m = mesAtual()
  const doMes = despesas.filter(d => d.data >= m.ini && d.data <= m.fim)
  const prev = previstoMes(p)
  const pago = soma(doMes)
  const tel = (p.telefone || '').replace(/\D/g, '')

  return (
    <>
      <BackBar to="/pessoas" titulo={p.nome} acao={<button className="iconbtn" onClick={() => setEditar(true)} aria-label="Editar"><Pencil size={18} className="i" /></button>} />
      <header className="hdr" style={{ paddingTop: 12 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div className={`pill-av ${corAvatar(p)}`} style={{ width: 60, height: 60, fontSize: 20, borderRadius: 18 }}>{iniciais(p.nome)}</div>
          <div><h1 style={{ fontSize: 24 }}>{p.nome}</h1><p className="sub">{p.funcao} · {brl(p.valor_combinado)} {UNIDADE[p.unidade_valor] || ''}</p></div>
        </div>
      </header>

      <div className="px btnrow">
        {tel && <a className="btn wa" href={`https://wa.me/55${tel}`} target="_blank" rel="noreferrer"><MessageCircle size={18} className="i" />WhatsApp</a>}
        {tel && <a className="btn call" href={`tel:${tel}`}><Phone size={18} className="i" />Ligar</a>}
      </div>

      <div className="px stats mt16">
        <div className="stat"><p className="l">Previsto/mês</p><p className="v num">{brl(prev)}</p></div>
        <div className="stat"><p className="l" style={{ color: 'var(--ok)' }}>Pago no mês</p><p className="v num">{brl(pago)}</p></div>
        <div className="stat"><p className="l" style={{ color: 'var(--danger)' }}>Falta</p><p className="v num">{brl(Math.max(0, prev - pago))}</p></div>
      </div>

      {p.observacoes && <div className="px mt16"><div className="tip"><p className="s" style={{ marginTop: 0 }}>{p.observacoes}</p></div></div>}

      <div className="px mt16"><button className="btn primary block" onClick={() => setPagar(true)}>Registrar pagamento</button></div>

      <div className="sec-h mt24"><h2>Últimos pagamentos</h2></div>
      <div className="px">
        {despesas.length === 0 ? <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhum pagamento registrado ainda.</p></div>
          : <div className="list">{despesas.map(d => (
            <div key={d.id} className="row"><div className="grow"><p className="t">{d.descricao}</p><p className="s">{dataCurta(d.data)}{d.forma_pagamento ? ` · ${d.forma_pagamento}` : ''}</p></div><b className="num">{brl(d.valor)}</b></div>
          ))}</div>}
      </div>
      <div style={{ height: 12 }} />
      {pagar && <FolhaDespesa inicial={{ tipo: 'pessoa', pessoa_id: p.id, categoria_id: p.categoria_id || '', descricao: p.funcao || p.nome, valor: p.valor_combinado || '' }} onFechar={() => setPagar(false)} onSalvo={recarregar} />}
      {editar && <FolhaPessoa inicial={p} cats={cats} onFechar={() => setEditar(false)} onSalvo={recarregar} />}
    </>
  )
}
