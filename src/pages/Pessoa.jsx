import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useDados, q, soma } from '../hooks'
import { brl, dataCurta, FREQ, UNIDADE } from '../util'
import { FolhaDespesa } from '../components/FolhaDespesa'
import { Ic } from '../components/Icones'
import { FolhaPessoa, corAvatar, previstoMes } from './Pessoas'

export default function Pessoa() {
  const { id } = useParams()
  const nav = useNavigate()
  const [editar, setEditar] = useState(false)
  const [pagar, setPagar] = useState(null)
  const { dados, recarregar } = useDados(async () => {
    const [p, despesas, obras, categorias] = await Promise.all([
      supabase.from('pessoas').select('*, categorias(nome)').eq('id', id).single().then(r => r.data),
      q.despesas({ pessoa_id: id }),
      supabase.from('obras').select('id,nome,status').eq('empreiteiro_id', id).then(r => r.data || []),
      q.categorias(),
    ])
    return { p, despesas, obras, categorias }
  }, [id])
  if (!dados) return <p className="carregando">Carregando…</p>
  const { p, despesas, obras, categorias } = dados
  if (!p) return <p className="erro">Pessoa não encontrada.</p>
  const prev = previstoMes(p)
  const mes = new Date().toISOString().slice(0, 7)
  const pagoMes = soma(despesas.filter(d => d.data.startsWith(mes)))

  const desativar = async () => {
    if (!confirm(`Remover ${p.nome} da lista? O histórico de pagamentos continua guardado.`)) return
    await supabase.from('pessoas').update({ ativo: false }).eq('id', id); nav('/pessoas')
  }

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div className="voltar-linha">
          <Link to="/pessoas" className="icone-btn" aria-label="Voltar"><Ic n="voltar" s={20} w={2.2} /></Link>
          <div className="avatar" style={corAvatar(p.nome)}>{p.nome[0]}</div>
          <div><div className="sobre">{p.funcao}</div><h1>{p.nome}</h1></div>
        </div>
        <button className="btn claro pequeno" onClick={() => setEditar(true)}>Editar</button>
      </div>

      <div className="cartao" style={{ gap: 8 }}>
        <div className="entre"><span className="nota">Combinado</span><b>{p.valor_combinado ? `${brl(p.valor_combinado)}${UNIDADE[p.unidade_valor] || ''}` : 'não informado'}</b></div>
        <div className="entre"><span className="nota">Frequência</span><b>{FREQ[p.frequencia] || ''}{p.dias_semana?.length ? ` (${p.dias_semana.join(', ')})` : ''}</b></div>
        <div className="entre"><span className="nota">Pagamento</span><b>{p.forma_pagamento || '—'}</b></div>
        {p.telefone && <div className="entre"><span className="nota">Telefone</span><a href={`https://wa.me/55${p.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="link">{p.telefone}</a></div>}
        {p.categorias?.nome && <div className="entre"><span className="nota">Categoria</span><b>{p.categorias.nome}</b></div>}
        {p.observacoes && <p className="texto" style={{ paddingTop: 8, borderTop: '1px solid var(--linha-2)', whiteSpace: 'pre-wrap' }}>{p.observacoes}</p>}
      </div>

      <div className="grade-2">
        <div className="cartao"><div className="rotulo">Previsto no mês</div><div className="valor">{prev ? brl(prev) : '—'}</div></div>
        <div className="cartao"><div className="rotulo">Pago este mês</div><div className="valor">{brl(pagoMes)}</div>{prev > 0 && <div className={'nota' + (pagoMes >= prev ? '' : ' alerta')}>{pagoMes >= prev ? 'em dia' : `falta ${brl(prev - pagoMes)}`}</div>}</div>
      </div>

      <button className="btn largo escuro" onClick={() => setPagar({ tipo: 'pessoa', pessoa_id: id, categoria_id: p.categoria_id || '', descricao: `Pagamento ${p.nome}`, valor: p.valor_combinado || '', forma_pagamento: p.forma_pagamento || 'Pix' })}>Registrar pagamento</button>

      {obras.length > 0 && (
        <>
          <div className="secao-titulo"><h2>Obras</h2></div>
          <div className="lista">{obras.map(o => <Link key={o.id} to={`/obras/${o.id}`} className="cartao"><span className="titulo-cartao">{o.nome}</span></Link>)}</div>
        </>
      )}

      <div className="secao-titulo"><h2>Histórico</h2><span className="nota">{despesas.length} pagamento{despesas.length !== 1 ? 's' : ''}</span></div>
      <div className="cartao">
        {despesas.length === 0 && <p className="nota">Nenhum pagamento registrado ainda.</p>}
        {despesas.map(d => (
          <div key={d.id} className="linha-item" style={{ justifyContent: 'space-between' }}>
            <div><div style={{ fontSize: 13, fontWeight: 600 }}>{d.descricao}</div><div className="nota">{dataCurta(d.data)}{d.forma_pagamento ? ` · ${d.forma_pagamento}` : ''}{d.obras?.nome ? ` · ${d.obras.nome}` : ''}</div>{d.explicacao && <p className="texto">{d.explicacao}</p>}</div>
            <b style={{ fontSize: 14 }}>{brl(d.valor)}</b>
          </div>
        ))}
      </div>

      <button className="link" style={{ background: 'none', border: 'none', color: 'var(--cinza)', cursor: 'pointer', textAlign: 'left' }} onClick={desativar}>Remover da lista</button>

      {editar && <FolhaPessoa pessoa={p} categorias={categorias} onFechar={() => setEditar(false)} onSalvo={recarregar} />}
      {pagar && <FolhaDespesa inicial={pagar} onFechar={() => setPagar(null)} onSalvo={recarregar} />}
    </div>
  )
}
