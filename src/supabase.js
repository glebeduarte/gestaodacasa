import { createClient } from '@supabase/supabase-js'

const cliente = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const CAMPOS = { categoria_id: 'categoria', descricao: 'descrição', valor: 'valor', nome: 'nome', funcao: 'função', vencimento: 'vencimento', data: 'data', despesa_id: 'pagamento', pessoa_id: 'pessoa', obra_id: 'obra' }

// Traduz erros comuns do banco para algo legível
export function mensagemErro(e) {
  const m = e?.message || String(e)
  if (e?.code === '23503' || /foreign key/i.test(m)) return 'Este item está ligado a outros registros e não pode ser excluído assim.'
  if (e?.code === '23502' || /null value/i.test(m)) {
    const col = (m.match(/column "([^"]+)"/) || [])[1]
    return `Faltou preencher: ${CAMPOS[col] || col || 'um campo obrigatório'}.`
  }
  if (e?.code === '22P02' || /invalid input syntax/i.test(m)) return 'Algum valor está em formato inválido (confira números e datas).'
  if (/JWT|auth/i.test(m)) return 'Sua sessão expirou. Saia e entre de novo.'
  return m
}

// Toda gravação (insert, update, delete, upsert) que falhar vira erro de verdade:
// a tela não fecha como se tivesse salvo e o motivo aparece num aviso.
const ESCRITA = new Set(['insert', 'update', 'delete', 'upsert'])
function envolver(builder) {
  return new Proxy(builder, {
    get(alvo, prop) {
      if (prop === 'then') {
        return (ok, falha) => alvo.then(r => {
          if (r?.error) {
            window.dispatchEvent(new CustomEvent('erro-db', { detail: mensagemErro(r.error) }))
            const e = new Error(mensagemErro(r.error)); e.original = r.error; throw e
          }
          return r
        }).then(ok, falha)
      }
      const v = alvo[prop]
      if (typeof v !== 'function') return v
      return (...args) => { const out = v.apply(alvo, args); return out && typeof out.then === 'function' ? envolver(out) : out }
    },
  })
}
// Casa em uso: toda leitura das tabelas da casa é filtrada por ela e toda gravação leva o casa_id
const TABELAS_CASA = new Set(['categorias', 'contas', 'custos_fixos', 'despesas', 'documentos', 'estoque_itens', 'importacoes', 'manutencao_execucoes', 'manutencoes', 'obra_atualizacoes', 'obra_itens', 'obra_orcamentos', 'obras', 'pagamento_itens', 'pessoas', 'modulo_itens'])
let casaAtual = null
export const definirCasaAtual = (id) => { casaAtual = id }
export const casaAtualId = () => casaAtual
const comCasa = (dados) => {
  if (!casaAtual) return dados
  const pôr = (o) => (o && typeof o === 'object' && !o.casa_id ? { ...o, casa_id: casaAtual } : o)
  return Array.isArray(dados) ? dados.map(pôr) : pôr(dados)
}

const fromOriginal = cliente.from.bind(cliente)
cliente.from = (tabela) => new Proxy(fromOriginal(tabela), {
  get(alvo, prop) {
    const v = alvo[prop]
    const daCasa = TABELAS_CASA.has(tabela) && casaAtual
    if (daCasa && (prop === 'insert' || prop === 'upsert')) return (dados, ...rest) => envolver(v.call(alvo, comCasa(dados), ...rest))
    if (ESCRITA.has(prop)) return (...args) => envolver(v.apply(alvo, args))
    if (daCasa && prop === 'select') return (...args) => v.apply(alvo, args).eq('casa_id', casaAtual)
    return typeof v === 'function' ? v.bind(alvo) : v
  },
})

export const supabase = cliente
// Acesso sem o aviso automático (para quando o próprio código trata o erro)
export const semAviso = (tabela) => fromOriginal(tabela)
