import { API_URL } from './constants';
import type {
  Place,
  AccessReport,
  CreateReportRequest,
  PlaceSearchParams,
  ApiResponse,
  PaginatedResponse,
} from './types';

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

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  async searchPlaces(params: PlaceSearchParams): Promise<PaginatedResponse<Place>> {
    // If lat/lng provided, use nearby endpoint
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

    // If query provided, use search endpoint
    if (params.query) {
      const places = await this.fetch<Place[]>(`/places/search?name=${encodeURIComponent(params.query)}`);
      return { data: places, total: places.length };
    }

    // Default: get all places
    const places = await this.fetch<Place[]>('/places');
    return { data: places, total: places.length };
  }

  async getPlace(id: string): Promise<ApiResponse<Place>> {
    const place = await this.fetch<Place>(`/places/${id}`);
    return { data: place };
  }

  async getNearbyPlaces(lat: number, lng: number, radius = 5000): Promise<PaginatedResponse<Place>> {
    return this.searchPlaces({ lat, lng, radius });
  }

  async getPlaceReports(placeId: string): Promise<PaginatedResponse<AccessReport>> {
    return this.fetch<PaginatedResponse<AccessReport>>(`/places/${placeId}/reports`);
  }

  async createReport(report: CreateReportRequest): Promise<ApiResponse<AccessReport>> {
    return this.fetch<ApiResponse<AccessReport>>('/reviews', {
      method: 'POST',
      body: JSON.stringify({
        placeId: report.placeId,
        entrance: report.entrance,
        toilet: report.toilet,
        parking: report.parking,
        internalNav: report.internalNav,
        comment: report.notes || null,
      }),
    });
  }
}

export const api = new ApiClient(API_URL);
