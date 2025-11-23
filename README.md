# TF_Agent
**14 operators, 1 commander, your mission**

An autonomous multi-agent AI system designed to discover and execute money-making opportunities on the internet. TF_Agent features a Commander LLM that leads a team of specialized AI agents, each expert in their domain, continuously learning from each other and scouting for opportunities.

## 🎯 Vision

TF_Agent is an experimental autonomous AI system where:
- **Commander**: An LLM-powered leader that coordinates all operations and communicates with you
- **14 Specialist Agents**: Experts in web scraping, data analysis, reasoning, memory, organization, scouting, and more
- **Continuous Learning**: Agents teach each other and improve autonomously, even without active tasks
- **Opportunity Discovery**: Constantly searching for and evaluating money-making opportunities online
- **Autonomous Operation**: Designed to operate independently while keeping you informed

## 🏗️ Architecture

### Core Components

- **Commander Agent**: LLM-powered (Anthropic Claude or OpenAI GPT) strategic leader
- **Message Bus**: Real-time inter-agent communication system
- **Task Manager**: Intelligent task delegation and tracking
- **Knowledge Database**: SQLite-based persistent knowledge storage
- **Chat Interface**: Web-based UI for human-Commander communication

### Specialist Agents

1. **Web Scraper**: Extracts data from websites (static and dynamic)
2. **Scout**: Discovers opportunities and monitors markets
3. **Data Analyst**: Analyzes patterns and generates insights
4. **Memory** (coming soon): Manages long-term knowledge
5. **Organizer** (coming soon): Structures information
6. **Researcher** (coming soon): Deep-dive investigations
7. **Writer** (coming soon): Content creation
8. **Coder** (coming soon): Code generation and debugging
9. **Strategist** (coming soon): Planning and strategy
10. **Monitor** (coming soon): Process tracking
11. **Executor** (coming soon): Automated task execution
12. **Learner** (coming soon): Capability improvement
13-14. **Additional specialists** (coming soon)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Anthropic API key OR OpenAI API key
- Basic understanding of TypeScript

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ianAvogel/TF_Agent.git
cd TF_Agent
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env` and add your API key:
```env
# Use either Anthropic or OpenAI
ANTHROPIC_API_KEY=your_api_key_here
# OR
OPENAI_API_KEY=your_api_key_here

# Optional configuration
COMMANDER_MODEL=claude-3-5-sonnet-20241022
COMMANDER_TEMPERATURE=0.7
PORT=3000
AUTO_LEARNING_ENABLED=true
LEARNING_INTERVAL_MS=300000
```

4. **Build the project**
```bash
npm run build
```

5. **Start TF_Agent**
```bash
npm start
```

### Development Mode

```bash
npm run dev
```

## 💬 Using TF_Agent

Once started, open your browser to `http://localhost:3000` to access the chat interface.

### Communicating with Commander

The Commander is your only interface to the agent team. You can:

- **Ask questions**: "What opportunities have you found?"
- **Give instructions**: "Focus on finding affiliate marketing opportunities"
- **Request updates**: "What are the agents working on?"
- **Approve actions**: Commander will ask permission for significant actions

### Example Conversation

```
You: What opportunities have you discovered?

Commander: I've had the Scout agent search for opportunities. We've identified
3 promising leads:

1. Automated affiliate marketing system - Est. $2,500, Feasibility: 75%
2. API integration service - Est. $1,800, Feasibility: 85%
3. Data arbitrage opportunity - Est. $3,200, Feasibility: 60%

Would you like me to have the team investigate any of these further?

You: Investigate the API integration service

Commander: I'm delegating this to our Data Analyst and Researcher agents.
They'll analyze the market, competition, and technical requirements.
I'll update you with their findings.
```

## 🧠 How It Works

### Autonomous Learning Cycle

1. **Knowledge Sharing**: Every 5 minutes (configurable), agents share what they've learned
2. **Cross-Training**: Each agent teaches others their skills and insights
3. **Continuous Improvement**: Agents refine their capabilities based on shared knowledge

### Opportunity Discovery

1. **Scout** searches various sources for opportunities
2. **Data Analyst** evaluates feasibility and value
3. **Commander** synthesizes information and presents to you
4. Upon approval, agents execute the opportunity

### Task Execution

```
Human → Commander → Task Manager → Specialist Agent → Result → Commander → Human
                ↓
         Knowledge Base (all agents learn)
```

