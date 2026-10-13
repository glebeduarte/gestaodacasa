// Ilustrações SVG padrão de cada seção, usadas enquanto não há imagem de topo enviada.
// Retorna um data URI pronto para background-image.
const cache = new Map()

export function arte(chave, g) {
  const id = `${chave}|${g[0]}|${g[1]}`
  if (cache.has(id)) return cache.get(id)
  const k = String(chave).replace('cat_', '')
  const W = 'rgba(255,255,255,', a = g[0], b = g[1]
  const r = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('')
  const M = {
    inicio: `<rect x="330" y="230" width="420" height="20" fill="${W}.9)"/><polygon points="320,120 540,40 760,120" fill="${W}.85)"/><rect x="330" y="120" width="420" height="22" fill="${W}.7)"/>${r(6, i => `<rect x="${352 + i * 70}" y="145" width="26" height="85" fill="${W}.8)"/>`)}<ellipse cx="540" cy="275" rx="300" ry="22" fill="${W}.25)"/>`,
    contas: r(4, i => `<g transform="rotate(${-12 + i * 8} 560 170)"><rect x="${440 + i * 40}" y="${50 + i * 14}" width="150" height="200" rx="10" fill="${W}${.35 + i * .15})"/>${r(5, j => `<rect x="${460 + i * 40}" y="${80 + i * 14 + j * 28}" width="${110 - j * 12}" height="8" rx="4" fill="${a}55"/>`)}</g>`),
    categorias: r(9, i => `<rect x="${430 + (i % 3) * 95}" y="${40 + Math.floor(i / 3) * 85}" width="80" height="70" rx="16" fill="${W}${.25 + (i % 4) * .15})"/>`),
    pessoas: r(5, i => `<circle cx="${420 + i * 75}" cy="${130 + (i % 2) * 30}" r="30" fill="${W}.8)"/><path d="M${375 + i * 75},${240 + (i % 2) * 30} q45,-80 90,0" fill="${W}.6)"/>`),
    obras: `<rect x="600" y="30" width="14" height="240" fill="${W}.85)"/><rect x="430" y="40" width="300" height="12" fill="${W}.85)"/><line x1="470" y1="52" x2="470" y2="150" stroke="${W}.8)" stroke-width="3"/><rect x="450" y="150" width="40" height="30" fill="${W}.7)"/>${r(12, i => `<rect x="${640 + (i % 3) * 42}" y="${170 + Math.floor(i / 3) * 24}" width="38" height="20" fill="${W}${.4 + (i % 3) * .15})"/>`)}`,
    manutencoes: `<g transform="translate(580 150)">${r(8, i => `<rect x="-14" y="-95" width="28" height="40" rx="6" fill="${W}.8)" transform="rotate(${i * 45})"/>`)}<circle r="68" fill="${W}.8)"/><circle r="28" fill="${b}"/></g><g transform="translate(720 230)">${r(6, i => `<rect x="-8" y="-50" width="16" height="22" rx="4" fill="${W}.5)" transform="rotate(${i * 60})"/>`)}<circle r="36" fill="${W}.5)"/></g>`,
    estoque: r(6, i => `<g transform="translate(${450 + (i % 3) * 95} ${i < 3 ? 160 : 70})"><rect width="88" height="88" rx="8" fill="${W}${.45 + (i % 3) * .15})"/><rect x="34" width="20" height="88" fill="${a}33"/></g>`),
    piscina: r(6, i => `<path d="M300 ${60 + i * 42} q60 -22 120 0 t120 0 t120 0 t120 0 t120 0" fill="none" stroke="${W}${.85 - i * .1})" stroke-width="7" stroke-linecap="round"/>`) + `<circle cx="720" cy="70" r="30" fill="${W}.6)"/>`,
    jardim: r(9, i => `<ellipse cx="${430 + (i % 3) * 110}" cy="${70 + Math.floor(i / 3) * 85}" rx="58" ry="22" fill="${W}${.35 + (i % 3) * .2})" transform="rotate(${-35 + i * 17} ${430 + (i % 3) * 110} ${70 + Math.floor(i / 3) * 85})"/>`),
    pets: r(4, i => { const x = 440 + i * 95, y = 220 - i * 45; return `<g fill="${W}${.5 + i * .12})"><ellipse cx="${x}" cy="${y}" rx="26" ry="22"/>${r(4, j => `<circle cx="${x - 30 + j * 20}" cy="${y - 30 - (j % 3 === 0 ? 0 : 10)}" r="10"/>`)}</g>` }),
    documentos: r(3, i => `<g transform="rotate(${-8 + i * 8} 590 160)"><path d="M${490 + i * 50} ${50 + i * 10} h110 l40 40 v170 h-150z" fill="${W}${.4 + i * .2})"/>${r(6, j => `<rect x="${510 + i * 50}" y="${110 + i * 10 + j * 22}" width="100" height="7" rx="3" fill="${a}55"/>`)}</g>`),
    energia: `<polygon points="600,20 500,170 580,170 540,290 690,120 600,120 650,20" fill="${W}.85)"/>${r(10, i => `<circle cx="${420 + i * 35}" cy="${40 + (i * 53) % 240}" r="${3 + i % 3}" fill="${W}.6)"/>`)}`,
    agua: r(7, i => `<path d="M${430 + (i % 4) * 90} ${40 + Math.floor(i / 4) * 130} q-34 50 0 70 q34 -20 0 -70z" transform="scale(1.3) translate(${-140 + (i % 4) * -10} -10)" fill="${W}${.4 + (i % 3) * .2})"/>`),
    estrutura: `<rect x="420" y="40" width="340" height="22" fill="${W}.8)"/>${r(5, i => `<rect x="${440 + i * 70}" y="62" width="34" height="190" fill="${W}${.5 + (i % 2) * .3})"/>${r(3, j => `<rect x="${447 + i * 70 + j * 8}" y="70" width="3" height="175" fill="${a}44"/>`)}`)}<rect x="400" y="252" width="380" height="22" fill="${W}.8)"/>`,
    diaristas: r(14, i => `<circle cx="${420 + (i * 67) % 340}" cy="${40 + (i * 41) % 240}" r="${10 + (i % 5) * 9}" fill="none" stroke="${W}${.4 + (i % 3) * .2})" stroke-width="4"/>`),
    saude: r(5, i => { const x = 430 + (i % 3) * 120, y = 80 + Math.floor(i / 3) * 120, s = .8 + (i % 2) * .5; return `<path transform="translate(${x} ${y}) scale(${s})" d="M0 15 C0 -10 35 -10 35 15 C35 -10 70 -10 70 15 C70 40 35 60 35 70 C35 60 0 40 0 15z" fill="${W}${.4 + i * .1})"/>` }),
    internet: r(4, i => `<path d="M${590 - 40 - i * 45} ${230 - i * 40} a${40 + i * 45} ${40 + i * 45} 0 0 1 ${80 + i * 90} 0" fill="none" stroke="${W}${.9 - i * .15})" stroke-width="16" stroke-linecap="round"/>`) + `<circle cx="590" cy="250" r="16" fill="${W}.9)"/>`,
  }
  // seções sem desenho próprio reaproveitam o mais próximo
  const ALIAS = { historico: 'contas', fechamento: 'inicio', relatorios: 'documentos', condominio: 'estrutura', veiculos: 'manutencoes', rural: 'jardim', cartao: 'contas', gas: 'energia', mercado: 'estoque', seguranca: 'internet' }
  const m = M[k] || M[ALIAS[k]] || M.categorias
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 300" preserveAspectRatio="xMaxYMid slice"><defs><radialGradient id="l" cx="80%" cy="20%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="${a}"/></linearGradient></defs><rect width="800" height="300" fill="url(#b)"/><rect width="800" height="300" fill="url(#l)"/>${m}</svg>`
  const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  cache.set(id, uri)
  return uri
}
