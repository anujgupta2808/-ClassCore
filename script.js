const SESSION_KEY = "uod-session";

// ── Session Guard ──────────────────────────────────────────────
const _raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
if (!_raw) { window.location.href = "login.html"; }
const currentUser = _raw ? JSON.parse(_raw) : {};

// ── Per-user storage key ───────────────────────────────────────
const STORAGE_KEY = `uod-students-${currentUser.username}`;

// ── DOM refs ───────────────────────────────────────────────────
const studentForm      = document.getElementById("student-form");
const nameInput        = document.getElementById("name");
const rollInput        = document.getElementById("roll");
const departmentInput  = document.getElementById("department");
const enrolledInput    = document.getElementById("enrolled");
const studentIdInput   = document.getElementById("student-id");
const studentTableBody = document.getElementById("student-table-body");
const emptyState       = document.getElementById("empty-state");
const saveBtn          = document.getElementById("save-btn");
const clearBtn         = document.getElementById("clear-btn");
const searchInput      = document.getElementById("search-input");
const exportBtn        = document.getElementById("export-btn");
const themeToggle      = document.getElementById("theme-toggle");
const modalOverlay     = document.getElementById("modal-overlay");
const modalConfirm     = document.getElementById("modal-confirm");
const modalCancel      = document.getElementById("modal-cancel");
const modalMsg         = document.getElementById("modal-msg");
const resultCount      = document.getElementById("result-count");
const formCollapseBtn  = document.getElementById("form-collapse-btn");
const formBody         = document.getElementById("form-body");
const formTitleText    = document.getElementById("form-title-text");
const sidebarAddBtn    = document.getElementById("sidebar-add-btn");

let students        = [];
let sortCol         = "";
let sortDir         = 1;
let pendingDeleteId = null;
let formCollapsed   = false;
let searchTimer     = null;
let activeDept      = "";

// ── Storage ────────────────────────────────────────────────────
function loadStudents() {
  const stored = localStorage.getItem(STORAGE_KEY);
  students = stored ? JSON.parse(stored) : [];
}

function saveStudents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}

// ── Toast ──────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById("toast-container").appendChild(el);
  el.addEventListener("click", () => removeToast(el));
  setTimeout(() => removeToast(el), 3500);
}

function removeToast(el) {
  el.classList.add("hide");
  el.addEventListener("animationend", () => el.remove(), { once: true });
}

// ── Stats & Sidebar ────────────────────────────────────────────
function animateNum(el, target) {
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  if (start === target) return;
  const steps = Math.min(Math.abs(target - start), 20);
  const step  = (target - start) / steps;
  let cur = start, count = 0;
  const iv = setInterval(() => {
    count++; cur += step;
    el.textContent = Math.round(cur);
    if (count >= steps) { el.textContent = target; clearInterval(iv); }
  }, 20);
}

function updateStats() {
  animateNum(document.getElementById("stat-total"), students.length);
  animateNum(document.getElementById("stat-depts"),
    new Set(students.map(s => s.department.toLowerCase())).size);

  const dates    = students.map(s => s.enrolled).filter(Boolean).sort();
  const latestEl = document.getElementById("stat-latest");
  if (latestEl) latestEl.textContent = dates.length ? dates[dates.length - 1] : "—";

  const sidebar = document.getElementById("dept-list-sidebar");
  const allBtn  = document.getElementById("dept-all-btn");
  if (!sidebar) return;

  const deptMap = {};
  students.forEach(s => { const d = s.department || "Unknown"; deptMap[d] = (deptMap[d] || 0) + 1; });
  const entries = Object.entries(deptMap).sort((a, b) => b[1] - a[1]);

  sidebar.innerHTML = entries.length
    ? entries.map(([dept, count]) =>
        `<li class="dept-item${activeDept === dept ? " dept-active" : ""}" data-dept="${esc(dept)}">
          <span>${esc(dept)}</span>
          <span class="dept-count">${count}</span>
        </li>`).join("")
    : `<li class="dept-empty">No data yet</li>`;

  sidebar.querySelectorAll(".dept-item").forEach(li => {
    li.addEventListener("click", () => {
      activeDept = li.dataset.dept === activeDept ? "" : li.dataset.dept;
      updateStats();
      renderStudents();
    });
  });

  if (allBtn) allBtn.style.display = activeDept ? "block" : "none";
}

