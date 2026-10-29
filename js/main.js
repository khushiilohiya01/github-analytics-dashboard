// ─── Entry point: event wiring, load / compare flows, init ───────────────────

import { state } from "./state.js";
import { setText } from "./utils.js";
import { fetchGitHubProfile } from "./api.js";
import { readRecentSearches, addRecentSearch, clearRecentSearches, readTheme, saveTheme } from "./storage.js";
import {
  showMessage, hideMessage, setButtonLoading, resetButton,
  resetDashboardToEmpty, setLoadingUI, setErrorUI,
} from "./ui.js";
import { renderProfile, buildSummaryText } from "./render/profile.js";
import { renderReposSection } from "./render/repos.js";
import { createCompareCards } from "./render/compare.js";
import { initScrollUI } from "./scroll.js";
import {
  body, themeToggle, usernameInput, compareUser1, compareUser2, analyzeBtn, compareBtn,
  copySummaryBtn, exportSummaryBtn, shareBtn, rateLimitNotice, profileBio,
  compareSection, compareGrid, sortSelect, languageFilter,
  recentSearchesContainer, clearRecentBtn, viewButtons, tickerTrack,
} from "./dom.js";

// Shown in the landing ticker alongside the user's own recent searches
const TICKER_DEFAULTS = ["torvalds", "gaearon", "sindresorhus", "yyx990803", "tj", "addyosmani", "kentcdodds", "mojombo"];

// ─── Views (Analyze / Compare) ───────────────────────────────────────────────

function setView(view) {
  body.dataset.view = view;
  viewButtons.forEach((btn) => {
    const active = btn.dataset.viewBtn === view;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
  (view === "compare" ? compareUser1 : usernameInput).focus();
}

viewButtons.forEach((btn) => btn.addEventListener("click", () => setView(btn.dataset.viewBtn)));

// ─── Theme ───────────────────────────────────────────────────────────────────

// Paper (light) is the default; the icon shows the theme you'd switch to
function syncThemeIcon() {
  themeToggle.querySelector("i").className = body.classList.contains("light-mode")
    ? "fa-solid fa-moon"
    : "fa-solid fa-sun";
}

themeToggle.addEventListener("click", () => {
  body.classList.toggle("light-mode");
  syncThemeIcon();
  saveTheme(body.classList.contains("light-mode") ? "light" : "dark");
});

function initTheme() {
  if (readTheme() === "dark") body.classList.remove("light-mode");
  syncThemeIcon();
}

// ─── Search / Compare events ─────────────────────────────────────────────────

// No <form> wrapper, so handle both the button click and the Enter key
analyzeBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  if (!username) return;
  await loadGitHubUser(username);
});

usernameInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    const username = usernameInput.value.trim();
    if (!username) return;
    await loadGitHubUser(username);
  }
});

compareBtn.addEventListener("click", async () => {
  const user1 = compareUser1.value.trim();
  const user2 = compareUser2.value.trim();
  if (!user1 || !user2) return;
  await compareGitHubUsers(user1, user2);
});

[compareUser1, compareUser2].forEach((input) => {
  input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      const user1 = compareUser1.value.trim();
      const user2 = compareUser2.value.trim();
      if (!user1 || !user2) return;
      await compareGitHubUsers(user1, user2);
    }
  });
});

sortSelect.addEventListener("change", renderReposSection);
languageFilter.addEventListener("change", renderReposSection);

clearRecentBtn.addEventListener("click", () => {
  clearRecentSearches();
  renderRecentSearches();
});

// ─── Summary actions ─────────────────────────────────────────────────────────

copySummaryBtn.addEventListener("click", async () => {
  const text = buildSummaryText();
  try {
    await navigator.clipboard.writeText(text);
    showMessage("Summary copied.", "success");
  } catch {
    showMessage("Could not copy — please try again.");
  }
});

