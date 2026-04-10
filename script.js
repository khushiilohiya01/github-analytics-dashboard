const themeToggle = document.getElementById("themeToggle");
const body = document.body;

const searchForm = document.getElementById("searchForm");
const compareForm = document.getElementById("compareForm");

const usernameInput = document.getElementById("usernameInput");
const compareUser1 = document.getElementById("compareUser1");
const compareUser2 = document.getElementById("compareUser2");

const analyzeBtn = document.getElementById("analyzeBtn");
const compareBtn = document.getElementById("compareBtn");

const copySummaryBtn = document.getElementById("copySummaryBtn");
const exportSummaryBtn = document.getElementById("exportSummaryBtn");

const messageBox = document.getElementById("messageBox");

const compareSection = document.getElementById("compareSection");
const compareGrid = document.getElementById("compareGrid");

const profileAvatar = document.getElementById("profileAvatar");
const profileName = document.getElementById("profileName");
const profileUsername = document.getElementById("profileUsername");
const profileBio = document.getElementById("profileBio");
const profileLocation = document.getElementById("profileLocation");
const profileCompany = document.getElementById("profileCompany");
const profileBlog = document.getElementById("profileBlog");

const repoCount = document.getElementById("repoCount");
const starsCount = document.getElementById("starsCount");
const forksCount = document.getElementById("forksCount");
const followersCount = document.getElementById("followersCount");

const healthScore = document.getElementById("healthScore");
const healthRemark = document.getElementById("healthRemark");
const scoreRing = document.getElementById("scoreRing");

const languageChart = document.getElementById("languageChart");
const contributionGraph = document.getElementById("contributionGraph");

const bestRepoHighlight = document.getElementById("bestRepoHighlight");
const topLanguageHighlight = document.getElementById("topLanguageHighlight");
const recentRepoHighlight = document.getElementById("recentRepoHighlight");

const bestRepoTitle = document.getElementById("bestRepoTitle");
const bestRepoReason = document.getElementById("bestRepoReason");
const aiSummary = document.getElementById("aiSummary");
const suggestionsList = document.getElementById("suggestionsList");

const activityScore = document.getElementById("activityScore");
const popularityScore = document.getElementById("popularityScore");
const documentationScore = document.getElementById("documentationScore");
const visibilityScore = document.getElementById("visibilityScore");

const activityBar = document.getElementById("activityBar");
const popularityBar = document.getElementById("popularityBar");
const documentationBar = document.getElementById("documentationBar");
const visibilityBar = document.getElementById("visibilityBar");

const repoList = document.getElementById("repoList");
const sortSelect = document.getElementById("sortSelect");
const languageFilter = document.getElementById("languageFilter");

const recentSearchesContainer = document.getElementById("recentSearches");
const clearRecentBtn = document.getElementById("clearRecentBtn");

let currentProfile = null;
let currentRepos = [];

themeToggle.addEventListener("click", () => {
  body.classList.toggle("light-mode");
  const icon = themeToggle.querySelector("i");
  icon.className = body.classList.contains("light-mode")
    ? "fa-solid fa-sun"
    : "fa-solid fa-moon";

  localStorage.setItem(
    "devscope-theme",
    body.classList.contains("light-mode") ? "light" : "dark"
  );
});

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  if (!username) return;
  await loadGitHubUser(username);
});

compareForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user1 = compareUser1.value.trim();
  const user2 = compareUser2.value.trim();
  if (!user1 || !user2) return;
  await compareGitHubUsers(user1, user2);
});

sortSelect.addEventListener("change", renderReposSection);
languageFilter.addEventListener("change", renderReposSection);

clearRecentBtn.addEventListener("click", () => {
  localStorage.removeItem("devscope-recent");
  renderRecentSearches();
});

copySummaryBtn.addEventListener("click", async () => {
  const text = buildSummaryText();
  try {
    await navigator.clipboard.writeText(text);
    showMessage("Summary copied successfully.");
    setTimeout(hideMessage, 1800);
  } catch {
    showMessage("Could not copy summary. Please try again.");
  }
});

