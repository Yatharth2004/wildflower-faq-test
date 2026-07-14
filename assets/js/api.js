/**
 * api.js
 * Talks to the Google Apps Script Web App backend (which uses Google Sheets
 * as its database). Falls back to a local-only "demo mode" automatically if
 * CONFIG.APPS_SCRIPT_URL has not been configured yet, so the portal is still
 * fully click-through-able before deployment.
 */

const Api = (function () {

  function isConfigured() {
    return CONFIG.APPS_SCRIPT_URL &&
      CONFIG.APPS_SCRIPT_URL.indexOf("PASTE_YOUR") === -1 &&
      CONFIG.APPS_SCRIPT_URL.startsWith("http");
  }

  /**
   * POST to Apps Script using text/plain to avoid a CORS pre-flight
   * (Apps Script Web Apps do not implement OPTIONS, so a JSON content-type
   * triggers a preflight that fails; text/plain is a well-known workaround).
   */
  async function callBackend(action, payload) {
    if (!isConfigured()) {
      return DemoBackend.handle(action, payload);
    }
    try {
      const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, payload })
      });
      if (!res.ok) throw new Error("Network response was not ok (" + res.status + ")");
      return await res.json();
    } catch (err) {
      console.error("Apps Script call failed, falling back to demo mode:", err);
      return DemoBackend.handle(action, payload);
    }
  }

  return {
    isConfigured,
    checkAttempts: (payload) => callBackend("checkAttempts", payload),
    registerCandidate: (payload) => callBackend("registerCandidate", payload),
    submitResult: (payload) => callBackend("submitResult", payload),
    adminLogin: (payload) => callBackend("adminLogin", payload),
    adminFetchAll: (payload) => callBackend("adminFetchAll", payload)
  };
})();

/**
 * DemoBackend
 * A local-storage-only stand-in for the Apps Script backend so the portal
 * can be fully tested/clicked-through before Google Sheets is wired up.
 * It mimics the same request/response contract as gas/Code.gs.
 */
const DemoBackend = (function () {
  const KEY = "wft_demo_records_v1";

  function loadAll() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function saveAll(records) {
    localStorage.setItem(KEY, JSON.stringify(records));
  }

  function findByCandidate({ email, employeeId }) {
    return loadAll().filter(r =>
      (email && r.email && r.email.toLowerCase() === email.toLowerCase()) ||
      (employeeId && r.employeeId && r.employeeId.toLowerCase() === employeeId.toLowerCase())
    );
  }

  async function handle(action, payload) {
    await new Promise(r => setTimeout(r, 250)); // simulate latency
    switch (action) {
      case "checkAttempts": {
        const records = findByCandidate(payload);
        const attemptsUsed = records.length;
        const passed = records.some(r => r.passResult === "PASS");
        return {
          success: true,
          attemptsUsed,
          remainingAttempts: Math.max(0, CONFIG.maxAttempts - attemptsUsed),
          alreadyPassed: passed,
          alreadyFailed: attemptsUsed > 0 && !passed,
          servedQuestionIds: records.map(r => r.questionIds || [])
        };
      }
      case "registerCandidate": {
        return { success: true, candidateUuid: uuidv4() };
      }
      case "submitResult": {
        const records = loadAll();
        records.push(payload);
        saveAll(records);
        return { success: true, submissionId: uuidv4() };
      }
      case "adminLogin": {
        return { success: payload.password === CONFIG.adminPassword };
      }
      case "adminFetchAll": {
        return { success: true, records: loadAll() };
      }
      default:
        return { success: false, error: "Unknown action in demo mode: " + action };
    }
  }

  return { handle };
})();
