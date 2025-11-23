import { EventEmitter } from 'events';
import { Message, MessageType } from '../types';
import { BaseAgent } from './BaseAgent';

export class MessageBus extends EventEmitter {
  private agents: Map<string, BaseAgent> = new Map();
  private messageHistory: Message[] = [];
  private maxHistorySize: number = 10000;

  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.getId(), agent);

    agent.on('messageSent', (message: Message) => {
      this.routeMessage(message);
    });

    console.log(`[MessageBus] Agent registered: ${agent.getName()} (${agent.getId()})`);
  }

  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    console.log(`[MessageBus] Agent unregistered: ${agentId}`);
  }

  private async routeMessage(message: Message): Promise<void> {
    this.messageHistory.push(message);

    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }

    this.emit('messageRouted', message);

    if (Array.isArray(message.to)) {
      for (const recipientId of message.to) {
        await this.deliverMessage(recipientId, message);
      }
    } else if (message.to === 'broadcast') {
      for (const [agentId, agent] of this.agents.entries()) {
        if (agentId !== message.from) {
          await agent.receiveMessage(message);
        }
      }
    } else {
      await this.deliverMessage(message.to, message);
    }
  }

  private async deliverMessage(recipientId: string, message: Message): Promise<void> {
    const agent = this.agents.get(recipientId);
    if (agent) {
      await agent.receiveMessage(message);
    } else {
      console.warn(`[MessageBus] Agent not found: ${recipientId}`);
    }
  }

  getMessageHistory(filter?: { from?: string; to?: string; type?: MessageType }): Message[] {
    if (!filter) return this.messageHistory;

    return this.messageHistory.filter(msg => {
      if (filter.from && msg.from !== filter.from) return false;
      if (filter.to && msg.to !== filter.to && !Array.isArray(msg.to)) return false;
      if (filter.type && msg.type !== filter.type) return false;
      return true;
    });
  }

  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }
}
