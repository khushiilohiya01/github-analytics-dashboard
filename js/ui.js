// ─── Shared UI states: messages, buttons, loading / empty / error ────────────

import { state } from "./state.js";
import { setText } from "./utils.js";
import {
  messageBox, rateLimitNotice, profileActions, scoreRing,
  profileAvatar, profileName, profileUsername, profileBio,
  profileLocation, profileCompany, profileJoined, profileBlog,
  repoCount, starsCount, forksCount, followersCount,
  healthScore, healthRemark,
  bestRepoHighlight, topLanguageHighlight, recentRepoHighlight, accountAgeHighlight,
  bestRepoTitle, bestRepoReason, aiSummary, suggestionsList,
  activityScore, popularityScore, documentationScore, visibilityScore,
  activityBar, popularityBar, documentationBar, visibilityBar,
  languageChart, contributionGraph, repoList, repoCountLabel, repoTruncateWarning,
} from "./dom.js";

// ─── Messages ────────────────────────────────────────────────────────────────

export function showMessage(text, type = "error") {
  messageBox.textContent = text;
  messageBox.className = `message-box ${type}`;
  messageBox.classList.remove("hidden");
}

export function hideMessage() {
  messageBox.textContent = "";
  messageBox.classList.add("hidden");
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

export function setButtonLoading(btn, text) {
  // Keep the first original label if a second request starts while one is in flight
  if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = text;
}

export function resetButton(btn) {
  btn.disabled = false;
  if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
  delete btn.dataset.originalText;
}

// ─── Score widgets ───────────────────────────────────────────────────────────

export function setScoreRing(score) {
  const angle = typeof score === "number" ? Math.max(10, Math.min(360, Math.round((score / 100) * 360))) : 10;
  scoreRing.style.setProperty("--score-angle", `${angle}deg`);
}

export function setBreakdownUI(breakdown) {
  const keys = ["activity", "popularity", "documentation", "visibility"];
  const scoreEls = { activity: activityScore, popularity: popularityScore, documentation: documentationScore, visibility: visibilityScore };
  const barEls   = { activity: activityBar,   popularity: popularityBar,   documentation: documentationBar,   visibility: visibilityBar };
  keys.forEach((k) => {
    setText(scoreEls[k], breakdown[k] === null ? "--" : breakdown[k]);
    barEls[k].style.width = `${breakdown[k] || 0}%`;
  });
}

// ─── Loading / error UI ───────────────────────────────────────────────────────

export function resetDashboardToEmpty() {
  state.profile   = null;
  state.repos     = [];
  state.forkCount = 0;

  // No src (rather than src="") avoids a broken-image icon and a request to the page itself
  profileAvatar.removeAttribute("src");
  profileAvatar.alt = "";
  setText(profileName,     "No profile selected");
  setText(profileUsername, "@search-a-username");
  setText(profileBio,      "Search a public GitHub username to load profile details and repository insights.");

  profileLocation.innerHTML = `<i class="fa-solid fa-location-dot" aria-hidden="true"></i> Not available`;
  profileCompany.innerHTML  = `<i class="fa-solid fa-building" aria-hidden="true"></i> Not available`;
  profileJoined.classList.add("hidden");
  profileBlog.classList.add("hidden");

  [repoCount, starsCount, forksCount, followersCount, healthScore,
   bestRepoHighlight, topLanguageHighlight, recentRepoHighlight,
   accountAgeHighlight, bestRepoTitle].forEach((el) => setText(el, "--"));

  setText(healthRemark,  "Load a profile to see the score based on public activity, visibility, and repository details.");
  setText(bestRepoReason,"Load a profile to identify the strongest repository to highlight.");
  setText(aiSummary,     "Search a profile to generate a quick review.");

  suggestionsList.innerHTML = "<li>Search a profile to see practical suggestions based on public repository data.</li>";
  setScoreRing(null);
  setBreakdownUI({ activity: null, popularity: null, documentation: null, visibility: null });

  languageChart.innerHTML     = `<div class="empty-state">Search a profile to view language distribution.</div>`;
  contributionGraph.innerHTML = `<div class="empty-state">Search a profile to view repo activity.</div>`;
  repoList.innerHTML          = `<div class="empty-state">Search a profile to review repositories.</div>`;
  repoCountLabel.textContent  = "";
  repoTruncateWarning.classList.add("hidden");
  profileActions.classList.add("hidden");
  rateLimitNotice.classList.add("hidden");
}

export function setLoadingUI() {
  setText(profileName,     "Loading profile...");
  setText(profileUsername, "@please-wait");
  setText(profileBio,      "Fetching GitHub data...");

  profileLocation.innerHTML = `<i class="fa-solid fa-location-dot" aria-hidden="true"></i> Please wait`;
  profileCompany.innerHTML  = `<i class="fa-solid fa-building" aria-hidden="true"></i> Please wait`;
  profileJoined.classList.add("hidden");
  profileBlog.classList.add("hidden");

  [repoCount, starsCount, forksCount, followersCount].forEach((el) => setText(el, "…"));

  setText(healthScore,  "…");
  setText(healthRemark, "Reviewing repositories and profile activity...");
  setScoreRing(10);

  [bestRepoHighlight, topLanguageHighlight, recentRepoHighlight, accountAgeHighlight].forEach((el) =>
    setText(el, "Loading…"));

  setText(bestRepoTitle,  "Loading…");
  setText(bestRepoReason, "Finding the strongest project…");
  setText(aiSummary,      "Preparing summary…");
  suggestionsList.innerHTML = "<li>Preparing suggestions…</li>";

  setBreakdownUI({ activity: 0, popularity: 0, documentation: 0, visibility: 0 });

  languageChart.innerHTML     = `<div class="loading-state loading-shimmer">Loading language data…</div>`;
  contributionGraph.innerHTML = `<div class="loading-state loading-shimmer">Loading activity…</div>`;
  repoList.innerHTML          = `<div class="loading-state loading-shimmer">Loading repositories…</div>`;
  repoCountLabel.textContent  = "";
}

export function setErrorUI(message = "No public repositories found for this profile.") {
  repoList.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  repoList.appendChild(empty);
  languageChart.innerHTML     = `<div class="empty-state">No language data available.</div>`;
  contributionGraph.innerHTML = `<div class="empty-state">No activity data available.</div>`;
  suggestionsList.innerHTML   = "<li>No suggestion data available.</li>";
  repoCountLabel.textContent  = "";
}
