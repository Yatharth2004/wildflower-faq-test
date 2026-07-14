/**
 * ============================================================
 *  WILDFLOWER FAQ TEST — CONFIGURATION FILE
 *  The Oberoi Centre of Learning & Development (OCLD)
 * ------------------------------------------------------------
 *  Everything that controls how the exam behaves lives here.
 *  Change values in this file only — never edit app logic
 *  in the other JS files to change exam behaviour.
 * ============================================================
 */

const CONFIG = {

  // ---------- BRANDING ----------
  examTitle: "WILDFLOWER FAQ TEST",
  examSubtitle: "The Oberoi Centre of Learning & Development",
  examTagline: "Knowledge Assessment Portal",
  organizationName: "Wildflower Hall, An Oberoi Resort",
  logoUrl: "assets/img/logo-placeholder.svg",
  heroImageUrl: "assets/img/hero-placeholder.svg",

  // ---------- GOOGLE APPS SCRIPT BACKEND ----------
  // Paste the deployed Web App URL from Google Apps Script here.
  // See gas/README inside the gas/ folder for deployment steps.
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwSeYIT9IWPtbVmCC3Eyw8yLXZGKjWbViBYvDtvHSkhSKvInLBL5An649hdW1xSZOvj/exec",

  // ---------- EXAM SETTINGS ----------
  totalQuestions: 50,
  totalMarks: 100,
  marksPerQuestion: 2,
  negativeMarking: false,
  negativeMarksPerQuestion: 0,
  durationMinutes: 30,
  autoSubmit: true,
  passingPercentage: 100,   // Only a perfect score passes
  maxAttempts: 1,

  // Note: with a hand-curated bank of exactly `totalQuestions` questions,
  // every attempt simply uses the full set (freshly shuffled) — no
  // difficulty-based sampling is needed anymore.

  // ---------- ADMIN ----------
  // Change this before deploying. For real production use, prefer
  // setting the password as an Apps Script property instead (see gas/Code.gs).
  adminPassword: "OCLD@Wildflower2026",

  // ---------- DEPARTMENTS ----------
  departments: [
    "Front Office",
    "Housekeeping",
    "Food & Beverage Service",
    "Food Production",
    "Engineering",
    "Security",
    "Human Resources",
    "Finance",
    "Purchase",
    "Stores",
    "Spa",
    "Recreation",
    "Sales & Marketing",
    "Learning & Development",
    "Kitchen Stewarding",
    "Horticulture",
    "Other"
  ],

  // ---------- MESSAGES ----------
  messages: {
    declaration: "I confirm that I will attempt this examination honestly.",
    attemptsExhausted: "You have already attempted the WILDFLOWER FAQ TEST. Please contact the Learning & Development Department.",
    passMessage: "Congratulations! You have successfully passed the WILDFLOWER FAQ TEST. You are now eligible for the next stage of the OCLD selection process.",
    failMessage: "Unfortunately, you did not achieve the required score of 100%. If attempts remain, you may attempt the examination again."
  }
};

// Freeze so exam logic files cannot accidentally mutate configuration at runtime
Object.freeze(CONFIG);
Object.freeze(CONFIG.departments);
Object.freeze(CONFIG.messages);
