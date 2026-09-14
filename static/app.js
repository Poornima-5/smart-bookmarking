// ==========================================================================
// Smart Bookmarks — Frontend Application Logic
// ==========================================================================

// ---------- DOM Elements ----------
const bannerEl = document.getElementById("banner");
const userBarEl = document.getElementById("user-bar");
const userAvatarEl = document.getElementById("user-avatar");
const userDisplayNameEl = document.getElementById("user-display-name");
const userEmailEl = document.getElementById("user-email");
const accountBtn = document.getElementById("account-btn");
const logoutBtn = document.getElementById("logout-btn");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const themeIconSun = document.getElementById("theme-icon-sun");
const themeIconMoon = document.getElementById("theme-icon-moon");

// Auth Elements
const authSection = document.getElementById("auth-section");
const authHeading = document.getElementById("auth-heading");
const authSubtext = document.getElementById("auth-subtext");
const authForm = document.getElementById("auth-form");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const confirmPasswordField = document.getElementById("confirm-password-field");
const authConfirmPasswordInput = document.getElementById("auth-confirm-password");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authToggleText = document.getElementById("auth-toggle-text");
const authToggleBtn = document.getElementById("auth-toggle-btn");

const resendConfirmationBox = document.getElementById("resend-confirmation-box");
const resendMessage = document.getElementById("resend-message");
const resendBtn = document.getElementById("resend-btn");

// App / Dashboard Elements
const appSection = document.getElementById("app-section");
const bookmarkForm = document.getElementById("bookmark-form");
const bookmarkUrlInput = document.getElementById("bookmark-url");
const bookmarkTitleInput = document.getElementById("bookmark-title");
const bookmarkDescInput = document.getElementById("bookmark-description");
const saveBtn = document.getElementById("save-btn");
const bookmarksListEl = document.getElementById("bookmarks-list");
const bookmarkCountEl = document.getElementById("bookmark-count");
const libraryToggleBtn = document.getElementById("library-toggle-btn");

// Title Suggestion Elements
const titleSuggestSpinner = document.getElementById("title-suggest-spinner");
const titleSuggestionBox = document.getElementById("title-suggestion-box");
const applyTitleBtn = document.getElementById("apply-title-btn");
const suggestionText = document.getElementById("suggestion-text");

// Library Toolbar & View Mode Elements
const viewModeAllBtn = document.getElementById("view-mode-all");
const viewModeGroupsBtn = document.getElementById("view-mode-groups");
const groupCriteriaBar = document.getElementById("group-criteria-bar");
const groupCriteriaPills = document.querySelectorAll(".group-pill");

// Stats Elements
const statTotalCount = document.getElementById("stat-total-count");
const statProcessedCount = document.getElementById("stat-processed-count");
const statReadyCount = document.getElementById("stat-ready-count");

// Search Elements
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const clearSearchBtn = document.getElementById("clear-search-btn");
const searchResultsSection = document.getElementById("search-results-section");
const searchResultsListEl = document.getElementById("search-results-list");
const searchCountEl = document.getElementById("search-count");

// Account / Drawer Elements
const profileModal = document.getElementById("profile-modal");
const closeProfileBtn = document.getElementById("close-profile-btn");
const profileBanner = document.getElementById("profile-banner");
const drawerAvatarBadge = document.getElementById("drawer-avatar-badge");
const drawerUserName = document.getElementById("drawer-user-name");
const drawerUserEmail = document.getElementById("drawer-user-email");
const drawerLogoutBtn = document.getElementById("drawer-logout-btn");
const profileForm = document.getElementById("profile-form");
const profileEmailInput = document.getElementById("profile-email");
const profileDisplayNameInput = document.getElementById("profile-display-name");
const saveProfileBtn = document.getElementById("save-profile-btn");
const passwordForm = document.getElementById("password-form");
const newPasswordInput = document.getElementById("new-password");
const confirmNewPasswordInput = document.getElementById("confirm-new-password");
const changePasswordBtn = document.getElementById("change-password-btn");

// ---------- State ----------
let supabaseClient = null;
let authMode = "login"; // "login" | "signup"
let bannerTimeoutId = null;
let profileBannerTimeoutId = null;
let lastResendEmail = "";
let currentProfile = null;
let currentBookmarks = [];
let currentViewMode = "all"; // "all" | "groups"
let currentGroupCriterion = "tags"; // "tags" | "domain" | "status"
const collapsedGroupKeys = new Set();
let lastSuggestedUrl = "";

