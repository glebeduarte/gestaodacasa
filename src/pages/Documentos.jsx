import { useState } from 'react'
import { Search, KeyRound, Landmark, ShieldCheck, PenLine, BookOpen, Receipt, File, Plus, TriangleAlert } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados } from '../hooks'
import { brl, dataCurta, diasEntre } from '../util'
import { BackBar } from '../components/ui/BackBar'
import { Sheet } from '../components/ui/Sheet'
import { useToast } from '../components/ui/Toast'

export const TIPOS_DOC = [
  ['Escritura', KeyRound], ['IPTU', Landmark], ['Seguro', ShieldCheck], ['Contrato', PenLine],
  ['Manual', BookOpen], ['Garantia', ShieldCheck], ['Nota fiscal', Receipt], ['Outro', File],
]
const ICONE_TIPO = Object.fromEntries(TIPOS_DOC)

// Abre documento privado com signed URL, ou público direto
export async function abrirDocumento(caminho) {
  if (!caminho) return
  if (caminho.startsWith('http')) { window.open(caminho, '_blank'); return }
  const { data } = await supabase.storage.from('documentos').createSignedUrl(caminho, 60 * 30)
  if (data?.signedUrl) window.open(data.signedUrl, '_blank')
}

export default function Documentos() {
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('')
  const [novo, setNovo] = useState(false)
  const { dados, recarregar } = useDados(async () => {
    const [docs, cats] = await Promise.all([
      supabase.from('documentos').select('*').order('nome').then(r => r.data || []),
      supabase.from('categorias').select('id,nome').eq('ativo', true).then(r => r.data || []),
    ])
    return { docs, cats }
  })
  if (!dados) return <p className="carregando">Carregando…</p>
  const { docs, cats } = dados

  const vencendo = docs.filter(d => d.validade && diasEntre(d.validade) >= 0 && diasEntre(d.validade) <= 30)
  let lista = docs
  if (tipo) lista = lista.filter(d => d.tipo === tipo)
  if (busca) lista = lista.filter(d => d.nome.toLowerCase().includes(busca.toLowerCase()))

  return (
    <>
      <BackBar titulo="Documentos" acao={<button className="iconbtn" onClick={() => setNovo(true)} aria-label="Novo"><Plus size={20} className="i" /></button>} />
      <header className="hdr" style={{ paddingTop: 12, paddingBottom: 8 }}><div><p className="eyebrow">Papelada da casa</p><h1>Documentos</h1></div></header>

      <div className="px">
        <label className="input" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Search size={18} className="i" style={{ color: 'var(--muted)' }} /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar documento" style={{ border: 0, outline: 0, flex: 1, background: 'transparent', height: 46 }} />
        </label>
      </div>

      <div className="hscroll mt12">
        <button className={`pick ${!tipo ? 'on' : ''}`} onClick={() => setTipo('')}>Todos</button>
        {TIPOS_DOC.map(([t, Icon]) => <button key={t} className={`pick ${tipo === t ? 'on' : ''}`} onClick={() => setTipo(t)}><Icon size={16} className="i" />{t}</button>)}
      </div>

      {vencendo.length > 0 && (
        <div className="px mt16"><div className="alert k-warn"><span className="tile t-md c-docs"><TriangleAlert size={22} className="i" /></span><div className="grow"><p className="t">{vencendo.length} documento{vencendo.length > 1 ? 's' : ''} vencendo</p><p className="s">Confira as validades nos próximos 30 dias</p></div></div></div>
      )}

      <section className="px mt16">
        {lista.length === 0
          ? <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhum documento aqui ainda. Toque em + para guardar escrituras, contratos, notas e garantias em um só lugar.</p></div>
          : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {lista.map(d => { const Icon = ICONE_TIPO[d.tipo] || File; const dias = d.validade ? diasEntre(d.validade) : null
              return (
                <button key={d.id} className="card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }} onClick={() => abrirDocumento(d.arquivo_url)}>
                  <span className="tile t-md c-docs"><Icon size={22} className="i" /></span>
                  <p style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.25 }}>{d.nome}</p>
                  <div style={{ marginTop: 'auto' }}>{d.validade
                    ? <span className={`chip ${dias < 0 ? 'danger' : dias <= 30 ? 'warn' : ''}`} style={{ height: 22, fontSize: 11 }}>{dias < 0 ? 'Vencido' : `vence ${dataCurta(d.validade)}`}</span>
                    : <span className="chip" style={{ height: 22, fontSize: 11 }}>{d.tipo || 'Documento'}</span>}</div>
                </button>
              ) })}
          </div>}
      </section>
      <div style={{ height: 12 }} />
      {novo && <FolhaDocumento cats={cats} onFechar={() => setNovo(false)} onSalvo={recarregar} />}
    </>
  )
}

function FolhaDocumento({ cats, onFechar, onSalvo }) {
  const toast = useToast()
  const [f, setF] = useState({ nome: '', tipo: 'Outro', categoria_id: '', validade: '', observacoes: '' })
  const [arquivo, setArquivo] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.nome) return
    setSalvando(true)
    try {
      let caminho = null
      if (arquivo) { const nome = `docs/${Date.now()}-${arquivo.name.replace(/[^a-zA-Z0-9.]/g, '_')}`; const { error } = await supabase.storage.from('documentos').upload(nome, arquivo); if (error) throw error; caminho = nome }
      await supabase.from('documentos').insert({ nome: f.nome, tipo: f.tipo, categoria_id: f.categoria_id || null, validade: f.validade || null, observacoes: f.observacoes || null, arquivo_url: caminho })
      toast('Documento guardado'); onSalvo(); onFechar()
    } catch (e) { alert(e.message) } finally { setSalvando(false) }
  }
  return (
    <Sheet titulo="Novo documento" onFechar={onFechar}>
      <div className="stack-y">
        <label className="field"><span className="l">Nome</span><input className="input" value={f.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex.: Escritura da casa" /></label>
        <div className="field"><span className="l">Tipo</span><div className="chips">{TIPOS_DOC.map(([t]) => <button key={t} type="button" className={`pick ${f.tipo === t ? 'on' : ''}`} onClick={() => set('tipo', t)}>{t}</button>)}</div></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}><span className="l">Categoria</span><select className="input" value={f.categoria_id} onChange={e => set('categoria_id', e.target.value)}><option value="">Nenhuma</option>{cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
          <label className="field" style={{ flex: 1 }}><span className="l">Validade</span><input className="input" type="date" value={f.validade} onChange={e => set('validade', e.target.value)} /></label>
        </div>
        <label className="upload"><span className="tile t-md c-docs"><File size={22} className="i" /></span><div><b style={{ color: 'var(--ink)', fontSize: 14.5 }}>{arquivo ? arquivo.name : 'Anexar arquivo'}</b><p className="muted">PDF ou foto</p></div><input type="file" accept="image/*,application/pdf" hidden onChange={e => setArquivo(e.target.files[0])} /></label>
        <label className="field"><span className="l">Observações</span><textarea className="input" value={f.observacoes} onChange={e => set('observacoes', e.target.value)} /></label>
        <button className="btn primary block" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Guardar documento'}</button>
      </div>
    </Sheet>
  )
}
