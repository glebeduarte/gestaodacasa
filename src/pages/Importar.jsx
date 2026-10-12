import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileUp, Sparkles, Check, TriangleAlert, ArrowDownLeft, RotateCcw, CreditCard, Landmark } from 'lucide-react'
import { supabase } from '../supabase'
import { BackBar } from '../components/ui/BackBar'
import { useToast } from '../components/ui/Toast'
import { brl, dataCurta, numero } from '../util'
import { TIPOS_CONTA, catPorNome, catPorTipo, arquivoBase64, pagarConta } from '../lib/contas'

const TEXTO = /\.(csv|txt|ofx|qif)$/i
const somaDias = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }

async function lerExtrato(file, categorias) {
  const body = { categorias: categorias.map(c => ({ nome: c.nome })) }
  if (TEXTO.test(file.name) || file.type.startsWith('text/')) body.texto = await file.text()
  else { const { mime, data } = await arquivoBase64(file); body.mime = mime; body.arquivo = data }
  const { data: r, error } = await supabase.functions.invoke('ler-extrato', { body })
  if (error) { let msg = error.message; try { msg = (await error.context.json()).erro || msg } catch { /* sem corpo */ } throw new Error(msg) }
  if (r?.erro) throw new Error(r.erro)
  return r.dados
}

