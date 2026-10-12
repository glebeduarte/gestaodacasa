import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { X, Check, Calendar, ChevronDown, Camera, Plus } from 'lucide-react'
import { catStyle } from '../lib/categoryStyle'
import { enviarFotos } from './Upload'
import { useToast } from './ui/Toast'
import { hoje, numero, mascaraReais, exibirReais } from '../util'
import { useCasa } from '../lib/casa'

const TIPOS = [
  ['variavel', 'Conta da casa', 'Luz, água, piscina, jardim, internet', 'c-fech'],
  ['pessoa', 'Pagar pessoa', 'Diarista, piscineiro, jardineiro', 'c-pessoas'],
  ['material', 'Material de obra', 'Cimento, tinta, peças', 'c-estoque'],
  ['obra', 'Pagamento de obra', 'Parcela para o empreiteiro', 'c-obras'],
]
const SUGESTOES = ['Conta do mês', 'Conserto', 'Compra', 'Visita técnica']
const PAGAMENTOS = ['Pix', 'Dinheiro', 'Cartão', 'Débito automático', 'Boleto']
const ontem = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10)

export function FolhaDespesa({ onFechar, onSalvo, inicial = {} }) {
  const { casa } = useCasa() || {}
  const mods = casa?.modulos || []
  const tiposVisiveis = TIPOS.filter(([v]) => (v !== 'pessoa' || mods.includes('pessoas')) && ((v !== 'obra' && v !== 'material') || mods.includes('obras')))
  const toast = useToast()
  const [cats, setCats] = useState([])
  const [novaCat, setNovaCat] = useState(null)
  const [criandoCat, setCriandoCat] = useState(false)
  const criarCategoria = async () => {
    const nome = (novaCat || '').trim()
    if (!nome) return
    const existe = cats.find(c => c.nome.toLowerCase() === nome.toLowerCase())
    if (existe) { set('categoria_id', existe.id); setNovaCat(null); return }
    setCriandoCat(true)
    try {
      const { data } = await supabase.from('categorias').insert({ nome, ativo: true, ordem: cats.length + 1 }).select('*').single()
      setCats(x => [...x, data]); set('categoria_id', data.id); setNovaCat(null); toast(`Categoria ${nome} criada`)
    } catch { /* aviso já mostrado */ } finally { setCriandoCat(false) }
  }
  const [pessoas, setPessoas] = useState([])
  const [obras, setObras] = useState([])
  const [f, setF] = useState({
    tipo: 'variavel', categoria_id: '', pessoa_id: '', obra_id: '', descricao: '',
    valor: '', data: hoje(), quando: 'hoje', forma_pagamento: 'Pix', explicacao: '', consumo: '', unidade_consumo: 'kWh', ...inicial,
  })
  const [fotos, setFotos] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    supabase.from('categorias').select('*').eq('ativo', true).order('ordem').then(r => setCats(r.data || []))
    supabase.from('pessoas').select('id,nome,funcao,categoria_id').eq('ativo', true).order('nome').then(r => setPessoas(r.data || []))
    supabase.from('obras').select('id,nome,categoria_id,empreiteiro_id').in('status', ['orcamento_pendente', 'em_andamento', 'pausada']).then(r => setObras(r.data || []))
    document.body.style.overflow = 'hidden'
    const esc = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', esc) }
  }, [])

  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const escolherPessoa = (id) => { const p = pessoas.find(x => x.id === id); set('pessoa_id', id); if (p?.categoria_id) set('categoria_id', p.categoria_id) }
  const escolherObra = (id) => { const o = obras.find(x => x.id === id); set('obra_id', id); if (o?.categoria_id) set('categoria_id', o.categoria_id); if (o?.empreiteiro_id && !f.pessoa_id) set('pessoa_id', o.empreiteiro_id) }
  const escolherQuando = (q) => { set('quando', q); if (q === 'hoje') set('data', hoje()); if (q === 'ontem') set('data', ontem()) }

  const salvar = async () => {
    setErro(null)
    if (!f.categoria_id) return setErro('Escolha a categoria.')
    if (!f.valor) return setErro('Informe o valor.')
    if (!f.descricao) return setErro('Diga em poucas palavras o que foi.')
    setSalvando(true)
    try {
      const urls = fotos.length ? await enviarFotos(fotos, 'despesas') : []
      const { error } = await supabase.from('despesas').insert({
        tipo: f.tipo, categoria_id: f.categoria_id, pessoa_id: f.pessoa_id || null, obra_id: f.obra_id || null, custo_fixo_id: f.custo_fixo_id || null,
        descricao: f.descricao, explicacao: f.explicacao || null, valor: numero(f.valor),
        data: f.data, forma_pagamento: f.forma_pagamento, fotos: urls,
        consumo: f.consumo ? numero(f.consumo) : null, unidade_consumo: f.consumo ? f.unidade_consumo : null,
      })
      if (error) throw error
      toast('Gasto registrado')
      onSalvo?.(); onFechar()
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  return (
    <>
      <div className="folha-bg" onClick={onFechar} />
      <div className="folha-full" role="dialog" aria-label="Registrar gasto">
        <div className="backbar"><button className="iconbtn" onClick={onFechar} aria-label="Fechar"><X size={22} className="i" /></button><div className="t">Registrar gasto</div><span style={{ width: 42 }} /></div>

        <div className="px mt24">
          <div className="step"><b>1</b>O que você está registrando?</div>
          <div className="kind">
            {tiposVisiveis.map(([v, t, s, cls]) => { const { Icon } = catStyle({ cor: cls }); return (
              <button key={v} type="button" className={`opt ${f.tipo === v ? 'on' : ''}`} onClick={() => set('tipo', v)}>
                <span className={`tile t-md ${cls}`}><Icon size={22} className="i" /></span>
                <div><b>{t}</b><small>{s}</small></div>
              </button>
            ) })}
          </div>
        </div>

        {(f.tipo === 'obra' || f.tipo === 'material') && (
          <div className="px mt24"><div className="step"><b>2</b>Qual obra?</div>
            <select className="input" value={f.obra_id} onChange={e => escolherObra(e.target.value)}><option value="">Escolher obra</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></div>
        )}
        {(f.tipo === 'pessoa' || f.tipo === 'obra') && (
          <div className="px mt24"><div className="step"><b>{f.tipo === 'obra' ? '3' : '2'}</b>Para quem?</div>
            <select className="input" value={f.pessoa_id} onChange={e => escolherPessoa(e.target.value)}><option value="">Escolher pessoa</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome} · {p.funcao}</option>)}</select></div>
        )}

        <div className="px mt24"><div className="step"><b>{f.tipo === 'variavel' ? '2' : '4'}</b>Quanto foi?</div>
          <label className="money"><span>R$</span><input inputMode="numeric" placeholder="0,00" aria-label="Valor" value={exibirReais(f.valor, false)} onChange={e => set('valor', mascaraReais(e.target.value, false))} /></label></div>

        {f.tipo === 'variavel' ? (
          <div className="px mt24"><div className="step"><b>3</b>Em qual categoria?</div>
            <div className="cats">{cats.map(c => { const { cls, Icon } = catStyle(c); return (
              <button key={c.id} type="button" className={`catopt ${cls} ${f.categoria_id === c.id ? 'on' : ''}`} onClick={() => set('categoria_id', c.id)}>
                <span className={`tile t-md ${cls}`}><Icon size={22} className="i" /></span><span>{c.nome}</span>
              </button>) })}
              <button type="button" className="catopt c-neutral nova" onClick={() => setNovaCat('')}>
                <span className="tile t-md c-neutral"><Plus size={22} className="i" /></span><span>Nova</span>
              </button></div>
            {novaCat !== null && <NovaCategoria valor={novaCat} setValor={setNovaCat} criar={criarCategoria} ocupado={criandoCat} />}</div>
        ) : (
          <div className="px mt24"><div className="step"><b>5</b>Categoria</div>
            <select className="input" value={f.categoria_id} onChange={e => e.target.value === '__nova' ? setNovaCat('') : set('categoria_id', e.target.value)}><option value="">Escolher categoria</option>{cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}<option value="__nova">+ Criar nova categoria</option></select>
            {novaCat !== null && <NovaCategoria valor={novaCat} setValor={setNovaCat} criar={criarCategoria} ocupado={criandoCat} />}</div>
        )}

        <div className="px mt24"><div className="step"><b>{f.tipo === 'variavel' ? '4' : '6'}</b>Quando?</div>
          <div className="chips">
            <button type="button" className={`pick ${f.quando === 'hoje' ? 'on' : ''}`} onClick={() => escolherQuando('hoje')}>Hoje</button>
            <button type="button" className={`pick ${f.quando === 'ontem' ? 'on' : ''}`} onClick={() => escolherQuando('ontem')}>Ontem</button>
            <button type="button" className={`pick ${f.quando === 'outra' ? 'on' : ''}`} onClick={() => { set('quando', 'outra'); setTimeout(() => { const el = document.getElementById('data-outra'); try { el?.showPicker?.() } catch { el?.focus() } }, 50) }}><Calendar size={17} className="i" />{f.quando === 'outra' && f.data ? f.data.split('-').reverse().join('/') : 'Outra data'}</button>
          </div>
          {f.quando === 'outra' && <input id="data-outra" className="input mt8" type="date" value={f.data} max="2100-12-31" onChange={e => set('data', e.target.value)} />}</div>

        <div className="px mt24"><div className="step"><b>{f.tipo === 'variavel' ? '5' : '7'}</b>O que foi?</div>
          <input className="input" placeholder="Ex.: troca do motor da bomba" value={f.descricao} onChange={e => set('descricao', e.target.value)} />
          <div className="chips mt8">{SUGESTOES.map(s => <button key={s} type="button" className="chip" onClick={() => set('descricao', s)}>{s}</button>)}</div></div>

        <div className="px mt24"><div className="step"><b>{f.tipo === 'variavel' ? '6' : '8'}</b>Como pagou?</div>
          <div className="chips">{PAGAMENTOS.map(p => <button key={p} type="button" className={`pick ${f.forma_pagamento === p ? 'on' : ''}`} onClick={() => set('forma_pagamento', p)}>{p}</button>)}</div></div>

        <div className="px mt24">
          <label className="upload">
            <span className="tile t-md c-docs"><Camera size={22} className="i" /></span>
            <div><b style={{ color: 'var(--ink)', fontSize: 14.5 }}>{fotos.length ? `${fotos.length} foto${fotos.length > 1 ? 's' : ''} escolhida${fotos.length > 1 ? 's' : ''}` : 'Foto do comprovante'}</b><p className="muted">Tire uma foto ou escolha da galeria</p></div>
            <input type="file" accept="image/*" capture="environment" multiple hidden onChange={e => setFotos([...e.target.files])} />
          </label>
        </div>

        <div className="px mt16">
          <details className="more">
            <summary>Mais detalhes (opcional)<ChevronDown size={20} className="i chev-i" /></summary>
            <div className="inner stack-y">
              {f.tipo === 'variavel' && (
                <label className="field"><span className="l">Consumo da conta</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input" inputMode="decimal" placeholder="Ex.: 420" style={{ flex: 1 }} value={f.consumo} onChange={e => set('consumo', e.target.value)} />
                    <div className="seg" style={{ width: 170 }}>{['kWh', 'm³', 'kg'].map(u => <button key={u} type="button" className={f.unidade_consumo === u ? 'on' : ''} onClick={() => set('unidade_consumo', u)}>{u}</button>)}</div>
                  </div></label>
              )}
              <label className="field"><span className="l">Anotações para lembrar depois</span><textarea className="input" placeholder="Por que, quem fez, o que ficou combinado" value={f.explicacao} onChange={e => set('explicacao', e.target.value)} /></label>
            </div>
          </details>
        </div>

        {erro && <p className="px mt16" style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 13.5 }}>{erro}</p>}
        <div style={{ height: 30 }} />
        <div className="sticky-foot"><button className="btn primary block" onClick={salvar} disabled={salvando}><Check size={20} strokeWidth={2.4} className="i" /> {salvando ? 'Salvando…' : 'Salvar gasto'}</button></div>
      </div>
    </>
  )
}

function NovaCategoria({ valor, setValor, criar, ocupado }) {
  return (
    <div className="nova-cat">
      <input className="input" autoFocus placeholder="Nome da nova categoria" value={valor} onChange={e => setValor(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); criar() } if (e.key === 'Escape') setValor(null) }} />
      <button type="button" className="btn sm primary" onClick={criar} disabled={ocupado || !valor.trim()}><Check size={15} className="i" />{ocupado ? 'Criando…' : 'Criar'}</button>
      <button type="button" className="iconbtn" onClick={() => setValor(null)} aria-label="Cancelar"><X size={16} className="i" /></button>
    </div>
  )
}
