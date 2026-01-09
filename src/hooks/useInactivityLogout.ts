import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseInactivityLogoutOptions {
  /** Timeout in minutes before auto-logout (default: 30) */
  timeoutMinutes?: number;
  /** Warning time in minutes before logout (default: 5) */
  warningMinutes?: number;
  /** Callback when warning is triggered */
  onWarning?: (remainingSeconds: number) => void;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook that automatically logs out users after a period of inactivity
 * Shows a warning toast before logout and resets timer on user activity
 */
export function useInactivityLogout(options: UseInactivityLogoutOptions = {}) {
  const {
    timeoutMinutes = 30,
    warningMinutes = 5,
    onWarning,
    enabled = true,
  } = options;

  const navigate = useNavigate();
  const { toast } = useToast();
  
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasWarnedRef = useRef(false);

  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = warningMinutes * 60 * 1000;
  const warningTriggerMs = timeoutMs - warningMs;

  const performLogout = useCallback(async () => {
    try {
      // Clear the OTP skip timestamp since this is an inactivity logout
      try {
        localStorage.removeItem('nexo_av_last_login');
      } catch {
        // Ignore localStorage errors
      }
      
      await supabase.auth.signOut();
      toast({
        title: "Sesión cerrada",
        description: "Tu sesión ha expirado por inactividad.",
        variant: "default",
      });
      navigate('/nexo-av', { replace: true });
    } catch (error) {
      console.error('Error during inactivity logout:', error);
      navigate('/nexo-av', { replace: true });
    }
  }, [navigate, toast]);

  const showWarning = useCallback(() => {
    if (hasWarnedRef.current) return;
    
    hasWarnedRef.current = true;
    const remainingSeconds = warningMinutes * 60;
    
    toast({
      title: "⚠️ Sesión a punto de expirar",
      description: `Tu sesión se cerrará en ${warningMinutes} minutos por inactividad. Mueve el ratón o pulsa una tecla para mantenerla activa.`,
      duration: 10000,
    });

    onWarning?.(remainingSeconds);
  }, [toast, warningMinutes, onWarning]);

  const resetTimers = useCallback(() => {
    // Clear existing timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }

    // Reset warning state
    hasWarnedRef.current = false;

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      showWarning();
    }, warningTriggerMs);

    // Set logout timer
    inactivityTimerRef.current = setTimeout(() => {
      performLogout();
    }, timeoutMs);
  }, [warningTriggerMs, timeoutMs, showWarning, performLogout]);

  useEffect(() => {
    if (!enabled) return;

    // Activity events that reset the timer
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'wheel',
    ];

    // Throttle the reset function to prevent excessive calls
    let lastReset = Date.now();
    const throttledReset = () => {
      const now = Date.now();
      if (now - lastReset > 1000) { // Only reset if more than 1 second has passed
        lastReset = now;
        resetTimers();
      }
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, throttledReset, { passive: true });
    });

    // Initial timer setup
    resetTimers();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, throttledReset);
      });
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
    };
  }, [enabled, resetTimers]);

  return {
    resetTimers,
  };
}

export default useInactivityLogout;
