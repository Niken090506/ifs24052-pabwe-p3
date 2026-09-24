// ============================================================
// GLOBAL STATE & HELPERS
// ============================================================

const STORAGE_KEYS = {
  expenses: "p3_expenses",
  bookmarks: "p3_bookmarks",
  highScore: "p3_quiz_high_score"
};

const money = value => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
}).format(value);

const escapeHTML = value => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const loadData = key => {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
};

const saveData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getToday = () => new Date().toISOString().split("T")[0];


// ============================================================
// TAB NAVIGATION — query URL, NOT localStorage
// ============================================================

const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");
const validTabs = ["expense", "bookmark", "quiz"];

function getActiveTab() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  return validTabs.includes(tab) ? tab : "expense";
}

function setActiveTab(tab, updateUrl = true) {
  const activeTab = validTabs.includes(tab) ? tab : "expense";

  tabButtons.forEach(button => {
    button.classList.toggle("tab-active", button.dataset.tab === activeTab);
  });

  tabPanels.forEach(panel => {
    panel.classList.toggle("panel-hidden", panel.id !== `${activeTab}-panel`);
  });

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    history.replaceState({}, "", url);
  }
}

tabButtons.forEach(button => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

window.addEventListener("popstate", () => setActiveTab(getActiveTab(), false));


// ============================================================
// MODAL
// ============================================================

const modal = document.querySelector("#modal");
const modalTitle = document.querySelector("#modal-title");
const modalKicker = document.querySelector("#modal-kicker");
const modalBody = document.querySelector("#modal-body");
const modalClose = document.querySelector("#modal-close");

let modalState = null;

function openModal(config) {
  modalState = config;
  modalTitle.textContent = config.title;
  modalKicker.textContent = config.kicker || "Edit Data";
  modalBody.innerHTML = config.content;
  modal.classList.remove("modal-hidden");
  modal.classList.add("flex");
  config.afterOpen?.();
}

function closeModal() {
  modalState = null;
  modal.classList.add("modal-hidden");
  modal.classList.remove("flex");
  modalBody.innerHTML = "";
}

modalClose.addEventListener("click", closeModal);

modal.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});


// ============================================================
// EXPENSE TRACKER
// ============================================================

let expenses = loadData(STORAGE_KEYS.expenses);

const expenseForm = document.querySelector("#expense-form");
const expenseList = document.querySelector("#expense-list");
const expenseSearch = document.querySelector("#expense-search");
const expenseFilterType = document.querySelector("#expense-filter-type");
const expenseSort = document.querySelector("#expense-sort");
const incomeTotal = document.querySelector("#income-total");
const expenseTotal = document.querySelector("#expense-total");
const balanceTotal = document.querySelector("#balance-total");
const expenseCount = document.querySelector("#expense-count");
const expenseDate = document.querySelector("#expense-date");

expenseDate.value = getToday();

function updateExpenseSummary() {
  const income = expenses
    .filter(item => item.type === "Pemasukan")
    .reduce((sum, item) => sum + item.amount, 0);

  const expense = expenses
    .filter(item => item.type === "Pengeluaran")
    .reduce((sum, item) => sum + item.amount, 0);

  incomeTotal.textContent = money(income);
  expenseTotal.textContent = money(expense);
  balanceTotal.textContent = money(income - expense);
}

function getFilteredExpenses() {
  const keyword = expenseSearch.value.trim().toLowerCase();
  const type = expenseFilterType.value;
  const sort = expenseSort.value;

  const filtered = expenses.filter(item => {
    const matchesKeyword = item.title.toLowerCase().includes(keyword);
    const matchesType = type === "all" || item.type === type;
    return matchesKeyword && matchesType;
  });

  filtered.sort((a, b) => {
    if (sort === "oldest") return a.date.localeCompare(b.date);
    if (sort === "highest") return b.amount - a.amount;
    if (sort === "lowest") return a.amount - b.amount;
    return b.date.localeCompare(a.date);
  });

  return filtered;
}

