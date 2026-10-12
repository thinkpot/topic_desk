import { describe, expect, it } from "vitest";
import {
  buildFollowUpEmail,
  extractEmail,
  extractPhone,
  followUpDecision,
  leadFieldsFromVariables,
  renderTemplate,
} from "@/lib/leads";

const HOUR = 3_600_000;

describe("extractEmail", () => {
  it("finds an email inside a sentence and lowercases it", () => {
    expect(extractEmail("sure, it's Priya.Shah@Example.com thanks")).toBe("priya.shah@example.com");
  });

  it("returns null when there's none", () => {
    expect(extractEmail("call me tomorrow")).toBeNull();
  });
});

describe("extractPhone", () => {
  it("finds common phone formats", () => {
    expect(extractPhone("my number is +91 98765 43210")).toBe("+919876543210");
    expect(extractPhone("9876543210")).toBe("9876543210");
    expect(extractPhone("(555) 123-4567 ext")).toBe("5551234567");
  });

  it("ignores dates, prices and short numbers in free text", () => {
    expect(extractPhone("order placed 2026-10-12")).toBeNull();
    expect(extractPhone("it costs 4999")).toBeNull();
    expect(extractPhone("room 12345")).toBeNull();
  });
});

describe("leadFieldsFromVariables", () => {
  it("maps typical flow answers to name, email and phone", () => {
    expect(
      leadFieldsFromVariables({ name: "Priya Shah", email: "PRIYA@example.com", phone: "98765 43210" })
    ).toEqual({ name: "Priya Shah", email: "priya@example.com", phone: "9876543210" });
  });

  it("recognises values by shape even under unusual variable names", () => {
    expect(leadFieldsFromVariables({ contact_details: "priya@example.com", Your_Mobile: "98765 43210" })).toEqual({
      name: null,
      email: "priya@example.com",
      phone: "9876543210",
    });
  });

  it("accepts a shorter number when the owner labelled the field as a phone", () => {
    expect(leadFieldsFromVariables({ phone: "555 1234" }).phone).toBe("5551234");
  });

  it("does not mistake a company name for the lead's name", () => {
    expect(leadFieldsFromVariables({ company_name: "Acme Ltd", full_name: "Priya" }).name).toBe("Priya");
  });

  it("ignores empty and non-string answers", () => {
    expect(leadFieldsFromVariables({ name: "  ", email: 42 as unknown as string })).toEqual({
      name: null,
      email: null,
      phone: null,
    });
  });
});

describe("renderTemplate", () => {
  it("fills in the first name and business", () => {
    expect(renderTemplate("Hi {name}, from {business}", { name: "Priya Shah", business: "Acme" })).toBe(
      "Hi Priya, from Acme"
    );
  });

  it("falls back to 'there' when the name is unknown", () => {
    expect(renderTemplate("Hi {name}", { name: null, business: "Acme" })).toBe("Hi there");
  });
});

describe("buildFollowUpEmail", () => {
  it("uses the defaults when the owner hasn't customised anything", () => {
    const email = buildFollowUpEmail({
      chatbot: { name: "Support bot", followUpSubject: null, followUpBody: null },
      user: { companyName: "Acme" },
      leadName: "Priya",
    });
    expect(email.subject).toBe("Following up on your message to Acme");
    expect(email.text).toContain("Hi Priya,");
    expect(email.business).toBe("Acme");
  });

  it("escapes HTML a visitor or owner might have typed", () => {
    const email = buildFollowUpEmail({
      chatbot: { name: "Bot", followUpSubject: null, followUpBody: "Hi {name} <script>x</script>" },
      user: { companyName: null },
      leadName: "<b>Eve</b>",
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<b>");
  });
});

describe("followUpDecision", () => {
  const now = new Date("2026-10-12T12:00:00Z");
  const chatbot = { followUpEnabled: true, followUpDelayHours: 24 };
  const due = { email: "p@example.com", status: "NEW" as const, createdAt: new Date(now.getTime() - 25 * HOUR) };
  const base = { lead: due, chatbot, ownerBlocked: false, teamReplied: false, now };

  it("sends a due follow-up to an unanswered NEW lead", () => {
    expect(followUpDecision(base)).toEqual({ action: "send" });
  });

  it("waits until the delay has passed", () => {
    const fresh = { ...due, createdAt: new Date(now.getTime() - 23 * HOUR) };
    expect(followUpDecision({ ...base, lead: fresh })).toEqual({ action: "wait" });
  });

  it("waits while follow-ups are off, or the lead has no email", () => {
    expect(followUpDecision({ ...base, chatbot: { ...chatbot, followUpEnabled: false } })).toEqual({ action: "wait" });
    expect(followUpDecision({ ...base, lead: { ...due, email: null } })).toEqual({ action: "wait" });
  });

  it("skips when the team already replied", () => {
    expect(followUpDecision({ ...base, teamReplied: true })).toMatchObject({ action: "skip" });
  });

  it("skips when the owner already moved the lead on", () => {
    expect(followUpDecision({ ...base, lead: { ...due, status: "CONTACTED" } })).toEqual({
      action: "skip",
      reason: "Marked Contacted before it was due",
    });
  });

  it("skips when the owner's account is inactive", () => {
    expect(followUpDecision({ ...base, ownerBlocked: true })).toMatchObject({ action: "skip" });
  });
});
