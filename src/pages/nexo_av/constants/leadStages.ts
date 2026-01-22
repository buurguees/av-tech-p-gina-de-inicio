// Lead Stage Colors and Labels
export const LEAD_STAGE_COLORS: Record<string, string> = {
  'prospect': 'bg-blue-100 text-blue-800 border-blue-300',
  'contacted': 'bg-purple-100 text-purple-800 border-purple-300',
  'qualified': 'bg-green-100 text-green-800 border-green-300',
  'negotiating': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'closed_won': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'closed_lost': 'bg-red-100 text-red-800 border-red-300',
  'on_hold': 'bg-gray-100 text-gray-800 border-gray-300',
};

export const LEAD_STAGE_LABELS: Record<string, string> = {
  'prospect': 'Prospecto',
  'contacted': 'Contactado',
  'qualified': 'Calificado',
  'negotiating': 'Negociando',
  'closed_won': 'Ganado',
  'closed_lost': 'Perdido',
  'on_hold': 'En Espera',
};

export type LeadStage = keyof typeof LEAD_STAGE_LABELS;
