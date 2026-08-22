const bannerEl = document.getElementById("banner");
const userBarEl = document.getElementById("user-bar");
const userEmailEl = document.getElementById("user-email");
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const authForm = document.getElementById("auth-form");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const bookmarkForm = document.getElementById("bookmark-form");
const saveBtn = document.getElementById("save-btn");
const bookmarksListEl = document.getElementById("bookmarks-list");
const searchForm = document.getElementById("search-form");
const searchResultsEl = document.getElementById("search-results");

let supabaseClient = null;

function showBanner(message, kind = "info") {
  bannerEl.textContent = message;
  bannerEl.className = `banner ${kind}`;
  bannerEl.classList.remove("hidden");
}

function clearBanner() {
  bannerEl.classList.add("hidden");
}

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
}

function renderBookmarks(bookmarks) {
  if (!bookmarks.length) {
    bookmarksListEl.innerHTML = '<p class="muted">No bookmarks yet. Add one above.</p>';
    return;
  }

  bookmarksListEl.innerHTML = "";
  for (const bm of bookmarks) {
    const card = document.createElement("div");
    card.className = "bookmark-card";
    card.innerHTML = `
      <h3>${escapeHtml(bm.title)}</h3>
      <a href="${escapeHtml(bm.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(bm.url)}</a>
      ${bm.description ? `<p>${escapeHtml(bm.description)}</p>` : ""}
      <div class="bookmark-meta">
        <span class="status-pill">${escapeHtml(bm.status)}</span>
        <button class="delete-btn" data-id="${bm.id}">Delete</button>
      </div>
    `;
    bookmarksListEl.appendChild(card);
  }

  bookmarksListEl.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteBookmark(btn.dataset.id));
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

async function loadBookmarks() {
  bookmarksListEl.innerHTML = '<p class="muted">Loading...</p>';
  try {
    const bookmarks = await apiFetch("/bookmarks");
    renderBookmarks(bookmarks);
  } catch (err) {
    bookmarksListEl.innerHTML = "";
    showBanner(`Failed to load bookmarks: ${err.message}`, "error");
  }
}

async function deleteBookmark(id) {
  try {
    await apiFetch(`/bookmarks/${id}`, { method: "DELETE" });
    showBanner("Bookmark deleted.", "success");
    await loadBookmarks();
  } catch (err) {
    showBanner(`Failed to delete bookmark: ${err.message}`, "error");
  }
}

bookmarkForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearBanner();
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

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

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = document.getElementById("search-query").value.trim();
  if (!query) return;

  searchResultsEl.innerHTML = '<p class="muted">Searching...</p>';
  try {
    const response = await fetch("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await response.json();
    const points = data.points || [];
    if (!points.length) {
      searchResultsEl.innerHTML = '<p class="muted">No results.</p>';
      return;
    }
    searchResultsEl.innerHTML = "";
    for (const point of points) {
      const payload = point.payload || {};
      const card = document.createElement("div");
      card.className = "bookmark-card";
      card.innerHTML = `
        <h3>${escapeHtml(payload.title || "Untitled")}</h3>
        <a href="${escapeHtml(payload.url || "#")}" target="_blank" rel="noopener noreferrer">${escapeHtml(payload.url || "")}</a>
        ${payload.summary ? `<p>${escapeHtml(payload.summary)}</p>` : ""}
      `;
      searchResultsEl.appendChild(card);
    }
  } catch (err) {
    searchResultsEl.innerHTML = "";
    showBanner(`Search failed: ${err.message}`, "error");
  }
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await handleLogin();
});

loginBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  await handleLogin();
});

signupBtn.addEventListener("click", async () => {
  clearBanner();
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  signupBtn.disabled = true;

  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;

    if (data.session) {
      showBanner("Account created and logged in.", "success");
    } else {
      showBanner("Account created. Check your email to confirm, then log in.", "info");
    }
  } catch (err) {
    showBanner(`Sign up failed: ${err.message}`, "error");
  } finally {
    signupBtn.disabled = false;
  }
});

async function handleLogin() {
  clearBanner();
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  loginBtn.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (err) {
    showBanner(`Log in failed: ${err.message}`, "error");
  } finally {
    loginBtn.disabled = false;
  }
}

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

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
