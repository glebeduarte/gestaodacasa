// Catálogo da Gestão Doméstica: tipos de casa, módulos e o que cada um cria ao ser ativado.
// Categoria: [nome, icone, cor]. Manutenção: [nome, intervalo em dias, categoria]. Estoque: [nome, unidade, mínimo, categoria].

const C = {
  energia: ['Energia', 'Zap', 'c-energia'],
  agua: ['Água', 'Droplet', 'c-agua'],
  gas: ['Gás', 'Flame', 'c-estoque'],
  internet: ['Internet e TV', 'Wifi', 'c-internet'],
  estrutura: ['Estrutura e reparos', 'BrickWall', 'c-estrutura'],
  mercado: ['Mercado', 'Utensils', 'c-jardim'],
  saude: ['Saúde', 'HeartPulse', 'c-saude'],
  cartao: ['Cartão de Crédito', 'CreditCard', 'c-cartao'],
  limpeza: ['Limpeza e diaristas', 'Sparkles', 'c-diaristas'],
  condominio: ['Condomínio', 'Home', 'c-docs'],
  iptu: ['IPTU e taxas', 'ShieldCheck', 'c-neutral'],
  seguranca: ['Segurança', 'ShieldCheck', 'c-internet'],
  piscina: ['Piscina', 'Waves', 'c-piscina'],
  jardim: ['Jardim', 'Leaf', 'c-jardim'],
  pets: ['Pets', 'PawPrint', 'c-hanna'],
  veiculos: ['Veículos', 'Car', 'c-estrutura'],
  pessoas: ['Funcionários', 'Sparkles', 'c-diaristas'],
  obras: ['Obras e reformas', 'Hammer', 'c-obras'],
  poco: ['Água e poço', 'Droplet', 'c-agua'],
  combustivel: ['Combustível', 'Flame', 'c-energia'],
  racao: ['Ração e trato', 'Leaf', 'c-jardim'],
  animais: ['Animais', 'PawPrint', 'c-hanna'],
  insumos: ['Insumos e plantio', 'Leaf', 'c-estoque'],
  caseiro: ['Caseiro', 'Home', 'c-diaristas'],
}

