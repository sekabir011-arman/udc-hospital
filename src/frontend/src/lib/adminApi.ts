/**
 * Admin API utilities for managing staff approvals and user status
 * Communicates with backend admin endpoints via JWT authentication
 */

import { getApiUrl } from './apiUrl.js';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: 'pending' | 'active' | 'approved' | 'rejected' | 'disabled';
  phone?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

/**
 * Get JWT token from localStorage (for admin API calls)
 */
export function getAdminToken(): string | null {
  // Try to get token from backend auth session first
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token'); // Set by backend login
    if (token) return token;
  }
  return null;
}

/**
 * Make authenticated API call to admin endpoint
 */
async function adminFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiUrl = getApiUrl();
  const token = getAdminToken();

  if (!token) {
    throw new Error('No authentication token found. Please login as admin first.');
  }

  const url = `${apiUrl}/api/auth${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const result = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(result.error || `API error: ${response.status}`);
  }

  return (result.data || result) as T;
}

/**
 * Get all pending users awaiting approval
 */
export async function getPendingUsers(): Promise<User[]> {
  try {
    const result = await adminFetch<{ data: User[] }>('/users/pending');
    return Array.isArray(result) ? result : result.data || [];
  } catch (error) {
    console.error('Failed to fetch pending users:', error);
    throw error;
  }
}

/**
 * Get all users with optional filtering
 */
export async function getAllUsers(filters?: {
  role?: string;
  status?: string;
}): Promise<User[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.status) params.append('status', filters.status);

    const url = `/users${params.toString() ? '?' + params.toString() : ''}`;
    const result = await adminFetch<{ data: User[] }>(url);
    return Array.isArray(result) ? result : result.data || [];
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}

/**
 * Get specific user details
 */
export async function getUserById(userId: string): Promise<User> {
  try {
    return await adminFetch<User>(`/users/${userId}`);
  } catch (error) {
    console.error(`Failed to fetch user ${userId}:`, error);
    throw error;
  }
}

/**
 * Approve a single user (change status to 'active')
 */
export async function approveUser(userId: string): Promise<User> {
  try {
    const result = await adminFetch<{ user: User }>(`/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' }),
    });

    return (result as any).user || result;
  } catch (error) {
    console.error(`Failed to approve user ${userId}:`, error);
    throw error;
  }
}

/**
 * Reject a single user (change status to 'rejected')
 */
export async function rejectUser(userId: string): Promise<User> {
  try {
    const result = await adminFetch<{ user: User }>(`/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected' }),
    });

    return (result as any).user || result;
  } catch (error) {
    console.error(`Failed to reject user ${userId}:`, error);
    throw error;
  }
}

/**
 * Update user status (generic)
 */
export async function updateUserStatus(
  userId: string,
  status: 'pending' | 'active' | 'approved' | 'rejected' | 'disabled'
): Promise<User> {
  try {
    const result = await adminFetch<{ user: User }>(`/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });

    return (result as any).user || result;
  } catch (error) {
    console.error(`Failed to update user ${userId} status:`, error);
    throw error;
  }
}

/**
 * Approve multiple users in bulk
 */
export async function approveUsersBulk(userIds: string[]): Promise<User[]> {
  try {
    const result = await adminFetch<{ updated: User[] }>('/users/bulk/approve', {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });

    return (result as any).updated || [];
  } catch (error) {
    console.error('Failed to approve users in bulk:', error);
    throw error;
  }
}

/**
 * Reject multiple users in bulk
 */
export async function rejectUsersBulk(userIds: string[]): Promise<User[]> {
  try {
    const result = await adminFetch<{ updated: User[] }>('/users/bulk/reject', {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });

    return (result as any).updated || [];
  } catch (error) {
    console.error('Failed to reject users in bulk:', error);
    throw error;
  }
}

/**
 * Disable a user account
 */
export async function disableUser(userId: string): Promise<User> {
  try {
    return await updateUserStatus(userId, 'disabled');
  } catch (error) {
    console.error(`Failed to disable user ${userId}:`, error);
    throw error;
  }
}
