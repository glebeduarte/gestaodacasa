import { supabase, semAviso, mensagemErro } from '../supabase'
import { reverterDescontos } from './adiantamentos'

// Exclui de verdade; se o item estiver ligado a outros registros, arquiva (some das listas)
export async function excluirOuArquivar(tabela, id) {
  const { error } = await semAviso(tabela).delete().eq('id', id)
  if (!error) return 'excluido'
  if (error.code === '23503') {
    await supabase.from(tabela).update({ ativo: false }).eq('id', id)
    return 'arquivado'
  }
  throw new Error(mensagemErro(error))
}

// Exclui um gasto e, se ele veio de uma conta, volta a conta para "não paga"
export async function excluirDespesa(id) {
  const { data: d } = await supabase.from('despesas').select('adiantamento,descontado').eq('id', id).single()
  if (d?.adiantamento && Number(d.descontado) > 0) throw new Error('Este adiantamento já foi descontado em um pagamento. Exclua primeiro o pagamento em que ele foi abatido.')
  await reverterDescontos(id)
  await supabase.from('contas').update({ pago_em: null, despesa_id: null }).eq('despesa_id', id)
  await supabase.from('despesas').delete().eq('id', id)
}

export const confirmar = (txt) => window.confirm(txt)