// ==========================================================================
// 1. Theme Management (Light / Dark / System)
// ==========================================================================

function getPreferredTheme() {
  const saved = localStorage.getItem("sb_theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("sb_theme", theme);
  if (theme === "dark") {
    themeIconSun.classList.remove("hidden");
    themeIconMoon.classList.add("hidden");
  } else {
    themeIconSun.classList.add("hidden");
    themeIconMoon.classList.remove("hidden");
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

themeToggleBtn.addEventListener("click", toggleTheme);

// Initialize theme immediately
applyTheme(getPreferredTheme());

// Listen to OS theme changes if user hasn't explicitly set one
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  if (!localStorage.getItem("sb_theme")) {
    applyTheme(e.matches ? "dark" : "light");
  }
});

// ==========================================================================
// 2. Helpers & Utilities
// ==========================================================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function extractDomain(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, "");
  } catch (_) {
    return "";
  }
}

function getInitials(name, email) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim()[0].toUpperCase();
  }
  return "U";
}

// ---------- Password Visibility Toggles ----------

document.querySelectorAll(".password-toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;

    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";

    btn.innerHTML = isPassword
      ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
           <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
           <line x1="1" y1="1" x2="23" y2="23" />
         </svg>`
      : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
           <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
           <circle cx="12" cy="12" r="3" />
         </svg>`;
  });
});

// ---------- Global Keyboard Shortcut (Ctrl+K to focus search) ----------

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    // Only intercept if user is logged in
    if (!appSection.classList.contains("hidden")) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  }
});

// ==========================================================================
// 3. Feedback Banners
// ==========================================================================

function showBanner(message, kind = "info") {
  bannerEl.textContent = message;
  bannerEl.className = `banner ${kind}`;
  bannerEl.classList.remove("hidden");

  if (bannerTimeoutId) clearTimeout(bannerTimeoutId);
  if (kind === "success" || kind === "info") {
    bannerTimeoutId = setTimeout(clearBanner, 5000);
  }
}

function clearBanner() {
  bannerEl.classList.add("hidden");
  if (bannerTimeoutId) {
    clearTimeout(bannerTimeoutId);
    bannerTimeoutId = null;
  }
}

function showProfileBanner(message, kind = "info") {
  profileBanner.textContent = message;
  profileBanner.className = `banner ${kind}`;
  profileBanner.classList.remove("hidden");

  if (profileBannerTimeoutId) clearTimeout(profileBannerTimeoutId);
  if (kind === "success" || kind === "info") {
    profileBannerTimeoutId = setTimeout(clearProfileBanner, 4000);
  }
}

function clearProfileBanner() {
  profileBanner.classList.add("hidden");
  if (profileBannerTimeoutId) {
    clearTimeout(profileBannerTimeoutId);
    profileBannerTimeoutId = null;
  }
}

// ==========================================================================
// 4. API Fetch Helper
// ==========================================================================

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
      if (Array.isArray(body.detail)) {
        detail = body.detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
      } else if (body.detail) {
        detail = body.detail;
      }
    } catch (_) {
      /* non-JSON response */
    }
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

// ==========================================================================
// 5. View Toggling & Session Lifecycle
// ==========================================================================

async function setLoggedInView(user) {
  const email = user.email || "";
  userEmailEl.textContent = email;
  drawerUserEmail.textContent = email;

  userBarEl.classList.remove("hidden");
  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");
  hideResendBox();

  await loadProfile(user);
}

function setLoggedOutView() {
  userBarEl.classList.add("hidden");
  authSection.classList.remove("hidden");
  appSection.classList.add("hidden");

  // Purge all user data from memory & DOM
  bookmarksListEl.innerHTML = "";
  bookmarkCountEl.classList.add("hidden");
  userDisplayNameEl.textContent = "";
  userEmailEl.textContent = "";
  userAvatarEl.textContent = "U";
  drawerAvatarBadge.textContent = "U";
  drawerUserName.textContent = "User";
  drawerUserEmail.textContent = "";
  currentProfile = null;
  currentBookmarks = [];

  // Reset metrics
  if (statTotalCount) statTotalCount.textContent = "0";
  if (statProcessedCount) statProcessedCount.textContent = "0";
  if (statReadyCount) statReadyCount.textContent = "0";

  clearSearchUI();
  closeProfileModal();
  hideResendBox();
  hideTitleSuggestion();
  setViewMode("all");
}

