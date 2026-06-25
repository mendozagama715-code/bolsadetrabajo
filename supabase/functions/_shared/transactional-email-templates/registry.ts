import type { ComponentType } from 'npm:react@18.3.1'
import { template as vacanteCompatible } from './vacante-compatible.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, unknown>
  to?: (data: any) => string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'vacante-compatible': vacanteCompatible,
}
