import { useState } from 'react'
import { Plus, Minus, X, Camera, Trash2 } from 'lucide-react'
import { supabase } from '../supabase'
import { Sheet } from './ui/Sheet'
import { useToast } from './ui/Toast'
import { enviarFotos } from './Upload'
import { brl, hoje, dataCurta } from '../util'
import { excluirDespesa } from '../lib/crud'
import { FolhaEditarDespesa } from './FolhaEditarDespesa'
import { Pencil } from 'lucide-react'

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
  const total = totalItens(itens)

  const salvar = async () => {
    setErro(null)
    const validos = itens.filter(it => num(it.valor))
    if (!validos.length) return setErro('Informe ao menos um valor.')
    if (validos.some(it => !it.descricao.trim())) return setErro('Descreva cada item do pagamento.')
    if (total <= 0) return setErro('O total ficou zerado ou negativo. Confira os abatimentos.')
    setSalvando(true)
    try {
      const urls = fotos.length ? await enviarFotos(fotos, 'despesas') : []
      const temExtra = validos.some(it => it.tipo !== 'base')
      const descricao = validos.length === 1 ? validos[0].descricao.trim() : `${validos[0].descricao.trim()}${temExtra ? ' + ajustes' : ''}`
      const { data: d, error } = await supabase.from('despesas').insert({
        tipo: 'pessoa', pessoa_id: pessoa.id, categoria_id: pessoa.categoria_id || null,
        descricao, explicacao: f.explicacao || null, valor: total, data: f.data, forma_pagamento: f.forma_pagamento, fotos: urls,
      }).select('id').single()
      if (error) throw error
      const { error: e2 } = await supabase.from('pagamento_itens').insert(validos.map((it, ordem) => ({ despesa_id: d.id, tipo: it.tipo, descricao: it.descricao.trim(), valor: Math.abs(num(it.valor)), ordem })))
      if (e2) throw e2
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

        <div className="pg-total"><span>Total a pagar</span><b className="num">{brl(total)}</b></div>

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
    try { await excluirDespesa(despesa.id); toast('Pagamento excluído'); onSalvo?.(); onFechar() } catch { /* aviso já mostrado */ }
  }
  return (
    <Sheet titulo={`Pagamento de ${dataCurta(despesa.data)}`} onFechar={onFechar}>
      <div className="stack-y">
        {itens.length > 0 ? <div className="list">{itens.map(it => (
          <div key={it.id} className="row"><div className="grow"><span className={`chip ${TIPO_ITEM[it.tipo].cls}`}>{TIPO_ITEM[it.tipo].txt}</span><p className="t" style={{ marginTop: 4 }}>{it.descricao}</p></div>
            <b className="num" style={{ color: it.tipo === 'abatimento' ? 'var(--danger)' : 'inherit' }}>{it.tipo === 'abatimento' ? '− ' : ''}{brl(it.valor)}</b></div>))}</div>
          : <div className="list"><div className="row"><div className="grow"><p className="t">{despesa.descricao}</p></div><b className="num">{brl(despesa.valor)}</b></div></div>}
        <div className="pg-total"><span>Total pago</span><b className="num">{brl(despesa.valor)}</b></div>
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
