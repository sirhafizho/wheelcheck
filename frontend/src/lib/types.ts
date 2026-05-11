export type AccessLevel = 'FULL' | 'PARTIAL' | 'NOT_ACCESSIBLE' | 'UNKNOWN';

export interface Place {
  id: string;
  name: string;
  nameMs?: string;
  latitude: number;
  longitude: number;
  address: string;
  city?: string;
  category?: string;
  accessibilityLevel: AccessLevel | null;
  description?: string;
  reviewCount: number;
  createdAt: string;
  lastReportedAt?: string;
  distance?: number | null;
}

export interface AccessReport {
  id: string;
  placeId: string;
  userId?: string | null;
  entrance: AccessLevel;
  toilet: AccessLevel;
  parking: AccessLevel;
  internalNav: AccessLevel;
  notes?: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface CreateReportRequest {
  placeId: string;
  entrance: string;
  toilet: string;
  parking: string;
  internalNav: string;
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
}
