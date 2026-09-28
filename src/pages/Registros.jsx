import { useState } from 'react'
import { supabase } from '../supabase'
import { useDados, q, soma } from '../hooks'
import { brl, dataCurta } from '../util'

export default function Registros() {
  const [cat, setCat] = useState('')
  const { dados, recarregar } = useDados(async () => {
    const [despesas, categorias] = await Promise.all([q.despesas(cat ? { categoria_id: cat } : {}), q.categorias()])
    return { despesas, categorias }
  }, [cat])
  if (!dados) return <p className="carregando">Carregando…</p>
  const apagar = async (d) => {
    if (!confirm(`Apagar "${d.descricao}" de ${brl(d.valor)}?`)) return
    await supabase.from('despesas').delete().eq('id', d.id); recarregar()
  }
  // Agrupa por mês
  const grupos = {}
  for (const d of dados.despesas) { const k = d.data.slice(0, 7); (grupos[k] = grupos[k] || []).push(d) }
  const nomeMes = (k) => new Date(k + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="pilha">
      <div className="cabecalho"><div><div className="sobre">Tudo que foi registrado</div><h1>Registros</h1></div></div>
      <div className="campo"><select value={cat} onChange={e => setCat(e.target.value)}><option value="">Todas as categorias</option>{dados.categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
      {Object.keys(grupos).length === 0 && <div className="cartao vazio">Nenhum registro ainda.</div>}
      {Object.entries(grupos).map(([k, lista]) => (
        <div key={k}>
          <div className="secao-titulo" style={{ marginBottom: 8 }}><h2 style={{ textTransform: 'capitalize' }}>{nomeMes(k)}</h2><b>{brl(soma(lista))}</b></div>
          <div className="cartao">
            {lista.map(d => (
              <div key={d.id} className="linha-item" style={{ justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{d.descricao}</div><div className="nota">{dataCurta(d.data)} · {d.categorias?.nome}{d.pessoas?.nome ? ` · ${d.pessoas.nome}` : ''}{d.obras?.nome ? ` · ${d.obras.nome}` : ''}</div></div>
                <div style={{ textAlign: 'right' }}><b style={{ fontSize: 14 }}>{brl(d.valor)}</b><br /><button onClick={() => apagar(d)} style={{ background: 'none', border: 'none', color: 'var(--cinza)', fontSize: 11, cursor: 'pointer', padding: 0 }}>apagar</button></div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
