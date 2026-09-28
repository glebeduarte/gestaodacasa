import { Zap, Droplet, Waves, Leaf, BrickWall, PawPrint, Wifi, Tag, Sparkles, Home, Wrench, ShieldCheck, Flame, Trash2, Car, Utensils, Tv, Bug, Hammer } from 'lucide-react'


// Mapa padrão por nome normalizado
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

const PADRAO = {
  energia: { cls: 'c-energia', icon: 'Zap' },
  agua: { cls: 'c-agua', icon: 'Droplet' },
  piscina: { cls: 'c-piscina', icon: 'Waves' },
  jardim: { cls: 'c-jardim', icon: 'Leaf' },
  estrutura: { cls: 'c-estrutura', icon: 'BrickWall' },
  diaristas: { cls: 'c-diaristas', icon: 'Sparkles' },
  hanna: { cls: 'c-hanna', icon: 'PawPrint' },
  cachorra: { cls: 'c-hanna', icon: 'PawPrint' },
  'internet e seguranca': { cls: 'c-internet', icon: 'Wifi' },
  internet: { cls: 'c-internet', icon: 'Wifi' },
}

// Ícones disponíveis para escolher no editor
export const ICONES = { Zap, Droplet, Waves, Leaf, BrickWall, Sparkles, PawPrint, Wifi, Home, Wrench, ShieldCheck, Flame, Trash2, Car, Utensils, Tv, Bug, Hammer, Tag }

// Classes de cor disponíveis para escolher (mapeiam para --c/--cs no CSS)
export const CORES = ['c-energia', 'c-agua', 'c-piscina', 'c-jardim', 'c-estrutura', 'c-diaristas', 'c-hanna', 'c-internet', 'c-obras', 'c-pessoas', 'c-manut', 'c-docs', 'c-estoque', 'c-neutral']

export function catStyle(cat) {
  if (!cat) return { cls: 'c-neutral', Icon: Tag }
  const p = PADRAO[norm(cat.nome)] || {}
  const cls = cat.cor || p.cls || 'c-neutral'
  const iconName = cat.icone || p.icon || 'Tag'
  const Icon = ICONES[iconName] || Tag
  return { cls, Icon, iconName }
}

// Tile com ícone da categoria
export function CatTile({ cat, size = 'md' }) {
  const { cls, Icon } = catStyle(cat)
  const s = size === 'sm' ? 18 : size === 'lg' ? 28 : 22
  return <span className={`tile t-${size} ${cls}`}><Icon size={s} className="i" /></span>
}
