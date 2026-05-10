export type AccessLevel = 'FULL' | 'PARTIAL' | 'NOT_ACCESSIBLE' | 'UNKNOWN';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  location: Location;
  accessLevel: AccessLevel;
  category?: string;
  description?: string;
  reportCount: number;
  lastReportedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccessReport {
  id: string;
  placeId: string;
  userId?: string;
  entrance: 'ramped' | 'flat' | 'stairs' | 'assisted';
  toilet: 'yes' | 'partial' | 'no' | 'unknown';
  parking: 'yes' | 'nearby' | 'no' | 'unknown';
  internal: 'easy' | 'moderate' | 'difficult' | 'unknown';
  notes?: string;
  photos?: string[];
  createdAt: string;
}

export interface CreateReportRequest {
  placeId: string;
  entrance: string;
  toilet: string;
  parking: string;
  internal: string;
  notes?: string;
  photos?: File[];
}

export interface PlaceSearchParams {
  query?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  accessLevel?: AccessLevel;
  limit?: number;
  offset?: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
