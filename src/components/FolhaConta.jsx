import { useEffect, useState } from 'react'
import { Camera, FileUp, PencilLine, Sparkles, Check, Copy, FileText, Trash2, Pencil, Undo2, TriangleAlert } from 'lucide-react'
import { supabase } from '../supabase'
import { Sheet } from './ui/Sheet'
import { useToast } from './ui/Toast'
import { CatTile } from '../lib/categoryStyle'
import { brl, hoje, dataCurta, mascaraReais, exibirReais } from '../util'
import { TIPOS_CONTA, STATUS_CONTA, statusConta, prazoTexto, catPorTipo, catPorNome, lerContaIA, guardarArquivo, pagarConta, desfazerPagamento } from '../lib/contas'
import { abrirDocumento } from '../pages/Documentos'

const FORMAS = ['Pix', 'Boleto', 'Débito automático', 'Cartão', 'Dinheiro']
const num = (v) => { const s = String(v ?? '').trim(); if (!s) return null; const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s); return isNaN(n) ? null : n }
const mesRef = (v) => v ? String(v).slice(0, 7) : ''

// Linha de conta usada no painel, na lista e na categoria
export function ContaLinha({ c, onAbrir, onPagar }) {
  const st = statusConta(c)
  return (
    <div className={`conta-row st-${st}`}>
      <button type="button" className="conta-main" onClick={() => onAbrir(c)}>
        <CatTile cat={c.categorias} size="md" />
        <div className="grow"><p className="t">{c.descricao}</p>
          <p className="s">{st === 'paga' ? `paga em ${dataCurta(c.pago_em)}` : `vence ${dataCurta(c.vencimento)} · ${prazoTexto(c)}`}</p></div>
        <b className="num">{brl(c.valor)}</b>
      </button>
      {st !== 'paga' && onPagar
        ? <button type="button" className="conta-check" onClick={() => onPagar(c)} aria-label="Marcar como paga"><Check size={18} strokeWidth={2.6} className="i" /></button>
        : <span className={`conta-flag ${STATUS_CONTA[st].cls}`}>{STATUS_CONTA[st].txt}</span>}
    </div>
  )
}

// Confirmação rápida de pagamento (data ajustável)
export function FolhaPagarConta({ conta, onFechar, onSalvo }) {
  const toast = useToast()
  const [data, setData] = useState(hoje())
  const [forma, setForma] = useState(conta.forma_pagamento || 'Pix')
  const [salvando, setSalvando] = useState(false)
  const ok = async () => {
    setSalvando(true)
    try { await pagarConta(conta, data, forma); toast('Conta paga'); onSalvo?.(); onFechar() } catch (e) { toast(e.message); setSalvando(false) }
  }
  return (
    <Sheet titulo="Marcar como paga" onFechar={onFechar}>
      <div className="stack-y">
        <div className="pg-total"><span>{conta.descricao}</span><b className="num">{brl(conta.valor)}</b></div>
        <label className="field"><span className="l">Data do pagamento</span><input className="input" type="date" value={data} onChange={e => setData(e.target.value)} /></label>
        <div className="field"><span className="l">Como pagou</span><div className="chips">{FORMAS.map(p => <button key={p} type="button" className={`pick ${forma === p ? 'on' : ''}`} onClick={() => setForma(p)}>{p}</button>)}</div></div>
        <button className="btn primary block" onClick={ok} disabled={salvando}><Check size={18} className="i" />{salvando ? 'Salvando…' : 'Confirmar pagamento'}</button>
      </div>
    </Sheet>
  )
}