function renderExpenses() {
  const filtered = getFilteredExpenses();
  expenseCount.textContent = `${filtered.length} transaksi`;

  if (filtered.length === 0) {
    expenseList.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
        <i class="ti ti-receipt-off text-3xl text-slate-400"></i>
        <p class="mt-3 font-bold text-slate-700">Belum ada transaksi</p>
        <p class="mt-1 text-sm text-muted">Tambahkan transaksi atau ubah filter pencarian.</p>
      </div>
    `;
    updateExpenseSummary();
    return;
  }

  expenseList.innerHTML = filtered.map(item => {
    const isIncome = item.type === "Pemasukan";

    return `
      <article class="rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-start gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isIncome ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}">
              <i class="ti ${isIncome ? "ti-arrow-down-left" : "ti-arrow-up-right"} text-xl"></i>
            </div>
            <div class="min-w-0">
              <h4 class="font-bold text-slate-900">${escapeHTML(item.title)}</h4>
              <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>${escapeHTML(item.category)}</span>
                <span>•</span>
                <span>${escapeHTML(item.date)}</span>
                <span class="rounded-full px-2 py-1 font-semibold ${isIncome ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}">${escapeHTML(item.type)}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between gap-4 sm:justify-end">
            <p class="text-base font-extrabold ${isIncome ? "text-emerald-700" : "text-rose-700"}">
              ${isIncome ? "+" : "-"} ${money(item.amount)}
            </p>
            <div class="flex gap-2">
              <button class="expense-edit rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-100 hover:text-indigo-700" data-id="${item.id}" type="button">Ubah</button>
              <button class="expense-delete rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100" data-id="${item.id}" type="button">Hapus</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  updateExpenseSummary();
}

expenseForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = document.querySelector("#expense-title").value.trim();
  const category = document.querySelector("#expense-category").value;
  const amount = Number(document.querySelector("#expense-amount").value);
  const type = document.querySelector("#expense-type").value;
  const date = expenseDate.value;

  if (!title || !category || !date || !Number.isFinite(amount) || amount <= 0) {
    alert("Lengkapi semua field dan pastikan jumlah lebih dari 0.");
    return;
  }

  expenses.push({
    id: makeId(),
    title,
    category,
    amount,
    type,
    date
  });

  saveData(STORAGE_KEYS.expenses, expenses);
  expenseForm.reset();
  expenseDate.value = getToday();
  renderExpenses();
});

[expenseSearch, expenseFilterType, expenseSort].forEach(element => {
  element.addEventListener(element === expenseSearch ? "input" : "change", renderExpenses);
});

expenseList.addEventListener("click", event => {
  const editButton = event.target.closest(".expense-edit");
  const deleteButton = event.target.closest(".expense-delete");

  if (editButton) openExpenseEdit(editButton.dataset.id);
  if (deleteButton) openDeleteModal("expense", deleteButton.dataset.id);
});

function openExpenseEdit(id) {
  const item = expenses.find(expense => expense.id === id);
  if (!item) return;

  openModal({
    kicker: "Expense Tracker",
    title: "Ubah Transaksi",
    content: `
      <form id="edit-expense-form" class="space-y-4">
        <div>
          <label for="edit-expense-title" class="mb-1.5 block text-sm font-semibold">Judul</label>
          <input id="edit-expense-title" value="${escapeHTML(item.title)}" required class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm">
        </div>
        <div>
          <label for="edit-expense-category" class="mb-1.5 block text-sm font-semibold">Kategori</label>
          <select id="edit-expense-category" required class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">
            ${["Makanan", "Transportasi", "Kuliah", "Belanja", "Hiburan", "Lainnya"].map(category => `<option ${category === item.category ? "selected" : ""}>${category}</option>`).join("")}
          </select>
        </div>
        <div>
          <label for="edit-expense-amount" class="mb-1.5 block text-sm font-semibold">Jumlah</label>
          <input id="edit-expense-amount" value="${item.amount}" min="1" required type="number" class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm">
        </div>
        <div>
          <label for="edit-expense-type" class="mb-1.5 block text-sm font-semibold">Tipe</label>
          <select id="edit-expense-type" required class="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">
            <option ${item.type === "Pengeluaran" ? "selected" : ""}>Pengeluaran</option>
            <option ${item.type === "Pemasukan" ? "selected" : ""}>Pemasukan</option>
          </select>
        </div>
        <div>
          <label for="edit-expense-date" class="mb-1.5 block text-sm font-semibold">Tanggal</label>
          <input id="edit-expense-date" value="${item.date}" required type="date" class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm">
        </div>
        <div class="flex gap-2 pt-2">
          <button type="button" id="cancel-modal" class="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">Batal</button>
          <button type="submit" class="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">Simpan</button>
        </div>
      </form>
    `
  });

  document.querySelector("#cancel-modal").addEventListener("click", closeModal);

  document.querySelector("#edit-expense-form").addEventListener("submit", event => {
    event.preventDefault();

    const updated = {
      ...item,
      title: document.querySelector("#edit-expense-title").value.trim(),
      category: document.querySelector("#edit-expense-category").value,
      amount: Number(document.querySelector("#edit-expense-amount").value),
      type: document.querySelector("#edit-expense-type").value,
      date: document.querySelector("#edit-expense-date").value
    };

    if (!updated.title || !updated.category || !updated.date || !Number.isFinite(updated.amount) || updated.amount <= 0) {
      alert("Data transaksi tidak valid.");
      return;
    }

    expenses = expenses.map(expense => expense.id === id ? updated : expense);
    saveData(STORAGE_KEYS.expenses, expenses);
    closeModal();
    renderExpenses();
  });
}


