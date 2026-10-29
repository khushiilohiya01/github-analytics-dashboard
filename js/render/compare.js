// ─── Compare cards ───────────────────────────────────────────────────────────

import { formatNumber } from "../utils.js";
import { getCompareValues, getPrimaryLanguage, getTopRepo } from "../analysis.js";

function compareClass(own, other) {
  if (own > other) return "win";
  return own === other ? "tie" : "";
}

export function createCompareCards(first, second) {
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
