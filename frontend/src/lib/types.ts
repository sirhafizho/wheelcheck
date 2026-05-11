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
  userName?: string | null;
  entrance: AccessLevel;
  toilet: AccessLevel;
  parking: AccessLevel;
  internalNav: AccessLevel;
  notes?: string | null;
  photoUrls: string[];
  isVerified: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  placeId: string;
  userId?: string | null;
  userName?: string | null;
  parentId?: string | null;
  content: string;
  upvotes: number;
  downvotes: number;
  userVote?: string | null;
  replies: Comment[];
  createdAt: string;
  updatedAt: string;
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

export interface CreateCommentRequest {
  placeId: string;
  parentId?: string | null;
  content: string;
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
