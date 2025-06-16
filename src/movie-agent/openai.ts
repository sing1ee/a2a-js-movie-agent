import OpenAI from 'openai';
import { config } from '../config/env.js';

// create openai client, config to use openrouter
export const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: config.openRouterApiKey,
});

// default model config
export const DEFAULT_MODEL = "meta-llama/llama-3.1-8b-instruct:free";

// tool call interface
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// tool definition interface
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

// tool execution function type
export type ToolExecutionFunction = (args: any) => Promise<any>;

// tool registry
export const toolRegistry: Map<string, ToolExecutionFunction> = new Map();

// register tool function
export function registerTool(name: string, func: ToolExecutionFunction): void {
  toolRegistry.set(name, func);
}

// execute tool call
export async function executeTool(toolCall: ToolCall): Promise<any> {
  const func = toolRegistry.get(toolCall.function.name);
  if (!func) {
    throw new Error(`Unknown tool: ${toolCall.function.name}`);
  }
  
  try {
    const args = JSON.parse(toolCall.function.arguments);
    return await func(args);
  } catch (error) {
    console.error(`Error executing tool ${toolCall.function.name}:`, error);
    throw error;
  }
} 