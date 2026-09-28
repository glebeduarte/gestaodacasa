const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmt2 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const brl = (v) => fmt.format(Number(v || 0))
export const brl2 = (v) => fmt2.format(Number(v || 0))
export const brlCurto = (v) => { const n = Number(v || 0); return n >= 10000 ? `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : brl(n) }

export const hoje = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) }
export const somarDias = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }
export const diasAte = (d) => d ? Math.round((new Date(d + 'T12:00:00') - new Date(hoje() + 'T12:00:00')) / 86400000) : null

export const mesAtual = (offset = 0) => {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset)
  const y = d.getFullYear(), m = d.getMonth()
  const ini = `${y}-${String(m + 1).padStart(2, '0')}-01`
  const fim = new Date(y, m + 1, 0); const fimS = `${y}-${String(m + 1).padStart(2, '0')}-${String(fim.getDate()).padStart(2, '0')}`
  return { ini, fim: fimS, ym: ini.slice(0, 7), label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }
}
export const mesDe = (ym) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1, 1); const fim = new Date(y, m, 0); return { ini: `${ym}-01`, fim: `${ym}-${String(fim.getDate()).padStart(2, '0')}`, ym, label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) } }
export const mesAnterior = (ym) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
export const nomeMesCurto = (ym) => new Date(ym + '-02T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
export const nomeMes = (ym) => new Date(ym + '-02T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export const dataCurta = (s) => { if (!s) return ''; const [, m, d] = s.split('-'); return `${d} ${MES[+m - 1]}` }
export const dataDia = (s) => { if (!s) return ''; const d = new Date(s + 'T12:00:00'); return `${DIA[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` }
export const dataLonga = (d = new Date()) => { const s = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); return s[0].toUpperCase() + s.slice(1) }
export const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' }
export const iniciais = (n) => (n || '?').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase()

export const semanasDesde = (ini) => { if (!ini) return null; return Math.max(1, Math.floor((new Date() - new Date(ini + 'T12:00:00')) / 86400000 / 7) + 1) }
export const semanasTotal = (ini, fim) => (ini && fim) ? Math.max(1, Math.ceil((new Date(fim + 'T12:00:00') - new Date(ini + 'T12:00:00')) / 86400000 / 7)) : null

export const STATUS_OBRA = {
  orcamento_pendente: { label: 'Sem orçamento', cls: 'warn' },
  em_andamento: { label: 'Em andamento', cls: 'pool' },
  pausada: { label: 'Pausada', cls: '' },
  concluida: { label: 'Concluída', cls: 'ok' },
  cancelada: { label: 'Cancelada', cls: '' },
}
export const FREQ = { semanal: 'semanal', quinzenal: 'quinzenal', mensal: 'mensal', por_demanda: 'por demanda', por_obra: 'por obra' }
export const UNIDADE = { mes: 'por mês', diaria: 'por diária', visita: 'por visita', obra: 'por obra', semana: 'por semana' }
export const DIAS_SEM = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
export const INTERVALOS = [[7, 'toda semana'], [15, 'a cada 15 dias'], [30, 'todo mês'], [90, 'a cada 3 meses'], [180, 'a cada 6 meses'], [365, 'uma vez por ano'], [730, 'a cada 2 anos']]
export const nomeIntervalo = (n) => INTERVALOS.find(i => i[0] === n)?.[1] || `a cada ${n} dias`

export const primeiroNome = (email) => { if (!email) return ''; const n = email.split('@')[0].replace(/[._]/g, ' ').trim().split(' ')[0]; return n.charAt(0).toUpperCase() + n.slice(1) }
export const dataExtenso = () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase())

export const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
export const MESES_EXT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const dataCurta2 = (s) => { if (!s) return ''; const d = new Date(s + 'T12:00:00'); return `${d.getDate()} ${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][d.getMonth()]}` }
export const variacao = (a, b) => b ? Math.round((a - b) / b * 100) : null
export const diasEntre = (d) => diasAte(d)
