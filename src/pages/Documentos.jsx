import { useState } from 'react'
import { supabase } from '../supabase'
import { useDados, q } from '../hooks'
import { dataCurta } from '../util'
import { Folha } from '../components/Folha'
import { Ic } from '../components/Icones'
import { diasAte } from './Manutencoes'

export const TIPOS_DOC = { escritura: 'Escritura', iptu: 'IPTU', seguro: 'Seguro', contrato: 'Contrato', manual: 'Manual', garantia: 'Garantia', nota_fiscal: 'Nota fiscal', outro: 'Outro' }

async function enviarDocumento(file) {
  const nome = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
  const { error } = await supabase.storage.from('documentos').upload(nome, file)
  if (error) throw error
  return nome
}
export async function abrirDocumento(caminho) {
  const { data } = await supabase.storage.from('documentos').createSignedUrl(caminho, 300)
  if (data?.signedUrl) window.open(data.signedUrl, '_blank')
}

export default function Documentos() {
  const { dados, recarregar } = useDados(async () => {
    const [docs, cats, pessoas, obras] = await Promise.all([
      supabase.from('documentos').select('*, categorias(nome), pessoas(nome), obras(nome)').order('validade', { ascending: true, nullsFirst: false }).then(r => r.data || []),
      q.categorias(), q.pessoas(),
      supabase.from('obras').select('id,nome').then(r => r.data || []),
    ])
    return { docs, cats, pessoas, obras }
  })
  const [editando, setEditando] = useState(null)
  const [filtro, setFiltro] = useState('')
  if (!dados) return <p className="carregando">Carregando…</p>
  const lista = dados.docs.filter(d => !filtro || d.tipo === filtro)
  return (
    <div className="pilha">
      <div className="cabecalho">
        <div><div className="sobre">Papéis da casa</div><h1>Documentos</h1></div>
        <button className="icone-btn escuro" aria-label="Novo documento" onClick={() => setEditando('novo')}><Ic n="mais" s={20} w={2.5} /></button>
      </div>
      <div className="opcoes"><button className={!filtro ? 'marcado' : ''} onClick={() => setFiltro('')}>Todos</button>{Object.entries(TIPOS_DOC).map(([v, l]) => <button key={v} className={filtro === v ? 'marcado' : ''} onClick={() => setFiltro(v)}>{l}</button>)}</div>
      {lista.length === 0 && <div className="cartao vazio">Guarde aqui escritura, IPTU, seguro, contratos, manuais, garantias e notas. Com validade, o app avisa antes de vencer.</div>}
      <div className="lista">
        {lista.map(d => {
          const dias = diasAte(d.validade)
          return (
            <div key={d.id} className="cartao">
              <div className="entre"><span className="titulo-cartao">{d.nome}</span>
                {dias !== null && (dias < 0 ? <span className="chip chip-alerta">vencido</span> : dias <= 30 ? <span className="chip chip-alerta">vence em {dias} dia{dias !== 1 ? 's' : ''}</span> : <span className="chip chip-ok">válido</span>)}
              </div>
              <div className="nota">{TIPOS_DOC[d.tipo]}{d.categorias?.nome ? ` · ${d.categorias.nome}` : ''}{d.pessoas?.nome ? ` · ${d.pessoas.nome}` : ''}{d.obras?.nome ? ` · ${d.obras.nome}` : ''}{d.validade ? ` · validade ${dataCurta(d.validade)}` : ''}</div>
              {d.observacoes && <p className="texto">{d.observacoes}</p>}
              <div className="acoes" style={{ marginTop: 4 }}>
                {d.arquivo_url && <button className="btn pequeno" onClick={() => abrirDocumento(d.arquivo_url)}>Abrir arquivo</button>}
                <button className="btn pequeno claro" onClick={() => setEditando(d)}>Editar</button>
              </div>
            </div>
          )
        })}
      </div>
      {editando && <FolhaDocumento d={editando === 'novo' ? null : editando} cats={dados.cats} pessoas={dados.pessoas} obras={dados.obras} onFechar={() => setEditando(null)} onSalvo={recarregar} />}
    </div>
  )
}

function FolhaDocumento({ d, cats, pessoas, obras, onFechar, onSalvo }) {
  const [f, setF] = useState({ nome: d?.nome || '', tipo: d?.tipo || 'outro', categoria_id: d?.categoria_id || '', pessoa_id: d?.pessoa_id || '', obra_id: d?.obra_id || '', validade: d?.validade || '', observacoes: d?.observacoes || '' })
  const [arquivo, setArquivo] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.nome) return setErro('Dê um nome.')
    setSalvando(true)
    try {
      const arquivo_url = arquivo ? await enviarDocumento(arquivo) : d?.arquivo_url || null
      const reg = { nome: f.nome, tipo: f.tipo, categoria_id: f.categoria_id || null, pessoa_id: f.pessoa_id || null, obra_id: f.obra_id || null, validade: f.validade || null, observacoes: f.observacoes || null, arquivo_url }
      const r = d ? await supabase.from('documentos').update(reg).eq('id', d.id) : await supabase.from('documentos').insert(reg)
      if (r.error) throw r.error
      onSalvo(); onFechar()
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }
  const apagar = async () => { if (!confirm('Apagar este documento?')) return; await supabase.from('documentos').delete().eq('id', d.id); onSalvo(); onFechar() }
  return (
    <Folha titulo={d ? 'Editar documento' : 'Novo documento'} onFechar={onFechar}>
      <div className="form">
        <div className="campo"><label>Nome</label><input value={f.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex.: Seguro residencial 2026" /></div>
        <div className="campo"><label>Tipo</label><div className="opcoes">{Object.entries(TIPOS_DOC).map(([v, l]) => <button key={v} type="button" className={f.tipo === v ? 'marcado' : ''} onClick={() => set('tipo', v)}>{l}</button>)}</div></div>
        <div className="campo"><label>Validade (opcional)</label><input type="date" value={f.validade} onChange={e => set('validade', e.target.value)} /></div>
        <div className="campo"><label>Arquivo (PDF ou foto)</label><input type="file" accept="application/pdf,image/*" onChange={e => setArquivo(e.target.files[0] || null)} />{d?.arquivo_url && !arquivo && <span className="nota">Já tem um arquivo. Envie outro para substituir.</span>}</div>
        <div className="campo-linha">
          <div className="campo"><label>Categoria</label><select value={f.categoria_id} onChange={e => set('categoria_id', e.target.value)}><option value="">Nenhuma</option>{cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          <div className="campo"><label>Pessoa</label><select value={f.pessoa_id} onChange={e => set('pessoa_id', e.target.value)}><option value="">Nenhuma</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
        </div>
        <div className="campo"><label>Obra relacionada</label><select value={f.obra_id} onChange={e => set('obra_id', e.target.value)}><option value="">Nenhuma</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></div>
        <div className="campo"><label>Observações</label><textarea value={f.observacoes} onChange={e => set('observacoes', e.target.value)} /></div>
        {erro && <p className="erro">{erro}</p>}
        <button className="btn largo" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : d ? 'Salvar' : 'Guardar documento'}</button>
        {d && <button className="btn largo claro" style={{ color: 'var(--alerta)' }} onClick={apagar}>Apagar</button>}
      </div>
    </Folha>
  )
}