// Módulos: o que aparece no menu e o que é criado quando o módulo é ligado
export const MODULOS = {
  pessoas: {
    nome: 'Pessoas e funcionários', icone: 'Users', rota: '/pessoas', desc: 'Diaristas, caseiro, babá, jardineiro. Pagamentos, extras e adiantamentos.',
    categorias: [C.pessoas],
  },
  obras: {
    nome: 'Obras e reformas', icone: 'Hammer', rota: '/obras', desc: 'Checklist do que será feito, orçamentos, pagamentos e andamento.',
    categorias: [C.obras],
  },
  manutencoes: {
    nome: 'Manutenções', icone: 'Wrench', rota: '/manutencoes', desc: 'Agenda de cuidados que se repetem, com aviso quando atrasam.',
  },
  estoque: {
    nome: 'Estoque', icone: 'Package', rota: '/estoque', desc: 'O que tem em casa, com mínimo e lista de compras pelo WhatsApp.',
    estoque: [['Papel higiênico', 'pacotes', 2, 'Limpeza e diaristas'], ['Detergente', 'un', 3, 'Limpeza e diaristas'], ['Água mineral (galão)', 'galões', 1, 'Mercado']],
  },
  piscina: {
    nome: 'Piscina', icone: 'Waves', rota: '/m/piscina', desc: 'Tratamento, insumos e manutenção da piscina.',
    categorias: [C.piscina],
    manutencoes: [['Limpeza da piscina', 7, 'Piscina'], ['Medir pH e cloro', 7, 'Piscina'], ['Retrolavagem do filtro', 30, 'Piscina'], ['Revisão da bomba', 180, 'Piscina']],
    estoque: [['Cloro', 'baldes', 1, 'Piscina'], ['Barrilha / elevador de pH', 'kg', 2, 'Piscina'], ['Algicida', 'litros', 1, 'Piscina']],
    item: { rotulo: 'Piscina', campos: [['volume_m3', 'Volume (m³)'], ['tipo', 'Tipo (alvenaria, fibra, vinil)'], ['aquecimento', 'Aquecimento']] },
  },
  jardim: {
    nome: 'Jardim', icone: 'Leaf', rota: '/m/jardim', desc: 'Poda, adubação, irrigação e jardineiro.',
    categorias: [C.jardim],
    manutencoes: [['Corte da grama', 15, 'Jardim'], ['Poda de árvores e arbustos', 120, 'Jardim'], ['Adubação', 90, 'Jardim'], ['Revisão da irrigação', 180, 'Jardim']],
    estoque: [['Adubo', 'kg', 5, 'Jardim'], ['Terra vegetal', 'sacos', 2, 'Jardim']],
    item: { rotulo: 'Área do jardim', campos: [['area_m2', 'Área (m²)'], ['plantas', 'Principais plantas'], ['irrigacao', 'Irrigação']] },
  },
  pets: {
    nome: 'Pets', icone: 'PawPrint', rota: '/m/pets', desc: 'Cada animal com vacinas, veterinário, ração e cuidador.',
    categorias: [C.pets],
    manutencoes: [['Vermífugo', 90, 'Pets'], ['Antipulgas', 30, 'Pets'], ['Banho e tosa', 15, 'Pets']],
    estoque: [['Ração', 'kg', 3, 'Pets'], ['Areia / tapete higiênico', 'pacotes', 1, 'Pets']],
    item: { rotulo: 'Pet', campos: [['especie', 'Espécie'], ['raca', 'Raça'], ['nascimento', 'Nascimento', 'date'], ['peso', 'Peso (kg)'], ['veterinario', 'Veterinário'], ['vacinas', 'Vacinas em dia até', 'date']] },
  },
  veiculos: {
    nome: 'Veículos', icone: 'Car', rota: '/m/veiculos', desc: 'IPVA, seguro, licenciamento, revisões e combustível.',
    categorias: [C.veiculos, C.combustivel],
    manutencoes: [['Troca de óleo', 180, 'Veículos'], ['Revisão geral', 365, 'Veículos'], ['Calibrar pneus', 15, 'Veículos']],
    item: { rotulo: 'Veículo', campos: [['modelo', 'Modelo'], ['placa', 'Placa'], ['ano', 'Ano'], ['km', 'Quilometragem'], ['seguro_vence', 'Seguro vence em', 'date'], ['ipva_vence', 'IPVA vence em', 'date']] },
  },
  condominio: {
    nome: 'Condomínio', icone: 'Building2', rota: '/m/condominio', desc: 'Boleto mensal, taxas extras, assembleias e contatos da administração.',
    categorias: [C.condominio],
    item: { rotulo: 'Unidade', campos: [['bloco', 'Bloco / quadra'], ['unidade', 'Unidade / lote'], ['administradora', 'Administradora'], ['sindico', 'Síndico (contato)'], ['portaria', 'Portaria (telefone)'], ['vencimento', 'Dia do boleto']] },
  },
  rural: {
    nome: 'Rural', icone: 'Tractor', rota: '/m/rural', desc: 'Animais, ração, insumos, plantio, poço e cercas.',
    categorias: [C.animais, C.racao, C.insumos, C.poco],
    manutencoes: [['Revisão da bomba do poço', 180, 'Água e poço'], ['Conferir cercas', 30, 'Estrutura e reparos'], ['Roçagem', 60, 'Insumos e plantio'], ['Vacinação do rebanho', 180, 'Animais'], ['Revisão do gerador', 180, 'Energia']],
    estoque: [['Ração', 'sacos', 5, 'Ração e trato'], ['Sal mineral', 'sacos', 2, 'Ração e trato'], ['Óleo diesel', 'litros', 20, 'Combustível']],
    item: { rotulo: 'Lote de animais / área', campos: [['tipo', 'Tipo (gado, galinhas, horta…)'], ['quantidade', 'Quantidade'], ['local', 'Local / piquete']] },
  },
}

