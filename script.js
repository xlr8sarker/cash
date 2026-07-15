/* ==========================================================================
   SARKER STUDIO — BILLING & CASH MEMO SYSTEM
   Core application logic (state, CRUD, dashboard, forms, search)
   Storage: browser LocalStorage — 100% offline, no backend required.
   ========================================================================== */

const STORAGE_KEYS = {
  MEMOS: "ss_memos",
  COUNTER: "ss_memo_counter",
};

const MAX_SERVICE_ROWS = 8;

/* ============================= STATE ============================= */

let state = {
  memos: [],
  editingMemoId: null,
  serviceRowCount: 0,
  confirmCallback: null,
};

/* ============================= STORAGE HELPERS ============================= */

function loadMemos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMOS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load memos:", e);
    return [];
  }
}

function persistMemos() {
  localStorage.setItem(STORAGE_KEYS.MEMOS, JSON.stringify(state.memos));
}

function getCounter() {
  const raw = localStorage.getItem(STORAGE_KEYS.COUNTER);
  return raw ? parseInt(raw, 10) : 1;
}

function setCounter(val) {
  localStorage.setItem(STORAGE_KEYS.COUNTER, String(val));
}

function peekNextMemoNo() {
  const year = new Date().getFullYear();
  const seq = String(getCounter()).padStart(5, "0");
  return `SS-${year}${seq}`;
}

function consumeMemoNo() {
  const memoNo = peekNextMemoNo();
  setCounter(getCounter() + 1);
  return memoNo;
}

/* ============================= UTILITIES ============================= */

function uid() {
  return "m_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function fmt(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function displayDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

/* ============================= TOASTS ============================= */

function showToast(message, kind = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${kind}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(30px)";
    toast.style.transition = "all 0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, 2600);
}

/* ============================= CONFIRM MODAL ============================= */

function openConfirm(title, text, onConfirm) {
  document.getElementById("confirmModalTitle").textContent = title;
  document.getElementById("confirmModalText").textContent = text;
  state.confirmCallback = onConfirm;
  document.getElementById("confirmModalOverlay").classList.add("show");
}

function closeConfirm() {
  document.getElementById("confirmModalOverlay").classList.remove("show");
  state.confirmCallback = null;
}

/* ============================= VIEW NAVIGATION ============================= */

const VIEW_TITLES = {
  dashboard: "Dashboard",
  newMemo: "New Cash Memo",
  memos: "Previous Cash Memos",
  due: "Due Receipts",
  sales: "Sales History",
};

function switchView(viewName) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(`view-${viewName}`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === viewName));
  document.getElementById("topbarTitle").textContent = VIEW_TITLES[viewName] || "Dashboard";

  if (viewName === "dashboard") renderDashboard();
  if (viewName === "memos") renderAllMemos();
  if (viewName === "due") renderDueMemos();
  if (viewName === "sales") renderSalesHistory();

  // close mobile sidebar
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("show");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ============================= DASHBOARD ============================= */

function computeStats() {
  const totalMemos = state.memos.length;
  const totalSales = state.memos.reduce((sum, m) => sum + (Number(m.grandTotal) || 0), 0);
  const totalDue = state.memos.reduce((sum, m) => sum + (Number(m.due) || 0), 0);
  const now = new Date();
  const monthSales = state.memos
    .filter((m) => {
      const d = new Date((m.date || "") + "T00:00:00");
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, m) => sum + (Number(m.grandTotal) || 0), 0);
  return { totalMemos, totalSales, totalDue, monthSales };
}

function renderDashboard() {
  const stats = computeStats();
  document.getElementById("statTotalMemos").textContent = stats.totalMemos;
  document.getElementById("statTotalSales").textContent = fmt(stats.totalSales);
  document.getElementById("statTotalDue").textContent = fmt(stats.totalDue);
  document.getElementById("statMonthSales").textContent = fmt(stats.monthSales);

  const recent = [...state.memos].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6);
  const tbody = document.querySelector("#recentMemosTable tbody");
  tbody.innerHTML = recent.map((m) => memoRowHTML(m, false)).join("");
  document.getElementById("recentEmptyState").classList.toggle("show", recent.length === 0);
  document.getElementById("recentMemosTable").style.display = recent.length === 0 ? "none" : "table";
  wireRowActionButtons();
}