exportSummaryBtn.addEventListener("click", () => {
  const text = buildSummaryText();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.profile?.login || "devscope"}-summary.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

// share via URL param so the analysis is linkable
shareBtn.addEventListener("click", async () => {
  if (!state.profile) return;
  const url = `${location.origin}${location.pathname}?user=${state.profile.login}`;
  try {
    await navigator.clipboard.writeText(url);
    showMessage("Link copied to clipboard.", "success");
  } catch {
    showMessage("Could not copy link — please copy from your address bar.");
  }
});

// ─── Recent searches ─────────────────────────────────────────────────────────

function renderTicker() {
  const names = [...new Set([...readRecentSearches(), ...TICKER_DEFAULTS])].slice(0, 10);
  tickerTrack.innerHTML = "";
  // Two copies so the marquee loops seamlessly; the second is hidden from assistive tech
  [false, true].forEach((isCopy) => {
    names.forEach((name) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ticker-item";
      btn.textContent = `@${name}`;
      if (isCopy) {
        btn.setAttribute("aria-hidden", "true");
        btn.tabIndex = -1;
      }
      btn.addEventListener("click", () => {
        usernameInput.value = name;
        loadGitHubUser(name);
      });
      tickerTrack.appendChild(btn);
    });
  });
}

function renderRecentSearches() {
  const searches = readRecentSearches();
  renderTicker();

  recentSearchesContainer.innerHTML = "";
  if (!searches.length) {
    const empty = document.createElement("span");
    empty.className = "empty-state";
    empty.textContent = "No recent searches yet.";
    recentSearchesContainer.appendChild(empty);
    return;
  }

  searches.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "recent-chip";
    btn.textContent = `@${item}`;
    // Username goes in textContent, never into HTML
    btn.addEventListener("click", async () => {
      usernameInput.value = item;
      await loadGitHubUser(item);
    });
    recentSearchesContainer.appendChild(btn);
  });
}

// ─── Compare ──────────────────────────────────────────────────────────────────

async function compareGitHubUsers(user1, user2) {
  const requestId = ++state.compareRequestId;
  hideMessage();
  body.classList.add("has-compare");
  compareSection.classList.remove("hidden");
  compareGrid.innerHTML = `<div class="loading-state loading-shimmer">Comparing profiles…</div>`;
  setButtonLoading(compareBtn, "Comparing…");

  try {
    const [first, second] = await Promise.all([fetchGitHubProfile(user1), fetchGitHubProfile(user2)]);
    if (requestId !== state.compareRequestId) return;
    compareGrid.innerHTML = "";
    compareGrid.appendChild(createCompareCards(first, second));
  } catch (error) {
    if (requestId !== state.compareRequestId) return;
    compareGrid.innerHTML = "";
    const err = document.createElement("div");
    err.className = "empty-state";
    err.textContent = error.message || "Comparison failed.";
    compareGrid.appendChild(err);
    showMessage(error.message || "Comparison failed.");
  } finally {
    if (requestId === state.compareRequestId) resetButton(compareBtn);
  }
}

// ─── Main load ────────────────────────────────────────────────────────────────

async function loadGitHubUser(username) {
  const requestId = ++state.loadRequestId;
  hideMessage();
  setButtonLoading(analyzeBtn, "Loading…");
  setLoadingUI();

  try {
    const data = await fetchGitHubProfile(username);
    if (requestId !== state.loadRequestId) return;
    renderProfile(data);
    addRecentSearch(data.profile.login || username);
    renderRecentSearches();
  } catch (error) {
    if (requestId !== state.loadRequestId) return;
    showMessage(error.message || "Something went wrong while fetching data.");
    resetDashboardToEmpty();
    setErrorUI();
    setText(profileBio, "Could not load this profile. Try another public GitHub username.");
    // Show rate limit notice if it's a rate limit error
    if (error.message && error.message.toLowerCase().includes("rate limit")) {
      rateLimitNotice.classList.remove("hidden");
    }
  } finally {
    if (requestId === state.loadRequestId) resetButton(analyzeBtn);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  initTheme();
  initScrollUI();
  resetDashboardToEmpty();
  renderRecentSearches();

  // support ?user=username in URL for shareable links
  const params = new URLSearchParams(location.search);
  const userParam = params.get("user");
  if (userParam) {
    usernameInput.value = userParam;
    loadGitHubUser(userParam);
  }
}

init();
