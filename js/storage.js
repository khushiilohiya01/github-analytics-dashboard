// ─── Local storage ───────────────────────────────────────────────────────────
// localStorage can be blocked or hold a corrupted value, so every access is guarded.

const RECENT_KEY = "devscope-recent";
const THEME_KEY  = "devscope-theme";

export function readRecentSearches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((i) => typeof i === "string") : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(username) {
  const normalized = username.toLowerCase();
  const searches = [normalized, ...readRecentSearches().filter((i) => i !== normalized)].slice(0, 5);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(searches));
  } catch {
    // Storage unavailable; recent searches just won't persist
  }
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // Nothing stored to clear
  }
}

export function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch {
    return null;
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Theme just won't persist
  }
}
