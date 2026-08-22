const bannerEl = document.getElementById("banner");
const userBarEl = document.getElementById("user-bar");
const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");

const authSection = document.getElementById("auth-section");
const authHeading = document.getElementById("auth-heading");
const authSubtext = document.getElementById("auth-subtext");
const authForm = document.getElementById("auth-form");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authToggleText = document.getElementById("auth-toggle-text");
const authToggleBtn = document.getElementById("auth-toggle-btn");

const appSection = document.getElementById("app-section");
const bookmarkForm = document.getElementById("bookmark-form");
const saveBtn = document.getElementById("save-btn");
const bookmarksListEl = document.getElementById("bookmarks-list");
const bookmarkCountEl = document.getElementById("bookmark-count");

let supabaseClient = null;
let authMode = "login"; // "login" | "signup"
let bannerTimeoutId = null;

// ---------- Banner ----------

function showBanner(message, kind = "info") {
  bannerEl.textContent = message;
  bannerEl.className = `banner ${kind}`;
  bannerEl.classList.remove("hidden");

  if (bannerTimeoutId) clearTimeout(bannerTimeoutId);
  if (kind === "success" || kind === "info") {
    bannerTimeoutId = setTimeout(clearBanner, 4000);
  }
}

function clearBanner() {
  bannerEl.classList.add("hidden");
  if (bannerTimeoutId) {
    clearTimeout(bannerTimeoutId);
    bannerTimeoutId = null;
  }
}

// ---------- API helper ----------

async function getAccessToken() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session ? data.session.access_token : null;
}

