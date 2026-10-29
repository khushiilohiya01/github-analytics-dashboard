// ─── Language and activity charts ────────────────────────────────────────────

import { lastActivity, setText } from "../utils.js";
import { getLanguageData } from "../analysis.js";
import { languageChart, contributionGraph, activitySummary } from "../dom.js";

// GitHub-style single stacked bar with a legend underneath
export function renderLanguageChart(repos) {
  const data = getLanguageData(repos).slice(0, 6);
  if (!data.length) {
    languageChart.innerHTML = `<div class="empty-state">No language data available.</div>`;
    return;
  }

  const total = data.reduce((s, l) => s + l.count, 0);
  languageChart.innerHTML = "";

  const stack = document.createElement("div");
  stack.className = "lang-stack";
  data.forEach((lang, i) => {
    const seg = document.createElement("span");
    seg.className = "lang-seg";
    seg.style.width = `${(lang.count / total) * 100}%`;
    seg.style.setProperty("--lang-color", `var(--lang-${i + 1})`);
    seg.title = `${lang.name}: ${lang.count} repo${lang.count !== 1 ? "s" : ""}`;
    stack.appendChild(seg);
  });
  languageChart.appendChild(stack);

  // Language names come from the API, so they go in as text nodes
  const legend = document.createElement("ul");
  legend.className = "lang-legend";
  data.forEach((lang, i) => {
    const li = document.createElement("li");
    li.style.setProperty("--lang-color", `var(--lang-${i + 1})`);
    const name = document.createElement("span");
    name.className = "lang-name";
    name.textContent = lang.name;
    const pct = document.createElement("span");
    pct.className = "lang-pct";
    pct.textContent = `${lang.percent}%`;
    li.appendChild(name);
    li.appendChild(pct);
    legend.appendChild(li);
  });
  languageChart.appendChild(legend);
}

export function renderActivityChart(repos) {
  if (!repos.length) {
    contributionGraph.innerHTML = `<div class="empty-state">No activity data available.</div>`;
    setText(activitySummary, "No repositories yet");
    return;
  }

  // Build month buckets for last 12 months
  const now    = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString("en-IN", { month: "short" }),
      long:  d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
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

  const total    = months.reduce((s, m) => s + m.count, 0);
  const busiest  = months.reduce((a, b) => (b.count > a.count ? b : a));
  const maxCount = Math.max(busiest.count, 1);

  setText(activitySummary, total
    ? `${total} repo${total !== 1 ? "s" : ""} pushed in the last 12 months · busiest in ${busiest.label}`
    : "No pushes in the last 12 months");

  // Only numbers and locale month names go into this markup, so a string template is safe
  const bars = months.map((m, i) => {
    const height = m.count ? Math.max(Math.round((m.count / maxCount) * 100), 8) : 0;
    const tip = `${m.count} repo${m.count !== 1 ? "s" : ""} last pushed in ${m.long}`;
    return `
      <div class="act-col${m.count ? "" : " is-empty"}${m === busiest && m.count ? " is-peak" : ""}" data-tip="${tip}">
        <div class="act-bar-wrap">
          <span class="act-count">${m.count || ""}</span>
          <div class="act-bar" style="height:${height}%; animation-delay:${i * 30}ms"></div>
        </div>
        <span class="act-label">${m.label}</span>
      </div>`;
  }).join("");

  contributionGraph.innerHTML = `<div class="act-chart">${bars}</div>`;
}
