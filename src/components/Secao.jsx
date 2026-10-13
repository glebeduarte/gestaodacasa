import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Plus, Check } from 'lucide-react'
import { arte } from '../lib/sectionArt'
import { degrade } from '../lib/sectionThemes'
import { useCapas } from '../lib/capas'
import { useCasa } from '../lib/casa'
import { useToast } from './ui/Toast'
import { mascaraReais, exibirReais, numero } from '../util'

// Topo de cada seção: cor da seção, imagem fundida ao degradê e conteúdo por cima
export function SectionHero({ chave, arteChave, g, Icon, titulo, subtitulo, valor, voltar, children }) {
  const nav = useNavigate()
  const { capas, enviar } = useCapas()
  const { podeEditar } = useCasa() || {}
  const toast = useToast()
  const inp = useRef(null)
  const [enviando, setEnviando] = useState(false)
  const img = capas[chave] || arte(arteChave || chave, g)
  const trocar = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setEnviando(true)
    try { await enviar(chave, f); toast('Imagem de topo atualizada') } catch (err) { toast({ txt: err.message, erro: true }) } finally { setEnviando(false) }
  }
  return (
    <section className="s-hero" style={{ background: g[0] }}>
      <div className="s-img" style={{ backgroundImage: `url("${img}")` }} />
      <div className="s-grad" style={{ background: `linear-gradient(100deg, ${g[0]} 0%, ${g[0]}e6 35%, ${g[1]}66 75%, ${g[1]}22 100%)` }} />
      {voltar && <button className="s-back" onClick={() => (typeof voltar === 'string' ? nav(voltar) : nav(-1))} aria-label="Voltar"><ArrowLeft size={18} /></button>}
      {podeEditar && (<>
        <button className="s-imgbtn" onClick={() => inp.current?.click()} disabled={enviando}><Camera size={13} />{enviando ? 'Enviando…' : capas[chave] ? 'Trocar' : 'Imagem de topo'}</button>
        <input ref={inp} type="file" accept="image/*" hidden onChange={trocar} />
      </>)}
      <div className="s-body">
        {Icon && <Icon size={30} className="s-ico" />}
        <h2>{titulo}</h2>
        {subtitulo && <p>{subtitulo}</p>}
        {valor !== undefined && valor !== null && <div className="s-big num">{valor}</div>}
        {children}
      </div>
    </section>
  )
}

// Card em degradê (áreas da casa e categorias), com "+" para lançar sem entrar
export function SectionTile({ chave, arteChave, g, Icon, nome, resumo, onAbrir, onMais }) {
  const { capas } = useCapas()
  const img = capas[chave] || arte(arteChave || chave, g)
  return (
    <div className="s-tile" style={{ background: degrade(g) }} onClick={onAbrir} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onAbrir?.()}>
      <div className="s-img" style={{ backgroundImage: `url("${img}")` }} />
      {onMais && <button className="s-plus" onClick={e => { e.stopPropagation(); onMais() }} aria-label={`Adicionar em ${nome}`}><Plus size={18} /></button>}
      {Icon && <Icon size={26} className="s-ico" />}
      <div><b>{nome}</b>{resumo !== undefined && <small>{resumo}</small>}</div>
    </div>
  )
}

// Barra de adição em linha: descrição + valor + Salvar (Enter salva)
export function QuickAdd({ placeholder, comValor = true, onSalvar, rotulo = 'Salvar' }) {
  const [d, setD] = useState('')
  const [v, setV] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [ok, setOk] = useState(false)
  const ref = useRef(null)
  const enviar = async (e) => {
    e.preventDefault()
    if (!d.trim() && !numero(v)) return
    setSalvando(true)
    try { await onSalvar(d.trim(), numero(v)); setD(''); setV(''); setOk(true); setTimeout(() => setOk(false), 1200); ref.current?.focus() }
    catch { /* aviso já mostrado */ } finally { setSalvando(false) }
  }
  return (
    <form className="qa" onSubmit={enviar}>
      <input ref={ref} value={d} onChange={e => setD(e.target.value)} placeholder={placeholder} aria-label="Descrição" />
      {comValor && <input className="val num" inputMode="numeric" value={exibirReais(v)} onChange={e => setV(mascaraReais(e.target.value))} placeholder="R$ 0,00" aria-label="Valor" />}
      <button disabled={salvando}>{ok ? <Check size={16} /> : salvando ? '…' : rotulo}</button>
    </form>
  )
}
