import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './supabase'
import { Home, LayoutGrid, Plus, Hammer, Menu, Users, Wrench, FileText, Package, BarChart3, Settings, LogOut, History } from 'lucide-react'
import { q } from './hooks'
import { primeiroNome, iniciais } from './util'
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

// Itens do menu "Mais" (celular) e da sidebar (desktop)
const MAIS = [
  { to: '/pessoas', label: 'Pessoas', Icon: Users, cls: 'c-pessoas' },
  { to: '/manutencoes', label: 'Manutenções', Icon: Wrench, cls: 'c-manut', key: 'manut' },
  { to: '/documentos', label: 'Documentos', Icon: FileText, cls: 'c-docs', key: 'docs' },
  { to: '/estoque', label: 'Estoque', Icon: Package, cls: 'c-estoque', key: 'estoque' },
  { to: '/fechamento', label: 'Fechamento', Icon: BarChart3, cls: 'c-fech' },
  { to: '/admin', label: 'Ajustes', Icon: Settings, cls: 'c-neutral' },
]

// Sidebar do desktop, em grupos: visão geral / o que precisa de cuidado / ajustes
const SIDE = [
  [
    { to: '/', label: 'Início', Icon: Home, end: true },
    { to: '/categorias', label: 'Categorias', Icon: LayoutGrid },
    { to: '/historico', label: 'Histórico', Icon: History },
    { to: '/fechamento', label: 'Fechamento', Icon: BarChart3 },
  ],
  [
    { to: '/obras', label: 'Obras', Icon: Hammer },
    { to: '/pessoas', label: 'Pessoas', Icon: Users },
    { to: '/manutencoes', label: 'Manutenções', Icon: Wrench, key: 'manut' },
    { to: '/estoque', label: 'Estoque', Icon: Package, key: 'estoque' },
    { to: '/documentos', label: 'Documentos', Icon: FileText, key: 'docs' },
  ],
  [
    { to: '/admin', label: 'Ajustes', Icon: Settings },
  ],
]

function Layout({ children, sessao }) {
  const [despesa, setDespesa] = useState(null)
  const [mais, setMais] = useState(false)
  const [pend, setPend] = useState({ manut: 0, docs: 0, estoque: 0, total: 0 })
  const loc = useLocation()
  useEffect(() => { q.pendencias().then(setPend); setMais(false) }, [loc.pathname])
  const naMais = MAIS.some(m => loc.pathname.startsWith(m.to))
  const email = sessao?.user?.email
  const nome = primeiroNome(email)

  return (
    <div className="app">
      <aside className="desk-side" aria-label="Menu principal">
        <div className="logo">Gestão da Casa<small>Casa Hylana</small></div>
        <button className="side-cta" onClick={() => setDespesa({})}><Plus size={18} strokeWidth={2.6} className="i" />Registrar gasto</button>
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
        <div className="inner-wrap" key={loc.pathname}>{children}</div>
      </main>

      <nav className="nav" aria-label="Navegação">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'on' : ''}><Home size={23} className="i" /><span>Início</span></NavLink>
        <NavLink to="/categorias" className={({ isActive }) => isActive ? 'on' : ''}><LayoutGrid size={23} className="i" /><span>Categorias</span></NavLink>
        <a href="#" className="fab" aria-label="Registrar gasto" onClick={e => { e.preventDefault(); setDespesa({}) }}><span><Plus size={28} strokeWidth={2.4} className="i" /></span><em>Registrar</em></a>
        <NavLink to="/obras" className={({ isActive }) => isActive ? 'on' : ''}><Hammer size={23} className="i" /><span>Obras</span></NavLink>
        <button className={naMais ? 'on' : ''} onClick={() => setMais(true)}><Menu size={23} className="i" /><span>Mais</span>{pend.total > 0 && <span className="navbadge">{pend.total}</span>}</button>
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
      <BrowserRouter>
        <Layout sessao={sessao}>
          <Routes>
            <Route path="/" element={<Inicio sessao={sessao} />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/categorias/:id" element={<Categoria />} />
            <Route path="/casa" element={<Navigate to="/categorias" />} />
            <Route path="/casa/:id" element={<Categoria />} />
            <Route path="/obras" element={<Obras />} />
            <Route path="/obras/:id" element={<Obra />} />
            <Route path="/pessoas" element={<Pessoas />} />
            <Route path="/pessoas/:id" element={<Pessoa />} />
            <Route path="/historico" element={<Registros />} />
            <Route path="/registros" element={<Navigate to="/historico" />} />
            <Route path="/manutencoes" element={<Manutencoes />} />
            <Route path="/documentos" element={<Documentos />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/fechamento" element={<Fechamento />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ToastProvider>
  )
}