function memoRowHTML(m, showCompanyPhone) {
  const isDue = (Number(m.due) || 0) > 0;
  return `
    <tr data-id="${m.id}">
      <td><strong>${escapeHTML(m.memoNo)}</strong></td>
      <td>${escapeHTML(m.customer?.name || "")}</td>
      ${showCompanyPhone ? `<td>${escapeHTML(m.customer?.company || "-")}</td><td>${escapeHTML(m.customer?.phone || "")}</td>` : ""}
      <td>${displayDate(m.date)}</td>
      <td>৳${fmt(m.grandTotal)}</td>
      <td>৳${fmt(m.due)}</td>
      ${!showCompanyPhone ? `<td><span class="badge ${isDue ? "badge-due" : "badge-paid"}">${isDue ? "Due" : "Paid"}</span></td>` : ""}
      <td class="col-actions">
        <div class="row-actions">
          <button class="btn-icon" title="Preview" data-action="preview" data-id="${m.id}">
            <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zm0 12.5a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>
          </button>
          <button class="btn-icon" title="Edit" data-action="edit" data-id="${m.id}">
            <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <button class="btn-icon" title="Duplicate" data-action="duplicate" data-id="${m.id}">
            <svg viewBox="0 0 24 24"><path d="M16 1H4a2 2 0 00-2 2v14h2V3h12V1zm3 4H8a2 2 0 00-2 2v14a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2zm0 16H8V7h11v14z"/></svg>
          </button>
          <button class="btn-icon" title="Print" data-action="print" data-id="${m.id}">
            <svg viewBox="0 0 24 24"><path d="M19 8H5a3 3 0 00-3 3v6h4v4h12v-4h4v-6a3 3 0 00-3-3zm-3 11H8v-5h8v5zm3-7a1 1 0 110-2 1 1 0 010 2zm-1-9H6v4h12V3z"/></svg>
          </button>
          <button class="btn-icon" title="Download PDF" data-action="download" data-id="${m.id}">
            <svg viewBox="0 0 24 24"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/></svg>
          </button>
          <button class="btn-icon danger" title="Delete" data-action="delete" data-id="${m.id}">
            <svg viewBox="0 0 24 24"><path d="M6 7h12v13a2 2 0 01-2 2H8a2 2 0 01-2-2V7zm3-4h6l1 2h4v2H4V5h4l1-2z"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function wireRowActionButtons() {
  document.querySelectorAll("[data-action]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const memo = state.memos.find((m) => m.id === id);
      if (!memo) return;
      if (action === "preview") openPreviewModal(memo, "memo");
      if (action === "edit") startEditMemo(memo);
      if (action === "duplicate") duplicateMemo(memo);
      if (action === "print") printMemo(memo, "memo");
      if (action === "download") exportMemoAsPDF(memo, "memo");
      if (action === "delete") {
        openConfirm("Delete this cash memo?", `Memo ${memo.memoNo} for ${memo.customer?.name || "this customer"} will be permanently deleted.`, () => {
          state.memos = state.memos.filter((m) => m.id !== id);
          persistMemos();
          refreshAllViews();
          showToast("Cash memo deleted", "success");
        });
      }
    };
  });
}

function refreshAllViews() {
  const activeView = document.querySelector(".view.active")?.id?.replace("view-", "") || "dashboard";
  switchView(activeView);
}

/* ============================= PREVIOUS MEMOS VIEW ============================= */

function renderAllMemos() {
  const query = document.getElementById("memoSearchInput").value.trim().toLowerCase();
  let list = [...state.memos].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (query) {
    list = list.filter((m) => {
      return (
        (m.memoNo || "").toLowerCase().includes(query) ||
        (m.customer?.name || "").toLowerCase().includes(query) ||
        (m.customer?.phone || "").toLowerCase().includes(query) ||
        (m.customer?.company || "").toLowerCase().includes(query)
      );
    });
  }
  const tbody = document.querySelector("#allMemosTable tbody");
  tbody.innerHTML = list.map((m) => memoRowHTML(m, true)).join("");
  document.getElementById("memosEmptyState").classList.toggle("show", list.length === 0);
  document.getElementById("allMemosTable").style.display = list.length === 0 ? "none" : "table";
  wireRowActionButtons();
}

/* ============================= DUE RECEIPTS VIEW ============================= */

function renderDueMemos() {
  const list = state.memos.filter((m) => (Number(m.due) || 0) > 0).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const tbody = document.querySelector("#dueMemosTable tbody");
  tbody.innerHTML = list
    .map(
      (m) => `
      <tr data-id="${m.id}">
        <td><strong>${escapeHTML(m.memoNo)}</strong></td>
        <td>${escapeHTML(m.customer?.name || "")}</td>
        <td>৳${fmt(m.grandTotal)}</td>
        <td>৳${fmt(m.advancePaid)}</td>
        <td><span class="badge badge-due">৳${fmt(m.due)}</span></td>
        <td class="col-actions">
          <div class="row-actions">
            <button class="btn-icon" title="Preview Due Receipt" data-due-action="preview" data-id="${m.id}">
              <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zm0 12.5a5 5 0 110-10 5 5 0 010 10z"/></svg>
            </button>
            <button class="btn-icon" title="Print Due Receipt" data-due-action="print" data-id="${m.id}">
              <svg viewBox="0 0 24 24"><path d="M19 8H5a3 3 0 00-3 3v6h4v4h12v-4h4v-6a3 3 0 00-3-3zm-3 11H8v-5h8v5zm3-7a1 1 0 110-2 1 1 0 010 2zm-1-9H6v4h12V3z"/></svg>
            </button>
            <button class="btn-icon" title="Download Due Receipt PDF" data-due-action="download" data-id="${m.id}">
              <svg viewBox="0 0 24 24"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");
  document.getElementById("dueEmptyState").classList.toggle("show", list.length === 0);
  document.getElementById("dueMemosTable").style.display = list.length === 0 ? "none" : "table";

  document.querySelectorAll("[data-due-action]").forEach((btn) => {
    btn.onclick = () => {
      const memo = state.memos.find((m) => m.id === btn.dataset.id);
      if (!memo) return;
      const action = btn.dataset.dueAction;
      if (action === "preview") openPreviewModal(memo, "due");
      if (action === "print") printMemo(memo, "due");
      if (action === "download") exportMemoAsPDF(memo, "due");
    };
  });
}

