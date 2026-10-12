import { useEffect, useState } from 'react'
import { Trash2, Check } from 'lucide-react'
import { supabase } from '../supabase'
import { Sheet } from './ui/Sheet'
import { useToast } from './ui/Toast'
import { numero, brl, mascaraReais, exibirReais } from '../util'
import { excluirDespesa } from '../lib/crud'

const FORMAS = ['Pix', 'Dinheiro', 'Cartão', 'Débito automático', 'Boleto', 'Transferência']
const TIPOS = [['variavel', 'Conta'], ['pessoa', 'Pessoa'], ['obra', 'Obra'], ['material', 'Material']]

// Editar ou excluir qualquer gasto já registrado
export function FolhaEditarDespesa({ despesa: d, onFechar, onSalvo }) {
  const toast = useToast()
  const [cats, setCats] = useState([])
  const [pessoas, setPessoas] = useState([])
  const [obras, setObras] = useState([])
  const temItens = (d.pagamento_itens || []).length > 1 || (d.adiantamento && Number(d.descontado) > 0)
  const [f, setF] = useState({ descricao: d.descricao || '', valor: String(d.valor ?? '').replace('.', ','), data: d.data, categoria_id: d.categoria_id || '', pessoa_id: d.pessoa_id || '', obra_id: d.obra_id || '', tipo: d.tipo === 'fixo' ? 'variavel' : (d.tipo || 'variavel'), forma_pagamento: d.forma_pagamento || 'Pix', explicacao: d.explicacao || '' })
  const [salvando, setSalvando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  useEffect(() => {
    supabase.from('categorias').select('id,nome').eq('ativo', true).order('ordem').then(r => setCats(r.data || []))
    supabase.from('pessoas').select('id,nome').order('nome').then(r => setPessoas(r.data || []))
    supabase.from('obras').select('id,nome').order('criado_em', { ascending: false }).then(r => setObras(r.data || []))
  }, [])
  const salvar = async () => {
    const valor = numero(f.valor)
    if (!f.descricao.trim() || !valor || !f.data) return toast({ txt: 'Preencha descrição, valor e data.', erro: true })
    setSalvando(true)
    try {
      await supabase.from('despesas').update({ descricao: f.descricao.trim(), valor, data: f.data, categoria_id: f.categoria_id || null, pessoa_id: f.pessoa_id || null, obra_id: f.obra_id || null, tipo: f.tipo, forma_pagamento: f.forma_pagamento, explicacao: f.explicacao || null }).eq('id', d.id)
      await supabase.from('contas').update({ valor, pago_em: f.data }).eq('despesa_id', d.id)
      toast('Registro atualizado'); onSalvo?.(); onFechar()
    } catch { setSalvando(false) }
  }
  const excluir = async () => {
    if (!confirm(`Excluir "${d.descricao}" de ${brl(d.valor)}? Não dá para desfazer.`)) return
    try { await excluirDespesa(d.id); toast('Registro excluído'); onSalvo?.(); onFechar() } catch (e) { toast({ txt: e.message, erro: true }) }
  }
  return (
    <Sheet titulo="Editar registro" onFechar={onFechar}>
      <div className="stack-y">
        <label className="field"><span className="l">Descrição</span><input className="input" value={f.descricao} onChange={e => set('descricao', e.target.value)} /></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}><span className="l">Valor (R$)</span><input className="input" inputMode="numeric" value={exibirReais(f.valor)} onChange={e => set('valor', mascaraReais(e.target.value))} disabled={temItens} /></label>
          <label className="field" style={{ flex: 1 }}><span className="l">Data</span><input className="input" type="date" value={f.data} onChange={e => set('data', e.target.value)} /></label>
        </div>
        {temItens && <p className="muted">{d.adiantamento ? 'Este adiantamento já foi descontado em um pagamento, por isso o valor não pode mudar.' : 'Este pagamento tem itens (extras e abatimentos). Para mudar o valor, exclua e registre de novo na tela da pessoa.'}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}><span className="l">Tipo</span><select className="input" value={f.tipo} onChange={e => set('tipo', e.target.value)}>{TIPOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
          <label className="field" style={{ flex: 1 }}><span className="l">Categoria</span><select className="input" value={f.categoria_id} onChange={e => set('categoria_id', e.target.value)}><option value="">Nenhuma</option>{cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}><span className="l">Pessoa</span><select className="input" value={f.pessoa_id} onChange={e => set('pessoa_id', e.target.value)}><option value="">Nenhuma</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
          <label className="field" style={{ flex: 1 }}><span className="l">Obra</span><select className="input" value={f.obra_id} onChange={e => set('obra_id', e.target.value)}><option value="">Nenhuma</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></label>
        </div>
        <div className="field"><span className="l">Como pagou</span><div className="chips">{[...new Set([f.forma_pagamento, ...FORMAS])].map(p => <button key={p} type="button" className={`pick ${f.forma_pagamento === p ? 'on' : ''}`} onClick={() => set('forma_pagamento', p)}>{p}</button>)}</div></div>
        <label className="field"><span className="l">Anotações</span><textarea className="input" value={f.explicacao} onChange={e => set('explicacao', e.target.value)} /></label>
        {d.fotos?.length > 0 && <div className="photos">{d.fotos.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" /></a>)}</div>}
        <button className="btn primary block" onClick={salvar} disabled={salvando}><Check size={18} className="i" />{salvando ? 'Salvando…' : 'Salvar alterações'}</button>
        <button className="btn block" style={{ color: 'var(--danger)' }} onClick={excluir}><Trash2 size={16} className="i" />Excluir registro</button>
      </div>
    </Sheet>
  )
}
