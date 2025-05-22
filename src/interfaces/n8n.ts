export interface N8nNode {
  id: string;
  type: string;
  position: [number, number];
  name: string;
  parameters?: Record<string, any>;
}

export interface N8nWorkflow {
  nodes: N8nNode[];
  connections: Record<
    string,
    { main: Array<Array<{ node: string; index: number }>> }
  >;
}

export interface NodeData {
  label: string;
  [key: string]: any;
}

export interface Condition {
  id: string;
  leftValue: string;
  rightValue: string | number;
  operator: {
    type: string;
    operation: string;
    singleValue?: boolean;
  };
}