// ==========================================================================
// 6. Resend Confirmation Email UI
// ==========================================================================

function showResendBox(email, message) {
  lastResendEmail = email;
  resendMessage.textContent = message;
  resendConfirmationBox.classList.remove("hidden");
}

function hideResendBox() {
  resendConfirmationBox.classList.add("hidden");
  lastResendEmail = "";
}

resendBtn.addEventListener("click", async () => {
  if (!lastResendEmail) return;

  resendBtn.disabled = true;
  const originalText = resendBtn.textContent;
  resendBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Sending...';

  try {
    const { error } = await supabaseClient.auth.resend({
      type: "signup",
      email: lastResendEmail,
    });
    if (error) throw error;

    showBanner("Confirmation email sent! Please check your inbox or spam folder.", "success");
    resendMessage.textContent = `A fresh verification link was sent to ${lastResendEmail}.`;
  } catch (err) {
    showBanner(`Failed to resend confirmation email: ${err.message}`, "error");
  } finally {
    resendBtn.disabled = false;
    resendBtn.textContent = originalText;
  }
});

// ==========================================================================
// 7. Auth Mode (Login / Signup)
// ==========================================================================

function setAuthMode(mode) {
  authMode = mode;
  clearBanner();
  hideResendBox();

  if (mode === "signup") {
    authHeading.textContent = "Create your account";
    authSubtext.textContent = "Start saving and retrieving your technical knowledge.";
    authSubmitBtn.textContent = "Sign up";
    authToggleText.textContent = "Already have an account?";
    authToggleBtn.textContent = "Log in";
    confirmPasswordField.classList.remove("hidden");
    authConfirmPasswordInput.required = true;
  } else {
    authHeading.textContent = "Welcome back";
    authSubtext.textContent = "Log in to access your saved technical resources.";
    authSubmitBtn.textContent = "Log in";
    authToggleText.textContent = "Don't have an account?";
    authToggleBtn.textContent = "Sign up";
    confirmPasswordField.classList.add("hidden");
    authConfirmPasswordInput.required = false;
    authConfirmPasswordInput.value = "";
  }
}

authToggleBtn.addEventListener("click", () => {
  setAuthMode(authMode === "login" ? "signup" : "login");
});

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
  hideResendBox();

  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;

  if (!email || !isValidEmail(email)) {
    showBanner("Please enter a valid email address.", "error");
    authEmailInput.focus();
    return;
  }

  if (!password) {
    showBanner("Please enter your password.", "error");
    authPasswordInput.focus();
    return;
  }

  authSubmitBtn.disabled = true;
  authSubmitBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Logging in...';

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (err) {
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("email not confirmed")) {
      showBanner(
        "Your email address has not been confirmed yet. Please verify your email before logging in.",
        "error"
      );
      showResendBox(
        email,
        `Your account (${email}) is waiting for email confirmation. Click below to receive a new verification link.`
      );
    } else if (msg.includes("invalid login credentials")) {
      showBanner("Invalid email or password. Please verify your credentials and try again.", "error");
    } else {
      showBanner(`Log in failed: ${err.message || "Please check your credentials."}`, "error");
    }
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = "Log in";
  }
}

async function handleSignup() {
  clearBanner();
  hideResendBox();

  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  const confirmPassword = authConfirmPasswordInput.value;

  if (!email || !isValidEmail(email)) {
    showBanner("Please enter a valid email address (e.g. name@example.com).", "error");
    authEmailInput.focus();
    return;
  }

  if (!password || password.length < 6) {
    showBanner("Password must be at least 6 characters long.", "error");
    authPasswordInput.focus();
    return;
  }

  if (password !== confirmPassword) {
    showBanner("Passwords do not match. Please re-enter your password confirmation.", "error");
    authConfirmPasswordInput.focus();
    return;
  }

  authSubmitBtn.disabled = true;
  authSubmitBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Signing up...';

  try {
    // Only send email and password to Supabase. Never transmit confirmPassword.
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;

    if (data.session) {
      showBanner("Account created and logged in!", "success");
    } else {
      showBanner(
        "Account created! Please check your email inbox to verify your account before logging in.",
        "info"
      );
      showResendBox(
        email,
        `A verification email was sent to ${email}. Check your inbox or spam folder, or click below for a fresh link.`
      );
      setAuthMode("login");
    }
  } catch (err) {
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("already registered") || msg.includes("already in use")) {
      showBanner("An account with this email already exists. Please log in instead.", "error");
      setAuthMode("login");
    } else {
      showBanner(`Sign up failed: ${err.message}`, "error");
    }
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = authMode === "signup" ? "Sign up" : "Log in";
  }
}

