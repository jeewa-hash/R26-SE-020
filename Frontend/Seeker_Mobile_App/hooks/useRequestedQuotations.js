import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getStoredSeekerAuth } from '../screens/IT22129376/services/seekerAuthStorage';
import { getSeekerRequestQuotations } from '../screens/IT22129376/services/seekerSessionApi';
import { quotationRequestKey, quotationRequestKeys } from '../utils/quotationRequestState';

const listeners = new Set();
export default function useRequestedQuotations() {
  const { user } = useAuth();
  const owner = useRef(null);
  const [keys, setKeys] = useState(new Set());
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    const listener = (id, key) => { if (id === owner.current) setKeys(current => new Set([...current, key])); };
    listeners.add(listener); return () => listeners.delete(listener);
  }, []);
  useFocusEffect(useCallback(() => {
    let active = true;
    setChecking(true);
    (async () => {
      try {
        const auth = await getStoredSeekerAuth();
        if (!active) return;
        if (owner.current !== auth.seekerId) { owner.current = auth.seekerId; setKeys(new Set()); }
        if (!auth.seekerId) return;
        const result = await getSeekerRequestQuotations(auth.seekerId);
        if (active) setKeys(current => new Set([...current, ...quotationRequestKeys(result.requests)]));
      } catch { /* Backend uniqueness still protects against duplicate requests while offline. */ }
      finally { if (active) setChecking(false); }
    })();
    return () => { active = false; };
  }, [user?.id, user?._id]));
  return {
    checking,
    isRequested: (provider, session) => keys.has(quotationRequestKey(provider, session)),
    markRequested: (provider, session) => {
      const key = quotationRequestKey(provider, session);
      setKeys(current => new Set([...current, key]));
      listeners.forEach(listener => listener(owner.current, key));
    },
  };
}
