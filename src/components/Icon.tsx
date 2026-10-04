import {
  Baby,
  Briefcase,
  Bus,
  Car,
  CircleDollarSign,
  Coffee,
  Dumbbell,
  Ellipsis,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  Repeat,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Utensils,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Category } from '../lib/types'

/** Íconos disponibles para categorías (nombre guardado → componente). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  coffee: Coffee,
  bus: Bus,
  car: Car,
  fuel: Fuel,
  house: House,
  wifi: Wifi,
  receipt: Receipt,
  'heart-pulse': HeartPulse,
  dumbbell: Dumbbell,
  'gamepad-2': Gamepad2,
  'shopping-bag': ShoppingBag,
  shirt: Shirt,
  scissors: Scissors,
  repeat: Repeat,
  smartphone: Smartphone,
  'graduation-cap': GraduationCap,
  plane: Plane,
  gift: Gift,
  'paw-print': PawPrint,
  baby: Baby,
  sparkles: Sparkles,
  briefcase: Briefcase,
  laptop: Laptop,
  'piggy-bank': PiggyBank,
  'circle-dollar-sign': CircleDollarSign,
  ellipsis: Ellipsis,
}

/** Nombre legible de cada ícono (para lectores de pantalla). */
export const ICON_LABELS: Record<string, string> = {
  'shopping-cart': 'Carro de compras',
  utensils: 'Cubiertos',
  coffee: 'Café',
  bus: 'Bus',
  car: 'Auto',
  fuel: 'Bencina',
  house: 'Casa',
  wifi: 'Internet',
  receipt: 'Boleta',
  'heart-pulse': 'Salud',
  dumbbell: 'Gimnasio',
  'gamepad-2': 'Juegos',
  'shopping-bag': 'Bolsa de compras',
  shirt: 'Ropa',
  scissors: 'Peluquería',
  repeat: 'Suscripción',
  smartphone: 'Celular',
  'graduation-cap': 'Educación',
  plane: 'Viajes',
  gift: 'Regalos',
  'paw-print': 'Mascota',
  baby: 'Hijos',
  sparkles: 'Otros gustos',
  briefcase: 'Trabajo',
  laptop: 'Computador',
  'piggy-bank': 'Ahorro',
  'circle-dollar-sign': 'Dinero',
  ellipsis: 'Otros',
}

export function CategoryIcon({
  category,
  size = 'md',
}: {
  category: Pick<Category, 'icon' | 'color'> | undefined
  size?: 'sm' | 'md' | 'lg'
}) {
  const Glyph = (category && CATEGORY_ICONS[category.icon]) || Ellipsis
  const color = category?.color ?? 'var(--muted)'
  return (
    <span className={`cat-icon cat-icon--${size}`} style={{ '--cat': color } as CSSProperties} aria-hidden="true">
      <Glyph strokeWidth={2} />
    </span>
  )
}
