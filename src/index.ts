import { InMemoryTaskStore, type TaskStore, type AgentExecutor, RequestContext, type ExecutionEventBus, DefaultRequestHandler, type AgentCard, type Task, type TaskState, type TaskStatusUpdateEvent, type TextPart, type Message } from "@a2a-js/sdk";
import { movieAgentCard, MovieAgentExecutor } from "./movie-agent/index.js";
import { A2AHonoApp } from "./a2a-hono-app.js";
import { serve } from '@hono/node-server';

async function main() {
  // 1. Create TaskStore
  const taskStore: TaskStore = new InMemoryTaskStore();

  // 2. Create AgentExecutor
  const agentExecutor: AgentExecutor = new MovieAgentExecutor();

  // 3. Create DefaultRequestHandler
  const requestHandler = new DefaultRequestHandler(
    movieAgentCard,
    taskStore,
    agentExecutor
  );

  // 4. Create and setup A2AHonoApp
  const appBuilder = new A2AHonoApp(requestHandler);
  const honoApp = appBuilder.createApp();

  // 5. Start the server
  const PORT = parseInt(process.env.PORT || '41241', 10);
  
  serve({
    fetch: honoApp.fetch,
    port: PORT,
  }, (info) => {
    console.log(`[MovieAgent] Server using Hono framework started on http://localhost:${info.port}`);
    console.log(`[MovieAgent] Agent Card: http://localhost:${info.port}/.well-known/agent.json`);
    console.log('[MovieAgent] Press Ctrl+C to stop the server');
  });
}

main().catch(console.error);
