import { v4 as uuidv4 } from 'uuid';
import { Task, TaskStatus, TaskPriority } from '../types';
import { EventEmitter } from 'events';

export class TaskManager extends EventEmitter {
  private tasks: Map<string, Task> = new Map();
  private taskQueue: Task[] = [];

  createTask(
    description: string,
    assignedTo: string,
    priority: TaskPriority = TaskPriority.MEDIUM,
    metadata?: Record<string, any>
  ): Task {
    const task: Task = {
      id: uuidv4(),
      description,
      assignedTo,
      priority,
      status: TaskStatus.PENDING,
      createdAt: new Date(),
      metadata
    };

    this.tasks.set(task.id, task);
    this.taskQueue.push(task);
    this.sortQueue();

    this.emit('taskCreated', task);
    console.log(`[TaskManager] Task created: ${task.id} - ${description}`);

    return task;
  }

  updateTaskStatus(taskId: string, status: TaskStatus, result?: any): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.warn(`[TaskManager] Task not found: ${taskId}`);
      return;
    }

    task.status = status;
    if (status === TaskStatus.COMPLETED) {
      task.completedAt = new Date();
      task.result = result;
      this.removeFromQueue(taskId);
    }

    this.emit('taskUpdated', task);
    console.log(`[TaskManager] Task ${taskId} status: ${status}`);
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getTasksByAgent(agentId: string): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.assignedTo === agentId);
  }

  getPendingTasks(agentId?: string): Task[] {
    const pending = this.taskQueue.filter(t => t.status === TaskStatus.PENDING);
    if (agentId) {
      return pending.filter(t => t.assignedTo === agentId);
    }
    return pending;
  }

  getNextTask(agentId?: string): Task | undefined {
    if (agentId) {
      return this.taskQueue.find(t =>
        t.status === TaskStatus.PENDING && t.assignedTo === agentId
      );
    }
    return this.taskQueue.find(t => t.status === TaskStatus.PENDING);
  }

  private sortQueue(): void {
    const priorityOrder = {
      [TaskPriority.CRITICAL]: 0,
      [TaskPriority.HIGH]: 1,
      [TaskPriority.MEDIUM]: 2,
      [TaskPriority.LOW]: 3
    };

    this.taskQueue.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  private removeFromQueue(taskId: string): void {
    this.taskQueue = this.taskQueue.filter(t => t.id !== taskId);
  }

  getTaskStats(): { total: number; pending: number; inProgress: number; completed: number; failed: number } {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      failed: tasks.filter(t => t.status === TaskStatus.FAILED).length
    };
  }
}
