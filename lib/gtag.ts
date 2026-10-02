/**
 * Google Analytics 4.
 *
 * Loaded only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set, so local development
 * and self-hosted copies send nothing and never pollute the production
 * property. Every function here is a no-op when the tag is absent — which also
 * covers the very common case of an ad blocker removing gtag.js, so a blocked
 * script can never throw inside a signup handler.
 *
 * Never pass personal data (email, name, visitor message text) to these: it
 * breaches Google's terms, and this product's whole privacy position is that it
 * does not build profiles of people.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";

export function analyticsEnabled(): boolean {
  return !!GA_MEASUREMENT_ID;
}

/**
 * The events worth measuring, named as a funnel rather than as page hits.
 * `sign_up` and `login` are GA4's own recommended names, so they populate the
 * standard reports; the rest are custom because no standard name fits.
 */
export type AnalyticsEvent =
  | "sign_up" // trial started
  | "login"
  | "email_verified"
  | "chatbot_created" // activation: the widget can now serve real traffic
  | "chatbot_setup_started"
  | "upgrade_requested" // asked for a paid plan
  | "upgrade_dialog_opened"
  | "cta_click" // marketing CTA, with a `location` so each one is separable
  | "widget_snippet_copied";

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: string, target: string, params?: Record<string, unknown>) => void;
    dataLayer?: unknown[];
  }
}

export function trackEvent(name: AnalyticsEvent, params?: Params): void {
  if (typeof window === "undefined" || !window.gtag || !analyticsEnabled()) return;
  try {
    window.gtag("event", name, params ?? {});
  } catch {
    // Analytics must never break a user flow it is only observing.
  }
}

/**
 * App Router navigations are client-side, so the initial config call is the only
 * automatic page_view unless GA's enhanced measurement is on. Sending it
 * explicitly makes the data correct either way.
 */
export function trackPageView(path: string): void {
  if (typeof window === "undefined" || !window.gtag || !analyticsEnabled()) return;
  try {
    window.gtag("event", "page_view", { page_path: path, page_location: window.location.href });
  } catch {
    /* ignore */
  }
}
