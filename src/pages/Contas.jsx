import { useEffect, useState } from 'react'
import { Plus, Search, FileUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useDados, soma } from '../hooks'
import { brl, mesAtual } from '../util'
import { BackBar } from '../components/ui/BackBar'
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
      <BackBar titulo="Contas" acao={<button className="iconbtn" onClick={() => acoes.abrirNova()} aria-label="Nova conta"><Plus size={20} className="i" /></button>} />
      <header className="hdr" style={{ paddingTop: 12, paddingBottom: 8 }}><div><p className="eyebrow">Luz, água, internet e afins</p><h1>Contas da casa</h1></div><Link className="btn sm soft" to="/importar"><FileUp size={15} className="i" />Importar extrato</Link></header>

      <div className="px stats">
        <div className="stat"><p className="l" style={{ color: 'var(--danger)' }}>Atrasadas</p><p className="v num">{brl(soma(atrasadas))}</p><p className="muted">{atrasadas.length} conta{atrasadas.length !== 1 ? 's' : ''}</p></div>
        <div className="stat"><p className="l">A vencer</p><p className="v num">{brl(soma(avencer))}</p><p className="muted">{avencer.length} conta{avencer.length !== 1 ? 's' : ''}</p></div>
        <div className="stat"><p className="l" style={{ color: 'var(--ok)' }}>Pagas no mês</p><p className="v num">{brl(soma(pagasMes))}</p><p className="muted">{pagasMes.length} conta{pagasMes.length !== 1 ? 's' : ''}</p></div>
      </div>

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