exportSummaryBtn.addEventListener("click", () => {
  const text = buildSummaryText();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${(currentProfile?.login || "devscope-summary")}-summary.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
});

function initTheme() {
  const savedTheme = localStorage.getItem("devscope-theme");
  if (savedTheme === "light") {
    body.classList.add("light-mode");
    themeToggle.querySelector("i").className = "fa-solid fa-sun";
  }
}

function formatNumber(num) {
  return Number(num || 0).toLocaleString();
}

function safeText(value, fallback = "Not available") {
  return value && String(value).trim() ? value : fallback;
}

function normalizeUrl(url) {
  if (!url || !url.trim()) return "";
  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
}

function formatDate(dateString) {
  if (!dateString) return "Unknown";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function daysSince(dateString) {
  if (!dateString) return 9999;
  const now = new Date();
  const target = new Date(dateString);
  const diff = now - target;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getTotalStars(repos) {
  return repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
}

function getTotalForks(repos) {
  return repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);
}

function getActiveRepos(repos) {
  return repos.filter((repo) => daysSince(repo.updated_at) <= 60).length;
}

function getLanguageData(repos) {
  const map = {};

  repos.forEach((repo) => {
    const language = repo.language || "Other";
    map[language] = (map[language] || 0) + 1;
  });

  const total = repos.length || 1;

  return Object.entries(map)
    .map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / total) * 100)
    }))
    .sort((a, b) => b.count - a.count);
}

function getPrimaryLanguage(repos) {
  const languageData = getLanguageData(repos);
  return languageData.length ? languageData[0].name : "--";
}

function getTopRepo(repos) {
  if (!repos.length) return null;
  return [...repos].sort(
    (a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)
  )[0];
}

