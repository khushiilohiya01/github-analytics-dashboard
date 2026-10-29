// ─── DOM refs ────────────────────────────────────────────────────────────────

const themeToggle          = document.getElementById("themeToggle");
const body                 = document.body;

const searchForm           = document.getElementById("searchForm");
const compareForm          = document.getElementById("compareForm");
const usernameInput        = document.getElementById("usernameInput");
const compareUser1         = document.getElementById("compareUser1");
const compareUser2         = document.getElementById("compareUser2");
const analyzeBtn           = document.getElementById("analyzeBtn");
const compareBtn           = document.getElementById("compareBtn");

const copySummaryBtn       = document.getElementById("copySummaryBtn");
const exportSummaryBtn     = document.getElementById("exportSummaryBtn");
const shareBtn             = document.getElementById("shareBtn");
const profileActions       = document.getElementById("profileActions");
const messageBox           = document.getElementById("messageBox");
const rateLimitNotice      = document.getElementById("rateLimitNotice");

const compareSection       = document.getElementById("compareSection");
const compareGrid          = document.getElementById("compareGrid");

const profileAvatar        = document.getElementById("profileAvatar");
const profileName          = document.getElementById("profileName");
const profileUsername      = document.getElementById("profileUsername");
const profileBio           = document.getElementById("profileBio");
const profileLocation      = document.getElementById("profileLocation");
const profileCompany       = document.getElementById("profileCompany");
const profileBlog          = document.getElementById("profileBlog");
const profileJoined        = document.getElementById("profileJoined");
const profileJoinedText    = document.getElementById("profileJoinedText");

const repoCount            = document.getElementById("repoCount");
const starsCount           = document.getElementById("starsCount");
const forksCount           = document.getElementById("forksCount");
const followersCount       = document.getElementById("followersCount");

const healthScore          = document.getElementById("healthScore");
const healthRemark         = document.getElementById("healthRemark");
const scoreRing            = document.getElementById("scoreRing");

const languageChart        = document.getElementById("languageChart");
const contributionGraph    = document.getElementById("contributionGraph");

const bestRepoHighlight    = document.getElementById("bestRepoHighlight");
const topLanguageHighlight = document.getElementById("topLanguageHighlight");
const recentRepoHighlight  = document.getElementById("recentRepoHighlight");
const accountAgeHighlight  = document.getElementById("accountAgeHighlight");

const bestRepoTitle        = document.getElementById("bestRepoTitle");
const bestRepoReason       = document.getElementById("bestRepoReason");
const aiSummary            = document.getElementById("aiSummary");
const suggestionsList      = document.getElementById("suggestionsList");

const activityScore        = document.getElementById("activityScore");
const popularityScore      = document.getElementById("popularityScore");
const documentationScore   = document.getElementById("documentationScore");
const visibilityScore      = document.getElementById("visibilityScore");
const activityBar          = document.getElementById("activityBar");
const popularityBar        = document.getElementById("popularityBar");
const documentationBar     = document.getElementById("documentationBar");
const visibilityBar        = document.getElementById("visibilityBar");

const repoList             = document.getElementById("repoList");
const repoCountLabel       = document.getElementById("repoCountLabel");
const repoTruncateWarning  = document.getElementById("repoTruncateWarning");
const sortSelect           = document.getElementById("sortSelect");
const languageFilter       = document.getElementById("languageFilter");

const recentSearchesContainer = document.getElementById("recentSearches");
const clearRecentBtn          = document.getElementById("clearRecentBtn");

// ─── State ───────────────────────────────────────────────────────────────────

let currentProfile   = null;
let currentRepos     = [];
let currentForkCount = 0;

// Incremented per request so a slow, older response can't overwrite a newer one
let loadRequestId    = 0;
let compareRequestId = 0;

// ─── Theme ───────────────────────────────────────────────────────────────────