// Tipos de casa: categorias padrão, módulos sugeridos e manutenções da casa
export const TIPOS_CASA = {
  residencial: {
    nome: 'Casa residencial', icone: 'Home', desc: 'Casa de rua, com quintal e estrutura própria.',
    categorias: [C.energia, C.agua, C.gas, C.internet, C.estrutura, C.mercado, C.saude, C.cartao, C.limpeza, C.iptu],
    modulos: ['pessoas', 'obras', 'manutencoes', 'estoque'],
    manutencoes: [["Limpar caixa d'água", 180, 'Água'], ['Dedetização', 180, 'Estrutura e reparos'], ['Limpar calhas', 90, 'Estrutura e reparos'], ['Revisar ar-condicionado', 180, 'Energia'], ['Revisão elétrica', 365, 'Energia']],
  },
  condominio: {
    nome: 'Casa em condomínio', icone: 'Building2', desc: 'Casa com taxa de condomínio, portaria e áreas comuns.',
    categorias: [C.energia, C.agua, C.gas, C.internet, C.estrutura, C.mercado, C.saude, C.cartao, C.limpeza, C.condominio, C.iptu],
    modulos: ['pessoas', 'obras', 'manutencoes', 'estoque', 'condominio'],
    manutencoes: [["Limpar caixa d'água", 180, 'Água'], ['Dedetização', 180, 'Estrutura e reparos'], ['Revisar ar-condicionado', 180, 'Energia']],
  },
  apartamento: {
    nome: 'Apartamento', icone: 'Building', desc: 'Sem área externa; condomínio cuida das áreas comuns.',
    categorias: [C.energia, C.gas, C.internet, C.condominio, C.iptu, C.mercado, C.saude, C.cartao, C.limpeza],
    modulos: ['condominio', 'manutencoes', 'estoque'],
    manutencoes: [['Revisar ar-condicionado', 180, 'Energia'], ['Trocar filtro de água', 180, 'Mercado'], ['Vistoria do gás', 365, 'Gás']],
  },
  sitio: {
    nome: 'Granja / Sítio', icone: 'Tractor', desc: 'Propriedade rural com animais, plantio, poço e caseiro.',
    categorias: [C.energia, C.poco, C.combustivel, C.estrutura, C.caseiro, C.mercado, C.cartao],
    modulos: ['rural', 'pessoas', 'obras', 'manutencoes', 'estoque', 'veiculos'],
    manutencoes: [['Limpar reservatório', 180, 'Água e poço'], ['Dedetização', 180, 'Estrutura e reparos']],
  },
  praia: {
    nome: 'Casa de praia / temporada', icone: 'Waves', desc: 'Uso por temporada; atenção à maresia e ao caseiro.',
    categorias: [C.energia, C.agua, C.internet, C.estrutura, C.caseiro, C.iptu],
    modulos: ['pessoas', 'manutencoes', 'piscina'],
    manutencoes: [['Revisão contra maresia (ferragens e portões)', 90, 'Estrutura e reparos'], ['Limpeza antes da temporada', 90, 'Estrutura e reparos'], ["Limpar caixa d'água", 180, 'Água']],
  },
}

export const nomeTipo = (t) => TIPOS_CASA[t]?.nome || 'Casa'
export const temModulo = (casa, m) => !!casa?.modulos?.includes(m)

// Monta o "pacote" do que será criado: tipo + módulos escolhidos, sem repetir nomes
export function pacoteInicial(tipo, modulos) {
  const t = TIPOS_CASA[tipo] || TIPOS_CASA.residencial
  const cats = new Map(), manut = new Map(), est = new Map()
  const addCat = ([n, i, c]) => { if (!cats.has(n)) cats.set(n, { nome: n, icone: i, cor: c }) }
  t.categorias.forEach(addCat)
  ;(t.manutencoes || []).forEach(([n, d, c]) => manut.set(n, { nome: n, intervalo_dias: d, categoria: c, origem: t.nome }))
  modulos.forEach(m => {
    const mod = MODULOS[m]; if (!mod) return
    ;(mod.categorias || []).forEach(addCat)
    if (modulos.includes('manutencoes') || m !== 'manutencoes') (mod.manutencoes || []).forEach(([n, d, c]) => manut.set(n, { nome: n, intervalo_dias: d, categoria: c, origem: mod.nome }))
    if (modulos.includes('estoque')) (mod.estoque || []).forEach(([n, u, min, c]) => est.set(n, { nome: n, unidade: u, minimo: min, categoria: c, origem: mod.nome }))
  })
  // Manutenções/estoque só fazem sentido com o módulo ligado
  return {
    categorias: [...cats.values()],
    manutencoes: modulos.includes('manutencoes') ? [...manut.values()] : [],
    estoque: modulos.includes('estoque') ? [...est.values()] : [],
  }
}
