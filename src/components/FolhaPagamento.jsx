import { useEffect, useState } from 'react'
import { Plus, Minus, X, Camera, Trash2 } from 'lucide-react'
import { supabase } from '../supabase'
import { Sheet } from './ui/Sheet'
import { useToast } from './ui/Toast'
import { enviarFotos } from './Upload'
import { brl, hoje, dataCurta } from '../util'
import { excluirDespesa } from '../lib/crud'
import { FolhaEditarDespesa } from './FolhaEditarDespesa'
import { Pencil, HandCoins, Check } from 'lucide-react'
import { adiantamentosAbertos, distribuir, registrarDescontos, restante } from '../lib/adiantamentos'
import { numero } from '../util'

const PAGAMENTOS = ['Pix', 'Dinheiro', 'Cartão', 'Transferência']
export const TIPO_ITEM = {
  base: { txt: 'Combinado', cls: 'pool', sinal: 1 },
  extra: { txt: 'Extra', cls: 'ok', sinal: 1 },
  abatimento: { txt: 'Abatimento', cls: 'danger', sinal: -1 },
}
const num = (v) => { const s = String(v || '').trim(); return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s) || 0 }
const chave = () => Math.random().toString(36).slice(2)
export const totalItens = (itens) => itens.reduce((t, it) => t + TIPO_ITEM[it.tipo].sinal * Math.abs(num(it.valor)), 0)

