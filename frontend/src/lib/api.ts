import { supabase } from './supabase';
import { Task, CreateTaskRequest, UpdateTaskRequest, ApiResponse, User } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'No access token found' } };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Fetch Error:', error);
    return { success: false, error: { code: 'NETWORK_ERROR', message: 'Failed to connect to API' } };
  }
}

export const api = {
  auth: {
    syncProfile: () => fetchWithAuth<User>('/auth/sync', { method: 'POST', body: JSON.stringify({}) }),
    getMe: () => fetchWithAuth<User>('/auth/me', { method: 'GET' }),
  },
  users: {
    list: () => fetchWithAuth<User[]>('/users', { method: 'GET' }),
    search: (query: string) => fetchWithAuth<User[]>(`/users/search?q=${encodeURIComponent(query)}`, { method: 'GET' }),
  },
  tasks: {
    list: (filters?: Record<string, string>) => {
      const query = new URLSearchParams(filters || {}).toString();
      return fetchWithAuth<Task[]>(`/tasks${query ? `?${query}` : ''}`, { method: 'GET' });
    },
    get: (id: string) => fetchWithAuth<Task>(`/tasks/${id}`, { method: 'GET' }),
    create: (data: CreateTaskRequest) => fetchWithAuth<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateTaskRequest) => fetchWithAuth<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    complete: (id: string) => fetchWithAuth<Task>(`/tasks/${id}/complete`, { method: 'POST' }),
    delete: (id: string) => fetchWithAuth<{message: string}>(`/tasks/${id}`, { method: 'DELETE' }),
  }
};
