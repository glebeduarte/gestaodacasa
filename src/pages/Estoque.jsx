import { useState } from 'react'
import { supabase } from '../supabase'
import { useDados, q } from '../hooks'
import { dataCurta, hoje } from '../util'
import { Folha } from '../components/Folha'
import { Ic } from '../components/Icones'

export default function Estoque() {
  const { dados, recarregar } = useDados(async () => {
    const [itens, cats] = await Promise.all([
      supabase.from('estoque_itens').select('*, categorias(nome)').eq('ativo', true).order('nome').then(r => r.data || []),
      q.categorias(),
    ])
    return { itens, cats }
  })
  const [editando, setEditando] = useState(null)
  if (!dados) return <p className="carregando">Carregando…</p>
  const baixo = dados.itens.filter(i => Number(i.quantidade) <= Number(i.minimo))
  const ok = dados.itens.filter(i => Number(i.quantidade) > Number(i.minimo))

  const ajustar = async (i, delta) => {
    const quantidade = Math.max(0, Number(i.quantidade) + delta)
    const reg = { quantidade }
    if (delta > 0) reg.ultima_compra = hoje()
    await supabase.from('estoque_itens').update(reg).eq('id', i.id); recarregar()
  }

  const Item = ({ i }) => (
    <div className="cartao">
      <div className="entre">
        <div style={{ minWidth: 0 }}>
          <span className="titulo-cartao">{i.nome}</span>
          <div className="nota">{i.categorias?.nome ? `${i.categorias.nome} · ` : ''}mínimo {Number(i.minimo)} {i.unidade}{i.ultima_compra ? ` · comprado ${dataCurta(i.ultima_compra)}` : ''}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button className="icone-btn" style={{ width: 40, height: 40 }} aria-label="Menos um" onClick={() => ajustar(i, -1)}>−</button>
          <b style={{ minWidth: 44, textAlign: 'center', fontSize: 16 }}>{Number(i.quantidade)}</b>
          <button className="icone-btn" style={{ width: 40, height: 40 }} aria-label="Mais um" onClick={() => ajustar(i, 1)}>+</button>
        </div>
      </div>
      <div className="entre">
        {i.observacoes ? <p className="texto">{i.observacoes}</p> : <span />}
        <button className="link" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setEditando(i)}>Editar</button>
      </div>
    </div>
  )

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div><div className="sobre">O que precisa ter em casa</div><h1>Estoque</h1></div>
        <button className="icone-btn escuro" aria-label="Novo item" onClick={() => setEditando('novo')}><Ic n="mais" s={20} w={2.5} /></button>
      </div>
      {dados.itens.length === 0 && <div className="cartao vazio">Cadastre o que não pode faltar: cloro da piscina, ração, gás, produtos de limpeza. Defina o mínimo e o app avisa quando estiver acabando.</div>}
      {baixo.length > 0 && <><div className="secao-titulo"><h2>Precisa comprar</h2><span className="chip chip-alerta">{baixo.length}</span></div><div className="lista">{baixo.map(i => <Item key={i.id} i={i} />)}</div></>}
      {ok.length > 0 && <><div className="secao-titulo"><h2>Em dia</h2></div><div className="lista">{ok.map(i => <Item key={i.id} i={i} />)}</div></>}
      {editando && <FolhaItem i={editando === 'novo' ? null : editando} cats={dados.cats} onFechar={() => setEditando(null)} onSalvo={recarregar} />}
    </div>
  )
}

function FolhaItem({ i, cats, onFechar, onSalvo }) {
  const [f, setF] = useState({ nome: i?.nome || '', categoria_id: i?.categoria_id || '', quantidade: i?.quantidade ?? 0, unidade: i?.unidade || 'un', minimo: i?.minimo ?? 1, observacoes: i?.observacoes || '' })
  const [erro, setErro] = useState(null)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.nome) return setErro('Dê um nome.')
    const reg = { nome: f.nome, categoria_id: f.categoria_id || null, quantidade: Number(f.quantidade), unidade: f.unidade, minimo: Number(f.minimo), observacoes: f.observacoes || null }
    const r = i ? await supabase.from('estoque_itens').update(reg).eq('id', i.id) : await supabase.from('estoque_itens').insert(reg)
    if (r.error) return setErro(r.error.message)
    onSalvo(); onFechar()
  }
  const remover = async () => { await supabase.from('estoque_itens').update({ ativo: false }).eq('id', i.id); onSalvo(); onFechar() }
  return (
    <Folha titulo={i ? 'Editar item' : 'Novo item'} onFechar={onFechar}>
      <div className="form">
        <div className="campo"><label>Item</label><input value={f.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex.: cloro granulado" /></div>
        <div className="campo"><label>Categoria</label><select value={f.categoria_id} onChange={e => set('categoria_id', e.target.value)}><option value="">Nenhuma</option>{cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
        <div className="campo-linha">
          <div className="campo"><label>Quantidade atual</label><input inputMode="decimal" value={f.quantidade} onChange={e => set('quantidade', e.target.value)} /></div>
          <div className="campo"><label>Unidade</label><div className="opcoes">{['un', 'kg', 'L', 'saco', 'caixa'].map(u => <button key={u} type="button" className={f.unidade === u ? 'marcado' : ''} onClick={() => set('unidade', u)}>{u}</button>)}</div></div>
        </div>
        <div className="campo"><label>Avisar quando chegar em</label><input inputMode="decimal" value={f.minimo} onChange={e => set('minimo', e.target.value)} /></div>
        <div className="campo"><label>Observações</label><input value={f.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Onde compra, marca, quanto dura" /></div>
        {erro && <p className="erro">{erro}</p>}
        <button className="btn largo" onClick={salvar}>{i ? 'Salvar' : 'Adicionar ao estoque'}</button>
        {i && <button className="btn largo claro" onClick={remover}>Remover do estoque</button>}
      </div>
    </Folha>
  )
}
