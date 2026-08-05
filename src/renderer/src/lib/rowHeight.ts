import type { ComponentType, SVGProps } from 'react'
import type { RowHeight } from '@shared/types'
import { RowHeightMediumIcon, RowHeightShortIcon, RowHeightTallIcon } from './rowHeightIcons'

export type RowHeightIcon = ComponentType<SVGProps<SVGSVGElement>>

export interface RowHeightInfo {
  value: RowHeight
  label: string
  icon: RowHeightIcon
  /** Tailwind class applied to every cell in a row to size it. */
  rowClass: string
  /** Number of text lines cell content clamps to before truncating. */
  lineClamp: number
}

export const ROW_HEIGHT_OPTIONS: RowHeightInfo[] = [
  { value: 'short', label: 'Short', icon: RowHeightShortIcon, rowClass: 'h-9', lineClamp: 1 },
  { value: 'medium', label: 'Medium', icon: RowHeightMediumIcon, rowClass: 'h-16', lineClamp: 2 },
  { value: 'tall', label: 'Tall', icon: RowHeightTallIcon, rowClass: 'h-28', lineClamp: 4 }
]

export function rowHeightInfo(value: RowHeight | undefined): RowHeightInfo {
  return ROW_HEIGHT_OPTIONS.find((o) => o.value === value) ?? ROW_HEIGHT_OPTIONS[0]
}
