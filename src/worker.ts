import { InMemoryTaskStore, type TaskStore, type AgentExecutor, DefaultRequestHandler } from "@a2a-js/sdk";
import { movieAgentCard, MovieAgentExecutor } from "./movie-agent/index.js";
import { A2AHonoApp } from "./a2a-hono-app.js";
import { createConfig } from "./config/env.js";

// Create the app for each request with environment
function createApp(env: Env) {
  // 1. Create config with Cloudflare Worker environment
  const config = createConfig(env);
  
  // 2. Create TaskStore
  const taskStore: TaskStore = new InMemoryTaskStore();

  // 3. Create AgentExecutor with environment config
  const agentExecutor: AgentExecutor = new MovieAgentExecutor();

  // 4. Create DefaultRequestHandler
  const requestHandler = new DefaultRequestHandler(
    movieAgentCard,
    taskStore,
    agentExecutor
  );

  // 5. Create and setup A2AHonoApp
  const appBuilder = new A2AHonoApp(requestHandler);
  return appBuilder.createApp();
}

// Cloudflare Worker fetch handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const honoApp = createApp(env);
    return honoApp.fetch(request, env);
  },
};

// TypeScript interfaces for Cloudflare Worker
interface Env {
  // Define your environment variables here
  OPENROUTER_API_KEY?: string;
  TMDB_API_TOKEN?: string;
  PROXY_URL?: string;
  USE_PROXY?: string;
}

interface CloudflareExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
} 