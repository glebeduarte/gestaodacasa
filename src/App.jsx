import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './supabase'
import { Home, LayoutGrid, Plus, Hammer, Menu, Users, Wrench, FileText, Package, BarChart3, Settings, LogOut, History, Receipt, ArrowLeftRight, ChevronDown, FileBarChart } from 'lucide-react'
import { q } from './hooks'
import { nomeUsuario, iniciais } from './util'
import { ToastProvider } from './components/ui/Toast'
import { FolhaDespesa } from './components/FolhaDespesa'
import Login from './pages/Login'
import Inicio from './pages/Inicio'
import Categorias from './pages/Categorias'
import Categoria from './pages/Categoria'
import Obras from './pages/Obras'
import Obra from './pages/Obra'
import Pessoas from './pages/Pessoas'
import Pessoa from './pages/Pessoa'
import Registros from './pages/Registros'
import Admin from './pages/Admin'
import Manutencoes from './pages/Manutencoes'
import Documentos from './pages/Documentos'
import Estoque from './pages/Estoque'
import Fechamento from './pages/Fechamento'
import Contas from './pages/Contas'
import Importar from './pages/Importar'
import Casas, { NovaCasa, ICONE_MOD } from './pages/Casas'
import Modulo from './pages/Modulo'
import Relatorios, { RelatorioObras } from './pages/Relatorios'
import Areas from './components/Areas'
import { AdicionarProvider, useAdicionar } from './components/Adicionar'
import { CapasProvider } from './lib/capas'
import { CasaProvider, useCasa } from './lib/casa'
import { MODULOS, nomeTipo } from './lib/tipos'

const BASE_MOD = { pessoas: { Icon: Users, cls: 'c-pessoas' }, obras: { Icon: Hammer, cls: 'c-obras' }, manutencoes: { Icon: Wrench, cls: 'c-manut', key: 'manut' }, estoque: { Icon: Package, cls: 'c-estoque', key: 'estoque' } }
const NOMES_CURTOS = { pessoas: 'Pessoas', obras: 'Obras', manutencoes: 'Manutenções', estoque: 'Estoque' }

// Monta os menus a partir dos módulos ligados na casa
function menus(casa) {
  const mods = (casa?.modulos || []).filter(m => MODULOS[m])
  const itensMod = mods.map(m => {
    const b = BASE_MOD[m]; const I = b?.Icon || ICONE_MOD[MODULOS[m].icone] || Wrench
    return { to: MODULOS[m].rota, label: NOMES_CURTOS[m] || MODULOS[m].nome, Icon: I, cls: b?.cls || 'c-docs', key: b?.key }
  })
  const MAIS = [
    { to: '/contas', label: 'Contas', Icon: Receipt, cls: 'c-fech', key: 'contas' },
    ...itensMod,
    { to: '/documentos', label: 'Documentos', Icon: FileText, cls: 'c-docs', key: 'docs' },
    { to: '/fechamento', label: 'Fechamento', Icon: BarChart3, cls: 'c-fech' },
    { to: '/relatorios', label: 'Relatórios', Icon: FileBarChart, cls: 'c-obras' },
    { to: '/casas', label: 'Minhas casas', Icon: ArrowLeftRight, cls: 'c-piscina' },
    { to: '/admin', label: 'Ajustes', Icon: Settings, cls: 'c-neutral' },
  ]
  const SIDE = [
    [
      { to: '/', label: 'Início', Icon: Home, end: true },
      { to: '/contas', label: 'Contas', Icon: Receipt, key: 'contas' },
      { to: '/areas', label: 'Áreas da casa', Icon: LayoutGrid },
      { to: '/categorias', label: 'Categorias', Icon: LayoutGrid },
      { to: '/historico', label: 'Histórico', Icon: History },
      { to: '/fechamento', label: 'Fechamento', Icon: BarChart3 },
      { to: '/relatorios', label: 'Relatórios', Icon: FileBarChart },
    ],
    [...itensMod, { to: '/documentos', label: 'Documentos', Icon: FileText, key: 'docs' }],
    [{ to: '/admin', label: 'Ajustes', Icon: Settings }],
  ]
  // 4º botão da barra inferior: o primeiro módulo ligado (ou Contas)
  const atalho = itensMod.find(i => i.to === '/pessoas') || itensMod.find(i => i.to === '/obras') || { to: '/relatorios', label: 'Relatórios', Icon: FileBarChart }
  return { MAIS, SIDE, atalho }
}