async function handleLogout() {
  logoutBtn.disabled = true;
  if (drawerLogoutBtn) drawerLogoutBtn.disabled = true;
  try {
    await supabaseClient.auth.signOut();
  } finally {
    logoutBtn.disabled = false;
    if (drawerLogoutBtn) drawerLogoutBtn.disabled = false;
  }
}

logoutBtn.addEventListener("click", handleLogout);
if (drawerLogoutBtn) drawerLogoutBtn.addEventListener("click", handleLogout);

// ==========================================================================
// 8. Bookmarks & Dashboard Rendering
// ==========================================================================

let isLibraryCollapsed = localStorage.getItem("sb_library_collapsed") === "true";

function setLibraryCollapsed(collapsed) {
  isLibraryCollapsed = collapsed;
  localStorage.setItem("sb_library_collapsed", collapsed ? "true" : "false");
  if (libraryToggleBtn) {
    libraryToggleBtn.setAttribute("aria-expanded", !collapsed);
    if (collapsed) {
      libraryToggleBtn.classList.add("collapsed");
    } else {
      libraryToggleBtn.classList.remove("collapsed");
    }
  }
  if (bookmarksListEl) {
    if (collapsed) {
      bookmarksListEl.classList.add("library-collapsed");
    } else {
      bookmarksListEl.classList.remove("library-collapsed");
    }
  }
}

if (libraryToggleBtn) {
  libraryToggleBtn.addEventListener("click", () => {
    setLibraryCollapsed(!isLibraryCollapsed);
  });
}

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

function updateDashboardStats(bookmarks) {
  if (!statTotalCount || !statProcessedCount || !statReadyCount) return;
  const total = bookmarks.length;
  const processed = bookmarks.filter((b) => b.status === "completed").length;
  const inQueue = bookmarks.filter(
    (b) => b.status === "pending" || b.status === "processing"
  ).length;

  statTotalCount.textContent = total;
  statProcessedCount.textContent = processed;
  statReadyCount.textContent = inQueue;
}

