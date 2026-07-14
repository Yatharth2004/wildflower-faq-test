/**
 * results.js
 * Scores a completed exam session, submits the result to the backend
 * (Google Sheets via Apps Script), and renders the Result screen.
 */

const Results = (function () {

  function scoreSession(state) {
    let correct = 0, wrong = 0, unanswered = 0;
    const questionIds = [];
    const selectedAnswers = {};
    const correctAnswers = {};

    state.questions.forEach(q => {
      questionIds.push(q.id);
      correctAnswers[q.id] = q.correctAnswer;
      const given = state.answers[q.id];
      if (!given) {
        unanswered++;
      } else {
        selectedAnswers[q.id] = given;
        if (given === q.correctAnswer) correct++;
        else wrong++;
      }
    });

    const marks = correct * CONFIG.marksPerQuestion;
    const percentage = Math.round((marks / CONFIG.totalMarks) * 100);
    const passed = percentage >= CONFIG.passingPercentage;

    return { correct, wrong, unanswered, marks, percentage, passed, questionIds, selectedAnswers, correctAnswers };
  }

  function formatDuration(ms) {
    const totalSec = Math.floor(ms / 1000);
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;
    return `${mm}m ${ss}s`;
  }

  async function processAndShow(state, autoSubmitted) {
    App.showLoader("Scoring your examination…");

    const score = scoreSession(state);
    const submissionTime = new Date();
    const completionMs = Date.now() - state.startTime;
    const device = detectDevice();

    const record = {
      timestamp: new Date(state.startTime).toISOString(),
      candidateUuid: state.candidate.candidateUuid,
      fullName: state.candidate.fullName,
      email: state.candidate.email,
      phone: state.candidate.phone,
      employeeId: state.candidate.employeeId,
      department: state.candidate.department,
      designation: state.candidate.designation || "",
      attemptNumber: state.candidate.attemptNumber,
      remainingAttempts: Math.max(0, CONFIG.maxAttempts - state.candidate.attemptNumber),
      questionIds: score.questionIds,
      selectedAnswers: score.selectedAnswers,
      correctAnswers: score.correctAnswers,
      correctCount: score.correct,
      wrongCount: score.wrong,
      unanswered: score.unanswered,
      marks: score.marks,
      percentage: score.percentage,
      passResult: score.passed ? "PASS" : "FAIL",
      completionTime: formatDuration(completionMs),
      submissionId: uuidv4(),
      browser: device.browser,
      operatingSystem: device.os,
      deviceType: device.device,
      autoSubmitted: !!autoSubmitted,
      date: submissionTime.toLocaleDateString(),
      time: submissionTime.toLocaleTimeString()
    };

    try {
      await Api.submitResult(record);
    } catch (err) {
      console.error("Failed to submit result to backend:", err);
    }

    Store.clearSession();
    App.hideLoader();
    renderResultScreen(record);
    renderAnswerReview(state);
    App.showScreen("screen-result");
  }

  function renderAnswerReview(state) {
    const container = document.getElementById("answerReviewList");
    container.innerHTML = "";

    state.questions.forEach((q, idx) => {
      const given = state.answers[q.id];
      const isCorrect = given === q.correctAnswer;
      const isUnanswered = !given;

      const card = document.createElement("div");
      card.className = "review-card" + (isUnanswered ? " unanswered" : isCorrect ? " correct" : " incorrect");

      const statusLabel = isUnanswered ? "Unanswered" : isCorrect ? "Correct" : "Incorrect";

      let optionsHtml = "";
      ["A", "B", "C", "D"].forEach(letter => {
        let cls = "review-option";
        let tag = "";
        if (letter === q.correctAnswer) { cls += " is-correct-answer"; tag = " ✓ Correct Answer"; }
        if (letter === given && given !== q.correctAnswer) { cls += " is-wrong-selected"; tag = " ✗ Your Answer"; }
        if (letter === given && given === q.correctAnswer) { tag = " ✓ Your Answer"; }
        optionsHtml += `<div class="${cls}"><span class="opt-letter">${letter}</span><span>${q.options[letter]}</span><span class="review-tag">${tag}</span></div>`;
      });

      card.innerHTML = `
        <div class="review-head">
          <span class="review-qnum">Question ${idx + 1}</span>
          <span class="review-status status-${isUnanswered ? "unanswered" : isCorrect ? "correct" : "incorrect"}">${statusLabel}</span>
        </div>
        <div class="review-question">${q.question}</div>
        <div class="review-options">${optionsHtml}</div>
        <div class="review-explanation"><strong>Explanation:</strong> ${q.explanation || "—"}</div>
      `;
      container.appendChild(card);
    });
  }

  function renderResultScreen(record) {
    const badge = document.getElementById("resultBadge");
    badge.textContent = record.passResult;
    badge.className = "result-badge " + (record.passResult === "PASS" ? "pass" : "fail");

    document.getElementById("resultMarks").textContent = record.marks;
    document.getElementById("resultPercentLabel").textContent = record.percentage + "% Score";

    const msgBox = document.getElementById("resultMessage");
    if (record.passResult === "PASS") {
      msgBox.innerHTML = `<div class="alert alert-success">${CONFIG.messages.passMessage}</div>`;
    } else {
      msgBox.innerHTML = `<div class="alert alert-danger">${CONFIG.messages.failMessage}</div>`;
    }

    document.getElementById("statCorrect").textContent = record.correctCount;
    document.getElementById("statWrong").textContent = record.wrongCount;
    document.getElementById("statUnanswered").textContent = record.unanswered;
    document.getElementById("statTime").textContent = record.completionTime;

    document.getElementById("dCandidateName").textContent = record.fullName;
    document.getElementById("dEmployeeId").textContent = record.employeeId;
    document.getElementById("dDepartment").textContent = record.department;
    document.getElementById("dAttempt").textContent = record.attemptNumber + " of " + CONFIG.maxAttempts;
    document.getElementById("dSubmission").textContent = `${record.date} ${record.time}`;

    const noteBox = document.getElementById("remainingAttemptsNote");
    const retakeBtn = document.getElementById("btnRetakeExam");
    if (record.passResult === "PASS") {
      noteBox.innerHTML = `<div class="alert alert-info">All remaining attempts have been disabled since you passed.</div>`;
      retakeBtn.classList.add("hidden");
    } else if (record.remainingAttempts > 0) {
      noteBox.innerHTML = `<div class="alert alert-info">You have ${record.remainingAttempts} attempt(s) remaining. Attempt ${record.attemptNumber + 1} of ${CONFIG.maxAttempts} may be started below.</div>`;
      retakeBtn.classList.remove("hidden");
    } else {
      noteBox.innerHTML = `<div class="alert alert-danger">${CONFIG.messages.attemptsExhausted}</div>`;
      retakeBtn.classList.add("hidden");
    }
  }

  return { processAndShow, scoreSession };
})();