// ── Escape HTML ────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Filter & Sort ──────────────────────────────────────────────
function getFiltered() {
  const q = searchInput.value.trim().toLowerCase();
  let list = [...students];

  if (activeDept)
    list = list.filter(s => s.department === activeDept);

  if (q)
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.roll.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q));

  if (sortCol) {
    list.sort((a, b) => {
      const av = (a[sortCol] || "").toString().toLowerCase();
      const bv = (b[sortCol] || "").toString().toLowerCase();
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    });
  }
  return list;
}

// ── Dept filter pill (always update) ──────────────────────────
function updatePill() {
  const pill = document.getElementById("dept-filter-pill");
  if (!pill) return;
  if (activeDept) {
    pill.style.display = "flex";
    pill.innerHTML = `<span>🏛️ ${esc(activeDept)}</span><button onclick="clearDeptFilter()">✕</button>`;
  } else {
    pill.style.display = "none";
  }
}

// ── Render ─────────────────────────────────────────────────────
function renderStudents() {
  updateStats();
  updatePill();
  studentTableBody.innerHTML = "";
  const list = getFiltered();

  if (list.length === 0) {
    emptyState.style.display = "block";
    resultCount.textContent  = "";
    return;
  }

  emptyState.style.display = "none";
  resultCount.textContent  = `${list.length} student${list.length !== 1 ? "s" : ""} found`;

  list.forEach((s, i) => {
    const tr = document.createElement("tr");
    tr.style.animationDelay = `${i * 0.03}s`;
    tr.innerHTML = `
      <td style="color:var(--text-3);font-size:0.8rem">${i + 1}</td>
      <td><strong>${esc(s.name)}</strong></td>
      <td><span class="badge-roll">${esc(s.roll)}</span></td>
      <td><span class="badge-dept">${esc(s.department)}</span></td>
      <td style="color:var(--text-2)">${s.enrolled || '<span style="color:var(--text-3)">—</span>'}</td>
      <td class="actions">
        <button class="act-btn edit"   data-id="${s.id}">✏️ Edit</button>
        <button class="act-btn delete" data-id="${s.id}">🗑️ Delete</button>
      </td>`;
    studentTableBody.appendChild(tr);
  });
}

// ── Form ───────────────────────────────────────────────────────
function resetForm() {
  studentIdInput.value = "";
  studentForm.reset();
  saveBtn.textContent = "➕ Add Student";
  if (formTitleText) formTitleText.textContent = "Add New Student";
  document.getElementById("form-title-icon").textContent = "📋";
}

function handleSubmit(e) {
  e.preventDefault();
  const name       = nameInput.value.trim();
  const roll       = rollInput.value.trim();
  const department = departmentInput.value.trim();
  const enrolled   = enrolledInput.value || null;
  const id         = studentIdInput.value;

  if (!name || !roll || !department) return;

  const isDup = students.some(s =>
    s.roll === roll &&
    s.department.toLowerCase() === department.toLowerCase() &&
    s.id !== id
  );
  if (isDup) { showToast(`Roll "${roll}" already exists in ${department}!`, "error"); return; }

  if (id) {
    const idx = students.findIndex(s => s.id === id);
    if (idx !== -1) students[idx] = { id, name, roll, department, enrolled };
    showToast("Student updated successfully!", "info");
  } else {
    students.push({ id: crypto.randomUUID(), name, roll, department, enrolled });
    showToast(`${name} added successfully!`, "success");
  }

  saveStudents();
  renderStudents();
  resetForm();
}

// ── Table Clicks ───────────────────────────────────────────────
function handleTableClick(e) {
  const btn = e.target.closest("[data-id]");
  if (!btn) return;
  const id = btn.dataset.id;
  const s  = students.find(s => s.id === id);

  if (btn.classList.contains("edit")) {
    if (!s) return;
    studentIdInput.value  = s.id;
    nameInput.value       = s.name;
    rollInput.value       = s.roll;
    departmentInput.value = s.department;
    enrolledInput.value   = s.enrolled || "";
    saveBtn.textContent   = "✏️ Update Student";
    if (formTitleText) formTitleText.textContent = `Editing: ${s.name}`;
    document.getElementById("form-title-icon").textContent = "✏️";
    if (formCollapsed) toggleFormCollapse();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (btn.classList.contains("delete")) {
    pendingDeleteId = id;
    modalMsg.textContent = `Delete "${s ? s.name : "this student"}"? This cannot be undone.`;
    modalOverlay.classList.remove("hidden");
  }
}

// ── Delete Modal ───────────────────────────────────────────────
modalConfirm.addEventListener("click", () => {
  if (!pendingDeleteId) return;
  const s = students.find(s => s.id === pendingDeleteId);
  students = students.filter(s => s.id !== pendingDeleteId);
  if (studentIdInput.value === pendingDeleteId) resetForm();
  saveStudents();
  renderStudents();
  showToast(`${s ? s.name : "Student"} deleted.`, "warning");
  pendingDeleteId = null;
  modalOverlay.classList.add("hidden");
});

modalCancel.addEventListener("click", () => {
  pendingDeleteId = null;
  modalOverlay.classList.add("hidden");
});

modalOverlay.addEventListener("click", e => {
  if (e.target === modalOverlay) {
    pendingDeleteId = null;
    modalOverlay.classList.add("hidden");
  }
});

// ── Dept Filter Clear ──────────────────────────────────────────
function clearDeptFilter() {
  activeDept = "";
  updateStats();
  renderStudents();
}

document.getElementById("dept-all-btn").addEventListener("click", clearDeptFilter);

// ── Form Collapse ──────────────────────────────────────────────
function toggleFormCollapse() {
  formCollapsed = !formCollapsed;
  formBody.style.display      = formCollapsed ? "none" : "block";
  formCollapseBtn.textContent = formCollapsed ? "▼" : "▲";
}
formCollapseBtn.addEventListener("click", toggleFormCollapse);

sidebarAddBtn.addEventListener("click", () => {
  resetForm();
  if (formCollapsed) toggleFormCollapse();
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => nameInput.focus(), 300);
});