function renderEmptyState() {
  bookmarksListEl.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </span>
      <h3>No bookmarks yet</h3>
      <p>Save your first technical article or documentation link using the form on the left.</p>
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

function createBookmarkCardElement(bm) {
  const card = document.createElement("article");
  card.className = "bookmark-card";
  card.dataset.id = bm.id;
  if (bm.category) card.dataset.category = bm.category;
  card.dataset.status = bm.status;

  const domain = extractDomain(bm.url);
  const domainHtml = domain
    ? `<span class="card-domain-badge">${escapeHtml(domain)}</span>`
    : "";

  const tagsHtml =
    bm.tags && bm.tags.length
      ? `<div class="tags-row">${bm.tags
          .map((t) => `<span class="tag-pill">#${escapeHtml(t)}</span>`)
          .join("")}</div>`
      : "";

  card.innerHTML = `
    <div class="card-top-meta">
      ${domainHtml}
      <span class="status-pill ${statusPillClass(bm.status)}">${escapeHtml(bm.status)}</span>
    </div>
    <h3 class="bookmark-title">
      <a href="${escapeHtml(bm.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(bm.title)}</a>
    </h3>
    <a class="bookmark-url" href="${escapeHtml(bm.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(bm.url)}">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      ${escapeHtml(bm.url)}
    </a>
    ${bm.summary ? `<p class="bookmark-desc">${escapeHtml(bm.summary)}</p>` : bm.description ? `<p class="bookmark-desc">${escapeHtml(bm.description)}</p>` : ""}
    ${tagsHtml}
    <div class="bookmark-card-footer">
      <span class="field-help">${bm.category ? escapeHtml(bm.category) : "Technical resource"}</span>
      <div class="card-actions">
        <button type="button" class="btn btn-danger-outline btn-sm delete-btn" data-id="${bm.id}">
          Delete
        </button>
      </div>
    </div>
  `;
  return card;
}

// ---------- Auto Title Suggestion ----------

function debounce(fn, delayMs) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delayMs);
  };
}

function hideTitleSuggestion() {
  if (titleSuggestionBox) titleSuggestionBox.classList.add("hidden");
  if (titleSuggestSpinner) titleSuggestSpinner.classList.add("hidden");
}

function applyTitleSuggestion() {
  if (!suggestionText) return;
  const suggested = suggestionText.textContent.trim();
  if (suggested) {
    bookmarkTitleInput.value = suggested;
    bookmarkTitleInput.focus();
    bookmarkTitleInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
  hideTitleSuggestion();
}

async function checkTitleSuggestion() {
  const url = bookmarkUrlInput.value.trim();
  const currentTitle = bookmarkTitleInput.value.trim();

  // If user already entered a title, never replace it or show suggestion
  if (currentTitle) {
    hideTitleSuggestion();
    return;
  }

  // Check URL validity
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    hideTitleSuggestion();
    return;
  }

  // Avoid duplicate fetch for same URL if already suggested
  if (url === lastSuggestedUrl && titleSuggestionBox && !titleSuggestionBox.classList.contains("hidden")) {
    return;
  }

  lastSuggestedUrl = url;
  if (titleSuggestSpinner) titleSuggestSpinner.classList.remove("hidden");

  try {
    const data = await apiFetch(`/bookmarks/suggest-title?url=${encodeURIComponent(url)}`);
    // Verify title input is STILL empty when response returns
    if (data && data.title && !bookmarkTitleInput.value.trim()) {
      suggestionText.textContent = data.title;
      titleSuggestionBox.classList.remove("hidden");
    } else {
      hideTitleSuggestion();
    }
  } catch (err) {
    // Graceful failure: leave title blank and editable
    hideTitleSuggestion();
  } finally {
    if (titleSuggestSpinner) titleSuggestSpinner.classList.add("hidden");
  }
}

if (bookmarkUrlInput) {
  bookmarkUrlInput.addEventListener("blur", checkTitleSuggestion);
  bookmarkUrlInput.addEventListener("input", debounce(checkTitleSuggestion, 650));
}

if (bookmarkTitleInput) {
  // If user types into title, hide any pending suggestion immediately
  bookmarkTitleInput.addEventListener("input", () => {
    if (bookmarkTitleInput.value.trim()) {
      hideTitleSuggestion();
    }
  });
}

if (applyTitleBtn) {
  applyTitleBtn.addEventListener("click", applyTitleSuggestion);
}

// ---------- Library Grouping & Rendering ----------

function attachBookmarkCardListeners() {
  bookmarksListEl.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteBookmark(btn.dataset.id, btn));
  });
}

function renderFlatBookmarks(bookmarks) {
  bookmarksListEl.innerHTML = "";
  for (const bm of bookmarks) {
    bookmarksListEl.appendChild(createBookmarkCardElement(bm));
  }
  attachBookmarkCardListeners();
}

function renderGroupedBookmarks(bookmarks, criterion = "tags") {
  bookmarksListEl.innerHTML = "";
  const groupsMap = new Map();

  if (criterion === "tags") {
    const untagged = [];
    for (const bm of bookmarks) {
      if (bm.tags && bm.tags.length > 0) {
        for (const tag of bm.tags) {
          const normTag = tag.trim().toLowerCase();
          if (!normTag) continue;
          if (!groupsMap.has(normTag)) {
            groupsMap.set(normTag, {
              key: `tag-${normTag}`,
              title: `#${normTag}`,
              icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
              items: [],
            });
          }
          groupsMap.get(normTag).items.push(bm);
        }
      } else {
        untagged.push(bm);
      }
    }
    if (untagged.length > 0) {
      groupsMap.set("_untagged", {
        key: "untagged",
        title: "Untagged Resources",
        icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
        items: untagged,
      });
    }
  } else if (criterion === "domain") {
    for (const bm of bookmarks) {
      const domain = extractDomain(bm.url) || "Other Links";
      if (!groupsMap.has(domain)) {
        groupsMap.set(domain, {
          key: `domain-${domain}`,
          title: domain,
          icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
          items: [],
        });
      }
      groupsMap.get(domain).items.push(bm);
    }
  } else if (criterion === "status") {
    const statusLabels = {
      completed: "Completed & Indexed",
      processing: "AI Processing in Progress",
      pending: "Queued for Processing",
      failed: "Failed Processing",
    };
    for (const bm of bookmarks) {
      const st = bm.status || "pending";
      if (!groupsMap.has(st)) {
        groupsMap.set(st, {
          key: `status-${st}`,
          title: statusLabels[st] || st,
          icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
          items: [],
        });
      }
      groupsMap.get(st).items.push(bm);
    }
  }

  // Sort groups alphabetically, but keep untagged at bottom
  const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => {
    if (a.key === "untagged") return 1;
    if (b.key === "untagged") return -1;
    return a.title.localeCompare(b.title);
  });

  for (const group of sortedGroups) {
    const isCollapsed = collapsedGroupKeys.has(group.key);
    const groupEl = document.createElement("div");
    groupEl.className = `bookmark-group ${isCollapsed ? "collapsed" : ""}`;
    groupEl.dataset.groupKey = group.key;

    groupEl.innerHTML = `
      <button type="button" class="group-header" aria-expanded="${!isCollapsed}" aria-label="Toggle ${escapeHtml(group.title)} group">
        <div class="group-header-left">
          <span class="group-icon">${group.icon}</span>
          <span class="group-title">${escapeHtml(group.title)}</span>
          <span class="group-count-badge">${group.items.length} ${group.items.length === 1 ? "item" : "items"}</span>
        </div>
        <span class="group-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      <div class="group-items"></div>
    `;

    const itemsContainer = groupEl.querySelector(".group-items");
    for (const bm of group.items) {
      itemsContainer.appendChild(createBookmarkCardElement(bm));
    }

    const headerBtn = groupEl.querySelector(".group-header");
    headerBtn.addEventListener("click", () => {
      const nowCollapsed = groupEl.classList.toggle("collapsed");
      headerBtn.setAttribute("aria-expanded", String(!nowCollapsed));
      if (nowCollapsed) {
        collapsedGroupKeys.add(group.key);
      } else {
        collapsedGroupKeys.delete(group.key);
      }
    });

    bookmarksListEl.appendChild(groupEl);
  }

  attachBookmarkCardListeners();
}

