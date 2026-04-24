// Client-side auth utilities using localStorage

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export function getAccessToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function getRefreshToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  return null;
}

export function setTokens(accessToken, refreshToken) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearTokens() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export async function fetchWithAuth(url, options = {}) {
  const token = getAccessToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  let response = await fetch(url, {
    ...options,
    headers,
  });
  
  // If token expired, try to refresh
  if (response.status === 401) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`
        },
      });
      
      if (refreshRes.ok) {
        const { accessToken, refreshToken: newRefreshToken } = await refreshRes.json();
        setTokens(accessToken, newRefreshToken);
        
        // Retry original request with new token
        headers['Authorization'] = `Bearer ${accessToken}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      } else {
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    } else {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }
  
  return response;
}