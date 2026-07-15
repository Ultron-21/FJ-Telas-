/* ============================================================
   FJ DisplayPro Tech — Mostruário
   -------------------------------------------------------------
   Tudo é armazenado no localStorage do navegador (sem servidor).
   Isso significa: os itens ficam salvos no computador/instância
   onde o admin cadastrou. Para uso em produção com múltiplos
   dispositivos, troque a camada de storage por uma API real.
   ============================================================ */

// ------------------------------------------------------------
// CONFIG — troque a senha do administrador aqui
// ------------------------------------------------------------
const ADMIN_PASSWORD = "fjadmin2026";

const STORAGE_KEY = "fj_showcase_items";
const SESSION_KEY = "fj_admin_session";

// ------------------------------------------------------------
// SEED — itens de exemplo mostrados na primeira visita
// ------------------------------------------------------------
const SEED_ITEMS = [
  {
    id: "seed-1",
    title: "TV LED 50\" com linhas verticais coloridas",
    category: "TV Smart",
    model: "LED 50\" Full HD",
    description: "Tela apresentava linhas verticais coloridas por falha na placa T-CON. Peça recuperada e testada por 24h antes da entrega.",
    before: "assets/tv-lines.svg",
    after: "assets/tv-perfect.svg",
    date: "2026-06-02"
  },
  {
    id: "seed-2",
    title: "Monitor com imagem escura e manchada",
    category: "Monitor",
    model: "Monitor LCD 24\"",
    description: "Imagem escurecida por degradação do painel. Aplicada reativação de moléculas, restaurando brilho e contraste originais.",
    before: "assets/tv-lines.svg",
    after: "assets/tv-perfect.svg",
    date: "2026-05-18"
  }
];

// ------------------------------------------------------------
// STATE
// ------------------------------------------------------------
let items = loadItems();
let currentFilter = "todos";
let isAdmin = sessionStorage.getItem(SESSION_KEY) === "true";
let editingId = null;
let pendingDeleteId = null;
let beforeDataUrl = null;
let afterDataUrl = null;

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Erro ao carregar itens", e);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ITEMS));
  return SEED_ITEMS.slice();
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ------------------------------------------------------------
// DOM refs
// ------------------------------------------------------------
const grid = document.getElementById("showcaseGrid");
const filterRow = document.getElementById("filterRow");
const adminChip = document.getElementById("adminChip");
const loginBtn = document.getElementById("loginBtn");
const loginOverlay = document.getElementById("loginOverlay");
const loginForm = document.getElementById("loginForm");
const loginPass = document.getElementById("loginPass");
const loginErr = document.getElementById("loginErr");

const itemOverlay = document.getElementById("itemOverlay");
const itemForm = document.getElementById("itemForm");
const itemModalTitle = document.getElementById("itemModalTitle");
const itemId = document.getElementById("itemId");
const itemTitle = document.getElementById("itemTitle");
const itemCategory = document.getElementById("itemCategory");
const itemModel = document.getElementById("itemModel");
const itemDesc = document.getElementById("itemDesc");
const itemErr = document.getElementById("itemErr");
const beforeBox = document.getElementById("beforeBox");
const afterBox = document.getElementById("afterBox");
const beforeInput = document.getElementById("beforeInput");
const afterInput = document.getElementById("afterInput");
const beforeHint = document.getElementById("beforeHint");
const afterHint = document.getElementById("afterHint");

const deleteOverlay = document.getElementById("deleteOverlay");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

const viewOverlay = document.getElementById("viewOverlay");
const viewContent = document.getElementById("viewContent");

const toast = document.getElementById("toast");

document.getElementById("year").textContent = new Date().getFullYear();

// ------------------------------------------------------------
// TOAST
// ------------------------------------------------------------
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

// ------------------------------------------------------------
// OVERLAY helpers
// ------------------------------------------------------------
function openOverlay(el) { el.classList.add("show"); }
function closeOverlay(el) { el.classList.remove("show"); }

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".overlay").forEach(o => closeOverlay(o));
  });
});
document.querySelectorAll(".overlay").forEach(o => {
  o.addEventListener("click", (e) => { if (e.target === o) closeOverlay(o); });
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelectorAll(".overlay").forEach(o => closeOverlay(o));
});

