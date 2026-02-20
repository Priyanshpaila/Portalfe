// src/services/user.routes.ts
export const USER_BASE = '/user' // ✅ keep '/user' because your frontend already uses /user/me
// If your server mounts this router at "/users", then change this to: export const USER_BASE = '/users'

export const USER_ROUTES = {
  // Profile (NEW)
  PROFILE_GET: `${USER_BASE}/profile`,
  PROFILE_PATCH: `${USER_BASE}/profile`,
  PROFILE_CHANGE_PASSWORD: `${USER_BASE}/profile/change-password`,
  PROFILE_DIGITAL_SIGNATURE: `${USER_BASE}/profile/digital-signature`,

  // Existing (kept)
  ME_GET: `${USER_BASE}/me`,
  RESET_PASSWORD: `${USER_BASE}/reset-password`,

  // Firm seat users
  FIRM_EMPLOYEES_GET: `${USER_BASE}/firm/employees`,
  FIRM_EMPLOYEES_POST: `${USER_BASE}/firm/employees`,

  // Connections
  CONNECTIONS_GET: `${USER_BASE}/connections`,
  CONNECTION_REQUEST: `${USER_BASE}/connections/request`,
  CONNECTION_RESPOND: `${USER_BASE}/connections/respond`,
  CONNECTION_REMOVE: `${USER_BASE}/connections/remove`,

  // Directory
  DIRECTORY_GET: `${USER_BASE}/directory`,
} as const