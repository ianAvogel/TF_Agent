import dotenv from 'dotenv';
import { AgentOrchestrator } from './core/AgentOrchestrator';
import { ChatServer } from './api/ChatServer';
import path from 'path';

dotenv.config();

async function main() {
  console.log('='.repeat(60));
  console.log('🎯 TF_AGENT - 14 Operators, 1 Commander, Your Mission');
  console.log('='.repeat(60));
  console.log();

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: No API key found!');
    console.error('Please set ANTHROPIC_API_KEY or OPENAI_API_KEY in your .env file');
    process.exit(1);
  }

  const llmProvider = process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openai';
  const llmModel = process.env.COMMANDER_MODEL ||
    (llmProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4');

  console.log(`📡 LLM Provider: ${llmProvider}`);
  console.log(`🤖 Model: ${llmModel}`);
  console.log();

  const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/tf_agent.db');
  const orchestrator = new AgentOrchestrator(dbPath);

  console.log('⚙️  Initializing agent system...');
  await orchestrator.initialize({
    llmProvider: llmProvider as 'anthropic' | 'openai',
    llmModel,
    apiKey,
    temperature: parseFloat(process.env.COMMANDER_TEMPERATURE || '0.7')
  });

  console.log('✅ Agent system initialized');
  console.log();

  const autoLearningEnabled = process.env.AUTO_LEARNING_ENABLED !== 'false';
  if (autoLearningEnabled) {
    const learningInterval = parseInt(process.env.LEARNING_INTERVAL_MS || '300000');
    orchestrator.startAutonomousMode(learningInterval);
    console.log('🔄 Autonomous learning mode: ENABLED');
    console.log(`📚 Learning interval: ${learningInterval / 1000}s`);
  } else {
    console.log('🔄 Autonomous learning mode: DISABLED');
  }
  console.log();

  const taskProcessingInterval = setInterval(async () => {
    await orchestrator.processTaskQueue();
  }, 5000);

  const port = parseInt(process.env.PORT || '3000');
  const chatServer = new ChatServer(
    orchestrator.getCommander(),
    orchestrator.getDatabase(),
    port
  );

  await chatServer.start();
  console.log(`💬 Chat interface: http://localhost:${port}`);
  console.log();

  console.log('='.repeat(60));
  console.log('✨ TF_Agent is now operational!');
  console.log('='.repeat(60));
  console.log();
  console.log('Agent Status:');
  const stats = orchestrator.getAgentStats();
  console.log(`  Total Agents: ${stats.total}`);
  console.log(`  Roles: ${JSON.stringify(stats.byRole, null, 2)}`);
  console.log();
  console.log('🎯 Your mission has begun. The Commander awaits your orders.');
  console.log();

  const statusInterval = setInterval(() => {
    const taskStats = orchestrator.getTaskManager().getTaskStats();
    console.log(`[${new Date().toISOString()}] Tasks: ${taskStats.completed}/${taskStats.total} completed, ${taskStats.pending} pending`);
  }, 60000);

  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down TF_Agent...');
    clearInterval(taskProcessingInterval);
    clearInterval(statusInterval);
    orchestrator.shutdown();
    chatServer.stop();
    console.log('👋 Goodbye!');
    process.exit(0);
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

main().catch((error) => {
  console.error('❌ Fatal error during startup:', error);
  process.exit(1);
});
