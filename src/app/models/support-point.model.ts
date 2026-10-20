export type PointCategory = 
  | 'soup_kitchen'
  | 'food_bank'
  | 'shelter'
  | 'community_centre'
  | 'collection_point';

export type UrgencyLevel = 'critical' | 'high' | 'moderate';

export type NeededItemType = 
  | 'non_perishable'
  | 'fresh_produce'
  | 'prepared_meals'
  | 'winter_clothes'
  | 'hygiene'
  | 'volunteers'
  | 'financial_pix';

export interface NeededItemDetail {
  id: NeededItemType;
  label: string;
  icon: string;
  description: string;
}

export interface SupportPoint {
  id: string;
  name: string;
  category: PointCategory;
  categoryLabel: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  urgency: UrgencyLevel;
  neededItems: NeededItemType[];
  urgencyNote?: string;
  openingHours?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  pixKey?: string;
  pixType?: string;
  email?: string;
  website?: string;
  instagram?: string;
  acceptsVolunteers?: boolean;
  volunteerRoles?: string[];
  verified: boolean;
  source: 'osm' | 'verified_partner' | 'community_submission';
  mealsPerDayEstimate?: number;
  updatedAt?: string;
}

export interface WeatherContext {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  weatherDescription: string;
  isColdWave: boolean;
  isRainy: boolean;
  humanitarianNotice: string;
}

export interface CategoryFilterOption {
  id: PointCategory | 'all';
  label: string;
  icon: string;
  count?: number;
}
