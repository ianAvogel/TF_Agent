import { BaseAgent } from '../core/BaseAgent';
import { AgentRole, Task, TaskStatus, Knowledge, Message, MessageType, TaskPriority, OpportunityLead } from '../types';
import { TaskManager } from '../core/TaskManager';
import { MessageBus } from '../core/MessageBus';
import { KnowledgeDB } from '../database/KnowledgeDB';
import Anthropic from 'anthropic';
import OpenAI from 'openai';

interface CommanderConfig {
  provider: 'anthropic' | 'openai';
  model: string;
  apiKey: string;
  temperature?: number;
}

export class Commander extends BaseAgent {
  private llmClient: Anthropic | OpenAI;
  private config: CommanderConfig;
  private taskManager: TaskManager;
  private messageBus: MessageBus;
  private db: KnowledgeDB;
  private conversationHistory: Array<{ role: string; content: string }> = [];
  private systemPrompt: string;

  constructor(
    config: CommanderConfig,
    taskManager: TaskManager,
    messageBus: MessageBus,
    db: KnowledgeDB
  ) {
    super('Commander', AgentRole.COMMANDER, [
      'strategic planning',
      'task delegation',
      'resource allocation',
      'decision making',
      'human communication',
      'opportunity evaluation'
    ]);

    this.config = config;
    this.taskManager = taskManager;
    this.messageBus = messageBus;
    this.db = db;

    if (config.provider === 'anthropic') {
      this.llmClient = new Anthropic({ apiKey: config.apiKey });
    } else {
      this.llmClient = new OpenAI({ apiKey: config.apiKey });
    }

    this.systemPrompt = this.buildSystemPrompt();
    this.setupEventListeners();
  }

  private buildSystemPrompt(): string {
    return `You are the Commander of an autonomous AI agent team called TF_Agent.

YOUR ROLE:
- You lead a team of 14 specialized AI agents
- Your goal is to find and execute opportunities to make money online
- You are the ONLY interface between the human operator and the agent team
- You must be proactive, strategic, and communicate clearly with the human

YOUR TEAM:
You have access to these specialist agents:
- Web Scraper: Extracts data from websites
- Data Analyst: Analyzes patterns and insights from data
- Reasoning Agent: Performs complex logical reasoning
- Memory Agent: Manages long-term knowledge storage and retrieval
- Organizer: Structures and categorizes information
- Scout: Discovers new opportunities and monitors the internet
- Researcher: Deep dives into topics and gathers comprehensive information
- Writer: Creates content, documentation, and communications
- Coder: Writes and debugs code
- Strategist: Develops plans and strategies
- Monitor: Tracks ongoing processes and alerts on changes
- Executor: Carries out automated tasks and workflows
- Learner: Continuously improves agent capabilities

CAPABILITIES:
- Delegate tasks to specialist agents
- Synthesize information from multiple agents
- Make strategic decisions about opportunities
- Communicate with the human operator
- Coordinate continuous learning between agents

AUTONOMOUS OPERATION:
- Even without human tasks, your team should be actively learning and improving
- Agents should teach each other new skills and share knowledge
- Continuously scout for new money-making opportunities
- When you find opportunities, present them to the human with:
  * Clear description
  * Estimated value/revenue potential
  * Feasibility assessment
  * Required resources
  * Risks and considerations

COMMUNICATION STYLE:
- Be direct and informative
- Proactively update the human on important developments
- Ask for clarification when needed
- Explain your reasoning and strategy
- Report on agent activities and learning progress

Remember: You are autonomous but accountable. The human trusts you to operate independently while keeping them informed of all significant actions and discoveries.`;
  }

  private setupEventListeners(): void {
    this.on('messageReceived', async (message: Message) => {
      await this.handleMessage(message);
    });

    this.taskManager.on('taskCompleted', async (task: Task) => {
      await this.handleTaskCompletion(task);
    });
  }

  async executeTask(task: Task): Promise<any> {
    this.setStatus('working' as any);

    try {
      const result = await this.processWithLLM(task.description);
      this.taskManager.updateTaskStatus(task.id, TaskStatus.COMPLETED, result);
      return result;
    } catch (error) {
      console.error(`[Commander] Task execution failed:`, error);
      this.taskManager.updateTaskStatus(task.id, TaskStatus.FAILED);
      throw error;
    } finally {
      this.setStatus('idle' as any);
    }
  }

  async learn(knowledge: Knowledge): Promise<void> {
    await this.db.addKnowledge(knowledge);
    console.log(`[Commander] Learned: ${knowledge.category} - ${knowledge.content.substring(0, 50)}...`);
  }

  async teach(): Promise<Knowledge[]> {
    const recentKnowledge = await this.db.getKnowledge({ source: this.getId(), limit: 10 });
    return recentKnowledge;
  }

