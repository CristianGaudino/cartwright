// break-ui: the names the dev toggle (client) and the data boundary (server) share. No imports, so the client can read it.
export const DEV_COOKIE = "break-ui";
export const DEV_MODES = ["demo", "worst", "empty", "one", "huge"] as const;
export type DevMode = (typeof DEV_MODES)[number];
