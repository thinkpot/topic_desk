import { Plan } from "@prisma/client";

export const PLAN_LIMITS: Record<Plan, { maxChatbots: number; maxMonthlyUsers: number; priceINR: number; label: string }> = {
  BASIC: { maxChatbots: 1, maxMonthlyUsers: 3000, priceINR: 1000, label: "Basic" },
  PRO: { maxChatbots: Infinity, maxMonthlyUsers: Infinity, priceINR: 3000, label: "Pro" },
};
