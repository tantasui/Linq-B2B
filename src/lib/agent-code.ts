/**
 * Linq Field agent codes (LQ-TOLU). A merchant enters one at signup so the
 * field agent who brought them in gets the credit. The code is optional and
 * never blocks signup: an unknown one is saved as typed and Linq reports it
 * as unattributed.
 */

export const AGENT_CODE_MAX_LENGTH = 32;

// Agent links carry ?ref=LQ-TOLU. The merchant has to verify their email
// before they reach the form, so the code is kept in a cookie in between.
const REF_PARAM = "ref";
const REF_COOKIE = "linq_agent_ref";
const REF_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

// The lookup is public on Linq's API and limited per visitor, so it is called
// from the merchant's browser: from this app's server, every merchant would
// share one allowance.
const LINQ_API_URL = (
  process.env.NEXT_PUBLIC_LINQ_API_URL ||
  "https://confidential-brianna-uselinq-52e2b233.koyeb.app"
).replace(/\/+$/, "");

/** Case and spaces don't matter: " lq-tolu " is LQ-TOLU. Same rule as Linq's lookup. */
export function normalizeAgentCode(raw: string) {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** Worth asking Linq about: codes all start with LQ-. */
export function looksLikeAgentCode(code: string) {
  return (
    code.startsWith("LQ-") &&
    code.length > 3 &&
    code.length <= AGENT_CODE_MAX_LENGTH
  );
}

// Only agent codes count: a link like ?ref=twitter is someone else's
// tracking, and remembering it would take the credit from the agent.
function refFromUrl() {
  const raw = new URLSearchParams(window.location.search).get(REF_PARAM);
  const code = raw ? normalizeAgentCode(raw) : "";
  return looksLikeAgentCode(code) ? code : "";
}

function refFromCookie() {
  const entry = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${REF_COOKIE}=`));
  if (!entry) return "";
  try {
    const code = normalizeAgentCode(
      decodeURIComponent(entry.slice(REF_COOKIE.length + 1)),
    );
    return looksLikeAgentCode(code) ? code : "";
  } catch {
    return "";
  }
}

/** What to keep from the code box: someone pasting the agent's whole link gets just its code. */
export function agentCodeFromInput(raw: string) {
  const fromLink = raw.match(/[?&]ref=([^&#\s]+)/i);
  if (!fromLink) return raw;
  try {
    return decodeURIComponent(fromLink[1]);
  } catch {
    return fromLink[1];
  }
}

/**
 * Keeps ?ref= from whatever page an agent's link opened, for 30 days. A newer
 * link replaces an older one.
 */
export function rememberAgentRef() {
  const code = refFromUrl();
  if (!code) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${REF_COOKIE}=${encodeURIComponent(code)}; Max-Age=${REF_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

/** The code to prefill: the link on this page first, then one remembered earlier. */
export function readAgentRef() {
  return refFromUrl() || refFromCookie();
}

/** Called once the code is saved, so it doesn't follow this browser into another signup. */
export function forgetAgentRef() {
  document.cookie = `${REF_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export type AgentCodeCheck =
  | { status: "valid"; agentName: string }
  | { status: "unknown" }
  // Linq couldn't be reached, was busy, or said slow down. Not the merchant's
  // problem: they carry on and the code is saved as typed.
  | { status: "unavailable" };

export async function checkAgentCode(
  code: string,
  signal?: AbortSignal,
): Promise<AgentCodeCheck> {
  try {
    const response = await fetch(
      `${LINQ_API_URL}/field/referral/${encodeURIComponent(code)}`,
      {
        signal,
        credentials: "omit",
        cache: "no-store",
      },
    );
    if (!response.ok) return { status: "unavailable" };
    const body = (await response.json()) as {
      valid?: boolean;
      agentName?: string;
    };
    if (body.valid && body.agentName)
      return { status: "valid", agentName: body.agentName };
    return body.valid === false
      ? { status: "unknown" }
      : { status: "unavailable" };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    return { status: "unavailable" };
  }
}
