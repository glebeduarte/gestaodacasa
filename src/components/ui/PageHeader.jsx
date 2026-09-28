export function PageHeader({ eyebrow, titulo, acao }) {
  return (
    <header className="hdr">
      <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{titulo}</h1></div>
      {acao}
    </header>
  )
}
