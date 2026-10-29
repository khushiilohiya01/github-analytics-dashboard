// ─── Repository list ─────────────────────────────────────────────────────────

import { state } from "../state.js";
import { formatNumber, formatDate, lastActivity, normalizeUrl } from "../utils.js";
import { repoList, repoCountLabel, sortSelect, languageFilter } from "../dom.js";

export function populateLanguageFilter(repos) {
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
  let repos = [...state.repos];
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

export function renderReposSection() {
  const repos = getFilteredAndSortedRepos();

  const forkNote = state.forkCount
    ? ` · ${state.forkCount} fork${state.forkCount !== 1 ? "s" : ""} hidden`
    : "";

  if (!repos.length) {
    const msg = state.repos.length ? "No repositories match the selected filter." : "No original public repositories found.";
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
