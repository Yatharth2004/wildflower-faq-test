/**
 * admin.js
 * Password-protected dashboard: KPIs, filterable results table,
 * most-missed-question analytics, and CSV export.
 */

const Admin = (function () {

  let allRecords = [];
  let sessionAuthed = false;

  function showAlert(msg) {
    document.getElementById("loginAlert").innerHTML = `<div class="alert alert-danger">${msg}</div>`;
  }

  async function handleLogin() {
    const pw = document.getElementById("adminPasswordInput").value;
    const btn = document.getElementById("btnAdminLogin");
    btn.disabled = true; btn.textContent = "Verifying…";
    try {
      const res = await Api.adminLogin({ password: pw });
      if (res.success) {
        sessionAuthed = true;
        sessionStorage.setItem("wft_admin_authed", "1");
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("dashboardScreen").classList.remove("hidden");
        document.getElementById("btnLogout").classList.remove("hidden");
        await loadData();
      } else {
        showAlert("Incorrect password. Please try again.");
      }
    } catch (e) {
      showAlert("Unable to verify password right now. Please try again.");
    } finally {
      btn.disabled = false; btn.textContent = "Log In";
    }
  }

  function logout() {
    sessionAuthed = false;
    sessionStorage.removeItem("wft_admin_authed");
    document.getElementById("dashboardScreen").classList.add("hidden");
    document.getElementById("btnLogout").classList.add("hidden");
    document.getElementById("loginScreen").classList.remove("hidden");
  }

  function populateDeptFilter() {
    const select = document.getElementById("filterDepartment");
    CONFIG.departments.forEach(dep => {
      const opt = document.createElement("option");
      opt.value = dep; opt.textContent = dep;
      select.appendChild(opt);
    });
  }

  async function loadData() {
    const res = await Api.adminFetchAll({});
    allRecords = (res && res.records) || [];
    renderAll();
  }

  function computeKpis(records) {
    const totalAttempts = records.length;
    const uniqueCandidates = new Set(records.map(r => (r.employeeId || r.email))).size;
    const passRecords = records.filter(r => r.passResult === "PASS");
    const failRecords = records.filter(r => r.passResult === "FAIL");
    const avg = totalAttempts
      ? Math.round(records.reduce((s, r) => s + (Number(r.percentage) || 0), 0) / totalAttempts)
      : 0;
    const scores = records.map(r => Number(r.marks) || 0);
    return {
      totalCandidates: uniqueCandidates,
      totalAttempts,
      passCount: passRecords.length,
      failCount: failRecords.length,
      avgScore: avg,
      highScore: scores.length ? Math.max(...scores) : 0,
      lowScore: scores.length ? Math.min(...scores) : 0
    };
  }

  function applyFilters(records) {
    const search = document.getElementById("filterSearch").value.trim().toLowerCase();
    const dept = document.getElementById("filterDepartment").value;
    const result = document.getElementById("filterResult").value;
    const attempt = document.getElementById("filterAttempt").value;
    const date = document.getElementById("filterDate").value;

    return records.filter(r => {
      if (search) {
        const hay = `${r.fullName || ""} ${r.email || ""} ${r.employeeId || ""}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      if (dept && r.department !== dept) return false;
      if (result && r.passResult !== result) return false;
      if (attempt && String(r.attemptNumber) !== attempt) return false;
      if (date) {
        const rDate = new Date(r.timestamp);
        const iso = !isNaN(rDate) ? rDate.toISOString().slice(0, 10) : "";
        if (iso !== date) return false;
      }
      return true;
    });
  }

  function renderTable(records) {
    const tbody = document.getElementById("resultsTableBody");
    tbody.innerHTML = "";
    document.getElementById("noResultsMsg").classList.toggle("hidden", records.length > 0);

    records
      .slice()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${r.fullName || ""}</td>
          <td>${r.employeeId || ""}</td>
          <td>${r.department || ""}</td>
          <td>${r.attemptNumber || ""}</td>
          <td>${r.marks || 0}/100</td>
          <td>${r.percentage || 0}%</td>
          <td class="${r.passResult === "PASS" ? "badge-pass" : "badge-fail"}">${r.passResult || ""}</td>
          <td>${r.date || ""}</td>
          <td>${r.time || ""}</td>
        `;
        tbody.appendChild(tr);
      });
  }

  function renderMissedQuestions(records) {
    const missCount = {};
    records.forEach(r => {
      const correct = r.correctAnswers || {};
      const selected = r.selectedAnswers || {};
      Object.keys(correct).forEach(qid => {
        if (selected[qid] !== correct[qid]) {
          missCount[qid] = (missCount[qid] || 0) + 1;
        }
      });
    });
    const rows = Object.entries(missCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    const tbody = document.getElementById("missedTableBody");
    tbody.innerHTML = "";
    rows.forEach(([qid, count]) => {
      const q = QUESTION_BANK.find(x => x.id === qid);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${qid}</td><td>${q ? q.question : "(question not found)"}</td><td>${q ? q.topic : "-"}</td><td>${count}</td>`;
      tbody.appendChild(tr);
    });
  }

  function renderAll() {
    const filtered = applyFilters(allRecords);
    const kpi = computeKpis(allRecords);
    document.getElementById("kpiTotalCandidates").textContent = kpi.totalCandidates;
    document.getElementById("kpiTotalAttempts").textContent = kpi.totalAttempts;
    document.getElementById("kpiPassCount").textContent = kpi.passCount;
    document.getElementById("kpiFailCount").textContent = kpi.failCount;
    document.getElementById("kpiAvgScore").textContent = kpi.avgScore + "%";
    document.getElementById("kpiHighScore").textContent = kpi.highScore;
    document.getElementById("kpiLowScore").textContent = kpi.lowScore;

    renderTable(filtered);
    renderMissedQuestions(allRecords);
  }

  function exportCsv() {
    const filtered = applyFilters(allRecords);
    const headers = ["Full Name", "Email", "Phone", "Employee ID", "Department", "Designation",
      "Attempt Number", "Marks", "Percentage", "Result", "Correct", "Wrong", "Unanswered",
      "Completion Time", "Date", "Time"];
    const rows = filtered.map(r => [
      r.fullName, r.email, r.phone, r.employeeId, r.department, r.designation,
      r.attemptNumber, r.marks, r.percentage, r.passResult, r.correctCount, r.wrongCount,
      r.unanswered, r.completionTime, r.date, r.time
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${(cell ?? "").toString().replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wildflower-faq-test-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function init() {
    populateDeptFilter();
    document.getElementById("btnAdminLogin").addEventListener("click", handleLogin);
    document.getElementById("adminPasswordInput").addEventListener("keydown", e => {
      if (e.key === "Enter") handleLogin();
    });
    document.getElementById("btnLogout").addEventListener("click", logout);
    document.getElementById("btnExportCsv").addEventListener("click", exportCsv);
    document.getElementById("btnPrintReport").addEventListener("click", () => window.print());
    document.getElementById("btnRefresh").addEventListener("click", loadData);

    ["filterSearch", "filterDepartment", "filterResult", "filterAttempt", "filterDate"].forEach(id => {
      document.getElementById(id).addEventListener("input", renderAll);
      document.getElementById(id).addEventListener("change", renderAll);
    });

    if (sessionStorage.getItem("wft_admin_authed") === "1") {
      sessionAuthed = true;
      document.getElementById("loginScreen").classList.add("hidden");
      document.getElementById("dashboardScreen").classList.remove("hidden");
      document.getElementById("btnLogout").classList.remove("hidden");
      loadData();
    }
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", Admin.init);
