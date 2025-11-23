import { BaseAgent } from '../core/BaseAgent';
import { AgentRole, Task, Knowledge, MessageType, OpportunityLead } from '../types';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

interface OpportunitySource {
  name: string;
  url: string;
  checkFrequency: number;
  patterns: string[];
}

export class ScoutAgent extends BaseAgent {
  private opportunitySources: OpportunitySource[] = [
    {
      name: 'Freelance Platforms',
      url: 'https://www.upwork.com',
      checkFrequency: 3600000,
      patterns: ['freelance', 'gig', 'contract', 'remote']
    },
    {
      name: 'API Marketplaces',
      url: 'https://rapidapi.com',
      checkFrequency: 7200000,
      patterns: ['api', 'integration', 'data']
    }
  ];

  private discoveredOpportunities: OpportunityLead[] = [];
  private activeMonitors: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super('Scout', AgentRole.SCOUT, [
      'opportunity discovery',
      'market monitoring',
      'trend detection',
      'competitive analysis',
      'lead generation'
    ]);
  }

  async executeTask(task: Task): Promise<any> {
    this.setStatus('working' as any);

    try {
      const taskData = JSON.parse(task.description);
      const { action, target } = taskData;

      switch (action) {
        case 'discover_opportunities':
          return await this.discoverOpportunities(target);
        case 'monitor_source':
          return await this.monitorSource(target);
        case 'analyze_trends':
          return await this.analyzeTrends(target);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } finally {
      this.setStatus('idle' as any);
    }
  }

  async discoverOpportunities(category?: string): Promise<OpportunityLead[]> {
    const opportunities: OpportunityLead[] = [];

    const searchQueries = [
      'automated income opportunities',
      'passive income api',
      'affiliate marketing automation',
      'data arbitrage opportunities',
      'content monetization platforms',
      'micro saas ideas'
    ];

    for (const query of searchQueries) {
      try {
        const discovered = await this.searchForOpportunities(query);
        opportunities.push(...discovered);
      } catch (error) {
        console.error(`[Scout] Search failed for "${query}":`, error);
      }
    }

    for (const opp of opportunities) {
      this.discoveredOpportunities.push(opp);

      await this.sendMessage(
        'broadcast',
        JSON.stringify(opp),
        MessageType.OPPORTUNITY_ALERT
      );
    }

    console.log(`[Scout] Discovered ${opportunities.length} opportunities`);
    return opportunities;
  }

  private async searchForOpportunities(query: string): Promise<OpportunityLead[]> {
    const opportunities: OpportunityLead[] = [];

    const syntheticOpportunities = [
      {
        description: `Automated affiliate marketing system for ${query}`,
        estimatedValue: Math.floor(Math.random() * 5000) + 500,
        feasibility: Math.random() * 0.5 + 0.5,
        source: 'market_research'
      },
      {
        description: `API integration service for ${query}`,
        estimatedValue: Math.floor(Math.random() * 3000) + 1000,
        feasibility: Math.random() * 0.4 + 0.6,
        source: 'technical_analysis'
      }
    ];

    for (const oppData of syntheticOpportunities) {
      opportunities.push({
        id: uuidv4(),
        description: oppData.description,
        source: oppData.source,
        estimatedValue: oppData.estimatedValue,
        feasibility: oppData.feasibility,
        discoveredAt: new Date(),
        status: 'new'
      });
    }

    return opportunities;
  }

  async monitorSource(source: OpportunitySource): Promise<void> {
    if (this.activeMonitors.has(source.name)) {
      console.log(`[Scout] Already monitoring ${source.name}`);
      return;
    }

    const monitor = setInterval(async () => {
      try {
        await this.checkSource(source);
      } catch (error) {
        console.error(`[Scout] Monitor error for ${source.name}:`, error);
      }
    }, source.checkFrequency);

    this.activeMonitors.set(source.name, monitor);
    console.log(`[Scout] Started monitoring ${source.name}`);

    await this.checkSource(source);
  }

  private async checkSource(source: OpportunitySource): Promise<void> {
    console.log(`[Scout] Checking ${source.name}...`);

    const opportunities = await this.searchForOpportunities(source.name);

    for (const opp of opportunities) {
      const isDuplicate = this.discoveredOpportunities.some(
        existing => existing.description === opp.description
      );

      if (!isDuplicate && opp.feasibility > 0.6) {
        this.discoveredOpportunities.push(opp);

        await this.sendMessage(
          'broadcast',
          JSON.stringify(opp),
          MessageType.OPPORTUNITY_ALERT
        );
      }
    }
  }

  async analyzeTrends(domain: string): Promise<any> {
    console.log(`[Scout] Analyzing trends for ${domain}`);

    const trends = {
      domain,
      analyzedAt: new Date(),
      trending: [
        { topic: 'AI automation tools', score: 0.85, growth: '+45%' },
        { topic: 'No-code platforms', score: 0.78, growth: '+32%' },
        { topic: 'API integrations', score: 0.72, growth: '+28%' }
      ],
      opportunities: this.discoveredOpportunities.filter(o =>
        o.description.toLowerCase().includes(domain.toLowerCase())
      ).length,
      recommendations: [
        'Focus on AI-powered automation solutions',
        'Explore no-code/low-code integration opportunities',
        'Consider API-based revenue models'
      ]
    };

    return trends;
  }

  async learn(knowledge: Knowledge): Promise<void> {
    if (knowledge.category === 'opportunity_pattern') {
      const pattern = JSON.parse(knowledge.content);
      console.log(`[Scout] Learned opportunity pattern: ${pattern.name}`);
    }

    this.knowledgeBase.push(knowledge);
  }

  async teach(): Promise<Knowledge[]> {
    const teachings: Knowledge[] = [];

    const topOpportunities = this.discoveredOpportunities
      .sort((a, b) => (b.estimatedValue * b.feasibility) - (a.estimatedValue * a.feasibility))
      .slice(0, 5);

    if (topOpportunities.length > 0) {
      teachings.push({
        id: uuidv4(),
        source: this.getId(),
        content: JSON.stringify({
          type: 'top_opportunities',
          opportunities: topOpportunities
        }),
        category: 'opportunity_intelligence',
        tags: ['opportunities', 'revenue', 'scouting'],
        createdAt: new Date(),
        usefulness: 0.9
      });
    }

    return teachings;
  }

  stopAllMonitors(): void {
    for (const [name, monitor] of this.activeMonitors.entries()) {
      clearInterval(monitor);
      console.log(`[Scout] Stopped monitoring ${name}`);
    }
    this.activeMonitors.clear();
  }

  getDiscoveredOpportunities(): OpportunityLead[] {
    return this.discoveredOpportunities;
  }
}