// Detalhe completo da conta
export function FolhaVerConta({ conta: c, onFechar, onSalvo, onEditar }) {
  const toast = useToast()
  const [pagar, setPagar] = useState(false)
  const st = statusConta(c)
  const tipo = TIPOS_CONTA[c.tipo_conta] || TIPOS_CONTA.outro
  const det = c.detalhes || {}
  const extras = [...tipo.campos.filter(([k]) => det[k] != null && det[k] !== '').map(([k, l]) => [l, det[k]]),
    ...Object.entries(det).filter(([k, v]) => !tipo.campos.some(([x]) => x === k) && v != null && v !== '' && typeof v !== 'object').map(([k, v]) => [k.replace(/_/g, ' '), v])]
  const copiar = (t) => { navigator.clipboard?.writeText(t); toast('Copiado') }
  const excluir = async () => {
    if (!confirm('Excluir esta conta?')) return
    if (c.despesa_id) await supabase.from('despesas').delete().eq('id', c.despesa_id)
    await supabase.from('contas').delete().eq('id', c.id); toast('Conta excluída'); onSalvo?.(); onFechar()
  }
  const desfazer = async () => { if (!confirm('Voltar esta conta para não paga? O gasto lançado no histórico será removido.')) return; await desfazerPagamento(c); toast('Pagamento desfeito'); onSalvo?.(); onFechar() }
  return (
    <Sheet titulo={tipo.nome === 'Outra' ? 'Conta' : `Conta de ${tipo.nome.toLowerCase()}`} onFechar={onFechar}>
      <div className="stack-y">
        <div className={`conta-hero st-${st}`}>
          <span className={`chip ${STATUS_CONTA[st].cls}`}>{st === 'atrasada' && <TriangleAlert size={13} className="i" />}{STATUS_CONTA[st].txt}</span>
          <p className="v num">{brl(c.valor)}</p>
          <p className="d">{c.descricao}{c.fornecedor ? ` · ${c.fornecedor}` : ''}</p>
          <p className="d">{st === 'paga' ? `Paga em ${dataCurta(c.pago_em)}${c.forma_pagamento ? ` · ${c.forma_pagamento}` : ''}` : `Vence ${dataCurta(c.vencimento)} · ${prazoTexto(c)}`}</p>
        </div>
        <div className="list">
          {c.categorias && <div className="row"><div className="grow"><p className="s" style={{ marginTop: 0 }}>Categoria</p></div><b>{c.categorias.nome}</b></div>}
          {c.referencia && <div className="row"><div className="grow"><p className="s" style={{ marginTop: 0 }}>Referência</p></div><b>{new Date(c.referencia + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</b></div>}
          <div className="row"><div className="grow"><p className="s" style={{ marginTop: 0 }}>Vencimento</p></div><b>{c.vencimento.split('-').reverse().join('/')}</b></div>
          {extras.map(([l, v]) => <div key={l} className="row"><div className="grow"><p className="s" style={{ marginTop: 0, textTransform: 'capitalize' }}>{l}</p></div><b>{String(v)}</b></div>)}
        </div>
        {c.codigo_barras && !c.pago_em && <button className="btn block" onClick={() => copiar(c.codigo_barras)}><Copy size={16} className="i" />Copiar código de barras</button>}
        {c.pix_copia_cola && !c.pago_em && <button className="btn block" onClick={() => copiar(c.pix_copia_cola)}><Copy size={16} className="i" />Copiar Pix copia e cola</button>}
        {c.arquivo_url && <button className="btn block" onClick={() => abrirDocumento(c.arquivo_url)}><FileText size={16} className="i" />Ver a conta original</button>}
        {c.observacoes && <div className="tip"><p className="s" style={{ marginTop: 0 }}>{c.observacoes}</p></div>}
        {st !== 'paga'
          ? <button className="btn primary block" onClick={() => setPagar(true)}><Check size={18} className="i" />Marcar como paga</button>
          : <button className="btn block" onClick={desfazer}><Undo2 size={16} className="i" />Desfazer pagamento</button>}
        <div className="btnrow">
          <button className="btn" style={{ flex: 1 }} onClick={() => onEditar(c)}><Pencil size={16} className="i" />Editar</button>
          <button className="btn" style={{ flex: 1, color: 'var(--danger)' }} onClick={excluir}><Trash2 size={16} className="i" />Excluir</button>
        </div>
      </div>
      {pagar && <FolhaPagarConta conta={c} onFechar={() => setPagar(false)} onSalvo={() => { onSalvo?.(); onFechar() }} />}
    </Sheet>
  )
}

// Inserir ou editar conta: por arquivo (leitura com IA) ou manual
export function FolhaConta({ inicial, onFechar, onSalvo }) {
  const toast = useToast()
  const editando = !!inicial?.id
  const [modo, setModo] = useState(editando ? 'form' : 'escolher')
  const [cats, setCats] = useState([])
  const [arquivo, setArquivo] = useState(null)
  const [lendo, setLendo] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [novaCat, setNovaCat] = useState(null)
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [f, setF] = useState(() => ({
    tipo_conta: 'outro', categoria_id: '', fornecedor: '', descricao: '', valor: '', vencimento: '', referencia: mesRef(hoje()),
    codigo_barras: '', pix_copia_cola: '', observacoes: '', forma_pagamento: 'Pix', detalhes: {}, ja_paga: false, pago_em: hoje(), origem: 'manual',
    ...(inicial ? Object.fromEntries(Object.entries(inicial).filter(([k]) => k !== 'categorias').map(([k, v]) => [k, v ?? ''])) : {}),
    ...(inicial?.referencia ? { referencia: mesRef(inicial.referencia) } : {}),
    ...(inicial?.valor != null ? { valor: String(inicial.valor).replace('.', ',') } : {}),
    detalhes: inicial?.detalhes || {},
  }))
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const setDet = (k, v) => setF(x => ({ ...x, detalhes: { ...x.detalhes, [k]: v } }))

  useEffect(() => { supabase.from('categorias').select('id,nome,cor,icone').eq('ativo', true).order('ordem').then(r => setCats(r.data || [])) }, [])

  const escolherTipo = (t) => setF(x => ({ ...x, tipo_conta: t, categoria_id: x.categoria_id || catPorTipo(t, cats)?.id || '' }))

  const ler = async (file) => {
    if (!file) return
    setArquivo(file); setLendo(true); setErro(null); setAviso(null)
    try {
      const d = await lerContaIA(file, cats)
      const tipo = TIPOS_CONTA[d.tipo_conta] ? d.tipo_conta : 'outro'
      const cat = catPorNome(d.categoria_sugerida, cats) || catPorTipo(tipo, cats)
      const ano = (d.vencimento || '').slice(0, 4)
      setF(x => ({
        ...x, origem: 'ia', tipo_conta: tipo, categoria_id: cat?.id || '', fornecedor: d.fornecedor || '',
        descricao: d.descricao || (d.fornecedor ? `${TIPOS_CONTA[tipo].nome} ${d.fornecedor}` : ''),
        valor: d.valor != null ? String(d.valor).replace('.', ',') : '', vencimento: d.vencimento || '',
        referencia: d.referencia || (d.vencimento ? d.vencimento.slice(0, 7) : x.referencia),
        codigo_barras: d.codigo_barras || '', pix_copia_cola: d.pix_copia_cola || '',
        detalhes: Object.fromEntries(Object.entries(d.detalhes || {}).filter(([, v]) => v != null && v !== '')),
      }))
      if (!cat && d.nova_categoria) setNovaCat(d.nova_categoria)
      const avisos = []
      if (d.confianca === 'baixa') avisos.push('A leitura ficou com baixa confiança.')
      if (!d.valor || !d.vencimento) avisos.push('Não achei valor ou vencimento.')
      if (ano && Math.abs(Number(ano) - new Date().getFullYear()) > 1) avisos.push(`O ano do vencimento (${ano}) parece estranho.`)
      setAviso(avisos.length ? `${avisos.join(' ')} Confira os campos.` : 'Leitura concluída. Confira os dados antes de salvar.')
      setModo('form')
    } catch (e) {
      setErro(e.message); setModo('form')
    } finally { setLendo(false) }
  }

  const criarCategoria = async () => {
    const { data, error } = await supabase.from('categorias').insert({ nome: novaCat, ativo: true, ordem: cats.length + 1 }).select('id,nome,cor,icone').single()
    if (error) return setErro(error.message)
    setCats(x => [...x, data]); set('categoria_id', data.id); setNovaCat(null); toast(`Categoria ${data.nome} criada`)
  }

  const salvar = async () => {
    setErro(null)
    const valor = num(f.valor)
    if (!f.descricao.trim()) return setErro('Dê um nome para a conta.')
    if (!valor) return setErro('Informe o valor.')
    if (!f.vencimento) return setErro('Informe a data de vencimento.')
    if (!f.categoria_id) return setErro('Escolha a categoria.')
    setSalvando(true)
    try {
      const arquivo_url = arquivo ? await guardarArquivo(arquivo) : (f.arquivo_url || null)
      const detalhes = Object.fromEntries(Object.entries(f.detalhes).filter(([, v]) => v !== '' && v != null).map(([k, v]) => {
        const campo = TIPOS_CONTA[f.tipo_conta]?.campos.find(([c]) => c === k)
        return [k, campo?.[2] === 'num' ? (num(v) ?? v) : v]
      }))
      const payload = {
        tipo_conta: f.tipo_conta, categoria_id: f.categoria_id, fornecedor: f.fornecedor || null, descricao: f.descricao.trim(), valor,
        vencimento: f.vencimento, referencia: f.referencia ? `${f.referencia}-01` : null, codigo_barras: f.codigo_barras || null,
        pix_copia_cola: f.pix_copia_cola || null, observacoes: f.observacoes || null, forma_pagamento: f.forma_pagamento || null,
        detalhes, arquivo_url, origem: f.origem || 'manual',
      }
      let id = f.id
      if (id) {
        const { error } = await supabase.from('contas').update(payload).eq('id', id); if (error) throw error
        if (f.despesa_id) await supabase.from('despesas').update({ valor, descricao: payload.descricao, categoria_id: payload.categoria_id }).eq('id', f.despesa_id)
      } else {
        const { data, error } = await supabase.from('contas').insert(payload).select('*').single(); if (error) throw error
        id = data.id
        if (f.ja_paga) await pagarConta(data, f.pago_em || hoje(), f.forma_pagamento)
      }
      toast(editando ? 'Conta atualizada' : 'Conta adicionada'); onSalvo?.(); onFechar()
    } catch (e) { setErro(e.message); setSalvando(false) }
  }

  const tipo = TIPOS_CONTA[f.tipo_conta] || TIPOS_CONTA.outro

  return (
    <Sheet titulo={editando ? 'Editar conta' : 'Nova conta'} onFechar={onFechar}>
      {modo === 'escolher' && (
        <div className="stack-y">
          {lendo ? (
            <div className="ia-lendo"><Sparkles size={28} className="i" /><b>Lendo a conta…</b><p className="muted">Identificando valor, vencimento, categoria e os dados do consumo.</p></div>
          ) : (<>
            <label className="upload">
              <span className="tile t-md c-docs"><Camera size={22} className="i" /></span>
              <div><b style={{ color: 'var(--ink)', fontSize: 14.5 }}>Tirar foto da conta</b><p className="muted">A IA lê e preenche tudo</p></div>
              <input type="file" accept="image/*" capture="environment" hidden onChange={e => ler(e.target.files[0])} />
            </label>
            <label className="upload">
              <span className="tile t-md c-fech"><FileUp size={22} className="i" /></span>
              <div><b style={{ color: 'var(--ink)', fontSize: 14.5 }}>Enviar arquivo ou PDF</b><p className="muted">Boleto, fatura ou print</p></div>
              <input type="file" accept="image/*,application/pdf" hidden onChange={e => ler(e.target.files[0])} />
            </label>
            <button type="button" className="upload" onClick={() => setModo('form')} style={{ textAlign: 'left', width: '100%' }}>
              <span className="tile t-md c-neutral"><PencilLine size={22} className="i" /></span>
              <div><b style={{ color: 'var(--ink)', fontSize: 14.5 }}>Preencher manualmente</b><p className="muted">Digitar os dados da conta</p></div>
            </button>
          </>)}
        </div>
      )}

      {modo === 'form' && (
        <div className="stack-y">
          {aviso && <div className="tip ia-ok"><Sparkles size={18} className="i" /><p className="s" style={{ marginTop: 0 }}>{aviso}</p></div>}
          {erro && !salvando && <p style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 13.5 }}>{erro}</p>}

          <div className="field"><span className="l">Tipo de conta</span>
            <div className="chips">{Object.entries(TIPOS_CONTA).map(([k, t]) => <button key={k} type="button" className={`pick ${f.tipo_conta === k ? 'on' : ''}`} onClick={() => escolherTipo(k)}>{t.nome}</button>)}</div></div>

          <label className="field"><span className="l">Categoria</span>
            <select className="input" value={f.categoria_id} onChange={e => set('categoria_id', e.target.value)}><option value="">Escolher categoria</option>{cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
          {novaCat && <div className="tip"><div style={{ flex: 1 }}><p className="s" style={{ marginTop: 0 }}>Nenhuma categoria parece servir. Criar <b>{novaCat}</b>?</p>
            <div className="btnrow mt8"><button type="button" className="btn sm dark" onClick={criarCategoria}>Criar categoria</button><button type="button" className="btn sm" onClick={() => setNovaCat(null)}>Não</button></div></div></div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <label className="field" style={{ flex: 1.3 }}><span className="l">Nome da conta</span><input className="input" value={f.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Ex.: Luz outubro" /></label>
            <label className="field" style={{ flex: 1 }}><span className="l">Fornecedor</span><input className="input" value={f.fornecedor} onChange={e => set('fornecedor', e.target.value)} placeholder="Cosern, CAERN…" /></label>
          </div>
          <label className="money"><span>R$</span><input inputMode="numeric" placeholder="0,00" aria-label="Valor" value={exibirReais(f.valor, false)} onChange={e => set('valor', mascaraReais(e.target.value, false))} /></label>
          <div style={{ display: 'flex', gap: 10 }}>
            <label className="field" style={{ flex: 1 }}><span className="l">Vencimento</span><input className="input" type="date" value={f.vencimento} onChange={e => set('vencimento', e.target.value)} /></label>
            <label className="field" style={{ flex: 1 }}><span className="l">Mês de referência</span><input className="input" type="month" value={f.referencia} onChange={e => set('referencia', e.target.value)} /></label>
          </div>

          {tipo.campos.length > 0 && (
            <div className="field"><span className="l">Dados da conta de {tipo.nome.toLowerCase()}</span>
              <div className="det-grid">{tipo.campos.map(([k, l, t]) => (
                <label key={k} className="field"><span className="l" style={{ fontSize: 11 }}>{l}</span><input className="input" inputMode={t === 'num' ? 'decimal' : 'text'} value={f.detalhes[k] ?? ''} onChange={e => setDet(k, e.target.value)} /></label>
              ))}</div></div>
          )}

          <details className="more">
            <summary>Código de barras, Pix e observações</summary>
            <div className="inner stack-y">
              <label className="field"><span className="l">Código de barras</span><input className="input" inputMode="numeric" value={f.codigo_barras} onChange={e => set('codigo_barras', e.target.value)} /></label>
              <label className="field"><span className="l">Pix copia e cola</span><input className="input" value={f.pix_copia_cola} onChange={e => set('pix_copia_cola', e.target.value)} /></label>
              <label className="field"><span className="l">Observações</span><textarea className="input" value={f.observacoes} onChange={e => set('observacoes', e.target.value)} /></label>
            </div>
          </details>

          {!editando && (
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}><input type="checkbox" checked={f.ja_paga} onChange={e => set('ja_paga', e.target.checked)} style={{ width: 20, height: 20 }} /><span style={{ fontSize: 14, fontWeight: 600 }}>Esta conta já foi paga</span></label>
              {f.ja_paga && <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <input className="input" type="date" value={f.pago_em} onChange={e => set('pago_em', e.target.value)} style={{ flex: 1 }} />
                <select className="input" value={f.forma_pagamento} onChange={e => set('forma_pagamento', e.target.value)} style={{ flex: 1 }}>{FORMAS.map(p => <option key={p}>{p}</option>)}</select>
              </div>}
            </div>
          )}

          {arquivo && <p className="muted"><FileText size={14} className="i" style={{ verticalAlign: -2 }} /> {arquivo.name} será guardado junto com a conta</p>}
          {!editando && !arquivo && <label className="btn sm" style={{ alignSelf: 'flex-start' }}><Sparkles size={15} className="i" />Ler de um arquivo<input type="file" accept="image/*,application/pdf" hidden onChange={e => { setModo('escolher'); ler(e.target.files[0]) }} /></label>}
          <button className="btn primary block" onClick={salvar} disabled={salvando}><Check size={18} className="i" />{salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Salvar conta'}</button>
        </div>
      )}
    </Sheet>
  )
}
