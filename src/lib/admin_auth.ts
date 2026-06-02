import { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export const ADMIN_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const ALLOWED_GITHUB_USERS = ["anyebojue", "ytcwd3"];

type AdminUser = {
  email?: string;
  github?: string;
};

type AdminSessionResult =
  | { ok: true; user: AdminUser; sessionExpiresAt?: number | null }
  | { ok: false; reason: string };

function getGithubUsername(user: User) {
  return user.user_metadata?.user_name || user.user_metadata?.preferred_username;
}

function isAllowedAdminUser(user: User) {
  if (user.app_metadata?.provider !== "github") return false;
  const githubUsername = getGithubUsername(user);
  return !!githubUsername && ALLOWED_GITHUB_USERS.includes(githubUsername);
}

export function clearAdminSessionStorage() {
  localStorage.removeItem("admin_logged_in");
  localStorage.removeItem("admin_user");
  localStorage.removeItem("admin_login_expires_at");
}

export async function clearAdminSession(options?: { signOut?: boolean }) {
  clearAdminSessionStorage();
  if (options?.signOut !== false) {
    await supabase.auth.signOut();
  }
}

export function saveAdminSession(user: User, options?: { renew?: boolean }) {
  const githubUsername = getGithubUsername(user);
  const storedExpiresAt = Number(localStorage.getItem("admin_login_expires_at") || 0);
  const expiresAt =
    options?.renew || !storedExpiresAt
      ? Date.now() + ADMIN_SESSION_DURATION_MS
      : storedExpiresAt;

  const adminUser = {
    email: user.email,
    github: githubUsername,
  };

  localStorage.setItem("admin_logged_in", "true");
  localStorage.setItem("admin_login_expires_at", String(expiresAt));
  localStorage.setItem("admin_user", JSON.stringify(adminUser));

  return adminUser;
}

export function getStoredAdminUser() {
  try {
    const stored = JSON.parse(localStorage.getItem("admin_user") || "{}") as AdminUser;
    return stored?.github || stored?.email ? stored : null;
  } catch {
    return null;
  }
}

export function isAdminLoginExpired() {
  const expiresAt = Number(localStorage.getItem("admin_login_expires_at") || 0);
  return !!expiresAt && Date.now() > expiresAt;
}

export async function validateAdminSession(options?: {
  redirectToLogin?: boolean;
  renewLoginWindow?: boolean;
}): Promise<AdminSessionResult> {
  const redirectToLogin = options?.redirectToLogin !== false;
  const loggedIn = localStorage.getItem("admin_logged_in") === "true";

  function redirect() {
    if (redirectToLogin) {
      window.location.href = "/admin/login";
    }
  }

  if (!loggedIn) {
    redirect();
    return { ok: false, reason: "not_logged_in" };
  }

  if (isAdminLoginExpired()) {
    await clearAdminSession();
    redirect();
    return { ok: false, reason: "admin_login_expired" };
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    clearAdminSessionStorage();
    redirect();
    return { ok: false, reason: error?.message || "missing_supabase_session" };
  }

  const expiresInMs = session.expires_at ? session.expires_at * 1000 - Date.now() : null;
  if (expiresInMs !== null && expiresInMs < 5 * 60 * 1000) {
    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await supabase.auth.refreshSession();
    if (refreshError || !refreshedSession) {
      await clearAdminSession();
      redirect();
      return { ok: false, reason: refreshError?.message || "refresh_failed" };
    }
  }

  if (!isAllowedAdminUser(session.user)) {
    await clearAdminSession();
    redirect();
    return { ok: false, reason: "unauthorized" };
  }

  return {
    ok: true,
    user: saveAdminSession(session.user, { renew: options?.renewLoginWindow }),
    sessionExpiresAt: session.expires_at ?? null,
  };
}

export async function persistValidatedAdminUser(user: User) {
  if (!isAllowedAdminUser(user)) {
    throw new Error(user.app_metadata?.provider === "github" ? "您没有权限访问管理后台" : "请使用 GitHub 账号登录");
  }
  return saveAdminSession(user, { renew: true });
}

export async function getAdminAccessToken() {
  const result = await validateAdminSession({ redirectToLogin: false });
  if (!result.ok) throw new Error("未登录或登录已过期");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("未登录或登录已过期");
  return token;
}
