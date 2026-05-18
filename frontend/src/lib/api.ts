import { API_URL } from './constants';
import { setBackendStatus } from './backendStatus';
import type {
  Place,
  AccessReport,
  Comment,
  CreateReportRequest,
  CreateCommentRequest,
  PlaceSearchParams,
  ApiResponse,
  PaginatedResponse,
  Favorite,
  FavoriteStatus,
} from './types';

export async function semanticSearchPlaces(
  query: string,
  lat?: number,
  lng?: number,
  radius = 5000,
  limit = 20
): Promise<Place[]> {
  const params = new URLSearchParams({ q: query, radius: String(radius), limit: String(limit) });
  if (lat !== undefined) params.set('lat', String(lat));
  if (lng !== undefined) params.set('lng', String(lng));
  try {
    const response = await fetch(`${API_URL}/places/semantic-search?${params}`);
    if (response.status === 503 || response.status === 502) {
      setBackendStatus('booting');
      return [];
    }
    if (!response.ok) return [];
    setBackendStatus('online');
    return response.json();
  } catch {
    setBackendStatus('booting');
    return [];
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (response.status === 503 || response.status === 502) {
        setBackendStatus('booting');
        throw new Error(`HTTP ${response.status} — backend starting up`);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      setBackendStatus('online');
      return await response.json();
    } catch (error) {
      // Network-level failure (connection refused, DNS, etc.) also means booting/offline
      if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('network'))) {
        setBackendStatus('booting');
      }
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  async searchPlaces(params: PlaceSearchParams): Promise<PaginatedResponse<Place>> {
    if (params.lat !== undefined && params.lng !== undefined) {
      const places = await this.fetch<Place[]>('/places/nearby', {
        method: 'POST',
        body: JSON.stringify({
          latitude: params.lat,
          longitude: params.lng,
          radius: params.radius || 5000,
        }),
      });
      return { data: places, total: places.length };
    }

    if (params.query) {
      const places = await this.fetch<Place[]>(`/places/search?name=${encodeURIComponent(params.query)}`);
      return { data: places, total: places.length };
    }

    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const response = await this.fetch<{ content: Place[]; totalElements: number }>(`/places?page=${page}&size=${size}`);
    return { data: response.content, total: response.totalElements };
  }

  async getPlace(id: string): Promise<ApiResponse<Place>> {
    const place = await this.fetch<Place>(`/places/${id}`);
    return { data: place };
  }

  async getNearbyPlaces(lat: number, lng: number, radius = 5000): Promise<PaginatedResponse<Place>> {
    return this.searchPlaces({ lat, lng, radius });
  }

  async semanticSearch(q: string, lat?: number, lng?: number, radius = 5000, limit = 20): Promise<Place[]> {
    return semanticSearchPlaces(q, lat, lng, radius, limit);
  }

  async getPlaceReports(placeId: string): Promise<AccessReport[]> {
    return this.fetch<AccessReport[]>(`/places/${placeId}/reports`);
  }

  async createReport(report: CreateReportRequest, token?: string): Promise<AccessReport> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return this.fetch<AccessReport>('/reviews', {
      method: 'POST',
      body: JSON.stringify({
        placeId: report.placeId,
        entrance: report.entrance,
        toilet: report.toilet,
        parking: report.parking,
        internalNav: report.internalNav,
        notes: report.notes || null,
      }),
      headers,
    });
  }

  async getComments(placeId: string, token?: string): Promise<Comment[]> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return this.fetch<Comment[]>(`/comments/place/${placeId}`, {
      headers,
    });
  }

  async createComment(request: CreateCommentRequest, token?: string): Promise<Comment> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return this.fetch<Comment>('/comments', {
      method: 'POST',
      body: JSON.stringify(request),
      headers,
    });
  }

  async voteComment(commentId: string, type: 'up' | 'down', token?: string): Promise<Comment> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return this.fetch<Comment>(`/comments/${commentId}/vote?type=${type}`, {
      method: 'POST',
      headers,
    });
  }

  async getFavoriteStatus(placeId: string, token?: string): Promise<FavoriteStatus> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return this.fetch<FavoriteStatus>(`/favorites/${placeId}/status`, { headers });
  }

  async toggleFavorite(placeId: string, token: string): Promise<FavoriteStatus> {
    return this.fetch<FavoriteStatus>(`/favorites/${placeId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }

  async getUserFavorites(token: string): Promise<Favorite[]> {
    return this.fetch<Favorite[]>('/favorites', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  }
}

export const api = new ApiClient(API_URL);
