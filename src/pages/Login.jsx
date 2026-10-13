import { useState } from 'react'
import { supabase } from '../supabase'
import { Meander } from '../components/ui/Meander'

export default function Login({ modoInicial = 'entrar', onVoltar }) {
  const [modo, setModo] = useState(modoInicial)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const enviar = async (e) => {
    e.preventDefault(); setErro(null); setAviso(null); setOcupado(true)
    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) setErro(/confirm/i.test(error.message) ? 'Confirme seu e-mail pelo link que enviamos antes de entrar.' : 'E-mail ou senha não conferem.')
    } else if (modo === 'criar') {
      if (senha.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); setOcupado(false); return }
      const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { data: { nome: nome.trim() }, emailRedirectTo: window.location.origin } })
      if (error) setErro(/registered|already/i.test(error.message) ? 'Já existe uma conta com este e-mail. Use "Entrar".' : error.message)
      else if (!data.session) setAviso('Conta criada. Enviamos um link de confirmação para o seu e-mail; depois é só entrar.')
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      if (error) setErro(error.message); else setAviso('Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.')
    }
    setOcupado(false)
  }
  return (
    <div className="login-wrap">
      {onVoltar && <button className="lp-voltar" onClick={onVoltar}>← Conhecer o app</button>}
      <form onSubmit={enviar} className="login-card">
        <div className="hero" style={{ padding: '26px 22px 34px', marginBottom: 22 }}>
          <p className="eyebrow">Gestão Doméstica</p>
          <p className="hero-value" style={{ fontSize: 34, marginTop: 6 }}>{modo === 'criar' ? 'Criar conta' : modo === 'senha' ? 'Nova senha' : 'Bem-vindo'}</p>
          <p className="hero-sub">Contas, pessoas, obras e cuidados de cada casa, num lugar só</p>
          <Meander />
        </div>
        {modo === 'criar' && <label className="field" style={{ marginBottom: 14 }}><span className="l">Seu nome</span><input className="input" value={nome} onChange={e => setNome(e.target.value)} autoComplete="given-name" required /></label>}
        <label className="field" style={{ marginBottom: 14 }}><span className="l">E-mail</span><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></label>
        {modo !== 'senha' && <label className="field" style={{ marginBottom: 14 }}><span className="l">Senha</span><input className="input" type="password" value={senha} onChange={e => setSenha(e.target.value)} autoComplete={modo === 'criar' ? 'new-password' : 'current-password'} required /></label>}
        {erro && <p style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{erro}</p>}
        {aviso && <p style={{ color: 'var(--ok)', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{aviso}</p>}
        <button className="btn primary block" disabled={ocupado}>{ocupado ? 'Aguarde…' : modo === 'criar' ? 'Criar conta' : modo === 'senha' ? 'Enviar link' : 'Entrar'}</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 13.5 }}>
          {modo === 'entrar' ? <button type="button" className="link" onClick={() => setModo('criar')}>Criar conta</button> : <button type="button" className="link" onClick={() => setModo('entrar')}>Já tenho conta</button>}
          {modo === 'entrar' && <button type="button" className="link" onClick={() => setModo('senha')}>Esqueci a senha</button>}
        </div>
      </form>
    </div>
  )
}
