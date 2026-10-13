import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { X, Camera, Check, ChevronDown, Plus, Receipt, Wallet, Users, Hammer, Wrench, Package } from 'lucide-react'
import { supabase } from '../supabase'
import { useCasa } from '../lib/casa'
import { useToast } from './ui/Toast'
import { enviarFotos } from './Upload'
import { avisarMudanca } from '../hooks'
import { hoje, mascaraReais, exibirReais, numero, somarDias, INTERVALOS } from '../util'
import { SECOES, degrade, temaCategoria } from '../lib/sectionThemes'
import { pagarConta } from '../lib/contas'

// Tipos da folha de adição. modulo = só aparece se o módulo da casa estiver ligado
const TIPOS = [
  { k: 'gasto', nome: 'Gasto', Icon: Wallet, g: ['#0a5d93', '#2bb7dc'] },
  { k: 'conta', nome: 'Conta fixa', Icon: Receipt, g: ['#123c63', '#4c84b5'] },
  { k: 'pagamento', nome: 'Pagar pessoa', Icon: Users, g: SECOES.pessoas.g, modulo: 'pessoas' },
  { k: 'obra', nome: 'Obra', Icon: Hammer, g: SECOES.obras.g, modulo: 'obras' },
  { k: 'manutencao', nome: 'Manutenção', Icon: Wrench, g: SECOES.manutencoes.g, modulo: 'manutencoes' },
  { k: 'estoque', nome: 'Estoque', Icon: Package, g: SECOES.estoque.g, modulo: 'estoque' },
]

const Ctx = createContext({ abrir: () => {} })
export const useAdicionar = () => useContext(Ctx)

// abrir() sem argumentos mostra o passo 1; abrir({ tipo, categoria_id, pessoa_id, obra_id }) vai direto ao formulário
export function AdicionarProvider({ children }) {
  const [ctx, setCtx] = useState(null)
  const abrir = (c = {}) => setCtx({ ...c, _id: Date.now() })
  return (
    <Ctx.Provider value={{ abrir }}>
      {children}
      {ctx && <FolhaAdicionar key={ctx._id} inicial={ctx} onFechar={() => setCtx(null)} />}
    </Ctx.Provider>
  )
}

