import type { DepartmentScope } from './types';

export interface AIMode {
  value: DepartmentScope;
  label: string;
  description: string;
}

export const AI_MODES: AIMode[] = [
  { value: 'general', label: 'General', description: 'Contexto general del ERP' },
  { value: 'administration', label: 'Administración', description: 'Facturas, pagos, contabilidad' },
  { value: 'commercial', label: 'Comercial', description: 'Clientes, presupuestos, pipeline' },
  { value: 'marketing', label: 'Marketing', description: 'Campañas y métricas (V2)' },
  { value: 'programming', label: 'Programación', description: 'Desarrollo y deploys (V2)' },
];

export const DEFAULT_MODE: DepartmentScope = 'general';