// ============================================================
// BOOKMARK MANAGER
// ============================================================

let bookmarks = loadData(STORAGE_KEYS.bookmarks);

const bookmarkForm = document.querySelector("#bookmark-form");
const bookmarkList = document.querySelector("#bookmark-list");
const bookmarkSearch = document.querySelector("#bookmark-search");
const bookmarkSort = document.querySelector("#bookmark-sort");
const bookmarkCount = document.querySelector("#bookmark-count");

function isValidUrl(url) {
  return /^https?:\/\//i.test(url);
}

function getFilteredBookmarks() {
  const keyword = bookmarkSearch.value.trim().toLowerCase();
  const sort = bookmarkSort.value;

  const filtered = bookmarks.filter(item => {
    const text = `${item.title} ${item.url} ${item.category}`.toLowerCase();
    return text.includes(keyword);
  });

  filtered.sort((a, b) => {
    if (sort === "az") return a.title.localeCompare(b.title);
    if (sort === "za") return b.title.localeCompare(a.title);
    return b.createdAt - a.createdAt;
  });

  return filtered;
}

function renderBookmarks() {
  const filtered = getFilteredBookmarks();
  bookmarkCount.textContent = `${filtered.length} bookmark`;

  if (filtered.length === 0) {
    bookmarkList.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
        <i class="ti ti-bookmark-off text-3xl text-slate-400"></i>
        <p class="mt-3 font-bold text-slate-700">Belum ada bookmark</p>
        <p class="mt-1 text-sm text-muted">Tambahkan link favorit kamu.</p>
      </div>
    `;
    return;
  }

  bookmarkList.innerHTML = filtered.map(item => `
    <article class="rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" class="font-bold text-indigo-700 hover:underline">
              ${escapeHTML(item.title)}
            </a>
            <span class="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">${escapeHTML(item.category)}</span>
          </div>
          <a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" class="mt-1 block break-all text-xs text-slate-500 hover:text-indigo-600">
            ${escapeHTML(item.url)}
          </a>
          ${item.note ? `<p class="mt-2 text-sm leading-6 text-muted">${escapeHTML(item.note)}</p>` : ""}
        </div>
        <div class="flex shrink-0 gap-2">
          <button class="bookmark-edit rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-100 hover:text-indigo-700" data-id="${item.id}" type="button">Ubah</button>
          <button class="bookmark-delete rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100" data-id="${item.id}" type="button">Hapus</button>
        </div>
      </div>
    </article>
  `).join("");
}

bookmarkForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = document.querySelector("#bookmark-title").value.trim();
  const url = document.querySelector("#bookmark-url").value.trim();
  const category = document.querySelector("#bookmark-category").value.trim();
  const note = document.querySelector("#bookmark-note").value.trim();

  if (!title || !category) {
    alert("Judul dan kategori wajib diisi.");
    return;
  }

  if (!isValidUrl(url)) {
    alert("URL harus diawali http:// atau https://.");
    return;
  }

  bookmarks.push({
    id: makeId(),
    title,
    url,
    category,
    note,
    createdAt: Date.now()
  });

  saveData(STORAGE_KEYS.bookmarks, bookmarks);
  bookmarkForm.reset();
  renderBookmarks();
});

[bookmarkSearch, bookmarkSort].forEach(element => {
  element.addEventListener(element === bookmarkSearch ? "input" : "change", renderBookmarks);
});

bookmarkList.addEventListener("click", event => {
  const editButton = event.target.closest(".bookmark-edit");
  const deleteButton = event.target.closest(".bookmark-delete");

  if (editButton) openBookmarkEdit(editButton.dataset.id);
  if (deleteButton) openDeleteModal("bookmark", deleteButton.dataset.id);
});

function openBookmarkEdit(id) {
  const item = bookmarks.find(bookmark => bookmark.id === id);
  if (!item) return;

  openModal({
    kicker: "Bookmark Manager",
    title: "Ubah Bookmark",
    content: `
      <form id="edit-bookmark-form" class="space-y-4">
        <div>
          <label for="edit-bookmark-title" class="mb-1.5 block text-sm font-semibold">Judul</label>
          <input id="edit-bookmark-title" value="${escapeHTML(item.title)}" required class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm">
        </div>
        <div>
          <label for="edit-bookmark-url" class="mb-1.5 block text-sm font-semibold">URL</label>
          <input id="edit-bookmark-url" value="${escapeHTML(item.url)}" required class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm">
        </div>
        <div>
          <label for="edit-bookmark-category" class="mb-1.5 block text-sm font-semibold">Kategori</label>
          <input id="edit-bookmark-category" value="${escapeHTML(item.category)}" required class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm">
        </div>
        <div>
          <label for="edit-bookmark-note" class="mb-1.5 block text-sm font-semibold">Catatan</label>
          <textarea id="edit-bookmark-note" rows="3" class="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm">${escapeHTML(item.note)}</textarea>
        </div>
        <div class="flex gap-2 pt-2">
          <button type="button" id="cancel-modal" class="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">Batal</button>
          <button type="submit" class="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">Simpan</button>
        </div>
      </form>
    `
  });

  document.querySelector("#cancel-modal").addEventListener("click", closeModal);

  document.querySelector("#edit-bookmark-form").addEventListener("submit", event => {
    event.preventDefault();

    const updated = {
      ...item,
      title: document.querySelector("#edit-bookmark-title").value.trim(),
      url: document.querySelector("#edit-bookmark-url").value.trim(),
      category: document.querySelector("#edit-bookmark-category").value.trim(),
      note: document.querySelector("#edit-bookmark-note").value.trim()
    };

    if (!updated.title || !updated.category || !isValidUrl(updated.url)) {
      alert("Judul dan kategori wajib diisi, serta URL harus diawali http:// atau https://.");
      return;
    }

    bookmarks = bookmarks.map(bookmark => bookmark.id === id ? updated : bookmark);
    saveData(STORAGE_KEYS.bookmarks, bookmarks);
    closeModal();
    renderBookmarks();
  });
}


// ============================================================
// DELETE MODAL
// ============================================================

function openDeleteModal(type, id) {
  const isExpense = type === "expense";

  openModal({
    kicker: "Konfirmasi",
    title: "Hapus data?",
    content: `
      <p class="text-sm leading-6 text-muted">Data yang dihapus tidak akan tampil lagi di daftar. Pastikan kamu memang ingin menghapus item ini.</p>
      <div class="mt-6 flex gap-2">
        <button type="button" id="cancel-delete" class="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">Batal</button>
        <button type="button" id="confirm-delete" class="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700">Hapus</button>
      </div>
    `
  });

  document.querySelector("#cancel-delete").addEventListener("click", closeModal);

  document.querySelector("#confirm-delete").addEventListener("click", () => {
    if (isExpense) {
      expenses = expenses.filter(item => item.id !== id);
      saveData(STORAGE_KEYS.expenses, expenses);
      renderExpenses();
    } else {
      bookmarks = bookmarks.filter(item => item.id !== id);
      saveData(STORAGE_KEYS.bookmarks, bookmarks);
      renderBookmarks();
    }

    closeModal();
  });
}


// ============================================================
// QUIZ APP — ARRAY OF OBJECTS
// ============================================================

const quizQuestions = [
  {
    question: "Apa fungsi utama querySelector() dalam JavaScript?",
    options: ["Menyimpan data ke localStorage", "Memilih elemen HTML dari DOM", "Mengubah URL halaman", "Membuat database"],
    answer: 1
  },
  {
    question: "Method apa yang digunakan untuk mengubah array menjadi JSON string?",
    options: ["JSON.parse()", "JSON.stringify()", "Array.toJSON()", "JSON.convert()"],
    answer: 1
  },
  {
    question: "Event apa yang paling sesuai untuk menangani pengiriman form?",
    options: ["click", "hover", "submit", "load"],
    answer: 2
  },
  {
    question: "Method array mana yang digunakan untuk menyaring data berdasarkan kondisi?",
    options: ["filter()", "push()", "sort()", "findIndex()"],
    answer: 0
  },
  {
    question: "Apa fungsi localStorage.setItem()?",
    options: ["Menghapus seluruh HTML", "Menyimpan data pada browser", "Membuat array baru", "Mengubah CSS"],
    answer: 1
  }
];

let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;

const quizStart = document.querySelector("#quiz-start");
const quizGame = document.querySelector("#quiz-game");
const quizResult = document.querySelector("#quiz-result");
const startQuizButton = document.querySelector("#start-quiz");
const restartQuizButton = document.querySelector("#restart-quiz");
const quizProgress = document.querySelector("#quiz-progress");
const quizProgressBar = document.querySelector("#quiz-progress-bar");
const quizScoreElement = document.querySelector("#quiz-score");
const quizQuestion = document.querySelector("#quiz-question");
const quizOptions = document.querySelector("#quiz-options");
const quizFeedback = document.querySelector("#quiz-feedback");
const quizNext = document.querySelector("#quiz-next");
const quizFinalScore = document.querySelector("#quiz-final-score");
const startHighScore = document.querySelector("#start-high-score");
const finalHighScore = document.querySelector("#final-high-score");

function getHighScore() {
  return Number(localStorage.getItem(STORAGE_KEYS.highScore)) || 0;
}

function updateHighScoreDisplays() {
  const highScore = getHighScore();
  startHighScore.textContent = highScore;
  finalHighScore.textContent = highScore;
}

function startQuiz() {
  quizIndex = 0;
  quizScore = 0;
  quizAnswered = false;

  quizStart.classList.add("panel-hidden");
  quizResult.classList.add("panel-hidden");
  quizGame.classList.remove("panel-hidden");

  renderQuizQuestion();
}

function renderQuizQuestion() {
  const current = quizQuestions[quizIndex];
  quizAnswered = false;

  quizProgress.textContent = `Soal ${quizIndex + 1}/${quizQuestions.length}`;
  quizProgressBar.style.width = `${((quizIndex + 1) / quizQuestions.length) * 100}%`;
  quizScoreElement.textContent = `Skor: ${quizScore}`;
  quizQuestion.textContent = current.question;
  quizFeedback.textContent = "";
  quizFeedback.className = "mt-4 min-h-6 text-sm font-semibold";
  quizNext.classList.add("hidden");

  quizOptions.innerHTML = current.options.map((option, index) => `
    <button type="button" class="quiz-option w-full rounded-xl border border-slate-200 p-4 text-left text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50" data-index="${index}">
      <span class="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-extrabold text-slate-600">${String.fromCharCode(65 + index)}</span>
      ${escapeHTML(option)}
    </button>
  `).join("");
}

quizOptions.addEventListener("click", event => {
  const button = event.target.closest(".quiz-option");
  if (!button || quizAnswered) return;

  quizAnswered = true;

  const selected = Number(button.dataset.index);
  const correct = quizQuestions[quizIndex].answer;
  const buttons = quizOptions.querySelectorAll(".quiz-option");

  buttons.forEach(optionButton => {
    optionButton.disabled = true;
    optionButton.classList.add("opacity-70");
  });

  if (selected === correct) {
    quizScore += 1;
    button.classList.remove("border-slate-200", "bg-white");
    button.classList.add("border-emerald-300", "bg-emerald-50", "text-emerald-700");
    quizFeedback.textContent = "Benar! Jawaban kamu tepat.";
    quizFeedback.classList.add("text-emerald-600");
  } else {
    button.classList.remove("border-slate-200", "bg-white");
    button.classList.add("border-rose-300", "bg-rose-50", "text-rose-700");
    buttons[correct].classList.remove("border-slate-200");
    buttons[correct].classList.add("border-emerald-300", "bg-emerald-50", "text-emerald-700");
    quizFeedback.textContent = "Belum tepat. Jawaban yang benar ditandai hijau.";
    quizFeedback.classList.add("text-rose-600");
  }

  quizScoreElement.textContent = `Skor: ${quizScore}`;
  quizNext.textContent = quizIndex === quizQuestions.length - 1 ? "Lihat Hasil" : "Soal Berikutnya";
  quizNext.classList.remove("hidden");
});

quizNext.addEventListener("click", () => {
  if (quizIndex < quizQuestions.length - 1) {
    quizIndex += 1;
    renderQuizQuestion();
  } else {
    finishQuiz();
  }
});

function finishQuiz() {
  const oldHighScore = getHighScore();

  if (quizScore > oldHighScore) {
    localStorage.setItem(STORAGE_KEYS.highScore, String(quizScore));
  }

  quizGame.classList.add("panel-hidden");
  quizResult.classList.remove("panel-hidden");
  quizFinalScore.textContent = `${quizScore}/${quizQuestions.length}`;
  updateHighScoreDisplays();
}

startQuizButton.addEventListener("click", startQuiz);
restartQuizButton.addEventListener("click", startQuiz);


// ============================================================
// INITIAL RENDER
// ============================================================

setActiveTab(getActiveTab(), false);
renderExpenses();
renderBookmarks();
updateHighScoreDisplays();