function Layout({ children, sessao }) {
  const [despesa, setDespesa] = useState(null)
  const { abrir } = useAdicionar()
  const [mais, setMais] = useState(false)
  const [pend, setPend] = useState({ manut: 0, docs: 0, estoque: 0, total: 0 })
  const loc = useLocation()
  useEffect(() => { q.pendencias().then(setPend); setMais(false) }, [loc.pathname])
  const { casa } = useCasa()
  const { MAIS, SIDE, atalho } = menus(casa)
  const naMais = (MAIS.some(m => m.to !== '/contas' && loc.pathname.startsWith(m.to)) || loc.pathname.startsWith('/categorias')) && !loc.pathname.startsWith(atalho.to)
  const email = sessao?.user?.email
  const nome = nomeUsuario(sessao?.user)

  return (
    <div className="app">
      <aside className="desk-side" aria-label="Menu principal">
        <div className="logo">Gestão Doméstica</div>
        <NavLink to="/casas" className="casa-switch"><ArrowLeftRight size={16} className="i" /><div style={{ minWidth: 0 }}><b>{casa?.nome}</b><small>{nomeTipo(casa?.tipo)} · trocar de casa</small></div></NavLink>
        <button className="side-add" onClick={() => abrir()}><Plus size={18} strokeWidth={2.6} />Adicionar</button>
        {SIDE.map((grupo, gi) => (
          <div key={gi}>
            {gi > 0 && <div className="side-sep" />}
            {grupo.map(n => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => isActive ? 'on' : ''}>
                <n.Icon size={18} className="i" />{n.label}
                {n.key && pend[n.key] > 0 && <span className="badge">{pend[n.key]}</span>}
              </NavLink>
            ))}
          </div>
        ))}
        <div className="side-user">
          <span className="avatar">{iniciais(nome)}</span>
          <div style={{ minWidth: 0 }}><p>{nome}</p><small>{email}</small></div>
        </div>
        <button className="sair" onClick={() => supabase.auth.signOut()}><LogOut size={16} className="i" />Sair</button>
      </aside>

      <main className="desk-main">
        {casa?.papel === 'leitura' && <div className="aviso-leitura">Você tem acesso só de leitura nesta casa.</div>}
        <div className="inner-wrap" key={loc.pathname}>{children}</div>
      </main>

      <nav className="nav" aria-label="Navegação">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'on' : ''}><Home size={23} className="i" /><span>Início</span></NavLink>
        <NavLink to="/contas" className={({ isActive }) => isActive ? 'on' : ''}><Receipt size={23} className="i" /><span>Contas</span>{pend.contas > 0 && <span className="navbadge">{pend.contas}</span>}</NavLink>
        <button className="mid" aria-label="Adicionar" onClick={() => abrir()}><span><Plus size={30} strokeWidth={2.4} /></span></button>
        <NavLink to="/areas" className={({ isActive }) => isActive || naMais ? 'on' : ''}><LayoutGrid size={23} className="i" /><span>Áreas</span>{pend.total - (pend.contas || 0) > 0 && <span className="navbadge">{pend.total - (pend.contas || 0)}</span>}</NavLink>
        <NavLink to={atalho.to} className={({ isActive }) => isActive ? 'on' : ''}><atalho.Icon size={23} className="i" /><span>{atalho.label}</span></NavLink>
      </nav>

      {mais && (
        <>
          <div className="sheet-bg" onClick={() => setMais(false)} />
          <div className="sheet-wrap" role="dialog" aria-label="Mais opções">
            <div className="handle" />
            <div className="moregrid">
              {MAIS.map(m => (
                <NavLink key={m.to} to={m.to} onClick={() => setMais(false)}>
                  {m.key && pend[m.key] > 0 && <span className="badge">{pend[m.key]}</span>}
                  <span className={`tile t-md ${m.cls}`}><m.Icon size={22} className="i" /></span>{m.label}
                </NavLink>
              ))}
              <button onClick={() => supabase.auth.signOut()}><span className="tile t-md c-neutral"><LogOut size={22} className="i" /></span>Sair</button>
            </div>
          </div>
        </>
      )}

      <button className="fab-desk" aria-label="Adicionar" onClick={() => abrir()}><Plus size={32} /></button>
      {despesa && <FolhaDespesa inicial={despesa} onFechar={() => setDespesa(null)} />}
    </div>
  )
}

export default function App() {
  const [sessao, setSessao] = useState(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  if (sessao === undefined) return <div className="carregando">Carregando…</div>
  if (!sessao) return <Login />
  return (
    <ToastProvider>
      <CasaProvider sessao={sessao}>
        <CapasProvider>
        <BrowserRouter>
        <AdicionarProvider>
          <Rotas sessao={sessao} />
        </AdicionarProvider>
        </BrowserRouter>
        </CapasProvider>
      </CasaProvider>
    </ToastProvider>
  )
}

function Rotas({ sessao }) {
  const { casas, casa } = useCasa()
  if (casas === null) return <div className="carregando">Carregando…</div>
  if (!casa) return (
    <div className="app sem-casa"><main className="desk-main"><div className="inner-wrap">
      <Routes><Route path="*" element={<NovaCasa />} /></Routes>
    </div></main></div>
  )
  const mods = casa.modulos || []
  return (
    <Layout sessao={sessao}>
      <Routes key={casa.id}>
        <Route path="/" element={<Inicio sessao={sessao} />} />
        <Route path="/casas" element={<Casas />} />
        <Route path="/casas/nova" element={<NovaCasa />} />
        <Route path="/areas" element={<Areas />} />
        <Route path="/categorias" element={<Categorias />} />
        <Route path="/categorias/:id" element={<Categoria />} />
        <Route path="/casa/:id" element={<Categoria />} />
        {mods.includes('obras') && <Route path="/obras" element={<Obras />} />}
        {mods.includes('obras') && <Route path="/obras/:id" element={<Obra />} />}
        {mods.includes('pessoas') && <Route path="/pessoas" element={<Pessoas />} />}
        {mods.includes('pessoas') && <Route path="/pessoas/:id" element={<Pessoa />} />}
        {mods.includes('manutencoes') && <Route path="/manutencoes" element={<Manutencoes />} />}
        {mods.includes('estoque') && <Route path="/estoque" element={<Estoque />} />}
        <Route path="/m/:mod" element={<Modulo />} />
        <Route path="/historico" element={<Registros />} />
        <Route path="/registros" element={<Navigate to="/historico" />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/contas" element={<Contas />} />
        <Route path="/importar" element={<Importar />} />
        <Route path="/fechamento" element={<Fechamento />} />
        <Route path="/relatorios" element={<Relatorios />} />
        {mods.includes('obras') && <Route path="/relatorios/obras" element={<RelatorioObras />} />}
        {mods.includes('obras') && <Route path="/relatorios/obras/:id" element={<RelatorioObras />} />}
        <Route path="/admin" element={<Admin sessao={sessao} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  )
}
