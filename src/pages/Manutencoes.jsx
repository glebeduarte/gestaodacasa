import { useState } from 'react'
import { supabase } from '../supabase'
import { useDados, q } from '../hooks'
import { brl, dataCurta, hoje } from '../util'
import { Folha } from '../components/Folha'
import { enviarFotos } from '../components/Upload'
import { Ic } from '../components/Icones'

export const diasAte = (d) => d ? Math.round((new Date(d) - new Date(hoje())) / 86400000) : null
export const somarDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }

export const INTERVALOS = [[7, 'toda semana'], [15, 'a cada 15 dias'], [30, 'todo mês'], [90, 'a cada 3 meses'], [180, 'a cada 6 meses'], [365, 'uma vez por ano']]

export default function Manutencoes() {
  const { dados, recarregar } = useDados(async () => {
    const [itens, cats, pessoas] = await Promise.all([
      supabase.from('manutencoes').select('*, categorias(nome), pessoas(nome)').eq('ativo', true).order('proxima', { ascending: true, nullsFirst: false }).then(r => r.data || []),
      q.categorias(), q.pessoas(),
    ])
    return { itens, cats, pessoas }
  })
  const [editando, setEditando] = useState(null)
  const [executando, setExecutando] = useState(null)
  if (!dados) return <p className="carregando">Carregando…</p>

  const grupo = (m) => { const d = diasAte(m.proxima); if (d === null) return 'sem'; if (d < 0) return 'atrasada'; if (d <= 7) return 'semana'; return 'depois' }
  const grupos = { atrasada: [], semana: [], depois: [], sem: [] }
  for (const m of dados.itens) grupos[grupo(m)].push(m)

  const Bloco = ({ titulo, lista, cls }) => lista.length === 0 ? null : (
    <>
      <div className="secao-titulo"><h2>{titulo}</h2><span className="nota">{lista.length}</span></div>
      <div className="lista">
        {lista.map(m => {
          const d = diasAte(m.proxima)
          return (
            <div key={m.id} className="cartao">
              <div className="entre">
                <span className="titulo-cartao">{m.nome}</span>
                {d !== null && <span className={`chip ${cls}`}>{d < 0 ? `${-d} dia${-d !== 1 ? 's' : ''} atrasada` : d === 0 ? 'hoje' : `em ${d} dia${d !== 1 ? 's' : ''}`}</span>}
              </div>
              <div className="nota">{m.categorias?.nome ? `${m.categorias.nome} · ` : ''}{INTERVALOS.find(i => i[0] === m.intervalo_dias)?.[1] || `a cada ${m.intervalo_dias} dias`}{m.pessoas?.nome ? ` · ${m.pessoas.nome}` : ''}</div>
              <div className="nota">{m.ultima_execucao ? `Última vez: ${dataCurta(m.ultima_execucao)}` : 'Nunca registrada'}{m.proxima ? ` · próxima: ${dataCurta(m.proxima)}` : ''}</div>
              {m.observacoes && <p className="texto">{m.observacoes}</p>}
              <div className="acoes" style={{ marginTop: 4 }}>
                <button className="btn pequeno" onClick={() => setExecutando(m)}>Feita hoje</button>
                <button className="btn pequeno claro" onClick={() => setEditando(m)}>Editar</button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )

  return (
    <div className="pilha">
      <div className="cabecalho">
        <div><div className="sobre">Preventivas e rotinas</div><h1>Manutenções</h1></div>
        <button className="icone-btn escuro" aria-label="Nova manutenção" onClick={() => setEditando('nova')}><Ic n="mais" s={20} w={2.5} /></button>
      </div>
      {dados.itens.length === 0 && <div className="cartao vazio">Cadastre o que a casa precisa com regularidade: limpar caixa d'água, revisar ar-condicionado, dedetização, calhas, bomba da piscina.</div>}
      <Bloco titulo="Atrasadas" lista={grupos.atrasada} cls="chip-alerta" />
      <Bloco titulo="Esta semana" lista={grupos.semana} cls="chip-info" />
      <Bloco titulo="Próximas" lista={grupos.depois} cls="chip-neutra" />
      <Bloco titulo="Sem data" lista={grupos.sem} cls="chip-neutra" />
      {editando && <FolhaManutencao m={editando === 'nova' ? null : editando} cats={dados.cats} pessoas={dados.pessoas} onFechar={() => setEditando(null)} onSalvo={recarregar} />}
      {executando && <FolhaExecucao m={executando} onFechar={() => setExecutando(null)} onSalvo={recarregar} />}
    </div>
  )
}

function FolhaManutencao({ m, cats, pessoas, onFechar, onSalvo }) {
  const [f, setF] = useState({ nome: m?.nome || '', categoria_id: m?.categoria_id || '', pessoa_id: m?.pessoa_id || '', intervalo_dias: m?.intervalo_dias || 30, ultima_execucao: m?.ultima_execucao || '', proxima: m?.proxima || '', observacoes: m?.observacoes || '' })
  const [erro, setErro] = useState(null)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    if (!f.nome) return setErro('Dê um nome.')
    const proxima = f.proxima || (f.ultima_execucao ? somarDias(f.ultima_execucao, Number(f.intervalo_dias)) : null)
    const reg = { nome: f.nome, categoria_id: f.categoria_id || null, pessoa_id: f.pessoa_id || null, intervalo_dias: Number(f.intervalo_dias), ultima_execucao: f.ultima_execucao || null, proxima, observacoes: f.observacoes || null }
    const r = m ? await supabase.from('manutencoes').update(reg).eq('id', m.id) : await supabase.from('manutencoes').insert(reg)
    if (r.error) return setErro(r.error.message)
    onSalvo(); onFechar()
  }
  const arquivar = async () => { await supabase.from('manutencoes').update({ ativo: false }).eq('id', m.id); onSalvo(); onFechar() }
  return (
    <Folha titulo={m ? 'Editar manutenção' : 'Nova manutenção'} onFechar={onFechar}>
      <div className="form">
        <div className="campo"><label>O que precisa ser feito</label><input value={f.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex.: limpar caixa d'água" /></div>
        <div className="campo"><label>A cada</label><div className="opcoes">{INTERVALOS.map(([v, l]) => <button key={v} type="button" className={Number(f.intervalo_dias) === v ? 'marcado' : ''} onClick={() => set('intervalo_dias', v)}>{l}</button>)}</div></div>
        <div className="campo-linha">
          <div className="campo"><label>Categoria</label><select value={f.categoria_id} onChange={e => set('categoria_id', e.target.value)}><option value="">Nenhuma</option>{cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          <div className="campo"><label>Quem faz</label><select value={f.pessoa_id} onChange={e => set('pessoa_id', e.target.value)}><option value="">Ninguém definido</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
        </div>
        <div className="campo-linha">
          <div className="campo"><label>Última vez que foi feita</label><input type="date" value={f.ultima_execucao} onChange={e => set('ultima_execucao', e.target.value)} /></div>
          <div className="campo"><label>Próxima (ou calculo)</label><input type="date" value={f.proxima} onChange={e => set('proxima', e.target.value)} /></div>
        </div>
        <div className="campo"><label>Observações</label><textarea value={f.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Como é feito, o que precisa comprar, quem chamar" /></div>
        {erro && <p className="erro">{erro}</p>}
        <button className="btn largo" onClick={salvar}>{m ? 'Salvar' : 'Criar manutenção'}</button>
        {m && <button className="btn largo claro" onClick={arquivar}>Arquivar</button>}
      </div>
    </Folha>
  )
}

function FolhaExecucao({ m, onFechar, onSalvo }) {
  const [f, setF] = useState({ data: hoje(), texto: '', custo: '' })
  const [fotos, setFotos] = useState([])
  const [salvando, setSalvando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const salvar = async () => {
    setSalvando(true)
    let despesa_id = null
    if (f.custo && m.categoria_id) {
      const { data } = await supabase.from('despesas').insert({ categoria_id: m.categoria_id, pessoa_id: m.pessoa_id, descricao: m.nome, explicacao: f.texto || null, valor: Number(String(f.custo).replace(',', '.')), data: f.data, tipo: 'variavel' }).select('id').single()
      despesa_id = data?.id || null
    }
    const urls = fotos.length ? await enviarFotos(fotos, `manutencoes/${m.id}`) : []
    await supabase.from('manutencao_execucoes').insert({ manutencao_id: m.id, data: f.data, texto: f.texto || null, despesa_id, fotos: urls })
    await supabase.from('manutencoes').update({ ultima_execucao: f.data, proxima: somarDias(f.data, m.intervalo_dias) }).eq('id', m.id)
    setSalvando(false); onSalvo(); onFechar()
  }
  return (
    <Folha titulo={`Registrar: ${m.nome}`} onFechar={onFechar}>
      <div className="form">
        <div className="campo-linha">
          <div className="campo"><label>Feita em</label><input type="date" value={f.data} onChange={e => set('data', e.target.value)} /></div>
          <div className="campo"><label>Custou (R$, opcional)</label><input inputMode="decimal" value={f.custo} onChange={e => set('custo', e.target.value)} placeholder="0" /></div>
        </div>
        <div className="campo"><label>Observações</label><textarea value={f.texto} onChange={e => set('texto', e.target.value)} placeholder="O que foi feito, o que encontrou, o que precisa de atenção" /></div>
        <div className="campo"><label>Fotos</label><input type="file" accept="image/*" multiple onChange={e => setFotos([...e.target.files])} /></div>
        <p className="nota">Próxima ficará marcada para {dataCurta(somarDias(f.data, m.intervalo_dias))}.{f.custo && !m.categoria_id ? ' Sem categoria definida, o custo não vira despesa.' : ''}</p>
        <button className="btn largo" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Confirmar'}</button>
      </div>
    </Folha>
  )
}
