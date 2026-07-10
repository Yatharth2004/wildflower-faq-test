/**
 * storage.js
 * Lightweight wrapper around localStorage used for:
 *  - persisting the in-progress exam session (so a refresh doesn't lose answers)
 *  - caching the candidate's attempt count locally as a fast first check
 *    (the Google Sheet, via Apps Script, always remains the source of truth)
 */

const StorageKeys = {
  SESSION: "wft_session_v1",
  CANDIDATE: "wft_candidate_v1",
  ATTEMPT_CACHE: "wft_attempt_cache_v1"
};

const Store = {
  saveSession(sessionObj) {
    try {
      localStorage.setItem(StorageKeys.SESSION, JSON.stringify(sessionObj));
    } catch (e) { console.warn("Unable to persist session", e); }
  },
  loadSession() {
    try {
      const raw = localStorage.getItem(StorageKeys.SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  clearSession() {
    localStorage.removeItem(StorageKeys.SESSION);
  },

  saveCandidate(candidateObj) {
    try {
      localStorage.setItem(StorageKeys.CANDIDATE, JSON.stringify(candidateObj));
    } catch (e) { console.warn("Unable to persist candidate", e); }
  },
  loadCandidate() {
    try {
      const raw = localStorage.getItem(StorageKeys.CANDIDATE);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  // Local cache of {employeeId/email -> {attempts, passed, servedQuestionIds:[[...],[...]]}}
  // used to keep the "less than 20% overlap" rule working even if the sheet read is briefly stale.
  getAttemptCache(key) {
    try {
      const raw = localStorage.getItem(StorageKeys.ATTEMPT_CACHE);
      const all = raw ? JSON.parse(raw) : {};
      return all[key] || null;
    } catch (e) { return null; }
  },
  setAttemptCache(key, data) {
    try {
      const raw = localStorage.getItem(StorageKeys.ATTEMPT_CACHE);
      const all = raw ? JSON.parse(raw) : {};
      all[key] = data;
      localStorage.setItem(StorageKeys.ATTEMPT_CACHE, JSON.stringify(all));
    } catch (e) { console.warn("Unable to persist attempt cache", e); }
  }
};

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function detectDevice() {
  const ua = navigator.userAgent;
  let browser = "Unknown", os = "Unknown", device = "Desktop";

  if (/Edg/.test(ua)) browser = "Edge";
  else if (/Chrome/.test(ua)) browser = "Chrome";
  else if (/Firefox/.test(ua)) browser = "Firefox";
  else if (/Safari/.test(ua)) browser = "Safari";

  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iOS/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";

  if (/Mobi|Android/.test(ua)) device = "Mobile";
  else if (/Tablet|iPad/.test(ua)) device = "Tablet";

  return { browser, os, device };
}