/* ============================= SALES HISTORY VIEW ============================= */

function renderSalesHistory() {
  const groups = {};
  state.memos.forEach((m) => {
    const d = new Date((m.date || "") + "T00:00:00");
    const key = isNaN(d) ? "Unknown" : `${d.toLocaleString("en-US", { month: "long" })} ${d.getFullYear()}`;
    if (!groups[key]) groups[key] = { count: 0, sales: 0, due: 0, sortKey: isNaN(d) ? 0 : d.getFullYear() * 100 + d.getMonth() };
    groups[key].count += 1;
    groups[key].sales += Number(m.grandTotal) || 0;
    groups[key].due += Number(m.due) || 0;
  });
  const rows = Object.entries(groups).sort((a, b) => b[1].sortKey - a[1].sortKey);
  const tbody = document.querySelector("#salesHistoryTable tbody");
  tbody.innerHTML = rows
    .map(
      ([month, g]) => `
      <tr>
        <td><strong>${month}</strong></td>
        <td>${g.count}</td>
        <td>৳${fmt(g.sales)}</td>
        <td>৳${fmt(g.due)}</td>
      </tr>
    `
    )
    .join("");
  document.getElementById("salesEmptyState").classList.toggle("show", rows.length === 0);
  document.getElementById("salesHistoryTable").style.display = rows.length === 0 ? "none" : "table";
}

