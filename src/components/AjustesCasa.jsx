import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, UserPlus, X, Check } from 'lucide-react'
import { supabase, definirCasaAtual } from '../supabase'
import { useCasa } from '../lib/casa'
import { TIPOS_CASA, MODULOS, pacoteInicial } from '../lib/tipos'
import { useToast } from './ui/Toast'
import { ICONE_MOD } from '../pages/Casas'
import { hoje } from '../util'
import { TEMAS, aplicarTema } from '../lib/temas'

const PAPEIS = { dono: 'Dono', editor: 'Editor', leitura: 'Só leitura' }

export function AjustesCasa() {
  const { casa, ehDono, recarregar, casas } = useCasa()
  const toast = useToast()
  const nav = useNavigate()
  const [f, setF] = useState({ nome: casa.nome, tipo: casa.tipo, cidade: casa.cidade || '', tema: casa.tema || 'egeu' })
  const temaSalvo = useRef(casa.tema)
  temaSalvo.current = casa.tema
  useEffect(() => () => aplicarTema(temaSalvo.current), [])
  const escolherTema = (t) => { setF(x => ({ ...x, tema: t })); aplicarTema(t) }
  const [membros, setMembros] = useState([])
  const [convites, setConvites] = useState([])
  const [conv, setConv] = useState({ email: '', papel: 'editor' })
  const carregarMembros = () => {
    supabase.rpc('membros_da_casa', { c: casa.id }).then(r => setMembros(r.data || []))
    supabase.from('casa_convites').select('*').eq('casa_id', casa.id).then(r => setConvites(r.data || []))
  }
  useEffect(carregarMembros, [casa.id])

  const salvarCasa = async () => {
    if (!f.nome.trim()) return toast({ txt: 'Dê um nome para a casa.', erro: true })
    try { await supabase.from('casas').update({ nome: f.nome.trim(), tipo: f.tipo, cidade: f.cidade || null, tema: f.tema }).eq('id', casa.id); await recarregar(casa.id); toast('Casa atualizada') } catch { aplicarTema(casa.tema) }
  }

  // Ligar módulo cria o que falta (categorias, manutenções, estoque); desligar só esconde
  const alternarModulo = async (m) => {
    const liga = !casa.modulos.includes(m)
    const modulos = liga ? [...casa.modulos, m] : casa.modulos.filter(x => x !== m)
    try {
      await supabase.from('casas').update({ modulos }).eq('id', casa.id)
      if (liga) {
        const p = pacoteInicial(casa.tipo, modulos)
        const doMod = (MODULOS[m].categorias || []).map(c => c[0])
        const { data: existentes } = await supabase.from('categorias').select('id,nome')
        const ja = new Set((existentes || []).map(c => c.nome))
        const novas = p.categorias.filter(c => doMod.includes(c.nome) && !ja.has(c.nome))
        let todas = existentes || []
        if (novas.length) { const { data } = await supabase.from('categorias').insert(novas.map((c, i) => ({ nome: c.nome, icone: c.icone, cor: c.cor, ordem: 50 + i, ativo: true }))).select('id,nome'); todas = [...todas, ...(data || [])] }
        const idCat = (n) => todas.find(c => c.nome === n)?.id || null
        const doModulo = (lista) => lista.filter(x => x.origem === MODULOS[m].nome || m === 'manutencoes' || m === 'estoque')
        const [{ data: mexist }, { data: eexist }] = await Promise.all([supabase.from('manutencoes').select('nome'), supabase.from('estoque_itens').select('nome')])
        const mja = new Set((mexist || []).map(x => x.nome)), eja = new Set((eexist || []).map(x => x.nome))
        const man = doModulo(p.manutencoes).filter(x => !mja.has(x.nome))
        const est = doModulo(p.estoque).filter(x => !eja.has(x.nome))
        if (man.length) await supabase.from('manutencoes').insert(man.map(x => ({ nome: x.nome, intervalo_dias: x.intervalo_dias, categoria_id: idCat(x.categoria), proxima: hoje(), ativo: true })))
        if (est.length) await supabase.from('estoque_itens').insert(est.map(x => ({ nome: x.nome, unidade: x.unidade, minimo: x.minimo, quantidade: 0, categoria_id: idCat(x.categoria), ativo: true })))
        toast(`${MODULOS[m].nome} ativado${novas.length + man.length + est.length ? ' com itens padrão' : ''}`)
      } else toast(`${MODULOS[m].nome} desativado (os dados ficam guardados)`)
      await recarregar(casa.id)
    } catch { /* aviso já mostrado */ }
  }

  const convidar = async () => {
    const email = conv.email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast({ txt: 'Informe um e-mail válido.', erro: true })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('casa_convites').upsert({ casa_id: casa.id, email, papel: conv.papel, convidado_por: user.id }, { onConflict: 'casa_id,email' })
      setConv({ email: '', papel: 'editor' }); carregarMembros()
      toast('Convite registrado. A pessoa entra com esse e-mail (ou cria a conta) e a casa aparece para ela.')
    } catch { /* aviso já mostrado */ }
  }
  const mudarPapel = async (m, papel) => { try { await supabase.from('casa_membros').update({ papel }).eq('casa_id', casa.id).eq('user_id', m.user_id); carregarMembros() } catch { /* aviso já mostrado */ } }
  const remover = async (m) => {
    if (membros.filter(x => x.papel === 'dono').length === 1 && m.papel === 'dono') return toast({ txt: 'A casa precisa de pelo menos um dono.', erro: true })
    if (!confirm(`Remover ${m.nome} desta casa?`)) return
    try { await supabase.from('casa_membros').delete().eq('casa_id', casa.id).eq('user_id', m.user_id); carregarMembros() } catch { /* aviso já mostrado */ }
  }
  const cancelarConvite = async (c) => { try { await supabase.from('casa_convites').delete().eq('id', c.id); carregarMembros() } catch { /* aviso já mostrado */ } }
  const excluirCasa = async () => {
    const txt = prompt(`Isto apaga a casa "${casa.nome}" e TODOS os dados dela (contas, gastos, pessoas, obras). Não dá para desfazer.\n\nDigite o nome da casa para confirmar:`)
    if (txt?.trim() !== casa.nome) return
    try { await supabase.from('casas').delete().eq('id', casa.id); const outra = casas.find(c => c.id !== casa.id); definirCasaAtual(outra?.id || null); await recarregar(outra?.id); nav(outra ? '/' : '/casas/nova') } catch { /* aviso já mostrado */ }
  }

  return (
    <section className="px mt16 stack-y">
      <div className="card stack-y">
        <label className="field"><span className="l">Nome da casa</span><input className="input" value={f.nome} disabled={!ehDono} onChange={e => setF(x => ({ ...x, nome: e.target.value }))} /></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}><span className="l">Tipo</span><select className="input" value={f.tipo} disabled={!ehDono} onChange={e => setF(x => ({ ...x, tipo: e.target.value }))}>{Object.entries(TIPOS_CASA).map(([k, t]) => <option key={k} value={k}>{t.nome}</option>)}</select></label>
          <label className="field" style={{ flex: 1 }}><span className="l">Cidade</span><input className="input" value={f.cidade} disabled={!ehDono} onChange={e => setF(x => ({ ...x, cidade: e.target.value }))} /></label>
        </div>
        <div className="field"><span className="l">Cor do tema</span>
          <div className="temas">{Object.entries(TEMAS).map(([k, t]) => (
            <button key={k} type="button" disabled={!ehDono} className={`tema ${f.tema === k ? 'on' : ''}`} onClick={() => escolherTema(k)} aria-label={t.nome}>
              <span style={{ background: `linear-gradient(150deg,${t.hero[0]},${t.hero[2]})` }}>{f.tema === k && <Check size={16} strokeWidth={3} className="i" />}</span><small>{t.nome}</small>
            </button>))}</div>
          {ehDono && f.tema !== (casa.tema || 'egeu') && <p className="muted" style={{ marginTop: 6 }}>Prévia aplicada. Toque em Salvar para manter.</p>}
        </div>
        {ehDono && <button className="btn primary" onClick={salvarCasa}><Check size={16} className="i" />Salvar</button>}
      </div>

      <div className="card">
        <p className="step" style={{ margin: '0 0 4px' }}>Módulos</p>
        <p className="muted" style={{ marginBottom: 6 }}>Ao ligar, o módulo cria as categorias e cuidados padrão que faltarem. Ao desligar, ele só sai do menu: os dados continuam guardados.</p>
        {Object.entries(MODULOS).map(([k, m]) => { const I = ICONE_MOD[m.icone]; const on = casa.modulos.includes(k); return (
          <div key={k} className="mod-toggle">
            <span className="tile t-md c-docs">{I && <I size={20} className="i" />}</span>
            <div className="grow" style={{ flex: 1 }}><b style={{ fontSize: 14 }}>{m.nome}</b><p className="muted" style={{ fontSize: 12 }}>{m.desc}</p></div>
            <button type="button" className={`switch ${on ? 'on' : ''}`} disabled={!ehDono} onClick={() => alternarModulo(k)} aria-label={`${on ? 'Desligar' : 'Ligar'} ${m.nome}`} />
          </div>) })}
        {!ehDono && <p className="muted" style={{ marginTop: 8 }}>Só o dono da casa muda os módulos.</p>}
      </div>

      <div className="card">
        <p className="step" style={{ margin: '0 0 8px' }}>Quem tem acesso</p>
        <div className="list" style={{ boxShadow: 'none' }}>
          {membros.map(m => (
            <div key={m.user_id} className="row">
              <div className="grow"><p className="t">{m.nome}</p><p className="s">{m.email}</p></div>
              {ehDono ? <select className="input" style={{ width: 120, height: 36 }} value={m.papel} onChange={e => mudarPapel(m, e.target.value)}>{Object.entries(PAPEIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select> : <span className="chip">{PAPEIS[m.papel]}</span>}
              {ehDono && <button className="iconbtn" style={{ width: 34, height: 34 }} onClick={() => remover(m)} aria-label="Remover"><X size={16} className="i" /></button>}
            </div>))}
          {convites.map(c => (
            <div key={c.id} className="row"><div className="grow"><p className="t">{c.email}</p><p className="s">convite pendente · {PAPEIS[c.papel]}</p></div>
              {ehDono && <button className="iconbtn" style={{ width: 34, height: 34 }} onClick={() => cancelarConvite(c)} aria-label="Cancelar convite"><X size={16} className="i" /></button>}</div>))}
        </div>
        {ehDono && (
          <div className="stack-y mt12">
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" style={{ flex: 1 }} type="email" placeholder="E-mail de quem vai acessar" value={conv.email} onChange={e => setConv(x => ({ ...x, email: e.target.value }))} />
              <select className="input" style={{ width: 120 }} value={conv.papel} onChange={e => setConv(x => ({ ...x, papel: e.target.value }))}>{Object.entries(PAPEIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </div>
            <button className="btn soft" onClick={convidar}><UserPlus size={16} className="i" />Convidar</button>
            <p className="muted">Editor lança e edita tudo. Só leitura apenas consulta. Dono também gerencia módulos e pessoas com acesso.</p>
          </div>
        )}
      </div>

      {ehDono && <button className="btn block" style={{ color: 'var(--danger)' }} onClick={excluirCasa}><Trash2 size={16} className="i" />Excluir esta casa</button>}
    </section>
  )
}
