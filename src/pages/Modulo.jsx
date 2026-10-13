import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Wrench, Package, ChevronRight } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados, soma } from '../hooks'
import { brl, dataCurta, diasAte, mesAtual, hoje } from '../util'
import { SectionHero, QuickAdd } from '../components/Secao'
import { SECOES } from '../lib/sectionThemes'
import { avisarMudanca } from '../hooks'
import { Sheet } from '../components/ui/Sheet'
import { useToast } from '../components/ui/Toast'
import { MODULOS, temModulo } from '../lib/tipos'
import { useCasa } from '../lib/casa'
import { ICONE_MOD } from './Casas'
import { ContaLinha } from '../components/FolhaConta'
import { useAcoesConta } from './Contas'

// Tela de um módulo: itens próprios (pets, veículos, áreas…), contas, manutenções e estoque das suas categorias
export default function Modulo() {
  const { mod } = useParams()
  const { casa, podeEditar } = useCasa()
  const toast = useToast()
  const def = MODULOS[mod]
  const [item, setItem] = useState(null)
  const { dados, recarregar } = useDados(async () => {
    const nomes = (def?.categorias || []).map(c => c[0])
    const cats = nomes.length ? (await supabase.from('categorias').select('id,nome,cor,icone').in('nome', nomes)).data || [] : []
    const ids = cats.map(c => c.id)
    const m = mesAtual()
    const [itens, contas, gastos, manut, estoque] = await Promise.all([
      supabase.from('modulo_itens').select('*').eq('modulo', mod).eq('ativo', true).order('nome').then(r => r.data || [], () => []),
      ids.length ? supabase.from('contas').select('*, categorias(*)').in('categoria_id', ids).or(`pago_em.is.null,pago_em.gte.${m.ini}`).order('vencimento').then(r => r.data || []) : [],
      ids.length ? supabase.from('despesas').select('id,valor,descricao,data').in('categoria_id', ids).gte('data', m.ini).lte('data', m.fim).then(r => r.data || []) : [],
      ids.length ? supabase.from('manutencoes').select('*').in('categoria_id', ids).eq('ativo', true).order('proxima').then(r => r.data || []) : [],
      ids.length ? supabase.from('estoque_itens').select('*').in('categoria_id', ids).eq('ativo', true).order('nome').then(r => r.data || []) : [],
    ])
    return { cats, itens, contas, gastos, manut, estoque }
  }, [mod, casa?.id])
  const acoes = useAcoesConta(recarregar)
  if (!def) return <Navigate to="/" />
  if (!temModulo(casa, mod)) return <Navigate to="/admin" />
  if (!dados) return <p className="carregando">Carregando…</p>
  const { cats, itens, contas, gastos, manut, estoque } = dados
  const Icone = ICONE_MOD[def.icone] || Wrench
  const gastosLista = [...gastos].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8)

  return (
    <>
      <SectionHero chave={mod} g={(SECOES[mod] || SECOES.categorias).g} Icon={(SECOES[mod] || {}).Icon || Icone} titulo={def.nome} subtitulo="Gastos e cuidados deste mês" valor={brl(soma(gastos))}>
        {def.item && podeEditar && <div className="btnrow mt12"><button className="btn sm" onClick={() => setItem({})}><Plus size={15} className="i" />{def.item.rotulo}</button></div>}
      </SectionHero>
      {cats[0] && podeEditar && (<>
        <div className="sec-h"><h2>Lançar em {def.nome}</h2></div>
        <QuickAdd placeholder="Descrição" onSalvar={async (d, v) => {
          if (!v) { toast({ txt: 'Informe o valor.', erro: true }); throw new Error('sem valor') }
          await supabase.from('despesas').insert({ tipo: 'variavel', categoria_id: cats[0].id, descricao: d || def.nome, valor: v, data: hoje(), forma_pagamento: 'Pix', fotos: [] })
          toast('Salvo'); recarregar()
        }} />
        <div className="px">{gastosLista.length > 0 && <div className="list" style={{ marginBottom: 6 }}>{gastosLista.map(g => <div key={g.id} className="row"><div className="grow"><p className="t">{g.descricao}</p><p className="s">{dataCurta(g.data)}</p></div><b className="num">{brl(g.valor)}</b></div>)}</div>}</div>
      </>)}

      {def.item && (
        <section className="sec"><div className="sec-h"><h2>{def.item.rotulo === 'Pet' ? 'Pets' : def.item.rotulo === 'Veículo' ? 'Veículos' : def.item.rotulo + 's'}</h2>{podeEditar && <button className="link" onClick={() => setItem({})}>+ Adicionar</button>}</div>
          <div className="px stack-y">
            {itens.length === 0 && <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhum cadastro ainda. Toque em adicionar.</p></div>}
            {itens.map(it => (
              <button key={it.id} className="card" style={{ textAlign: 'left', width: '100%', font: 'inherit', color: 'inherit' }} onClick={() => podeEditar && setItem(it)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3>{it.nome}</h3>{podeEditar && <Pencil size={15} className="i" style={{ color: 'var(--muted)' }} />}</div>
                <div className="item-campos">{def.item.campos.filter(([k]) => it.dados?.[k]).map(([k, l, t]) => <div key={k}><span>{l}</span><br /><b>{t === 'date' ? `${dataCurta(it.dados[k])}${diasAte(it.dados[k]) < 0 ? ' · vencido' : ''}` : it.dados[k]}</b></div>)}</div>
                {it.observacoes && <p className="muted" style={{ marginTop: 8 }}>{it.observacoes}</p>}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="sec"><div className="sec-h"><h2>Contas</h2>{cats[0] && podeEditar && <button className="link" onClick={() => acoes.abrirNova({ categoria_id: cats[0].id })}>+ Adicionar</button>}</div>
        <div className="px stack-y">
          {contas.length === 0 ? <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhuma conta em aberto ou paga neste mês{cats.length ? ` em ${cats.map(c => c.nome).join(', ')}` : ''}.</p></div>
            : contas.map(c => <ContaLinha key={c.id} c={c} onAbrir={acoes.abrir} onPagar={podeEditar ? acoes.pagar : null} />)}
        </div>
      </section>

      {temModulo(casa, 'manutencoes') && manut.length > 0 && (
        <section className="sec"><div className="sec-h"><h2>Manutenções</h2><Link to="/manutencoes">Agenda <ChevronRight size={16} className="i" /></Link></div>
          <div className="px"><div className="list">{manut.map(m => { const d = m.proxima ? diasAte(m.proxima) : null; return (
            <div key={m.id} className="row"><span className="tile t-md c-manut"><Wrench size={20} className="i" /></span><div className="grow"><p className="t">{m.nome}</p><p className="s">{m.ultima_execucao ? `última ${dataCurta(m.ultima_execucao)}` : 'nunca feita'}</p></div>
              {d !== null && <span className={`chip ${d < 0 ? 'danger' : d <= 7 ? 'warn' : ''}`}>{d < 0 ? 'atrasada' : dataCurta(m.proxima)}</span>}</div>) })}</div></div>
        </section>
      )}

      {temModulo(casa, 'estoque') && estoque.length > 0 && (
        <section className="sec"><div className="sec-h"><h2>Estoque</h2><Link to="/estoque">Ver tudo <ChevronRight size={16} className="i" /></Link></div>
          <div className="px"><div className="list">{estoque.map(e => { const pouco = Number(e.quantidade) <= Number(e.minimo); return (
            <div key={e.id} className="row"><span className="tile t-md c-estoque"><Package size={20} className="i" /></span><div className="grow"><p className="t">{e.nome}</p><p className="s">tem {Number(e.quantidade)} {e.unidade || ''} · mínimo {Number(e.minimo)}</p></div>
              <span className={`chip ${pouco ? 'danger' : 'ok'}`}>{pouco ? 'Repor' : 'Ok'}</span></div>) })}</div></div>
        </section>
      )}

      <div style={{ height: 12 }} />
      {acoes.folhas}
      {item && <FolhaItem def={def} mod={mod} inicial={item} onFechar={() => setItem(null)} onSalvo={recarregar} />}
    </>
  )
}

function FolhaItem({ def, mod, inicial, onFechar, onSalvo }) {
  const toast = useToast()
  const [nome, setNome] = useState(inicial.nome || '')
  const [dados, setDados] = useState(inicial.dados || {})
  const [obs, setObs] = useState(inicial.observacoes || '')
  const salvar = async () => {
    if (!nome.trim()) return
    const payload = { nome: nome.trim(), dados, observacoes: obs || null }
    try {
      if (inicial.id) await supabase.from('modulo_itens').update(payload).eq('id', inicial.id)
      else await supabase.from('modulo_itens').insert({ ...payload, modulo: mod, ativo: true })
      toast('Salvo'); onSalvo(); onFechar()
    } catch { /* aviso já mostrado */ }
  }
  const excluir = async () => {
    if (!confirm(`Excluir "${inicial.nome}"?`)) return
    try { await supabase.from('modulo_itens').delete().eq('id', inicial.id); onSalvo(); onFechar() } catch { /* aviso já mostrado */ }
  }
  return (
    <Sheet titulo={inicial.id ? `Editar ${def.item.rotulo.toLowerCase()}` : `Novo ${def.item.rotulo.toLowerCase()}`} onFechar={onFechar}>
      <div className="stack-y">
        <label className="field"><span className="l">Nome</span><input className="input" value={nome} onChange={e => setNome(e.target.value)} autoFocus /></label>
        <div className="det-grid">{def.item.campos.map(([k, l, t]) => (
          <label key={k} className="field"><span className="l" style={{ fontSize: 11 }}>{l}</span><input className="input" type={t === 'date' ? 'date' : 'text'} value={dados[k] || ''} onChange={e => setDados(x => ({ ...x, [k]: e.target.value }))} /></label>
        ))}</div>
        <label className="field"><span className="l">Observações</span><textarea className="input" value={obs} onChange={e => setObs(e.target.value)} /></label>
        <button className="btn primary block" onClick={salvar}>Salvar</button>
        {inicial.id && <button className="btn block" style={{ color: 'var(--danger)' }} onClick={excluir}><Trash2 size={16} className="i" />Excluir</button>}
      </div>
    </Sheet>
  )
}
