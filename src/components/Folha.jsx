import { Ic } from './Icones'
export function Folha({ titulo, onFechar, children }) {
  return (
    <div className="folha-fundo" onClick={onFechar}>
      <div className="folha" onClick={e => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <div className="cabecalho">
          <h2>{titulo}</h2>
          <button className="icone-btn" onClick={onFechar} aria-label="Fechar"><Ic n="fechar" s={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
