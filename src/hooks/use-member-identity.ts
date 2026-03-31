'use client';

import { useState, useEffect, useCallback } from 'react';

interface MemberIdentity {
  memberId: string | null;
  displayName: string | null;
}

function getStorageKey(tripId: string) {
  return `triptangle_member_${tripId}`;
}

export function useMemberIdentity(tripId: string) {
  const [identity, setIdentityState] = useState<MemberIdentity>({
    memberId: null,
    displayName: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(tripId));
      if (stored) {
        setIdentityState(JSON.parse(stored));
      }
    } catch {
      // localStorage unavailable
    }
    setIsLoaded(true);
  }, [tripId]);

  const setIdentity = useCallback(
    (memberId: string, displayName: string) => {
      const value = { memberId, displayName };
      setIdentityState(value);
      try {
        localStorage.setItem(getStorageKey(tripId), JSON.stringify(value));
      } catch {
        // localStorage unavailable
      }
    },
    [tripId]
  );

  const clearIdentity = useCallback(() => {
    setIdentityState({ memberId: null, displayName: null });
    try {
      localStorage.removeItem(getStorageKey(tripId));
    } catch {
      // localStorage unavailable
    }
  }, [tripId]);

  return {
    memberId: identity.memberId,
    displayName: identity.displayName,
    isIdentified: !!identity.memberId,
    isLoaded,
    setIdentity,
    clearIdentity,
  };
}
