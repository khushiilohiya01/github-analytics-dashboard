// ─── Profile dashboard ───────────────────────────────────────────────────────

import { state } from "../state.js";
import { formatNumber, formatDate, lastActivity, normalizeUrl, safeText, setText, setAttr } from "../utils.js";
import {
  getTotalStars, getTotalForks, getPrimaryLanguage, getTopRepo, getMostRecentlyUpdatedRepo,
  getBestRepoRecommendation, getBestRepoReason, getAccountAge, calculateBreakdown,
  calculateHealthScore, getHealthRemark, generateAISummary, generateSuggestions,
  getProfileLevel, getProfileHighlights, getMetricTips,
} from "../analysis.js";
import { setScoreRing, setBreakdownUI, countUp } from "../ui.js";
import { renderLanguageChart, renderActivityChart } from "./charts.js";
import { populateLanguageFilter, renderReposSection } from "./repos.js";
import {
  profileAvatar, profileName, profileUsername, profileBio,
  profileLocation, profileCompany, profileJoined, profileJoinedText, profileBlog,
  repoCount, starsCount, forksCount, followersCount, repoTruncateWarning,
  healthScore, healthRemark,
  bestRepoHighlight, topLanguageHighlight, recentRepoHighlight, accountAgeHighlight,
  bestRepoTitle, bestRepoReason, aiSummary, suggestionsList, profileActions,
  body, repoTabCount, profileLevel, profileChips,
} from "../dom.js";

const IMPACT_LABELS = { high: "High impact", medium: "Medium", low: "Nice to have" };

