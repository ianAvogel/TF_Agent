import express, { Express, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer, Server as HTTPServer } from 'http';
import { Commander } from '../agents/Commander';
import { KnowledgeDB } from '../database/KnowledgeDB';
import { ChatSession } from '../types';

export class ChatServer {
  private app: Express;
  private httpServer: HTTPServer;
  private io: SocketIOServer;
  private commander: Commander;
  private db: KnowledgeDB;
  private port: number;
  private currentSession: ChatSession | null = null;

  constructor(commander: Commander, db: KnowledgeDB, port: number = 3000) {
    this.commander = commander;
    this.db = db;
    this.port = port;

    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.static('public'));

    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
  }

  private setupRoutes(): void {
    this.app.get('/', (req: Request, res: Response) => {
      res.send(this.getHTMLInterface());
    });

    this.app.get('/api/sessions', async (req: Request, res: Response) => {
      try {
        const sessions = await this.db.getAllChatSessions(false);
        res.json(sessions);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sessions' });
      }
    });

    this.app.get('/api/sessions/archived', async (req: Request, res: Response) => {
      try {
        const sessions = await this.db.getAllChatSessions(true);
        const archived = sessions.filter(s => s.archived);
        res.json(archived);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch archived sessions' });
      }
    });

    this.app.get('/api/sessions/:id', async (req: Request, res: Response) => {
      try {
        const session = await this.db.getChatSession(req.params.id);
        if (!session) {
          res.status(404).json({ error: 'Session not found' });
        } else {
          res.json(session);
        }
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch session' });
      }
    });

    this.app.post('/api/sessions', async (req: Request, res: Response) => {
      try {
        const { title } = req.body;
        const session = await this.db.createChatSession(title || 'New Conversation');
        res.json(session);
      } catch (error) {
        res.status(500).json({ error: 'Failed to create session' });
      }
    });

    this.app.get('/api/health', (req: Request, res: Response) => {
      res.json({
        status: 'online',
        commander: this.commander.getName(),
        uptime: process.uptime()
      });
    });
  }

  private setupSocketIO(): void {
    this.io.on('connection', (socket) => {
      console.log('[ChatServer] Client connected:', socket.id);

      socket.on('start_session', async (data: { title?: string }) => {
        try {
          this.currentSession = await this.db.createChatSession(data.title || 'New Conversation');
          socket.emit('session_started', this.currentSession);
          console.log('[ChatServer] New session started:', this.currentSession.id);
        } catch (error) {
          socket.emit('error', { message: 'Failed to start session' });
        }
      });

      socket.on('load_session', async (data: { sessionId: string }) => {
        try {
          this.currentSession = await this.db.getChatSession(data.sessionId);
          if (this.currentSession) {
            socket.emit('session_loaded', this.currentSession);
          } else {
            socket.emit('error', { message: 'Session not found' });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to load session' });
        }
      });

      socket.on('send_message', async (data: { content: string }) => {
        if (!this.currentSession) {
          socket.emit('error', { message: 'No active session' });
          return;
        }

        try {
          socket.emit('message_received', {
            role: 'user',
            content: data.content,
            timestamp: new Date()
          });

          socket.emit('commander_typing', true);

          const response = await this.commander.handleHumanMessage(
            data.content,
            this.currentSession.id
          );

          socket.emit('commander_typing', false);

          socket.emit('message_received', {
            role: 'commander',
            content: response,
            timestamp: new Date()
          });
        } catch (error) {
          socket.emit('commander_typing', false);
          socket.emit('error', { message: 'Commander response failed' });
          console.error('[ChatServer] Message handling error:', error);
        }
      });

      socket.on('get_agent_status', () => {
        socket.emit('agent_status', {
          commander: {
            name: this.commander.getName(),
            status: this.commander.getStatus()
          }
        });
      });

      socket.on('disconnect', () => {
        console.log('[ChatServer] Client disconnected:', socket.id);
      });
    });
  }

  private getHTMLInterface(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TF_Agent - Commander Interface</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #1a1a2e;
            color: #eee;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            background: #16213e;
            padding: 20px;
            border-bottom: 2px solid #0f3460;
        }
        .header h1 {
            color: #e94560;
            font-size: 24px;
        }
        .header p {
            color: #aaa;
            font-size: 14px;
            margin-top: 5px;
        }
        .container {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        .sidebar {
            width: 250px;
            background: #16213e;
            border-right: 1px solid #0f3460;
            padding: 20px;
            overflow-y: auto;
        }
        .sidebar h3 {
            color: #e94560;
            margin-bottom: 15px;
            font-size: 16px;
        }
        .session-item {
            padding: 10px;
            margin-bottom: 10px;
            background: #0f3460;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.3s;
        }
        .session-item:hover {
            background: #1a4d7a;
        }
        .session-item.active {
            background: #e94560;
        }
        .new-session-btn {
            width: 100%;
            padding: 12px;
            background: #e94560;
            border: none;
            border-radius: 5px;
            color: white;
            font-size: 14px;
            cursor: pointer;
            margin-bottom: 20px;
        }
        .new-session-btn:hover {
            background: #d63651;
        }
        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #1a1a2e;
        }
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        .message {
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 10px;
            max-width: 80%;
        }
        .message.user {
            background: #0f3460;
            margin-left: auto;
        }
        .message.commander {
            background: #16213e;
            border-left: 3px solid #e94560;
        }
        .message-role {
            font-weight: bold;
            margin-bottom: 5px;
            color: #e94560;
        }
        .message-content {
            line-height: 1.6;
            white-space: pre-wrap;
        }
        .typing-indicator {
            color: #888;
            font-style: italic;
            padding: 10px 20px;
            display: none;
        }
        .typing-indicator.show {
            display: block;
        }
        .input-container {
            padding: 20px;
            background: #16213e;
            border-top: 1px solid #0f3460;
        }
        .input-row {
            display: flex;
            gap: 10px;
        }
        #messageInput {
            flex: 1;
            padding: 15px;
            background: #0f3460;
            border: 1px solid #1a4d7a;
            border-radius: 5px;
            color: #eee;
            font-size: 14px;
        }
        #sendBtn {
            padding: 15px 30px;
            background: #e94560;
            border: none;
            border-radius: 5px;
            color: white;
            font-size: 14px;
            cursor: pointer;
        }
        #sendBtn:hover {
            background: #d63651;
        }
        #sendBtn:disabled {
            background: #666;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 TF_Agent Commander Interface</h1>
        <p>14 operators, 1 commander, your mission</p>
    </div>
    <div class="container">
        <div class="sidebar">
            <button class="new-session-btn" onclick="startNewSession()">+ New Conversation</button>
            <h3>Chat History</h3>
            <div id="sessionList"></div>
        </div>
        <div class="chat-container">
            <div class="messages" id="messages"></div>
            <div class="typing-indicator" id="typing">Commander is thinking...</div>
            <div class="input-container">
                <div class="input-row">
                    <input type="text" id="messageInput" placeholder="Send a message to Commander..." />
                    <button id="sendBtn" onclick="sendMessage()">Send</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const socket = io();
        let currentSessionId = null;

        socket.on('connect', () => {
            console.log('Connected to server');
            loadSessions();
        });

        socket.on('session_started', (session) => {
            currentSessionId = session.id;
            document.getElementById('messages').innerHTML = '';
            loadSessions();
        });

        socket.on('session_loaded', (session) => {
            currentSessionId = session.id;
            const messagesDiv = document.getElementById('messages');
            messagesDiv.innerHTML = '';
            session.messages.forEach(msg => {
                addMessage(msg.role, msg.content);
            });
        });

        socket.on('message_received', (message) => {
            addMessage(message.role, message.content);
        });

        socket.on('commander_typing', (isTyping) => {
            const typing = document.getElementById('typing');
            typing.classList.toggle('show', isTyping);
        });

        function startNewSession() {
            const title = prompt('Enter conversation title:', 'New Conversation');
            if (title) {
                socket.emit('start_session', { title });
            }
        }

        function loadSession(sessionId) {
            socket.emit('load_session', { sessionId });
        }

        async function loadSessions() {
            const response = await fetch('/api/sessions');
            const sessions = await response.json();
            const sessionList = document.getElementById('sessionList');
            sessionList.innerHTML = sessions.map(s =>
                \`<div class="session-item \${s.id === currentSessionId ? 'active' : ''}" onclick="loadSession('\${s.id}')">
                    <div style="font-weight: bold;">\${s.title}</div>
                    <div style="font-size: 12px; color: #888; margin-top: 5px;">
                        \${new Date(s.lastMessageAt).toLocaleDateString()}
                    </div>
                </div>\`
            ).join('');
        }

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const content = input.value.trim();

            if (!content) return;

            if (!currentSessionId) {
                alert('Please start a new session first');
                return;
            }

            socket.emit('send_message', { content });
            input.value = '';
        }

        function addMessage(role, content) {
            const messagesDiv = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${role}\`;
            messageDiv.innerHTML = \`
                <div class="message-role">\${role === 'user' ? 'You' : 'Commander'}</div>
                <div class="message-content">\${content}</div>
            \`;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        startNewSession();
    </script>
</body>
</html>`;
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.port, () => {
        console.log(`[ChatServer] Server running on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  stop(): void {
    this.httpServer.close();
    console.log('[ChatServer] Server stopped');
  }
}
