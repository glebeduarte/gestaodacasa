import { createClient } from '@supabase/supabase-js'

const cliente = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Traduz erros comuns do banco para algo legível
export function mensagemErro(e) {
  const m = e?.message || String(e)
  if (e?.code === '23503' || /foreign key/i.test(m)) return 'Este item está ligado a outros registros e não pode ser excluído assim.'
  if (e?.code === '23502' || /null value/i.test(m)) return 'Faltou preencher um campo obrigatório.'
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
const fromOriginal = cliente.from.bind(cliente)
cliente.from = (tabela) => new Proxy(fromOriginal(tabela), {
  get(alvo, prop) {
    const v = alvo[prop]
    if (ESCRITA.has(prop)) return (...args) => envolver(v.apply(alvo, args))
    return typeof v === 'function' ? v.bind(alvo) : v
  },
})

export const supabase = cliente
// Acesso sem o aviso automático (para quando o próprio código trata o erro)
export const semAviso = (tabela) => fromOriginal(tabela)
