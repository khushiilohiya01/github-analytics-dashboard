// Profile analysis

// Pure functions over GitHub API data: no DOM access, so they can be tested in isolation.

import { formatNumber, daysSince, lastActivity } from "./utils.js";

// Label for repos where GitHub detected no language
export const NO_LANGUAGE = "No language";

function plural(n, word, many = `${word}s`) {
  return `${formatNumber(n)} ${n === 1 ? word : many}`;
}

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
    const lang = r.language || NO_LANGUAGE;
    map[lang] = (map[lang] || 0) + 1;
  });
  const total = repos.length || 1;
  return Object.entries(map)
    .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

// Most used detected language; "No language" only when nothing was detected
export function getPrimaryLanguage(repos) {
  const data = getLanguageData(repos);
  const real = data.find((l) => l.name !== NO_LANGUAGE);
  return real ? real.name : data.length ? NO_LANGUAGE : "--";
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
  if (daysSince(lastActivity(repo)) <= 60) reasons.push("recent updates");
  if (repo.description && repo.description.trim()) reasons.push("a clear description");

  if (!reasons.length) return "Nothing stands out much yet, but this one scored highest on stars, activity and description.";
  const list = reasons.length > 1
    ? `${reasons.slice(0, -1).join(", ")} and ${reasons[reasons.length - 1]}`
    : reasons[0];
  return `Picked for its ${list}.`;
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
  if (score >= 85) return "One of the stronger profiles out there. Keep doing what you're doing.";
  if (score >= 70) return "Solid profile. A couple of tweaks would make it stand out.";
  if (score >= 55) return "Good base. More regular updates and a bit more visibility would help.";
  return "Early days. A few focused changes will move this score a lot.";
}

export function generateSummary(profile, repos, forkCount = 0) {
  const name   = profile.name || profile.login;
  const lang   = getPrimaryLanguage(repos);
  const active = getActiveRepos(repos);
  const best   = getBestRepoRecommendation(repos);
  const years  = Math.floor(daysSince(profile.created_at) / 365);
  const forks  = forkCount ? ` (plus ${plural(forkCount, "fork")})` : "";

  if (!repos.length) {
    return `${name} has no original public repositories yet${forks}. Once there's a project or two, this review will have much more to say.`;
  }

  const parts = [];
  parts.push(`${name} has ${plural(repos.length, "original public repo")}${forks}.`);
  if (lang !== NO_LANGUAGE && lang !== "--") parts.push(`Most of the work is in ${lang}.`);

  if (active === 0) parts.push("None of them were updated in the last 60 days.");
  else if (active === repos.length) parts.push("All of them were updated in the last 60 days.");
  else parts.push(`${formatNumber(active)} of them ${active === 1 ? "was" : "were"} updated in the last 60 days.`);

  if (best) parts.push(`${best.name} is the strongest project to show off.`);
  if (profile.created_at) parts.push(years >= 1 ? `On GitHub for ${plural(years, "year")}.` : "Joined GitHub within the last year.");

  return parts.join(" ");
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
        ? `Make ${bestRepo.name} easy to show off: a clear README with screenshots${bestRepo.homepage ? "" : " and, if it runs on the web, a live demo link"}. Then share it where people will see it.`
        : "Build one project you're proud of and give it a clear README with screenshots.",
    });
  if (repos.length && described < Math.ceil(repos.length * 0.5))
    suggestions.push({
      impact: "high",
      title: "Add repo descriptions",
      detail: `${repos.length - described} of ${plural(repos.length, "repo")} ${repos.length - described === 1 ? "has" : "have"} no description. One sentence each tells visitors what the project is.`,
    });
  if (active <= 1 && repos.length > 0)
    suggestions.push({
      impact: "medium",
      title: "Push updates more regularly",
      detail: `${active === 0 ? "No repos were" : "Only 1 repo was"} updated in the last 60 days. Small, regular commits show you're active.`,
    });
  if (followers < 20)
    suggestions.push({
      impact: "medium",
      title: "Pin the best repos",
      detail: "If you haven't already, pin up to 6 repos and add a profile README so visitors know where to start.",
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
  const languageCount = getLanguageData(repos).filter((l) => l.name !== NO_LANGUAGE).length;
  const followers     = profile.followers || 0;
  const described     = repos.filter((r) => r.description && r.description.trim()).length;
  const docRatio      = repos.length ? described / repos.length : 0;
  const years         = Math.floor(daysSince(profile.created_at) / 365);

  if (active >= 3) good.push(`${active} repos updated recently`);
  else if (active >= 1) good.push("Updated recently");
  if (stars >= 10) good.push(`${formatNumber(stars)} stars earned`);
  if (docRatio >= 0.7 && repos.length) good.push("Well documented");
  if (languageCount >= 3) good.push(`Works in ${languageCount} languages`);
  if (followers >= 50) good.push(`${formatNumber(followers)} followers`);
  if (years >= 5 && profile.created_at) good.push(`${years} years on GitHub`);

  if (!repos.length) warn.push("No original repos yet");
  else {
    if (stars === 0) warn.push("No stars yet");
    if (docRatio < 0.5) warn.push("Few descriptions");
    if (active === 0) warn.push("No recent updates");
  }
  if (followers < 10) warn.push("Few followers yet");

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

// One line per score metric: the real numbers behind it, then advice matched to its status
export function getMetricTips(breakdown, profile, repos) {
  const n         = repos.length;
  const active    = getActiveRepos(repos);
  const stars     = getTotalStars(repos);
  const forks     = getTotalForks(repos);
  const described = repos.filter((r) => r.description && r.description.trim()).length;
  const followers = profile.followers || 0;

  const facts = {
    activity:      `${formatNumber(active)} of ${plural(n, "repo")} updated in the last 60 days.`,
    popularity:    `${plural(stars, "star")} and ${plural(forks, "fork")} across all repos.`,
    documentation: `${formatNumber(described)} of ${plural(n, "repo")} ${described === 1 ? "has" : "have"} a description.`,
    visibility:    `${plural(followers, "follower")} and ${plural(profile.public_repos || n, "public repo")}.`,
  };

  const advice = {
    activity:      { good: "Keep it up.", ok: "A few more regular updates would lift this.", low: "Small, regular commits help." },
    popularity:    { good: "The work is getting noticed.", ok: "Sharing the best repo more widely could push this up.", low: "The strongest project needs more people to see it." },
    documentation: { good: "Visitors can tell what each project is.", ok: "Fill in the rest.", low: "One sentence each makes a big difference." },
    visibility:    { good: "Good reach.", ok: "Pinned repos and a profile README help visitors.", low: "Pinned repos and a profile README help visitors." },
  };

  return Object.fromEntries(Object.keys(facts).map((key) => {
    const status = getMetricStatus(breakdown[key]);
    return [key, { status, tip: `${facts[key]} ${advice[key][status]}` }];
  }));
}

export function getCompareValues({ profile, repos }) {
  return {
    "Profile score": calculateHealthScore(profile, repos),
    "Public repos":  profile.public_repos || repos.length,
    "Stars":         getTotalStars(repos),
    "Forks":         getTotalForks(repos),
    "Followers":     profile.followers || 0,
    "Updated in last 60 days": getActiveRepos(repos),
  };
}