## 📊 Features

- **Real-time Chat**: Socket.IO-powered instant communication
- **Chat History**: Persistent conversation storage with archiving
- **Task Tracking**: Monitor all agent activities
- **Knowledge Base**: SQLite database storing all learned information
- **Web Scraping**: Both static (Cheerio) and dynamic (Puppeteer) scraping
- **Opportunity Scouting**: Automated discovery of revenue opportunities
- **Data Analysis**: Pattern recognition and trend analysis
- **Autonomous Mode**: Agents work continuously, even without tasks

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `COMMANDER_MODEL` | LLM model to use | `claude-3-5-sonnet-20241022` |
| `COMMANDER_TEMPERATURE` | LLM creativity (0-1) | `0.7` |
| `PORT` | Web server port | `3000` |
| `DB_PATH` | Database file path | `./data/tf_agent.db` |
| `MAX_AGENTS` | Maximum agents | `14` |
| `AUTO_LEARNING_ENABLED` | Enable autonomous learning | `true` |
| `LEARNING_INTERVAL_MS` | Learning cycle interval | `300000` (5min) |

## 🗂️ Project Structure

```
TF_Agent/
├── src/
│   ├── agents/          # Specialist agent implementations
│   │   ├── Commander.ts
│   │   ├── WebScraperAgent.ts
│   │   ├── ScoutAgent.ts
│   │   └── DataAnalystAgent.ts
│   ├── core/            # Core system components
│   │   ├── BaseAgent.ts
│   │   ├── MessageBus.ts
│   │   ├── TaskManager.ts
│   │   └── AgentOrchestrator.ts
│   ├── database/        # Data persistence
│   │   └── KnowledgeDB.ts
│   ├── api/             # Web interface
│   │   └── ChatServer.ts
│   ├── types/           # TypeScript interfaces
│   │   └── index.ts
│   └── index.ts         # Application entry point
├── data/                # SQLite database storage
├── logs/                # Application logs
├── package.json
├── tsconfig.json
└── .env                 # Configuration
```

## 🔒 Safety & Ethics

**IMPORTANT**: TF_Agent is an experimental system. Always:
- Review Commander's proposed actions before approval
- Ensure all activities comply with laws and platform terms of service
- Monitor agent behavior regularly
- Use responsibly and ethically

This is a research project exploring autonomous AI agents. Not all discovered opportunities may be viable or appropriate.

## 🛠️ Development

### Adding New Agents

1. Create a new file in `src/agents/`
2. Extend `BaseAgent` class
3. Implement `executeTask()`, `learn()`, and `teach()` methods
4. Register in `AgentOrchestrator`

### Building

```bash
npm run build    # Compile TypeScript
npm run watch    # Watch mode
npm run clean    # Clean build artifacts
```

## 📝 API Endpoints

- `GET /` - Chat interface
- `GET /api/sessions` - List chat sessions
- `GET /api/sessions/:id` - Get specific session
- `POST /api/sessions` - Create new session
- `GET /api/health` - System health check

## 🐛 Troubleshooting

**Issue**: "No API key found"
- **Solution**: Set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` in `.env`

**Issue**: Puppeteer fails to launch
- **Solution**: Install Chrome/Chromium dependencies:
  ```bash
  # Ubuntu/Debian
  sudo apt-get install -y chromium-browser

  # Or use the bundled Chromium
  npx puppeteer browsers install chrome
  ```

**Issue**: Database locked
- **Solution**: Only one instance should run at a time. Check for running processes.

## 🤝 Contributing

This is an experimental project. Contributions, ideas, and feedback are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

TF_Agent is an experimental autonomous AI system. The developers are not responsible for:
- Actions taken by the AI agents
- Financial outcomes of pursued opportunities
- Compliance with third-party terms of service
- Any damages or losses incurred

Use at your own risk. Always maintain human oversight.

## 🗺️ Roadmap

- [ ] Additional specialist agents (Memory, Organizer, Researcher, etc.)
- [ ] Advanced reasoning capabilities
- [ ] Integration with more data sources
- [ ] Improved opportunity evaluation algorithms
- [ ] Multi-model LLM support for different agents
- [ ] Agent performance metrics and analytics
- [ ] API for external integrations
- [ ] Docker deployment
- [ ] Cloud deployment guides

## 📞 Support

For issues, questions, or discussions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the documentation

---

**TF_Agent - 14 operators, 1 commander, your mission**