export default function Importar() {
  const toast = useToast()
  const [etapa, setEtapa] = useState('arquivo')
  const [arquivo, setArquivo] = useState(null)
  const [erro, setErro] = useState(null)
  const [cats, setCats] = useState([])
  const [info, setInfo] = useState(null)
  const [linhas, setLinhas] = useState([])
  const [criar, setCriar] = useState({})
  const [filtro, setFiltro] = useState('todos')
  const [resultado, setResultado] = useState(null)

  useEffect(() => { supabase.from('categorias').select('id,nome,cor,icone').eq('ativo', true).order('ordem').then(r => setCats(r.data || [])) }, [])

  const ler = async (file) => {
    if (!file) return
    setArquivo(file); setErro(null); setEtapa('lendo')
    try {
      const d = await lerExtrato(file, cats)
      const lanc = (d.lancamentos || []).filter(l => l && l.valor)
      if (!lanc.length) throw new Error('Não encontrei lançamentos neste arquivo.')
      // Possíveis duplicados: mesmo valor em até 3 dias, já registrado em contas ou gastos
      const datas = lanc.map(l => l.data).filter(Boolean).sort()
      const ini = somaDias(datas[0], -3), fim = somaDias(datas.at(-1), 3)
      const [contas, despesas] = await Promise.all([
        supabase.from('contas').select('valor,vencimento,pago_em').gte('vencimento', ini).lte('vencimento', fim).then(r => r.data || []),
        supabase.from('despesas').select('valor,data').gte('data', ini).lte('data', fim).then(r => r.data || []),
      ])
      const existentes = [...contas.map(c => [Number(c.valor), c.pago_em || c.vencimento]), ...despesas.map(x => [Number(x.valor), x.data])]
      const perto = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000) <= 3
      const novas = {}
      const rows = lanc.map((l, i) => {
        const cat = catPorNome(l.categoria_sugerida, cats) || (l.tipo_conta !== 'outro' ? catPorTipo(l.tipo_conta, cats) : null)
        const nova = !cat && l.nova_categoria ? l.nova_categoria.trim() : null
        if (nova && l.gasto_da_casa && l.sentido !== 'entrada') novas[nova] = true
        const dup = existentes.some(([v, dt]) => Math.abs(v - Number(l.valor)) < 0.01 && perto(dt, l.data))
        const incluir = l.gasto_da_casa && l.sentido !== 'entrada' && !dup
        return {
          k: i, incluir, dup, entrada: l.sentido === 'entrada', casa: !!l.gasto_da_casa,
          data: l.data, descricao: l.descricao || l.descricao_original, original: l.descricao_original, fornecedor: l.fornecedor,
          valor: String(l.valor).replace('.', ','), parcela: l.parcela, tipo_conta: TIPOS_CONTA[l.tipo_conta] ? l.tipo_conta : 'outro',
          categoria: cat ? cat.id : nova ? `novo:${nova}` : '', paga: l.pago !== false,
        }
      })
      setInfo(d); setLinhas(rows); setCriar(novas); setEtapa('revisar')
    } catch (e) { setErro(e.message); setEtapa('arquivo') }
  }

  const set = (k, campo, v) => setLinhas(x => x.map(l => l.k === k ? { ...l, [campo]: v } : l))
  const marcados = linhas.filter(l => l.incluir)
  const novasUsadas = useMemo(() => [...new Set(marcados.map(l => l.categoria).filter(c => c.startsWith('novo:')).map(c => c.slice(5)))], [marcados])
  const semCategoria = marcados.filter(l => !l.categoria || (l.categoria.startsWith('novo:') && !criar[l.categoria.slice(5)]))
  const total = marcados.reduce((t, l) => t + (numero(l.valor) || 0), 0)
  const visiveis = linhas.filter(l => filtro === 'todos' || (filtro === 'marcados' ? l.incluir : filtro === 'fora' ? !l.incluir : l.dup))
  const forma = info?.fonte === 'cartao' ? `Cartão${info?.instituicao ? ' ' + info.instituicao : ''}` : `Conta${info?.instituicao ? ' ' + info.instituicao : ''}`

  const importar = async () => {
    if (!marcados.length) return toast({ txt: 'Marque ao menos um lançamento.', erro: true })
    if (semCategoria.length) return toast({ txt: `${semCategoria.length} lançamento(s) sem categoria. Escolha uma ou aprove a criação.`, erro: true })
    setEtapa('salvando')
    try {
      // 1. categorias novas aprovadas
      const mapa = {}
      for (const nome of novasUsadas.filter(n => criar[n])) {
        const existe = catPorNome(nome, cats)
        if (existe) { mapa[nome] = existe.id; continue }
        const { data } = await supabase.from('categorias').insert({ nome, ativo: true, ordem: 100 }).select('id').single()
        mapa[nome] = data.id
      }
      // 2. registro da importação
      const datas = marcados.map(l => l.data).sort()
      const { data: imp } = await supabase.from('importacoes').insert({ fonte: info?.fonte, arquivo_nome: arquivo?.name, periodo_inicio: info?.periodo_inicio || datas[0], periodo_fim: info?.periodo_fim || datas.at(-1), total_itens: linhas.length, importados: marcados.length }).select('id').single()
      // 3. contas (e gastos, para as pagas)
      let pagas = 0, abertas = 0
      for (const l of marcados) {
        const categoria_id = l.categoria.startsWith('novo:') ? mapa[l.categoria.slice(5)] : l.categoria
        const vencimento = !l.paga && info?.fonte === 'cartao' && info?.fatura_vencimento ? info.fatura_vencimento : l.data
        const { data: conta } = await supabase.from('contas').insert({
          tipo_conta: l.tipo_conta, categoria_id, fornecedor: l.fornecedor || null, descricao: l.descricao.trim() + (l.parcela ? ` (${l.parcela})` : ''),
          referencia: `${l.data.slice(0, 7)}-01`, valor: numero(l.valor), vencimento, forma_pagamento: forma, origem: 'importacao', importacao_id: imp.id,
          observacoes: `Importado de ${arquivo?.name || 'extrato'}: ${l.original || ''}`.trim(), detalhes: {},
        }).select('*').single()
        if (l.paga) { await pagarConta(conta, l.data, forma); pagas++ } else abertas++
      }
      setResultado({ pagas, abertas, cats: Object.keys(mapa).length, total })
      setEtapa('feito')
    } catch (e) { setErro(e.message); setEtapa('revisar') }
  }

  return (
    <>
      <BackBar to="/contas" titulo="Importar extrato" />

      {etapa === 'arquivo' && (
        <div className="px mt16 stack-y">
          <div className="tip"><Sparkles size={20} className="i" style={{ color: 'var(--pool)', flex: '0 0 auto' }} /><div><p className="t">Extrato do banco ou fatura do cartão</p><p className="s">A IA lê os lançamentos, separa o que é gasto da casa, sugere categorias e marca o que já foi pago. Nada é gravado antes da sua aprovação.</p></div></div>
          <label className="upload">
            <span className="tile t-md c-fech"><FileUp size={22} className="i" /></span>
            <div><b style={{ color: 'var(--ink)', fontSize: 14.5 }}>Escolher arquivo</b><p className="muted">PDF, foto, CSV ou OFX baixado do banco</p></div>
            <input type="file" accept="application/pdf,image/*,.csv,.txt,.ofx,.qif,text/csv" hidden onChange={e => ler(e.target.files[0])} />
          </label>
          {erro && <div className="alert k-danger"><span className="tile t-md c-neutral"><TriangleAlert size={22} className="i" /></span><div className="grow"><p className="t">Não deu certo</p><p className="s">{erro}</p></div>{arquivo && <button className="btn sm dark" onClick={() => ler(arquivo)}><RotateCcw size={14} className="i" />De novo</button>}</div>}
          <p className="muted">Dica: o CSV ou OFX que o banco exporta é lido com mais precisão que o PDF.</p>
        </div>
      )}

      {etapa === 'lendo' && <div className="px mt24"><div className="ia-lendo"><Sparkles size={28} className="i" /><b>Lendo {arquivo?.name}…</b><p className="muted">Extratos longos podem levar até um minuto.</p></div></div>}

      {(etapa === 'revisar' || etapa === 'salvando') && (<>
        <div className="px mt12">
          <div className="card imp-head">
            <span className="tile t-md c-fech">{info?.fonte === 'cartao' ? <CreditCard size={22} className="i" /> : <Landmark size={22} className="i" />}</span>
            <div className="grow"><p className="t">{info?.fonte === 'cartao' ? 'Fatura do cartão' : 'Extrato bancário'}{info?.instituicao ? ` · ${info.instituicao}` : ''}</p>
              <p className="s">{info?.periodo_inicio ? `${dataCurta(info.periodo_inicio)} a ${dataCurta(info.periodo_fim)} · ` : ''}{linhas.length} lançamentos{info?.fatura_vencimento ? ` · fatura vence ${dataCurta(info.fatura_vencimento)}` : ''}</p></div>
          </div>
        </div>

        {Object.keys(criar).length > 0 && (
          <section className="sec"><div className="sec-h"><h2>Categorias novas sugeridas</h2></div>
            <div className="px"><div className="card stack-y">
              <p className="muted">Marque as que devem ser criadas. As desmarcadas exigem escolher outra categoria nos lançamentos.</p>
              {Object.keys(criar).map(n => (
                <label key={n} className="imp-cat"><input type="checkbox" checked={criar[n]} onChange={e => setCriar(x => ({ ...x, [n]: e.target.checked }))} /><b>{n}</b><span className="muted">{linhas.filter(l => l.categoria === `novo:${n}`).length} lançamento(s)</span></label>
              ))}
            </div></div>
          </section>
        )}

        <section className="sec">
          <div className="sec-h"><h2>Lançamentos</h2><span className="muted">{marcados.length} de {linhas.length}</span></div>
          <div className="hscroll">
            {[['todos', 'Todos'], ['marcados', 'Vão entrar'], ['fora', 'Fora'], ['dup', 'Possíveis duplicados']].map(([v, t]) => <button key={v} className={`pick ${filtro === v ? 'on' : ''}`} onClick={() => setFiltro(v)}>{t}</button>)}
          </div>
          <div className="px mt12 stack-y">
            {visiveis.map(l => (
              <div key={l.k} className={`imp-row ${l.incluir ? 'on' : ''}`}>
                <div className="imp-top">
                  <label className="imp-check"><input type="checkbox" checked={l.incluir} onChange={e => set(l.k, 'incluir', e.target.checked)} /></label>
                  <input className="imp-desc" value={l.descricao} onChange={e => set(l.k, 'descricao', e.target.value)} />
                  <span className="num imp-valor">{l.entrada ? '+' : ''}{brl(numero(l.valor))}</span>
                </div>
                <p className="imp-orig">{dataCurta(l.data)} · {l.original}{l.parcela ? ` · parcela ${l.parcela}` : ''}</p>
                <div className="chips" style={{ marginTop: 6 }}>
                  {l.entrada && <span className="chip"><ArrowDownLeft size={12} className="i" />Entrada</span>}
                  {!l.casa && !l.entrada && <span className="chip">Fora da casa?</span>}
                  {l.dup && <span className="chip warn"><TriangleAlert size={12} className="i" />Já registrado?</span>}
                </div>
                {l.incluir && (
                  <div className="imp-edit">
                    <select className="input" value={l.categoria} onChange={e => set(l.k, 'categoria', e.target.value)}>
                      <option value="">Escolher categoria</option>
                      {cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      {Object.keys(criar).map(n => <option key={n} value={`novo:${n}`}>Nova: {n}</option>)}
                    </select>
                    <input className="input" inputMode="decimal" value={l.valor} onChange={e => set(l.k, 'valor', e.target.value)} style={{ width: 110 }} />
                    <button type="button" className={`pick ${l.paga ? 'on' : ''}`} onClick={() => set(l.k, 'paga', !l.paga)}>{l.paga ? <><Check size={14} className="i" />Paga</> : 'Em aberto'}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div style={{ height: 96 }} />
        <div className="sticky-foot imp-foot">
          <div><b className="num">{brl(total)}</b><small>{marcados.length} lançamentos · {marcados.filter(l => l.paga).length} pagos · {marcados.filter(l => !l.paga).length} em aberto</small></div>
          <button className="btn primary" onClick={importar} disabled={etapa === 'salvando'}><Check size={18} className="i" />{etapa === 'salvando' ? 'Importando…' : 'Aprovar e importar'}</button>
        </div>
        {erro && <p className="px" style={{ color: 'var(--danger)', fontWeight: 700 }}>{erro}</p>}
      </>)}

      {etapa === 'feito' && resultado && (
        <div className="px mt24 stack-y">
          <div className="conta-hero st-paga"><span className="chip ok"><Check size={13} className="i" />Importação concluída</span><p className="v num">{brl(resultado.total)}</p>
            <p className="d">{resultado.pagas} conta(s) paga(s) lançada(s) no histórico · {resultado.abertas} em aberto{resultado.cats ? ` · ${resultado.cats} categoria(s) criada(s)` : ''}</p></div>
          <Link className="btn primary block" to="/contas">Ver contas</Link>
          <button className="btn block" onClick={() => { setEtapa('arquivo'); setLinhas([]); setInfo(null); setArquivo(null) }}>Importar outro extrato</button>
        </div>
      )}
    </>
  )
}
