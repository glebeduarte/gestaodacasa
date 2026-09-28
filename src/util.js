export const brl = (v) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export const brl2 = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const hoje = () => new Date().toISOString().slice(0, 10)

export const mesAtual = () => {
  const d = new Date()
  const y = d.getFullYear(), m = d.getMonth()
  const ini = new Date(y, m, 1).toISOString().slice(0, 10)
  const fim = new Date(y, m + 1, 0).toISOString().slice(0, 10)
  return { ini, fim, label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }
}

export const dataCurta = (s) => {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${d}/${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][+m - 1]}`
}

export const semanasDesde = (ini) => {
  if (!ini) return null
  const diff = (new Date() - new Date(ini)) / 86400000
  return Math.max(1, Math.floor(diff / 7) + 1)
}

export const STATUS_OBRA = {
  orcamento_pendente: { label: 'Sem orçamento', cls: 'chip-alerta' },
  em_andamento: { label: 'Em andamento', cls: 'chip-info' },
  pausada: { label: 'Pausada', cls: 'chip-neutra' },
  concluida: { label: 'Concluída', cls: 'chip-ok' },
  cancelada: { label: 'Cancelada', cls: 'chip-neutra' },
}

export const FREQ = {
  semanal: 'semanal', quinzenal: 'quinzenal', mensal: 'mensal', por_demanda: 'por demanda', por_obra: 'por obra',
}
export const UNIDADE = { mes: '/mês', diaria: '/diária', visita: '/visita', obra: '/obra', semana: '/semana' }
