import sqlite3 from 'sqlite3';
import { Knowledge, ChatSession, ChatMessage, OpportunityLead } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class KnowledgeDB {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
    this.initialize();
  }

  private initialize(): void {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS knowledge (
          id TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          content TEXT NOT NULL,
          category TEXT,
          tags TEXT,
          createdAt TEXT NOT NULL,
          usefulness REAL DEFAULT 0,
          metadata TEXT
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          startedAt TEXT NOT NULL,
          lastMessageAt TEXT NOT NULL,
          archived INTEGER DEFAULT 0
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          sessionId TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          FOREIGN KEY (sessionId) REFERENCES chat_sessions(id)
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS opportunities (
          id TEXT PRIMARY KEY,
          description TEXT NOT NULL,
          source TEXT NOT NULL,
          estimatedValue REAL,
          feasibility REAL,
          discoveredAt TEXT NOT NULL,
          status TEXT DEFAULT 'new',
          metadata TEXT
        )
      `);

      this.db.run(`CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge(source)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge(category)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(sessionId)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status)`);
    });
  }

  async addKnowledge(knowledge: Omit<Knowledge, 'id'>): Promise<Knowledge> {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const k: Knowledge = { id, ...knowledge };

      this.db.run(
        `INSERT INTO knowledge (id, source, content, category, tags, createdAt, usefulness, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          k.id,
          k.source,
          k.content,
          k.category,
          JSON.stringify(k.tags),
          k.createdAt.toISOString(),
          k.usefulness,
          JSON.stringify(k.metadata || {})
        ],
        (err) => {
          if (err) reject(err);
          else resolve(k);
        }
      );
    });
  }

  async getKnowledge(filter?: { source?: string; category?: string; limit?: number }): Promise<Knowledge[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM knowledge WHERE 1=1';
      const params: any[] = [];

      if (filter?.source) {
        query += ' AND source = ?';
        params.push(filter.source);
      }

      if (filter?.category) {
        query += ' AND category = ?';
        params.push(filter.category);
      }

      query += ' ORDER BY usefulness DESC, createdAt DESC';

      if (filter?.limit) {
        query += ' LIMIT ?';
        params.push(filter.limit);
      }

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const knowledge = rows.map(row => ({
            id: row.id,
            source: row.source,
            content: row.content,
            category: row.category,
            tags: JSON.parse(row.tags),
            createdAt: new Date(row.createdAt),
            usefulness: row.usefulness,
            metadata: JSON.parse(row.metadata)
          }));
          resolve(knowledge);
        }
      });
    });
  }

  async createChatSession(title: string): Promise<ChatSession> {
    return new Promise((resolve, reject) => {
      const session: ChatSession = {
        id: uuidv4(),
        title,
        startedAt: new Date(),
        lastMessageAt: new Date(),
        archived: false,
        messages: []
      };

      this.db.run(
        `INSERT INTO chat_sessions (id, title, startedAt, lastMessageAt, archived)
         VALUES (?, ?, ?, ?, ?)`,
        [
          session.id,
          session.title,
          session.startedAt.toISOString(),
          session.lastMessageAt.toISOString(),
          0
        ],
        (err) => {
          if (err) reject(err);
          else resolve(session);
        }
      );
    });
  }

  async addChatMessage(sessionId: string, role: 'user' | 'commander', content: string): Promise<ChatMessage> {
    return new Promise((resolve, reject) => {
      const message: ChatMessage = {
        id: uuidv4(),
        sessionId,
        role,
        content,
        timestamp: new Date()
      };

      this.db.run(
        `INSERT INTO chat_messages (id, sessionId, role, content, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [message.id, message.sessionId, message.role, message.content, message.timestamp.toISOString()],
        (err) => {
          if (err) {
            reject(err);
          } else {
            this.db.run(
              `UPDATE chat_sessions SET lastMessageAt = ? WHERE id = ?`,
              [message.timestamp.toISOString(), sessionId],
              () => resolve(message)
            );
          }
        }
      );
    });
  }

  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM chat_sessions WHERE id = ?',
        [sessionId],
        (err, row: any) => {
          if (err) reject(err);
          else if (!row) resolve(null);
          else {
            this.db.all(
              'SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY timestamp ASC',
              [sessionId],
              (err, messages: any[]) => {
                if (err) reject(err);
                else {
                  resolve({
                    id: row.id,
                    title: row.title,
                    startedAt: new Date(row.startedAt),
                    lastMessageAt: new Date(row.lastMessageAt),
                    archived: row.archived === 1,
                    messages: messages.map(m => ({
                      id: m.id,
                      sessionId: m.sessionId,
                      role: m.role,
                      content: m.content,
                      timestamp: new Date(m.timestamp)
                    }))
                  });
                }
              }
            );
          }
        }
      );
    });
  }

  async getAllChatSessions(includeArchived: boolean = false): Promise<ChatSession[]> {
    return new Promise((resolve, reject) => {
      const query = includeArchived
        ? 'SELECT * FROM chat_sessions ORDER BY lastMessageAt DESC'
        : 'SELECT * FROM chat_sessions WHERE archived = 0 ORDER BY lastMessageAt DESC';

      this.db.all(query, async (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const sessions = await Promise.all(
            rows.map(row => this.getChatSession(row.id))
          );
          resolve(sessions.filter(s => s !== null) as ChatSession[]);
        }
      });
    });
  }

  async addOpportunity(opportunity: Omit<OpportunityLead, 'id'>): Promise<OpportunityLead> {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const opp: OpportunityLead = { id, ...opportunity };

      this.db.run(
        `INSERT INTO opportunities (id, description, source, estimatedValue, feasibility, discoveredAt, status, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          opp.id,
          opp.description,
          opp.source,
          opp.estimatedValue,
          opp.feasibility,
          opp.discoveredAt.toISOString(),
          opp.status,
          JSON.stringify(opp.metadata || {})
        ],
        (err) => {
          if (err) reject(err);
          else resolve(opp);
        }
      );
    });
  }

  async getOpportunities(status?: string): Promise<OpportunityLead[]> {
    return new Promise((resolve, reject) => {
      const query = status
        ? 'SELECT * FROM opportunities WHERE status = ? ORDER BY estimatedValue DESC'
        : 'SELECT * FROM opportunities ORDER BY estimatedValue DESC';

      const params = status ? [status] : [];

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) reject(err);
        else {
          resolve(rows.map(row => ({
            id: row.id,
            description: row.description,
            source: row.source,
            estimatedValue: row.estimatedValue,
            feasibility: row.feasibility,
            discoveredAt: new Date(row.discoveredAt),
            status: row.status,
            metadata: JSON.parse(row.metadata)
          })));
        }
      });
    });
  }

  close(): void {
    this.db.close();
  }
}
