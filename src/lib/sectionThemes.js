import { Home, Receipt, LayoutGrid, Users, Hammer, Wrench, Package, Waves, Leaf, PawPrint, FileText, Zap, Droplet, BrickWall, Sparkles, HeartPulse, Wifi, CreditCard, Car, Building2, Tractor, Flame, Utensils, ShieldCheck, Tag, History, BarChart3, FileBarChart } from 'lucide-react'

// Identidade visual de cada seção: nome, ícone e par de cores do degradê
export const SECOES = {
  inicio: { nome: 'Início', Icon: Home, g: ['#0a4f80', '#22a6cf'] },
  contas: { nome: 'Contas', Icon: Receipt, g: ['#0a5d93', '#2bb7dc'] },
  categorias: { nome: 'Categorias', Icon: LayoutGrid, g: ['#123c63', '#4c84b5'] },
  pessoas: { nome: 'Pessoas', Icon: Users, g: ['#5b3fa0', '#9a7fe0'] },
  obras: { nome: 'Obras', Icon: Hammer, g: ['#b4541e', '#f0a050'] },
  manutencoes: { nome: 'Manutenções', Icon: Wrench, g: ['#4a5a6a', '#8fa3b5'] },
  estoque: { nome: 'Estoque', Icon: Package, g: ['#7a5a2e', '#c9a46a'] },
  piscina: { nome: 'Piscina', Icon: Waves, g: ['#0583a8', '#3fd0e8'] },
  jardim: { nome: 'Jardim', Icon: Leaf, g: ['#1f7a4d', '#6cc28a'] },
  pets: { nome: 'Pets', Icon: PawPrint, g: ['#a33e6b', '#e88ab0'] },
  documentos: { nome: 'Documentos', Icon: FileText, g: ['#2f3e56', '#6b7f9e'] },
  veiculos: { nome: 'Veículos', Icon: Car, g: ['#3a4756', '#7b8ea3'] },
  condominio: { nome: 'Condomínio', Icon: Building2, g: ['#2f3e56', '#6b7f9e'] },
  rural: { nome: 'Rural', Icon: Tractor, g: ['#5a6a1f', '#a7bf55'] },
  historico: { nome: 'Histórico', Icon: History, g: ['#123c63', '#4c84b5'] },
  fechamento: { nome: 'Fechamento', Icon: BarChart3, g: ['#0a4f80', '#22a6cf'] },
  relatorios: { nome: 'Relatórios', Icon: FileBarChart, g: ['#2f3e56', '#6b7f9e'] },
  // categorias conhecidas
  energia: { nome: 'Energia', Icon: Zap, g: ['#c98a00', '#f5c542'] },
  agua: { nome: 'Água', Icon: Droplet, g: ['#0a6fb0', '#57b8f0'] },
  estrutura: { nome: 'Estrutura', Icon: BrickWall, g: ['#4a5a6a', '#8fa3b5'] },
  diaristas: { nome: 'Diaristas', Icon: Sparkles, g: ['#5b3fa0', '#9a7fe0'] },
  saude: { nome: 'Saúde', Icon: HeartPulse, g: ['#b43a4f', '#ef8a9a'] },
  internet: { nome: 'Internet', Icon: Wifi, g: ['#24507d', '#5f8fc4'] },
  cartao: { nome: 'Cartão de Crédito', Icon: CreditCard, g: ['#4b2f8f', '#8a6fd6'] },
  gas: { nome: 'Gás', Icon: Flame, g: ['#b4541e', '#f0a050'] },
  mercado: { nome: 'Mercado', Icon: Utensils, g: ['#1f7a4d', '#6cc28a'] },
  seguranca: { nome: 'Segurança', Icon: ShieldCheck, g: ['#24507d', '#5f8fc4'] },
}

// Paleta fixa para categorias criadas pelo usuário, escolhida pelo índice
const PALETA = [['#0a5d93', '#2bb7dc'], ['#1f7a4d', '#6cc28a'], ['#b4541e', '#f0a050'], ['#5b3fa0', '#9a7fe0'], ['#a33e6b', '#e88ab0'], ['#7a5a2e', '#c9a46a'], ['#24507d', '#5f8fc4'], ['#4a5a6a', '#8fa3b5'], ['#0583a8', '#3fd0e8'], ['#b43a4f', '#ef8a9a']]

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
const PALAVRAS = [['energia', 'energia'], ['luz', 'energia'], ['agua', 'agua'], ['poco', 'agua'], ['piscina', 'piscina'], ['jardim', 'jardim'], ['estrutura', 'estrutura'], ['reparo', 'estrutura'], ['diarista', 'diaristas'], ['limpeza', 'diaristas'], ['funcionari', 'diaristas'], ['caseiro', 'diaristas'], ['saude', 'saude'], ['internet', 'internet'], ['tv', 'internet'], ['cartao', 'cartao'], ['gas', 'gas'], ['combust', 'gas'], ['mercado', 'mercado'], ['pet', 'pets'], ['hanna', 'pets'], ['animai', 'pets'], ['obra', 'obras'], ['reforma', 'obras'], ['condominio', 'condominio'], ['iptu', 'documentos'], ['taxa', 'documentos'], ['seguranca', 'seguranca'], ['veiculo', 'veiculos'], ['racao', 'jardim'], ['insumo', 'estoque']]

// Chave visual de uma categoria (pelo nome); categorias sem correspondência recebem cor por índice
export function chaveCategoria(cat) {
  const n = norm(cat?.nome)
  const achou = PALAVRAS.find(([p]) => n.includes(p))
  return achou ? achou[1] : null
}
export function temaCategoria(cat, idx = 0) {
  const k = chaveCategoria(cat)
  if (k && SECOES[k]) return { ...SECOES[k], nome: cat.nome, arte: k }
  const h = [...(cat?.id || cat?.nome || String(idx))].reduce((t, c) => t + c.charCodeAt(0), idx)
  return { nome: cat?.nome || 'Categoria', Icon: Tag, g: PALETA[h % PALETA.length], arte: 'categorias' }
}
export const tema = (k) => SECOES[k] || SECOES.categorias

// Degradê padrão de cards
export const degrade = (g) => `linear-gradient(135deg, ${g[0]}f0, ${g[1]}cc)`
