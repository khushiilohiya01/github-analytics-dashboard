// ─── Profile analysis ────────────────────────────────────────────────────────
// Pure functions over GitHub API data: no DOM access, so they can be tested in isolation.

import { formatNumber, daysSince, lastActivity } from "./utils.js";

export function getTotalStars(repos) {
  return repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
}

export function getTotalForks(repos) {
  return repos.reduce((s, r) => s + (r.forks_count || 0), 0);
}

export function getActiveRepos(repos) {
  return repos.filter((r) => daysSince(lastActivity(r)) <= 60).length;
}

export function getLanguageData(repos) {
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

export function getPrimaryLanguage(repos) {
  const data = getLanguageData(repos);
  return data.length ? data[0].name : "--";
}

export function getTopRepo(repos) {
  if (!repos.length) return null;
  return [...repos].sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))[0];
}

export function getMostRecentlyUpdatedRepo(repos) {
  if (!repos.length) return null;
  return [...repos].sort((a, b) => new Date(lastActivity(b)) - new Date(lastActivity(a)))[0];
}

export function getBestRepoRecommendation(repos) {
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
export function getBestRepoReason(repo) {
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
export function getAccountAge(createdAt) {
  if (!createdAt) return null;
  const years  = Math.floor(daysSince(createdAt) / 365);
  const months = Math.floor((daysSince(createdAt) % 365) / 30);
  if (years >= 1) return `Member for ${years} year${years !== 1 ? "s" : ""}`;
  if (months >= 1) return `Member for ${months} month${months !== 1 ? "s" : ""}`;
  return "New member";
}

export function calculateBreakdown(profile, repos) {
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

export function calculateHealthScore(profile, repos) {
  const b = calculateBreakdown(profile, repos);
  return Math.min(100, Math.round(b.activity * 0.30 + b.popularity * 0.28 + b.documentation * 0.20 + b.visibility * 0.22));
}

export function getHealthRemark(score) {
  if (score >= 85) return "Very strong public profile with good activity, visibility, and project quality.";
  if (score >= 70) return "Strong profile with solid public work and healthy repository signals.";
  if (score >= 55) return "Good foundation with room to improve consistency and visibility.";
  return "Early-stage public profile with clear room to grow through stronger projects and regular updates.";
}

export function generateAISummary(profile, repos, score) {
  const lang       = getPrimaryLanguage(repos);
  const active     = getActiveRepos(repos);
  const bestRepo   = getBestRepoRecommendation(repos);
  const repoTotal  = profile.public_repos || repos.length;
  const age        = getAccountAge(profile.created_at);

  return `${profile.name || profile.login} has ${repoTotal} public repositories and works mostly with ${lang}. ${age ? age + ". " : ""}Profile score: ${score}/100. ${active >= 3 ? "Visible recent activity across the profile." : "Recent public activity looks limited."} ${bestRepo ? `${bestRepo.name} is the strongest repository to highlight.` :"A stronger standout project would improve the overall profile."}`;
}

const IMPACT_ORDER = { high: 0, medium: 1, low: 2 };

// Concrete next steps, most impactful first
export function generateSuggestions(profile, repos) {
  const suggestions    = [];
  const stars          = getTotalStars(repos);
  const active         = getActiveRepos(repos);
  const described      = repos.filter((r) => r.description && r.description.trim()).length;
  const languageCount  = getLanguageData(repos).length;
  const followers      = profile.followers || 0;
  const bestRepo       = getBestRepoRecommendation(repos);

  if (stars < 30)
    suggestions.push({
      impact: "high",
      title: "Polish one flagship project",
      detail: bestRepo
        ? `Give ${bestRepo.name} a README with screenshots and a live demo link, then share it.`
        : "Build one project you're proud of and give it a clear README with screenshots.",
    });
  if (repos.length && described < Math.ceil(repos.length * 0.5))
    suggestions.push({
      impact: "high",
      title: "Describe your repositories",
      detail: `${repos.length - described} of ${repos.length} repos have no description. One sentence each helps visitors understand your work.`,
    });
  if (active <= 1 && repos.length > 0)
    suggestions.push({
      impact: "medium",
      title: "Push updates more regularly",
      detail: `${active === 0 ? "No repos were" : "Only 1 repo was"} pushed in the last 60 days. Small, regular commits show you're active.`,
    });
  if (followers < 20)
    suggestions.push({
      impact: "medium",
      title: "Pin your best work",
      detail: "Pin up to 6 repos on your GitHub profile and add a profile README so visitors know where to start.",
    });
  if (languageCount <= 1 && repos.length >= 4)
    suggestions.push({
      impact: "low",
      title: "Show some range",
      detail: "A project in a second language or framework makes the profile feel more rounded.",
    });
  if (!suggestions.length)
    suggestions.push({
      impact: "low",
      title: "Keep the momentum",
      detail: "The profile already looks solid. Next, make one project stand out with a demo and a write-up.",
    });

  return suggestions.sort((a, b) => IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact]).slice(0, 4);
}

export function getProfileLevel(score) {
  if (score >= 85) return "Standout";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Rising";
  if (score >= 35) return "Growing";
  return "Getting started";
}

// Short strength / weak-spot chips for the summary card
export function getProfileHighlights(profile, repos) {
  const good = [];
  const warn = [];
  const stars         = getTotalStars(repos);
  const active        = getActiveRepos(repos);
  const languageCount = getLanguageData(repos).filter((l) => l.name !== "Other").length;
  const followers     = profile.followers || 0;
  const described     = repos.filter((r) => r.description && r.description.trim()).length;
  const docRatio      = repos.length ? described / repos.length : 0;
  const years         = Math.floor(daysSince(profile.created_at) / 365);

  if (active >= 3) good.push(`${active} repos active recently`);
  else if (active >= 1) good.push("Pushed recently");
  if (stars >= 10) good.push(`${formatNumber(stars)} stars earned`);
  if (docRatio >= 0.7 && repos.length) good.push("Well documented");
  if (languageCount >= 3) good.push(`Works in ${languageCount} languages`);
  if (followers >= 50) good.push(`${formatNumber(followers)} followers`);
  if (years >= 5 && profile.created_at) good.push(`${years} years on GitHub`);

  if (!repos.length) warn.push("No original repos yet");
  else {
    if (stars === 0) warn.push("No stars yet");
    if (docRatio < 0.5) warn.push("Few descriptions");
    if (active === 0) warn.push("No recent pushes");
  }
  if (followers < 10) warn.push("Small audience");

  return [
    ...good.slice(0, 3).map((text) => ({ type: "good", text })),
    ...warn.slice(0, 3).map((text) => ({ type: "warn", text })),
  ];
}

export function getMetricStatus(value) {
  if (value >= 70) return "good";
  if (value >= 40) return "ok";
  return "low";
}

// One tip per score metric, matched to how it's doing
export function getMetricTips(breakdown) {
  const tips = {
    activity: {
      good: "Plenty of recent pushes. Keep it up.",
      ok:   "Some recent activity. A few more regular pushes would lift this.",
      low:  "Few repos pushed in the last 60 days. Small, regular commits help.",
    },
    popularity: {
      good: "Your work is getting noticed.",
      ok:   "Some traction. Sharing your best repo could push this further.",
      low:  "Add a README and demo to your best repo, then share it.",
    },
    documentation: {
      good: "Most repos explain what they are.",
      ok:   "About half your repos have descriptions. Fill in the rest.",
      low:  "Most repos have no description. One sentence each makes a difference.",
    },
    visibility: {
      good: "Good reach for your profile.",
      ok:   "Growing reach. Pinning your best repos helps visitors.",
      low:  "Pin your best repos and add a profile README.",
    },
  };

  return Object.fromEntries(Object.keys(tips).map((key) => {
    const status = getMetricStatus(breakdown[key]);
    return [key, { status, tip: tips[key][status] }];
  }));
}

export function getCompareValues({ profile, repos }) {
  return {
    "Profile score": calculateHealthScore(profile, repos),
    "Repositories":  profile.public_repos || repos.length,
    "Stars":         getTotalStars(repos),
    "Forks":         getTotalForks(repos),
    "Followers":     profile.followers || 0,
    "Active repos":  getActiveRepos(repos),
  };
}