themeToggle.addEventListener("click", () => {
  body.classList.toggle("light-mode");
  const icon = themeToggle.querySelector("i");
  icon.className = body.classList.contains("light-mode")
    ? "fa-solid fa-sun"
    : "fa-solid fa-moon";
  localStorage.setItem("devscope-theme", body.classList.contains("light-mode") ? "light" : "dark");
});

function initTheme() {
  const saved = localStorage.getItem("devscope-theme");
  if (saved === "light") {
    body.classList.add("light-mode");
    themeToggle.querySelector("i").className = "fa-solid fa-sun";
  }
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
  localStorage.removeItem("devscope-recent");
  renderRecentSearches();
});

// ─── Summary actions ─────────────────────────────────────────────────────────

copySummaryBtn.addEventListener("click", async () => {
  const text = buildSummaryText();
  try {
    await navigator.clipboard.writeText(text);
    showMessage("Summary copied.", "success");
    setTimeout(hideMessage, 2000);
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
  link.download = `${currentProfile?.login || "devscope"}-summary.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

// share via URL param so the analysis is linkable
shareBtn.addEventListener("click", async () => {
  if (!currentProfile) return;
  const url = `${location.origin}${location.pathname}?user=${currentProfile.login}`;
  try {
    await navigator.clipboard.writeText(url);
    showMessage("Link copied to clipboard.", "success");
    setTimeout(hideMessage, 2000);
  } catch {
    showMessage("Could not copy link — please copy from your address bar.");
  }
});

// ─── Utility helpers ─────────────────────────────────────────────────────────

function formatNumber(num) {
  return Number(num || 0).toLocaleString();
}

function safeText(value, fallback = "Not available") {
  return value && String(value).trim() ? value : fallback;
}

function normalizeUrl(url) {
  if (!url || !url.trim()) return "";
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

function formatDate(dateString) {
  if (!dateString) return "Unknown";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function daysSince(dateString) {
  if (!dateString) return 9999;
  return Math.floor((Date.now() - new Date(dateString)) / 86400000);
}

// pushed_at reflects code changes; updated_at also moves on stars and metadata edits
function lastActivity(repo) {
  return repo.pushed_at || repo.updated_at;
}

// XSS — safe DOM text setter
function setText(el, value) {
  if (!el) return;
  el.textContent = value;
}

// XSS — safe attribute setter
function setAttr(el, attr, value) {
  if (!el) return;
  el.setAttribute(attr, value);
}

function getTotalStars(repos) {
  return repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
}

function getTotalForks(repos) {
  return repos.reduce((s, r) => s + (r.forks_count || 0), 0);
}

function getActiveRepos(repos) {
  return repos.filter((r) => daysSince(lastActivity(r)) <= 60).length;
}

function getLanguageData(repos) {
  const map = {};
  repos.forEach((r) => {
    const lang = r.language || "Other";
    map[lang] = (map[lang] || 0) + 1;
  });
  const total = repos.length || 1;
  return Object.entries(map)
    .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

function getPrimaryLanguage(repos) {
  const data = getLanguageData(repos);
  return data.length ? data[0].name : "--";
}

function getTopRepo(repos) {
  if (!repos.length) return null;
  return [...repos].sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))[0];
}

function getMostRecentlyUpdatedRepo(repos) {
  if (!repos.length) return null;
  return [...repos].sort((a, b) => new Date(lastActivity(b)) - new Date(lastActivity(a)))[0];
}

function getBestRepoRecommendation(repos) {
  if (!repos.length) return null;
  return repos
    .map((repo) => {
      const stars       = repo.stargazers_count || 0;
      const forks       = repo.forks_count || 0;
      const hasDesc     = repo.description && repo.description.trim() ? 1 : 0;
      const recentScore = daysSince(lastActivity(repo)) <= 60 ? 20 : 0;
      return { repo, score: stars * 2 + forks + hasDesc * 12 + recentScore };
    })
    .sort((a, b) => b.score - a.score)[0].repo;
}

// Reason text built from what is actually true of the repo
function getBestRepoReason(repo) {
  const reasons = [];
  const stars = repo.stargazers_count || 0;
  const forks = repo.forks_count || 0;
  if (stars > 0) reasons.push(`${formatNumber(stars)} star${stars !== 1 ? "s" : ""}`);
  if (forks > 0) reasons.push(`${formatNumber(forks)} fork${forks !== 1 ? "s" : ""}`);
  if (daysSince(lastActivity(repo)) <= 60) reasons.push("recent pushes");
  if (repo.description && repo.description.trim()) reasons.push("a clear description");

  if (!reasons.length) return "No repository stands out strongly yet — this one scored highest on the available signals.";
  const list = reasons.length > 1
    ? `${reasons.slice(0, -1).join(", ")} and ${reasons[reasons.length - 1]}`
    : reasons[0];
  return `This repository stands out with ${list}.`;
}

// account age helper
function getAccountAge(createdAt) {
  if (!createdAt) return null;
  const years  = Math.floor(daysSince(createdAt) / 365);
  const months = Math.floor((daysSince(createdAt) % 365) / 30);
  if (years >= 1) return `Member for ${years} year${years !== 1 ? "s" : ""}`;
  if (months >= 1) return `Member for ${months} month${months !== 1 ? "s" : ""}`;
  return "New member";
}

function calculateBreakdown(profile, repos) {
  const stars        = getTotalStars(repos);
  const forks        = getTotalForks(repos);
  const followers    = profile.followers || 0;
  const repoTotal    = profile.public_repos || repos.length || 0;
  const activeRepos  = getActiveRepos(repos);
  const describedRepos = repos.filter((r) => r.description && r.description.trim()).length;

  const activity      = repos.length ? Math.round((activeRepos / repos.length) * 100) : 0;
  const popularity    = Math.min(100, Math.round((stars / 4) + (forks / 8)));
  const documentation = repos.length ? Math.round((describedRepos / repos.length) * 100) : 0;
  const visibility    = Math.min(100, Math.round((followers / 5) + Math.min(repoTotal * 2, 20)));

  return { activity, popularity, documentation, visibility };
}

function calculateHealthScore(profile, repos) {
  const b = calculateBreakdown(profile, repos);
  return Math.min(100, Math.round(b.activity * 0.30 + b.popularity * 0.28 + b.documentation * 0.20 + b.visibility * 0.22));
}

function getHealthRemark(score) {
  if (score >= 85) return "Very strong public profile with good activity, visibility, and project quality.";
  if (score >= 70) return "Strong profile with solid public work and healthy repository signals.";
  if (score >= 55) return "Good foundation with room to improve consistency and visibility.";
  return "Early-stage public profile with clear room to grow through stronger projects and regular updates.";
}

function setScoreRing(score) {
  const angle = typeof score === "number" ? Math.max(10, Math.min(360, Math.round((score / 100) * 360))) : 10;
  scoreRing.style.setProperty("--score-angle", `${angle}deg`);
}

function setBreakdownUI(breakdown) {
  const keys = ["activity", "popularity", "documentation", "visibility"];
  const scoreEls = { activity: activityScore, popularity: popularityScore, documentation: documentationScore, visibility: visibilityScore };
  const barEls   = { activity: activityBar,   popularity: popularityBar,   documentation: documentationBar,   visibility: visibilityBar };
  keys.forEach((k) => {
    setText(scoreEls[k], breakdown[k] === null ? "--" : breakdown[k]);
    barEls[k].style.width = `${breakdown[k] || 0}%`;
  });
}

function generateAISummary(profile, repos, score) {
  const lang       = getPrimaryLanguage(repos);
  const active     = getActiveRepos(repos);
  const bestRepo   = getBestRepoRecommendation(repos);
  const repoTotal  = profile.public_repos || repos.length;
  const age        = getAccountAge(profile.created_at);

  return `${profile.name || profile.login} has ${repoTotal} public repositories and works mostly with ${lang}. ${age ? age + ". " : ""}Profile score: ${score}/100. ${active >= 3 ? "Visible recent activity across the profile." : "Recent public activity looks limited."} ${bestRepo ? `${bestRepo.name} is the strongest repository to highlight.` :"A stronger standout project would improve the overall profile."}`;
}

function generateSuggestions(profile, repos) {
  const suggestions    = [];
  const stars          = getTotalStars(repos);
  const active         = getActiveRepos(repos);
  const described      = repos.filter((r) => r.description && r.description.trim()).length;
  const languageCount  = getLanguageData(repos).length;
  const followers      = profile.followers || 0;

  if (active <= 1 && repos.length > 0)
    suggestions.push("Update a few repositories more regularly so the profile feels more active.");
  if (described < Math.ceil(repos.length * 0.5))
    suggestions.push("Add descriptions to more repositories so visitors understand the work at a glance.");
  if (stars < 30)
    suggestions.push("One polished flagship project could make the profile much more memorable.");
  if (languageCount <= 1 && repos.length >= 4)
    suggestions.push("A little more project variety would make the profile feel more rounded.");
  if (followers < 20)
    suggestions.push("Pinning stronger work and sharing projects could improve profile visibility.");
  if (!suggestions.length)
    suggestions.push("Profile already looks solid. The next step is making one project especially stand out.");

  return suggestions.slice(0, 4);
}

// ─── Activity chart (replaces unreliable ghchart.rshah.org) ──────────────────

function renderActivityChart(repos) {
  if (!repos.length) {
    contributionGraph.innerHTML = `<div class="empty-state">No activity data available.</div>`;
    return;
  }

  // Build month buckets for last 12 months
  const now    = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString("en-IN", { month: "short" }),
      year:  d.getFullYear(),
      month: d.getMonth(),
      count: 0
    });
  }

  // Each repo is counted once, in the month of its most recent push
  repos.forEach((r) => {
    if (!lastActivity(r)) return;
    const d = new Date(lastActivity(r));
    const bucket = months.find((m) => m.year === d.getFullYear() && m.month === d.getMonth());
    if (bucket) bucket.count++;
  });

  const maxCount = Math.max(...months.map((m) => m.count), 1);

  // Only numbers and locale month names go into this markup, so a string template is safe
  const bars = months.map((m) => {
    const pct    = Math.round((m.count / maxCount) * 100);
    const height = Math.max(pct, m.count > 0 ? 4 : 0);
    return `
      <div class="act-col">
        <div class="act-bar-wrap">
          <div class="act-bar" style="height:${height}%" title="${m.count} repo${m.count !== 1 ? "s" : ""} last pushed in ${m.label}"></div>
        </div>
        <span class="act-label">${m.label}</span>
      </div>`;
  }).join("");

  contributionGraph.innerHTML = `<div class="act-chart">${bars}</div>`;
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function renderProfile({ profile, repos, forkCount, truncated }) {
  currentProfile   = profile;
  currentRepos     = repos;
  currentForkCount = forkCount;

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

  setText(repoCount,      formatNumber(profile.public_repos || repos.length));
  setText(starsCount,     formatNumber(totalStars));
  setText(forksCount,     formatNumber(totalForks));
  setText(followersCount, formatNumber(profile.followers || 0));

  if (truncated) {
    repoTruncateWarning.classList.remove("hidden");
  } else {
    repoTruncateWarning.classList.add("hidden");
  }

  setText(healthScore, score);
  setText(healthRemark, getHealthRemark(score));
  setScoreRing(score);
  setBreakdownUI(breakdown);

  setText(bestRepoHighlight, topRepo ? `${topRepo.name} (${formatNumber(topRepo.stargazers_count)} stars)` : "--");
  setText(topLanguageHighlight, primaryLang);
  setText(recentRepoHighlight, recentRepo ? `${recentRepo.name} · ${formatDate(lastActivity(recentRepo))}` : "--");
  setText(accountAgeHighlight, age || "--");

  setText(bestRepoTitle, bestRepo ? bestRepo.name : "--");
  setText(bestRepoReason, bestRepo ? getBestRepoReason(bestRepo) : "--");

  setText(aiSummary, generateAISummary(profile, repos, score));

  // XSS-safe suggestions — use DOM, not innerHTML with user data
  suggestionsList.innerHTML = "";
  suggestions.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
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

function renderLanguageChart(repos) {
  const data = getLanguageData(repos).slice(0, 6);
  if (!data.length) {
    languageChart.innerHTML = `<div class="empty-state">No language data available.</div>`;
    return;
  }

  // XSS-safe — language names come from GitHub API, generally safe, but use textContent nodes
  languageChart.innerHTML = "";
  data.forEach((lang) => {
    const row   = document.createElement("div");
    row.className = "language-row";

    const name  = document.createElement("div");
    name.className = "language-name";
    name.textContent = lang.name;

    const track = document.createElement("div");
    track.className = "language-track";
    const fill = document.createElement("div");
    fill.className = "language-fill";
    fill.style.width = `${lang.percent}%`;
    track.appendChild(fill);

    const pct   = document.createElement("div");
    pct.className = "language-percent";
    pct.textContent = `${lang.percent}%`;

    row.appendChild(name);
    row.appendChild(track);
    row.appendChild(pct);
    languageChart.appendChild(row);
  });
}

function populateLanguageFilter(repos) {
  const languages   = [...new Set(repos.map((r) => r.language || "Other"))].sort();
  const currentVal  = languageFilter.value;
  languageFilter.innerHTML = "";

  const all = document.createElement("option");
  all.value = "all";
  all.textContent = "All languages";
  languageFilter.appendChild(all);

  languages.forEach((lang) => {
    const opt = document.createElement("option");
    opt.value = lang;
    opt.textContent = lang;
    languageFilter.appendChild(opt);
  });

  if ([...languageFilter.options].some((o) => o.value === currentVal)) {
    languageFilter.value = currentVal;
  }
}

function getFilteredAndSortedRepos() {
  let repos = [...currentRepos];
  const lang = languageFilter.value;
  const sort = sortSelect.value;

  if (lang !== "all") repos = repos.filter((r) => (r.language || "Other") === lang);

  switch (sort) {
    case "stars":   repos.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)); break;
    case "forks":   repos.sort((a, b) => (b.forks_count || 0) - (a.forks_count || 0)); break;
    case "name":    repos.sort((a, b) => a.name.localeCompare(b.name)); break;
    case "updated":
    default:        repos.sort((a, b) => new Date(lastActivity(b)) - new Date(lastActivity(a))); break;
  }

  return repos;
}

function renderReposSection() {
  const repos = getFilteredAndSortedRepos();

  const forkNote = currentForkCount
    ? ` · ${currentForkCount} fork${currentForkCount !== 1 ? "s" : ""} hidden`
    : "";

  if (!repos.length) {
    const msg = currentRepos.length ? "No repositories match the selected filter." : "No original public repositories found.";
    repoList.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = msg;
    repoList.appendChild(empty);
    repoCountLabel.textContent = forkNote.replace(/^ · /, "");
    return;
  }

  repoCountLabel.textContent = `${repos.length} repositor${repos.length !== 1 ? "ies" : "y"}${forkNote}`;
  repoList.innerHTML = "";
  repos.forEach((repo) => repoList.appendChild(createRepoCard(repo)));
}

// Built with DOM nodes so repo data is never parsed as HTML
function createRepoCard(repo) {
  const article = document.createElement("article");
  article.className = "repo-item";

  // Left side
  const left = document.createElement("div");
  left.className = "repo-left";

  const top = document.createElement("div");
  top.className = "repo-top";

  const title = document.createElement("h4");
  title.textContent = repo.name;
  top.appendChild(title);

  // Open issues badge
  const openIssues = repo.open_issues_count || 0;
  if (openIssues > 0) {
    const badge = document.createElement("span");
    badge.className = "issues-badge";
    badge.textContent = `${openIssues} open issue${openIssues !== 1 ? "s" : ""}`;
    top.appendChild(badge);
  }

  left.appendChild(top);

  const desc = document.createElement("p");
  desc.textContent = repo.description || "No description available for this repository.";
  left.appendChild(desc);

  const meta = document.createElement("div");
  meta.className = "repo-meta";

  const pills = [
    { icon: "fa-solid fa-star",       text: `${formatNumber(repo.stargazers_count)} stars` },
    { icon: "fa-solid fa-code-fork",  text: `${formatNumber(repo.forks_count)} forks` },
    { icon: "fa-solid fa-code",       text: repo.language || "Other" },
    { icon: "fa-regular fa-calendar", text: formatDate(lastActivity(repo)) },
  ];
  // Only show size if non-zero
  if (repo.size > 0) {
    pills.push({ icon: "fa-solid fa-box-archive", text: `${formatNumber(repo.size)} KB` });
  }

  pills.forEach(({ icon, text }) => {
    const pill = document.createElement("span");
    pill.className = "pill";
    const i = document.createElement("i");
    i.className = icon;
    i.setAttribute("aria-hidden", "true");
    pill.appendChild(i);
    pill.append(` ${text}`);
    meta.appendChild(pill);
  });

  left.appendChild(meta);
  article.appendChild(left);

  // Right side — actions
  const actions = document.createElement("div");
  actions.className = "repo-actions";

  const viewBtn = document.createElement("a");
  viewBtn.className = "action-btn primary-btn";
  viewBtn.rel = "noopener noreferrer";
  viewBtn.target = "_blank";
  // validate URL before setting href
  const repoUrl = repo.html_url && repo.html_url.startsWith("https://github.com/") ? repo.html_url : "#";
  viewBtn.href = repoUrl;
  const ghIcon = document.createElement("i");
  ghIcon.className = "fa-brands fa-github";
  ghIcon.setAttribute("aria-hidden", "true");
  viewBtn.appendChild(ghIcon);
  viewBtn.append(" View repo");
  actions.appendChild(viewBtn);

  const demoUrl = normalizeUrl(repo.homepage || "");
  if (demoUrl) {
    const demoBtn = document.createElement("a");
    demoBtn.className = "action-btn";
    demoBtn.href = demoUrl;
    demoBtn.rel = "noopener noreferrer";
    demoBtn.target = "_blank";
    const extIcon = document.createElement("i");
    extIcon.className = "fa-solid fa-arrow-up-right-from-square";
    extIcon.setAttribute("aria-hidden", "true");
    demoBtn.appendChild(extIcon);
    demoBtn.append(" Live demo");
    actions.appendChild(demoBtn);
  }

  article.appendChild(actions);
  return article;
}

// ─── Recent searches ─────────────────────────────────────────────────────────

// localStorage can be blocked or hold a corrupted value; fall back to an empty list
function readRecentSearches() {
  try {
    const parsed = JSON.parse(localStorage.getItem("devscope-recent") || "[]");
    return Array.isArray(parsed) ? parsed.filter((i) => typeof i === "string") : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(username) {
  const normalized = username.toLowerCase();
  const searches = [normalized, ...readRecentSearches().filter((i) => i !== normalized)].slice(0, 5);
  try {
    localStorage.setItem("devscope-recent", JSON.stringify(searches));
  } catch {
    // Storage unavailable; recent searches just won't persist
  }
  renderRecentSearches();
}

function renderRecentSearches() {
  const searches = readRecentSearches();

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

// ─── Summary text ─────────────────────────────────────────────────────────────

function buildSummaryText() {
  const lines = [
    "DevScope Summary",
    "",
    `Profile: ${profileName.textContent} (${profileUsername.textContent})`,
    `Profile Score: ${healthScore.textContent}`,
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

  suggestionsList.querySelectorAll("li").forEach((li) => lines.push(`- ${li.textContent}`));
  return lines.join("\n");
}

// ─── Messages ────────────────────────────────────────────────────────────────

function showMessage(text, type = "error") {
  messageBox.textContent = text;
  messageBox.className = `message-box ${type}`;
  messageBox.classList.remove("hidden");
}

function hideMessage() {
  messageBox.textContent = "";
  messageBox.classList.add("hidden");
}

// ─── Loading / error UI ───────────────────────────────────────────────────────

function resetDashboardToEmpty() {
  currentProfile   = null;
  currentRepos     = [];
  currentForkCount = 0;

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

  ["repoCount","starsCount","forksCount","followersCount","healthScore",
   "bestRepoHighlight","topLanguageHighlight","recentRepoHighlight",
   "accountAgeHighlight","bestRepoTitle"].forEach((id) => setText(document.getElementById(id), "--"));

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

function setLoadingUI() {
  setText(profileName,     "Loading profile...");
  setText(profileUsername, "@please-wait");
  setText(profileBio,      "Fetching GitHub data...");

  profileLocation.innerHTML = `<i class="fa-solid fa-location-dot" aria-hidden="true"></i> Please wait`;
  profileCompany.innerHTML  = `<i class="fa-solid fa-building" aria-hidden="true"></i> Please wait`;
  profileJoined.classList.add("hidden");
  profileBlog.classList.add("hidden");

  ["repoCount","starsCount","forksCount","followersCount"].forEach((id) => setText(document.getElementById(id), "…"));

  setText(healthScore,  "…");
  setText(healthRemark, "Reviewing repositories and profile activity...");
  setScoreRing(10);

  ["bestRepoHighlight","topLanguageHighlight","recentRepoHighlight","accountAgeHighlight"].forEach((id) =>
    setText(document.getElementById(id), "Loading…"));

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

function setErrorUI(message = "No public repositories found for this profile.") {
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

function setButtonLoading(btn, text) {
  // Keep the first original label if a second request starts while one is in flight
  if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = text;
}

function resetButton(btn) {
  btn.disabled = false;
  if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
  delete btn.dataset.originalText;
}

// ─── GitHub API ───────────────────────────────────────────────────────────────

function isRateLimited(res) {
  return res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0");
}

function rateLimitMessage(res) {
  const reset = Number(res.headers.get("x-ratelimit-reset"));
  if (!reset) return "GitHub API rate limit reached. Please wait a few minutes and try again.";
  const time = new Date(reset * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `GitHub API rate limit reached. It resets at ${time}.`;
}

async function fetchJson(url, fallbackMessage, notFoundMessage) {
  const res  = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (isRateLimited(res)) throw new Error(rateLimitMessage(res));
    if (res.status === 404 && notFoundMessage) throw new Error(notFoundMessage);
    throw new Error(data.message || fallbackMessage);
  }
  return data;
}

async function fetchGitHubProfile(username) {
  const base = `https://api.github.com/users/${encodeURIComponent(username)}`;
  const profile = await fetchJson(base, "Unable to fetch GitHub profile.", `GitHub user "${username}" not found.`);

  // Up to 100 repos (GitHub API max per page)
  const allRepos = await fetchJson(`${base}/repos?per_page=100&sort=pushed`, "Unable to fetch repositories.");

  // Forks are someone else's work, so they're left out of the analysis
  const repos = allRepos.filter((r) => !r.fork);

  return {
    profile,
    repos,
    forkCount: allRepos.length - repos.length,
    truncated: (profile.public_repos || 0) > allRepos.length
  };
}

// ─── Compare ──────────────────────────────────────────────────────────────────

function getCompareValues({ profile, repos }) {
  return {
    "Profile score": calculateHealthScore(profile, repos),
    "Repositories":  profile.public_repos || repos.length,
    "Stars":         getTotalStars(repos),
    "Forks":         getTotalForks(repos),
    "Followers":     profile.followers || 0,
    "Active repos":  getActiveRepos(repos),
  };
}

function compareClass(own, other) {
  if (own > other) return "win";
  return own === other ? "tie" : "";
}

function createCompareCards(first, second) {
  const valuesA = getCompareValues(first);
  const valuesB = getCompareValues(second);

  const metrics = Object.keys(valuesA).map((label) => ({
    label,
    valA: formatNumber(valuesA[label]),
    valB: formatNumber(valuesB[label]),
    clsA: compareClass(valuesA[label], valuesB[label]),
    clsB: compareClass(valuesB[label], valuesA[label]),
  }));

  const wrapper = document.createElement("div");
  wrapper.className = "compare-cards-wrapper";

  [first, second].forEach((data, idx) => {
    const card = document.createElement("div");
    card.className = "compare-card";

    const header = document.createElement("div");
    header.className = "compare-card-header";

    const img = document.createElement("img");
    img.src = data.profile.avatar_url || "";
    img.alt = data.profile.login || "";
    header.appendChild(img);

    const info = document.createElement("div");
    const h4 = document.createElement("h4");
    h4.textContent = data.profile.name || data.profile.login;
    const p = document.createElement("p");
    p.textContent = `@${data.profile.login}`;
    info.appendChild(h4);
    info.appendChild(p);
    header.appendChild(info);
    card.appendChild(header);

    const stats = document.createElement("div");
    stats.className = "compare-stats";

    metrics.forEach((m) => {
      const item = document.createElement("div");
      item.className = `compare-item ${idx === 0 ? m.clsA : m.clsB}`;
      const span = document.createElement("span");
      span.textContent = m.label;
      const strong = document.createElement("strong");
      strong.textContent = idx === 0 ? m.valA : m.valB;
      item.appendChild(span);
      item.appendChild(strong);
      stats.appendChild(item);
    });

    // Extra info rows (no win/loss)
    const infoRows = [
      ["Primary language", getPrimaryLanguage(data.repos)],
      ["Top repo",         getTopRepo(data.repos)?.name || "--"],
    ];
    infoRows.forEach(([label, value]) => {
      const item = document.createElement("div");
      item.className = "compare-item info-item";
      const span = document.createElement("span");
      span.textContent = label;
      const strong = document.createElement("strong");
      strong.textContent = value;
      item.appendChild(span);
      item.appendChild(strong);
      stats.appendChild(item);
    });

    card.appendChild(stats);
    wrapper.appendChild(card);
  });

  return wrapper;
}

async function compareGitHubUsers(user1, user2) {
  const requestId = ++compareRequestId;
  hideMessage();
  compareSection.classList.remove("hidden");
  compareGrid.innerHTML = `<div class="loading-state loading-shimmer">Comparing profiles…</div>`;
  setButtonLoading(compareBtn, "Comparing…");

  try {
    const [first, second] = await Promise.all([fetchGitHubProfile(user1), fetchGitHubProfile(user2)]);
    if (requestId !== compareRequestId) return;
    compareGrid.innerHTML = "";
    compareGrid.appendChild(createCompareCards(first, second));
  } catch (error) {
    if (requestId !== compareRequestId) return;
    compareGrid.innerHTML = "";
    const err = document.createElement("div");
    err.className = "empty-state";
    err.textContent = error.message || "Comparison failed.";
    compareGrid.appendChild(err);
    showMessage(error.message || "Comparison failed.");
  } finally {
    if (requestId === compareRequestId) resetButton(compareBtn);
  }
}

// ─── Main load ────────────────────────────────────────────────────────────────

async function loadGitHubUser(username) {
  const requestId = ++loadRequestId;
  hideMessage();
  setButtonLoading(analyzeBtn, "Loading…");
  setLoadingUI();

  try {
    const data = await fetchGitHubProfile(username);
    if (requestId !== loadRequestId) return;
    renderProfile(data);
    saveRecentSearch(data.profile.login || username);
  } catch (error) {
    if (requestId !== loadRequestId) return;
    showMessage(error.message || "Something went wrong while fetching data.");
    resetDashboardToEmpty();
    setErrorUI();
    setText(profileBio, "Could not load this profile. Try another public GitHub username.");
    // Show rate limit notice if it's a rate limit error
    if (error.message && error.message.toLowerCase().includes("rate limit")) {
      rateLimitNotice.classList.remove("hidden");
    }
  } finally {
    if (requestId === loadRequestId) resetButton(analyzeBtn);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  initTheme();
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