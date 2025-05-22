"use client";

import { useState, useCallback } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { NodeData, Condition, N8nNode, N8nWorkflow } from "../interfaces/n8n";
import CustomNode from "./CustomNode";

const convertN8nToReactFlow = (
  workflow: N8nWorkflow
): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = workflow.nodes.map((node) => ({
    id: node.id,
    type: "custom",
    position: { x: node.position[0], y: node.position[1] },
    data: {
      label: node.name,
      nodeType: node.type,
      ...(node.type.includes("if")
        ? {
            conditions: node.parameters?.conditions?.conditions || [],
            combinator: node.parameters?.conditions?.combinator || "and",
          }
        : node.type.includes("googleSheets")
        ? {
            documentId: node.parameters?.documentId?.cachedResultName || "N/A",
            sheetName: node.parameters?.sheetName?.cachedResultName || "N/A",
          }
        : node.type.includes("gmail")
        ? { subject: node.parameters?.subject || "N/A" }
        : { parameters: node.parameters || {} }),
    },
  }));

  const nodeIdMap: Record<string, N8nNode> = {};
  workflow.nodes.forEach((node) => {
    nodeIdMap[node.id] = node;
  });

  const nameToIdMap: Record<string, string> = {};
  workflow.nodes.forEach((node) => {
    nameToIdMap[node.name] = node.id;
  });

  const edges: Edge[] = [];
  Object.entries(workflow.connections).forEach(
    ([sourceName, connectionData]) => {
      const sourceId = nameToIdMap[sourceName];
      if (!sourceId) {
        console.warn(
          `Source node with name "${sourceName}" not found in nodes.`
        );
        return;
      }

      if (connectionData.main && Array.isArray(connectionData.main)) {
        connectionData.main.forEach((outputGroup, outputIndex) => {
          if (Array.isArray(outputGroup) && outputGroup.length > 0) {
            outputGroup.forEach((connection) => {
              const targetName = connection.node;
              const targetId = nameToIdMap[targetName];
              if (!targetId) {
                console.warn(
                  `Target node with name "${targetName}" not found in nodes.`
                );
                return;
              }

              const edgeId = `e-${sourceId}-${targetId}-${outputIndex}-${
                connection.index || 0
              }`;
              edges.push({
                id: edgeId,
                source: sourceId,
                target: targetId,
                sourceHandle: `output-${outputIndex}`,
                targetHandle: `input-${connection.index || 0}`,
                type: "smoothstep",
                animated: true,
                style: { stroke: "#555", strokeWidth: 2 },
                // label: `${outputIndex} → ${connection.index || 0}`,
              });
            });
          }
        });
      }
    }
  );

  return { nodes, edges };
};

const nodeTypes = { custom: CustomNode };

const FlowChart: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [error, setError] = useState<string | null>("Tải file JSON");
  const [workflow, setWorkflow] = useState<N8nWorkflow | null>(null);
  const [filename, setFilename] = useState<string>("No file selected");

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        const newEdge: Edge = {
          id: `e-${params.source}-${params.target}`,
          source: params.source,
          target: params.target,
          sourceHandle: params.sourceHandle ?? undefined,
          targetHandle: params.targetHandle ?? undefined,
          type: "smoothstep",
          animated: true,
        };
        setEdges((eds) => [...eds, newEdge]);
      }
    },
    [setEdges]
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setError("Chọn file JSON");
      return;
    }

    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflowData: N8nWorkflow = JSON.parse(
          e.target?.result as string
        );
        if (!workflowData.nodes || !workflowData.connections)
          throw new Error("JSON không hợp lệ");

        setWorkflow(workflowData);

        const { nodes: newNodes, edges: newEdges } =
          convertN8nToReactFlow(workflowData);

        setNodes(newNodes);
        setEdges(newEdges);
        setError(null);
      } catch (e) {
        console.error("JSON parsing error:", e);
        setError("Lỗi: File JSON không hợp lệ");
      }
    };
    reader.readAsText(file);
  };

  return (
    <ReactFlowProvider>
      <div
        style={{ height: "100vh", display: "flex", flexDirection: "column" }}
      >
        <div
          style={{
            padding: "15px",
            borderBottom: "1px solid #ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f5f5f5",
          }}
        >
          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              style={{ marginRight: "15px" }}
            />
            <span style={{ fontSize: "14px", color: "#555" }}>
              {error ? (
                <span
                  style={{ color: error.startsWith("Tải") ? "#555" : "red" }}
                >
                  {error}
                </span>
              ) : (
                <span>
                  Loaded: <b>{filename}</b> ({nodes.length} nodes,{" "}
                  {edges.length} edges)
                </span>
              )}
            </span>
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
};

export default FlowChart;
