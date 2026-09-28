import { useState } from 'react'
import { supabase } from '../supabase'
import { Meander } from '../components/ui/Meander'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const entrar = async (e) => {
    e.preventDefault(); setErro(null); setOcupado(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('E-mail ou senha não conferem.')
    setOcupado(false)
  }
  return (
    <div className="login-wrap">
      <form onSubmit={entrar} className="login-card">
        <div className="hero" style={{ padding: '26px 22px 34px', marginBottom: 22 }}>
          <p className="eyebrow">Gestão da casa</p>
          <p className="hero-value" style={{ fontSize: 34, marginTop: 6 }}>Bem-vinda</p>
          <p className="hero-sub">Entre para cuidar da casa com tranquilidade</p>
          <Meander />
        </div>
        <label className="field" style={{ marginBottom: 14 }}><span className="l">E-mail</span><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></label>
        <label className="field" style={{ marginBottom: 14 }}><span className="l">Senha</span><input className="input" type="password" value={senha} onChange={e => setSenha(e.target.value)} autoComplete="current-password" required /></label>
        {erro && <p style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{erro}</p>}
        <button className="btn primary block" disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  )
}
