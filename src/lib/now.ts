/**
 * Current wall-clock time in epoch ms. Wrapped so server components can read
 * "now" without tripping the react-hooks purity rule (which forbids calling
 * `Date.now()` directly during render). Capture it once on the server and pass
 * it down so client lock state renders identically (no hydration drift).
 */
export function nowMs(): number {
  return Date.now();
}