async function apiFetch(path, options = {}) {
  const token = await getAccessToken();
  const headers = Object.assign(
    { "Content-Type": "application/json" },
    options.headers || {}
  );
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch (_) {
      /* no JSON body */
    }
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

// ---------- View toggling ----------

function setLoggedInView(user) {
  userEmailEl.textContent = user.email;
  userBarEl.classList.remove("hidden");
  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");
}

function setLoggedOutView() {
  userBarEl.classList.add("hidden");
  authSection.classList.remove("hidden");
  appSection.classList.add("hidden");
  bookmarksListEl.innerHTML = "";
  bookmarkCountEl.classList.add("hidden");
}

// ---------- Auth mode (login / signup) ----------

function setAuthMode(mode) {
  authMode = mode;
  clearBanner();

  if (mode === "signup") {
    authHeading.textContent = "Create your account";
    authSubtext.textContent = "Start saving the resources you don't want to lose.";
    authSubmitBtn.textContent = "Sign up";
    authToggleText.textContent = "Already have an account?";
    authToggleBtn.textContent = "Log in";
  } else {
    authHeading.textContent = "Welcome back";
    authSubtext.textContent = "Log in to access your saved technical resources.";
    authSubmitBtn.textContent = "Log in";
    authToggleText.textContent = "Don't have an account?";
    authToggleBtn.textContent = "Sign up";
  }
}

authToggleBtn.addEventListener("click", () => {
  setAuthMode(authMode === "login" ? "signup" : "login");
});

// ---------- Bookmarks rendering ----------

function statusPillClass(status) {
  switch (status) {
    case "completed":
      return "status-completed";
    case "failed":
      return "status-failed";
    case "processing":
      return "status-processing";
    default:
      return "status-pending";
  }
}

function renderEmptyState() {
  bookmarksListEl.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
        </svg>
      </span>
      <h3>No bookmarks yet</h3>
      <p>Save your first resource using the form to get started.</p>
    </div>
  `;
}

function renderLoadingState() {
  bookmarksListEl.innerHTML = `
    <div class="state-message">
      <p><span class="spinner" aria-hidden="true"></span>Loading your bookmarks...</p>
    </div>
  `;
}

function renderBookmarks(bookmarks) {
  if (!bookmarks.length) {
    renderEmptyState();
    bookmarkCountEl.classList.add("hidden");
    return;
  }

  bookmarkCountEl.textContent = `${bookmarks.length} saved`;
  bookmarkCountEl.classList.remove("hidden");

  bookmarksListEl.innerHTML = "";
  for (const bm of bookmarks) {
    const card = document.createElement("article");
    card.className = "bookmark-card";
    card.innerHTML = `
      <h3 class="bookmark-title">${escapeHtml(bm.title)}</h3>
      <a class="bookmark-url" href="${escapeHtml(bm.url)}" target="_blank"
         rel="noopener noreferrer" title="${escapeHtml(bm.url)}">${escapeHtml(bm.url)}</a>
      ${bm.description ? `<p class="bookmark-desc">${escapeHtml(bm.description)}</p>` : ""}
      <div class="bookmark-card-footer">
        <span class="status-pill ${statusPillClass(bm.status)}">${escapeHtml(bm.status)}</span>
        <button type="button" class="btn btn-danger-outline btn-sm delete-btn" data-id="${bm.id}">
          Delete
        </button>
      </div>
    `;
    bookmarksListEl.appendChild(card);
  }

  bookmarksListEl.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteBookmark(btn.dataset.id, btn));
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

async function loadBookmarks() {
  renderLoadingState();
  try {
    const bookmarks = await apiFetch("/bookmarks");
    renderBookmarks(bookmarks);
  } catch (err) {
    bookmarksListEl.innerHTML = `
      <div class="state-message">
        <p>Couldn't load your bookmarks. Please try refreshing the page.</p>
      </div>
    `;
    showBanner(`Failed to load bookmarks: ${err.message}`, "error");
  }
}

async function deleteBookmark(id, buttonEl) {
  const originalText = buttonEl.textContent;
  buttonEl.disabled = true;
  buttonEl.textContent = "Deleting...";

  try {
    await apiFetch(`/bookmarks/${id}`, { method: "DELETE" });
    showBanner("Bookmark deleted.", "success");
    await loadBookmarks();
  } catch (err) {
    showBanner(`Failed to delete bookmark: ${err.message}`, "error");
    buttonEl.disabled = false;
    buttonEl.textContent = originalText;
  }
}

// ---------- Add bookmark ----------

bookmarkForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearBanner();
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Saving...';

  const url = document.getElementById("bookmark-url").value.trim();
  const title = document.getElementById("bookmark-title").value.trim();
  const description = document.getElementById("bookmark-description").value.trim();

  try {
    await apiFetch("/bookmarks", {
      method: "POST",
      body: JSON.stringify({ url, title, description }),
    });
    showBanner("Bookmark saved.", "success");
    bookmarkForm.reset();
    await loadBookmarks();
  } catch (err) {
    if (err.status === 409) {
      showBanner("You already saved this URL.", "error");
    } else {
      showBanner(`Failed to save bookmark: ${err.message}`, "error");
    }
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save bookmark";
  }
});

// ---------- Auth ----------

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (authMode === "signup") {
    await handleSignup();
  } else {
    await handleLogin();
  }
});

async function handleLogin() {
  clearBanner();
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  authSubmitBtn.disabled = true;
  authSubmitBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Logging in...';

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (err) {
    showBanner(`Log in failed: ${err.message}`, "error");
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = "Log in";
  }
}

async function handleSignup() {
  clearBanner();
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  authSubmitBtn.disabled = true;
  authSubmitBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Signing up...';

  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;

    if (data.session) {
      showBanner("Account created and logged in.", "success");
    } else {
      showBanner("Account created. Check your email to confirm, then log in.", "info");
      setAuthMode("login");
    }
  } catch (err) {
    showBanner(`Sign up failed: ${err.message}`, "error");
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = authMode === "signup" ? "Sign up" : "Log in";
  }
}

logoutBtn.addEventListener("click", async () => {
  logoutBtn.disabled = true;
  try {
    await supabaseClient.auth.signOut();
  } finally {
    logoutBtn.disabled = false;
  }
});

// ---------- Bootstrap ----------

async function init() {
  try {
    const config = await fetch("/config").then((r) => r.json());
    supabaseClient = window.supabase.createClient(
      config.supabase_url,
      config.supabase_publishable_key
    );
  } catch (err) {
    showBanner("Failed to load app configuration. Is the backend running?", "error");
    return;
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session && session.user) {
      setLoggedInView(session.user);
      loadBookmarks();
    } else {
      setLoggedOutView();
    }
  });

  const { data } = await supabaseClient.auth.getSession();
  if (data.session && data.session.user) {
    setLoggedInView(data.session.user);
    loadBookmarks();
  } else {
    setLoggedOutView();
  }
}

init();
