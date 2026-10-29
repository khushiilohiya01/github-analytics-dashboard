// ─── State ───────────────────────────────────────────────────────────────────

// One shared object, since modules can't reassign each other's exported bindings
export const state = {
  profile:   null,
  repos:     [],
  forkCount: 0,

  // Incremented per request so a slow, older response can't overwrite a newer one
  loadRequestId:    0,
  compareRequestId: 0,
};
