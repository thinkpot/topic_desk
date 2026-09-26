"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api, apiErrorMessage } from "@/lib/api";
import { nodeTypes } from "@/components/flow/nodes";
import NodeInspector from "@/components/flow/NodeInspector";
import { FLOW_PALETTE, defaultDataFor } from "@/lib/flow-node-defs";
import type { FlowNodeType } from "@/lib/flow-engine";
import { Spinner, Toggle } from "@/components/ui/primitives";

type FlowNode = Node<Record<string, unknown>>;

let counter = 0;
function newNodeId() {
  counter += 1;
  return `node_${Date.now().toString(36)}_${counter}`;
}

const PALETTE_COLOR: Record<string, string> = Object.fromEntries(FLOW_PALETTE.map((p) => [p.type, p.color]));

function FlowCanvas({ chatbotId }: { chatbotId: string }) {
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [botName, setBotName] = useState("");

  useEffect(() => {
    Promise.all([api.get(`/chatbots/${chatbotId}`), api.get(`/chatbots/${chatbotId}/flow`)])
      .then(([botRes, flowRes]) => {
        setBotName(botRes.data.chatbot.name);
        setNodes(
          flowRes.data.flow.nodes.map((n: FlowNode) => ({ ...n, deletable: n.type !== "start" }))
        );
        setEdges(flowRes.data.flow.edges);
        setIsEnabled(flowRes.data.flow.isEnabled);
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatbotId]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, id: `edge_${Date.now().toString(36)}` }, eds)),
    [setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow") as FlowNodeType | "";
      if (!type) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setNodes((nds) => nds.concat({ id: newNodeId(), type, position, data: defaultDataFor(type), deletable: true }));
    },
    [screenToFlowPosition, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  function updateNodeData(id: string, data: Record<string, unknown>) {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data } : n)));
  }

  function deleteNode(id: string) {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.patch(`/chatbots/${chatbotId}/flow`, {
        nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null })),
        isEnabled,
      });
      setIsEnabled(res.data.flow.isEnabled);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2000);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/chatbots/${chatbotId}`} className="text-[13px] text-ink-3 hover:text-ink">
            ← {botName || "Chatbot"}
          </Link>
          <span className="text-[14px] font-semibold">Flow builder</span>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-[13px] text-critical">{error}</span>}
          {!error && savedAt && <span className="text-[13px] text-ink-3">Saved.</span>}
          <label className="flex items-center gap-2 text-[13px] font-medium">
            <Toggle checked={isEnabled} onChange={setIsEnabled} label="Flow is on" />
            {isEnabled ? "On" : "Off"}
          </label>
          <button onClick={save} disabled={saving} className="btn-primary btn-sm">
            {saving ? "Saving…" : "Save flow"}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="w-[184px] shrink-0 space-y-2 overflow-y-auto border-r border-line bg-surface p-3">
          <p className="label-eyebrow mb-1">Drag onto canvas</p>
          {FLOW_PALETTE.map((entry) => (
            <div
              key={entry.type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/reactflow", entry.type);
                e.dataTransfer.effectAllowed = "move";
              }}
              className="cursor-grab select-none rounded-md border border-line bg-surface p-2.5 transition-colors hover:border-line-strong active:cursor-grabbing"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[13px]">{entry.icon}</span>
                <span className="text-[13px] font-medium">{entry.label}</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-3">{entry.description}</p>
            </div>
          ))}
        </div>

        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            deleteKeyCode={["Backspace", "Delete"]}
            fitView
            fitViewOptions={{ maxZoom: 1 }}
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable nodeColor={(n) => PALETTE_COLOR[n.type ?? ""] ?? "#0a0a0a"} />
          </ReactFlow>
        </div>

        {selectedNode && (
          <div className="w-[300px] shrink-0 border-l border-line bg-surface">
            <NodeInspector
              node={selectedNode}
              onChange={(data) => updateNodeData(selectedNode.id, data)}
              onDelete={() => deleteNode(selectedNode.id)}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function FlowPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ReactFlowProvider>
      <FlowCanvas chatbotId={id} />
    </ReactFlowProvider>
  );
}
