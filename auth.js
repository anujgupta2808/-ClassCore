const USERS_KEY   = "uod-users";
const SESSION_KEY = "uod-session";

// ── Theme (shared with main app) ──────────────────────────────
(function () {
  const t = localStorage.getItem("uod-theme") || "light";
  document.documentElement.setAttribute("data-theme", t);
  const btn = document.getElementById("auth-theme-toggle");
  if (btn) btn.textContent = t === "dark" ? "☀️" : "🌙";
})();

function toggleAuthTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next    = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("uod-theme", next);
  document.getElementById("auth-theme-toggle").textContent = next === "dark" ? "☀️" : "🌙";
}

// ── Redirect if already logged in ────────────────────────────
if (sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY)) {
  window.location.href = "index.html";
}

// ── Helpers ───────────────────────────────────────────────────
function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function showToast(msg, type = "success") {
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || "ℹ️"}</span><span>${msg}</span>`;
  document.getElementById("toast-container").appendChild(el);
  el.addEventListener("click", () => {
    el.classList.add("hide");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  });
  setTimeout(() => {
    el.classList.add("hide");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, 3500);
}

// ── Tab switching with 3D flip animation ───────────────────
let currentTab = "login";

function switchTab(tab) {
  if (tab === currentTab) return;

  const outForm = document.getElementById(`${currentTab}-form`);
  const inForm  = document.getElementById(`${tab}-form`);
  const goRight = tab === "signup"; // login→signup: flip left out / right in

  outForm.style.pointerEvents = "none";

  // Flip out
  outForm.classList.add(goRight ? "flip-out-left" : "flip-out-right");

  setTimeout(() => {
    outForm.classList.add("hidden");
    outForm.classList.remove("flip-out-left", "flip-out-right");
    outForm.style.pointerEvents = "";

    // Flip in
    inForm.classList.remove("hidden");
    inForm.classList.add(goRight ? "flip-in-right" : "flip-in-left");

    // Stagger fields
    inForm.classList.add("field-animate");

    setTimeout(() => {
      inForm.classList.remove("flip-in-right", "flip-in-left", "field-animate");
    }, 500);
  }, 0);

  document.getElementById("tab-login").classList.toggle("active",  tab === "login");
  document.getElementById("tab-signup").classList.toggle("active", tab === "signup");
  currentTab = tab;
}

// ── Password visibility ───────────────────────────────────────
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const show  = input.type === "password";
  input.type  = show ? "text" : "password";
  btn.textContent = show ? "🙈" : "👁";
}

// ── Sign Up ───────────────────────────────────────────────────
function handleSignup(e) {
  e.preventDefault();
  const name     = document.getElementById("signup-name").value.trim();
  const username = document.getElementById("signup-username").value.trim().toLowerCase();
  const password = document.getElementById("signup-password").value;
  const confirm  = document.getElementById("signup-confirm").value;

  if (password !== confirm) {
    showToast("Passwords do not match!", "error"); return;
  }

  const users = getUsers();
  if (users.find(u => u.username === username)) {
    showToast("Username already taken. Choose another.", "error"); return;
  }

  users.push({ name, username, password });
  saveUsers(users);
  showToast("Account created! Please sign in.", "success");
  document.getElementById("signup-form").reset();
  setTimeout(() => switchTab("login"), 1200);
}

// ── Login ─────────────────────────────────────────────────────
function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim().toLowerCase();
  const password = document.getElementById("login-password").value;
  const remember = document.getElementById("remember-me").checked;

  const users = getUsers();
  const user  = users.find(u => u.username === username && u.password === password);

  if (!user) {
    showToast("Invalid username or password.", "error"); return;
  }

  const session = { username: user.username, name: user.name };
  // remember me → localStorage (persists), else → sessionStorage (tab only)
  if (remember) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  showToast(`Welcome back, ${user.name}! 👋`, "success");
  setTimeout(() => { window.location.href = "index.html"; }, 900);
}

// Academic year (Aug-Jul cycle)
(function () {
  const now  = new Date();
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const el   = document.getElementById("auth-academic-year");
  if (el) el.textContent = "Academic Year " + year + "\u2013" + String(year + 1).slice(-2);
})();
