// ─── Language and activity charts ────────────────────────────────────────────

import { lastActivity } from "../utils.js";
import { getLanguageData } from "../analysis.js";
import { languageChart, contributionGraph } from "../dom.js";

export function renderLanguageChart(repos) {
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

export function renderActivityChart(repos) {
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
