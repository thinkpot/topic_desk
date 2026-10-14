import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import { DEFAULT_GRAPH, MAX_FLOWS_PER_CHATBOT, ensureFlows, flowNameSchema } from "@/lib/flow-store";

type RouteContext = { params: Promise<{ id: string }> };

async function loadOwnedBot(req: NextRequest, params: RouteContext["params"]) {
  const auth = await requireActiveUser(req);
  if ("response" in auth) return { response: auth.response };
  const { id } = await params;
  const bot = await prisma.chatbot.findFirst({ where: { id, userId: auth.user.id }, select: { id: true } });
  if (!bot) return { response: NextResponse.json({ error: "Chatbot not found" }, { status: 404 }) };
  return { bot };
}

function summary(flow: { id: string; name: string; isMain: boolean; isEnabled: boolean; nodes: unknown; updatedAt: Date }) {
  return {
    id: flow.id,
    name: flow.name,
    isMain: flow.isMain,
    isEnabled: flow.isEnabled,
    stepCount: Array.isArray(flow.nodes) ? flow.nodes.length - 1 : 0, // not counting Start
    updatedAt: flow.updatedAt,
  };
}

// Lists the chatbot's flows, main first. Creates an empty main flow the first
// time, so the builder always has something to open.
export async function GET(req: NextRequest, { params }: RouteContext) {
  const loaded = await loadOwnedBot(req, params);
  if ("response" in loaded) return loaded.response;
  const flows = await ensureFlows(loaded.bot.id);
  return NextResponse.json({ flows: flows.map(summary) });
}

const createSchema = z.object({ name: flowNameSchema });

export async function POST(req: NextRequest, { params }: RouteContext) {
  const loaded = await loadOwnedBot(req, params);
  if ("response" in loaded) return loaded.response;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await ensureFlows(loaded.bot.id);
  if (existing.length >= MAX_FLOWS_PER_CHATBOT) {
    return NextResponse.json({ error: `A chatbot can have up to ${MAX_FLOWS_PER_CHATBOT} flows.` }, { status: 400 });
  }
  if (existing.some((f) => f.name.toLowerCase() === parsed.data.name.toLowerCase())) {
    return NextResponse.json({ error: "There's already a flow with that name." }, { status: 409 });
  }

  const flow = await prisma.flow.create({
    data: {
      chatbotId: loaded.bot.id,
      name: parsed.data.name,
      isMain: false,
      nodes: DEFAULT_GRAPH.nodes as Prisma.InputJsonValue,
      edges: DEFAULT_GRAPH.edges as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json({ flow: summary(flow) }, { status: 201 });
}
