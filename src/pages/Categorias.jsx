import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useDados, q, soma } from '../hooks'
import { brl } from '../util'
import { Folha } from '../components/Folha'
import { Ic } from '../components/Icones'

export default function Categorias() {
  const { dados, recarregar } = useDados(async () => {
    const [categorias, despesas, fixos] = await Promise.all([q.categorias(), q.despesasMes(), q.custosFixos()])
    return { categorias, despesas, fixos }
  })
  const [nova, setNova] = useState(false)
  const [nome, setNome] = useState('')
  const [media, setMedia] = useState('')

  const salvar = async () => {
    if (!nome) return
    await supabase.from('categorias').insert({ nome, media_mensal: media ? Number(media) : null, ordem: (dados?.categorias.length || 0) + 1 })
    setNova(false); setNome(''); setMedia(''); recarregar()
  }

  if (!dados) return <p className="carregando">Carregando…</p>
  return (
    <div className="pilha">
      <div className="cabecalho">
        <div><div className="sobre">Categorias</div><h1>A casa</h1></div>
        <button className="icone-btn escuro" aria-label="Nova categoria" onClick={() => setNova(true)}><Ic n="mais" s={20} w={2.5} /></button>
      </div>
      <div className="grade-4">
        {dados.categorias.map(c => {
          const gasto = soma(dados.despesas.filter(d => d.categoria_id === c.id))
          const fixo = soma(dados.fixos.filter(f => f.categoria_id === c.id))
          return (
            <Link key={c.id} to={`/casa/${c.id}`} className="cartao">
              <span className="titulo-cartao">{c.nome}</span>
              <div className="valor">{brl(gasto)}</div>
              <div className="nota">{fixo ? `Fixo ${brl(fixo)}` : 'Sem custo fixo'}{c.media_mensal ? ` · média ${brl(c.media_mensal)}` : ''}</div>
            </Link>
          )
        })}
      </div>
      {nova && (
        <Folha titulo="Nova categoria" onFechar={() => setNova(false)}>
          <div className="form">
            <div className="campo"><label>Nome</label><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Gás" /></div>
            <div className="campo"><label>Média mensal esperada (opcional)</label><input inputMode="decimal" value={media} onChange={e => setMedia(e.target.value)} placeholder="Usada para avisar quando passar" /></div>
            <button className="btn largo" onClick={salvar}>Criar categoria</button>
          </div>
        </Folha>
      )}
    </div>
  )
}
