import { useEffect, useState } from 'react'
import { Plus, Search, FileUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useDados, soma } from '../hooks'
import { brl, mesAtual } from '../util'
import { SectionHero, QuickAdd } from '../components/Secao'
import { SECOES } from '../lib/sectionThemes'
import { pagarConta } from '../lib/contas'
import { hoje } from '../util'
import { useToast } from '../components/ui/Toast'
import { ContaLinha, FolhaConta, FolhaVerConta, FolhaPagarConta } from '../components/FolhaConta'
import { statusConta, gerarContasMes, TIPOS_CONTA } from '../lib/contas'

// Ações comuns às telas que listam contas
export function useAcoesConta(recarregar) {
  const [nova, setNova] = useState(null)
  const [ver, setVer] = useState(null)
  const [pagar, setPagar] = useState(null)
  const folhas = (<>
    {nova && <FolhaConta inicial={nova} onFechar={() => setNova(null)} onSalvo={recarregar} />}
    {ver && <FolhaVerConta conta={ver} onFechar={() => setVer(null)} onSalvo={recarregar} onEditar={(c) => { setVer(null); setNova(c) }} />}
    {pagar && <FolhaPagarConta conta={pagar} onFechar={() => setPagar(null)} onSalvo={recarregar} />}
  </>)
  return { abrirNova: (ini = {}) => setNova(ini), abrir: setVer, pagar: setPagar, folhas }
}

export default function Contas() {
  const [aba, setAba] = useState('abertas')
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('')
  useEffect(() => { gerarContasMes() }, [])
  const { dados, recarregar } = useDados(async () => {
    await gerarContasMes()
    const r = await supabase.from('contas').select('*, categorias(*)').order('vencimento', { ascending: false }).limit(500)
    return { contas: r.data || [] }
  })
  const acoes = useAcoesConta(recarregar)
  const toast = useToast()
  if (!dados) return <p className="carregando">Carregando…</p>
  const m = mesAtual()
  const contas = dados.contas.map(c => ({ ...c, st: statusConta(c) }))
  const atrasadas = contas.filter(c => c.st === 'atrasada').sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  const avencer = contas.filter(c => c.st === 'avencer').sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  const pagasMes = contas.filter(c => c.st === 'paga' && c.pago_em >= m.ini && c.pago_em <= m.fim)
  const filtrar = (l) => l.filter(c => (!tipo || c.tipo_conta === tipo) && (!busca || `${c.descricao} ${c.fornecedor || ''} ${c.categorias?.nome || ''}`.toLowerCase().includes(busca.toLowerCase())))
  const todas = filtrar(contas)

  return (
    <>
      <SectionHero chave="contas" g={SECOES.contas.g} Icon={SECOES.contas.Icon} titulo="Contas da casa" subtitulo="Luz, água, internet e afins do mês" valor={brl(soma(pagasMes) + soma(avencer) + soma(atrasadas))}>
        <div className="btnrow mt12"><button className="btn sm" onClick={() => acoes.abrirNova()}><Plus size={15} className="i" />Por foto ou manual</button><Link className="btn sm" to="/importar"><FileUp size={15} className="i" />Importar extrato</Link></div>
      </SectionHero>

      <div className="s-stats">
        <div className="stat"><span>Atrasadas</span><b className="num" style={{ color: 'var(--danger)' }}>{brl(soma(atrasadas))}</b><p className="muted">{atrasadas.length} conta{atrasadas.length !== 1 ? 's' : ''}</p></div>
        <div className="stat"><span>A vencer</span><b className="num">{brl(soma(avencer))}</b><p className="muted">{avencer.length} conta{avencer.length !== 1 ? 's' : ''}</p></div>
        <div className="stat"><span>Pagas</span><b className="num" style={{ color: 'var(--ok)' }}>{brl(soma(pagasMes))}</b><p className="muted">{pagasMes.length} conta{pagasMes.length !== 1 ? 's' : ''}</p></div>
      </div>

      <div className="sec-h mt24"><h2>Nova conta</h2></div>
      <QuickAdd placeholder="Nome da conta (já paga hoje)" onSalvar={async (d, v) => {
        if (!v) { toast({ txt: 'Informe o valor.', erro: true }); throw new Error('sem valor') }
        const { data: c } = await supabase.from('contas').insert({ tipo_conta: 'outro', descricao: d || 'Conta', valor: v, vencimento: hoje(), referencia: `${hoje().slice(0, 7)}-01`, origem: 'manual', detalhes: {} }).select('*').single()
        await pagarConta(c, hoje(), 'Pix'); toast('Salvo'); recarregar()
      }} />

      <div className="px mt16"><div className="seg">
        <button className={aba === 'abertas' ? 'on' : ''} onClick={() => setAba('abertas')}>Em aberto · {atrasadas.length + avencer.length}</button>
        <button className={aba === 'todas' ? 'on' : ''} onClick={() => setAba('todas')}>Histórico</button>
      </div></div>

      {aba === 'abertas' ? (<>
        {atrasadas.length > 0 && <section className="sec"><div className="sec-h"><h2>Atrasadas</h2></div><div className="px stack-y">{atrasadas.map(c => <ContaLinha key={c.id} c={c} onAbrir={acoes.abrir} onPagar={acoes.pagar} />)}</div></section>}
        <section className="sec"><div className="sec-h"><h2>A vencer</h2></div><div className="px stack-y">
          {avencer.length === 0 ? <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhuma conta a vencer. Toque em + para adicionar uma conta por foto, PDF ou manualmente.</p></div>
            : avencer.map(c => <ContaLinha key={c.id} c={c} onAbrir={acoes.abrir} onPagar={acoes.pagar} />)}</div></section>
        {pagasMes.length > 0 && <section className="sec"><div className="sec-h"><h2>Pagas em {m.label.split(' ')[0]}</h2></div><div className="px stack-y">{pagasMes.map(c => <ContaLinha key={c.id} c={c} onAbrir={acoes.abrir} />)}</div></section>}
      </>) : (<>
        <div className="px mt16" style={{ display: 'flex', gap: 8 }}>
          <label className="input" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}><Search size={16} className="i" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar conta ou fornecedor" style={{ border: 0, outline: 0, flex: 1, background: 'transparent', font: 'inherit' }} /></label>
          <select className="input" style={{ width: 130 }} value={tipo} onChange={e => setTipo(e.target.value)}><option value="">Todos</option>{Object.entries(TIPOS_CONTA).map(([k, t]) => <option key={k} value={k}>{t.nome}</option>)}</select>
        </div>
        <section className="px mt16 stack-y">
          {todas.length === 0 && <div className="tip"><p className="s" style={{ marginTop: 0 }}>Nenhuma conta encontrada.</p></div>}
          {todas.map(c => <ContaLinha key={c.id} c={c} onAbrir={acoes.abrir} onPagar={acoes.pagar} />)}
        </section>
      </>)}

      <div className="px mt24 btnrow"><button className="btn dark" style={{ flex: 1 }} onClick={() => acoes.abrirNova()}><Plus size={18} className="i" />Adicionar conta</button><Link className="btn soft" style={{ flex: 1 }} to="/importar"><FileUp size={18} className="i" />Importar extrato</Link></div>
      <div style={{ height: 12 }} />
      {acoes.folhas}
    </>
  )
}