/* ============================= MEMO FORM: SERVICE ROWS ============================= */

function createServiceRow(data = {}) {
  state.serviceRowCount += 1;
  const rowId = "row_" + state.serviceRowCount + "_" + Math.random().toString(36).slice(2, 6);
  const tr = document.createElement("tr");
  tr.dataset.rowId = rowId;
  tr.innerHTML = `
    <td class="col-no row-index">-</td>
    <td>
      <div class="service-search-wrap">
        <input type="text" class="svc-name-input" placeholder="Search service (e.g. Logo, SEO, Hosting)..." value="${escapeHTML(data.name || "")}" autocomplete="off" />
        <div class="service-search-results"></div>
      </div>
    </td>
    <td class="col-qty"><input type="number" class="svc-qty" min="1" step="1" value="${data.qty || 1}" /></td>
    <td class="col-price"><input type="number" class="svc-price" min="0" step="0.01" value="${data.unitPrice || 0}" /></td>
    <td class="col-total row-total-cell">৳0.00</td>
    <td class="col-remove"><button type="button" class="btn-icon danger remove-row-btn" title="Remove"><svg viewBox="0 0 24 24"><path d="M6 7h12v13a2 2 0 01-2 2H8a2 2 0 01-2-2V7zm3-4h6l1 2h4v2H4V5h4l1-2z"/></svg></button></td>
  `;
  document.getElementById("serviceTableBody").appendChild(tr);
  wireServiceRow(tr);
  recalcRowTotal(tr);
  renumberServiceRows();
  updateAddRowButtonState();
  return tr;
}

function wireServiceRow(tr) {
  const nameInput = tr.querySelector(".svc-name-input");
  const qtyInput = tr.querySelector(".svc-qty");
  const priceInput = tr.querySelector(".svc-price");
  const resultsBox = tr.querySelector(".service-search-results");
  const removeBtn = tr.querySelector(".remove-row-btn");

  function renderResults() {
    const matches = searchServices(nameInput.value);
    if (!matches.length) {
      resultsBox.classList.remove("show");
      resultsBox.innerHTML = "";
      return;
    }
    resultsBox.innerHTML = matches
      .map(
        (s) => `<div class="service-search-item" data-name="${escapeHTML(s.name)}" data-price="${s.price}">
          <span>${escapeHTML(s.name)} <span class="svc-cat">— ${escapeHTML(s.category)}</span></span>
          <span class="svc-price">৳${fmt(s.price)}</span>
        </div>`
      )
      .join("");
    resultsBox.classList.add("show");
  }

  nameInput.addEventListener("focus", renderResults);
  nameInput.addEventListener("input", () => {
    renderResults();
    recalcRowTotal(tr);
    recalcAllTotals();
  });
  nameInput.addEventListener("blur", () => {
    setTimeout(() => resultsBox.classList.remove("show"), 180);
  });

  resultsBox.addEventListener("mousedown", (e) => {
    const item = e.target.closest(".service-search-item");
    if (!item) return;
    nameInput.value = item.dataset.name;
    priceInput.value = item.dataset.price;
    resultsBox.classList.remove("show");
    recalcRowTotal(tr);
    recalcAllTotals();
  });

  [qtyInput, priceInput].forEach((inp) => {
    inp.addEventListener("input", () => {
      recalcRowTotal(tr);
      recalcAllTotals();
    });
  });

  removeBtn.addEventListener("click", () => {
    tr.remove();
    renumberServiceRows();
    updateAddRowButtonState();
    recalcAllTotals();
  });
}

function recalcRowTotal(tr) {
  const qty = parseFloat(tr.querySelector(".svc-qty").value) || 0;
  const price = parseFloat(tr.querySelector(".svc-price").value) || 0;
  const total = qty * price;
  tr.querySelector(".row-total-cell").textContent = `৳${fmt(total)}`;
}

function renumberServiceRows() {
  const rows = document.querySelectorAll("#serviceTableBody tr");
  rows.forEach((tr, i) => {
    tr.querySelector(".row-index").textContent = i + 1;
  });
}