function setViewMode(mode) {
  currentViewMode = mode;
  if (mode === "groups") {
    viewModeAllBtn.classList.remove("active");
    viewModeAllBtn.setAttribute("aria-selected", "false");
    viewModeGroupsBtn.classList.add("active");
    viewModeGroupsBtn.setAttribute("aria-selected", "true");
    groupCriteriaBar.classList.remove("hidden");
  } else {
    viewModeAllBtn.classList.add("active");
    viewModeAllBtn.setAttribute("aria-selected", "true");
    viewModeGroupsBtn.classList.remove("active");
    viewModeGroupsBtn.setAttribute("aria-selected", "false");
    groupCriteriaBar.classList.add("hidden");
  }
  renderBookmarks(currentBookmarks);
}

if (viewModeAllBtn) viewModeAllBtn.addEventListener("click", () => setViewMode("all"));
if (viewModeGroupsBtn) viewModeGroupsBtn.addEventListener("click", () => setViewMode("groups"));

if (groupCriteriaPills) {
  groupCriteriaPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      groupCriteriaPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      currentGroupCriterion = pill.dataset.criterion;
      renderBookmarks(currentBookmarks);
    });
  });
}

function renderBookmarks(bookmarks) {
  currentBookmarks = bookmarks;
  updateDashboardStats(bookmarks);

  if (!bookmarks.length) {
    renderEmptyState();
    bookmarkCountEl.classList.add("hidden");
    return;
  }

  bookmarkCountEl.textContent = `${bookmarks.length} resource${bookmarks.length === 1 ? "" : "s"}`;
  bookmarkCountEl.classList.remove("hidden");

  if (currentViewMode === "groups") {
    renderGroupedBookmarks(bookmarks, currentGroupCriterion);
  } else {
    renderFlatBookmarks(bookmarks);
  }
}

