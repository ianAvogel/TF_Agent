import { MessageBus } from './MessageBus';
import { TaskManager } from './TaskManager';
import { KnowledgeDB } from '../database/KnowledgeDB';
import { Commander } from '../agents/Commander';
import { WebScraperAgent } from '../agents/WebScraperAgent';
import { ScoutAgent } from '../agents/ScoutAgent';
import { DataAnalystAgent } from '../agents/DataAnalystAgent';
import { MarketDataAgent } from '../agents/MarketDataAgent';
import { FinanceAgent } from '../agents/FinanceAgent';
import { CommunicationsAgent } from '../agents/CommunicationsAgent';
import { BaseAgent } from './BaseAgent';
import { MessageType, TaskPriority } from '../types';

export class AgentOrchestrator {
  private messageBus: MessageBus;
  private taskManager: TaskManager;
  private db: KnowledgeDB;
  private commander: Commander;
  private agents: Map<string, BaseAgent> = new Map();
  private learningInterval: NodeJS.Timeout | null = null;

  constructor(dbPath: string) {
    this.messageBus = new MessageBus();
    this.taskManager = new TaskManager();
    this.db = new KnowledgeDB(dbPath);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.messageBus.on('messageRouted', (message) => {
      console.log(`[Orchestrator] Message routed: ${message.type} from ${message.from}`);
    });

    this.taskManager.on('taskCreated', (task) => {
      console.log(`[Orchestrator] Task created: ${task.description}`);
    });

    this.taskManager.on('taskUpdated', (task) => {
      console.log(`[Orchestrator] Task updated: ${task.id} -> ${task.status}`);
    });
  }

  async initialize(config: {
    llmProvider: 'anthropic' | 'openai';
    llmModel: string;
    apiKey: string;
    temperature?: number;
  }): Promise<void> {
    console.log('[Orchestrator] Initializing TF_Agent system...');

    this.commander = new Commander(
      {
        provider: config.llmProvider,
        model: config.llmModel,
        apiKey: config.apiKey,
        temperature: config.temperature
      },
      this.taskManager,
      this.messageBus,
      this.db
    );

    this.registerAgent(this.commander);

    const webScraper = new WebScraperAgent();
    this.registerAgent(webScraper);

    const scout = new ScoutAgent();
    this.registerAgent(scout);

    const dataAnalyst = new DataAnalystAgent();
    this.registerAgent(dataAnalyst);

    const marketData = new MarketDataAgent();
    this.registerAgent(marketData);

    const finance = new FinanceAgent();
    this.registerAgent(finance);

    const communications = new CommunicationsAgent();
    this.registerAgent(communications);

    console.log(`[Orchestrator] Initialized with ${this.agents.size} agents`);
  }

  private registerAgent(agent: BaseAgent): void {
    this.messageBus.registerAgent(agent);
    this.agents.set(agent.getId(), agent);
    console.log(`[Orchestrator] Registered agent: ${agent.getName()} (${agent.getRole()})`);
  }

  startAutonomousMode(learningIntervalMs: number = 300000): void {
    console.log('[Orchestrator] Starting autonomous mode...');

    this.commander.startAutonomousLearning(learningIntervalMs);

    const scoutAgent = Array.from(this.agents.values()).find(
      a => a.getRole() === 'scout'
    ) as ScoutAgent;

    if (scoutAgent) {
      this.taskManager.createTask(
        JSON.stringify({ action: 'discover_opportunities' }),
        scoutAgent.getId(),
        TaskPriority.HIGH
      );

      setInterval(() => {
        this.taskManager.createTask(
          JSON.stringify({ action: 'discover_opportunities' }),
          scoutAgent.getId(),
          TaskPriority.MEDIUM
        );
      }, 1800000);
    }

    this.learningInterval = setInterval(() => {
      this.facilitateInterAgentLearning();
    }, learningIntervalMs);

    console.log('[Orchestrator] Autonomous mode activated');
  }

  private async facilitateInterAgentLearning(): Promise<void> {
    console.log('[Orchestrator] Facilitating inter-agent learning...');

    const agents = Array.from(this.agents.values());

    for (const teacher of agents) {
      try {
        const knowledge = await teacher.teach();

        for (const k of knowledge) {
          for (const learner of agents) {
            if (learner.getId() !== teacher.getId()) {
              await learner.learn(k);
            }
          }

          await this.db.addKnowledge(k);
        }

        if (knowledge.length > 0) {
          console.log(`[Orchestrator] ${teacher.getName()} shared ${knowledge.length} knowledge items`);
        }
      } catch (error) {
        console.error(`[Orchestrator] Learning error for ${teacher.getName()}:`, error);
      }
    }
  }

  async processTaskQueue(): Promise<void> {
    const pendingTasks = this.taskManager.getPendingTasks();

    for (const task of pendingTasks.slice(0, 5)) {
      const agent = this.agents.get(task.assignedTo);

      if (agent && agent.getStatus() === 'idle') {
        console.log(`[Orchestrator] Executing task ${task.id} with ${agent.getName()}`);

        agent.setStatus('working' as any);

        try {
          const result = await agent.executeTask(task);
          this.taskManager.updateTaskStatus(task.id, 'completed' as any, result);
        } catch (error) {
          console.error(`[Orchestrator] Task execution failed:`, error);
          this.taskManager.updateTaskStatus(task.id, 'failed' as any);
        }
      }
    }
  }

  getCommander(): Commander {
    return this.commander;
  }

  getDatabase(): KnowledgeDB {
    return this.db;
  }

  getMessageBus(): MessageBus {
    return this.messageBus;
  }

  getTaskManager(): TaskManager {
    return this.taskManager;
  }

  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  getAgentStats(): any {
    const agents = Array.from(this.agents.values());

    return {
      total: agents.length,
      byRole: agents.reduce((acc, agent) => {
        const role = agent.getRole();
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStatus: agents.reduce((acc, agent) => {
        const status = agent.getStatus();
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  shutdown(): void {
    console.log('[Orchestrator] Shutting down...');

    if (this.learningInterval) {
      clearInterval(this.learningInterval);
    }

    const scoutAgent = Array.from(this.agents.values()).find(
      a => a.getRole() === 'scout'
    ) as ScoutAgent;

    if (scoutAgent) {
      scoutAgent.stopAllMonitors();
    }

    const webScraper = Array.from(this.agents.values()).find(
      a => a.getRole() === 'web_scraper'
    ) as WebScraperAgent;

    if (webScraper) {
      webScraper.close();
    }

    this.db.close();

    console.log('[Orchestrator] Shutdown complete');
  }
}
