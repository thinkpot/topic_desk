import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./prisma";
import { referencedFlowIds, type FlowGraph } from "./flow-engine";

/**
 * Server-side storage rules for a chatbot's flows: the save schema, the main
 * flow guarantee, and the cross-flow reference checks the builder relies on.
 */

export const MAX_FLOWS_PER_CHATBOT = 20;

export const DEFAULT_GRAPH = {
  nodes: [{ id: "start", type: "start", position: { x: 80, y: 160 }, data: {} }],
  edges: [],
};

const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["start", "message", "question", "buttons", "condition", "handoff", "end", "goto_flow"]),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()),
});

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullable().optional(),
});

export const flowNameSchema = z
  .string()
  .trim()
  .min(1, "Give the flow a name")
  .max(60, "Keep the name under 60 characters");

export const saveFlowSchema = z
  .object({
    name: flowNameSchema.optional(),
    nodes: z.array(nodeSchema).max(200).optional(),
    edges: z.array(edgeSchema).max(400).optional(),
    isEnabled: z.boolean().optional(),
  })
  .refine((v) => (v.nodes === undefined) === (v.edges === undefined), "Send nodes and edges together");

/**
 * Makes sure a chatbot has exactly one main flow, creating an empty one if it
 * has no flows at all. Returns its flows, main first.
 */
export async function ensureFlows(chatbotId: string) {
  let flows = await prisma.flow.findMany({ where: { chatbotId }, orderBy: { createdAt: "asc" } });
  if (flows.length === 0) {
    await prisma.flow.create({
      data: {
        chatbotId,
        name: "Main",
        isMain: true,
        isEnabled: false,
        nodes: DEFAULT_GRAPH.nodes as Prisma.InputJsonValue,
        edges: DEFAULT_GRAPH.edges as Prisma.InputJsonValue,
      },
    });
    flows = await prisma.flow.findMany({ where: { chatbotId }, orderBy: { createdAt: "asc" } });
  } else if (!flows.some((f) => f.isMain)) {
    await prisma.flow.update({ where: { id: flows[0].id }, data: { isMain: true } });
    flows[0] = { ...flows[0], isMain: true };
  }
  return [...flows].sort((a, b) => Number(b.isMain) - Number(a.isMain));
}

/**
 * Problems with a flow's Go to flow nodes, given the chatbot's other flow ids.
 * Each must point at a different flow that actually exists.
 */
export function gotoProblems(
  nodes: { type: string; data: Record<string, unknown> }[],
  selfId: string,
  existingFlowIds: Set<string>
): string | null {
  for (const node of nodes) {
    if (node.type !== "goto_flow") continue;
    const target = typeof node.data.flowId === "string" ? node.data.flowId : "";
    if (!target) return "A Go to flow step doesn't have a flow picked yet.";
    if (target === selfId) return "A Go to flow step can't point at the flow it's in.";
    if (!existingFlowIds.has(target)) return "A Go to flow step points at a flow that no longer exists.";
    const mode = node.data.mode;
    if (mode !== undefined && mode !== "return" && mode !== "jump") return "A Go to flow step has an unknown mode.";
  }
  return null;
}

/** Names of the flows (other than this one) that have a Go to flow step pointing at flowId. */
export function flowsReferencing(
  flows: { id: string; name: string; nodes: unknown; edges: unknown }[],
  flowId: string
): string[] {
  return flows
    .filter((f) => f.id !== flowId && referencedFlowIds({ nodes: f.nodes, edges: f.edges } as unknown as FlowGraph).includes(flowId))
    .map((f) => f.name);
}
