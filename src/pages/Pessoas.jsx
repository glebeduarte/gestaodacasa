import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { useDados, q, soma } from '../hooks'
import { brl, FREQ, UNIDADE } from '../util'
import { Folha } from '../components/Folha'
import { Ic } from '../components/Icones'

const CORES = ['#FBE9DD|#8F3A12', '#E4EDF5|#1F4B73', '#DFEFE5|#2E6B4F', '#EDE8E0|#3D3833']
export const corAvatar = (nome) => { const [bg, fg] = CORES[(nome?.charCodeAt(0) || 0) % CORES.length].split('|'); return { background: bg, color: fg } }

// Estimativa mensal a partir do combinado
export const previstoMes = (p) => {
  const v = Number(p.valor_combinado || 0)
  if (!v) return 0
  const n = p.dias_semana?.length || 1
  switch (p.unidade_valor) {
    case 'mes': return v
    case 'semana': return v * 4.33
    case 'diaria': return p.frequencia === 'semanal' ? v * n * 4.33 : p.frequencia === 'quinzenal' ? v * n * 2 : v * n
    case 'visita': return p.frequencia === 'semanal' ? v * 4.33 : p.frequencia === 'quinzenal' ? v * 2 : p.frequencia === 'mensal' ? v : 0
    default: return 0
  }
}

export default function Pessoas() {
  const { dados, recarregar } = useDados(async () => {
    const [pessoas, despesas, categorias] = await Promise.all([q.pessoas(), q.despesasMes(), q.categorias()])
    return { pessoas, despesas, categorias }
  })
  const [nova, setNova] = useState(false)
  if (!dados) return <p className="carregando">Carregando…</p>
  const { pessoas, despesas, categorias } = dados
  const previsto = pessoas.reduce((t, p) => t + previstoMes(p), 0)
  const pagoTotal = soma(despesas.filter(d => d.pessoa_id))

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div><div className="sobre">Quem cuida da casa</div><h1>Pessoas</h1></div>
        <button className="icone-btn escuro" aria-label="Adicionar pessoa" onClick={() => setNova(true)}><Ic n="mais" s={20} w={2.5} /></button>
      </div>
      <div className="cartao" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <div><div className="rotulo">Previsto no mês</div><div className="valor">{brl(previsto)}</div></div>
        <div><div className="rotulo">Já pago</div><div className="valor">{brl(pagoTotal)}</div></div>
        <div><div className="rotulo">Pendente</div><div className="valor" style={{ color: 'var(--acento-escuro)' }}>{brl(Math.max(0, previsto - pagoTotal))}</div></div>
      </div>
      <div className="lista">
        {pessoas.length === 0 && <div className="cartao vazio">Cadastre quem trabalha na casa: piscineiro, empreiteiro, diaristas, cuidador.</div>}
        {pessoas.map(p => {
          const pago = soma(despesas.filter(d => d.pessoa_id === p.id))
          const prev = previstoMes(p)
          const ok = prev === 0 || pago >= prev
          return (
            <Link key={p.id} to={`/pessoas/${p.id}`} className="cartao pessoa-cartao">
              <div className="avatar" style={corAvatar(p.nome)}>{p.nome[0]}</div>
              <div className="corpo">
                <div className="entre"><span style={{ fontWeight: 700, fontSize: 15 }}>{p.nome}</span><span className={`chip ${ok ? 'chip-ok' : 'chip-alerta'}`}>{ok ? 'em dia' : `falta ${brl(prev - pago)}`}</span></div>
                <div className="nota">{p.funcao} · {FREQ[p.frequencia] || ''}{p.dias_semana?.length ? ` · ${p.dias_semana.join(', ')}` : ''}{p.valor_combinado ? ` · ${brl(p.valor_combinado)}${UNIDADE[p.unidade_valor] || ''}` : ''}</div>
                <div className="nota">{p.forma_pagamento || ''}{pago ? ` · pago ${brl(pago)} este mês` : ' · nada pago este mês'}</div>
              </div>
            </Link>
          )
        })}
      </div>
      {nova && <FolhaPessoa categorias={categorias} onFechar={() => setNova(false)} onSalvo={recarregar} />}
    </div>
  )
}

