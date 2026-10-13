import { useNavigate, Link } from 'react-router-dom'
import { History, BarChart3, FileBarChart, ArrowLeftRight, Settings, LogOut, ChevronRight, Upload } from 'lucide-react'
import { supabase } from '../supabase'
import { useDados, soma } from '../hooks'
import { brl, hoje, mesAtual } from '../util'
import { SECOES } from '../lib/sectionThemes'
import { MODULOS } from '../lib/tipos'
import { useCasa } from '../lib/casa'
import { SectionTile, SectionHero } from './Secao'
import { useAdicionar } from './Adicionar'

// Seções que aparecem como "Áreas da casa", conforme os módulos ligados
export function areasDaCasa(casa) {
  const m = casa?.modulos || []
  const a = [
    { k: 'contas', to: '/contas', add: { tipo: 'conta' } },
    { k: 'categorias', to: '/categorias', add: { tipo: 'gasto' } },
  ]
  if (m.includes('pessoas')) a.push({ k: 'pessoas', to: '/pessoas', add: { tipo: 'pagamento' } })
  if (m.includes('obras')) a.push({ k: 'obras', to: '/obras', add: { tipo: 'obra' } })
  if (m.includes('manutencoes')) a.push({ k: 'manutencoes', to: '/manutencoes', add: { tipo: 'manutencao' } })
  if (m.includes('estoque')) a.push({ k: 'estoque', to: '/estoque', add: { tipo: 'estoque' } })
  ;['piscina', 'jardim', 'pets', 'veiculos', 'condominio', 'rural'].forEach(k => { if (m.includes(k)) a.push({ k, to: MODULOS[k].rota, modulo: k }) })
  a.push({ k: 'documentos', to: '/documentos' })
  return a
}

// Resumo curto de cada área ("3 pagas", "1 atrasada", "4 pessoas", valor do mês)
export function useResumoAreas() {
  const { casa } = useCasa()
  return useDados(async () => {
    const m = mesAtual(), hj = hoje()
    const nomesMod = Object.fromEntries(['piscina', 'jardim', 'pets', 'veiculos', 'condominio', 'rural'].map(k => [k, (MODULOS[k].categorias || []).map(c => c[0])]))
    const [contas, desp, pessoas, obras, manut, estoque, docs, cats] = await Promise.all([
      supabase.from('contas').select('pago_em,vencimento').or(`pago_em.is.null,pago_em.gte.${m.ini}`).then(r => r.data || []),
      supabase.from('despesas').select('valor,categoria_id').gte('data', m.ini).lte('data', m.fim).then(r => r.data || []),
      supabase.from('pessoas').select('id').eq('ativo', true).then(r => r.data || [], () => []),
      supabase.from('obras').select('id,status').then(r => r.data || [], () => []),
      supabase.from('manutencoes').select('proxima').eq('ativo', true).then(r => r.data || [], () => []),
      supabase.from('estoque_itens').select('quantidade,minimo').eq('ativo', true).then(r => r.data || [], () => []),
      supabase.from('documentos').select('id').then(r => r.data || [], () => []),
      supabase.from('categorias').select('id,nome').then(r => r.data || []),
    ])
    const atras = contas.filter(c => !c.pago_em && c.vencimento < hj).length
    const pagas = contas.filter(c => c.pago_em).length
    const r = {
      contas: atras ? `${atras} atrasada${atras > 1 ? 's' : ''}` : `${pagas} paga${pagas !== 1 ? 's' : ''}`,
      categorias: brl(soma(desp)),
      pessoas: `${pessoas.length} pessoa${pessoas.length !== 1 ? 's' : ''}`,
      obras: `${obras.filter(o => ['em_andamento', 'orcamento_pendente', 'pausada'].includes(o.status)).length} em andamento`,
      manutencoes: (() => { const n = manut.filter(x => x.proxima && x.proxima < hj).length; return n ? `${n} atrasada${n > 1 ? 's' : ''}` : 'em dia' })(),
      estoque: (() => { const n = estoque.filter(e => Number(e.quantidade) <= Number(e.minimo)).length; return n ? `${n} acabando` : `${estoque.length} itens` })(),
      documentos: `${docs.length} arquivo${docs.length !== 1 ? 's' : ''}`,
    }
    Object.entries(nomesMod).forEach(([k, nomes]) => { const ids = cats.filter(c => nomes.includes(c.nome)).map(c => c.id); r[k] = brl(soma(desp.filter(d => ids.includes(d.categoria_id)))) })
    return r
  }, [casa?.id])
}

export function GradeAreas() {
  const { casa } = useCasa()
  const nav = useNavigate()
  const { abrir } = useAdicionar()
  const { dados: resumo } = useResumoAreas()
  return (
    <div className="s-grid">
      {areasDaCasa(casa).map(a => { const s = SECOES[a.k]; return (
        <SectionTile key={a.k} chave={a.k} g={s.g} Icon={s.Icon} nome={s.nome} resumo={resumo?.[a.k] ?? ' '}
          onAbrir={() => nav(a.to)} onMais={a.add ? () => abrir(a.add) : a.modulo ? () => nav(a.to) : undefined} />
      ) })}
    </div>
  )
}

// Página "Áreas": todas as áreas da casa e os atalhos que antes ficavam no menu "Mais"
export default function Areas() {
  const { casa } = useCasa()
  const s = SECOES.categorias
  return (
    <>
      <SectionHero chave="areas" arteChave="categorias" g={s.g} Icon={s.Icon} titulo="Áreas da casa" subtitulo={casa?.nome} />
      <GradeAreas />
      <div className="sec-h mt24"><h2>Mais</h2></div>
      <div className="list">
        {[['/importar', 'Importar extrato', Upload], ['/historico', 'Histórico', History], ['/fechamento', 'Fechamento do mês', BarChart3], ['/relatorios', 'Relatórios', FileBarChart], ['/casas', 'Minhas casas', ArrowLeftRight], ['/admin', 'Ajustes', Settings]].map(([to, t, I]) => (
          <Link key={to} to={to} className="row"><span className="tile t-md c-neutral"><I size={20} className="i" /></span><div className="grow"><p className="t">{t}</p></div><ChevronRight size={18} className="i chev" /></Link>
        ))}
        <button className="row" onClick={() => supabase.auth.signOut()}><span className="tile t-md c-neutral"><LogOut size={20} className="i" /></span><div className="grow"><p className="t" style={{ textAlign: 'left' }}>Sair</p></div></button>
      </div>
    </>
  )
}
