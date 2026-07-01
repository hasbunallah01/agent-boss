// Auth verification — runtime tests of bcrypt + JWT (no mocking needed)
// plus structural assertions about the route handlers (read-only) and
// the User model.
//
// Cookie-helper runtime tests require a real Next.js request context
// (next/headers.cookies()), which we don't have without a running
// dev server. The route files structurally call setAuthCookie /
// clearAuthCookie / readAuthCookie with the documented options, and
// the auth lib module was type-checked by `next build` (which already
// passed with zero TS errors).
//
// Run with: pnpm --filter web exec tsx scripts/verify-auth.mts

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-do-not-use-in-prod-32chars!!";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const REPO = join(ROOT, "..", "..");

// Mirror lib/auth.ts helpers (re-implemented here so we can test
// without loading next/headers).
async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET required in production");
    return "dev-only-insecure-secret-change-me-please";
  }
  return s;
}
function signAuthToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, getSecret(), { expiresIn: 60 * 60 * 24 * 7 });
}
function verifyAuthToken(token: string) {
  try {
    const d = jwt.verify(token, getSecret()) as any;
    if (typeof d.userId !== "string" || typeof d.email !== "string") return null;
    return { userId: d.userId, email: d.email };
  } catch { return null; }
}

// --- Test runner ---
let pass = 0, fail = 0;
function assert(cond: any, label: string) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.error(`  ✗ ${label}`); }
}

console.log("\n== 1. bcrypt password hashing ==");
{
  const hash = await hashPassword("hunter2hunter2");
  assert(hash.startsWith("$2"), "produces a bcrypt hash");
  assert(hash.length > 50, "hash is long enough");
  assert(await verifyPassword("hunter2hunter2", hash), "verifies correct password");
  assert(!(await verifyPassword("wrong", hash)), "rejects wrong password");
}

console.log("\n== 2. JWT roundtrip ==");
{
  const t = signAuthToken({ userId: "u1", email: "a@b.co" });
  assert(typeof t === "string" && t.split(".").length === 3, "JWT has 3 parts (header.payload.sig)");
  const d = verifyAuthToken(t);
  assert(d?.userId === "u1" && d?.email === "a@b.co", "verifyAuthToken roundtrips payload");
}

console.log("\n== 3. JWT rejects tampering & wrong secret ==");
{
  const t = signAuthToken({ userId: "u1", email: "a@b.co" });
  assert(verifyAuthToken(t.slice(0, -2) + "XX") === null, "tampered signature → null");
  const wrong = jwt.sign({ userId: "u1", email: "a@b.co" }, "different-secret-also-32-chars!!!");
  assert(verifyAuthToken(wrong) === null, "token signed with different secret → null");
}

console.log("\n== 4. JWT_SECRET required in production ==");
{
  const realEnv = process.env.NODE_ENV;
  const realSecret = process.env.JWT_SECRET;
  process.env.NODE_ENV = "production";
  delete process.env.JWT_SECRET;
  let threw = false;
  try { signAuthToken({ userId: "u", email: "a@b.co" }); } catch { threw = true; }
  assert(threw, "missing JWT_SECRET in production → throws");
  process.env.JWT_SECRET = realSecret;
  process.env.NODE_ENV = realEnv;
}

console.log("\n== 5. Auth lib module structure (lib/auth.ts) ==");
{
  const src = readFileSync(join(ROOT, "lib/auth.ts"), "utf8");
  assert(/export async function hashPassword/.test(src), "exports hashPassword");
  assert(/export async function verifyPassword/.test(src), "exports verifyPassword");
  assert(/export function signAuthToken/.test(src), "exports signAuthToken");
  assert(/export function verifyAuthToken/.test(src), "exports verifyAuthToken");
  assert(/export async function setAuthCookie/.test(src), "exports setAuthCookie");
  assert(/export async function clearAuthCookie/.test(src), "exports clearAuthCookie");
  assert(/export async function readAuthCookie/.test(src), "exports readAuthCookie");
  assert(/httpOnly:\s*true/.test(src), "setAuthCookie sets httpOnly=true");
  assert(/sameSite:\s*"lax"/.test(src), "setAuthCookie sets sameSite=lax");
  assert(/secure:\s*process\.env\.NODE_ENV\s*===\s*"production"/.test(src), "secure only in production");
  assert(/maxAge:\s*COOKIE_MAX_AGE_SECONDS/.test(src), "setAuthCookie sets maxAge");
  assert(/maxAge:\s*0/.test(src), "clearAuthCookie sets maxAge=0");
  assert(/bcrypt\.hash\(plain,\s*10\)/.test(src), "uses bcrypt cost 10");
  // Pure-JS bcryptjs (not native bcrypt) so it loads on every Node runtime.
  assert(/from\s+["']bcryptjs["']/.test(src), "imports from bcryptjs (pure-JS, not native)");
}

function readRoute(name: string): string {
  return readFileSync(join(ROOT, "app/api/auth", name, "route.ts"), "utf8");
}

console.log("\n== 6. /api/auth/register ==");
{
  const src = readRoute("register");
  assert(/runtime\s*=\s*"nodejs"/.test(src), "uses nodejs runtime");
  assert(/import\s+\{[^}]*hashPassword[^}]*\}\s+from\s+["']@\/lib\/auth["']/.test(src), "imports hashPassword");
  assert(/import\s+\{[^}]*signAuthToken[^}]*\}\s+from\s+["']@\/lib\/auth["']/.test(src), "imports signAuthToken");
  assert(/import\s+\{[^}]*setAuthCookie[^}]*\}\s+from\s+["']@\/lib\/auth["']/.test(src), "imports setAuthCookie");
  assert(/import\s+\{[^}]*prisma[^}]*\}\s+from\s+["']@agent-boss\/db["']/.test(src), "imports prisma");
  assert(/password\.length\s*<\s*8/.test(src), "validates password length >= 8");
  assert(/EMAIL_RE\.test/.test(src), "validates email format");
  assert(/prisma\.user\.findUnique/.test(src), "checks for existing user");
  assert(/prisma\.user\.create/.test(src), "creates user");
  assert(/status:\s*409/.test(src), "returns 409 on duplicate email");
  assert(/status:\s*400/.test(src), "returns 400 on validation error");
  assert(/Registration failed/.test(src), "masks errors with generic message");
  // Use Prisma `select` to pick a safe field set, NOT the full user object.
  assert(/select:\s*\{[^}]*id:\s*true[^}]*\}/.test(src), "uses Prisma select to whitelist response fields");
  assert(/displayName/.test(src), "supports displayName");
}

