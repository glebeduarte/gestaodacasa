import { useState } from 'react'
import { supabase } from '../supabase'
import { useDados } from '../hooks'
import { brl, STATUS_OBRA, FREQ, UNIDADE } from '../util'
import { Folha } from '../components/Folha'
import { Ic } from '../components/Icones'
import { FolhaPessoa } from './Pessoas'
import { FolhaObra } from './Obras'

const ABAS = [['categorias', 'Categorias'], ['fixos', 'Custos fixos'], ['pessoas', 'Pessoas'], ['obras', 'Obras']]

export default function Admin() {
  const [aba, setAba] = useState('categorias')
  return (
    <div className="pilha">
      <div className="cabecalho"><div><div className="sobre">Configurações</div><h1>Admin</h1></div></div>
      <div className="opcoes">{ABAS.map(([v, l]) => <button key={v} className={aba === v ? 'marcado' : ''} onClick={() => setAba(v)}>{l}</button>)}</div>
      {aba === 'categorias' && <AdminCategorias />}
      {aba === 'fixos' && <AdminFixos />}
      {aba === 'pessoas' && <AdminPessoas />}
      {aba === 'obras' && <AdminObras />}
    </div>
  )
}

/* ---------- Categorias ---------- */
function AdminCategorias() {
  const { dados, recarregar } = useDados(async () => {
    const [cats, uso] = await Promise.all([
      supabase.from('categorias').select('*').order('ordem').then(r => r.data || []),
      supabase.from('despesas').select('categoria_id').then(r => r.data || []),
    ])
    const contagem = {}
    for (const d of uso) contagem[d.categoria_id] = (contagem[d.categoria_id] || 0) + 1
    return { cats, contagem }
  })
  const [editando, setEditando] = useState(null) // objeto ou 'nova'
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false)
  if (!dados) return <p className="carregando">Carregando…</p>

  const lista = dados.cats.filter(c => mostrarArquivadas ? !c.ativo : c.ativo)

  const mover = async (c, dir) => {
    const ativas = dados.cats.filter(x => x.ativo)
    const i = ativas.findIndex(x => x.id === c.id); const j = i + dir
    if (j < 0 || j >= ativas.length) return
    const outra = ativas[j]
    await Promise.all([
      supabase.from('categorias').update({ ordem: j + 1 }).eq('id', c.id),
      supabase.from('categorias').update({ ordem: i + 1 }).eq('id', outra.id),
    ])
    recarregar()
  }
  const arquivar = async (c, ativo) => { await supabase.from('categorias').update({ ativo }).eq('id', c.id); recarregar() }
  const apagar = async (c) => {
    if (dados.contagem[c.id]) return alert('Esta categoria tem despesas registradas. Arquive em vez de apagar.')
    if (!confirm(`Apagar a categoria "${c.nome}"?`)) return
    const { error } = await supabase.from('categorias').delete().eq('id', c.id)
    if (error) alert('Não foi possível apagar: há custos fixos, pessoas ou obras ligados a ela. Arquive em vez de apagar.')
    recarregar()
  }

  return (
    <>
      <div className="secao-titulo">
        <a className="link" href="#" onClick={e => { e.preventDefault(); setMostrarArquivadas(!mostrarArquivadas) }}>{mostrarArquivadas ? 'Ver ativas' : `Ver arquivadas (${dados.cats.filter(c => !c.ativo).length})`}</a>
        <button className="btn pequeno escuro" onClick={() => setEditando('nova')}><Ic n="mais" s={16} w={2.5} />Nova categoria</button>
      </div>
      <div className="cartao">
        {lista.length === 0 && <p className="nota">Nenhuma categoria aqui.</p>}
        {lista.map((c, i) => (
          <div key={c.id} className="linha-item" style={{ justifyContent: 'space-between' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{c.nome}</div>
              <div className="nota">{c.media_mensal ? `média ${brl(c.media_mensal)} · ` : ''}{dados.contagem[c.id] || 0} registro{(dados.contagem[c.id] || 0) !== 1 ? 's' : ''}{c.descricao ? ` · ${c.descricao}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {c.ativo && <>
                <button className="icone-btn" style={{ width: 36, height: 36 }} aria-label="Subir" onClick={() => mover(c, -1)} disabled={i === 0}>↑</button>
                <button className="icone-btn" style={{ width: 36, height: 36 }} aria-label="Descer" onClick={() => mover(c, 1)} disabled={i === lista.length - 1}>↓</button>
              </>}
              <button className="btn claro pequeno" onClick={() => setEditando(c)}>Editar</button>
            </div>
          </div>
        ))}
      </div>
      {editando && (
        <FolhaCategoria c={editando === 'nova' ? null : editando} total={dados.cats.length} onFechar={() => setEditando(null)} onSalvo={recarregar}
          onArquivar={editando !== 'nova' ? () => { arquivar(editando, !editando.ativo); setEditando(null) } : null}
          onApagar={editando !== 'nova' ? () => { apagar(editando); setEditando(null) } : null} />
      )}
    </>
  )
}

function FolhaCategoria({ c, total, onFechar, onSalvo, onArquivar, onApagar }) {
  const [f, setF] = useState({ nome: c?.nome || '', media_mensal: c?.media_mensal || '', descricao: c?.descricao || '' })
  const [erro, setErro] = useState(null)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.nome.trim()) return setErro('Dê um nome.')
    const reg = { nome: f.nome.trim(), media_mensal: f.media_mensal ? Number(String(f.media_mensal).replace(',', '.')) : null, descricao: f.descricao || null }
    const r = c ? await supabase.from('categorias').update(reg).eq('id', c.id) : await supabase.from('categorias').insert({ ...reg, ordem: total + 1 })
    if (r.error) return setErro(r.error.message)
    onSalvo(); onFechar()
  }
  return (
    <Folha titulo={c ? 'Editar categoria' : 'Nova categoria'} onFechar={onFechar}>
      <div className="form">
        <div className="campo"><label>Nome</label><input value={f.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex.: Gás, Manutenção elétrica" /></div>
        <div className="campo"><label>Média mensal esperada (R$)</label><input inputMode="decimal" value={f.media_mensal} onChange={e => set('media_mensal', e.target.value)} placeholder="Usada para avisar quando passar" /></div>
        <div className="campo"><label>O que entra aqui (opcional)</label><input value={f.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Ex.: conta de luz, lâmpadas, eletricista" /></div>
        {erro && <p className="erro">{erro}</p>}
        <button className="btn largo" onClick={salvar}>{c ? 'Salvar' : 'Criar categoria'}</button>
        {c && (
          <div className="acoes">
            <button className="btn claro" onClick={onArquivar}>{c.ativo ? 'Arquivar' : 'Reativar'}</button>
            <button className="btn claro" style={{ color: 'var(--acento-escuro)' }} onClick={onApagar}>Apagar</button>
          </div>
        )}
      </div>
    </Folha>
  )
}

/* ---------- Custos fixos ---------- */
function AdminFixos() {
  const { dados, recarregar } = useDados(async () => {
    const [fixos, cats, pessoas] = await Promise.all([
      supabase.from('custos_fixos').select('*, categorias(nome), pessoas(nome)').order('ativo', { ascending: false }).order('descricao').then(r => r.data || []),
      supabase.from('categorias').select('id,nome').eq('ativo', true).order('ordem').then(r => r.data || []),
      supabase.from('pessoas').select('id,nome,funcao').eq('ativo', true).order('nome').then(r => r.data || []),
    ])
    return { fixos, cats, pessoas }
  })
  const [editando, setEditando] = useState(null)
  if (!dados) return <p className="carregando">Carregando…</p>
  return (
    <>
      <div className="secao-titulo"><span className="nota">{dados.fixos.filter(f => f.ativo).length} ativos</span><button className="btn pequeno escuro" onClick={() => setEditando('novo')}><Ic n="mais" s={16} w={2.5} />Novo custo fixo</button></div>
      <div className="cartao">
        {dados.fixos.length === 0 && <p className="nota">Nenhum custo fixo cadastrado.</p>}
        {dados.fixos.map(f => (
          <div key={f.id} className="linha-item" style={{ justifyContent: 'space-between', opacity: f.ativo ? 1 : .5 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{f.pessoas?.nome ? `${f.pessoas.nome} · ` : ''}{f.descricao}{!f.ativo && <span className="chip chip-neutra" style={{ marginLeft: 8 }}>arquivado</span>}</div>
              <div className="nota">{f.categorias?.nome} · {brl(f.valor)} · {f.recorrencia}{f.dia_vencimento ? ` · dia ${f.dia_vencimento}` : ''}{f.debito_automatico ? ' · débito automático' : ''}</div>
            </div>
            <button className="btn claro pequeno" onClick={() => setEditando(f)}>Editar</button>
          </div>
        ))}
      </div>
      {editando && <FolhaFixoAdmin f={editando === 'novo' ? null : editando} cats={dados.cats} pessoas={dados.pessoas} onFechar={() => setEditando(null)} onSalvo={recarregar} />}
    </>
  )
}

function FolhaFixoAdmin({ f: orig, cats, pessoas, onFechar, onSalvo }) {
  const [f, setF] = useState({
    categoria_id: orig?.categoria_id || cats[0]?.id || '', descricao: orig?.descricao || '', valor: orig?.valor || '', dia_vencimento: orig?.dia_vencimento || '',
    recorrencia: orig?.recorrencia || 'mensal', pessoa_id: orig?.pessoa_id || '', debito_automatico: orig?.debito_automatico || false,
  })
  const [erro, setErro] = useState(null)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.descricao || !f.valor) return setErro('Descrição e valor são obrigatórios.')
    const reg = { categoria_id: f.categoria_id, descricao: f.descricao, valor: Number(String(f.valor).replace(',', '.')), dia_vencimento: f.dia_vencimento ? Number(f.dia_vencimento) : null, recorrencia: f.recorrencia, pessoa_id: f.pessoa_id || null, debito_automatico: f.debito_automatico }
    const r = orig ? await supabase.from('custos_fixos').update(reg).eq('id', orig.id) : await supabase.from('custos_fixos').insert(reg)
    if (r.error) return setErro(r.error.message)
    onSalvo(); onFechar()
  }
  const alternar = async () => { await supabase.from('custos_fixos').update({ ativo: !orig.ativo }).eq('id', orig.id); onSalvo(); onFechar() }
  const apagar = async () => {
    if (!confirm('Apagar este custo fixo? Os pagamentos já registrados continuam no histórico.')) return
    await supabase.from('despesas').update({ custo_fixo_id: null }).eq('custo_fixo_id', orig.id)
    await supabase.from('custos_fixos').delete().eq('id', orig.id); onSalvo(); onFechar()
  }
  return (
    <Folha titulo={orig ? 'Editar custo fixo' : 'Novo custo fixo'} onFechar={onFechar}>
      <div className="form">
        <div className="campo"><label>Categoria</label><select value={f.categoria_id} onChange={e => set('categoria_id', e.target.value)}>{cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
        <div className="campo"><label>Descrição</label><input value={f.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Ex.: conta de luz, limpeza semanal" /></div>
        <div className="campo-linha">
          <div className="campo"><label>Valor (R$)</label><input inputMode="decimal" value={f.valor} onChange={e => set('valor', e.target.value)} /></div>
          <div className="campo"><label>Dia do vencimento</label><input inputMode="numeric" value={f.dia_vencimento} onChange={e => set('dia_vencimento', e.target.value)} placeholder="1 a 31" /></div>
        </div>
        <div className="campo"><label>Recorrência</label><div className="opcoes">{['semanal', 'quinzenal', 'mensal', 'anual'].map(v => <button key={v} type="button" className={f.recorrencia === v ? 'marcado' : ''} onClick={() => set('recorrencia', v)}>{v}</button>)}</div></div>
        <div className="campo"><label>Pessoa (se for pagamento a alguém)</label><select value={f.pessoa_id} onChange={e => set('pessoa_id', e.target.value)}><option value="">Nenhuma</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome} · {p.funcao}</option>)}</select></div>
        <label className="check"><input type="checkbox" checked={f.debito_automatico} onChange={e => set('debito_automatico', e.target.checked)} />Débito automático</label>
        {erro && <p className="erro">{erro}</p>}
        <button className="btn largo" onClick={salvar}>{orig ? 'Salvar' : 'Criar custo fixo'}</button>
        {orig && <div className="acoes"><button className="btn claro" onClick={alternar}>{orig.ativo ? 'Arquivar' : 'Reativar'}</button><button className="btn claro" style={{ color: 'var(--acento-escuro)' }} onClick={apagar}>Apagar</button></div>}
      </div>
    </Folha>
  )
}

/* ---------- Pessoas ---------- */
function AdminPessoas() {
  const { dados, recarregar } = useDados(async () => {
    const [pessoas, cats] = await Promise.all([
      supabase.from('pessoas').select('*, categorias(nome)').order('ativo', { ascending: false }).order('nome').then(r => r.data || []),
      supabase.from('categorias').select('id,nome').eq('ativo', true).order('ordem').then(r => r.data || []),
    ])
    return { pessoas, cats }
  })
  const [editando, setEditando] = useState(null)
  if (!dados) return <p className="carregando">Carregando…</p>
  const alternar = async (p) => { await supabase.from('pessoas').update({ ativo: !p.ativo }).eq('id', p.id); recarregar() }
  return (
    <>
      <div className="secao-titulo"><span className="nota">{dados.pessoas.filter(p => p.ativo).length} ativas</span><button className="btn pequeno escuro" onClick={() => setEditando('nova')}><Ic n="mais" s={16} w={2.5} />Nova pessoa</button></div>
      <div className="cartao">
        {dados.pessoas.length === 0 && <p className="nota">Ninguém cadastrado ainda.</p>}
        {dados.pessoas.map(p => (
          <div key={p.id} className="linha-item" style={{ justifyContent: 'space-between', opacity: p.ativo ? 1 : .5 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{p.nome}{!p.ativo && <span className="chip chip-neutra" style={{ marginLeft: 8 }}>removida</span>}</div>
              <div className="nota">{p.funcao} · {FREQ[p.frequencia] || ''}{p.valor_combinado ? ` · ${brl(p.valor_combinado)}${UNIDADE[p.unidade_valor] || ''}` : ''}{p.categorias?.nome ? ` · ${p.categorias.nome}` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn claro pequeno" onClick={() => alternar(p)}>{p.ativo ? 'Remover' : 'Reativar'}</button>
              <button className="btn claro pequeno" onClick={() => setEditando(p)}>Editar</button>
            </div>
          </div>
        ))}
      </div>
      {editando && <FolhaPessoa pessoa={editando === 'nova' ? null : editando} categorias={dados.cats} onFechar={() => setEditando(null)} onSalvo={recarregar} />}
    </>
  )
}

/* ---------- Obras ---------- */
function AdminObras() {
  const { dados, recarregar } = useDados(async () => {
    const [obras, cats, pessoas] = await Promise.all([
      supabase.from('obras').select('*, pessoas(nome)').order('criado_em', { ascending: false }).then(r => r.data || []),
      supabase.from('categorias').select('id,nome').eq('ativo', true).order('ordem').then(r => r.data || []),
      supabase.from('pessoas').select('id,nome,funcao').eq('ativo', true).order('nome').then(r => r.data || []),
    ])
    return { obras, cats, pessoas }
  })
  const [editando, setEditando] = useState(null)
  if (!dados) return <p className="carregando">Carregando…</p>
  const apagar = async (o) => {
    if (!confirm(`Apagar a obra "${o.nome}"? A linha do tempo e o escopo serão apagados. Pagamentos ficam no histórico, sem vínculo com a obra.`)) return
    await supabase.from('despesas').update({ obra_id: null }).eq('obra_id', o.id)
    const { error } = await supabase.from('obras').delete().eq('id', o.id)
    if (error) alert(error.message); recarregar()
  }
  return (
    <>
      <div className="secao-titulo"><span className="nota">{dados.obras.length} obras</span><button className="btn pequeno escuro" onClick={() => setEditando('nova')}><Ic n="mais" s={16} w={2.5} />Nova obra</button></div>
      <div className="cartao">
        {dados.obras.length === 0 && <p className="nota">Nenhuma obra cadastrada.</p>}
        {dados.obras.map(o => (
          <div key={o.id} className="linha-item" style={{ justifyContent: 'space-between' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{o.nome} <span className={`chip ${STATUS_OBRA[o.status].cls}`} style={{ marginLeft: 6 }}>{STATUS_OBRA[o.status].label}</span></div>
              <div className="nota">{o.area_casa ? `${o.area_casa} · ` : ''}{o.pessoas?.nome ? `${o.pessoas.nome} · ` : ''}{o.orcamento_total ? brl(o.orcamento_total) : 'sem orçamento'}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn claro pequeno" style={{ color: 'var(--acento-escuro)' }} onClick={() => apagar(o)}>Apagar</button>
              <button className="btn claro pequeno" onClick={() => setEditando(o)}>Editar</button>
            </div>
          </div>
        ))}
      </div>
      {editando && <FolhaObra obra={editando === 'nova' ? null : editando} categorias={dados.cats} pessoas={dados.pessoas} onFechar={() => setEditando(null)} onSalvo={recarregar} />}
    </>
  )
}
