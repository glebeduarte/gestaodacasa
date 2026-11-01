import { supabase, semAviso } from '../supabase'
import { hoje, diasAte } from '../util'

// Tipos de conta e os campos específicos de cada um (ficam em contas.detalhes)
export const TIPOS_CONTA = {
  energia: { nome: 'Energia', cat: ['energia'], campos: [['consumo_kwh', 'Consumo (kWh)', 'num'], ['instalacao', 'Nº da instalação'], ['leitura_anterior', 'Leitura anterior', 'num'], ['leitura_atual', 'Leitura atual', 'num'], ['bandeira', 'Bandeira tarifária'], ['dias_faturados', 'Dias faturados', 'num']] },
  agua: { nome: 'Água', cat: ['agua'], campos: [['consumo_m3', 'Consumo (m³)', 'num'], ['matricula', 'Matrícula'], ['leitura_anterior', 'Leitura anterior', 'num'], ['leitura_atual', 'Leitura atual', 'num']] },
  gas: { nome: 'Gás', cat: ['gas'], campos: [['consumo_m3', 'Consumo (m³)', 'num'], ['consumo_kg', 'Consumo (kg)', 'num'], ['codigo_cliente', 'Código do cliente']] },
  telefone: { nome: 'Telefone', cat: ['telefone', 'internet e seguranca'], campos: [['numero_linha', 'Nº da linha'], ['contrato', 'Contrato'], ['plano', 'Plano']] },
  internet: { nome: 'Internet', cat: ['internet e seguranca', 'internet'], campos: [['contrato', 'Contrato'], ['plano', 'Plano'], ['velocidade', 'Velocidade']] },
  tv: { nome: 'TV / streaming', cat: ['internet e seguranca'], campos: [['contrato', 'Contrato'], ['plano', 'Plano']] },
  condominio: { nome: 'Condomínio', cat: ['condominio', 'estrutura'], campos: [['unidade', 'Unidade'], ['parcela', 'Parcela']] },
  iptu: { nome: 'IPTU', cat: ['iptu', 'estrutura'], campos: [['inscricao', 'Inscrição'], ['parcela', 'Parcela']] },
  seguro: { nome: 'Seguro', cat: ['seguro', 'estrutura'], campos: [['apolice', 'Apólice'], ['parcela', 'Parcela']] },
  aluguel: { nome: 'Aluguel', cat: ['moradia', 'aluguel'], campos: [['locador', 'Locador ou imobiliária'], ['contrato', 'Nº do contrato'], ['indice', 'Índice de reajuste'], ['reajuste', 'Próximo reajuste', 'data'], ['fim_contrato', 'Fim do contrato', 'data']] },
  outro: { nome: 'Outra', cat: [], campos: [] },
}

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
export const catPorTipo = (tipo, cats) => {
  for (const n of TIPOS_CONTA[tipo]?.cat || []) { const c = cats.find(x => norm(x.nome) === n); if (c) return c }
  return null
}
export const catPorNome = (nome, cats) => cats.find(x => norm(x.nome) === norm(nome)) || null

export const STATUS_CONTA = {
  atrasada: { txt: 'Atrasada', cls: 'danger' },
  avencer: { txt: 'A vencer', cls: 'pool' },
  paga: { txt: 'Paga', cls: 'ok' },
}
export function statusConta(c) {
  if (c.pago_em) return 'paga'
  return c.vencimento < hoje() ? 'atrasada' : 'avencer'
}
export function prazoTexto(c) {
  if (c.pago_em) return null
  const d = diasAte(c.vencimento)
  if (d === 0) return 'vence hoje'
  if (d === 1) return 'vence amanhã'
  if (d > 1) return `vence em ${d} dias`
  if (d === -1) return 'venceu ontem'
  return `atrasada há ${-d} dias`
}

// Gera as contas do mês a partir dos custos fixos (idempotente)
export const gerarContasMes = () => supabase.rpc('gerar_contas_mes').then(ajustarAluguel, () => null)

// Contas geradas de custo fixo com "aluguel" no nome viram tipo Aluguel e herdam os dados do contrato
async function ajustarAluguel() {
  try {
    const { data } = await semAviso('contas').select('id,tipo_conta,descricao,detalhes,vencimento').ilike('descricao', '%aluguel%').order('vencimento', { ascending: false }).limit(24)
    const l = data || []
    const base = l.find(c => c.tipo_conta === 'aluguel' && Object.keys(c.detalhes || {}).length)
    for (const c of l.filter(c => c.tipo_conta === 'outro')) {
      await semAviso('contas').update({ tipo_conta: 'aluguel', detalhes: { ...(base?.detalhes || {}), ...(c.detalhes || {}) } }).eq('id', c.id)
    }
  } catch { /* sem efeito se falhar */ }
  return null
}

