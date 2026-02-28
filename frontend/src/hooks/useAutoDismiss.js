import { useEffect } from 'react';

/**
 * Auto-dismiss a state value after a delay.
 * Usage: useAutoDismiss(success, setSuccess, 3000);
 */
export default function useAutoDismiss(value, setter, delay = 3000) {
  useEffect(() => {
    if (value) {
      const timer = setTimeout(() => setter(''), delay);
      return () => clearTimeout(timer);
    }
  }, [value, setter, delay]);
}
