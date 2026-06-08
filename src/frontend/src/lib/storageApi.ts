import { getApiUrl } from './apiUrl.js';

export interface StorageRecord<T = unknown> {
  key: string;
  value: T;
  updated_at?: string;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

async function storageFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const apiUrl = getApiUrl();
  const token = getAuthToken();
  const response = await fetch(`${apiUrl}/api/storage${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      payload?.error || `Storage API request failed with status ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

export async function getStorageValue<T = unknown>(
  key: string,
): Promise<StorageRecord<T> | null> {
  try {
    return await storageFetch<StorageRecord<T>>(`/${encodeURIComponent(key)}`);
  } catch (error) {
    return null;
  }
}

export async function setStorageValue<T = unknown>(
  key: string,
  value: T,
): Promise<StorageRecord<T>> {
  return await storageFetch<StorageRecord<T>>(`/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}