// ------------------------------------------------------------
// ADMIN LOGIN
// ------------------------------------------------------------
function updateAdminUI() {
  adminChip.classList.toggle("show", isAdmin);
  loginBtn.innerHTML = isAdmin
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><path d="M12 15v2"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;
  loginBtn.title = isAdmin ? "Sair do modo admin" : "Login administrador";
}

loginBtn.addEventListener("click", () => {
  if (isAdmin) {
    isAdmin = false;
    sessionStorage.removeItem(SESSION_KEY);
    updateAdminUI();
    renderGrid();
    showToast("Sessão de administrador encerrada.");
  } else {
    loginErr.classList.remove("show");
    loginPass.value = "";
    openOverlay(loginOverlay);
    setTimeout(() => loginPass.focus(), 80);
  }
});

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (loginPass.value === ADMIN_PASSWORD) {
    isAdmin = true;
    sessionStorage.setItem(SESSION_KEY, "true");
    updateAdminUI();
    renderGrid();
    closeOverlay(loginOverlay);
    showToast("Login realizado. Modo admin ativado.");
  } else {
    loginErr.classList.add("show");
  }
});

// ------------------------------------------------------------
// FILTERS
// ------------------------------------------------------------
filterRow.addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  filterRow.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  currentFilter = btn.dataset.filter;
  renderGrid();
});

