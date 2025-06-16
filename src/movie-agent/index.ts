import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

import {
  type AgentExecutor,
  RequestContext,
  type ExecutionEventBus,
  type AgentCard,
  type Task,
  type TaskState,
  type TaskStatusUpdateEvent,
  type TextPart,
  type Message
} from "@a2a-js/sdk";
import { openai, DEFAULT_MODEL, executeTool, type ToolCall } from "./openai.js";
import { allTools } from "./tools.js";
import { config } from "../config/env.js";

if (!process.env.TMDB_API_KEY) {
  console.error("TMDB_API_KEY environment variable is required")
  process.exit(1);
}

// Simple store for contexts
const contexts: Map<string, Message[]> = new Map();

// 系统提示词
const SYSTEM_PROMPT = `You are a movie expert. Answer the user's question about movies and film industry personalities, using the searchMovies and searchPeople tools to find out more information as needed. Feel free to call them multiple times in parallel if necessary.

The current date and time is: {{now}}

If the user asks you for specific information about a movie or person (such as the plot or a specific role an actor played), do a search for that movie/actor using the available functions before responding.

## Output Instructions

ALWAYS end your response with either "COMPLETED" or "AWAITING_USER_INPUT" on its own line. If you have answered the user's question, use COMPLETED. If you need more information to answer the question, use AWAITING_USER_INPUT.

Example:
User: when was [some_movie] released?
Assistant: [some_movie] was released on October 3, 1992.
COMPLETED`;

/**
 * MovieAgentExecutor implements the agent's core logic.
 */
export class MovieAgentExecutor implements AgentExecutor {
  private cancelledTasks = new Set<string>();

  public cancelTask = async (
        taskId: string,
        eventBus: ExecutionEventBus,
    ): Promise<void> => {
        this.cancelledTasks.add(taskId);
        // The execute loop is responsible for publishing the final state
    };

  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    const userMessage = requestContext.userMessage;
    const existingTask = requestContext.task;

    // Determine IDs for the task and context
    const taskId = requestContext.taskId;
    const contextId = requestContext.contextId;

    console.log(
      `[MovieAgentExecutor] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId})`
    );

    // 1. Publish initial Task event if it's a new task
    if (!existingTask) {
      const initialTask: Task = {
        kind: 'task',
        id: taskId,
        contextId: contextId,
        status: {
          state: 'submitted',
          timestamp: new Date().toISOString(),
        },
        history: [userMessage], // Start history with the current user message
        metadata: userMessage.metadata, // Carry over metadata from message if any
      };
      eventBus.publish(initialTask);
    }

    // 2. Publish "working" status update
    const workingStatusUpdate: TaskStatusUpdateEvent = {
      kind: 'status-update',
      taskId: taskId,
      contextId: contextId,
      status: {
        state: 'working',
        message: {
          kind: 'message',
          role: 'agent',
          messageId: uuidv4(),
          parts: [{ kind: 'text', text: 'Processing your question, hang tight!' }],
          taskId: taskId,
          contextId: contextId,
        },
        timestamp: new Date().toISOString(),
      },
      final: false,
    };
    eventBus.publish(workingStatusUpdate);

    // 3. Prepare messages for OpenAI
    const historyForOpenAI = contexts.get(contextId) || [];
    if (!historyForOpenAI.find(m => m.messageId === userMessage.messageId)) {
      historyForOpenAI.push(userMessage);
    }
    contexts.set(contextId, historyForOpenAI)

    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [];
    
    // 添加系统提示词
    const goal = existingTask?.metadata?.goal as string | undefined || userMessage.metadata?.goal as string | undefined;
    const systemPrompt = SYSTEM_PROMPT
      .replace('{{now}}', new Date().toISOString())
      + (goal ? `\n\nYour goal in this task is: ${goal}` : '');
    
    messages.push({
      role: 'system',
      content: systemPrompt
    });

    // 添加历史消息
    for (const m of historyForOpenAI) {
      const textParts = m.parts.filter((p): p is TextPart => p.kind === 'text' && !!(p as TextPart).text);
      if (textParts.length > 0) {
        const content = textParts.map(p => (p as TextPart).text).join('\n');
        messages.push({
          role: m.role === 'agent' ? 'assistant' : 'user',
          content: content
        });
      }
    }

    if (messages.length <= 1) { // 只有系统消息
      console.warn(
        `[MovieAgentExecutor] No valid text messages found in history for task ${taskId}.`
      );
      const failureUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId: taskId,
        contextId: contextId,
        status: {
          state: 'failed',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ kind: 'text', text: 'No message found to process.' }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(failureUpdate);
      return;
    }