// Avisos de reajuste e fim de contrato do aluguel (próximos 45 dias ou vencidos)
export async function avisosAluguel() {
  const { data } = await supabase.from('contas').select('descricao,detalhes,vencimento').eq('tipo_conta', 'aluguel').order('vencimento', { ascending: false }).limit(1)
  const d = data?.[0]?.detalhes || {}
  const out = []
  const dias = (s) => Math.round((new Date(s + 'T12:00') - new Date(hoje() + 'T12:00')) / 864e5)
  if (d.reajuste) { const n = dias(d.reajuste); if (n <= 45) out.push({ texto: n < 0 ? 'Reajuste do aluguel já passou' : `Reajuste do aluguel em ${n} dia${n !== 1 ? 's' : ''}`, sub: `${d.indice || 'Índice não informado'} · ${d.reajuste.split('-').reverse().join('/')}` }) }
  if (d.fim_contrato) { const n = dias(d.fim_contrato); if (n <= 45) out.push({ texto: n < 0 ? 'Contrato de aluguel vencido' : `Contrato de aluguel termina em ${n} dia${n !== 1 ? 's' : ''}`, sub: d.locador || d.fim_contrato.split('-').reverse().join('/') }) }
  return out
}

const UNID = { consumo_kwh: 'kWh', consumo_m3: 'm³', consumo_kg: 'kg' }

// Marca como paga e lança o gasto no histórico
export async function pagarConta(c, data = hoje(), forma) {
  const det = c.detalhes || {}
  const ck = Object.keys(UNID).find(k => det[k] != null && det[k] !== '')
  const { data: d, error } = await supabase.from('despesas').insert({
    tipo: c.custo_fixo_id ? 'fixo' : 'variavel', categoria_id: c.categoria_id, custo_fixo_id: c.custo_fixo_id || null,
    descricao: c.descricao, valor: c.valor, data, forma_pagamento: forma || c.forma_pagamento || 'Pix',
    explicacao: c.fornecedor ? `Conta ${c.fornecedor}` : null,
    consumo: ck ? Number(det[ck]) : null, unidade_consumo: ck ? UNID[ck] : null, fotos: [],
  }).select('id').single()
  if (error) throw error
  const { error: e2 } = await supabase.from('contas').update({ pago_em: data, despesa_id: d.id, forma_pagamento: forma || c.forma_pagamento || 'Pix' }).eq('id', c.id)
  if (e2) throw e2
}

export async function desfazerPagamento(c) {
  if (c.despesa_id) await supabase.from('despesas').delete().eq('id', c.despesa_id)
  await supabase.from('contas').update({ pago_em: null, despesa_id: null }).eq('id', c.id)
}

// Lê arquivo como base64, reduzindo fotos grandes
export async function arquivoBase64(file) {
  if (file.type.startsWith('image/')) {
    const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = URL.createObjectURL(file) })
    const max = 2000, k = Math.min(1, max / Math.max(img.width, img.height))
    const cv = document.createElement('canvas'); cv.width = img.width * k; cv.height = img.height * k
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
    return { mime: 'image/jpeg', data: cv.toDataURL('image/jpeg', 0.85).split(',')[1] }
  }
  const data = await new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = erro; r.readAsDataURL(file) })
  return { mime: file.type || 'application/pdf', data }
}

export async function lerContaIA(file, categorias) {
  const { mime, data } = await arquivoBase64(file)
  const { data: r, error } = await supabase.functions.invoke('ler-conta', { body: { arquivo: data, mime, categorias: categorias.map(c => ({ nome: c.nome })) } })
  if (error) {
    let msg = error.message
    try { msg = (await error.context.json()).erro || msg } catch { /* sem corpo */ }
    throw new Error(msg)
  }
  if (r?.erro) throw new Error(r.erro)
  return r.dados
}

export async function guardarArquivo(file) {
  const nome = `contas/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
  const { error } = await supabase.storage.from('documentos').upload(nome, file)
  if (error) throw error
  return nome
}
