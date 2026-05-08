// API utility functions for authenticated requests

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');

if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is required');
}

// Get token from localStorage
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

// Set token in localStorage
export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
};

// Remove token from localStorage
export const removeToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
};

// Make an authenticated API request
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(`${API_BASE_URL}${normalizedEndpoint}`, {
    ...options,
    headers,
  });

  // If unauthorized, remove token and redirect to login
  if (response.status === 401) {
    removeToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  return response;
};

// Convenience method for GET requests
export const apiGet = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  return apiRequest(endpoint, { ...options, method: 'GET' });
};

// Convenience method for POST requests
export const apiPost = async (endpoint: string, data?: any, options?: RequestInit): Promise<Response> => {
  return apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
};

// Convenience method for PUT requests
export const apiPut = async (endpoint: string, data?: any, options?: RequestInit): Promise<Response> => {
  return apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
};

// Convenience method for DELETE requests
export const apiDelete = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  return apiRequest(endpoint, { ...options, method: 'DELETE' });
};
