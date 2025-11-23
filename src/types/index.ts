export interface AgentConfig {
  id: string;
  name: string;
  role: AgentRole;
  capabilities: string[];
  status: AgentStatus;
  createdAt: Date;
  lastActive: Date;
}

export enum AgentRole {
  COMMANDER = 'commander',
  WEB_SCRAPER = 'web_scraper',
  DATA_ANALYST = 'data_analyst',
  REASONING = 'reasoning',
  MEMORY = 'memory',
  ORGANIZER = 'organizer',
  SCOUT = 'scout',
  RESEARCHER = 'researcher',
  WRITER = 'writer',
  CODER = 'coder',
  STRATEGIST = 'strategist',
  MONITOR = 'monitor',
  EXECUTOR = 'executor',
  LEARNER = 'learner'
}

export enum AgentStatus {
  IDLE = 'idle',
  WORKING = 'working',
  LEARNING = 'learning',
  TEACHING = 'teaching',
  WAITING = 'waiting',
  ERROR = 'error'
}

export interface Message {
  id: string;
  from: string;
  to: string | string[];
  content: string;
  type: MessageType;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export enum MessageType {
  TASK_ASSIGNMENT = 'task_assignment',
  TASK_RESULT = 'task_result',
  KNOWLEDGE_SHARE = 'knowledge_share',
  LEARNING_REQUEST = 'learning_request',
  STATUS_UPDATE = 'status_update',
  HUMAN_COMMUNICATION = 'human_communication',
  OPPORTUNITY_ALERT = 'opportunity_alert',
  ERROR_REPORT = 'error_report'
}

export interface Task {
  id: string;
  description: string;
  assignedTo: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: Date;
  completedAt?: Date;
  result?: any;
  metadata?: Record<string, any>;
}

export enum TaskPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface Knowledge {
  id: string;
  source: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date;
  usefulness: number;
  metadata?: Record<string, any>;
}

export interface OpportunityLead {
  id: string;
  description: string;
  source: string;
  estimatedValue: number;
  feasibility: number;
  discoveredAt: Date;
  status: 'new' | 'investigating' | 'pursuing' | 'completed' | 'abandoned';
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'commander';
  content: string;
  timestamp: Date;
  sessionId: string;
}

export interface ChatSession {
  id: string;
  title: string;
  startedAt: Date;
  lastMessageAt: Date;
  archived: boolean;
  messages: ChatMessage[];
}
