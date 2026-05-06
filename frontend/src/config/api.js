/**
 * API Configuration for Qyantram
 * 
 * Automatically uses:
 * - Deployed backend URL in production
 * - Local backend in development
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://qyantram-backend-899612241600.us-central1.run.app'

export function getAPIEndpoint(path) {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${cleanPath}`
}

export const API_ENDPOINTS = {
  SIMULATE: getAPIEndpoint('simulate'),
  HEALTH: getAPIEndpoint('health'),
  AI_EXPLAIN: getAPIEndpoint('ai-explain'),
  LEARN_EXPLAIN: getAPIEndpoint('learn/explain'),
}

export default API_BASE_URL
