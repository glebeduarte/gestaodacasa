import { useRef, useState } from 'react'
import { Camera, MapPin, Home } from 'lucide-react'
import { useCapas } from '../lib/capas'
import { useCasa } from '../lib/casa'
import { nomeTipo } from '../lib/tipos'
import { arte } from '../lib/sectionArt'
import { SECOES } from '../lib/sectionThemes'
import { useToast } from './ui/Toast'

// Foto da casa selecionada, no topo do Início: identifica de qual casa são os números da tela
export function CasaCapa({ children }) {
  const { casa, podeEditar } = useCasa() || {}
  const { capas, enviar } = useCapas()
  const toast = useToast()
  const inp = useRef(null)
  const [enviando, setEnviando] = useState(false)
  const foto = capas.casa
  const trocar = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setEnviando(true)
    try { await enviar('casa', f); toast('Foto da casa atualizada') } catch (err) { toast({ txt: err.message, erro: true }) } finally { setEnviando(false) }
  }
  return (
    <section className="v2-casa">
      <div className="v2-casa-foto">
        <div className="v2-casa-img" key={foto || 'arte'} style={{ backgroundImage: `url("${foto || arte('inicio', SECOES.inicio.g)}")` }} />
        <div className="v2-casa-grad" />
        <div className="v2-pills">
          <span className="v2-pill"><i />{nomeTipo(casa?.tipo)}</span>
          {casa?.cidade && <span className="v2-pill"><MapPin size={12} />{casa.cidade}</span>}
        </div>
        {podeEditar && (<>
          <button className="v2-casa-btn" onClick={() => inp.current?.click()} disabled={enviando}><Camera size={13} />{enviando ? 'Enviando…' : foto ? 'Trocar foto' : 'Foto da casa'}</button>
          <input ref={inp} type="file" accept="image/*" hidden onChange={trocar} />
        </>)}
        <div className="v2-casa-nome">
          {!foto && <Home size={20} />}
          <h2>{casa?.nome}</h2>
        </div>
      </div>
      <div className="v2-casa-lado">{children}</div>
    </section>
  )
}
