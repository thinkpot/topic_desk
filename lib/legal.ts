import { BRAND_NAME } from "./brand";

/**
 * Every company-specific detail the legal pages render, in one place.
 *
 * The TODO values below are placeholders — the pages will publish them exactly
 * as written, so fill them in before linking these pages anywhere public. Indian
 * e-commerce rules (Consumer Protection (E-Commerce) Rules, 2020) require the
 * legal entity name, a registered address, and named customer-care and
 * grievance contacts to be published; the DPDP Act, 2023 requires a reachable
 * Grievance Officer for data-protection requests.
 */
export const LEGAL = {
  brand: BRAND_NAME,

  /** Registered name of the entity that contracts with customers. */
  entity: "TODO — registered legal entity name (e.g. Chatshore Technologies Pvt Ltd)",
  /** Full registered address, including PIN code. */
  address: "TODO — registered address, including city, state and PIN code",
  /** Leave empty if not GST-registered; the pages hide the line when blank. */
  gstin: "",

  supportEmail: "TODO@example.com",
  privacyEmail: "TODO@example.com",

  /** DPDP Act, 2023 requires a named, reachable grievance contact. */
  grievanceOfficer: {
    name: "TODO — officer name",
    email: "TODO@example.com",
  },

  /** Courts of this city have exclusive jurisdiction under the Terms. */
  jurisdictionCity: "TODO — city",
  jurisdictionCountry: "India",

  /** Shown on every page, and used in the structured data. */
  effectiveDate: "27 September 2026",

  /** Kept in sync with lib/plans.ts — TRIAL_DAYS and the refund window. */
  trialDays: 3,
  refundWindowDays: 3,
} as const;

/** True once the placeholders above have actually been replaced. */
export function legalDetailsMissing(): boolean {
  return JSON.stringify(LEGAL).includes("TODO");
}
