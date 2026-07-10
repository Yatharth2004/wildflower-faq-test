# WILDFLOWER FAQ TEST
### The Oberoi Centre of Learning & Development — Knowledge Assessment Portal

A production-ready, premium-styled online examination portal built for **Wildflower Hall, An Oberoi Resort**. It serves as the mandatory first screening stage for OCLD applicants, testing candidates on the Orientation Manual with a randomized 50-question exam requiring a perfect score to pass.

Runs entirely on **GitHub Pages (frontend) + Google Apps Script (backend) + Google Sheets (database)**. No Firebase, no Node.js server, no paid services.

---

## 1. Project Overview

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3 (glassmorphism/luxury theme), Vanilla JavaScript |
| Backend | Google Apps Script (Web App) |
| Database | Google Sheets |
| Hosting | GitHub Pages |

**Exam rules baked into `config.js`:** 50 questions, 100 marks (2 per question), no negative marking, 30-minute timer with auto-submit, 100% required to pass, maximum 3 attempts per candidate (tracked by Employee ID, Email, and a generated Candidate UUID).

The question bank (`assets/js/questions.js`) currently ships with **264 unique MCQs** generated from the uploaded Orientation Manual, spanning Company Knowledge, Guest Services, Hotel Knowledge, Front Office, Housekeeping, Activities, Spa, Food & Beverage, Kitchen, Finance, Engineering, Human Resources, and Security — comfortably above the required 200-question minimum, with a 20 Easy / 20 Medium / 10 Difficult split served per attempt.

---

## 2. Folder Structure

```
/
├── index.html                 Main candidate-facing SPA (landing → registration → exam → result)
├── admin/
│   ├── index.html              Password-protected admin dashboard
│   └── admin.js                Dashboard logic, filters, CSV export
├── assets/
│   ├── css/styles.css          Full luxury/glassmorphism theme
│   ├── js/
│   │   ├── config.js           ⭐ Single file to edit exam settings & branding
│   │   ├── questions.js        Auto-generated question bank (264 MCQs)
│   │   ├── storage.js          localStorage helpers, UUIDs, device detection
│   │   ├── api.js               Backend client (+ local "demo mode" fallback)
│   │   ├── registration.js      Registration form + validation + attempt check
│   │   ├── exam-engine.js       Question selection, timer, navigator, anti-cheat
│   │   ├── results.js           Scoring + result screen + backend submission
│   │   └── app.js               Screen router / top-level wiring
│   └── img/                    Logo & hero placeholder SVGs (replace with real branding)
├── gas/
│   └── Code.gs                  Google Apps Script backend (deploy this to Google)
└── README.md
```

---

## 3. GitHub Pages Deployment

1. Create a new GitHub repository (e.g. `wildflower-faq-test`) and push this entire folder to it.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`.
4. Save. GitHub will give you a URL like `https://<your-username>.github.io/wildflower-faq-test/`.
5. That's the link you can copy and share on WhatsApp — it works directly, no install required.

---

## 4. Google Sheets Setup

1. Create a new Google Sheet (e.g. "WILDFLOWER FAQ TEST — Results").
2. You don't need to add any columns manually — the backend creates a `Results` tab with the correct headers automatically the first time it runs (or you can run it manually, see below).

---

## 5. Google Apps Script Setup

1. Open your Google Sheet → **Extensions → Apps Script**.
2. Delete the default boilerplate code and paste in the entire contents of `gas/Code.gs`.
3. (Optional but recommended) In the Apps Script editor, go to **Project Settings → Script Properties** and add a property `ADMIN_PASSWORD` with your desired admin password, instead of relying on the hard-coded default.
4. From the function dropdown at the top, select `setup` and click **Run** once. This creates the `Results` sheet with all headers ready. Grant the permissions it asks for (it only touches this one spreadsheet).
5. Click **Deploy → New deployment**.
   - Select type: **Web app**
   - Description: `WILDFLOWER FAQ TEST API`
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy**, authorize the app, and copy the **Web app URL** it gives you (ends in `/exec`).
7. Paste that URL into `assets/js/config.js` → `APPS_SCRIPT_URL`.
8. Commit and push the change — GitHub Pages will pick it up automatically.

**Important:** Every time you edit `gas/Code.gs` in the Apps Script editor, you must create a **new deployment version** (Deploy → Manage deployments → Edit → New version) for the changes to go live on the same URL.

