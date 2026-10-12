// Temas de cor por casa. Cada um troca as variáveis principais do CSS.
// escuro = fundo do menu lateral; primaria = botões e links; destaque = detalhes; suave = fundos claros;
// hero = degradê do painel do início (3 tons) e brilho = luz no canto do painel.
export const TEMAS = {
  egeu: { nome: 'Egeu', escuro: '#0F4C81', primaria: '#1B6FB5', destaque: '#1FA9C0', suave: '#E0F5F8', hero: ['#0B3B66', '#135E9E', '#1B7FB9'], brilho: '#35C3D6' },
  esmeralda: { nome: 'Esmeralda', escuro: '#0F5444', primaria: '#16805F', destaque: '#2BB38A', suave: '#E0F5EC', hero: ['#0B4235', '#126B52', '#1A8C69'], brilho: '#5ED6AE' },
  oliva: { nome: 'Oliva', escuro: '#3F4A1E', primaria: '#5F7025', destaque: '#8FA33A', suave: '#EEF3DD', hero: ['#323B17', '#4F5D20', '#6C7F2B'], brilho: '#B8CF5A' },
  terracota: { nome: 'Terracota', escuro: '#7A3519', primaria: '#B5512A', destaque: '#E07B4A', suave: '#FCEBE2', hero: ['#5E2812', '#93421F', '#C05A30'], brilho: '#F2A275' },
  ambar: { nome: 'Âmbar', escuro: '#6B4708', primaria: '#A86C0C', destaque: '#D99A21', suave: '#FFF3DA', hero: ['#523606', '#87570A', '#B47A12'], brilho: '#F4C25B' },
  rose: { nome: 'Rosé', escuro: '#7A2346', primaria: '#B03A68', destaque: '#E0708F', suave: '#FCE6EE', hero: ['#5C1A35', '#902E55', '#B84A73'], brilho: '#F29BB5' },
  lavanda: { nome: 'Lavanda', escuro: '#3E2E78', primaria: '#5D46B0', destaque: '#8B74DB', suave: '#EEEAFB', hero: ['#2F2260', '#4A3891', '#6650BE'], brilho: '#AE9CF0' },
  grafite: { nome: 'Grafite', escuro: '#22303C', primaria: '#3D5163', destaque: '#6E8598', suave: '#E8EDF1', hero: ['#1A242E', '#2E3F4E', '#455B6E'], brilho: '#8FA6B9' },
}

export function aplicarTema(chave) {
  const t = TEMAS[chave] || TEMAS.egeu
  const r = document.documentElement.style
  r.setProperty('--aegean', t.escuro)
  r.setProperty('--primary', t.primaria)
  r.setProperty('--pool', t.destaque)
  r.setProperty('--pool-soft', t.suave)
  r.setProperty('--hero-a', t.hero[0]); r.setProperty('--hero-b', t.hero[1]); r.setProperty('--hero-c', t.hero[2])
  r.setProperty('--hero-glow', t.brilho)
}
