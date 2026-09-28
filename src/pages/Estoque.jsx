import { useState } from 'react'
import { Package, Plus, Send } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados } from '../hooks'
import { hoje } from '../util'
import { CatTile } from '../lib/categoryStyle'
import { BackBar } from '../components/ui/BackBar'
import { Sheet } from '../components/ui/Sheet'
import { useToast } from '../components/ui/Toast'

export default function Estoque() {
  const [novo, setNovo] = useState(false)
  const [cat, setCat] = useState('')
  const toast = useToast()
  const { dados, recarregar } = useDados(async () => {
    const [itens, cats] = await Promise.all([
      supabase.from('estoque_itens').select('*, categorias(*)').eq('ativo', true).order('nome').then(r => r.data || []),
      supabase.from('categorias').select('id,nome,cor,icone').eq('ativo', true).then(r => r.data || []),
    ])
    return { itens, cats }
  })
  if (!dados) return <p className="carregando">Carregando…</p>
  const { itens, cats } = dados

  const nivel = (i) => { const q = Number(i.quantidade), m = Number(i.minimo) || 0; if (q <= m) return { txt: 'Acabando', cls: 'danger' }; if (q <= m * 1.5) return { txt: 'No limite', cls: 'warn' }; return { txt: 'Tranquilo', cls: 'ok' } }
  const faltando = itens.filter(i => Number(i.quantidade) <= Number(i.minimo))
  const usadas = [...new Set(itens.map(i => i.categoria_id).filter(Boolean))].map(id => cats.find(c => c.id === id)).filter(Boolean)
  let lista = cat ? itens.filter(i => i.categoria_id === cat) : itens

  const ajustar = async (i, d) => {
    const novo = Math.max(0, Number(i.quantidade) + d)
    await supabase.from('estoque_itens').update({ quantidade: novo, ...(d > 0 ? { ultima_compra: hoje() } : {}) }).eq('id', i.id)
    recarregar()
  }
  const enviarLista = () => {
    const txt = '*Lista de compras da casa*\n\n' + faltando.map(i => `• ${i.nome} (tem ${Number(i.quantidade)}${i.unidade ? ' ' + i.unidade : ''}, mínimo ${Number(i.minimo)})`).join('\n')
    window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank')
  }

  return (
    <>
      <BackBar titulo="Estoque" acao={<button className="iconbtn" onClick={() => setNovo(true)} aria-label="Novo"><Plus size={20} className="i" /></button>} />
      <header className="hdr" style={{ paddingTop: 12, paddingBottom: 8 }}><div><p className="eyebrow">O que tem em casa</p><h1>Estoque</h1></div></header>

      {faltando.length > 0 && (
        <div className="px">
          <div className="card" style={{ background: 'linear-gradient(150deg,#0B3B66,#1B7FB9)', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><p className="eyebrow" style={{ color: '#9FE6F0' }}>Lista de compras</p><p style={{ fontFamily: 'var(--font-d)', fontSize: 22, fontWeight: 600, marginTop: 4 }}>{faltando.length} {faltando.length > 1 ? 'itens' : 'item'} para repor</p></div>
              <span className="tile t-md" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}><Package size={22} className="i" /></span>
            </div>
            <p className="hero-sub" style={{ marginTop: 8 }}>{faltando.map(i => i.nome).join(' · ')}</p>
            <button className="btn block mt16" style={{ background: '#fff', color: 'var(--aegean)' }} onClick={enviarLista}><Send size={18} className="i" />Enviar lista no WhatsApp</button>
          </div>
        </div>
      )}

      {usadas.length > 0 && (
        <div className="hscroll mt16">
          <button className={`pick ${!cat ? 'on' : ''}`} onClick={() => setCat('')}>Todos</button>
          {usadas.map(c => <button key={c.id} className={`pick ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>{c.nome}</button>)}
        </div>
      )}

      <section className="px mt16 stack-y">
        {lista.length === 0 && <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhum item no estoque. Cadastre cloro, ração, produtos de limpeza e o app avisa quando estiver acabando.</p></div>}
        {lista.map(i => { const n = nivel(i); const q = Number(i.quantidade), m = Number(i.minimo) || 1; const pct = Math.min(100, q / (m * 2) * 100)
          return (
            <div key={i.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {i.categorias ? <CatTile cat={i.categorias} size="md" /> : <span className="tile t-md c-estoque"><Package size={22} className="i" /></span>}
                <div className="grow" style={{ flex: 1, minWidth: 0 }}><p className="t" style={{ fontWeight: 700 }}>{i.nome}</p><p className="s">mínimo {Number(i.minimo)}{i.unidade ? ` ${i.unidade}` : ''}</p></div>
                <span className={`chip ${n.cls}`}>{n.txt}</span>
              </div>
              <div className="bar mt12"><i style={{ width: pct + '%', '--b': n.cls === 'danger' ? 'var(--danger)' : n.cls === 'warn' ? 'var(--warn)' : 'var(--ok)' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <span className="muted">em casa</span>
                <div className="stepper"><button onClick={() => ajustar(i, -1)}>−</button><b className="num">{q}{i.unidade ? ` ${i.unidade}` : ''}</b><button onClick={() => ajustar(i, 1)}>+</button></div>
              </div>
            </div>
          ) })}
      </section>
      <div style={{ height: 12 }} />
      {novo && <FolhaEstoque cats={cats} onFechar={() => setNovo(false)} onSalvo={recarregar} />}
    </>
  )
}

function FolhaEstoque({ cats, onFechar, onSalvo }) {
  const [f, setF] = useState({ nome: '', categoria_id: '', quantidade: '', unidade: '', minimo: '' })
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.nome) return
    await supabase.from('estoque_itens').insert({ nome: f.nome, categoria_id: f.categoria_id || null, quantidade: Number(f.quantidade) || 0, unidade: f.unidade || null, minimo: Number(f.minimo) || 0, ultima_compra: hoje(), ativo: true })
    onSalvo(); onFechar()
  }
  return (
    <Sheet titulo="Novo item de estoque" onFechar={onFechar}>
      <div className="stack-y">
        <label className="field"><span className="l">Item</span><input className="input" value={f.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex.: cloro, ração, sabão" /></label>
        <label className="field"><span className="l">Categoria</span><select className="input" value={f.categoria_id} onChange={e => set('categoria_id', e.target.value)}><option value="">Nenhuma</option>{cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}><span className="l">Tem agora</span><input className="input" inputMode="decimal" value={f.quantidade} onChange={e => set('quantidade', e.target.value)} /></label>
          <label className="field" style={{ flex: 1 }}><span className="l">Unidade</span><input className="input" value={f.unidade} onChange={e => set('unidade', e.target.value)} placeholder="baldes, kg, un" /></label>
          <label className="field" style={{ flex: 1 }}><span className="l">Mínimo</span><input className="input" inputMode="decimal" value={f.minimo} onChange={e => set('minimo', e.target.value)} /></label>
        </div>
        <button className="btn primary block" onClick={salvar}>Salvar item</button>
      </div>
    </Sheet>
  )
}
