import { useState } from 'react'
import { supabase } from '../supabase'
import { useDados, soma } from '../hooks'
import { brl, dataCurta } from '../util'
import { CatTile } from '../lib/categoryStyle'
import { BackBar } from '../components/ui/BackBar'
import { FolhaEditarDespesa } from '../components/FolhaEditarDespesa'

export default function Registros() {
  const [filtro, setFiltro] = useState('todos')
  const [editar, setEditar] = useState(null)
  const { dados, recarregar } = useDados(async () => {
    const despesas = await supabase.from('despesas').select('*, categorias(nome,cor,icone), pessoas(nome), obras(nome), pagamento_itens!pagamento_itens_despesa_id_fkey(id)').order('data', { ascending: false }).limit(200).then(r => r.data || [])
    return { despesas }
  })
  if (!dados) return <p className="carregando">Carregando…</p>
  const { despesas } = dados
  const filtros = [['todos', 'Tudo'], ['fixo', 'Fixos'], ['pessoa', 'Pessoas'], ['obra', 'Obras'], ['material', 'Material'], ['variavel', 'Avulsos']]
  let lista = filtro === 'todos' ? despesas : despesas.filter(d => d.tipo === filtro || (filtro === 'fixo' && d.custo_fixo_id))

  // agrupar por dia
  const grupos = {}
  lista.forEach(d => { (grupos[d.data] = grupos[d.data] || []).push(d) })

  return (
    <>
      <BackBar titulo="Histórico" />
      <header className="hdr" style={{ paddingTop: 12, paddingBottom: 8 }}><div><p className="eyebrow">Tudo que foi registrado</p><h1>Histórico</h1></div></header>
      <div className="hscroll">{filtros.map(([v, t]) => <button key={v} className={`pick ${filtro === v ? 'on' : ''}`} onClick={() => setFiltro(v)}>{t}</button>)}</div>

      <section className="px mt16 stack-y">
        {lista.length === 0 && <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhum registro ainda. Toque no botão azul para registrar o primeiro gasto.</p></div>}
        {Object.entries(grupos).map(([data, itens]) => (
          <div key={data}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '4px 2px 8px' }}><span className="muted" style={{ fontWeight: 700 }}>{dataCurta(data)}</span><span className="muted num">{brl(soma(itens))}</span></div>
            <div className="list">{itens.map(d => (
              <button key={d.id} type="button" className="row" onClick={() => setEditar(d)}><CatTile cat={d.categorias} size="md" /><div className="grow"><p className="t">{d.descricao}</p><p className="s">{d.categorias?.nome}{d.pessoas?.nome ? ` · ${d.pessoas.nome}` : ''}{d.obras?.nome ? ` · ${d.obras.nome}` : ''}{d.forma_pagamento ? ` · ${d.forma_pagamento}` : ''}</p></div><b className="num">{brl(d.valor)}</b></button>
            ))}</div>
          </div>
        ))}
      </section>
      <p className="muted px mt16">Toque em um registro para editar ou excluir.</p>
      <div style={{ height: 12 }} />
      {editar && <FolhaEditarDespesa despesa={editar} onFechar={() => setEditar(null)} onSalvo={recarregar} />}
    </>
  )
}
