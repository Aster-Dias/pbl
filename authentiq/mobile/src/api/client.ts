import { networkManager } from '../utils/network';

const API_BASE_URL_KEY = '@authentiq_api_base_url_v1';
export const DEFAULT_API_BASE_URL = 'http://localhost:8080';

export function getApiBaseUrl(): string {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(API_BASE_URL_KEY) || DEFAULT_API_BASE_URL;
  }
  return DEFAULT_API_BASE_URL;
}

export function setApiBaseUrl(url: string) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(API_BASE_URL_KEY, url.replace(/\/$/, ''));
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; errorCode?: string }> {
  if (!networkManager.isOnline()) {
    throw new Error('NETWORK_OFFLINE: Cannot connect in offline mode');
  }

  const baseUrl = getApiBaseUrl();
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('@authentiq_jwt_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const json = await res.json();
    return json;
  } catch (error: any) {
    if (error.message?.includes('NETWORK_OFFLINE')) {
      throw error;
    }
    return {
      success: false,
      message: error.message || 'Network request failed',
      errorCode: 'NETWORK_ERROR',
    };
  }
}