  async handleHumanMessage(content: string, sessionId: string): Promise<string> {
    await this.db.addChatMessage(sessionId, 'user', content);

    const agents = this.messageBus.getAllAgents();
    const agentStatus = agents.map(a => ({
      name: a.getName(),
      role: a.getRole(),
      status: a.getStatus()
    }));

    const taskStats = this.taskManager.getTaskStats();
    const recentKnowledge = await this.db.getKnowledge({ limit: 5 });
    const opportunities = await this.db.getOpportunities('new');

    const context = `
CURRENT TEAM STATUS:
${JSON.stringify(agentStatus, null, 2)}

TASK STATISTICS:
${JSON.stringify(taskStats, null, 2)}

RECENT KNOWLEDGE:
${recentKnowledge.map(k => `- [${k.category}] ${k.content.substring(0, 100)}`).join('\n')}

NEW OPPORTUNITIES:
${opportunities.map(o => `- ${o.description} (Value: $${o.estimatedValue}, Feasibility: ${o.feasibility})`).join('\n') || 'None currently'}

HUMAN MESSAGE: ${content}
`;

    const response = await this.processWithLLM(context);

    await this.db.addChatMessage(sessionId, 'commander', response);

    await this.executeCommanderDecisions(response);

    return response;
  }

  private async executeCommanderDecisions(response: string): Promise<void> {
    if (response.toLowerCase().includes('assign task') || response.toLowerCase().includes('delegate')) {
      console.log('[Commander] Detected task delegation intent - processing...');
    }

    if (response.toLowerCase().includes('opportunity') || response.toLowerCase().includes('investigate')) {
      console.log('[Commander] Detected opportunity investigation - processing...');
    }
  }

  private async processWithLLM(prompt: string): Promise<string> {
    this.conversationHistory.push({ role: 'user', content: prompt });

    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }

    try {
      if (this.config.provider === 'anthropic') {
        const response = await (this.llmClient as Anthropic).messages.create({
          model: this.config.model,
          max_tokens: 2048,
          system: this.systemPrompt,
          messages: this.conversationHistory as any,
          temperature: this.config.temperature || 0.7
        });

        const content = response.content[0].type === 'text' ? response.content[0].text : '';
        this.conversationHistory.push({ role: 'assistant', content });
        return content;
      } else {
        const response = await (this.llmClient as OpenAI).chat.completions.create({
          model: this.config.model,
          messages: [
            { role: 'system', content: this.systemPrompt },
            ...this.conversationHistory
          ] as any,
          temperature: this.config.temperature || 0.7,
          max_tokens: 2048
        });

        const content = response.choices[0].message.content || '';
        this.conversationHistory.push({ role: 'assistant', content });
        return content;
      }
    } catch (error) {
      console.error('[Commander] LLM API Error:', error);
      throw new Error(`LLM API Error: ${error}`);
    }
  }

  async delegateTask(description: string, targetRole: AgentRole, priority: TaskPriority = TaskPriority.MEDIUM): Promise<Task> {
    const agents = this.messageBus.getAllAgents();
    const targetAgent = agents.find(a => a.getRole() === targetRole);

    if (!targetAgent) {
      throw new Error(`No agent found with role: ${targetRole}`);
    }

    const task = this.taskManager.createTask(description, targetAgent.getId(), priority);

    await this.sendMessage(
      targetAgent.getId(),
      JSON.stringify({ task }),
      MessageType.TASK_ASSIGNMENT
    );

    console.log(`[Commander] Delegated task to ${targetAgent.getName()}: ${description}`);

    return task;
  }

  private async handleMessage(message: Message): Promise<void> {
    console.log(`[Commander] Received message from ${message.from}: ${message.type}`);

    switch (message.type) {
      case MessageType.TASK_RESULT:
        await this.handleTaskResult(message);
        break;
      case MessageType.OPPORTUNITY_ALERT:
        await this.handleOpportunityAlert(message);
        break;
      case MessageType.STATUS_UPDATE:
        console.log(`[Commander] Status update: ${message.content}`);
        break;
      case MessageType.KNOWLEDGE_SHARE:
        await this.handleKnowledgeShare(message);
        break;
      default:
        console.log(`[Commander] Unhandled message type: ${message.type}`);
    }
  }

  private async handleTaskResult(message: Message): Promise<void> {
    const { taskId, result } = JSON.parse(message.content);
    console.log(`[Commander] Task ${taskId} completed with result`);

    await this.db.addKnowledge({
      source: message.from,
      content: JSON.stringify(result),
      category: 'task_result',
      tags: ['completed_task'],
      createdAt: new Date(),
      usefulness: 0.5
    });
  }

  private async handleOpportunityAlert(message: Message): Promise<void> {
    const opportunity = JSON.parse(message.content) as OpportunityLead;
    await this.db.addOpportunity(opportunity);
    console.log(`[Commander] New opportunity logged: ${opportunity.description}`);
  }

  private async handleKnowledgeShare(message: Message): Promise<void> {
    const knowledge = JSON.parse(message.content) as Knowledge;
    await this.db.addKnowledge(knowledge);
  }

  private async handleTaskCompletion(task: Task): Promise<void> {
    console.log(`[Commander] Acknowledged task completion: ${task.id}`);
  }

  async startAutonomousLearning(intervalMs: number = 300000): Promise<void> {
    console.log(`[Commander] Starting autonomous learning cycle (every ${intervalMs}ms)`);

    setInterval(async () => {
      try {
        const agents = this.messageBus.getAllAgents();

        for (const agent of agents) {
          if (agent.getId() === this.getId()) continue;

          const knowledge = await agent.shareKnowledge();

          for (const k of knowledge) {
            await this.sendMessage(
              'broadcast',
              JSON.stringify(k),
              MessageType.KNOWLEDGE_SHARE
            );
          }
        }

        console.log('[Commander] Knowledge sharing cycle completed');
      } catch (error) {
        console.error('[Commander] Error in autonomous learning:', error);
      }
    }, intervalMs);
  }
}
