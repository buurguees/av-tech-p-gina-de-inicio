/**
 * CORS configuration for Edge Functions
 * Restricts origins to allowed domains for security
 */

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://avtechesdeveniments.com',
  'https://www.avtechesdeveniments.com',
  'https://avtech-305e7.web.app',
  'https://avtech-305e7.firebaseapp.com',
  // Development origins
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

// Lovable preview origins pattern
const LOVABLE_PREVIEW_PATTERN = /^https:\/\/[a-z0-9-]+\.lovable\.app$/;
const LOVABLE_DEV_PATTERN = /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/;

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  // Check explicit allowed origins
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }
  
  // Check Lovable preview patterns
  if (LOVABLE_PREVIEW_PATTERN.test(origin) || LOVABLE_DEV_PATTERN.test(origin)) {
    return true;
  }
  
  return false;
}

/**
 * Get CORS headers for a request
 * Returns headers with the appropriate origin or a default fallback
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Legacy CORS headers for backward compatibility
 * Use getCorsHeaders(origin) for new functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
