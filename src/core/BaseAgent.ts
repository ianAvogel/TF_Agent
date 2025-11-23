import { v4 as uuidv4 } from 'uuid';
import { AgentConfig, AgentRole, AgentStatus, Message, Task, Knowledge } from '../types';
import { EventEmitter } from 'events';

export abstract class BaseAgent extends EventEmitter {
  protected config: AgentConfig;
  protected knowledgeBase: Knowledge[] = [];

  constructor(name: string, role: AgentRole, capabilities: string[]) {
    super();
    this.config = {
      id: uuidv4(),
      name,
      role,
      capabilities,
      status: AgentStatus.IDLE,
      createdAt: new Date(),
      lastActive: new Date()
    };
  }

  abstract executeTask(task: Task): Promise<any>;
  abstract learn(knowledge: Knowledge): Promise<void>;
  abstract teach(): Promise<Knowledge[]>;

  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  getRole(): AgentRole {
    return this.config.role;
  }

  getStatus(): AgentStatus {
    return this.config.status;
  }

  setStatus(status: AgentStatus): void {
    this.config.status = status;
    this.config.lastActive = new Date();
    this.emit('statusChanged', { agentId: this.config.id, status });
  }

  async receiveMessage(message: Message): Promise<void> {
    this.emit('messageReceived', message);
  }

  async sendMessage(to: string | string[], content: string, type: any): Promise<void> {
    const message: Message = {
      id: uuidv4(),
      from: this.config.id,
      to,
      content,
      type,
      timestamp: new Date()
    };
    this.emit('messageSent', message);
  }

  async addKnowledge(knowledge: Knowledge): Promise<void> {
    this.knowledgeBase.push(knowledge);
    await this.learn(knowledge);
  }

  async shareKnowledge(): Promise<Knowledge[]> {
    return await this.teach();
  }

  getCapabilities(): string[] {
    return this.config.capabilities;
  }

  canHandle(taskDescription: string): boolean {
    return this.config.capabilities.some(cap =>
      taskDescription.toLowerCase().includes(cap.toLowerCase())
    );
  }
}