function getMostRecentlyUpdatedRepo(repos) {
  if (!repos.length) return null;
  return [...repos].sort(
    (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
  )[0];
}

function getBestRepoRecommendation(repos) {
  if (!repos.length) return null;

  const scoredRepos = repos.map((repo) => {
    const stars = repo.stargazers_count || 0;
    const forks = repo.forks_count || 0;
    const hasDescription = repo.description && repo.description.trim() ? 1 : 0;
    const recentScore = daysSince(repo.updated_at) <= 60 ? 20 : 0;
    const score = stars * 2 + forks + hasDescription * 12 + recentScore;
    return { repo, score };
  });

  scoredRepos.sort((a, b) => b.score - a.score);
  return scoredRepos[0].repo;
}

function calculateBreakdown(profile, repos) {
  const repoTotal = profile.public_repos || repos.length || 0;
  const stars = getTotalStars(repos);
  const forks = getTotalForks(repos);
  const followers = profile.followers || 0;

  const activeRepos = getActiveRepos(repos);
  const describedRepos = repos.filter((repo) => repo.description && repo.description.trim()).length;

  const activity = repos.length ? Math.round((activeRepos / repos.length) * 100) : 0;
  const popularity = Math.min(100, Math.round((stars / 4) + (forks / 8)));
  const documentation = repos.length
    ? Math.round((describedRepos / repos.length) * 100)
    : 0;
  const visibility = Math.min(100, Math.round((followers / 5) + Math.min(repoTotal * 2, 20)));

  return { activity, popularity, documentation, visibility };
}

function calculateHealthScore(profile, repos) {
  const breakdown = calculateBreakdown(profile, repos);
  const score =
    breakdown.activity * 0.30 +
    breakdown.popularity * 0.28 +
    breakdown.documentation * 0.20 +
    breakdown.visibility * 0.22;

  return Math.min(100, Math.round(score));
}

function getHealthRemark(score) {
  if (score >= 85) {
    return "Very strong public profile with good activity, visibility, and project quality.";
  }
  if (score >= 70) {
    return "Strong profile with solid public work and healthy repository signals.";
  }
  if (score >= 55) {
    return "Good foundation with room to improve consistency and visibility.";
  }
  return "Early-stage public profile with clear room to grow through stronger projects and regular updates.";
}

function setScoreRing(score) {
  if (typeof score !== "number") {
    scoreRing.style.setProperty("--score-angle", "10deg");
    return;
  }
  const angle = Math.max(10, Math.min(360, Math.round((score / 100) * 360)));
  scoreRing.style.setProperty("--score-angle", `${angle}deg`);
}

function setBreakdownUI(breakdown) {
  activityScore.textContent = breakdown.activity === null ? "--" : breakdown.activity;
  popularityScore.textContent = breakdown.popularity === null ? "--" : breakdown.popularity;
  documentationScore.textContent = breakdown.documentation === null ? "--" : breakdown.documentation;
  visibilityScore.textContent = breakdown.visibility === null ? "--" : breakdown.visibility;

  activityBar.style.width = `${breakdown.activity || 0}%`;
  popularityBar.style.width = `${breakdown.popularity || 0}%`;
  documentationBar.style.width = `${breakdown.documentation || 0}%`;
  visibilityBar.style.width = `${breakdown.visibility || 0}%`;
}

function generateAISummary(profile, repos, score) {
  const primaryLanguage = getPrimaryLanguage(repos);
  const activeRepos = getActiveRepos(repos);
  const topRepo = getTopRepo(repos);
  const repoTotal = profile.public_repos || repos.length;

  return `${profile.name || profile.login} has ${repoTotal} public repositories and appears to work mostly with ${primaryLanguage}. The current profile score is ${score}/100. ${activeRepos >= 3 ? "There is visible recent activity across the profile." : "Recent public activity looks somewhat limited."} ${topRepo ? `${topRepo.name} looks like the strongest repository to highlight right now.` : "A stronger standout project would improve the overall profile."}`;
}

function generateSuggestions(profile, repos) {
  const suggestions = [];
  const stars = getTotalStars(repos);
  const activeRepos = getActiveRepos(repos);
  const describedRepos = repos.filter((repo) => repo.description && repo.description.trim()).length;
  const languageCount = getLanguageData(repos).length;
  const followers = profile.followers || 0;

  if (activeRepos <= 1 && repos.length > 0) {
    suggestions.push("Try updating a few repositories more regularly so the profile feels more active.");
  }

  if (describedRepos < Math.ceil(repos.length * 0.5)) {
    suggestions.push("Add clearer descriptions to more repositories so visitors understand the work faster.");
  }

  if (stars < 30) {
    suggestions.push("One polished flagship project could make the profile much more memorable.");
  }

  if (languageCount <= 1 && repos.length >= 4) {
    suggestions.push("A little more project variety could make the profile feel more rounded.");
  }

  if (followers < 20) {
    suggestions.push("Pinning stronger work and sharing polished projects could improve profile visibility.");
  }

  if (!suggestions.length) {
    suggestions.push("The profile already looks solid. The next step is making one project especially standout.");
  }

  return suggestions.slice(0, 4);
}

function renderContributionGraph(username) {
  if (!username) {
    contributionGraph.innerHTML = `<div class="empty-state">No contribution data available.</div>`;
    return;
  }

  const url = `https://ghchart.rshah.org/${username}`;

  contributionGraph.innerHTML = `
    <img src="${url}" alt="GitHub Contribution Graph for ${username}" />
  `;
}

function renderProfile(profile, repos) {
  currentProfile = profile;
  currentRepos = repos;

  const totalStars = getTotalStars(repos);
  const totalForks = getTotalForks(repos);
  const primaryLanguage = getPrimaryLanguage(repos);
  const topRepo = getTopRepo(repos);
  const recentRepo = getMostRecentlyUpdatedRepo(repos);
  const bestRepo = getBestRepoRecommendation(repos);
  const breakdown = calculateBreakdown(profile, repos);
  const score = calculateHealthScore(profile, repos);
  const suggestions = generateSuggestions(profile, repos);

  profileAvatar.src = profile.avatar_url || "";
  profileAvatar.alt = profile.name || profile.login || "Profile";

  profileName.textContent = profile.name || "No Name";
  profileUsername.textContent = `@${profile.login || "unknown"}`;
  profileBio.textContent = profile.bio || "No bio available.";

  profileLocation.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${safeText(profile.location)}`;
  profileCompany.innerHTML = `<i class="fa-solid fa-building"></i> ${safeText(profile.company)}`;

  const blog = normalizeUrl(profile.blog || "");
  if (blog) {
    profileBlog.href = blog;
    profileBlog.classList.remove("hidden");
    profileBlog.innerHTML = `<i class="fa-solid fa-link"></i> Website`;
  } else {
    profileBlog.classList.add("hidden");
  }

  repoCount.textContent = formatNumber(profile.public_repos || repos.length);
  starsCount.textContent = formatNumber(totalStars);
  forksCount.textContent = formatNumber(totalForks);
  followersCount.textContent = formatNumber(profile.followers || 0);

  healthScore.textContent = score;
  healthRemark.textContent = getHealthRemark(score);
  setScoreRing(score);
  setBreakdownUI(breakdown);

  bestRepoHighlight.textContent = topRepo
    ? `${topRepo.name} (${formatNumber(topRepo.stargazers_count)} stars)`
    : "--";

  topLanguageHighlight.textContent = primaryLanguage;

  recentRepoHighlight.textContent = recentRepo
    ? `${recentRepo.name} • ${formatDate(recentRepo.updated_at)}`
    : "--";

  bestRepoTitle.textContent = bestRepo ? bestRepo.name : "--";
  bestRepoReason.textContent = bestRepo
    ? "This repository stands out because it combines visibility, recent activity, and decent presentation."
    : "--";

  aiSummary.textContent = generateAISummary(profile, repos, score);
  suggestionsList.innerHTML = suggestions.map((item) => `<li>${item}</li>`).join("");

  renderLanguageChart(repos);
  populateLanguageFilter(repos);
  renderContributionGraph(profile.login);
  renderReposSection();
}

function renderLanguageChart(repos) {
  const languageData = getLanguageData(repos).slice(0, 6);

  if (!languageData.length) {
    languageChart.innerHTML = `<div class="empty-state">No language data available.</div>`;
    return;
  }

  languageChart.innerHTML = languageData
    .map(
      (lang) => `
        <div class="language-row">
          <div class="language-name">${lang.name}</div>
          <div class="language-track">
            <div class="language-fill" style="width: ${lang.percent}%"></div>
          </div>
          <div class="language-percent">${lang.percent}%</div>
        </div>
      `
    )
    .join("");
}

function populateLanguageFilter(repos) {
  const languages = [...new Set(repos.map((repo) => repo.language || "Other"))].sort();
  const currentValue = languageFilter.value;

  languageFilter.innerHTML = `<option value="all">All Languages</option>`;

  languages.forEach((lang) => {
    const option = document.createElement("option");
    option.value = lang;
    option.textContent = lang;
    languageFilter.appendChild(option);
  });

  if ([...languageFilter.options].some((opt) => opt.value === currentValue)) {
    languageFilter.value = currentValue;
  }
}

function getFilteredAndSortedRepos() {
  let repos = [...currentRepos];

  const selectedLanguage = languageFilter.value;
  const selectedSort = sortSelect.value;

  if (selectedLanguage !== "all") {
    repos = repos.filter((repo) => (repo.language || "Other") === selectedLanguage);
  }

  switch (selectedSort) {
    case "stars":
      repos.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
      break;
    case "forks":
      repos.sort((a, b) => (b.forks_count || 0) - (a.forks_count || 0));
      break;
    case "name":
      repos.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "updated":
    default:
      repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      break;
  }

  return repos;
}

function renderReposSection() {
  const repos = getFilteredAndSortedRepos();

  if (!repos.length) {
    repoList.innerHTML = `<div class="empty-state">No repositories match the selected filter.</div>`;
    return;
  }

  repoList.innerHTML = repos.map(createRepoCard).join("");
}

function createRepoCard(repo) {
  const demoLink = repo.homepage && repo.homepage.trim() ? normalizeUrl(repo.homepage) : "";

  return `
    <article class="repo-item">
      <div class="repo-left">
        <div class="repo-top">
          <h4>${repo.name}</h4>
        </div>

        <p>${repo.description || "No description available for this repository."}</p>

        <div class="repo-meta">
          <span class="pill">⭐ ${formatNumber(repo.stargazers_count)} Stars</span>
          <span class="pill">🍴 ${formatNumber(repo.forks_count)} Forks</span>
          <span class="pill">💻 ${repo.language || "Other"}</span>
          <span class="pill">📅 ${formatDate(repo.updated_at)}</span>
          <span class="pill">📦 ${formatNumber(repo.size)} KB</span>
        </div>
      </div>

      <div class="repo-actions">
        <a class="action-btn primary-btn" href="${repo.html_url}" target="_blank" rel="noopener noreferrer">
          <i class="fa-brands fa-github"></i> View Repo
        </a>
        ${
          demoLink
            ? `<a class="action-btn" href="${demoLink}" target="_blank" rel="noopener noreferrer">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Live Demo
              </a>`
            : ""
        }
      </div>
    </article>
  `;
}

function saveRecentSearch(username) {
  const normalized = username.toLowerCase();
  let searches = JSON.parse(localStorage.getItem("devscope-recent") || "[]");
  searches = [normalized, ...searches.filter((item) => item !== normalized)].slice(0, 5);
  localStorage.setItem("devscope-recent", JSON.stringify(searches));
  renderRecentSearches();
}

function renderRecentSearches() {
  const searches = JSON.parse(localStorage.getItem("devscope-recent") || "[]");

  if (!searches.length) {
    recentSearchesContainer.innerHTML = `<span class="empty-state">No recent searches yet.</span>`;
    return;
  }

  recentSearchesContainer.innerHTML = searches
    .map(
      (item) => `<button type="button" class="recent-chip" data-username="${item}">@${item}</button>`
    )
    .join("");

  document.querySelectorAll(".recent-chip").forEach((chip) => {
    chip.addEventListener("click", async () => {
      const username = chip.dataset.username;
      usernameInput.value = username;
      await loadGitHubUser(username);
    });
  });
}

function buildSummaryText() {
  const lines = [
    `DevScope Summary`,
    ``,
    `Profile: ${profileName.textContent} (${profileUsername.textContent})`,
    `Profile Score: ${healthScore.textContent}`,
    `Repositories: ${repoCount.textContent}`,
    `Stars: ${starsCount.textContent}`,
    `Forks: ${forksCount.textContent}`,
    `Followers: ${followersCount.textContent}`,
    `Primary Language: ${topLanguageHighlight.textContent}`,
    `Best Repository: ${bestRepoHighlight.textContent}`,
    `Latest Updated Repo: ${recentRepoHighlight.textContent}`,
    ``,
    `Quick Profile Read:`,
    `${aiSummary.textContent}`,
    ``,
    `Best Repo to Show:`,
    `${bestRepoTitle.textContent}`,
    `${bestRepoReason.textContent}`,
    ``,
    `Possible Improvements:`
  ];

  document.querySelectorAll("#suggestionsList li").forEach((li) => {
    lines.push(`- ${li.textContent}`);
  });

  return lines.join("\n");
}

function showMessage(text) {
  messageBox.textContent = text;
  messageBox.classList.remove("hidden");
}

function hideMessage() {
  messageBox.textContent = "";
  messageBox.classList.add("hidden");
}

function resetDashboardToEmpty() {
  currentProfile = null;
  currentRepos = [];

  profileAvatar.src = "";
  profileAvatar.alt = "Profile Avatar";
  profileName.textContent = "No profile selected";
  profileUsername.textContent = "@search-a-username";
  profileBio.textContent = "Search a public GitHub username to load profile details and repository insights.";

  profileLocation.innerHTML = `<i class="fa-solid fa-location-dot"></i> Not available`;
  profileCompany.innerHTML = `<i class="fa-solid fa-building"></i> Not available`;
  profileBlog.classList.add("hidden");

  repoCount.textContent = "--";
  starsCount.textContent = "--";
  forksCount.textContent = "--";
  followersCount.textContent = "--";

  healthScore.textContent = "--";
  healthRemark.textContent = "Load a profile to see the score based on public activity, visibility, and repository details.";
  setScoreRing(null);

  bestRepoHighlight.textContent = "--";
  topLanguageHighlight.textContent = "--";
  recentRepoHighlight.textContent = "--";

  bestRepoTitle.textContent = "--";
  bestRepoReason.textContent = "Load a profile to identify the strongest repository to highlight.";
  aiSummary.textContent = "Search a profile to generate a quick review.";
  suggestionsList.innerHTML = `<li>Search a profile to see practical suggestions based on public repository data.</li>`;

  setBreakdownUI({
    activity: null,
    popularity: null,
    documentation: null,
    visibility: null
  });

  languageChart.innerHTML = `<div class="empty-state">Search a profile to view language distribution.</div>`;
  contributionGraph.innerHTML = `<div class="empty-state">Search a profile to view contribution activity.</div>`;
  repoList.innerHTML = `<div class="empty-state">Search a profile to review repositories.</div>`;
}

function setLoadingUI() {
  profileAvatar.src = "";
  profileName.textContent = "Loading profile...";
  profileUsername.textContent = "@please-wait";
  profileBio.textContent = "Fetching GitHub data...";
  profileLocation.innerHTML = `<i class="fa-solid fa-location-dot"></i> Please wait`;
  profileCompany.innerHTML = `<i class="fa-solid fa-building"></i> Please wait`;
  profileBlog.classList.add("hidden");

  repoCount.textContent = "...";
  starsCount.textContent = "...";
  forksCount.textContent = "...";
  followersCount.textContent = "...";

  healthScore.textContent = "...";
  healthRemark.textContent = "Reviewing repositories and profile activity...";
  setScoreRing(10);

  bestRepoHighlight.textContent = "Loading...";
  topLanguageHighlight.textContent = "Loading...";
  recentRepoHighlight.textContent = "Loading...";

  bestRepoTitle.textContent = "Loading...";
  bestRepoReason.textContent = "Finding the strongest project...";
  aiSummary.textContent = "Preparing summary...";
  suggestionsList.innerHTML = `<li>Preparing suggestions...</li>`;

  setBreakdownUI({
    activity: 0,
    popularity: 0,
    documentation: 0,
    visibility: 0
  });

  languageChart.innerHTML = `<div class="loading-state loading-shimmer">Loading language data...</div>`;
  contributionGraph.innerHTML = `<div class="loading-state loading-shimmer">Loading contribution activity...</div>`;
  repoList.innerHTML = `<div class="loading-state loading-shimmer">Loading repositories...</div>`;
}

function setErrorUI(message = "No public repositories were found for this profile.") {
  repoList.innerHTML = `<div class="empty-state">${message}</div>`;
  languageChart.innerHTML = `<div class="empty-state">No language data available.</div>`;
  contributionGraph.innerHTML = `<div class="empty-state">No contribution data available.</div>`;
  suggestionsList.innerHTML = `<li>No suggestion data available.</li>`;
}

function setButtonLoading(button, text) {
  button.disabled = true;
  button.dataset.originalText = button.textContent;
  button.textContent = text;
}

function resetButton(button) {
  button.disabled = false;
  if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
  }
}

async function fetchGitHubProfile(username) {
  const userResponse = await fetch(`https://api.github.com/users/${username}`);
  const userData = await userResponse.json();

  if (!userResponse.ok) {
    if (userResponse.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Please try again later.");
    }
    if (userResponse.status === 404) {
      throw new Error(`GitHub user "${username}" not found.`);
    }
    throw new Error(userData.message || "Unable to fetch GitHub profile.");
  }

  const repoResponse = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`
  );
  const repoData = await repoResponse.json();

  if (!repoResponse.ok) {
    if (repoResponse.status === 403) {
      throw new Error("GitHub repository rate limit exceeded. Please try again later.");
    }
    throw new Error(repoData.message || "Unable to fetch repositories.");
  }

  return {
    profile: userData,
    repos: repoData
  };
}

function createCompareCards(first, second) {
  const firstScore = calculateHealthScore(first.profile, first.repos);
  const secondScore = calculateHealthScore(second.profile, second.repos);

  const firstData = {
    score: firstScore,
    repoCount: first.profile.public_repos || first.repos.length,
    stars: getTotalStars(first.repos),
    forks: getTotalForks(first.repos),
    followers: first.profile.followers || 0,
    active: getActiveRepos(first.repos)
  };

  const secondData = {
    score: secondScore,
    repoCount: second.profile.public_repos || second.repos.length,
    stars: getTotalStars(second.repos),
    forks: getTotalForks(second.repos),
    followers: second.profile.followers || 0,
    active: getActiveRepos(second.repos)
  };

  function compareClass(a, b) {
    if (a > b) return "win";
    if (a === b) return "tie";
    return "";
  }

  function createCard(user, repos, selfData, opponentData) {
    return `
      <div class="compare-card">
        <div class="compare-card-header">
          <img src="${user.avatar_url}" alt="${user.login}" />
          <div>
            <h4>${user.name || user.login}</h4>
            <p>@${user.login}</p>
          </div>
        </div>

        <div class="compare-stats">
          <div class="compare-item ${compareClass(selfData.score, opponentData.score)}">
            <span>Profile Score</span>
            <strong>${selfData.score}</strong>
          </div>

          <div class="compare-item ${compareClass(selfData.repoCount, opponentData.repoCount)}">
            <span>Repositories</span>
            <strong>${formatNumber(selfData.repoCount)}</strong>
          </div>

          <div class="compare-item ${compareClass(selfData.stars, opponentData.stars)}">
            <span>Stars</span>
            <strong>${formatNumber(selfData.stars)}</strong>
          </div>

          <div class="compare-item ${compareClass(selfData.forks, opponentData.forks)}">
            <span>Forks</span>
            <strong>${formatNumber(selfData.forks)}</strong>
          </div>

          <div class="compare-item ${compareClass(selfData.followers, opponentData.followers)}">
            <span>Followers</span>
            <strong>${formatNumber(selfData.followers)}</strong>
          </div>

          <div class="compare-item ${compareClass(selfData.active, opponentData.active)}">
            <span>Active Repos</span>
            <strong>${formatNumber(selfData.active)}</strong>
          </div>

          <div class="compare-item info-item">
            <span>Primary Language</span>
            <strong>${getPrimaryLanguage(repos)}</strong>
          </div>

          <div class="compare-item info-item">
            <span>Top Repo</span>
            <strong>${getTopRepo(repos)?.name || "--"}</strong>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="compare-cards-wrapper">
      ${createCard(first.profile, first.repos, firstData, secondData)}
      ${createCard(second.profile, second.repos, secondData, firstData)}
    </div>
  `;
}

async function compareGitHubUsers(user1, user2) {
  hideMessage();
  compareSection.classList.remove("hidden");
  compareGrid.innerHTML = `
    <div class="loading-state loading-shimmer">Comparing profiles...</div>
  `;

  setButtonLoading(compareBtn, "Comparing...");

  try {
    const [first, second] = await Promise.all([
      fetchGitHubProfile(user1),
      fetchGitHubProfile(user2)
    ]);

    compareGrid.innerHTML = createCompareCards(first, second);
  } catch (error) {
    compareGrid.innerHTML = `<div class="empty-state">${error.message || "Comparison failed."}</div>`;
    showMessage(error.message || "Comparison failed.");
  } finally {
    resetButton(compareBtn);
  }
}

async function loadGitHubUser(username) {
  hideMessage();
  setButtonLoading(analyzeBtn, "Loading...");
  setLoadingUI();

  try {
    const { profile, repos } = await fetchGitHubProfile(username);
    renderProfile(profile, repos);
    saveRecentSearch(username);
  } catch (error) {
    showMessage(error.message || "Something went wrong while fetching data.");
    resetDashboardToEmpty();
    setErrorUI("No public repositories were found for this profile.");
    profileBio.textContent = "Could not load this profile. Try another public GitHub username.";
  } finally {
    resetButton(analyzeBtn);
  }
}

function renderDefaultData() {
  resetDashboardToEmpty();
  renderRecentSearches();
}

initTheme();
renderDefaultData();