    try {
      // 4. Run the OpenAI chat completion
      const response = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: messages,
        tools: allTools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 2000,
      });

      // Check if the request has been cancelled
      if (this.cancelledTasks.has(taskId)) {
        console.log(`[MovieAgentExecutor] Request cancelled for task: ${taskId}`);

        const cancelledUpdate: TaskStatusUpdateEvent = {
          kind: 'status-update',
          taskId: taskId,
          contextId: contextId,
          status: {
            state: 'canceled',
            timestamp: new Date().toISOString(),
          },
          final: true, // Cancellation is a final state
        };
        eventBus.publish(cancelledUpdate);
        return;
      }

      // handle openai response
      const choice = response.choices[0];
      let responseText = choice.message.content || '';
      
      // handle tool calls
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        const toolResults: string[] = [];
        
        for (const toolCall of choice.message.tool_calls) {
          try {
            const result = await executeTool(toolCall as ToolCall);
            toolResults.push(`Tool ${toolCall.function.name} result: ${JSON.stringify(result, null, 2)}`);
          } catch (error: any) {
            toolResults.push(`Tool ${toolCall.function.name} error: ${error.message}`);
          }
        }
        
        // if there are tool calls, we need to call ai again to get the final answer
        const toolMessage = toolResults.join('\n\n');
        const followUpMessages = [...messages];
        followUpMessages.push({
          role: 'assistant',
          content: choice.message.content || 'Using tools to get information...'
        });
        followUpMessages.push({
          role: 'user',
          content: `Tool results:\n${toolMessage}\n\nPlease provide your final answer based on this information.`
        });
        
        const finalResponse = await openai.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: followUpMessages,
          temperature: 0.7,
          max_tokens: 2000,
        });
        
        responseText = finalResponse.choices[0].message.content || '';
      }
      
      console.info(`[MovieAgentExecutor] AI response: ${responseText}`);
      const lines = responseText.trim().split('\n');
      const finalStateLine = lines.at(-1)?.trim().toUpperCase();
      const agentReplyText = lines.slice(0, lines.length - 1).join('\n').trim();

      let finalA2AState: TaskState = "unknown";

      if (finalStateLine === 'COMPLETED') {
        finalA2AState = 'completed';
      } else if (finalStateLine === 'AWAITING_USER_INPUT') {
        finalA2AState = 'input-required';
      } else {
        console.warn(
          `[MovieAgentExecutor] Unexpected final state line from AI: ${finalStateLine}. Defaulting to 'completed'.`
        );
        finalA2AState = 'completed'; // Default if LLM deviates
      }

      // 5. Publish final task status update
      const agentMessage: Message = {
        kind: 'message',
        role: 'agent',
        messageId: uuidv4(),
        parts: [{ kind: 'text', text: agentReplyText || "Completed." }], // Ensure some text
        taskId: taskId,
        contextId: contextId,
      };
      historyForOpenAI.push(agentMessage);
      contexts.set(contextId, historyForOpenAI)

      const finalUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId: taskId,
        contextId: contextId,
        status: {
          state: finalA2AState,
          message: agentMessage,
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(finalUpdate);

      console.log(
        `[MovieAgentExecutor] Task ${taskId} finished with state: ${finalA2AState}`
      );

    } catch (error: any) {
      console.error(
        `[MovieAgentExecutor] Error processing task ${taskId}:`,
        error
      );
      const errorUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId: taskId,
        contextId: contextId,
        status: {
          state: 'failed',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ kind: 'text', text: `Agent error: ${error.message}` }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(errorUpdate);
    }
  }
}

// --- Server Setup ---

export const movieAgentCard: AgentCard = {
  name: 'Movie Agent',
  description: 'An agent that can answer questions about movies and actors using TMDB.',
  // Adjust the base URL and port as needed. /a2a is the default base in A2AExpressApp
  url: `http://localhost:${config.port}/`, // Example: if baseUrl in A2AExpressApp 
  provider: {
    organization: 'A2AProtocol.ai',
    url: 'https://a2aprotocol.ai' // Added provider URL
  },
  version: '0.0.2', // Incremented version
  capabilities: {
    streaming: true, // The new framework supports streaming
    pushNotifications: false, // Assuming not implemented for this agent yet
    stateTransitionHistory: true, // Agent uses history
  },
  // authentication: null, // Property 'authentication' does not exist on type 'AgentCard'.
  securitySchemes: undefined, // Or define actual security schemes if any
  security: undefined,
  defaultInputModes: ['text'],
  defaultOutputModes: ['text', 'task-status'], // task-status is a common output mode
  skills: [
    {
      id: 'general_movie_chat',
      name: 'General Movie Chat',
      description: 'Answer general questions or chat about movies, actors, directors.',
      tags: ['movies', 'actors', 'directors'],
      examples: [
        'Tell me about the plot of Inception.',
        'Recommend a good sci-fi movie.',
        'Who directed The Matrix?',
        'What other movies has Scarlett Johansson been in?',
        'Find action movies starring Keanu Reeves',
        'Which came out first, Jurassic Park or Terminator 2?',
      ],
      inputModes: ['text'], // Explicitly defining for skill
      outputModes: ['text', 'task-status'] // Explicitly defining for skill
    },
  ],
  supportsAuthenticatedExtendedCard: false,
};
