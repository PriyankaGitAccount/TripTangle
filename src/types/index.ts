export type AvailabilityStatus = 'available' | 'maybe' | 'unavailable';
export type MemberStatus = 'pending' | 'joined';

export interface Trip {
  id: string;
  name: string;
  description: string;
  destination: string;
  date_range_start: string;
  date_range_end: string;
  creator_member_id: string;
  locked_dates_start: string | null;
  locked_dates_end: string | null;
  created_at: string;
}

export interface Member {
  id: string;
  trip_id: string;
  display_name: string;
  status: MemberStatus;
  joined_at: string;
}

export interface Availability {
  id: string;
  member_id: string;
  trip_id: string;
  date: string;
  status: AvailabilityStatus;
  updated_at: string;
}

export interface AIRecommendation {
  id: string;
  trip_id: string;
  recommendation_json: RecommendationData;
  created_at: string;
}

export interface FallbackMonths {
  message: string;
  months: { name: string; reason: string }[];
}

export interface RecommendationData {
  best: DateOption;
  runner_up?: DateOption;
  alternatives?: DateOption[];
  nudge: string;
  fallback?: FallbackMonths;
}

export interface DateOption {
  start: string;
  end: string;
  available_count: number;
  maybe_count: number;
  total_members: number;
  summary: string;
  justification?: string;
  trade_off?: string;
  confidence?: number;
  option_type?: 'exact' | 'partial' | 'maybe_organiser' | 'maybe_member' | 'maybe_group';
}

export interface Vote {
  id: string;
  member_id: string;
  trip_id: string;
  option_index: number;
  created_at: string;
}

export interface TripData {
  trip: Trip;
  members: Member[];
  availability: Availability[];
  recommendation: AIRecommendation | null;
  votes: Vote[];
}

// ─── Plan: Itinerary ─────────────────────────────────────────────

export interface ItineraryActivity {
  time: 'Morning' | 'Afternoon' | 'Evening';
  title: string;
  place_name: string;   // specific name used for Google Maps / search
  description: string;
  category: 'accommodation' | 'restaurant' | 'activity' | 'transport';
}

export interface ItineraryDay {
  day: number;
  date: string;
  theme: string;
  activities: ItineraryActivity[];
}

export interface ItineraryData {
  destination: string;
  destination_lat: number;
  destination_lng: number;
  season: string;           // e.g. "Summer (June–August)"
  weather_context: string;  // brief climate note for that month
  summary: string;
  days: ItineraryDay[];
  tips: string[];
  search_queries: string[];
}

export interface Itinerary {
  id: string;
  trip_id: string;
  itinerary_json: ItineraryData;
  created_at: string;
}

// ─── Plan: Map Pins ──────────────────────────────────────────────

export type PinCategory = 'accommodation' | 'restaurant' | 'activity' | 'other';

export interface MapPin {
  id: string;
  trip_id: string;
  member_id: string;
  lat: number;
  lng: number;
  title: string;
  category: PinCategory;
  note: string;
  created_at: string;
}

// ─── Plan: Itinerary Suggestions ─────────────────────────────────

export interface ItinerarySuggestion {
  id: string;
  trip_id: string;
  member_id: string;
  suggestion: string;
  created_at: string;
}

// ─── Plan: Budget / Expenses ─────────────────────────────────────

export type ExpenseCategory = 'flights' | 'hotel' | 'food' | 'local_travel' | 'activity' | 'shopping';

export interface Expense {
  id: string;
  trip_id: string;
  paid_by_member_id: string;
  amount: number;
  description: string;
  category: ExpenseCategory;
  split_among: string[]; // member UUIDs
  created_at: string;
}

// ─── Plan: Photos ────────────────────────────────────────────────

export interface TripPhoto {
  id: string;
  trip_id: string;
  member_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

// ─── Plan: Polls ─────────────────────────────────────────────────

export interface Poll {
  id: string;
  trip_id: string;
  created_by_member_id: string | null;
  question: string;
  options: string[];
  poll_date: string | null;
  created_at: string;
}

export interface PollResponse {
  id: string;
  poll_id: string;
  member_id: string;
  option_index: number;
  created_at: string;
}
