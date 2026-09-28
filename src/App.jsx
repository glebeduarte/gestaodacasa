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
import Manutencoes from './pages/Manutencoes'
import Documentos from './pages/Documentos'
import Estoque from './pages/Estoque'
import Fechamento from './pages/Fechamento'
import { FolhaDespesa } from './components/FolhaDespesa'

function Layout({ children }) {
  const [abrirDespesa, setAbrirDespesa] = useState(false)
  const loc = useLocation()
  const [abrirMais, setAbrirMais] = useState(false)
  const nav = [
    { to: '/', label: 'Início', ic: 'casa' },
    { to: '/categorias', label: 'Categorias', ic: 'grade' },
    { to: '/obras', label: 'Obras', ic: 'obra' },
    { to: '/pessoas', label: 'Pessoas', ic: 'pessoa' },
    { to: '/manutencoes', label: 'Manutenções', ic: 'ferramenta' },
    { to: '/documentos', label: 'Documentos', ic: 'doc' },
    { to: '/estoque', label: 'Estoque', ic: 'caixa' },
    { to: '/fechamento', label: 'Fechamento', ic: 'relatorio' },
    { to: '/admin', label: 'Admin', ic: 'engrenagem' },
  ]
  const mais = nav.slice(3)
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
        <NavLink to="/categorias" className={({ isActive }) => isActive ? 'ativo' : ''}><Ic n="grade" s={22} />Categorias</NavLink>
        <a href="#" className="fab" aria-label="Registrar despesa" onClick={e => { e.preventDefault(); setAbrirDespesa(true) }}><Ic n="mais" s={26} /></a>
        <NavLink to="/obras" className={({ isActive }) => isActive ? 'ativo' : ''}><Ic n="obra" s={22} />Obras</NavLink>
        <a href="#" className={mais.some(m => loc.pathname.startsWith(m.to)) ? 'ativo' : ''} onClick={e => { e.preventDefault(); setAbrirMais(true) }}><Ic n="menu" s={22} />Mais</a>
      </nav>
      {abrirDespesa && <FolhaDespesa onFechar={() => setAbrirDespesa(false)} />}
      {abrirMais && (
        <div className="folha-fundo" onClick={() => setAbrirMais(false)}>
          <div className="folha" onClick={e => e.stopPropagation()}>
            <div className="grade-2">
              {mais.map(n => <NavLink key={n.to} to={n.to} className="cartao" style={{ alignItems: 'center', gap: 8, padding: 18 }} onClick={() => setAbrirMais(false)}><Ic n={n.ic} s={24} /><span style={{ fontWeight: 700, fontSize: 14 }}>{n.label}</span></NavLink>)}
              <button className="cartao" style={{ alignItems: 'center', gap: 8, padding: 18, cursor: 'pointer', color: 'var(--cinza)' }} onClick={() => supabase.auth.signOut()}><Ic n="sair" s={24} /><span style={{ fontWeight: 700, fontSize: 14 }}>Sair</span></button>
            </div>
          </div>
        </div>
      )}
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
  )
}
