/**
 * ============================================================
 *  WILDFLOWER FAQ TEST — GOOGLE APPS SCRIPT BACKEND
 *  The Oberoi Centre of Learning & Development (OCLD)
 * ------------------------------------------------------------
 *  Deploy this file as a Web App (Deploy > New deployment > Web app).
 *  Execute as: Me
 *  Who has access: Anyone
 *
 *  See README.md ("Google Apps Script Setup") for full instructions.
 * ============================================================
 */

const SHEET_NAME = "Results";
const ADMIN_PASSWORD_PROPERTY = "ADMIN_PASSWORD"; // optional override via Script Properties
const DEFAULT_ADMIN_PASSWORD = "OCLD@Wildflower2026"; // keep in sync with assets/js/config.js
const MAX_ATTEMPTS = 3;

const COLUMNS = [
  "Timestamp", "Candidate UUID", "Full Name", "Email", "Phone", "Employee ID",
  "Department", "Designation", "Attempt Number", "Remaining Attempts",
  "Question IDs Served", "Selected Answers", "Correct Answers", "Correct Count",
  "Wrong Count", "Unanswered", "Marks", "Percentage", "PASS/FAIL",
  "Completion Time", "Submission ID", "Browser", "Operating System",
  "Device Type", "Auto Submitted", "Date", "Time"
];

/* ---------------------------------------------------------------
 * ENTRY POINTS
 * ------------------------------------------------------------- */

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const payload = body.payload || {};
    let result;

    switch (action) {
      case "checkAttempts":
        result = checkAttempts(payload);
        break;
      case "registerCandidate":
        result = registerCandidate(payload);
        break;
      case "submitResult":
        result = submitResult(payload);
        break;
      case "adminLogin":
        result = adminLogin(payload);
        break;
      case "adminFetchAll":
        result = adminFetchAll(payload);
        break;
      default:
        result = { success: false, error: "Unknown action: " + action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function doGet(e) {
  return jsonResponse({ success: true, message: "WILDFLOWER FAQ TEST API is running. Use POST requests." });
}

/* ---------------------------------------------------------------
 * CORE FUNCTIONS
 * ------------------------------------------------------------- */

/**
 * Checks how many attempts a candidate (by email OR employeeId) has used,
 * whether they've already passed, and which question IDs were served in
 * each previous attempt (for the <20% overlap rule on the client).
 */
function checkAttempts(payload) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const headerRow = data[0];
  const idx = indexMap(headerRow);

  const email = (payload.email || "").toLowerCase().trim();
  const employeeId = (payload.employeeId || "").toLowerCase().trim();

  const matches = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowEmail = String(row[idx["Email"]] || "").toLowerCase().trim();
    const rowEmpId = String(row[idx["Employee ID"]] || "").toLowerCase().trim();
    if ((email && rowEmail === email) || (employeeId && rowEmpId === employeeId)) {
      matches.push(row);
    }
  }

  const attemptsUsed = matches.length;
  const alreadyPassed = matches.some(row => row[idx["PASS/FAIL"]] === "PASS");
  const servedQuestionIds = matches.map(row => {
    try { return JSON.parse(row[idx["Question IDs Served"]] || "[]"); }
    catch (e) { return []; }
  });

  return {
    success: true,
    attemptsUsed,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - attemptsUsed),
    alreadyPassed,
    servedQuestionIds
  };
}

/**
 * Registration itself does not write a row (a row is only written once the
 * candidate actually submits a result) — it simply issues a fresh UUID.
 * This keeps the sheet free of "registered but never attempted" rows.
 */
function registerCandidate(payload) {
  return { success: true, candidateUuid: Utilities.getUuid() };
}

/**
 * Persists a completed exam attempt as a new row in the Results sheet.
 */
function submitResult(payload) {
  const sheet = getSheet();

  const row = [
    payload.timestamp || new Date().toISOString(),
    payload.candidateUuid || "",
    payload.fullName || "",
    payload.email || "",
    payload.phone || "",
    payload.employeeId || "",
    payload.department || "",
    payload.designation || "",
    payload.attemptNumber || "",
    payload.remainingAttempts || 0,
    JSON.stringify(payload.questionIds || []),
    JSON.stringify(payload.selectedAnswers || {}),
    JSON.stringify(payload.correctAnswers || {}),
    payload.correctCount || 0,
    payload.wrongCount || 0,
    payload.unanswered || 0,
    payload.marks || 0,
    payload.percentage || 0,
    payload.passResult || "FAIL",
    payload.completionTime || "",
    payload.submissionId || Utilities.getUuid(),
    payload.browser || "",
    payload.operatingSystem || "",
    payload.deviceType || "",
    payload.autoSubmitted ? "Yes" : "No",
    payload.date || "",
    payload.time || ""
  ];

  sheet.appendRow(row);
  return { success: true, submissionId: row[20] };
}

function adminLogin(payload) {
  const expected = getAdminPassword();
  return { success: payload.password === expected };
}

/**
 * Returns all result rows as JS objects for the admin dashboard.
 * NOTE: In a hardened production deployment, gate this behind a
 * server-side session token rather than trusting the client's
 * "already logged in" state — see README for guidance.
 */
function adminFetchAll(payload) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { success: true, records: [] };

  const headerRow = data[0];
  const idx = indexMap(headerRow);
  const records = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[idx["Employee ID"]] && !row[idx["Email"]]) continue;
    records.push({
      timestamp: row[idx["Timestamp"]],
      candidateUuid: row[idx["Candidate UUID"]],
      fullName: row[idx["Full Name"]],
      email: row[idx["Email"]],
      phone: row[idx["Phone"]],
      employeeId: row[idx["Employee ID"]],
      department: row[idx["Department"]],
      designation: row[idx["Designation"]],
      attemptNumber: row[idx["Attempt Number"]],
      remainingAttempts: row[idx["Remaining Attempts"]],
      questionIds: safeParse(row[idx["Question IDs Served"]]),
      selectedAnswers: safeParse(row[idx["Selected Answers"]]),
      correctAnswers: safeParse(row[idx["Correct Answers"]]),
      correctCount: row[idx["Correct Count"]],
      wrongCount: row[idx["Wrong Count"]],
      unanswered: row[idx["Unanswered"]],
      marks: row[idx["Marks"]],
      percentage: row[idx["Percentage"]],
      passResult: row[idx["PASS/FAIL"]],
      completionTime: row[idx["Completion Time"]],
      submissionId: row[idx["Submission ID"]],
      browser: row[idx["Browser"]],
      operatingSystem: row[idx["Operating System"]],
      deviceType: row[idx["Device Type"]],
      date: row[idx["Date"]],
      time: row[idx["Time"]]
    });
  }
  return { success: true, records };
}

/* ---------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------- */

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function indexMap(headerRow) {
  const map = {};
  headerRow.forEach((h, i) => { map[h] = i; });
  return map;
}

function safeParse(str) {
  try { return JSON.parse(str || "{}"); } catch (e) { return {}; }
}

function getAdminPassword() {
  const scriptProps = PropertiesService.getScriptProperties();
  return scriptProps.getProperty(ADMIN_PASSWORD_PROPERTY) || DEFAULT_ADMIN_PASSWORD;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Run this once manually from the Apps Script editor (select "setup" in the
 * function dropdown and click Run) to create the Results sheet with headers
 * ahead of time. Not required — the sheet is also auto-created on first use.
 */
function setup() {
  getSheet();
  Logger.log("Results sheet is ready with headers: " + COLUMNS.join(", "));
}
