export const BRAND = {
  name: 'TripTangle',
  tagline: 'Untangle your group trip',
  colors: {
    deep: '#1A5276',
    bright: '#2980B9',
    green: '#27AE60',
    amber: '#F39C12',
    red: '#E74C3C',
    light: '#EBF5FB',
  },
} as const;

export const AVAILABILITY_CYCLE: (
  | 'available'
  | 'maybe'
  | 'unavailable'
  | null
)[] = ['available', 'maybe', 'unavailable', null];

export const AVAILABILITY_COLORS = {
  available: 'bg-brand-green text-white',
  maybe: 'bg-brand-amber text-white',
  unavailable: 'bg-brand-red text-white',
} as const;

export const HEATMAP_COLORS = [
  'bg-brand-red/20',     // 0% available
  'bg-brand-amber/30',   // ~25%
  'bg-brand-amber/50',   // ~50%
  'bg-brand-green/40',   // ~75%
  'bg-brand-green/70',   // 100% available
] as const;

export const MAX_DATE_RANGE_DAYS = 60;
export const MIN_MEMBERS_FOR_AI = 3;
