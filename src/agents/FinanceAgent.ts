import { BaseAgent } from '../core/BaseAgent';
import { AgentRole, Task, Knowledge } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: Date;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
}

export class FinanceAgent extends BaseAgent {
  private stripeKey: string;
  private transactions: Transaction[] = [];
  private balance: number = 0;

  constructor() {
    super('Finance', AgentRole.EXECUTOR, [
      'payment processing',
      'revenue tracking',
      'expense management',
      'financial reporting',
      'transaction handling'
    ]);

    this.stripeKey = process.env.STRIPE_SECRET_KEY || '';
  }

  async executeTask(task: Task): Promise<any> {
    this.setStatus('working' as any);

    try {
      const taskData = JSON.parse(task.description);
      const { action, amount, description } = taskData;

      switch (action) {
        case 'create_payment_intent':
          return await this.createPaymentIntent(amount, description);
        case 'record_income':
          return await this.recordIncome(amount, description);
        case 'record_expense':
          return await this.recordExpense(amount, description);
        case 'get_financial_report':
          return await this.getFinancialReport();
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } finally {
      this.setStatus('idle' as any);
    }
  }

  async createPaymentIntent(amount: number, description: string): Promise<PaymentIntent> {
    console.log(`[Finance] Creating payment intent for $${amount}`);

    const intent: PaymentIntent = {
      id: `pi_${uuidv4().substring(0, 24)}`,
      amount: Math.round(amount * 100),
      currency: 'usd',
      status: 'requires_payment_method',
      created: new Date()
    };

    await this.recordIncome(amount, description);

    console.log(`[Finance] Payment intent created: ${intent.id}`);

    return intent;
  }

  async recordIncome(amount: number, description: string): Promise<Transaction> {
    const transaction: Transaction = {
      id: uuidv4(),
      type: 'income',
      amount,
      description,
      timestamp: new Date(),
      status: 'completed'
    };

    this.transactions.push(transaction);
    this.balance += amount;

    console.log(`[Finance] Income recorded: +$${amount} - ${description} (Balance: $${this.balance})`);

    return transaction;
  }

  async recordExpense(amount: number, description: string): Promise<Transaction> {
    if (amount > this.balance) {
      throw new Error(`Insufficient balance. Available: $${this.balance}, Required: $${amount}`);
    }

    const transaction: Transaction = {
      id: uuidv4(),
      type: 'expense',
      amount,
      description,
      timestamp: new Date(),
      status: 'completed'
    };

    this.transactions.push(transaction);
    this.balance -= amount;

    console.log(`[Finance] Expense recorded: -$${amount} - ${description} (Balance: $${this.balance})`);

    return transaction;
  }

  async getFinancialReport(): Promise<any> {
    const income = this.transactions
      .filter(t => t.type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = this.transactions
      .filter(t => t.type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const recentTransactions = this.transactions.slice(-10);

    const report = {
      balance: this.balance,
      totalIncome: income,
      totalExpenses: expenses,
      netProfit: income - expenses,
      transactionCount: this.transactions.length,
      recentTransactions,
      profitMargin: income > 0 ? ((income - expenses) / income * 100).toFixed(2) + '%' : '0%'
    };

    console.log(`[Finance] Report: Balance=$${this.balance}, Income=$${income}, Expenses=$${expenses}, Profit=$${report.netProfit}`);

    return report;
  }

  async estimateRevenue(opportunity: any): Promise<number> {
    const baseValue = opportunity.estimatedValue || 0;
    const feasibility = opportunity.feasibility || 0.5;

    const estimatedRevenue = baseValue * feasibility;

    console.log(`[Finance] Estimated revenue for "${opportunity.description}": $${estimatedRevenue.toFixed(2)}`);

    return estimatedRevenue;
  }

  getBalance(): number {
    return this.balance;
  }

  getTransactions(): Transaction[] {
    return this.transactions;
  }

  async learn(knowledge: Knowledge): Promise<void> {
    if (knowledge.category === 'revenue_optimization') {
      console.log(`[Finance] Learned revenue optimization: ${knowledge.content.substring(0, 50)}...`);
    }
    this.knowledgeBase.push(knowledge);
  }

  async teach(): Promise<Knowledge[]> {
    const teachings: Knowledge[] = [];

    if (this.transactions.length > 0) {
      const report = await this.getFinancialReport();

      teachings.push({
        id: uuidv4(),
        source: this.getId(),
        content: JSON.stringify({
          type: 'financial_status',
          balance: this.balance,
          profit: report.netProfit,
          transactionCount: this.transactions.length
        }),
        category: 'financial_intelligence',
        tags: ['finance', 'revenue', 'transactions'],
        createdAt: new Date(),
        usefulness: 0.95
      });
    }

    return teachings;
  }
}