function updateAddRowButtonState() {
  const rows = document.querySelectorAll("#serviceTableBody tr").length;
  const btn = document.getElementById("addServiceRowBtn");
  btn.disabled = rows >= MAX_SERVICE_ROWS;
  btn.style.opacity = rows >= MAX_SERVICE_ROWS ? 0.5 : 1;
  btn.style.cursor = rows >= MAX_SERVICE_ROWS ? "not-allowed" : "pointer";
}

function collectServicesFromForm() {
  const rows = document.querySelectorAll("#serviceTableBody tr");
  const services = [];
  rows.forEach((tr) => {
    const name = tr.querySelector(".svc-name-input").value.trim();
    const qty = parseFloat(tr.querySelector(".svc-qty").value) || 0;
    const unitPrice = parseFloat(tr.querySelector(".svc-price").value) || 0;
    if (name && qty > 0) {
      services.push({ name, qty, unitPrice, total: qty * unitPrice });
    }
  });
  return services;
}

/* ============================= MEMO FORM: TOTALS ============================= */

function recalcAllTotals() {
  const services = collectServicesFromForm();
  const subtotal = services.reduce((sum, s) => sum + s.total, 0);

  const discountType = document.getElementById("discountType").value;
  const discountValueRaw = parseFloat(document.getElementById("discountValue").value) || 0;
  let discountAmount = 0;
  if (discountType === "percent") discountAmount = (subtotal * discountValueRaw) / 100;
  else if (discountType === "fixed") discountAmount = discountValueRaw;
  discountAmount = Math.min(discountAmount, subtotal);

  const advancePaid = parseFloat(document.getElementById("advancePaid").value) || 0;
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const due = Math.max(0, grandTotal - advancePaid);

  document.getElementById("sumSubtotal").textContent = `৳${fmt(subtotal)}`;
  document.getElementById("sumDiscount").textContent = `- ৳${fmt(discountAmount)}`;
  document.getElementById("sumAdvance").textContent = `- ৳${fmt(advancePaid)}`;
  document.getElementById("sumDue").textContent = `৳${fmt(due)}`;
  document.getElementById("sumGrand").textContent = `৳${fmt(grandTotal)}`;

  return { subtotal, discountAmount, advancePaid, grandTotal, due };
}

/* ============================= MEMO FORM: NEW / EDIT ============================= */

function resetMemoForm() {
  document.getElementById("memoForm").reset();
  document.getElementById("memoId").value = "";
  document.getElementById("memoDate").value = todayISO();
  document.getElementById("serviceTableBody").innerHTML = "";
  state.serviceRowCount = 0;
  document.getElementById("discountType").value = "none";
  document.getElementById("discountValue").value = 0;
  document.getElementById("advancePaid").value = 0;
  document.getElementById("memoNotes").value = "";
  document.getElementById("paymentOtherText").value = "";
  createServiceRow();
  state.editingMemoId = null;
  document.getElementById("memoNoDisplay").textContent = peekNextMemoNo();
  document.getElementById("saveMemoBtn").textContent = "Save Cash Memo";
  recalcAllTotals();
}

function startNewMemo() {
  resetMemoForm();
  switchView("newMemo");
}

function startEditMemo(memo) {
  document.getElementById("memoId").value = memo.id;
  document.getElementById("memoDate").value = memo.date || todayISO();
  document.getElementById("custName").value = memo.customer?.name || "";
  document.getElementById("custCompany").value = memo.customer?.company || "";
  document.getElementById("custPhone").value = memo.customer?.phone || "";
  document.getElementById("custEmail").value = memo.customer?.email || "";
  document.getElementById("custAddress").value = memo.customer?.address || "";

  document.getElementById("serviceTableBody").innerHTML = "";
  state.serviceRowCount = 0;
  (memo.services || []).forEach((s) => createServiceRow(s));
  if (!memo.services || memo.services.length === 0) createServiceRow();

  document.getElementById("discountType").value = memo.discountType || "none";
  document.getElementById("discountValue").value = memo.discountValue || 0;
  document.getElementById("advancePaid").value = memo.advancePaid || 0;
  document.getElementById("memoNotes").value = memo.notes || "";

  const radios = document.querySelectorAll('input[name="paymentMethod"]');
  radios.forEach((r) => (r.checked = r.value === (memo.paymentMethod || "Cash")));
  document.getElementById("paymentOtherText").value = memo.paymentOther || "";

  state.editingMemoId = memo.id;
  document.getElementById("memoNoDisplay").textContent = memo.memoNo;
  document.getElementById("saveMemoBtn").textContent = "Update Cash Memo";
  recalcAllTotals();
  switchView("newMemo");
}