export function FolhaPessoa({ pessoa, categorias, onFechar, onSalvo }) {
  const [f, setF] = useState({
    nome: pessoa?.nome || '', funcao: pessoa?.funcao || '', frequencia: pessoa?.frequencia || 'semanal', dias_semana: pessoa?.dias_semana || [],
    valor_combinado: pessoa?.valor_combinado || '', unidade_valor: pessoa?.unidade_valor || 'mes', forma_pagamento: pessoa?.forma_pagamento || 'Pix',
    telefone: pessoa?.telefone || '', observacoes: pessoa?.observacoes || '', categoria_id: pessoa?.categoria_id || '',
  })
  const [erro, setErro] = useState(null)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const toggleDia = (d) => set('dias_semana', f.dias_semana.includes(d) ? f.dias_semana.filter(x => x !== d) : [...f.dias_semana, d])
  const salvar = async () => {
    if (!f.nome || !f.funcao) return setErro('Nome e função são obrigatórios.')
    const reg = { ...f, valor_combinado: f.valor_combinado ? Number(String(f.valor_combinado).replace(',', '.')) : null, categoria_id: f.categoria_id || null, telefone: f.telefone || null, observacoes: f.observacoes || null }
    const r = pessoa ? await supabase.from('pessoas').update(reg).eq('id', pessoa.id) : await supabase.from('pessoas').insert(reg)
    if (r.error) return setErro(r.error.message)
    onSalvo(); onFechar()
  }
  return (
    <Folha titulo={pessoa ? 'Editar pessoa' : 'Nova pessoa'} onFechar={onFechar}>
      <div className="form">
        <div className="campo-linha">
          <div className="campo"><label>Nome</label><input value={f.nome} onChange={e => set('nome', e.target.value)} /></div>
          <div className="campo"><label>Função</label><input value={f.funcao} onChange={e => set('funcao', e.target.value)} placeholder="Piscineiro, diarista…" /></div>
        </div>
        <div className="campo"><label>Categoria relacionada</label><select value={f.categoria_id} onChange={e => set('categoria_id', e.target.value)}><option value="">Nenhuma</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
        <div className="campo"><label>Frequência</label><div className="opcoes">{Object.entries(FREQ).map(([v, l]) => <button key={v} type="button" className={f.frequencia === v ? 'marcado' : ''} onClick={() => set('frequencia', v)}>{l}</button>)}</div></div>
        {(f.frequencia === 'semanal' || f.frequencia === 'quinzenal') && (
          <div className="campo"><label>Dias</label><div className="opcoes">{['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(d => <button key={d} type="button" className={f.dias_semana.includes(d) ? 'marcado' : ''} onClick={() => toggleDia(d)}>{d}</button>)}</div></div>
        )}
        <div className="campo-linha">
          <div className="campo"><label>Valor combinado (R$)</label><input inputMode="decimal" value={f.valor_combinado} onChange={e => set('valor_combinado', e.target.value)} /></div>
          <div className="campo"><label>Por</label><select value={f.unidade_valor} onChange={e => set('unidade_valor', e.target.value)}><option value="mes">mês</option><option value="diaria">diária</option><option value="visita">visita</option><option value="semana">semana</option><option value="obra">obra</option></select></div>
        </div>
        <div className="campo"><label>Forma de pagamento</label><div className="opcoes">{['Pix', 'Dinheiro', 'Transferência'].map(v => <button key={v} type="button" className={f.forma_pagamento === v ? 'marcado' : ''} onClick={() => set('forma_pagamento', v)}>{v}</button>)}</div></div>
        <div className="campo"><label>Telefone</label><input inputMode="tel" value={f.telefone} onChange={e => set('telefone', e.target.value)} /></div>
        <div className="campo"><label>Observações</label><textarea value={f.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="O que ficou combinado, o que inclui, o que não inclui" /></div>
        {erro && <p className="erro">{erro}</p>}
        <button className="btn largo" onClick={salvar}>{pessoa ? 'Salvar' : 'Cadastrar pessoa'}</button>
      </div>
    </Folha>
  )
}
