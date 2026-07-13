/**
 * app.js
 * Top-level orchestration: screen switching, landing page interactions,
 * precheck screen, and wiring all modules together on page load.
 */

const App = (function () {

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showLoader(text) {
    document.getElementById("loaderText").textContent = text || "Loading…";
    document.getElementById("globalLoader").classList.remove("hidden");
  }
  function hideLoader() {
    document.getElementById("globalLoader").classList.add("hidden");
  }

  function updateAttemptPill(candidate) {
    const pill = document.getElementById("attemptPill");
    if (candidate && CONFIG.maxAttempts > 1) {
      pill.textContent = `Attempt ${candidate.attemptNumber} of ${CONFIG.maxAttempts}`;
      pill.classList.remove("hidden");
    } else {
      pill.classList.add("hidden");
    }
  }

  function goToPrecheck(candidate) {
    document.getElementById("precheckName").textContent = `Welcome, ${candidate.fullName.split(" ")[0]}`;
    document.getElementById("precheckAttemptNo").textContent = candidate.attemptNumber;
    updateAttemptPill(candidate);

    const wrap = document.getElementById("attemptBadgesWrap");
    wrap.innerHTML = "";
    if (CONFIG.maxAttempts > 1) {
      for (let i = 1; i <= CONFIG.maxAttempts; i++) {
        const badge = document.createElement("div");
        badge.className = "attempt-badge" +
          (i < candidate.attemptNumber ? " used" : "") +
          (i === candidate.attemptNumber ? " current" : "");
        badge.textContent = `Attempt ${i} of ${CONFIG.maxAttempts}`;
        wrap.appendChild(badge);
      }
    }

    showScreen("screen-precheck");
  }

  function beginExam() {
    const candidate = Store.loadCandidate();
    if (!candidate) { showScreen("screen-landing"); return; }
    showScreen("screen-exam");
    ExamEngine.startExam(candidate);
  }

  function wireLanding() {
    const checkbox = document.getElementById("declarationCheck");
    const startBtn = document.getElementById("btnStartExam");
    checkbox.addEventListener("change", () => { startBtn.disabled = !checkbox.checked; });
    startBtn.addEventListener("click", () => showScreen("screen-registration"));
  }

  function wirePrecheck() {
    document.getElementById("btnBeginExam").addEventListener("click", beginExam);
  }

  function wireResult() {
    document.getElementById("btnRetakeExam").addEventListener("click", () => {
      updateAttemptPill(null);
      showScreen("screen-registration");
    });
  }

  function init() {
    wireLanding();
    wirePrecheck();
    wireResult();
    Registration.init();
    ExamEngine.init();

    // If an in-progress exam session exists (e.g. accidental refresh), resume it.
    if (ExamEngine.resumeIfAny()) {
      const candidate = Store.loadCandidate();
      updateAttemptPill(candidate);
      showScreen("screen-exam");
      ExamEngine.renderNavGrid();
      ExamEngine.renderQuestion();
      ExamEngine.startTimerFromResume();
      ExamEngine.attachGuards();
      document.getElementById("examAttemptNo").textContent = candidate ? candidate.attemptNumber : 1;
    }
  }

  return { showScreen, showLoader, hideLoader, goToPrecheck, updateAttemptPill, init };
})();

document.addEventListener("DOMContentLoaded", App.init);
