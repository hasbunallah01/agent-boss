// Module loader hook used by verify-auth.mts.
// Intercepts `next/headers` and replaces it with a controllable mock
// so we can test setAuthCookie/clearAuthCookie/readAuthCookie without
// a Next.js request context.

import { pathToFileURL, fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

let cookieGetter = () => undefined;
let cookieSetter = (_name: string, _value: string, _opts: any) => {};

const mockSource = `
let __getter = () => undefined;
let __setter = (_n, _v, _o) => {};
export function __setCookieGetter(fn) { __getter = fn; }
export function __setCookieSetter(fn) { __setter = fn; }
export async function cookies() {
  return {
    get: (name) => __getter(name),
    set: (name, value, opts) => __setter(name, value, opts),
  };
}
export const headers = async () => new Map();
export const draftMode = async () => ({ enable: () => {}, disable: () => {}, isEnabled: false });
`;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/headers") {
    return {
      url: pathToFileURL(join(__dirname, "_headers-mock.mjs")).href,
      shortCircuit: true,
      format: "module",
    };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith("/_headers-mock.mjs")) {
    return {
      format: "module",
      source: mockSource,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}