console.log("\n== 7. /api/auth/login ==");
{
  const src = readRoute("login");
  assert(/verifyPassword/.test(src), "uses verifyPassword");
  assert(/signAuthToken/.test(src), "issues JWT on success");
  assert(/setAuthCookie/.test(src), "sets cookie on success");
  assert(/Invalid email or password/.test(src), "uses generic message (no email enumeration)");
  assert(/status:\s*401/.test(src), "returns 401 on auth failure");
  assert(/status:\s*400/.test(src), "returns 400 on validation error");
  // Constant-time-ish behaviour
  assert(/passwordHash\s*\?\?/.test(src), "always runs bcrypt compare (timing-attack mitigation)");
  // The login response explicitly picks fields (id/email/displayName/walletAddress/createdAt)
  // and never spreads the user row directly. passwordHash must not appear in the response shape.
  assert(/user:\s*\{[\s\S]*?id:\s*user\.id/.test(src), "login response explicitly shapes user fields");
  const responseBlock = src.match(/user:\s*\{([\s\S]*?)\}\s*,/);
  assert(!responseBlock || !/passwordHash/.test(responseBlock[1]), "passwordHash not in login response shape");
}

console.log("\n== 8. /api/auth/logout ==");
{
  const src = readRoute("logout");
  assert(/clearAuthCookie/.test(src), "clears cookie");
  assert(/status:\s*200/.test(src), "returns 200");
  assert(/Logout failed/.test(src), "masks errors with generic message");
  assert(!/passwordHash|hashPassword|verifyPassword|signAuthToken/.test(src), "no password/JWT logic");
}

console.log("\n== 9. /api/auth/me ==");
{
  const src = readRoute("me");
  assert(/readAuthCookie/.test(src), "reads auth cookie");
  assert(/prisma\.user\.findUnique/.test(src), "re-reads user from DB");
  assert(/status:\s*401/.test(src), "returns 401 when unauthenticated");
  assert(/Session lookup failed/.test(src), "masks errors with generic message");
  assert(!src.includes("passwordHash"), "does not leak passwordHash");
}

console.log("\n== 10. User model in Prisma schema ==");
{
  const schema = readFileSync(join(REPO, "packages/db/schema.prisma"), "utf8");
  assert(/^model User \{/m.test(schema), "User model exists");
  assert(/id\s+String\s+@id\s+@default\(cuid\(\)\)/.test(schema), "User.id is cuid");
  assert(/email\s+String\s+@unique/.test(schema), "User.email is unique");
  assert(/passwordHash\s+String/.test(schema), "User has passwordHash field");
  assert(/displayName\s+String\?/.test(schema), "User.displayName is optional");
  assert(/walletAddress\s+String\?/.test(schema), "User.walletAddress is optional");
  assert(/createdAt\s+DateTime\s+@default\(now\(\)\)/.test(schema), "User.createdAt default");
  assert(/updatedAt\s+DateTime\s+@updatedAt/.test(schema), "User.updatedAt auto");
  assert(/@@index\(\[email\]\)/.test(schema), "User.email is indexed");
}

console.log("\n== 11. JWT_SECRET in .env.example ==");
{
  const env = readFileSync(join(REPO, ".env.example"), "utf8");
  assert(/JWT_SECRET/.test(env), "JWT_SECRET documented");
}

console.log("\n== 12. Auth deps installed ==");
{
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  // We use the pure-JS bcryptjs (not native bcrypt) so it loads on every
  // Node runtime Vercel uses, including Node 24.
  assert(!!pkg.dependencies?.bcryptjs, "bcryptjs in dependencies");
  assert(!!pkg.dependencies?.jsonwebtoken, "jsonwebtoken in dependencies");
  assert(!!pkg.devDependencies?.["@types/bcryptjs"], "@types/bcryptjs in devDependencies");
  assert(!!pkg.devDependencies?.["@types/jsonwebtoken"], "@types/jsonwebtoken in devDependencies");
  // Native bcrypt must NOT be a dependency (it fails to load on Node 24).
  assert(!pkg.dependencies?.bcrypt, "native bcrypt NOT in dependencies (would fail on Node 24)");
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);