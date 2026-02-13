// Lead Stage Colors and Labels
// Solo 4 estados: NEGOTIATION, WON, LOST, RECURRING
export const LEAD_STAGE_COLORS: Record<string, string> = {
  'NEGOTIATION': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'WON': 'bg-green-500/20 text-green-400 border-green-500/30',
  'LOST': 'bg-red-500/20 text-red-400 border-red-500/30',
  'RECURRING': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

export const LEAD_STAGE_LABELS: Record<string, string> = {
  'NEGOTIATION': 'En Negociación',
  'WON': 'Ganado',
  'LOST': 'Perdido',
  'RECURRING': 'Recurrente',
};

export type LeadStage = keyof typeof LEAD_STAGE_LABELS;
