// Authentication helper functions

import { getToken, removeToken } from './api';

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = getToken();
  return token !== null && token !== '';
};

// Logout function
// Clears token, clears any user-related state, and redirects to login page
export const logout = (): void => {
  // Remove/clear the stored token
  removeToken();
  
  // Clear any user-related state from localStorage (if any)
  if (typeof window !== 'undefined') {
    // Clear any additional user data if stored
    localStorage.removeItem('user');
    localStorage.removeItem('teacher');
    localStorage.removeItem('userData');
    
    // Clear sessionStorage as well (if used)
    sessionStorage.clear();
    
    // Redirect to login page
    window.location.href = '/login';
  }
};

// Get current token (for debugging or display)
export const getCurrentToken = (): string | null => {
  return getToken();
};
