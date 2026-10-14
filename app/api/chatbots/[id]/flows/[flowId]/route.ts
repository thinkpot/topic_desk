import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import { flowsReferencing, gotoProblems, saveFlowSchema } from "@/lib/flow-store";

type RouteContext = { params: Promise<{ id: string; flowId: string }> };

async function loadOwnedFlow(req: NextRequest, params: RouteContext["params"]) {
  const auth = await requireActiveUser(req);
  if ("response" in auth) return { response: auth.response };
  const { id, flowId } = await params;
  const flow = await prisma.flow.findFirst({ where: { id: flowId, chatbot: { id, userId: auth.user.id } } });
  if (!flow) return { response: NextResponse.json({ error: "Flow not found" }, { status: 404 }) };
  return { flow };
}

function view(flow: { id: string; name: string; isMain: boolean; isEnabled: boolean; nodes: unknown; edges: unknown }) {
  return { id: flow.id, name: flow.name, isMain: flow.isMain, isEnabled: flow.isEnabled, nodes: flow.nodes, edges: flow.edges };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const loaded = await loadOwnedFlow(req, params);
  if ("response" in loaded) return loaded.response;
  return NextResponse.json({ flow: view(loaded.flow) });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const loaded = await loadOwnedFlow(req, params);
  if ("response" in loaded) return loaded.response;
  const { flow } = loaded;

  const parsed = saveFlowSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { name, nodes, edges, isEnabled } = parsed.data;

  const siblings = await prisma.flow.findMany({
    where: { chatbotId: flow.chatbotId },
    select: { id: true, name: true },
  });

  if (isEnabled !== undefined && !flow.isMain && isEnabled !== flow.isEnabled) {
    return NextResponse.json(
      { error: "Only the main flow switches flows on or off. Other flows run when a Go to flow step reaches them." },
      { status: 400 }
    );
  }
  if (name && siblings.some((f) => f.id !== flow.id && f.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "There's already a flow with that name." }, { status: 409 });
  }
  if (nodes) {
    const problem = gotoProblems(nodes, flow.id, new Set(siblings.map((f) => f.id)));
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }
  const finalNodes = nodes ?? (flow.nodes as { type: string }[]);
  const enabling = flow.isMain && (isEnabled ?? flow.isEnabled);
  if (enabling && !finalNodes.some((n) => n.type === "start")) {
    return NextResponse.json({ error: "The flow needs a Start node before it can be turned on." }, { status: 400 });
  }

  const updated = await prisma.flow.update({
    where: { id: flow.id },
    data: {
      ...(name !== undefined && { name }),
      ...(nodes && { nodes: nodes as Prisma.InputJsonValue, edges: edges as Prisma.InputJsonValue }),
      ...(flow.isMain && isEnabled !== undefined && { isEnabled }),
    },
  });
  return NextResponse.json({ flow: view(updated) });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const loaded = await loadOwnedFlow(req, params);
  if ("response" in loaded) return loaded.response;
  const { flow } = loaded;

  if (flow.isMain) {
    return NextResponse.json({ error: "The main flow can't be deleted — every conversation starts there." }, { status: 400 });
  }

  const siblings = await prisma.flow.findMany({ where: { chatbotId: flow.chatbotId } });
  const usedBy = flowsReferencing(siblings, flow.id);
  if (usedBy.length) {
    return NextResponse.json(
      { error: `Still used by a Go to flow step in: ${usedBy.join(", ")}. Remove or repoint those steps first.` },
      { status: 409 }
    );
  }

  await prisma.$transaction([
    // Anyone mid-way through this flow starts over from the main flow on
    // their next message, rather than resuming at a node that's gone.
    prisma.conversation.updateMany({
      where: { chatbotId: flow.chatbotId, currentFlowId: flow.id },
      data: { currentFlowId: null, currentNodeId: null, flowStack: [] },
    }),
    prisma.flow.delete({ where: { id: flow.id } }),
  ]);
  return new NextResponse(null, { status: 204 });
}
