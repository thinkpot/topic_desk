/** Trial onboarding checklist state, derived from real account data by GET /api/onboarding. */
export interface OnboardingProgress {
  connected: boolean;
  installed: boolean;
  firstChat: boolean;
  firstReply: boolean;
  /** The chatbot the next step's link should point at, if there is one. */
  chatbotId: string | null;
}
