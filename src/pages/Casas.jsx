import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Check, ChevronRight, ChevronLeft, Users, Hammer, Wrench, Package, Waves, Leaf, PawPrint, Car, Building2, Building, Tractor, Home, TriangleAlert } from 'lucide-react'
import { supabase, definirCasaAtual, semAviso } from '../supabase'
import { useCasa } from '../lib/casa'
import { TIPOS_CASA, MODULOS, pacoteInicial, nomeTipo } from '../lib/tipos'
import { useToast } from '../components/ui/Toast'
import { brl, hoje, mesAtual } from '../util'

export const ICONE_MOD = { Users, Hammer, Wrench, Package, Waves, Leaf, PawPrint, Car, Building2, Building, Tractor, Home }
const Ico = ({ nome, size = 22 }) => { const I = ICONE_MOD[nome] || Home; return <I size={size} className="i" /> }

// Lista de casas do usuário
export default function Casas() {
  const { casas, casa, trocar } = useCasa()
  const nav = useNavigate()
  const [resumo, setResumo] = useState({})
  useEffect(() => {
    if (!casas?.length) return
    const ids = casas.map(c => c.id), m = mesAtual()
    Promise.all([
      semAviso('contas').select('casa_id').in('casa_id', ids).is('pago_em', null).lt('vencimento', hoje()),
      semAviso('despesas').select('casa_id,valor').in('casa_id', ids).gte('data', m.ini).lte('data', m.fim),
    ]).then(([a, d]) => {
      const r = {}
      ;(a.data || []).forEach(x => { r[x.casa_id] = r[x.casa_id] || { atras: 0, gasto: 0 }; r[x.casa_id].atras++ })
      ;(d.data || []).forEach(x => { r[x.casa_id] = r[x.casa_id] || { atras: 0, gasto: 0 }; r[x.casa_id].gasto += Number(x.valor) })
      setResumo(r)
    })
  }, [casas])
  if (!casas) return <p className="carregando">Carregando…</p>
  return (
    <>
      <header className="hdr"><div><p className="eyebrow">Gestão Doméstica</p><h1>Minhas casas</h1></div></header>
      <section className="px stack-y">
        {casas.map(c => (
          <button key={c.id} className={`card casa-card ${casa?.id === c.id ? 'on' : ''}`} onClick={() => { trocar(c.id); nav('/') }}>
            <span className="tile t-lg c-piscina"><Ico nome={TIPOS_CASA[c.tipo]?.icone} size={26} /></span>
            <div className="grow"><h3>{c.nome}</h3><p className="sub">{nomeTipo(c.tipo)}{c.cidade ? ` · ${c.cidade}` : ''} · {c.papel === 'dono' ? 'dono' : c.papel === 'leitura' ? 'só leitura' : 'editor'}</p>
              <div className="chips" style={{ marginTop: 6 }}>
                <span className="chip">{brl(resumo[c.id]?.gasto || 0)} no mês</span>
                {resumo[c.id]?.atras > 0 && <span className="chip danger"><TriangleAlert size={12} className="i" />{resumo[c.id].atras} atrasada{resumo[c.id].atras > 1 ? 's' : ''}</span>}
              </div></div>
            <ChevronRight size={20} className="i chev" />
          </button>
        ))}
        {casas.length === 0 && <div className="tip"><p className="s" style={{ marginTop: 0 }}>Você ainda não tem nenhuma casa. Crie a primeira para começar.</p></div>}
        <button className="btn primary block" onClick={() => nav('/casas/nova')}><Plus size={18} className="i" />Nova casa</button>
      </section>
      <div style={{ height: 12 }} />
    </>
  )
}