// Registrar pagamento a uma pessoa, composto por itens: combinado, extras e abatimentos
export function FolhaPagamento({ pessoa, onFechar, onSalvo }) {
  const toast = useToast()
  const recorrente = pessoa.recorrente !== false
  const [itens, setItens] = useState([{ chave: chave(), tipo: 'base', descricao: recorrente ? (pessoa.funcao || 'Pagamento combinado') : '', valor: recorrente && pessoa.valor_combinado ? String(pessoa.valor_combinado).replace('.', ',') : '' }])
  const [f, setF] = useState({ data: hoje(), forma_pagamento: pessoa.forma_pagamento || 'Pix', explicacao: '' })
  const [fotos, setFotos] = useState([])
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const editar = (i, k, v) => setItens(x => x.map((it, j) => j === i ? { ...it, [k]: v } : it))
  const add = (tipo) => setItens(x => [...x, { chave: chave(), tipo, descricao: '', valor: '' }])
  const bruto = totalItens(itens)
  const [abertos, setAbertos] = useState([])
  const [sel, setSel] = useState({})
  useEffect(() => { adiantamentosAbertos(pessoa.id).then(l => { setAbertos(l); setSel(Object.fromEntries(l.map(a => [a.id, true]))) }) }, [pessoa.id])
  const aplicados = distribuir(abertos, sel, bruto)
  const descontoAdiant = aplicados.reduce((t, a) => t + a.aplicar, 0)
  const sobra = aplicados.reduce((t, a) => t + a.sobra, 0)
  const total = Math.round((bruto - descontoAdiant) * 100) / 100

  const salvar = async () => {
    setErro(null)
    const validos = itens.filter(it => num(it.valor))
    if (!validos.length) return setErro('Informe ao menos um valor.')
    if (validos.some(it => !it.descricao.trim())) return setErro('Descreva cada item do pagamento.')
    if (bruto <= 0) return setErro('O valor ficou zerado ou negativo. Confira os abatimentos.')
    setSalvando(true)
    try {
      const urls = fotos.length ? await enviarFotos(fotos, 'despesas') : []
      const temExtra = validos.some(it => it.tipo !== 'base')
      const descricao = validos.length === 1 ? validos[0].descricao.trim() : `${validos[0].descricao.trim()}${temExtra ? ' + ajustes' : ''}`
      const { data: d, error } = await supabase.from('despesas').insert({
        tipo: 'pessoa', pessoa_id: pessoa.id, categoria_id: pessoa.categoria_id || null,
        descricao: descontoAdiant > 0 ? `${descricao} (desc. adiantamentos)` : descricao, explicacao: f.explicacao || null, valor: total, data: f.data, forma_pagamento: f.forma_pagamento, fotos: urls,
      }).select('id').single()
      if (error) throw error
      const linhas = validos.map((it, ordem) => ({ despesa_id: d.id, tipo: it.tipo, descricao: it.descricao.trim(), valor: Math.abs(num(it.valor)), ordem }))
      aplicados.filter(a => a.aplicar > 0).forEach((a, i) => linhas.push({ despesa_id: d.id, tipo: 'abatimento', descricao: `Adiantamento de ${dataCurta(a.data)}${a.aplicar < restante(a) ? ' (parcial)' : ''}`, valor: a.aplicar, ordem: 100 + i, adiantamento_id: a.id }))
      const { error: e2 } = await supabase.from('pagamento_itens').insert(linhas)
      if (e2) throw e2
      await registrarDescontos(aplicados)
      toast('Pagamento registrado'); onSalvo?.(); onFechar()
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  return (
    <Sheet titulo={`Pagar ${pessoa.nome.split(' ')[0]}`} onFechar={onFechar}>
      <div className="stack-y">
        <div className="field"><span className="l">Itens do pagamento</span>
          <div className="pg-itens">{itens.map((it, i) => (
            <div key={it.chave} className={`pg-item t-${it.tipo}`}>
              <div className="pg-top"><span className={`chip ${TIPO_ITEM[it.tipo].cls}`}>{TIPO_ITEM[it.tipo].txt}</span>
                {itens.length > 1 && <button type="button" className="iconbtn" onClick={() => setItens(x => x.filter((_, j) => j !== i))} aria-label="Remover"><X size={16} className="i" /></button>}</div>
              <input className="input" value={it.descricao} onChange={e => editar(i, 'descricao', e.target.value)} placeholder={it.tipo === 'base' ? 'Ex.: diárias da semana' : it.tipo === 'extra' ? 'Ex.: limpeza pós-obra' : 'Ex.: adiantamento do dia 05'} />
              <label className="money sm"><span>{it.tipo === 'abatimento' ? '− R$' : 'R$'}</span><input inputMode="decimal" placeholder="0,00" value={it.valor} onChange={e => editar(i, 'valor', e.target.value)} /></label>
            </div>))}</div>
          <div className="btnrow mt8">
            <button type="button" className="btn sm" onClick={() => add('base')}><Plus size={15} className="i" />Item</button>
            <button type="button" className="btn sm" onClick={() => add('extra')}><Plus size={15} className="i" />Extra</button>
            <button type="button" className="btn sm" onClick={() => add('abatimento')}><Minus size={15} className="i" />Abatimento</button>
          </div>
        </div>

        {abertos.length > 0 && (
          <div className="field"><span className="l">Adiantamentos em aberto (descontar)</span>
            <div className="pg-itens">{abertos.map(a => { const ap = aplicados.find(x => x.id === a.id); return (
              <label key={a.id} className={`pg-adiant ${sel[a.id] ? 'on' : ''}`}>
                <input type="checkbox" checked={!!sel[a.id]} onChange={e => setSel(x => ({ ...x, [a.id]: e.target.checked }))} />
                <div className="grow"><b>{dataCurta(a.data)}</b>{a.explicacao ? <small> · {a.explicacao}</small> : null}{Number(a.descontado) > 0 && <small> · restante de {brl(a.valor)}</small>}</div>
                <span className="num">− {brl(ap ? ap.aplicar : restante(a))}</span>
              </label>) })}</div>
          </div>
        )}

        <div className="pg-resumo">
          {descontoAdiant > 0 && <><div><span>Valor bruto</span><span className="num">{brl(bruto)}</span></div><div><span>Adiantamentos descontados</span><span className="num">− {brl(descontoAdiant)}</span></div></>}
          <div className="pg-total"><span>Líquido a pagar</span><b className="num">{brl(total)}</b></div>
          {sobra > 0 && <p className="muted">{brl(sobra)} de adiantamento passam para o próximo pagamento.</p>}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}><span className="l">Data</span><input className="input" type="date" value={f.data} onChange={e => set('data', e.target.value)} /></label>
          <label className="field" style={{ flex: 1 }}><span className="l">Forma</span><select className="input" value={f.forma_pagamento} onChange={e => set('forma_pagamento', e.target.value)}>{[...new Set([f.forma_pagamento, ...PAGAMENTOS])].map(p => <option key={p}>{p}</option>)}</select></label>
        </div>
        <label className="field"><span className="l">Observação (opcional)</span><textarea className="input" value={f.explicacao} onChange={e => set('explicacao', e.target.value)} placeholder="Algo para lembrar sobre este pagamento" /></label>
        <label className="upload">
          <span className="tile t-md c-docs"><Camera size={22} className="i" /></span>
          <div><b style={{ color: 'var(--ink)', fontSize: 14.5 }}>{fotos.length ? `${fotos.length} foto(s) escolhida(s)` : 'Comprovante'}</b><p className="muted">Foto do Pix ou recibo</p></div>
          <input type="file" accept="image/*" multiple hidden onChange={e => setFotos([...e.target.files])} />
        </label>
        {erro && <p style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 13.5 }}>{erro}</p>}
        <button className="btn primary block" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : `Registrar ${brl(total)}`}</button>
      </div>
    </Sheet>
  )
}

