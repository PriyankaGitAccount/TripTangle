export type AvailabilityStatus = 'available' | 'maybe' | 'unavailable';
export type MemberStatus = 'pending' | 'joined';

export interface Trip {
  id: string;
  name: string;
  description: string;
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

export interface RecommendationData {
  best: DateOption;
  runner_up: DateOption;
  nudge: string;
}

export interface DateOption {
  start: string;
  end: string;
  available_count: number;
  maybe_count: number;
  total_members: number;
  summary: string;
  trade_off?: string;
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
