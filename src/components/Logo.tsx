import logoUrl from '../assets/logo-mark.webp'

/** Logo de Kontrola (la "K" en verde y petróleo). */
export function Logo({ size = 40, label }: { size?: number; label?: string }) {
  return <img src={logoUrl} width={size} height={size} alt={label ?? ''} className="logo" draggable={false} />
}
