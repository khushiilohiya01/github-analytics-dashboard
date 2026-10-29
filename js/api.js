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

export async function fetchGitHubProfile(username) {
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