function FolhaAdicionar({ inicial, onFechar }) {
  const { casa } = useCasa()
  const toast = useToast()
  const mods = casa?.modulos || []
  const tipos = TIPOS.filter(t => !t.modulo || mods.includes(t.modulo))
  const [tipo, setTipo] = useState(inicial.tipo || null)
  const [cats, setCats] = useState([])
  const [pessoas, setPessoas] = useState([])
  const [obras, setObras] = useState([])
  const [f, setF] = useState({ valor: '', descricao: '', categoria_id: inicial.categoria_id || '', pessoa_id: inicial.pessoa_id || '', obra_id: inicial.obra_id || '', data: hoje(), vencimento: hoje(), paga: false, intervalo: 30, forma: 'Pix' })
  const [mais, setMais] = useState(false)
  const [fotos, setFotos] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const [visivel, setVisivel] = useState(false)
  const valorRef = useRef(null)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))

  useEffect(() => {
    requestAnimationFrame(() => setVisivel(true))
    const esc = (e) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('keydown', esc)
    const o = document.body.style.overflow; document.body.style.overflow = 'hidden'
    supabase.from('categorias').select('id,nome,cor,icone').eq('ativo', true).order('ordem').then(r => setCats(r.data || []))
    if (mods.includes('pessoas')) supabase.from('pessoas').select('id,nome,funcao,categoria_id,forma_pagamento').eq('ativo', true).order('nome').then(r => setPessoas(r.data || []))
    if (mods.includes('obras')) supabase.from('obras').select('id,nome,categoria_id,empreiteiro_id').in('status', ['orcamento_pendente', 'em_andamento', 'pausada']).then(r => setObras(r.data || []))
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = o }
  }, []) // eslint-disable-line
  useEffect(() => { if (tipo) setTimeout(() => (valorRef.current || document.querySelector('.ad-sheet [data-foco]'))?.focus(), 260) }, [tipo])

  const fechar = () => { setVisivel(false); setTimeout(onFechar, 200) }
  const t = TIPOS.find(x => x.k === tipo)
  const comValor = !['manutencao', 'estoque'].includes(tipo)
  const obraCtx = obras.find(o => o.id === f.obra_id)
  const novaObra = tipo === 'obra' && !f.obra_id
  const descObrig = ['manutencao', 'estoque'].includes(tipo) || novaObra

  const salvar = async (e) => {
    e?.preventDefault(); setErro(null)
    const valor = numero(f.valor)
    const desc = f.descricao.trim()
    if (comValor && !valor && !novaObra) return setErro('Informe o valor.')
    if (descObrig && !desc) return setErro(novaObra ? 'Dê um nome para a obra.' : 'Descreva o item.')
    if (tipo === 'pagamento' && !f.pessoa_id) return setErro('Escolha para quem é o pagamento.')
    setSalvando(true)
    try {
      const urls = fotos.length ? await enviarFotos(fotos, 'despesas') : []
      const cat = cats.find(c => c.id === f.categoria_id)
      if (tipo === 'gasto') {
        await supabase.from('despesas').insert({ tipo: 'variavel', categoria_id: f.categoria_id || null, descricao: desc || cat?.nome || 'Gasto', valor, data: f.data, forma_pagamento: f.forma, fotos: urls })
      } else if (tipo === 'conta') {
        const { data: conta } = await supabase.from('contas').insert({ tipo_conta: 'outro', categoria_id: f.categoria_id || null, descricao: desc || cat?.nome || 'Conta', valor, vencimento: f.vencimento, referencia: `${f.vencimento.slice(0, 7)}-01`, origem: 'manual', detalhes: {} }).select('*').single()
        if (f.paga) await pagarConta(conta, f.data, f.forma)
      } else if (tipo === 'pagamento') {
        const p = pessoas.find(x => x.id === f.pessoa_id)
        await supabase.from('despesas').insert({ tipo: 'pessoa', pessoa_id: p.id, categoria_id: p.categoria_id || null, descricao: desc || p.funcao || `Pagamento ${p.nome}`, valor, data: f.data, forma_pagamento: f.forma, fotos: urls })
      } else if (tipo === 'obra' && obraCtx) {
        await supabase.from('despesas').insert({ tipo: 'obra', obra_id: obraCtx.id, pessoa_id: obraCtx.empreiteiro_id || null, categoria_id: obraCtx.categoria_id || null, descricao: desc || `Pagamento ${obraCtx.nome}`, valor, data: f.data, forma_pagamento: f.forma, fotos: urls })
      } else if (tipo === 'obra') {
        await supabase.from('obras').insert({ nome: desc, status: valor ? 'em_andamento' : 'orcamento_pendente', orcamento_total: valor || null, data_inicio: f.data })
      } else if (tipo === 'manutencao') {
        await supabase.from('manutencoes').insert({ nome: desc, intervalo_dias: Number(f.intervalo), categoria_id: f.categoria_id || null, proxima: somarDias(hoje(), Number(f.intervalo)), ativo: true })
      } else if (tipo === 'estoque') {
        const [nome, resto] = desc.split(/,(.+)/)
        const q = numero((resto || '').match(/[\d.,]+/)?.[0]) || 0
        const unidade = (resto || '').replace(/[\d.,]+/, '').trim() || null
        await supabase.from('estoque_itens').insert({ nome: nome.trim(), quantidade: q, unidade, minimo: 1, categoria_id: f.categoria_id || null, ultima_compra: hoje(), ativo: true })
      }
      toast('Salvo'); avisarMudanca(); fechar()
    } catch (err) { setErro(err.message); setSalvando(false) }
  }

  const chipsCat = ['gasto', 'conta', 'manutencao', 'estoque'].includes(tipo)
  return (
    <>
      <div className={`ad-ov ${visivel ? 'on' : ''}`} onClick={fechar} />
      <div className={`ad-sheet ${visivel ? 'on' : ''}`} role="dialog" aria-label="Adicionar">
        <button className="ad-x" onClick={fechar} aria-label="Fechar"><X size={18} /></button>
        {!tipo ? (<>
          <h3>O que vamos registrar?</h3><p className="sub">Um toque e pronto.</p>
          <div className="ad-tipos">{tipos.map(x => (
            <button key={x.k} style={{ background: degrade(x.g) }} onClick={() => setTipo(x.k)}><x.Icon size={24} />{x.nome}</button>
          ))}</div>
        </>) : (
          <form onSubmit={salvar}>
            <h3><t.Icon size={20} style={{ verticalAlign: -3, marginRight: 6 }} />{tipo === 'obra' && obraCtx ? `Pagamento · ${obraCtx.nome}` : novaObra ? 'Nova obra' : t.nome}</h3>
            <p className="sub">{novaObra ? 'O valor é o orçamento total, se já tiver.' : 'Só o essencial. O resto é opcional.'}</p>
            {comValor && <input ref={valorRef} className="ad-valor num" inputMode="numeric" placeholder="R$ 0,00" value={exibirReais(f.valor)} onChange={e => set('valor', mascaraReais(e.target.value))} aria-label="Valor" />}
            <input className="ad-campo" data-foco={!comValor ? '1' : undefined} value={f.descricao} onChange={e => set('descricao', e.target.value)}
              placeholder={novaObra ? 'Nome da obra' : tipo === 'manutencao' ? 'O que precisa ser feito' : tipo === 'estoque' ? 'Item e quantidade. Ex: Cloro, 2 baldes' : 'Descrição (opcional)'} />

            {tipo === 'pagamento' && (<><div className="ad-lbl">Para quem</div>
              <div className="ad-chips">{pessoas.map(p => <button type="button" key={p.id} className={f.pessoa_id === p.id ? 'on' : ''} onClick={() => set('pessoa_id', p.id)}>{p.nome}</button>)}
                {!pessoas.length && <span className="muted">Nenhuma pessoa cadastrada.</span>}</div></>)}
            {tipo === 'obra' && obras.length > 0 && (<><div className="ad-lbl">Obra</div>
              <div className="ad-chips"><button type="button" className={!f.obra_id ? 'on' : ''} onClick={() => set('obra_id', '')}><Plus size={13} /> Nova obra</button>
                {obras.map(o => <button type="button" key={o.id} className={f.obra_id === o.id ? 'on' : ''} onClick={() => set('obra_id', o.id)}>{o.nome}</button>)}</div></>)}
            {chipsCat && (<><div className="ad-lbl">Categoria</div>
              <div className="ad-chips">{cats.map((c, i) => { const tc = temaCategoria(c, i); return <button type="button" key={c.id} className={f.categoria_id === c.id ? 'on' : ''} onClick={() => set('categoria_id', f.categoria_id === c.id ? '' : c.id)}><tc.Icon size={13} /> {c.nome}</button> })}</div></>)}
            {tipo === 'manutencao' && (<><div className="ad-lbl">Frequência</div>
              <div className="ad-chips">{INTERVALOS.slice(0, 6).map(([d, txt]) => <button type="button" key={d} className={Number(f.intervalo) === d ? 'on' : ''} onClick={() => set('intervalo', d)}>{txt}</button>)}</div></>)}

            {!['manutencao', 'estoque'].includes(tipo) && !novaObra && (<>
              <button type="button" className="ad-mais" onClick={() => setMais(m => !m)}>{mais ? '−' : '+'} {tipo === 'conta' ? 'Vencimento, já paga, foto' : 'Data, forma de pagamento, foto do comprovante'}<ChevronDown size={14} /></button>
              {mais && <div className="ad-extra">
                {tipo === 'conta' && <label className="ad-lbl">Vencimento<input className="ad-campo" type="date" value={f.vencimento} onChange={e => set('vencimento', e.target.value)} /></label>}
                {tipo === 'conta' && <label className="ad-check"><input type="checkbox" checked={f.paga} onChange={e => set('paga', e.target.checked)} /> Já está paga</label>}
                {(tipo !== 'conta' || f.paga) && <label className="ad-lbl">Data do pagamento<input className="ad-campo" type="date" value={f.data} onChange={e => set('data', e.target.value)} /></label>}
                <div className="ad-chips">{['Pix', 'Dinheiro', 'Cartão', 'Boleto', 'Débito automático'].map(x => <button type="button" key={x} className={f.forma === x ? 'on' : ''} onClick={() => set('forma', x)}>{x}</button>)}</div>
                {tipo !== 'conta' && <label className="ad-foto"><Camera size={16} />{fotos.length ? `${fotos.length} foto(s)` : 'Anexar foto do comprovante'}<input type="file" accept="image/*" multiple hidden onChange={e => setFotos([...e.target.files])} /></label>}
              </div>}
            </>)}

            {erro && <p className="ad-erro">{erro}</p>}
            <button className="ad-salvar" disabled={salvando}><Check size={18} />{salvando ? 'Salvando…' : 'Salvar'}</button>
            {!inicial.tipo && <button type="button" className="ad-voltar" onClick={() => { setTipo(null); setErro(null) }}>Trocar o tipo</button>}
          </form>
        )}
      </div>
    </>
  )
}
