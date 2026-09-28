import { useState } from 'react'
import { supabase } from '../supabase'

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
    <div className="login">
      <form className="caixa" onSubmit={entrar}>
        <div>
          <div className="sobre">Gestão da casa</div>
          <h1>Gestão da Casa</h1>
        </div>
        <div className="campo"><label htmlFor="email">E-mail</label><input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></div>
        <div className="campo"><label htmlFor="senha">Senha</label><input id="senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} autoComplete="current-password" required /></div>
        {erro && <p className="erro">{erro}</p>}
        <button className="btn largo" disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  )
}
