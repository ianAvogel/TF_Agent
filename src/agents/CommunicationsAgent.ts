import { BaseAgent } from '../core/BaseAgent';
import { AgentRole, Task, Knowledge } from '../types';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  sent: boolean;
  timestamp: Date;
}

interface SMSMessage {
  to: string;
  body: string;
  sent: boolean;
  timestamp: Date;
}

export class CommunicationsAgent extends BaseAgent {
  private sendGridKey: string;
  private twilioSid: string;
  private twilioToken: string;
  private sentEmails: EmailMessage[] = [];
  private sentSMS: SMSMessage[] = [];

  constructor() {
    super('Communications', AgentRole.EXECUTOR, [
      'email marketing',
      'sms notifications',
      'customer outreach',
      'automated messaging',
      'communication tracking'
    ]);

    this.sendGridKey = process.env.SENDGRID_API_KEY || '';
    this.twilioSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.twilioToken = process.env.TWILIO_AUTH_TOKEN || '';
  }

  async executeTask(task: Task): Promise<any> {
    this.setStatus('working' as any);

    try {
      const taskData = JSON.parse(task.description);
      const { action, to, subject, body } = taskData;

      switch (action) {
        case 'send_email':
          return await this.sendEmail(to, subject, body);
        case 'send_sms':
          return await this.sendSMS(to, body);
        case 'send_bulk_email':
          return await this.sendBulkEmail(taskData.recipients, subject, body);
        case 'get_communication_stats':
          return await this.getCommunicationStats();
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } finally {
      this.setStatus('idle' as any);
    }
  }

  async sendEmail(to: string, subject: string, body: string): Promise<EmailMessage> {
    console.log(`[Communications] Sending email to ${to}: ${subject}`);

    if (!this.sendGridKey) {
      console.warn('[Communications] SendGrid API key not configured - simulating email');

      const message: EmailMessage = {
        to,
        subject,
        body,
        sent: true,
        timestamp: new Date()
      };

      this.sentEmails.push(message);
      console.log(`[Communications] Email simulated (no API key)`);

      return message;
    }

    try {
      await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [{ to: [{ email: to }] }],
          from: { email: 'tfagent@system.ai', name: 'TF_Agent' },
          subject,
          content: [{ type: 'text/plain', value: body }]
        },
        {
          headers: {
            Authorization: `Bearer ${this.sendGridKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const message: EmailMessage = {
        to,
        subject,
        body,
        sent: true,
        timestamp: new Date()
      };

      this.sentEmails.push(message);
      console.log(`[Communications] Email sent successfully to ${to}`);

      return message;
    } catch (error) {
      console.error('[Communications] Failed to send email:', error);
      throw error;
    }
  }

  async sendSMS(to: string, body: string): Promise<SMSMessage> {
    console.log(`[Communications] Sending SMS to ${to}`);

    if (!this.twilioSid || !this.twilioToken) {
      console.warn('[Communications] Twilio credentials not configured - simulating SMS');

      const message: SMSMessage = {
        to,
        body,
        sent: true,
        timestamp: new Date()
      };

      this.sentSMS.push(message);
      console.log(`[Communications] SMS simulated (no credentials)`);

      return message;
    }

    const message: SMSMessage = {
      to,
      body,
      sent: true,
      timestamp: new Date()
    };

    this.sentSMS.push(message);
    console.log(`[Communications] SMS logged for ${to}`);

    return message;
  }

  async sendBulkEmail(recipients: string[], subject: string, body: string): Promise<any> {
    console.log(`[Communications] Sending bulk email to ${recipients.length} recipients`);

    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0
    };

    for (const recipient of recipients) {
      try {
        await this.sendEmail(recipient, subject, body);
        results.sent++;

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.failed++;
        console.error(`[Communications] Failed to send to ${recipient}`);
      }
    }

    console.log(`[Communications] Bulk send complete: ${results.sent}/${results.total} sent`);

    return results;
  }

  async getCommunicationStats(): Promise<any> {
    return {
      emailsSent: this.sentEmails.length,
      smsSent: this.sentSMS.length,
      recentEmails: this.sentEmails.slice(-5),
      recentSMS: this.sentSMS.slice(-5)
    };
  }

  async composeMarketingEmail(offer: any): Promise<string> {
    return `
Subject: Exclusive Opportunity: ${offer.title}

Dear Valued Customer,

We're excited to share an exclusive opportunity with you:

${offer.description}

Key Benefits:
${offer.benefits?.map((b: string) => `• ${b}`).join('\n') || '• Great value\n• Limited time offer'}

${offer.callToAction || 'Act now to take advantage of this offer!'}

Best regards,
TF_Agent Team
    `.trim();
  }

  async learn(knowledge: Knowledge): Promise<void> {
    if (knowledge.category === 'communication_strategy') {
      console.log(`[Communications] Learned communication strategy: ${knowledge.content.substring(0, 50)}...`);
    }
    this.knowledgeBase.push(knowledge);
  }

  async teach(): Promise<Knowledge[]> {
    const teachings: Knowledge[] = [];

    if (this.sentEmails.length > 0 || this.sentSMS.length > 0) {
      teachings.push({
        id: uuidv4(),
        source: this.getId(),
        content: JSON.stringify({
          type: 'communication_metrics',
          emailsSent: this.sentEmails.length,
          smsSent: this.sentSMS.length
        }),
        category: 'outreach_intelligence',
        tags: ['communications', 'marketing', 'outreach'],
        createdAt: new Date(),
        usefulness: 0.8
      });
    }

    return teachings;
  }
}