// Detalhe de um pagamento já feito, com seus itens
export function FolhaVerPagamento({ despesa, onFechar, onSalvo }) {
  const toast = useToast()
  const [editar, setEditar] = useState(false)
  const itens = [...(despesa.pagamento_itens || [])].sort((a, b) => a.ordem - b.ordem)
  const excluir = async () => {
    if (!confirm(`Excluir este pagamento de ${brl(despesa.valor)}?`)) return
    try { await excluirDespesa(despesa.id); toast('Pagamento excluído'); onSalvo?.(); onFechar() } catch (e) { toast({ txt: e.message, erro: true }) }
  }
  return (
    <Sheet titulo={`Pagamento de ${dataCurta(despesa.data)}`} onFechar={onFechar}>
      <div className="stack-y">
        {itens.length > 0 ? <div className="list">{itens.map(it => (
          <div key={it.id} className="row"><div className="grow"><span className={`chip ${TIPO_ITEM[it.tipo].cls}`}>{TIPO_ITEM[it.tipo].txt}</span><p className="t" style={{ marginTop: 4 }}>{it.descricao}</p></div>
            <b className="num" style={{ color: it.tipo === 'abatimento' ? 'var(--danger)' : 'inherit' }}>{it.tipo === 'abatimento' ? '− ' : ''}{brl(it.valor)}</b></div>))}</div>
          : <div className="list"><div className="row"><div className="grow"><p className="t">{despesa.descricao}</p></div><b className="num">{brl(despesa.valor)}</b></div></div>}
        {despesa.adiantamento && <div className="tip"><HandCoins size={18} className="i" style={{ color: 'var(--warn)', flex: '0 0 auto' }} /><p className="s" style={{ marginTop: 0 }}>Adiantamento. {restante(despesa) > 0 ? `${brl(restante(despesa))} ainda a descontar no próximo pagamento.` : 'Já descontado integralmente.'}</p></div>}
        {itens.some(i => i.tipo === 'abatimento') && <div className="pg-resumo"><div><span>Valor bruto</span><span className="num">{brl(itens.filter(i => i.tipo !== 'abatimento').reduce((t, i) => t + Number(i.valor), 0))}</span></div><div><span>Descontos</span><span className="num">− {brl(itens.filter(i => i.tipo === 'abatimento').reduce((t, i) => t + Number(i.valor), 0))}</span></div></div>}
        <div className="pg-total"><span>{despesa.adiantamento ? 'Valor adiantado' : 'Total pago'}</span><b className="num">{brl(despesa.valor)}</b></div>
        <p className="muted">{dataCurta(despesa.data)}{despesa.forma_pagamento ? ` · ${despesa.forma_pagamento}` : ''}</p>
        {despesa.explicacao && <div className="tip"><p className="s" style={{ marginTop: 0 }}>{despesa.explicacao}</p></div>}
        {despesa.fotos?.length > 0 && <div className="photos">{despesa.fotos.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" /></a>)}</div>}
        <div className="btnrow">
          <button className="btn" style={{ flex: 1 }} onClick={() => setEditar(true)}><Pencil size={16} className="i" />Editar</button>
          <button className="btn" style={{ flex: 1, color: 'var(--danger)' }} onClick={excluir}><Trash2 size={16} className="i" />Excluir</button>
        </div>
      </div>
      {editar && <FolhaEditarDespesa despesa={despesa} onFechar={() => setEditar(false)} onSalvo={() => { onSalvo?.(); onFechar() }} />}
    </Sheet>
  )
}

// Registrar um adiantamento: sai do caixa agora e fica em aberto até ser descontado
export function FolhaAdiantamento({ pessoa, onFechar, onSalvo }) {
  const toast = useToast()
  const [f, setF] = useState({ valor: '', data: hoje(), forma_pagamento: pessoa.forma_pagamento || 'Pix', motivo: '' })
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    const valor = numero(f.valor)
    if (!valor) return setErro('Informe o valor.')
    setSalvando(true)
    try {
      await supabase.from('despesas').insert({ tipo: 'pessoa', adiantamento: true, descontado: 0, pessoa_id: pessoa.id, categoria_id: pessoa.categoria_id || null,
        descricao: `Adiantamento ${pessoa.nome.split(' ')[0]}`, explicacao: f.motivo || null, valor, data: f.data, forma_pagamento: f.forma_pagamento, fotos: [] })
      toast('Adiantamento registrado'); onSalvo?.(); onFechar()
    } catch (e) { setErro(e.message); setSalvando(false) }
  }
  return (
    <Sheet titulo={`Adiantamento para ${pessoa.nome.split(' ')[0]}`} onFechar={onFechar}>
      <div className="stack-y">
        <p className="muted">O valor entra no gasto de hoje e fica em aberto. No próximo pagamento ele aparece para ser descontado.</p>
        <label className="money"><span>R$</span><input inputMode="decimal" placeholder="0,00" value={f.valor} onChange={e => set('valor', e.target.value)} autoFocus /></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}><span className="l">Data</span><input className="input" type="date" value={f.data} onChange={e => set('data', e.target.value)} /></label>
          <label className="field" style={{ flex: 1 }}><span className="l">Forma</span><select className="input" value={f.forma_pagamento} onChange={e => set('forma_pagamento', e.target.value)}>{[...new Set([f.forma_pagamento, ...PAGAMENTOS])].map(p => <option key={p}>{p}</option>)}</select></label>
        </div>
        <label className="field"><span className="l">Motivo (opcional)</span><input className="input" value={f.motivo} onChange={e => set('motivo', e.target.value)} placeholder="Ex.: farmácia, passagem" /></label>
        {erro && <p style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 13.5 }}>{erro}</p>}
        <button className="btn primary block" onClick={salvar} disabled={salvando}><Check size={18} className="i" />{salvando ? 'Salvando…' : 'Registrar adiantamento'}</button>
      </div>
    </Sheet>
  )
}