async function loadBookmarks() {
  renderLoadingState();
  try {
    const bookmarks = await apiFetch("/bookmarks");
    renderBookmarks(bookmarks);
  } catch (err) {
    bookmarksListEl.innerHTML = `
      <div class="state-message">
        <p>Couldn't load your library. Please try refreshing.</p>
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

// ---------- Add Bookmark Form ----------

bookmarkForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearBanner();
  hideTitleSuggestion();
  lastSuggestedUrl = "";
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Saving...';

  const url = bookmarkUrlInput.value.trim();
  const title = bookmarkTitleInput.value.trim();
  const description = bookmarkDescInput.value.trim();

  try {
    await apiFetch("/bookmarks", {
      method: "POST",
      body: JSON.stringify({ url, title, description }),
    });
    showBanner("Bookmark saved! AI processing has started.", "success");
    bookmarkForm.reset();
    hideTitleSuggestion();
    lastSuggestedUrl = "";
    await loadBookmarks();
  } catch (err) {
    if (err.status === 409) {
      showBanner("You have already saved this URL.", "error");
    } else {
      showBanner(`Failed to save bookmark: ${err.message}`, "error");
    }
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save bookmark";
  }
});

// ==========================================================================
// 9. Semantic Search Experience
// ==========================================================================

function clearSearchUI() {
  searchInput.value = "";
  searchResultsListEl.innerHTML = "";
  searchResultsSection.classList.add("hidden");
  searchCountEl.classList.add("hidden");
  searchCountEl.textContent = "";
}

function renderSearchResults(results, query) {
  if (!results || !results.length) {
    searchCountEl.classList.add("hidden");
    searchResultsListEl.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <h3>No matching bookmarks</h3>
        <p>No bookmarks closely matched &ldquo;${escapeHtml(query)}&rdquo;. Try broader terms or describing the concept differently.</p>
      </div>
    `;
    return;
  }

  searchCountEl.textContent = `${results.length} match${results.length === 1 ? "" : "es"}`;
  searchCountEl.classList.remove("hidden");

  searchResultsListEl.innerHTML = "";
  for (const item of results) {
    const card = document.createElement("article");
    card.className = "bookmark-card search-result-card";

    const scorePct = Math.round(Number(item.score) * 100);
    const scoreFormatted = Number(item.score).toFixed(3);
    const domain = extractDomain(item.url);
    const domainHtml = domain
      ? `<span class="card-domain-badge">${escapeHtml(domain)}</span>`
      : "";

    const tagsHtml =
      item.tags && item.tags.length
        ? `<div class="tags-row">${item.tags
            .map((t) => `<span class="tag-pill">#${escapeHtml(t)}</span>`)
            .join("")}</div>`
        : "";

    card.innerHTML = `
      <div class="card-top-meta">
        ${domainHtml}
        <span class="score-pill" title="Similarity score: ${scoreFormatted}">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          ${scorePct}% match
        </span>
      </div>
      <h3 class="bookmark-title">
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
      </h3>
      <a class="bookmark-url" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(item.url)}">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        ${escapeHtml(item.url)}
      </a>
      ${item.summary ? `<p class="bookmark-desc">${escapeHtml(item.summary)}</p>` : ""}
      ${tagsHtml}
    `;
    searchResultsListEl.appendChild(card);
  }
}

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearBanner();

  const query = searchInput.value.trim();
  if (!query) {
    showBanner("Please enter a search query.", "info");
    return;
  }

  searchBtn.disabled = true;
  searchBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Searching...';

  searchResultsSection.classList.remove("hidden");
  searchResultsListEl.innerHTML = `
    <div class="state-message">
      <p><span class="spinner" aria-hidden="true"></span>Searching your knowledge base...</p>
    </div>
  `;

  try {
    const results = await apiFetch("/bookmarks/search", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
    renderSearchResults(results, query);
  } catch (err) {
    if (err.status === 401) {
      showBanner("Your session has expired. Please log in again.", "error");
      setLoggedOutView();
    } else if (err.status === 422) {
      showBanner(`Search error: ${err.message}`, "error");
      searchResultsListEl.innerHTML = `
        <div class="state-message">
          <p>Invalid search query. Please refine your query.</p>
        </div>
      `;
    } else {
      showBanner(`Search failed: ${err.message}`, "error");
      searchResultsListEl.innerHTML = `
        <div class="state-message">
          <p>Failed to retrieve search results. Please try again.</p>
        </div>
      `;
    }
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = "Search";
  }
});

clearSearchBtn.addEventListener("click", () => {
  clearSearchUI();
  clearBanner();
  searchInput.focus();
});

// ==========================================================================
// 10. Profile & Account Slide-Over Drawer
// ==========================================================================

async function loadProfile(user) {
  try {
    const profile = await apiFetch("/profile");
    if (profile) {
      currentProfile = profile;
      const name = profile.display_name || (user ? user.email.split("@")[0] : "User");
      const email = profile.email || (user ? user.email : "");

      userDisplayNameEl.textContent = name;
      drawerUserName.textContent = name;
      drawerUserEmail.textContent = email;

      const initials = getInitials(name, email);
      userAvatarEl.textContent = initials;
      drawerAvatarBadge.textContent = initials;

      profileDisplayNameInput.value = profile.display_name || "";
      profileEmailInput.value = email;
    }
  } catch (err) {
    if (user && user.email) {
      const fallbackName = user.email.split("@")[0];
      userDisplayNameEl.textContent = fallbackName;
      drawerUserName.textContent = fallbackName;
      drawerUserEmail.textContent = user.email;
      profileEmailInput.value = user.email;
      const initials = getInitials(fallbackName, user.email);
      userAvatarEl.textContent = initials;
      drawerAvatarBadge.textContent = initials;
    }
  }
}

function openProfileModal() {
  clearProfileBanner();
  if (currentProfile) {
    profileDisplayNameInput.value = currentProfile.display_name || "";
    profileEmailInput.value = currentProfile.email || userEmailEl.textContent || "";
  }
  newPasswordInput.value = "";
  confirmNewPasswordInput.value = "";
  profileModal.classList.remove("hidden");
  profileDisplayNameInput.focus();
}

function closeProfileModal() {
  profileModal.classList.add("hidden");
  clearProfileBanner();
}

accountBtn.addEventListener("click", openProfileModal);
closeProfileBtn.addEventListener("click", closeProfileModal);

profileModal.addEventListener("click", (e) => {
  if (e.target === profileModal) {
    closeProfileModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !profileModal.classList.contains("hidden")) {
    closeProfileModal();
  }
});

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearProfileBanner();

  const displayName = profileDisplayNameInput.value.trim();
  if (!displayName) {
    showProfileBanner("Display name cannot be blank.", "error");
    return;
  }
  if (displayName.length > 50) {
    showProfileBanner("Display name must not exceed 50 characters.", "error");
    return;
  }

  saveProfileBtn.disabled = true;
  saveProfileBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Saving...';

  try {
    const updated = await apiFetch("/profile", {
      method: "PUT",
      body: JSON.stringify({ display_name: displayName }),
    });
    currentProfile = updated;
    const name = updated.display_name || displayName;
    userDisplayNameEl.textContent = name;
    drawerUserName.textContent = name;
    const initials = getInitials(name, profileEmailInput.value);
    userAvatarEl.textContent = initials;
    drawerAvatarBadge.textContent = initials;

    showProfileBanner("Display name saved successfully.", "success");
  } catch (err) {
    showProfileBanner(`Failed to update profile: ${err.message}`, "error");
  } finally {
    saveProfileBtn.disabled = false;
    saveProfileBtn.textContent = "Save display name";
  }
});

passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearProfileBanner();

  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmNewPasswordInput.value;

  if (!newPassword || newPassword.length < 6) {
    showProfileBanner("New password must be at least 6 characters long.", "error");
    newPasswordInput.focus();
    return;
  }

  if (newPassword !== confirmPassword) {
    showProfileBanner("New passwords do not match. Please re-enter.", "error");
    confirmNewPasswordInput.focus();
    return;
  }

  changePasswordBtn.disabled = true;
  changePasswordBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Updating...';

  try {
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) throw error;

    showProfileBanner("Password updated successfully!", "success");
    newPasswordInput.value = "";
    confirmNewPasswordInput.value = "";
  } catch (err) {
    showProfileBanner(`Password update failed: ${err.message}`, "error");
  } finally {
    changePasswordBtn.disabled = false;
    changePasswordBtn.textContent = "Update password";
  }
});

// ==========================================================================
// 11. Application Initialization & Auth Bootstrap
// ==========================================================================

async function init() {
  setLibraryCollapsed(isLibraryCollapsed);
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
