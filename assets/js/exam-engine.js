/**
 * exam-engine.js
 * Core examination engine: question selection with randomization &
 * difficulty balancing, countdown timer, navigator, answer tracking,
 * auto-save, auto-submit, and basic anti-cheat warnings.
 */

const ExamEngine = (function () {

  let state = null; // the live exam session object
  let timerInterval = null;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Selects `count` questions of a given difficulty, preferring ones not
   * served in the candidate's previous attempts, while keeping overlap
   * with any single previous attempt under CONFIG.maxQuestionOverlap.
   */
  function pickByDifficulty(difficulty, count, previouslyServedFlat) {
    const pool = shuffle(QUESTION_BANK.filter(q => q.difficulty === difficulty));
    const fresh = pool.filter(q => !previouslyServedFlat.includes(q.id));
    const reused = pool.filter(q => previouslyServedFlat.includes(q.id));

    const maxReusedAllowed = Math.floor(count * CONFIG.maxQuestionOverlap);
    let selected = fresh.slice(0, count);

    if (selected.length < count) {
      const needed = count - selected.length;
      selected = selected.concat(reused.slice(0, Math.min(needed, maxReusedAllowed || needed)));
    }
    // If still short (small bank), top up regardless of overlap rule
    if (selected.length < count) {
      const remaining = pool.filter(q => !selected.includes(q));
      selected = selected.concat(remaining.slice(0, count - selected.length));
    }
    return selected;
  }

  function selectQuestions(candidate) {
    const prevFlat = (candidate.servedQuestionIds || []).flat();
    const dist = CONFIG.difficultyDistribution;

    const easy = pickByDifficulty("Easy", dist.Easy, prevFlat);
    const medium = pickByDifficulty("Medium", dist.Medium, prevFlat);
    const difficult = pickByDifficulty("Difficult", dist.Difficult, prevFlat);

    let combined = shuffle([...easy, ...medium, ...difficult]);

    // Re-shuffle option order per-serve so the correct letter isn't predictable
    combined = combined.map(q => {
      const letters = ["A", "B", "C", "D"];
      const entries = letters.map(l => ({ text: q.options[l], isCorrect: l === q.correctAnswer }));
      const shuffled = shuffle(entries);
      const newOptions = {};
      let newCorrect = "A";
      shuffled.forEach((e, idx) => {
        const letter = letters[idx];
        newOptions[letter] = e.text;
        if (e.isCorrect) newCorrect = letter;
      });
      return { ...q, options: newOptions, correctAnswer: newCorrect };
    });

    return combined;
  }

  function startExam(candidate) {
    const questions = selectQuestions(candidate);
    state = {
      candidate,
      questions,
      answers: {},      // qId -> letter
      marked: {},        // qId -> true
      currentIndex: 0,
      startTime: Date.now(),
      durationMs: CONFIG.durationMinutes * 60 * 1000,
      submitted: false
    };
    Store.saveSession(state);

    document.getElementById("examAttemptNo").textContent = candidate.attemptNumber;
    renderNavGrid();
    renderQuestion();
    startTimer();
    attachGuards();
  }

  function resumeIfAny() {
    const saved = Store.loadSession();
    if (saved && !saved.submitted) {
      const elapsed = Date.now() - saved.startTime;
      if (elapsed < saved.durationMs) {
        state = saved;
        return true;
      }
    }
    return false;
  }

  function renderNavGrid() {
    const grid = document.getElementById("navGrid");
    grid.innerHTML = "";
    state.questions.forEach((q, idx) => {
      const dot = document.createElement("div");
      dot.className = "nav-dot";
      dot.textContent = idx + 1;
      dot.dataset.idx = idx;
      dot.addEventListener("click", () => { state.currentIndex = idx; renderQuestion(); });
      grid.appendChild(dot);
    });
    updateNavStates();
  }

  function updateNavStates() {
    const dots = document.querySelectorAll("#navGrid .nav-dot");
    let answeredCt = 0, markedCt = 0;
    dots.forEach((dot, idx) => {
      const q = state.questions[idx];
      dot.classList.remove("answered", "marked", "current");
      if (state.answers[q.id]) { dot.classList.add("answered"); answeredCt++; }
      if (state.marked[q.id]) { dot.classList.add("marked"); markedCt++; }
      if (idx === state.currentIndex) dot.classList.add("current");
    });
    document.getElementById("statAnswered").textContent = answeredCt;
    document.getElementById("statMarked").textContent = markedCt;
    document.getElementById("statRemaining").textContent = state.questions.length - answeredCt;
    document.getElementById("answeredCount").textContent = answeredCt;
    document.getElementById("progressFill").style.width = (answeredCt / state.questions.length * 100) + "%";
  }

  function renderQuestion() {
    const q = state.questions[state.currentIndex];
    document.getElementById("qCurrentNum").textContent = state.currentIndex + 1;
    document.getElementById("qTopic").textContent = q.topic;
    document.getElementById("qText").textContent = q.question;

    const list = document.getElementById("optionList");
    list.innerHTML = "";
    ["A", "B", "C", "D"].forEach(letter => {
      const item = document.createElement("div");
      item.className = "option-item" + (state.answers[q.id] === letter ? " selected" : "");
      item.innerHTML = `<span class="opt-letter">${letter}</span><span>${q.options[letter]}</span>`;
      item.addEventListener("click", () => selectAnswer(letter));
      list.appendChild(item);
    });

    const markBtn = document.getElementById("btnMarkReview");
    markBtn.textContent = state.marked[q.id] ? "Unmark Review" : "Mark for Review";

    document.getElementById("btnPrev").disabled = state.currentIndex === 0;
    document.getElementById("btnNext").textContent =
      state.currentIndex === state.questions.length - 1 ? "Finish →" : "Next →";

    updateNavStates();
    Store.saveSession(state);
  }

  function selectAnswer(letter) {
    const q = state.questions[state.currentIndex];
    state.answers[q.id] = letter;
    renderQuestion();
  }

  function clearResponse() {
    const q = state.questions[state.currentIndex];
    delete state.answers[q.id];
    renderQuestion();
  }

  function toggleMark() {
    const q = state.questions[state.currentIndex];
    state.marked[q.id] = !state.marked[q.id];
    renderQuestion();
  }

  function goNext() {
    if (state.currentIndex < state.questions.length - 1) {
      state.currentIndex++;
      renderQuestion();
    } else {
      confirmSubmit();
    }
  }
  function goPrev() {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      renderQuestion();
    }
  }

  function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      const remaining = state.durationMs - (Date.now() - state.startTime);
      if (remaining <= 0) {
        clearInterval(timerInterval);
        finishExam(true);
        return;
      }
      updateTimerDisplay(remaining);
    }, 1000);
  }

  function updateTimerDisplay(remainingOverride) {
    const remaining = remainingOverride !== undefined
      ? remainingOverride
      : state.durationMs - (Date.now() - state.startTime);
    const totalSec = Math.max(0, Math.floor(remaining / 1000));
    const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    const el = document.getElementById("timerDisplay");
    el.textContent = `${mm}:${ss}`;
    el.classList.toggle("low", totalSec <= 120);
  }

  function confirmSubmit() {
    const unanswered = state.questions.length - Object.keys(state.answers).length;
    const msg = unanswered > 0
      ? `You have ${unanswered} unanswered question(s). Are you sure you want to submit the examination? This action cannot be undone.`
      : "Are you sure you want to submit the examination? This action cannot be undone.";
    if (confirm(msg)) {
      finishExam(false);
    }
  }

  function finishExam(autoSubmitted) {
    if (state.submitted) return;
    state.submitted = true;
    clearInterval(timerInterval);
    detachGuards();
    Store.saveSession(state);
    Results.processAndShow(state, autoSubmitted);
  }

  // ---------------- ANTI-CHEAT / GUARDS ----------------
  function beforeUnloadHandler(e) {
    if (state && !state.submitted) {
      e.preventDefault();
      e.returnValue = "";
      return "";
    }
  }
  function visibilityHandler() {
    if (document.hidden && state && !state.submitted) {
      document.getElementById("fullscreenWarning").classList.remove("hidden");
    }
  }
  function attachGuards() {
    window.addEventListener("beforeunload", beforeUnloadHandler);
    document.addEventListener("visibilitychange", visibilityHandler);
  }
  function detachGuards() {
    window.removeEventListener("beforeunload", beforeUnloadHandler);
    document.removeEventListener("visibilitychange", visibilityHandler);
  }

  function init() {
    document.getElementById("btnPrev").addEventListener("click", goPrev);
    document.getElementById("btnNext").addEventListener("click", goNext);
    document.getElementById("btnClear").addEventListener("click", clearResponse);
    document.getElementById("btnMarkReview").addEventListener("click", toggleMark);
    document.getElementById("btnSubmitTop").addEventListener("click", confirmSubmit);
    document.getElementById("btnSubmitSide").addEventListener("click", confirmSubmit);
    document.getElementById("btnResumeExam").addEventListener("click", () => {
      document.getElementById("fullscreenWarning").classList.add("hidden");
    });
  }

  return { init, startExam, resumeIfAny, getState: () => state, renderQuestion, renderNavGrid, startTimerFromResume: startTimer, attachGuards };
})();