export function renderProfile({ profile, repos, forkCount, truncated }) {
  state.profile   = profile;
  state.repos     = repos;
  state.forkCount = forkCount;

  body.classList.remove("is-loading");
  body.classList.add("has-profile");
  setText(repoTabCount, repos.length);

  const totalStars  = getTotalStars(repos);
  const totalForks  = getTotalForks(repos);
  const primaryLang = getPrimaryLanguage(repos);
  const topRepo     = getTopRepo(repos);
  const recentRepo  = getMostRecentlyUpdatedRepo(repos);
  const bestRepo    = getBestRepoRecommendation(repos);
  const breakdown   = calculateBreakdown(profile, repos);
  const score       = calculateHealthScore(profile, repos);
  const suggestions = generateSuggestions(profile, repos);
  const age         = getAccountAge(profile.created_at);

  // XSS — use textContent / setAttribute instead of innerHTML for user data
  if (profile.avatar_url) {
    profileAvatar.src = profile.avatar_url;
    profileAvatar.alt = profile.name || profile.login || "Profile";
  } else {
    profileAvatar.removeAttribute("src");
    profileAvatar.alt = "";
  }

  setText(profileName,     profile.name || "No name");
  setText(profileUsername, `@${profile.login || "unknown"}`);
  setText(profileBio,      profile.bio || "No bio available.");

  profileLocation.innerHTML = "";
  const locIcon = document.createElement("i");
  locIcon.className = "fa-solid fa-location-dot";
  locIcon.setAttribute("aria-hidden", "true");
  profileLocation.appendChild(locIcon);
  profileLocation.append(` ${safeText(profile.location)}`);

  profileCompany.innerHTML = "";
  const compIcon = document.createElement("i");
  compIcon.className = "fa-solid fa-building";
  compIcon.setAttribute("aria-hidden", "true");
  profileCompany.appendChild(compIcon);
  profileCompany.append(` ${safeText(profile.company)}`);

  if (age) {
    setText(profileJoinedText, age);
    profileJoined.classList.remove("hidden");
  } else {
    profileJoined.classList.add("hidden");
  }

  const blog = normalizeUrl(profile.blog || "");
  if (blog) {
    setAttr(profileBlog, "href", blog);
    profileBlog.classList.remove("hidden");
    profileBlog.innerHTML = `<i class="fa-solid fa-link" aria-hidden="true"></i> Website`;
  } else {
    profileBlog.classList.add("hidden");
  }

  countUp(repoCount,      profile.public_repos || repos.length);
  countUp(starsCount,     totalStars);
  countUp(forksCount,     totalForks);
  countUp(followersCount, profile.followers || 0);

  if (truncated) {
    repoTruncateWarning.classList.remove("hidden");
  } else {
    repoTruncateWarning.classList.add("hidden");
  }

  countUp(healthScore, score);
  setText(healthRemark, getHealthRemark(score));
  setScoreRing(score);
  setBreakdownUI(breakdown, getMetricTips(breakdown));

  setText(profileLevel, getProfileLevel(score));
  profileChips.innerHTML = "";
  getProfileHighlights(profile, repos).forEach(({ type, text }) => {
    const chip = document.createElement("li");
    chip.className = `chip chip-${type}`;
    const icon = document.createElement("i");
    icon.className = type === "good" ? "fa-solid fa-circle-check" : "fa-solid fa-circle-exclamation";
    icon.setAttribute("aria-hidden", "true");
    chip.appendChild(icon);
    chip.append(` ${text}`);
    profileChips.appendChild(chip);
  });

  const starredRepo = topRepo && topRepo.stargazers_count > 0 ? topRepo : null;
  setText(bestRepoHighlight, starredRepo
    ? `${starredRepo.name} · ${formatNumber(starredRepo.stargazers_count)} ★`
    : "No starred repos yet");
  setText(topLanguageHighlight, primaryLang);
  setText(recentRepoHighlight, recentRepo ? `${recentRepo.name} · ${formatDate(lastActivity(recentRepo))}` : "--");
  setText(accountAgeHighlight, age ? age.replace("Member for ", "") : "--");

  setText(bestRepoTitle, bestRepo ? bestRepo.name : "--");
  setText(bestRepoReason, bestRepo ? getBestRepoReason(bestRepo) : "--");

  setText(aiSummary, generateAISummary(profile, repos, score));

  // XSS-safe suggestions — use DOM, not innerHTML with user data
  suggestionsList.innerHTML = "";
  suggestions.forEach(({ impact, title, detail }) => {
    const li = document.createElement("li");
    li.className = `step step-${impact}`;
    li.dataset.text = `${title}: ${detail}`;

    const head = document.createElement("div");
    head.className = "step-head";
    const strong = document.createElement("strong");
    strong.textContent = title;
    const badge = document.createElement("span");
    badge.className = "impact-badge";
    badge.textContent = IMPACT_LABELS[impact];
    head.appendChild(strong);
    head.appendChild(badge);

    const p = document.createElement("p");
    p.textContent = detail;

    li.appendChild(head);
    li.appendChild(p);
    suggestionsList.appendChild(li);
  });

  renderLanguageChart(repos);
  populateLanguageFilter(repos);
  renderActivityChart(repos);
  renderReposSection();

  // show action buttons only after a profile loads
  profileActions.classList.remove("hidden");

  // update URL so the page is shareable
  const url = new URL(location.href);
  url.searchParams.set("user", profile.login);
  history.replaceState(null, "", url.toString());
}

// ─── Summary text ─────────────────────────────────────────────────────────────

export function buildSummaryText() {
  const lines = [
    "DevScope Summary",
    "",
    `Profile: ${profileName.textContent} (${profileUsername.textContent})`,
    `Profile Score: ${healthScore.textContent} (${profileLevel.textContent})`,
    `Repositories: ${repoCount.textContent}`,
    `Stars: ${starsCount.textContent}`,
    `Forks: ${forksCount.textContent}`,
    `Followers: ${followersCount.textContent}`,
    `Primary Language: ${topLanguageHighlight.textContent}`,
    `Most Starred Repo: ${bestRepoHighlight.textContent}`,
    `Latest Updated Repo: ${recentRepoHighlight.textContent}`,
    `Account Age: ${accountAgeHighlight.textContent}`,
    "",
    "Quick Profile Read:",
    aiSummary.textContent,
    "",
    "Best Repo to Show:",
    bestRepoTitle.textContent,
    bestRepoReason.textContent,
    "",
    "Possible Improvements:"
  ];

  suggestionsList.querySelectorAll("li").forEach((li) => lines.push(`- ${li.dataset.text || li.textContent}`));
  return lines.join("\n");
}
