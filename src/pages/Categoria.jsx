import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useDados, soma } from '../hooks'
import { brl, dataCurta, hoje, mesAtual } from '../util'
import { Folha } from '../components/Folha'
import { FolhaDespesa } from '../components/FolhaDespesa'
import { Ic } from '../components/Icones'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export default function Categoria() {
  const { id } = useParams()
  const [despesaAberta, setDespesaAberta] = useState(null)
  const [fixoAberto, setFixoAberto] = useState(false)
  const [editar, setEditar] = useState(false)

  const { dados, recarregar } = useDados(async () => {
    const seis = new Date(); seis.setMonth(seis.getMonth() - 5); seis.setDate(1)
    const [c, fixos, pessoas, despesas] = await Promise.all([
      supabase.from('categorias').select('*').eq('id', id).single().then(r => r.data),
      supabase.from('custos_fixos').select('*, pessoas(nome)').eq('categoria_id', id).eq('ativo', true).then(r => r.data || []),
      supabase.from('pessoas').select('id,nome,funcao').eq('ativo', true).order('nome').then(r => r.data || []),
      supabase.from('despesas').select('*, pessoas(nome), obras(nome)').eq('categoria_id', id).gte('data', seis.toISOString().slice(0, 10)).order('data', { ascending: false }).then(r => r.data || []),
    ])
    return { c, fixos, pessoas, despesas }
  }, [id])

  if (!dados) return <p className="carregando">Carregando…</p>
  const { c, fixos, pessoas, despesas } = dados
  const { ini, fim } = mesAtual()
  const doMes = despesas.filter(d => d.data >= ini && d.data <= fim)
  const totalMes = soma(doMes)

  // Últimos 6 meses
  const hist = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const y = d.getFullYear(), m = d.getMonth()
    const a = new Date(y, m, 1).toISOString().slice(0, 10), b = new Date(y, m + 1, 0).toISOString().slice(0, 10)
    hist.push({ label: MESES[m], total: soma(despesas.filter(x => x.data >= a && x.data <= b)), atual: i === 0 })
  }
  const max = Math.max(1, ...hist.map(h => h.total))

  const marcarPago = (f) => setDespesaAberta({
    tipo: f.pessoa_id ? 'pessoa' : 'fixo', categoria_id: id, pessoa_id: f.pessoa_id || '', custo_fixo_id: f.id,
    descricao: f.descricao, valor: f.valor, data: hoje(), forma_pagamento: f.debito_automatico ? 'Débito automático' : 'Pix',
  })

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div className="voltar-linha">
          <Link to="/casa" className="icone-btn" aria-label="Voltar"><Ic n="voltar" s={20} w={2.2} /></Link>
          <div><div className="sobre">Categoria</div><h1>{c.nome}</h1></div>
        </div>
        <button className="btn claro pequeno" onClick={() => setEditar(true)}>Editar</button>
      </div>

      <div className="cartao" style={{ flexDirection: 'row', gap: 24 }}>
        <div><div className="rotulo">Este mês</div><div className="valor" style={{ fontSize: 30 }}>{brl(totalMes)}</div></div>
        <div><div className="rotulo">Média esperada</div><div className="valor" style={{ fontSize: 30, color: 'var(--cinza)' }}>{c.media_mensal ? brl(c.media_mensal) : '—'}</div></div>
      </div>

      <div className="secao-titulo"><h2>Custos fixos</h2><a className="link" href="#" onClick={e => { e.preventDefault(); setFixoAberto(true) }}>+ Adicionar</a></div>
      {fixos.length === 0 ? <div className="cartao vazio">Nenhum custo fixo nesta categoria.</div> : fixos.map(f => {
        const pago = doMes.find(d => d.custo_fixo_id === f.id)
        return (
          <div key={f.id} className="cartao-escuro" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="entre">
              <div><div style={{ fontWeight: 700, fontSize: 15 }}>{f.pessoas?.nome ? `${f.pessoas.nome} · ` : ''}{f.descricao}</div>
                <div style={{ fontSize: 12, color: 'var(--marinho-texto)' }}>{f.recorrencia}{f.dia_vencimento ? ` · vence dia ${f.dia_vencimento}` : ''}{f.debito_automatico ? ' · débito automático' : ''}</div></div>
              <div className="valor" style={{ color: '#fff' }}>{brl(f.valor)}</div>
            </div>
            <div className="entre" style={{ paddingTop: 10, borderTop: '1px solid var(--marinho-linha)' }}>
              {pago ? <span style={{ fontSize: 12, color: '#9FE0C3', fontWeight: 700 }}>Pago em {dataCurta(pago.data)}</span>
                : <span style={{ fontSize: 12, color: '#F4B98F', fontWeight: 700 }}>Ainda não pago este mês</span>}
              {!pago && <button className="btn pequeno" onClick={() => marcarPago(f)}>Marcar pago</button>}
            </div>
          </div>
        )
      })}

      <div className="secao-titulo"><h2>Despesas do mês</h2><span className="nota">{doMes.length} registro{doMes.length !== 1 ? 's' : ''}</span></div>
      <div className="lista">
        {doMes.filter(d => !d.custo_fixo_id).map(d => (
          <div key={d.id} className="cartao">
            <div className="entre"><span className="titulo-cartao">{d.descricao}</span><span className="titulo-cartao">{brl(d.valor)}</span></div>
            {d.explicacao && <p className="texto">{d.explicacao}</p>}
            <div className="meta"><span>{dataCurta(d.data)}</span>{d.forma_pagamento && <span>· {d.forma_pagamento}{d.pessoas?.nome ? ` para ${d.pessoas.nome}` : ''}</span>}{d.obras?.nome && <span>· {d.obras.nome}</span>}{d.fotos?.length > 0 && <span className="nota info">· {d.fotos.length} foto{d.fotos.length > 1 ? 's' : ''}</span>}</div>
            {d.fotos?.length > 0 && <div className="fotos">{d.fotos.map(u => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" /></a>)}</div>}
          </div>
        ))}
      </div>
      <button className="btn-tracejado" onClick={() => setDespesaAberta({ categoria_id: id })}><Ic n="mais" s={18} w={2.5} />Registrar despesa em {c.nome}</button>

      <div className="secao-titulo"><h2>Últimos 6 meses</h2></div>
      <div className="cartao">
        <div className="grafico">
          {hist.map(h => <div key={h.label}><div className={'coluna' + (h.atual ? ' atual' : '')} style={{ height: Math.max(3, h.total / max * 70) + 'px' }} title={brl(h.total)} /><small style={h.atual ? { color: 'var(--tinta)', fontWeight: 700 } : {}}>{h.label}</small></div>)}
        </div>
      </div>

      {despesaAberta && <FolhaDespesa inicial={despesaAberta} onFechar={() => setDespesaAberta(null)} onSalvo={recarregar} />}
      {fixoAberto && <FolhaFixo categoria_id={id} pessoas={pessoas} onFechar={() => setFixoAberto(false)} onSalvo={recarregar} />}
      {editar && <FolhaEditarCategoria c={c} onFechar={() => setEditar(false)} onSalvo={recarregar} />}
    </div>
  )
}

function FolhaFixo({ categoria_id, pessoas, onFechar, onSalvo }) {
  const [f, setF] = useState({ descricao: '', valor: '', dia_vencimento: '', recorrencia: 'mensal', pessoa_id: '', debito_automatico: false })
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.descricao || !f.valor) return
    await supabase.from('custos_fixos').insert({ categoria_id, descricao: f.descricao, valor: Number(f.valor), dia_vencimento: f.dia_vencimento ? Number(f.dia_vencimento) : null, recorrencia: f.recorrencia, pessoa_id: f.pessoa_id || null, debito_automatico: f.debito_automatico })
    onSalvo(); onFechar()
  }
  return (
    <Folha titulo="Novo custo fixo" onFechar={onFechar}>
      <div className="form">
        <div className="campo"><label>Descrição</label><input value={f.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Ex.: conta de luz, limpeza semanal" /></div>
        <div className="campo-linha">
          <div className="campo"><label>Valor (R$)</label><input inputMode="decimal" value={f.valor} onChange={e => set('valor', e.target.value)} /></div>
          <div className="campo"><label>Dia do vencimento</label><input inputMode="numeric" value={f.dia_vencimento} onChange={e => set('dia_vencimento', e.target.value)} placeholder="1 a 31" /></div>
        </div>
        <div className="campo"><label>Recorrência</label><div className="opcoes">{['semanal', 'quinzenal', 'mensal', 'anual'].map(v => <button key={v} type="button" className={f.recorrencia === v ? 'marcado' : ''} onClick={() => set('recorrencia', v)}>{v}</button>)}</div></div>
        <div className="campo"><label>Pessoa (se for pagamento a alguém)</label><select value={f.pessoa_id} onChange={e => set('pessoa_id', e.target.value)}><option value="">Nenhuma</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome} · {p.funcao}</option>)}</select></div>
        <label className="check"><input type="checkbox" checked={f.debito_automatico} onChange={e => set('debito_automatico', e.target.checked)} />Débito automático</label>
        <button className="btn largo" onClick={salvar}>Salvar custo fixo</button>
      </div>
    </Folha>
  )
}

function FolhaEditarCategoria({ c, onFechar, onSalvo }) {
  const [nome, setNome] = useState(c.nome)
  const [media, setMedia] = useState(c.media_mensal || '')
  const salvar = async () => {
    await supabase.from('categorias').update({ nome, media_mensal: media ? Number(media) : null }).eq('id', c.id)
    onSalvo(); onFechar()
  }
  return (
    <Folha titulo="Editar categoria" onFechar={onFechar}>
      <div className="form">
        <div className="campo"><label>Nome</label><input value={nome} onChange={e => setNome(e.target.value)} /></div>
        <div className="campo"><label>Média mensal esperada</label><input inputMode="decimal" value={media} onChange={e => setMedia(e.target.value)} placeholder="Usada para avisar quando passar" /></div>
        <button className="btn largo" onClick={salvar}>Salvar</button>
      </div>
    </Folha>
  )
}
