// Follow-up defaults shared by the server (lib/leads.ts) and the settings form.
// Kept free of server imports so it can be bundled into the browser.

export const DEFAULT_FOLLOW_UP_SUBJECT = "Following up on your message to {business}";
export const DEFAULT_FOLLOW_UP_BODY = `Hi {name},

Thanks for getting in touch with {business} through our website chat. We wanted to make sure your question didn't slip through the cracks.

Just reply to this email and we'll get right back to you.

{business}`;

export const FOLLOW_UP_DELAY_HOURS = [1, 2, 4, 8, 12, 24, 48, 72] as const;
