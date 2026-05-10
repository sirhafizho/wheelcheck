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
    const searchParams = new URLSearchParams();
    
    if (params.query) searchParams.set('query', params.query);
    if (params.lat !== undefined) searchParams.set('lat', params.lat.toString());
    if (params.lng !== undefined) searchParams.set('lng', params.lng.toString());
    if (params.radius) searchParams.set('radius', params.radius.toString());
    if (params.accessLevel) searchParams.set('accessLevel', params.accessLevel);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());

    return this.fetch<PaginatedResponse<Place>>(`/places?${searchParams}`);
  }

  async getPlace(id: string): Promise<ApiResponse<Place>> {
    return this.fetch<ApiResponse<Place>>(`/places/${id}`);
  }

  async getNearbyPlaces(lat: number, lng: number, radius = 5000): Promise<PaginatedResponse<Place>> {
    return this.searchPlaces({ lat, lng, radius });
  }

  async getPlaceReports(placeId: string): Promise<PaginatedResponse<AccessReport>> {
    return this.fetch<PaginatedResponse<AccessReport>>(`/places/${placeId}/reports`);
  }

  async createReport(report: CreateReportRequest): Promise<ApiResponse<AccessReport>> {
    const formData = new FormData();
    
    formData.append('placeId', report.placeId);
    formData.append('entrance', report.entrance);
    formData.append('toilet', report.toilet);
    formData.append('parking', report.parking);
    formData.append('internal', report.internal);
    
    if (report.notes) {
      formData.append('notes', report.notes);
    }
    
    if (report.photos && report.photos.length > 0) {
      report.photos.forEach((photo, index) => {
        formData.append(`photos`, photo);
      });
    }

    return this.fetch<ApiResponse<AccessReport>>('/reports', {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: formData,
    });
  }
}

export const api = new ApiClient(API_URL);
