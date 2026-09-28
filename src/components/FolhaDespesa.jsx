import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { Folha } from './Folha'
import { enviarFotos } from './Upload'
import { hoje } from '../util'

const TIPOS = [
  ['variavel', 'Despesa da casa'],
  ['material', 'Material de obra'],
  ['pessoa', 'Pagamento a pessoa'],
  ['obra', 'Pagamento de obra'],
]

export function FolhaDespesa({ onFechar, onSalvo, inicial = {} }) {
  const [cats, setCats] = useState([])
  const [pessoas, setPessoas] = useState([])
  const [obras, setObras] = useState([])
  const [f, setF] = useState({
    tipo: 'variavel', categoria_id: '', pessoa_id: '', obra_id: '', descricao: '', explicacao: '',
    valor: '', data: hoje(), forma_pagamento: 'Pix', ...inicial,
  })
  const [fotos, setFotos] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    supabase.from('categorias').select('id,nome').order('ordem').then(r => setCats(r.data || []))
    supabase.from('pessoas').select('id,nome,funcao,categoria_id').eq('ativo', true).order('nome').then(r => setPessoas(r.data || []))
    supabase.from('obras').select('id,nome,categoria_id,empreiteiro_id').in('status', ['orcamento_pendente', 'em_andamento', 'pausada']).then(r => setObras(r.data || []))
  }, [])

  const set = (k, v) => setF(x => ({ ...x, [k]: v }))

  // Ao escolher pessoa ou obra, herda a categoria
  const escolherPessoa = (id) => { const p = pessoas.find(x => x.id === id); set('pessoa_id', id); if (p?.categoria_id) set('categoria_id', p.categoria_id) }
  const escolherObra = (id) => { const o = obras.find(x => x.id === id); set('obra_id', id); if (o?.categoria_id) set('categoria_id', o.categoria_id); if (o?.empreiteiro_id && !f.pessoa_id) set('pessoa_id', o.empreiteiro_id) }

  const salvar = async () => {
    setErro(null)
    if (!f.categoria_id) return setErro('Escolha a categoria.')
    if (!f.valor) return setErro('Informe o valor.')
    if (!f.descricao) return setErro('Diga em poucas palavras o que foi.')
    setSalvando(true)
    try {
      const urls = fotos.length ? await enviarFotos(fotos, 'despesas') : []
      const { error } = await supabase.from('despesas').insert({
        tipo: f.tipo, categoria_id: f.categoria_id, pessoa_id: f.pessoa_id || null, obra_id: f.obra_id || null,
        custo_fixo_id: f.custo_fixo_id || null,
        descricao: f.descricao, explicacao: f.explicacao || null, valor: Number(String(f.valor).replace(',', '.')),
        data: f.data, forma_pagamento: f.forma_pagamento, fotos: urls,
      })
      if (error) throw error
      onSalvo?.(); onFechar()
    } catch (e) { setErro(e.message) } finally { setSalvando(false) }
  }

  return (
    <Folha titulo="Registrar despesa" onFechar={onFechar}>
      <div className="form">
        <div className="campo">
          <label>O que é</label>
          <div className="opcoes">
            {TIPOS.map(([v, l]) => <button key={v} type="button" className={f.tipo === v ? 'marcado' : ''} onClick={() => set('tipo', v)}>{l}</button>)}
          </div>
        </div>

        {(f.tipo === 'obra' || f.tipo === 'material') && (
          <div className="campo">
            <label>Obra</label>
            <select value={f.obra_id} onChange={e => escolherObra(e.target.value)}>
              <option value="">Escolher obra</option>
              {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
        )}

        {(f.tipo === 'pessoa' || f.tipo === 'obra') && (
          <div className="campo">
            <label>Para quem</label>
            <select value={f.pessoa_id} onChange={e => escolherPessoa(e.target.value)}>
              <option value="">Escolher pessoa</option>
              {pessoas.map(p => <option key={p.id} value={p.id}>{p.nome} · {p.funcao}</option>)}
            </select>
          </div>
        )}

        <div className="campo">
          <label>Categoria</label>
          <select value={f.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
            <option value="">Escolher categoria</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div className="campo-linha">
          <div className="campo"><label>Valor (R$)</label><input inputMode="decimal" value={f.valor} onChange={e => set('valor', e.target.value)} placeholder="0" /></div>
          <div className="campo"><label>Data</label><input type="date" value={f.data} onChange={e => set('data', e.target.value)} /></div>
        </div>

        <div className="campo"><label>Descrição curta</label><input value={f.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Ex.: troca do motor da bomba" /></div>
        <div className="campo"><label>O que foi feito (opcional)</label><textarea value={f.explicacao} onChange={e => set('explicacao', e.target.value)} placeholder="Contexto para lembrar depois: por que, quem fez, o que ficou combinado" /></div>

        <div className="campo">
          <label>Forma de pagamento</label>
          <div className="opcoes">
            {['Pix', 'Dinheiro', 'Cartão', 'Débito automático', 'Boleto'].map(v => <button key={v} type="button" className={f.forma_pagamento === v ? 'marcado' : ''} onClick={() => set('forma_pagamento', v)}>{v}</button>)}
          </div>
        </div>

        <div className="campo"><label>Fotos ou comprovante</label><input type="file" accept="image/*" multiple onChange={e => setFotos([...e.target.files])} /></div>

        {erro && <p className="erro">{erro}</p>}
        <button className="btn largo" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar despesa'}</button>
      </div>
    </Folha>
  )
}
