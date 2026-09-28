import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Check } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados, soma } from '../hooks'
import { brl, dataCurta, hoje, mesAtual, variacao } from '../util'
import { CatTile } from '../lib/categoryStyle'
import { BackBar } from '../components/ui/BackBar'
import { FolhaDespesa } from '../components/FolhaDespesa'
import { Sheet } from '../components/ui/Sheet'
import { useToast } from '../components/ui/Toast'
import { abrirDocumento } from './Documentos'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export default function Categoria() {
  const { id } = useParams()
  const toast = useToast()
  const [despesaAberta, setDespesaAberta] = useState(null)
  const [fixoAberto, setFixoAberto] = useState(false)

  const { dados, recarregar } = useDados(async () => {
    const seis = new Date(); seis.setMonth(seis.getMonth() - 5); seis.setDate(1)
    const [c, fixos, pessoas, despesas, docs] = await Promise.all([
      supabase.from('categorias').select('*').eq('id', id).single().then(r => r.data),
      supabase.from('custos_fixos').select('*, pessoas(nome)').eq('categoria_id', id).eq('ativo', true).then(r => r.data || []),
      supabase.from('pessoas').select('id,nome,funcao').eq('ativo', true).order('nome').then(r => r.data || []),
      supabase.from('despesas').select('*, pessoas(nome), obras(nome)').eq('categoria_id', id).gte('data', seis.toISOString().slice(0, 10)).order('data', { ascending: false }).then(r => r.data || []),
      supabase.from('documentos').select('id,nome,arquivo_url,validade').eq('categoria_id', id).then(r => r.data || []),
    ])
    return { c, fixos, pessoas, despesas, docs }
  }, [id])

  if (!dados) return <p className="carregando">Carregando…</p>
  const { c, fixos, pessoas, despesas, docs } = dados
  const { ini, fim } = mesAtual()
  const doMes = despesas.filter(d => d.data >= ini && d.data <= fim)
  const totalMes = soma(doMes)
  const mesAnt = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); const a = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10), b = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10); return soma(despesas.filter(x => x.data >= a && x.data <= b)) })()
  const varia = variacao(totalMes, mesAnt)

  const hist = []
  for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); const y = d.getFullYear(), m = d.getMonth(); const a = new Date(y, m, 1).toISOString().slice(0, 10), b = new Date(y, m + 1, 0).toISOString().slice(0, 10); hist.push({ label: MESES[m], total: soma(despesas.filter(x => x.data >= a && x.data <= b)), atual: i === 0 }) }
  const max = Math.max(1, ...hist.map(h => h.total))
  const media = hist.reduce((t, h) => t + h.total, 0) / hist.length

  const pagar = async (f) => {
    if (!confirm(`Confirmar pagamento de ${brl(f.valor)} (${f.descricao})?`)) return
    await supabase.from('despesas').insert({ tipo: f.pessoa_id ? 'pessoa' : 'fixo', categoria_id: id, pessoa_id: f.pessoa_id || null, custo_fixo_id: f.id, descricao: f.descricao, valor: f.valor, data: hoje(), forma_pagamento: f.debito_automatico ? 'Débito automático' : 'Pix' })
    toast('Pagamento registrado'); recarregar()
  }

  return (
    <>
      <BackBar to="/categorias" titulo={c.nome} />
      <header className="hdr" style={{ paddingTop: 12 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <CatTile cat={c} size="lg" />
          <div><p className="hero-value" style={{ color: 'var(--ink)', fontSize: 32 }}>{brl(totalMes)}</p>
            <p className="sub">{varia !== null ? `${varia >= 0 ? '+' : ''}${varia}% vs mês passado (${brl(mesAnt)})` : 'este mês'}</p></div>
        </div>
      </header>

      <section className="px mt16">
        <div className="card">
          <div className="barlabel"><span>Últimos 6 meses</span><b className="num">média {brl(media)}</b></div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 96, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, borderTop: '1.5px dashed var(--line)', bottom: `${media / max * 72 + 20}px` }} />
            {hist.map(h => (
              <div key={h.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', borderRadius: 5, minHeight: 3, height: Math.max(3, h.total / max * 72), background: h.atual ? 'var(--primary)' : '#C9DCE8' }} title={brl(h.total)} />
                <small style={{ fontSize: 10, color: h.atual ? 'var(--ink)' : 'var(--muted)', fontWeight: h.atual ? 700 : 500 }}>{h.label}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="sec-h mt24"><h2>Custos fixos</h2><button className="link" onClick={() => setFixoAberto(true)}>+ Adicionar</button></div>
      <div className="px stack-y">
        {fixos.length === 0 && <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhum custo fixo aqui. Toque em adicionar para cadastrar contas ou pagamentos recorrentes.</p></div>}
        {fixos.map(f => {
          const pago = doMes.find(d => d.custo_fixo_id === f.id)
          return (
            <div key={f.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><p style={{ fontWeight: 700, fontSize: 14.5 }}>{f.pessoas?.nome ? `${f.pessoas.nome} · ` : ''}{f.descricao}</p>
                  <p className="muted">{f.recorrencia}{f.dia_vencimento ? ` · vence dia ${f.dia_vencimento}` : ''}{f.debito_automatico ? ' · débito automático' : ''}</p></div>
                <b className="num" style={{ fontSize: 15 }}>{brl(f.valor)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                {pago ? <span className="chip ok"><Check size={13} className="i" />Pago em {dataCurta(pago.data)}</span> : <span className="chip warn">Ainda não pago</span>}
                {!pago && <div style={{ display: 'flex', gap: 6 }}><button className="btn sm ghost" onClick={() => setDespesaAberta({ tipo: f.pessoa_id ? 'pessoa' : 'fixo', categoria_id: id, pessoa_id: f.pessoa_id || '', custo_fixo_id: f.id, descricao: f.descricao, valor: f.valor, forma_pagamento: f.debito_automatico ? 'Débito automático' : 'Pix' })}>Outro valor</button><button className="btn sm dark" onClick={() => pagar(f)}>Pagar</button></div>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="sec-h mt24"><h2>Gastos avulsos</h2><span className="muted">{doMes.filter(d => !d.custo_fixo_id).length}</span></div>
      <div className="px stack-y">
        {doMes.filter(d => !d.custo_fixo_id).length === 0 && <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhum gasto avulso neste mês.</p></div>}
        {doMes.filter(d => !d.custo_fixo_id).map(d => (
          <div key={d.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><p style={{ fontWeight: 700, fontSize: 14.5 }}>{d.descricao}</p><b className="num" style={{ fontSize: 14.5 }}>{brl(d.valor)}</b></div>
            {d.explicacao && <p className="sub" style={{ marginTop: 4 }}>{d.explicacao}</p>}
            <p className="muted" style={{ marginTop: 4 }}>{dataCurta(d.data)}{d.consumo ? ` · ${Number(d.consumo)} ${d.unidade_consumo}` : ''}{d.forma_pagamento ? ` · ${d.forma_pagamento}` : ''}{d.pessoas?.nome ? ` · ${d.pessoas.nome}` : ''}</p>
            {d.fotos?.length > 0 && <div className="fotos">{d.fotos.map(u => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" /></a>)}</div>}
          </div>
        ))}
      </div>

      <div className="px mt16"><button className="btn soft block" onClick={() => setDespesaAberta({ categoria_id: id })}><Plus size={18} className="i" />Gasto em {c.nome}</button></div>

      {docs.length > 0 && (<>
        <div className="sec-h mt24"><h2>Documentos</h2></div>
        <div className="px"><div className="list">{docs.map(d => <button key={d.id} className="row" onClick={() => d.arquivo_url && abrirDocumento(d.arquivo_url)}><span className="tile t-md c-docs"><Check size={20} className="i" style={{ display: 'none' }} /><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="i"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /></svg></span><div className="grow"><p className="t">{d.nome}</p>{d.validade && <p className="s">validade {dataCurta(d.validade)}</p>}</div></button>)}</div></div>
      </>)}

      <div style={{ height: 12 }} />
      {despesaAberta && <FolhaDespesa inicial={despesaAberta} onFechar={() => setDespesaAberta(null)} onSalvo={recarregar} />}
      {fixoAberto && <FolhaFixo categoria_id={id} pessoas={pessoas} onFechar={() => setFixoAberto(false)} onSalvo={recarregar} />}
    </>
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
    <Sheet titulo="Novo custo fixo" onFechar={onFechar}>
      <div className="stack-y">
        <label className="field"><span className="l">Descrição</span><input className="input" value={f.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Ex.: conta de luz, limpeza semanal" /></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}><span className="l">Valor (R$)</span><input className="input" inputMode="decimal" value={f.valor} onChange={e => set('valor', e.target.value)} /></label>
          <label className="field" style={{ flex: 1 }}><span className="l">Dia do venc.</span><input className="input" inputMode="numeric" value={f.dia_vencimento} onChange={e => set('dia_vencimento', e.target.value)} placeholder="1 a 31" /></label>
        </div>
        <div className="field"><span className="l">Recorrência</span><div className="chips">{['semanal', 'quinzenal', 'mensal', 'anual'].map(v => <button key={v} type="button" className={`pick ${f.recorrencia === v ? 'on' : ''}`} onClick={() => set('recorrencia', v)}>{v}</button>)}</div></div>
        <label className="field"><span className="l">Pessoa (se for pagamento a alguém)</span><select className="input" value={f.pessoa_id} onChange={e => set('pessoa_id', e.target.value)}><option value="">Nenhuma</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome} · {p.funcao}</option>)}</select></label>
        <label className="field" style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'row' }}><input type="checkbox" checked={f.debito_automatico} onChange={e => set('debito_automatico', e.target.checked)} style={{ width: 20, height: 20 }} /><span style={{ fontSize: 14 }}>Débito automático</span></label>
        <button className="btn primary block" onClick={salvar}>Salvar custo fixo</button>
      </div>
    </Sheet>
  )
}
