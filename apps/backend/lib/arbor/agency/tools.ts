export type AgencyToolRisk =
  | "read"
  | "reversible_write"
  | "irreversible"
  | "high_consequence";

export type AgencyToolContext = {
  userId: string;
  projectId: string;
  conversationId?: string | null;
  turnId: string;
};

export type AgencyTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  risk: AgencyToolRisk;

  execute(
    args: Record<string, unknown>,
    context: AgencyToolContext,
  ): Promise<unknown>;
};

export class AgencyToolRegistry {
  private readonly tools = new Map<string, AgencyTool>();

  register(tool: AgencyTool): this {
    if (this.tools.has(tool.name)) {
      throw new Error(`agency_tool_duplicate:${tool.name}`);
    }

    this.tools.set(tool.name, tool);
    return this;
  }

  get(name: string): AgencyTool {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`agency_tool_unknown:${name}`);
    return tool;
  }

  list(): AgencyTool[] {
    return [...this.tools.values()];
  }

  openAIToolDefinitions(): Array<Record<string, unknown>> {
    return this.list().map((tool) => ({
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      strict: true,
    }));
  }
}

export function toolNeedsUserBoundary(tool: AgencyTool): boolean {
  return tool.risk === "irreversible" || tool.risk === "high_consequence";
}