function duplicateMemo(memo) {
  const clone = JSON.parse(JSON.stringify(memo));
  delete clone.id;
  state.editingMemoId = null;
  startEditMemo(clone);
  document.getElementById("memoId").value = "";
  document.getElementById("memoDate").value = todayISO();
  document.getElementById("memoNoDisplay").textContent = peekNextMemoNo();
  document.getElementById("saveMemoBtn").textContent = "Save Cash Memo";
  showToast("Memo duplicated — review and save as new", "success");
}

function buildMemoObjectFromForm() {
  const totals = recalcAllTotals();
  const services = collectServicesFromForm();
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || "Cash";

  const existingId = document.getElementById("memoId").value;
  const isEditing = !!existingId;
  const existingMemo = isEditing ? state.memos.find((m) => m.id === existingId) : null;

  const memo = {
    id: existingId || uid(),
    memoNo: isEditing ? existingMemo?.memoNo || peekNextMemoNo() : consumeMemoNo(),
    date: document.getElementById("memoDate").value || todayISO(),
    customer: {
      name: document.getElementById("custName").value.trim(),
      company: document.getElementById("custCompany").value.trim(),
      phone: document.getElementById("custPhone").value.trim(),
      email: document.getElementById("custEmail").value.trim(),
      address: document.getElementById("custAddress").value.trim(),
    },
    services,
    discountType: document.getElementById("discountType").value,
    discountValue: parseFloat(document.getElementById("discountValue").value) || 0,
    advancePaid: totals.advancePaid,
    paymentMethod,
    paymentOther: document.getElementById("paymentOtherText").value.trim(),
    notes: document.getElementById("memoNotes").value.trim(),
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    grandTotal: totals.grandTotal,
    due: totals.due,
    createdAt: existingMemo?.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  return memo;
}

function saveMemoFromForm() {
  const custName = document.getElementById("custName").value.trim();
  const custPhone = document.getElementById("custPhone").value.trim();
  const services = collectServicesFromForm();

  if (!custName || !custPhone) {
    showToast("Customer name and phone number are required", "error");
    return;
  }
  if (services.length === 0) {
    showToast("Please add at least one service", "error");
    return;
  }

  const memo = buildMemoObjectFromForm();
  const existingIndex = state.memos.findIndex((m) => m.id === memo.id);
  if (existingIndex >= 0) {
    state.memos[existingIndex] = memo;
    showToast("Cash memo updated successfully", "success");
  } else {
    state.memos.push(memo);
    showToast("Cash memo saved successfully", "success");
  }
  persistMemos();
  switchView("dashboard");
}

/* ============================= PREVIEW MODAL ============================= */

let currentPreviewMemo = null;
let currentPreviewType = "memo";

function openPreviewModal(memo, type) {
  currentPreviewMemo = memo;
  currentPreviewType = type;
  document.getElementById("previewModalTitle").textContent = type === "due" ? "Due Receipt Preview" : "Cash Memo Preview";
  const html = type === "due" ? buildDueReceiptHTML(memo) : buildMemoHTML(memo);
  const body = document.getElementById("previewModalBody");
  body.innerHTML = `<div class="preview-scale-wrap" style="display:flex;justify-content:center;">${html}</div>`;
  document.getElementById("previewModalOverlay").classList.add("show");
}

function closePreviewModal() {
  document.getElementById("previewModalOverlay").classList.remove("show");
  currentPreviewMemo = null;
}

function previewFromFormButton() {
  const custName = document.getElementById("custName").value.trim();
  if (!custName) {
    showToast("Enter at least a customer name to preview", "error");
    return;
  }
  const memo = buildMemoObjectFromFormPreviewOnly();
  openPreviewModal(memo, "memo");
}

function buildMemoObjectFromFormPreviewOnly() {
  const totals = recalcAllTotals();
  const services = collectServicesFromForm();
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || "Cash";
  const existingId = document.getElementById("memoId").value;
  const existingMemo = existingId ? state.memos.find((m) => m.id === existingId) : null;
  return {
    id: existingId || "preview",
    memoNo: existingMemo?.memoNo || document.getElementById("memoNoDisplay").textContent,
    date: document.getElementById("memoDate").value || todayISO(),
    customer: {
      name: document.getElementById("custName").value.trim(),
      company: document.getElementById("custCompany").value.trim(),
      phone: document.getElementById("custPhone").value.trim(),
      email: document.getElementById("custEmail").value.trim(),
      address: document.getElementById("custAddress").value.trim(),
    },
    services,
    paymentMethod,
    paymentOther: document.getElementById("paymentOtherText").value.trim(),
    notes: document.getElementById("memoNotes").value.trim(),
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    advancePaid: totals.advancePaid,
    grandTotal: totals.grandTotal,
    due: totals.due,
  };
}

/* ============================= INIT / EVENT WIRING ============================= */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("footYear").textContent = new Date().getFullYear();
  state.memos = loadMemos();

  // Sidebar nav
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
  document.querySelectorAll("[data-view-link]").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.viewLink));
  });
  document.getElementById("quickNewMemoBtn").addEventListener("click", startNewMemo);

  // Mobile sidebar toggle
  document.getElementById("hamburgerBtn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("sidebarOverlay").classList.add("show");
  });
  document.getElementById("sidebarOverlay").addEventListener("click", () => {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarOverlay").classList.remove("show");
  });

  // Memo form
  document.getElementById("memoForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveMemoFromForm();
  });
  document.getElementById("cancelMemoBtn").addEventListener("click", () => switchView("dashboard"));
  document.getElementById("addServiceRowBtn").addEventListener("click", () => {
    if (document.querySelectorAll("#serviceTableBody tr").length >= MAX_SERVICE_ROWS) {
      showToast(`Maximum ${MAX_SERVICE_ROWS} services per memo`, "error");
      return;
    }
    createServiceRow();
  });
  document.getElementById("discountType").addEventListener("change", recalcAllTotals);
  document.getElementById("discountValue").addEventListener("input", recalcAllTotals);
  document.getElementById("advancePaid").addEventListener("input", recalcAllTotals);
  document.getElementById("previewMemoBtn").addEventListener("click", previewFromFormButton);

  // Search
  document.getElementById("memoSearchInput").addEventListener("input", renderAllMemos);

  // Preview modal
  document.getElementById("closePreviewBtn").addEventListener("click", closePreviewModal);
  document.getElementById("previewCloseBtn").addEventListener("click", closePreviewModal);
  document.getElementById("previewModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "previewModalOverlay") closePreviewModal();
  });
  document.getElementById("previewPrintBtn").addEventListener("click", () => {
    if (currentPreviewMemo) printMemo(currentPreviewMemo, currentPreviewType);
  });
  document.getElementById("previewDownloadBtn").addEventListener("click", () => {
    if (currentPreviewMemo) exportMemoAsPDF(currentPreviewMemo, currentPreviewType);
  });

  // Confirm modal
  document.getElementById("confirmCancelBtn").addEventListener("click", closeConfirm);
  document.getElementById("confirmOkBtn").addEventListener("click", () => {
    if (typeof state.confirmCallback === "function") state.confirmCallback();
    closeConfirm();
  });
  document.getElementById("confirmModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "confirmModalOverlay") closeConfirm();
  });

  // Initial form state + first view
  resetMemoForm();
  switchView("dashboard");
});