// ------------------------------------------------------------
// RENDER GRID
// ------------------------------------------------------------
function renderGrid() {
  grid.innerHTML = "";

  const filtered = currentFilter === "todos"
    ? items
    : items.filter(i => i.category === currentFilter);

  if (isAdmin) {
    const addCard = document.createElement("div");
    addCard.className = "add-card";
    addCard.innerHTML = `<span class="plus">+</span><span>Adicionar item</span>`;
    addCard.addEventListener("click", () => openItemModal());
    grid.appendChild(addCard);
  }

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = isAdmin
      ? `<h3>Nenhum item aqui ainda</h3><p>Use o card "Adicionar item" acima para cadastrar a primeira recuperação dessa categoria.</p>`
      : `<h3>Nenhum item nessa categoria ainda</h3><p>Em breve novos casos recuperados serão publicados aqui.</p>`;
    grid.appendChild(empty);
    return;
  }

  filtered.slice().reverse().forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-media">
        <span class="card-tag">${escapeHtml(item.category)}</span>
        <div class="split">
          <img class="b" src="${item.before}" alt="Antes — ${escapeHtml(item.title)}">
          <img src="${item.after}" alt="Depois — ${escapeHtml(item.title)}">
        </div>
        <div class="seamline"></div>
        ${isAdmin ? `<div class="card-admin-actions show">
          <button class="mini-btn" data-edit="${item.id}" title="Editar" aria-label="Editar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
          </button>
          <button class="mini-btn danger" data-delete="${item.id}" title="Remover" aria-label="Remover">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>` : ""}
      </div>
      <div class="card-body">
        <h3>${escapeHtml(item.title)}</h3>
        <div class="card-model">${escapeHtml(item.model || "—")}</div>
        <p>${escapeHtml(item.description || "")}</p>
        <div class="card-foot">
          <span class="card-date">${formatDate(item.date)}</span>
        </div>
      </div>
    `;
    card.querySelector(".card-media").addEventListener("click", (e) => {
      if (e.target.closest(".mini-btn")) return;
      openViewModal(item);
    });
    grid.appendChild(card);
  });

  grid.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const item = items.find(i => i.id === btn.dataset.edit);
      if (item) openItemModal(item);
    });
  });
  grid.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      pendingDeleteId = btn.dataset.delete;
      openOverlay(deleteOverlay);
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

// ------------------------------------------------------------
// VIEW MODAL (public — see full case)
// ------------------------------------------------------------
function openViewModal(item) {
  viewContent.innerHTML = `
    <h3 style="margin-bottom:4px">${escapeHtml(item.title)}</h3>
    <p class="sub" style="margin-bottom:18px">${escapeHtml(item.category)} · ${escapeHtml(item.model || "—")} · ${formatDate(item.date)}</p>
    <div class="upload-row" style="margin-bottom:16px">
      <div>
        <div class="card-tag" style="position:static;display:inline-block;margin-bottom:8px">Antes</div>
        <img src="${item.before}" style="border-radius:10px;border:1px solid var(--line)" alt="Antes">
      </div>
      <div>
        <div class="card-tag" style="position:static;display:inline-block;margin-bottom:8px;color:var(--blue-soft)">Depois</div>
        <img src="${item.after}" style="border-radius:10px;border:1px solid var(--line)" alt="Depois">
      </div>
    </div>
    <p style="color:var(--muted);font-size:14px">${escapeHtml(item.description || "Sem descrição adicional.")}</p>
  `;
  openOverlay(viewOverlay);
}

// ------------------------------------------------------------
// ITEM FORM (ADD / EDIT) — admin only
// ------------------------------------------------------------
function resetItemForm() {
  itemForm.reset();
  itemId.value = "";
  beforeDataUrl = null;
  afterDataUrl = null;
  beforeBox.classList.remove("filled");
  afterBox.classList.remove("filled");
  beforeBox.style.backgroundImage = "";
  afterBox.style.backgroundImage = "";
  beforeHint.style.display = "block";
  afterHint.style.display = "block";
  const oldBefore = beforeBox.querySelector("img");
  if (oldBefore) oldBefore.remove();
  const oldAfter = afterBox.querySelector("img");
  if (oldAfter) oldAfter.remove();
  itemErr.classList.remove("show");
}

function openItemModal(item) {
  if (!isAdmin) return;
  resetItemForm();
  if (item) {
    editingId = item.id;
    itemModalTitle.textContent = "Editar item do mostruário";
    itemId.value = item.id;
    itemTitle.value = item.title;
    itemCategory.value = item.category;
    itemModel.value = item.model || "";
    itemDesc.value = item.description || "";
    beforeDataUrl = item.before;
    afterDataUrl = item.after;
    setBoxPreview(beforeBox, beforeHint, item.before);
    setBoxPreview(afterBox, afterHint, item.after);
  } else {
    editingId = null;
    itemModalTitle.textContent = "Adicionar item ao mostruário";
  }
  openOverlay(itemOverlay);
}

function setBoxPreview(box, hint, src) {
  hint.style.display = "none";
  box.classList.add("filled");
  let img = box.querySelector("img");
  if (!img) {
    img = document.createElement("img");
    box.appendChild(img);
  }
  img.src = src;
}

function handleFileInput(input, box, hint, setter) {
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result);
      setBoxPreview(box, hint, reader.result);
    };
    reader.onerror = () => showToast("Não foi possível ler essa imagem.");
    reader.readAsDataURL(file);
  });
}
handleFileInput(beforeInput, beforeBox, beforeHint, (v) => beforeDataUrl = v);
handleFileInput(afterInput, afterBox, afterHint, (v) => afterDataUrl = v);

itemForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!isAdmin) return;

  if (!itemTitle.value.trim() || !beforeDataUrl || !afterDataUrl) {
    itemErr.classList.add("show");
    return;
  }
  itemErr.classList.remove("show");

  if (editingId) {
    const idx = items.findIndex(i => i.id === editingId);
    if (idx !== -1) {
      items[idx] = {
        ...items[idx],
        title: itemTitle.value.trim(),
        category: itemCategory.value,
        model: itemModel.value.trim(),
        description: itemDesc.value.trim(),
        before: beforeDataUrl,
        after: afterDataUrl
      };
    }
    showToast("Item atualizado.");
  } else {
    items.push({
      id: "item-" + Date.now(),
      title: itemTitle.value.trim(),
      category: itemCategory.value,
      model: itemModel.value.trim(),
      description: itemDesc.value.trim(),
      before: beforeDataUrl,
      after: afterDataUrl,
      date: new Date().toISOString().slice(0, 10)
    });
    showToast("Item adicionado ao mostruário.");
  }

  saveItems();
  closeOverlay(itemOverlay);
  renderGrid();
});

// ------------------------------------------------------------
// DELETE
// ------------------------------------------------------------
confirmDeleteBtn.addEventListener("click", () => {
  if (!pendingDeleteId) return;
  items = items.filter(i => i.id !== pendingDeleteId);
  saveItems();
  pendingDeleteId = null;
  closeOverlay(deleteOverlay);
  renderGrid();
  showToast("Item removido do mostruário.");
});

// ------------------------------------------------------------
// HERO BEFORE/AFTER SLIDER
// ------------------------------------------------------------
const heroCompare = document.getElementById("heroCompare");
const compareRange = document.getElementById("compareRange");
compareRange.addEventListener("input", () => {
  heroCompare.style.setProperty("--pos", compareRange.value + "%");
});

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------
updateAdminUI();
renderGrid();