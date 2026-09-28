import { supabase } from '../supabase'

export async function enviarFotos(files, pasta) {
  const urls = []
  for (const f of files) {
    const nome = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${f.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
    const { error } = await supabase.storage.from('fotos').upload(nome, f)
    if (error) throw error
    urls.push(supabase.storage.from('fotos').getPublicUrl(nome).data.publicUrl)
  }
  return urls
}
