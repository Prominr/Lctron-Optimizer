import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const OWNER_EMAIL = 'omariirvin44@gmail.com';
const CHECK_API = 'https://lctronoptimizer.netlify.app/.netlify/functions/check-premium';
const CACHE_KEY = 'lctron-premium-cache';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { premium, ts, email } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return { premium, email };
  } catch {}
  return null;
}

function writeCache(email, premium) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ premium, ts: Date.now(), email }));
  } catch {}
}

const PremiumContext = createContext({
  isPremium: false,
  refreshPremium: async () => {},
  clearPremium: () => {},
});

export function PremiumProvider({ children }) {
  const [isPremium, setIsPremium] = useState(() => {
    const cached = readCache();
    return cached ? cached.premium : false;
  });

  const refreshPremium = useCallback(async (email) => {
    if (!email) {
      setIsPremium(false);
      localStorage.removeItem(CACHE_KEY);
      return;
    }
    // Owner always premium
    if (email.toLowerCase().trim() === OWNER_EMAIL.toLowerCase()) {
      setIsPremium(true);
      writeCache(email, true);
      return;
    }
    // Check cache first
    const cached = readCache();
    if (cached && cached.email === email.toLowerCase().trim()) {
      setIsPremium(cached.premium);
      return;
    }
    // Fetch from API
    try {
      const res = await fetch(`${CHECK_API}?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      const premium = !!data.premium;
      setIsPremium(premium);
      writeCache(email.toLowerCase().trim(), premium);
    } catch {
      // Keep existing state on network error
    }
  }, []);

  const clearPremium = useCallback(() => {
    setIsPremium(false);
    localStorage.removeItem(CACHE_KEY);
  }, []);

  return (
    <PremiumContext.Provider value={{ isPremium, refreshPremium, clearPremium }}>
      {children}
    </PremiumContext.Provider>
  );
}

export const usePremium = () => useContext(PremiumContext);
