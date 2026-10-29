// ─── Utility helpers ─────────────────────────────────────────────────────────

export function formatNumber(num) {
  return Number(num || 0).toLocaleString();
}

export function safeText(value, fallback = "Not available") {
  return value && String(value).trim() ? value : fallback;
}

export function normalizeUrl(url) {
  if (!url || !url.trim()) return "";
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

export function formatDate(dateString) {
  if (!dateString) return "Unknown";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
}

export function daysSince(dateString) {
  if (!dateString) return 9999;
  return Math.floor((Date.now() - new Date(dateString)) / 86400000);
}

// pushed_at reflects code changes; updated_at also moves on stars and metadata edits
export function lastActivity(repo) {
  return repo.pushed_at || repo.updated_at;
}

// XSS — safe DOM text setter
export function setText(el, value) {
  if (!el) return;
  el.textContent = value;
}

// XSS — safe attribute setter
export function setAttr(el, attr, value) {
  if (!el) return;
  el.setAttribute(attr, value);
}
