export type AccessLevel = 'FULL' | 'PARTIAL' | 'NOT_ACCESSIBLE' | 'UNKNOWN';
export type AccessibilityFeature = 'wheelchairAccessible' | 'accessibleToilet' | 'accessibleParking' | 'wideEntrance';

export interface Place {
  id: string;
  name: string;
  nameMs?: string;
  latitude: number;
  longitude: number;
  address: string | null;
  city?: string;
  state?: string;
  dataSource?: string;
  category?: string;
  accessibilityLevel: AccessLevel | null;
  description?: string;
  osmWheelchairTag?: string | null;
  osmToiletAccessible?: boolean | null;
  osmTactilePaving?: boolean | null;
  osmSurface?: string | null;
  osmIncline?: string | null;
  osmEntranceWheelchair?: string | null;
  osmKerbTactile?: boolean | null;
  reviewCount: number;
  createdAt: string;
  lastReportedAt?: string;
  distance?: number | null;
  isLive?: boolean;
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
  accessibilityFeatures?: AccessibilityFeature[];
  limit?: number;
  offset?: number;
  page?: number;
  size?: number;
}

export interface Favorite {
  id: string;
  placeId: string;
  placeName?: string | null;
  placeCategory?: string | null;
  accessibilityLevel?: string | null;
  createdAt: string;
}

export interface FavoriteStatus {
  favorited: boolean;
  totalFavorites: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}
