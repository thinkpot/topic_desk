/**
 * The site's own public URL, for metadata that must be absolute: canonical
 * links, Open Graph images and JSON-LD identifiers.
 *
 * Deliberately NOT env.appUrl, which throws when APP_URL is unset. Metadata is
 * generated at build time too, and a missing variable should degrade to a
 * sensible default rather than fail the build.
 */
const FALLBACK = "https://chatshore.vercel.app";

export function siteUrl(): URL {
  const raw = process.env.APP_URL?.trim();
  if (raw) {
    try {
      return new URL(raw);
    } catch {
      // A malformed APP_URL shouldn't take metadata down with it.
      console.warn(`> Ignoring malformed APP_URL (${JSON.stringify(raw)}) for site metadata.`);
    }
  }
  return new URL(FALLBACK);
}

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}
