import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

const DEFAULT_GRAPH = {
  nodes: [{ id: "start", type: "start", position: { x: 80, y: 160 }, data: {} }],
  edges: [],
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const bot = await prisma.chatbot.findFirst({ where: { id, userId: auth.user.id } });
  if (!bot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

  const flow = await prisma.flow.findUnique({ where: { chatbotId: bot.id } });
  if (!flow) {
    return NextResponse.json({ flow: { nodes: DEFAULT_GRAPH.nodes, edges: DEFAULT_GRAPH.edges, isEnabled: false } });
  }
  return NextResponse.json({ flow: { nodes: flow.nodes, edges: flow.edges, isEnabled: flow.isEnabled } });
}

const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["start", "message", "question", "buttons", "condition", "handoff", "end"]),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()),
});

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullable().optional(),
});

const saveSchema = z.object({
  nodes: z.array(nodeSchema).max(200),
  edges: z.array(edgeSchema).max(400),
  isEnabled: z.boolean(),
});

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const bot = await prisma.chatbot.findFirst({ where: { id, userId: auth.user.id } });
  if (!bot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

  const parsed = saveSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { nodes, edges, isEnabled } = parsed.data;

  if (isEnabled && !nodes.some((n) => n.type === "start")) {
    return NextResponse.json({ error: "The flow needs a Start node before it can be turned on." }, { status: 400 });
  }

  const flow = await prisma.flow.upsert({
    where: { chatbotId: bot.id },
    update: { nodes: nodes as Prisma.InputJsonValue, edges: edges as Prisma.InputJsonValue, isEnabled },
    create: {
      chatbotId: bot.id,
      nodes: nodes as Prisma.InputJsonValue,
      edges: edges as Prisma.InputJsonValue,
      isEnabled,
    },
  });

  return NextResponse.json({ flow: { nodes: flow.nodes, edges: flow.edges, isEnabled: flow.isEnabled } });
}
