export function Meander() {
  return (
    <svg className="meander" viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true">
      <defs><pattern id="mk" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 11h10V1H3v7h4V4" fill="none" stroke="currentColor" strokeWidth="1.4" /></pattern></defs>
      <rect width="120" height="12" fill="url(#mk)" />
    </svg>
  )
}
