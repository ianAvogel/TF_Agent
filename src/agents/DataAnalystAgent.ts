import { BaseAgent } from '../core/BaseAgent';
import { AgentRole, Task, Knowledge } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AnalysisResult {
  summary: string;
  insights: string[];
  patterns: any[];
  recommendations: string[];
  confidence: number;
}

export class DataAnalystAgent extends BaseAgent {
  private analysisHistory: AnalysisResult[] = [];

  constructor() {
    super('DataAnalyst', AgentRole.DATA_ANALYST, [
      'data analysis',
      'pattern recognition',
      'statistical analysis',
      'insight generation',
      'trend forecasting'
    ]);
  }

  async executeTask(task: Task): Promise<AnalysisResult> {
    this.setStatus('working' as any);

    try {
      const taskData = JSON.parse(task.description);
      const { data, analysisType } = taskData;

      const result = await this.analyzeData(data, analysisType);
      this.analysisHistory.push(result);

      return result;
    } finally {
      this.setStatus('idle' as any);
    }
  }

  async analyzeData(data: any[], analysisType: string = 'general'): Promise<AnalysisResult> {
    console.log(`[DataAnalyst] Analyzing ${data.length} data points (type: ${analysisType})`);

    const insights: string[] = [];
    const patterns: any[] = [];
    const recommendations: string[] = [];

    if (analysisType === 'opportunity_evaluation') {
      const avgValue = data.reduce((sum, item) => sum + (item.estimatedValue || 0), 0) / data.length;
      const avgFeasibility = data.reduce((sum, item) => sum + (item.feasibility || 0), 0) / data.length;

      insights.push(`Average estimated value: $${avgValue.toFixed(2)}`);
      insights.push(`Average feasibility: ${(avgFeasibility * 100).toFixed(1)}%`);

      const highValue = data.filter(item => item.estimatedValue > avgValue);
      insights.push(`${highValue.length} opportunities above average value`);

      const viable = data.filter(item => item.feasibility > 0.7);
      if (viable.length > 0) {
        recommendations.push(`Focus on ${viable.length} highly feasible opportunities`);
      }

      patterns.push({
        type: 'value_distribution',
        high: data.filter(d => d.estimatedValue > avgValue * 1.5).length,
        medium: data.filter(d => d.estimatedValue >= avgValue * 0.5 && d.estimatedValue <= avgValue * 1.5).length,
        low: data.filter(d => d.estimatedValue < avgValue * 0.5).length
      });
    } else if (analysisType === 'performance') {
      const successRate = data.filter(item => item.status === 'completed').length / data.length;
      insights.push(`Success rate: ${(successRate * 100).toFixed(1)}%`);

      if (successRate < 0.7) {
        recommendations.push('Consider reviewing task allocation strategy');
      }
    } else {
      insights.push(`Analyzed ${data.length} data points`);
      insights.push('General pattern detection in progress');
      recommendations.push('Provide specific analysis type for deeper insights');
    }

    const result: AnalysisResult = {
      summary: `Analysis of ${data.length} items (${analysisType})`,
      insights,
      patterns,
      recommendations,
      confidence: 0.75
    };

    console.log(`[DataAnalyst] Analysis complete. Generated ${insights.length} insights`);
    return result;
  }

  async findCorrelations(datasetA: any[], datasetB: any[], key: string): Promise<any> {
    const correlations = [];

    for (const itemA of datasetA) {
      const matching = datasetB.filter(itemB => itemB[key] === itemA[key]);
      if (matching.length > 0) {
        correlations.push({
          key: itemA[key],
          countA: 1,
          countB: matching.length,
          items: matching
        });
      }
    }

    return {
      totalCorrelations: correlations.length,
      correlations: correlations.slice(0, 10),
      strength: correlations.length / Math.max(datasetA.length, datasetB.length)
    };
  }

  async detectAnomalies(data: any[], metric: string): Promise<any[]> {
    if (data.length < 3) return [];

    const values = data.map(item => item[metric]).filter(v => typeof v === 'number');
    if (values.length === 0) return [];

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const anomalies = data.filter(item => {
      const value = item[metric];
      if (typeof value !== 'number') return false;
      return Math.abs(value - mean) > (2 * stdDev);
    });

    console.log(`[DataAnalyst] Detected ${anomalies.length} anomalies in ${metric}`);
    return anomalies;
  }

  async predictTrend(historicalData: Array<{ timestamp: Date; value: number }>): Promise<any> {
    if (historicalData.length < 2) {
      return { prediction: null, confidence: 0, message: 'Insufficient data' };
    }

    const sortedData = historicalData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const values = sortedData.map(d => d.value);
    const n = values.length;

    let sumDiff = 0;
    for (let i = 1; i < n; i++) {
      sumDiff += values[i] - values[i - 1];
    }
    const avgChange = sumDiff / (n - 1);

    const lastValue = values[n - 1];
    const prediction = lastValue + avgChange;

    const trend = avgChange > 0 ? 'increasing' : avgChange < 0 ? 'decreasing' : 'stable';

    return {
      prediction,
      trend,
      avgChange,
      confidence: Math.min(0.9, n / 10),
      dataPoints: n
    };
  }

  async learn(knowledge: Knowledge): Promise<void> {
    if (knowledge.category === 'analysis_technique') {
      console.log(`[DataAnalyst] Learned new analysis technique: ${knowledge.content}`);
    }
    this.knowledgeBase.push(knowledge);
  }

  async teach(): Promise<Knowledge[]> {
    const teachings: Knowledge[] = [];

    if (this.analysisHistory.length > 0) {
      const recentAnalyses = this.analysisHistory.slice(-5);

      teachings.push({
        id: uuidv4(),
        source: this.getId(),
        content: JSON.stringify({
          type: 'analysis_patterns',
          analyses: recentAnalyses.map(a => ({
            summary: a.summary,
            insights: a.insights,
            confidence: a.confidence
          }))
        }),
        category: 'analytical_insights',
        tags: ['analysis', 'patterns', 'insights'],
        createdAt: new Date(),
        usefulness: 0.85
      });
    }

    return teachings;
  }

  getAnalysisHistory(): AnalysisResult[] {
    return this.analysisHistory;
  }
}