// ── Search ─────────────────────────────────────────────────────
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderStudents, 300);
});

// ── Sort ───────────────────────────────────────────────────────
document.querySelectorAll("th.sortable").forEach(th => {
  th.addEventListener("click", () => {
    const col = th.dataset.col;
    document.querySelectorAll("th.sortable").forEach(t =>
      t.classList.remove("sort-asc", "sort-desc"));
    sortDir = sortCol === col ? sortDir * -1 : 1;
    sortCol = col;
    th.classList.add(sortDir === 1 ? "sort-asc" : "sort-desc");
    renderStudents();
  });
});

// ── CSV Export ─────────────────────────────────────────────────
exportBtn.addEventListener("click", () => {
  if (students.length === 0) { showToast("No students to export.", "warning"); return; }
  const headers = ["Name", "Roll Number", "Department", "Enrolled"];
  const rows    = students.map(s => [s.name, s.roll, s.department, s.enrolled || ""]);
  const csv     = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))
    .join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: "uod-students.csv"
  });
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`Exported ${students.length} students!`, "success");
});

// ── Dark Mode ──────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  localStorage.setItem("uod-theme", theme);
}

themeToggle.addEventListener("click", () => {
  applyTheme(
    document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"
  );
});

// ── Navbar user & logout ───────────────────────────────────────
const navUser = document.getElementById("nav-user");
if (navUser) navUser.innerHTML =
  `<span class="nav-user-chip">👤 ${currentUser.name || currentUser.username}</span>`;

document.getElementById("logout-btn").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "login.html";
});

// ── Init ───────────────────────────────────────────────────────
applyTheme(localStorage.getItem("uod-theme") || "light");
studentForm.addEventListener("submit", handleSubmit);
studentTableBody.addEventListener("click", handleTableClick);
clearBtn.addEventListener("click", resetForm);
loadStudents();
renderStudents();

// Academic Year Picker
(function () {
  const AY_KEY   = "uod-academic-year";
  const badge    = document.getElementById("academic-year");
  const dropdown = document.getElementById("ay-dropdown");
  if (!badge || !dropdown) return;

  // Build year options: 5 years back to 3 years ahead
  const now      = new Date();
  const baseYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const years    = [];
  for (let y = baseYear - 5; y <= baseYear + 3; y++) years.push(y);

  // Load saved or default to current
  let selected = parseInt(localStorage.getItem(AY_KEY)) || baseYear;

  function label(y) { return "Academic Year " + y + "\u2013" + String(y + 1).slice(-2); }

  function render() {
    badge.textContent = label(selected);
    dropdown.innerHTML =
      '<div class="ay-dropdown-header">Select Academic Year</div>' +
      years.map(y =>
        '<button class="ay-option' + (y === selected ? ' ay-active' : '') + '" data-y="' + y + '">' +
        label(y) + '</button>'
      ).join("");

    dropdown.querySelectorAll(".ay-option").forEach(btn => {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        selected = parseInt(this.dataset.y);
        localStorage.setItem(AY_KEY, selected);
        render();
        dropdown.classList.add("hidden");
      });
    });
  }

  render();

  // Toggle dropdown on badge click
  badge.addEventListener("click", function (e) {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  });

  // Close on outside click
  document.addEventListener("click", function () {
    dropdown.classList.add("hidden");
  });
})();
