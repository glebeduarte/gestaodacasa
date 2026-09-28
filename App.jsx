import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './supabase'
import { Ic } from './components/Icones'
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
import { FolhaDespesa } from './components/FolhaDespesa'

function Layout({ children }) {
  const [abrirDespesa, setAbrirDespesa] = useState(false)
  const loc = useLocation()
  const nav = [
    { to: '/', label: 'Início', ic: 'casa' },
    { to: '/casa', label: 'Casa', ic: 'grade' },
    { to: '/obras', label: 'Obras', ic: 'obra' },
    { to: '/pessoas', label: 'Pessoas', ic: 'pessoa' },
    { to: '/registros', label: 'Registros', ic: 'doc' },
    { to: '/admin', label: 'Admin', ic: 'engrenagem' },
  ]
  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">Gestão da Casa</div>
        {nav.map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => isActive ? 'ativo' : ''}>
            <Ic n={n.ic} s={18} />{n.label}
          </NavLink>
        ))}
        <div className="rodape">
          <button className="sair" onClick={() => supabase.auth.signOut()}>Sair</button>
        </div>
      </nav>
      <main className="conteudo" key={loc.pathname}>{children}</main>
      <nav className="nav-mobile">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'ativo' : ''}><Ic n="casa" s={22} />Início</NavLink>
        <NavLink to="/casa" className={({ isActive }) => isActive ? 'ativo' : ''}><Ic n="grade" s={22} />Casa</NavLink>
        <a href="#" className="fab" aria-label="Registrar despesa" onClick={e => { e.preventDefault(); setAbrirDespesa(true) }}><Ic n="mais" s={26} /></a>
        <NavLink to="/obras" className={({ isActive }) => isActive ? 'ativo' : ''}><Ic n="obra" s={22} />Obras</NavLink>
        <NavLink to="/pessoas" className={({ isActive }) => isActive ? 'ativo' : ''}><Ic n="pessoa" s={22} />Pessoas</NavLink>
      </nav>
      {abrirDespesa && <FolhaDespesa onFechar={() => setAbrirDespesa(false)} />}
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
  if (sessao === undefined) return <div className="carregando" style={{ padding: 40 }}>Carregando…</div>
  if (!sessao) return <Login />
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/casa" element={<Categorias />} />
          <Route path="/casa/:id" element={<Categoria />} />
          <Route path="/obras" element={<Obras />} />
          <Route path="/obras/:id" element={<Obra />} />
          <Route path="/pessoas" element={<Pessoas />} />
          <Route path="/pessoas/:id" element={<Pessoa />} />
          <Route path="/registros" element={<Registros />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