// Assistente: 1 nome e tipo, 2 módulos, 3 revisar o que será criado
export function NovaCasa() {
  const { recarregar, casas } = useCasa()
  const nav = useNavigate()
  const toast = useToast()
  const [passo, setPasso] = useState(1)
  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [tipo, setTipo] = useState('residencial')
  const [mods, setMods] = useState(TIPOS_CASA.residencial.modulos)
  const [fora, setFora] = useState({})
  const [criando, setCriando] = useState(false)
  const escolherTipo = (t) => { setTipo(t); setMods(TIPOS_CASA[t].modulos) }
  const pacote = useMemo(() => pacoteInicial(tipo, mods), [tipo, mods])
  const marca = (k) => !fora[k]
  const alterna = (k) => setFora(x => ({ ...x, [k]: !x[k] }))

  const criar = async () => {
    if (!nome.trim()) return setPasso(1)
    setCriando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: c } = await supabase.from('casas').insert({ nome: nome.trim(), tipo, modulos: mods, cidade: cidade || null, criado_por: user.id }).select('id').single()
      definirCasaAtual(c.id)
      const cats = pacote.categorias.filter(x => marca('c:' + x.nome))
      const { data: criadas } = await supabase.from('categorias').insert(cats.map((x, i) => ({ casa_id: c.id, nome: x.nome, icone: x.icone, cor: x.cor, ordem: i + 1, ativo: true }))).select('id,nome')
      const idCat = (n) => (criadas || []).find(x => x.nome === n)?.id || null
      const man = pacote.manutencoes.filter(x => marca('m:' + x.nome))
      if (man.length) await supabase.from('manutencoes').insert(man.map(x => ({ casa_id: c.id, nome: x.nome, intervalo_dias: x.intervalo_dias, categoria_id: idCat(x.categoria), proxima: hoje(), ativo: true })))
      const est = pacote.estoque.filter(x => marca('e:' + x.nome))
      if (est.length) await supabase.from('estoque_itens').insert(est.map(x => ({ casa_id: c.id, nome: x.nome, unidade: x.unidade, minimo: x.minimo, quantidade: 0, categoria_id: idCat(x.categoria), ativo: true })))
      await recarregar(c.id)
      toast(`${nome.trim()} criada`); nav('/')
    } catch (e) { toast({ txt: e.message, erro: true }); setCriando(false) }
  }

  return (
    <>
      <div className="backbar">{passo > 1 ? <button className="iconbtn" onClick={() => setPasso(p => p - 1)} aria-label="Voltar"><ChevronLeft size={22} className="i" /></button> : casas?.length ? <button className="iconbtn" onClick={() => nav('/casas')} aria-label="Voltar"><ChevronLeft size={22} className="i" /></button> : <span style={{ width: 42 }} />}
        <div className="t">Nova casa · {passo} de 3</div><span style={{ width: 42 }} /></div>

      {passo === 1 && (
        <div className="px mt16 stack-y">
          <label className="field"><span className="l">Nome da casa</span><input className="input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Casa da praia, Sítio Boa Vista" autoFocus /></label>
          <label className="field"><span className="l">Cidade (opcional)</span><input className="input" value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Natal/RN" /></label>
          <div className="field"><span className="l">Tipo</span>
            <div className="stack-y">{Object.entries(TIPOS_CASA).map(([k, t]) => (
              <button key={k} type="button" className={`opcao ${tipo === k ? 'on' : ''}`} onClick={() => escolherTipo(k)}>
                <span className="tile t-md c-piscina"><Ico nome={t.icone} /></span>
                <div className="grow"><b>{t.nome}</b><small>{t.desc}</small></div>
                {tipo === k && <Check size={20} className="i" />}
              </button>))}</div></div>
          <button className="btn primary block" disabled={!nome.trim()} onClick={() => setPasso(2)}>Continuar<ChevronRight size={18} className="i" /></button>
        </div>
      )}

      {passo === 2 && (
        <div className="px mt16 stack-y">
          <p className="muted">Já vêm marcados os módulos mais comuns para <b>{TIPOS_CASA[tipo].nome.toLowerCase()}</b>. Contas, categorias, histórico, fechamento e documentos fazem parte de toda casa. Dá para mudar os módulos depois, em Ajustes.</p>
          {Object.entries(MODULOS).map(([k, m]) => (
            <button key={k} type="button" className={`opcao ${mods.includes(k) ? 'on' : ''}`} onClick={() => setMods(x => x.includes(k) ? x.filter(y => y !== k) : [...x, k])}>
              <span className="tile t-md c-docs"><Ico nome={m.icone} /></span>
              <div className="grow"><b>{m.nome}{TIPOS_CASA[tipo].modulos.includes(k) && <span className="chip pool" style={{ marginLeft: 6, height: 20, fontSize: 10.5 }}>sugerido</span>}</b><small>{m.desc}</small></div>
              <span className={`ck-box ${mods.includes(k) ? 'on' : ''}`}>{mods.includes(k) && <Check size={15} strokeWidth={3} className="i" />}</span>
            </button>
          ))}
          <button className="btn primary block" onClick={() => setPasso(3)}>Continuar<ChevronRight size={18} className="i" /></button>
        </div>
      )}

      {passo === 3 && (
        <div className="px mt16 stack-y">
          <p className="muted">Isto será criado em <b>{nome}</b>. Desmarque o que não quiser.</p>
          <Bloco titulo="Categorias" itens={pacote.categorias.map(x => ['c:' + x.nome, x.nome])} marca={marca} alterna={alterna} />
          {pacote.manutencoes.length > 0 && <Bloco titulo="Manutenções agendadas" itens={pacote.manutencoes.map(x => ['m:' + x.nome, x.nome, intervaloTxt(x.intervalo_dias)])} marca={marca} alterna={alterna} />}
          {pacote.estoque.length > 0 && <Bloco titulo="Itens de estoque" itens={pacote.estoque.map(x => ['e:' + x.nome, x.nome, `mínimo ${x.minimo} ${x.unidade}`])} marca={marca} alterna={alterna} />}
          <button className="btn primary block" onClick={criar} disabled={criando}><Check size={18} className="i" />{criando ? 'Criando…' : 'Criar casa'}</button>
        </div>
      )}
      <div style={{ height: 16 }} />
    </>
  )
}

const intervaloTxt = (d) => d <= 7 ? 'toda semana' : d <= 15 ? 'a cada 15 dias' : d <= 31 ? 'todo mês' : d <= 95 ? `a cada ${Math.round(d / 30)} meses` : d <= 185 ? 'a cada 6 meses' : 'uma vez por ano'

function Bloco({ titulo, itens, marca, alterna }) {
  return (
    <div className="card">
      <p className="step" style={{ margin: '0 0 8px' }}>{titulo} · {itens.filter(([k]) => marca(k)).length}</p>
      <div className="ck-list" style={{ marginTop: 0 }}>{itens.map(([k, n, s]) => (
        <button key={k} type="button" className={`ck-row ${marca(k) ? 'on-sel' : 'off'}`} onClick={() => alterna(k)}>
          <span className={`ck-box ${marca(k) ? 'on' : ''}`}>{marca(k) && <Check size={15} strokeWidth={3} className="i" />}</span>
          <span className="ck-t">{n}{s && <small style={{ color: 'var(--muted)' }}>{s}</small>}</span>
        </button>))}</div>
    </div>
  )
}
