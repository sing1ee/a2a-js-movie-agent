import { InMemoryTaskStore, type TaskStore, A2AExpressApp, type AgentExecutor, RequestContext, type ExecutionEventBus, DefaultRequestHandler, type AgentCard, type Task, type TaskState, type TaskStatusUpdateEvent, type TextPart, type Message } from "@a2a-js/sdk";
import { movieAgentCard, MovieAgentExecutor } from "./movie-agent/index.js";
import express from "express";

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

  // 4. Create and setup A2AExpressApp
  const appBuilder = new A2AExpressApp(requestHandler);
  const expressApp = appBuilder.setupRoutes(express());

  // 5. Start the server
  const PORT = process.env.PORT || 41241;
  expressApp.listen(PORT, () => {
    console.log(`[MovieAgent] Server using new framework started on http://localhost:${PORT}`);
    console.log(`[MovieAgent] Agent Card: http://localhost:${PORT}/.well-known/agent.json`);
    console.log('[MovieAgent] Press Ctrl+C to stop the server');
  });
}

main().catch(console.error);