### Demo Mode
Until `APPS_SCRIPT_URL` is set, the portal automatically falls back to a local **Demo Mode** (data stored only in the browser's `localStorage`) so you can click through the entire candidate and admin experience before wiring up Google Sheets.

---

## 6. How to Change Questions

All questions live in `assets/js/questions.js` as a single `QUESTION_BANK` array of objects:

```js
{
  "id": "Q001",
  "topic": "Company Knowledge",
  "difficulty": "Easy",       // "Easy" | "Medium" | "Difficult"
  "question": "…",
  "options": { "A": "…", "B": "…", "C": "…", "D": "…" },
  "correctAnswer": "C",
  "explanation": "…"
}
```

To add, edit or remove questions, edit this array directly (or regenerate it — see below) and keep IDs unique. The exam engine automatically re-shuffles option order per attempt, so you don't need to worry about which letter is "correct" looking predictable.

---

## 7. How to Upload a New Orientation Manual / Generate a New Question Bank

This repository includes the generator scripts used to build the current bank (not included in the deployed site, kept for your reference — ask your AI assistant to re-run this workflow):

1. Provide the updated Orientation Manual (Word doc or PDF).
2. Have each section read and its facts extracted (numbers, names, policies, SOPs, FAQs).
3. Regenerate a `questions_raw.json` → `questions_final.json` pipeline that:
   - Builds one MCQ per fact, with 3 plausible same-topic distractors,
   - Tags each with a topic and difficulty,
   - Shuffles option order,
   - Outputs the final `QUESTION_BANK` array into `assets/js/questions.js`.
4. Aim for at least 200 questions with roughly a 40% Easy / 40% Medium / 20% Difficult split so the 20/20/10-per-exam distribution in `config.js` has enough variety across all 3 attempts.

---

## 8. How to Update Branding

Edit the top of `assets/js/config.js`:

```js
examTitle: "WILDFLOWER FAQ TEST",
examSubtitle: "The Oberoi Centre of Learning & Development",
organizationName: "Wildflower Hall, An Oberoi Resort",
logoUrl: "assets/img/logo-placeholder.svg",
```

Replace `assets/img/logo-placeholder.svg` with your actual logo file (keep the same filename, or update the path in `config.js`). Colors, fonts and the glassmorphism theme live in `assets/css/styles.css` under the `:root` CSS variables at the top of the file.

---

## 9. How to Change Exam Settings

Everything is in `assets/js/config.js` — no other file needs to change:

```js
totalQuestions: 50,
totalMarks: 100,
marksPerQuestion: 2,
durationMinutes: 30,
passingPercentage: 100,
maxAttempts: 3,
difficultyDistribution: { Easy: 20, Medium: 20, Difficult: 10 },
```

---

## 10. Admin Panel

Navigate to `/admin/index.html` on your deployed site (e.g. `https://<you>.github.io/wildflower-faq-test/admin/`). Log in with the admin password (from `config.js` or your Script Property override). The dashboard shows:

- KPIs: registered candidates, total attempts, pass/fail counts, average/highest/lowest scores
- A filterable, searchable results table (by name/email/employee ID, department, result, attempt number, date)
- Most-missed-questions analytics
- CSV export and print-friendly report view

**Security note:** This admin panel uses a shared password checked against the backend, which is adequate for an internal HR tool but is not bank-grade security. For stricter control, restrict the Apps Script deployment's "Who has access" setting, or add IP/domain checks server-side.

---

## 11. Troubleshooting

| Symptom | Likely Cause / Fix |
|---|---|
| Exam always runs in "Demo Mode" | `APPS_SCRIPT_URL` in `config.js` still contains the placeholder text — paste your real deployed URL. |
| Registration says "unable to verify eligibility" | The Apps Script deployment may need a new version after edits, or "Who has access" isn't set to "Anyone". |
| Admin dashboard is empty | No results have been submitted yet, or `adminFetchAll` can't reach the sheet — check the Apps Script execution log (**Executions** tab in the Apps Script editor). |
| Candidate can retake after passing | Confirm your Sheet's `PASS/FAIL` column is being written correctly — `checkAttempts` blocks re-registration only when a `PASS` row exists for that email/employee ID. |
| Timer resets after refresh | This is expected only if the elapsed time already exceeded the duration; otherwise the exam auto-resumes from `localStorage` — check the browser console for storage errors (e.g. private/incognito mode blocking `localStorage`). |
| Styles look unstyled/plain | Google Fonts import at the top of `styles.css` requires internet access from the browser — check network connectivity, not a code issue. |

---

## 12. Roadmap / Future Enhancements

The codebase is modular (separate config, question bank, and logic files) specifically to make these straightforward to add later:
Certificates, OTP login, QR verification, email/WhatsApp result notifications, multi-language support, image/audio/video questions, multiple exam categories, advanced analytics, and AI-assisted question bank regeneration.

----

© Wildflower Hall, An Oberoi Resort · The Oberoi Centre of Learning & Development
