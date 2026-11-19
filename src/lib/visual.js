import { useEffect, useState } from 'react'

// Visual do app (vidro fosco) com modo escuro ou claro. A escolha fica salva neste aparelho.
const CH = 'gd-modo'
const ler = () => {
  try { const v = localStorage.getItem(CH); if (v) return v === 'claro' } catch { /* sem armazenamento */ }
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches
}
const ouvintes = new Set()
let claroAtual = ler()

function aplicar() {
  const r = document.documentElement
  r.classList.toggle('claro', claroAtual)
  const m = document.querySelector('meta[name=theme-color]')
  if (m && r.classList.contains('v2')) m.setAttribute('content', claroAtual ? '#EEEFE7' : '#14130d')
}

// Liga o visual novo enquanto a área logada estiver montada (a página pública mantém o próprio visual)
export function useVisualApp() {
  useEffect(() => { document.documentElement.classList.add('v2'); aplicar(); return () => document.documentElement.classList.remove('v2', 'claro') }, [])
}

export function useVisual() {
  const [claro, setClaro] = useState(claroAtual)
  useEffect(() => { ouvintes.add(setClaro); return () => ouvintes.delete(setClaro) }, [])
  const alternar = () => {
    claroAtual = !claroAtual
    try { localStorage.setItem(CH, claroAtual ? 'claro' : 'escuro') } catch { /* sem armazenamento */ }
    aplicar(); ouvintes.forEach(f => f(claroAtual))
  }
  return { noite: true, claro, alternar }
}
