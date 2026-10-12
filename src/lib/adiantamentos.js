import { supabase } from '../supabase'

// Adiantamento = gasto já pago à pessoa (conta no mês em que o dinheiro saiu)
// que fica "em aberto" até ser descontado de um pagamento seguinte.
// descontado guarda quanto dele já foi abatido; o restante passa para o próximo pagamento.

export const restante = (a) => Math.max(0, Number(a.valor) - Number(a.descontado || 0))

export async function adiantamentosAbertos(pessoaId) {
  const { data } = await supabase.from('despesas').select('id,valor,descontado,data,descricao,explicacao')
    .eq('pessoa_id', pessoaId).eq('adiantamento', true).order('data')
  return (data || []).filter(a => restante(a) > 0.004)
}

// Saldo em aberto de todas as pessoas: { pessoa_id: valor }
export async function saldosAdiantamento() {
  const { data } = await supabase.from('despesas').select('pessoa_id,valor,descontado').eq('adiantamento', true)
  const out = {}
  for (const a of data || []) { const r = restante(a); if (r > 0.004) out[a.pessoa_id] = (out[a.pessoa_id] || 0) + r }
  return out
}

// Distribui o desconto pelos adiantamentos (mais antigos primeiro) até o limite do valor bruto
export function distribuir(abertos, selecionados, bruto) {
  let livre = Math.max(0, bruto)
  return abertos.filter(a => selecionados[a.id]).map(a => {
    const v = Math.min(restante(a), livre)
    livre -= v
    return { ...a, aplicar: Math.round(v * 100) / 100, sobra: Math.round((restante(a) - v) * 100) / 100 }
  })
}

export async function registrarDescontos(aplicados) {
  for (const a of aplicados.filter(x => x.aplicar > 0)) {
    await supabase.from('despesas').update({ descontado: Math.round((Number(a.descontado || 0) + a.aplicar) * 100) / 100 }).eq('id', a.id)
  }
}

// Ao excluir um pagamento, devolve aos adiantamentos o que tinha sido descontado nele
export async function reverterDescontos(despesaId) {
  const { data: itens } = await supabase.from('pagamento_itens').select('adiantamento_id,valor').eq('despesa_id', despesaId).not('adiantamento_id', 'is', null)
  for (const it of itens || []) {
    const { data: a } = await supabase.from('despesas').select('descontado').eq('id', it.adiantamento_id).single()
    if (a) await supabase.from('despesas').update({ descontado: Math.max(0, Number(a.descontado) - Number(it.valor)) }).eq('id', it.adiantamento_id)
  }
}
