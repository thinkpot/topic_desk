import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PLANS = [
  {
    slug: "free",
    name: "Free",
    description: "Account only — upgrade to a paid plan to create a chatbot.",
    priceINR: 0,
    maxChatbots: 0,
    maxMonthlyUsers: 0,
    isPaid: false,
    isPublic: false,
    sortOrder: 0,
  },
  {
    slug: "basic",
    name: "Basic",
    description: "One chatbot for a single website.",
    priceINR: 499,
    priceYearlyINR: 399 * 12,
    maxChatbots: 1,
    maxMonthlyUsers: 3000,
    isPaid: true,
    isPublic: true,
    sortOrder: 1,
    maxLiveVisitors: 10,
    supportsDashboardChat: false,
  },
  {
    slug: "pro",
    name: "Pro",
    description: "10 chatbots and 10,000 visitor conversations a month.",
    priceINR: 999,
    priceYearlyINR: 799 * 12,
    maxChatbots: 10,
    maxMonthlyUsers: 10000,
    isPaid: true,
    isPublic: true,
    sortOrder: 2,
    maxLiveVisitors: 100,
    supportsDashboardChat: true,
  },
];

async function main() {
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }
  console.log(`Seeded ${PLANS.length} plans.`);

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("Skipped admin user: set ADMIN_EMAIL and ADMIN_PASSWORD to create one.");
    return;
  }

  const proPlan = await prisma.plan.findUniqueOrThrow({ where: { slug: "pro" } });
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", password: hashed, planId: proPlan.id },
    create: {
      name: process.env.ADMIN_NAME ?? "Admin",
      email,
      password: hashed,
      role: "ADMIN",
      planId: proPlan.id,
    },
  });
  console.log(`Admin user ready: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
