/**
 * registration.js
 * Handles the candidate registration form: field validation, department
 * dropdown population, duplicate/attempt checking against the backend.
 */

const Registration = (function () {

  function populateDepartments() {
    const select = document.getElementById("department");
    CONFIG.departments.forEach(dep => {
      const opt = document.createElement("option");
      opt.value = dep;
      opt.textContent = dep;
      select.appendChild(opt);
    });
  }

  function validateEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }
  function validatePhone(v) {
    return /^[6-9]\d{9}$/.test(v.trim()) || /^\+?\d{10,13}$/.test(v.trim());
  }
  function validateEmployeeId(v) {
    return v.trim().length >= 2;
  }

  function setError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const err = document.getElementById("err-" + fieldId);
    if (message) {
      input.classList.add("invalid");
      err.textContent = message;
    } else {
      input.classList.remove("invalid");
      err.textContent = "";
    }
  }

  function validateForm() {
    let valid = true;

    const fullName = document.getElementById("fullName").value.trim();
    if (!fullName) { setError("fullName", "Full name is required."); valid = false; }
    else setError("fullName", "");

    const email = document.getElementById("email").value.trim();
    if (!email) { setError("email", "Email is required."); valid = false; }
    else if (!validateEmail(email)) { setError("email", "Enter a valid email address."); valid = false; }
    else setError("email", "");

    const phone = document.getElementById("phone").value.trim();
    if (!phone) { setError("phone", "Mobile number is required."); valid = false; }
    else if (!validatePhone(phone)) { setError("phone", "Enter a valid 10-digit mobile number."); valid = false; }
    else setError("phone", "");

    const employeeId = document.getElementById("employeeId").value.trim();
    if (!employeeId) { setError("employeeId", "Employee ID is required."); valid = false; }
    else if (!validateEmployeeId(employeeId)) { setError("employeeId", "Enter a valid Employee ID."); valid = false; }
    else setError("employeeId", "");

    const department = document.getElementById("department").value;
    if (!department) { setError("department", "Please select a department."); valid = false; }
    else setError("department", "");

    return valid;
  }

  function showAlert(message, type) {
    const box = document.getElementById("regAlertBox");
    box.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  }
  function clearAlert() {
    document.getElementById("regAlertBox").innerHTML = "";
  }

  function collectFormData() {
    return {
      fullName: document.getElementById("fullName").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      employeeId: document.getElementById("employeeId").value.trim(),
      department: document.getElementById("department").value,
      designation: document.getElementById("designation").value.trim()
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearAlert();
    if (!validateForm()) return;

    const btn = document.getElementById("btnRegisterSubmit");
    btn.disabled = true;
    btn.textContent = "Checking eligibility…";

    const formData = collectFormData();

    try {
      const attemptCheck = await Api.checkAttempts({
        email: formData.email,
        employeeId: formData.employeeId
      });

      if (!attemptCheck.success) {
        showAlert("We couldn't verify your eligibility right now. Please try again.", "danger");
        return;
      }

      if (attemptCheck.alreadyPassed) {
        showAlert(
          "Our records show you have already passed the WILDFLOWER FAQ TEST. You are eligible for the next stage — no further attempts are needed.",
          "success"
        );
        return;
      }

      if (attemptCheck.remainingAttempts <= 0) {
        showAlert(CONFIG.messages.attemptsExhausted, "danger");
        return;
      }

      const candidate = {
        ...formData,
        candidateUuid: uuidv4(),
        registrationTimestamp: new Date().toISOString(),
        attemptNumber: attemptCheck.attemptsUsed + 1,
        remainingAttemptsBefore: attemptCheck.remainingAttempts,
        servedQuestionIds: attemptCheck.servedQuestionIds || []
      };

      Store.saveCandidate(candidate);
      App.goToPrecheck(candidate);

    } catch (err) {
      console.error(err);
      showAlert("Something went wrong while checking your eligibility. Please try again.", "danger");
    } finally {
      btn.disabled = false;
      btn.textContent = "Continue to Examination →";
    }
  }

  function init() {
    populateDepartments();
    document.getElementById("registrationForm").addEventListener("submit", handleSubmit);
  }

  return { init };
})();
