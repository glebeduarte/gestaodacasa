import { useState } from 'react'
import { Printer, Send, ChevronRight } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados, soma } from '../hooks'
import { brl, dataCurta, mesDe, mesAnterior, nomeMesCurto } from '../util'
import { CatTile } from '../lib/categoryStyle'
import { BackBar } from '../components/ui/BackBar'
import { useToast } from '../components/ui/Toast'

function ultimosMeses(n) { const arr = []; const d = new Date(); for (let i = 0; i < n; i++) { arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); d.setMonth(d.getMonth() - 1) } return arr }

export default function Fechamento() {
  const meses = ultimosMeses(12)
  const [ym, setYm] = useState(meses[0])
  const toast = useToast()
  const { dados } = useDados(async () => {
    const m = mesDe(ym), ant = mesDe(mesAnterior(ym))
    const [categorias, despesas, anteriores] = await Promise.all([
      supabase.from('categorias').select('*').eq('ativo', true).order('ordem').then(r => r.data || []),
      supabase.from('despesas').select('*, categorias(nome,cor,icone), pessoas(nome), obras(nome)').gte('data', m.ini).lte('data', m.fim).order('data', { ascending: false }).then(r => r.data || []),
      supabase.from('despesas').select('valor').gte('data', ant.ini).lte('data', ant.fim).then(r => r.data || []),
    ])
    return { categorias, despesas, anteriores, label: m.label }
  }, [ym])
  if (!dados) return <p className="carregando">Carregando…</p>
  const { categorias, despesas, anteriores, label } = dados

  const total = soma(despesas)
  const totalAnt = soma(anteriores)
  const dif = totalAnt ? Math.round((total - totalAnt) / totalAnt * 100) : null
  const fixos = soma(despesas.filter(d => d.tipo === 'fixo' || d.custo_fixo_id))
  const obras = soma(despesas.filter(d => d.obra_id))
  const pessoas = soma(despesas.filter(d => d.pessoa_id && !d.obra_id))
  const porCat = categorias.map(c => ({ ...c, total: soma(despesas.filter(d => d.categoria_id === c.id)) })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)
  const max = Math.max(1, ...porCat.map(c => c.total))

  const enviar = () => {
    const txt = `*Fechamento ${label}*\n\nTotal: ${brl(total)}\nFixos: ${brl(fixos)}\nObras: ${brl(obras)}\nPessoas: ${brl(pessoas)}\n\n` + porCat.map(c => `${c.nome}: ${brl(c.total)}`).join('\n')
    window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank')
  }

  return (
    <>
      <BackBar titulo="Fechamento" acao={<button className="iconbtn no-print" onClick={() => window.print()} aria-label="Imprimir"><Printer size={18} className="i" /></button>} />
      <header className="hdr" style={{ paddingTop: 12, paddingBottom: 8 }}><div><p className="eyebrow">Resumo do mês</p><h1 style={{ textTransform: 'capitalize' }}>{label}</h1></div></header>

      <div className="hscroll no-print">{meses.map(m => <button key={m} className={`pick ${ym === m ? 'on' : ''}`} onClick={() => setYm(m)} style={{ textTransform: 'capitalize' }}>{nomeMesCurto(m)}</button>)}</div>

      <section className="px mt16">
        <div className="hero">
          <p className="hero-label">Total gasto</p>
          <p className="hero-value num">{brl(total)}</p>
          {dif !== null && <p className="hero-sub">{dif === 0 ? 'igual ao mês passado' : `${dif > 0 ? '+' : ''}${dif}% vs mês passado (${brl(totalAnt)})`}</p>}
        </div>
      </section>

      <div className="px stats mt16">
        <div className="stat"><p className="l">Fixos</p><p className="v num">{brl(fixos)}</p></div>
        <div className="stat"><p className="l">Obras</p><p className="v num">{brl(obras)}</p></div>
        <div className="stat"><p className="l">Pessoas</p><p className="v num">{brl(pessoas)}</p></div>
      </div>

      <div className="sec-h mt24"><h2>Por categoria</h2></div>
      <div className="px stack-y">
        {porCat.length === 0 && <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhum gasto neste mês.</p></div>}
        {porCat.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CatTile cat={c} size="sm" />
            <div style={{ flex: 1 }}><div className="barlabel" style={{ marginBottom: 4 }}><span>{c.nome}</span><b className="num">{brl(c.total)}</b></div><div className="bar"><i className={c.cor || 'c-neutral'} style={{ width: `${c.total / max * 100}%`, background: 'var(--c)' }} /></div></div>
          </div>
        ))}
      </div>

      <div className="sec-h mt24"><h2>Últimas despesas</h2></div>
      <div className="px"><div className="list">
        {despesas.slice(0, 8).map(d => (
          <div key={d.id} className="row"><CatTile cat={d.categorias} size="md" /><div className="grow"><p className="t">{d.descricao}</p><p className="s">{dataCurta(d.data)}{d.pessoas?.nome ? ` · ${d.pessoas.nome}` : ''}{d.obras?.nome ? ` · ${d.obras.nome}` : ''}</p></div><b className="num">{brl(d.valor)}</b></div>
        ))}
      </div></div>

      <div className="px mt24 btnrow no-print">
        <button className="btn dark" onClick={() => window.print()}><Printer size={18} className="i" />Gerar PDF</button>
        <button className="btn primary" onClick={enviar}><Send size={18} className="i" />Enviar</button>
      </div>
      <div style={{ height: 12 }} />
    </>
  )
}
