import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { X, Check, Calendar, ChevronDown, Camera } from 'lucide-react'
import { catStyle } from '../lib/categoryStyle'
import { enviarFotos } from './Upload'
import { useToast } from './ui/Toast'
import { hoje } from '../util'

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
  const toast = useToast()
  const [cats, setCats] = useState([])
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
    return () => { document.body.style.overflow = '' }
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
        descricao: f.descricao, explicacao: f.explicacao || null, valor: Number(String(f.valor).replace(',', '.')),
        data: f.data, forma_pagamento: f.forma_pagamento, fotos: urls,
        consumo: f.consumo ? Number(String(f.consumo).replace(',', '.')) : null, unidade_consumo: f.consumo ? f.unidade_consumo : null,
      })
      if (error) throw error
      toast('Gasto registrado')
      onSalvo?.(); onFechar()
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  return (
    <div className="app" style={{ position: 'fixed', inset: 0, zIndex: 50, overflow: 'auto', paddingBottom: 100 }}>
      <div className="backbar"><button className="iconbtn" onClick={onFechar} aria-label="Fechar"><X size={22} className="i" /></button><div className="t">Registrar gasto</div><span style={{ width: 42 }} /></div>

      <div className="px mt24">
        <div className="step"><b>1</b>O que você está registrando?</div>
        <div className="kind">
          {TIPOS.map(([v, t, s, cls]) => { const { Icon } = catStyle({ cor: cls }); return (
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
        <label className="money"><span>R$</span><input inputMode="decimal" placeholder="0,00" aria-label="Valor" value={f.valor} onChange={e => set('valor', e.target.value)} /></label></div>

      {f.tipo === 'variavel' ? (
        <div className="px mt24"><div className="step"><b>3</b>Em qual categoria?</div>
          <div className="cats">{cats.map(c => { const { cls, Icon } = catStyle(c); return (
            <button key={c.id} type="button" className={`catopt ${cls} ${f.categoria_id === c.id ? 'on' : ''}`} onClick={() => set('categoria_id', c.id)}>
              <span className={`tile t-md ${cls}`}><Icon size={22} className="i" /></span><span>{c.nome}</span>
            </button>) })}</div></div>
      ) : (
        <div className="px mt24"><div className="step"><b>5</b>Categoria</div>
          <select className="input" value={f.categoria_id} onChange={e => set('categoria_id', e.target.value)}><option value="">Escolher categoria</option>{cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
      )}

      <div className="px mt24"><div className="step"><b>{f.tipo === 'variavel' ? '4' : '6'}</b>Quando?</div>
        <div className="chips">
          <button type="button" className={`pick ${f.quando === 'hoje' ? 'on' : ''}`} onClick={() => escolherQuando('hoje')}>Hoje</button>
          <button type="button" className={`pick ${f.quando === 'ontem' ? 'on' : ''}`} onClick={() => escolherQuando('ontem')}>Ontem</button>
          <label className={`pick ${f.quando === 'outra' ? 'on' : ''}`} style={{ position: 'relative' }}><Calendar size={17} className="i" />{f.quando === 'outra' ? f.data.split('-').reverse().join('/') : 'Outra data'}<input type="date" value={f.data} onChange={e => { set('data', e.target.value); set('quando', 'outra') }} style={{ position: 'absolute', inset: 0, opacity: 0 }} /></label>
        </div></div>

      <div className="px mt24"><div className="step"><b>{f.tipo === 'variavel' ? '5' : '7'}</b>O que foi?</div>
        <input className="input" placeholder="Ex.: troca do motor da bomba" value={f.descricao} onChange={e => set('descricao', e.target.value)} />
        <div className="chips mt8">{SUGESTOES.map(s => <button key={s} type="button" className="chip" onClick={() => set('descricao', s)}>{s}</button>)}</div></div>

      <div className="px mt24"><div className="step"><b>{f.tipo === 'variavel' ? '6' : '8'}</b>Como pagou?</div>
        <div className="hscroll" style={{ padding: '2px 0 4px' }}>{PAGAMENTOS.map(p => <button key={p} type="button" className={`pick ${f.forma_pagamento === p ? 'on' : ''}`} onClick={() => set('forma_pagamento', p)}>{p}</button>)}</div></div>

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
  )
}
