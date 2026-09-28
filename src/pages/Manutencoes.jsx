import { useState } from 'react'
import { Wrench, Plus, Check } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados } from '../hooks'
import { dataCurta, diasAte, somarDias, hoje, INTERVALOS, nomeIntervalo } from '../util'
import { CatTile } from '../lib/categoryStyle'
import { BackBar } from '../components/ui/BackBar'
import { Sheet } from '../components/ui/Sheet'
import { useToast } from '../components/ui/Toast'

const SUGESTOES = [
  ['Limpar caixa d\'água', 180], ['Revisar ar-condicionado', 180], ['Dedetização', 180],
  ['Limpar calhas', 90], ['Revisar bomba da piscina', 90], ['Podar árvores', 120],
]

export default function Manutencoes() {
  const [novo, setNovo] = useState(null)
  const toast = useToast()
  const { dados, recarregar } = useDados(async () => {
    const [manut, cats] = await Promise.all([
      supabase.from('manutencoes').select('*, categorias(*)').eq('ativo', true).order('proxima').then(r => r.data || []),
      supabase.from('categorias').select('id,nome,cor,icone').eq('ativo', true).then(r => r.data || []),
    ])
    return { manut, cats }
  })
  if (!dados) return <p className="carregando">Carregando…</p>
  const { manut, cats } = dados

  const comData = manut.map(m => ({ ...m, dias: m.proxima ? diasAte(m.proxima) : null }))
  const atrasadas = comData.filter(m => m.dias !== null && m.dias < 0)
  const proximas = comData.filter(m => m.dias === null || m.dias >= 0)
  const esteMes = comData.filter(m => m.dias !== null && m.dias >= 0 && m.dias <= 30).length
  const emDia = comData.filter(m => m.dias === null || m.dias > 15).length

  const feito = async (m) => {
    const prox = somarDias(hoje(), m.intervalo_dias || 30)
    await supabase.from('manutencoes').update({ ultima_execucao: hoje(), proxima: prox }).eq('id', m.id)
    await supabase.from('manutencao_execucoes').insert({ manutencao_id: m.id, data: hoje() }).then(() => {}, () => {})
    toast('Feito, próxima agendada'); recarregar()
  }

  const Item = ({ m }) => (
    <div className="row">
      {m.categorias ? <CatTile cat={m.categorias} size="md" /> : <span className="tile t-md c-manut"><Wrench size={22} className="i" /></span>}
      <div className="grow"><p className="t">{m.nome}</p><p className="s">{nomeIntervalo(m.intervalo_dias)}{m.ultima_execucao ? ` · última ${dataCurta(m.ultima_execucao)}` : ' · nunca feita'}</p></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        {m.dias !== null && <span className={`chip ${m.dias < 0 ? 'danger' : m.dias <= 15 ? 'warn' : ''}`} style={{ height: 22, fontSize: 11 }}>{m.dias < 0 ? `há ${-m.dias} dias` : m.proxima ? dataCurta(m.proxima) : ''}</span>}
        <button className="btn sm dark" onClick={() => feito(m)}><Check size={14} className="i" />Feito</button>
      </div>
    </div>
  )

  return (
    <>
      <BackBar titulo="Manutenções" acao={<button className="iconbtn" onClick={() => setNovo({})} aria-label="Nova"><Plus size={20} className="i" /></button>} />
      <header className="hdr" style={{ paddingTop: 12, paddingBottom: 8 }}><div><p className="eyebrow">Cuidados da casa</p><h1>Manutenções</h1></div></header>

      <div className="px"><div className="stats">
        <div className="stat"><p className="l">Atrasadas</p><p className="v" style={{ color: atrasadas.length ? 'var(--danger)' : 'var(--ink)' }}>{atrasadas.length}</p></div>
        <div className="stat"><p className="l">Este mês</p><p className="v">{esteMes}</p></div>
        <div className="stat"><p className="l">Em dia</p><p className="v" style={{ color: 'var(--ok)' }}>{emDia}</p></div>
      </div></div>

      {manut.length === 0 && <div className="px mt16"><div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhuma manutenção cadastrada. Use as sugestões abaixo ou toque em + para criar a sua.</p></div></div>}

      {atrasadas.length > 0 && (<>
        <div className="sec-h mt24"><h2>Atrasadas<span className="count">{atrasadas.length}</span></h2></div>
        <div className="px"><div className="list">{atrasadas.map(m => <Item key={m.id} m={m} />)}</div></div>
      </>)}

      {proximas.length > 0 && (<>
        <div className="sec-h mt24"><h2>Próximas</h2></div>
        <div className="px"><div className="list">{proximas.map(m => <Item key={m.id} m={m} />)}</div></div>
      </>)}

      <div className="sec-h mt24"><h2>Adicionar rápido</h2></div>
      <div className="hscroll">{SUGESTOES.map(([nome, dias]) => <button key={nome} className="pick" onClick={() => setNovo({ nome, intervalo_dias: dias })}><Plus size={15} className="i" />{nome}</button>)}</div>

      <div style={{ height: 12 }} />
      {novo && <FolhaManut inicial={novo} cats={cats} onFechar={() => setNovo(null)} onSalvo={recarregar} />}
    </>
  )
}

function FolhaManut({ inicial, cats, onFechar, onSalvo }) {
  const [f, setF] = useState({ nome: '', categoria_id: '', intervalo_dias: 30, ultima_execucao: '', observacoes: '', ...inicial })
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.nome) return
    const prox = f.ultima_execucao ? somarDias(f.ultima_execucao, Number(f.intervalo_dias)) : hoje()
    await supabase.from('manutencoes').insert({ nome: f.nome, categoria_id: f.categoria_id || null, intervalo_dias: Number(f.intervalo_dias), ultima_execucao: f.ultima_execucao || null, proxima: prox, observacoes: f.observacoes || null, ativo: true })
    onSalvo(); onFechar()
  }
  return (
    <Sheet titulo="Nova manutenção" onFechar={onFechar}>
      <div className="stack-y">
        <label className="field"><span className="l">O que precisa ser feito</span><input className="input" value={f.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex.: limpar a caixa d'água" /></label>
        <label className="field"><span className="l">Categoria</span><select className="input" value={f.categoria_id} onChange={e => set('categoria_id', e.target.value)}><option value="">Nenhuma</option>{cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
        <label className="field"><span className="l">Frequência</span><select className="input" value={f.intervalo_dias} onChange={e => set('intervalo_dias', e.target.value)}>{INTERVALOS.map(([d, t]) => <option key={d} value={d}>{t}</option>)}</select></label>
        <label className="field"><span className="l">Última vez que foi feita (opcional)</span><input className="input" type="date" value={f.ultima_execucao} onChange={e => set('ultima_execucao', e.target.value)} /></label>
        <button className="btn primary block" onClick={salvar}>Salvar manutenção</button>
      </div>
    </Sheet>
  )
}
