import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useCasa } from './casa'

// Imagens de topo enviadas pelo usuário, por seção ou categoria (section_key)
const Ctx = createContext({ capas: {}, enviar: async () => {} })
export const useCapas = () => useContext(Ctx)

async function comprimir(file, max = 1600, q = 0.8) {
  const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = URL.createObjectURL(file) })
  const k = Math.min(1, max / img.width)
  const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k)
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
  return await new Promise(ok => cv.toBlob(ok, 'image/jpeg', q))
}

export function CapasProvider({ children }) {
  const { casa } = useCasa() || {}
  const [capas, setCapas] = useState({})
  const carregar = useCallback(async () => {
    if (!casa?.id) return setCapas({})
    const { data } = await supabase.from('section_covers').select('section_key,image_path')
    const linhas = data || []
    if (!linhas.length) return setCapas({})
    const { data: urls } = await supabase.storage.from('section-covers').createSignedUrls(linhas.map(l => l.image_path), 60 * 60 * 6)
    const mapa = {}
    linhas.forEach((l, i) => { if (urls?.[i]?.signedUrl) mapa[l.section_key] = urls[i].signedUrl })
    setCapas(mapa)
  }, [casa?.id])
  useEffect(() => { carregar() }, [carregar])

  const enviar = async (chave, file) => {
    const blob = await comprimir(file)
    const caminho = `${casa.id}/${chave}-${Date.now()}.jpg`
    const { error } = await supabase.storage.from('section-covers').upload(caminho, blob, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    const { data: antiga } = await supabase.from('section_covers').select('image_path').eq('section_key', chave).maybeSingle()
    await supabase.from('section_covers').upsert({ casa_id: casa.id, section_key: chave, image_path: caminho, updated_at: new Date().toISOString() }, { onConflict: 'casa_id,section_key' })
    if (antiga?.image_path) supabase.storage.from('section-covers').remove([antiga.image_path]).then(() => null, () => null)
    setCapas(x => ({ ...x, [chave]: URL.createObjectURL(blob) }))
  }
  const remover = async (chave) => {
    const { data: antiga } = await supabase.from('section_covers').select('image_path').eq('section_key', chave).maybeSingle()
    await supabase.from('section_covers').delete().eq('section_key', chave)
    if (antiga?.image_path) supabase.storage.from('section-covers').remove([antiga.image_path]).then(() => null, () => null)
    setCapas(x => { const y = { ...x }; delete y[chave]; return y })
  }
  return <Ctx.Provider value={{ capas, enviar, remover }}>{children}</Ctx.Provider>
}
