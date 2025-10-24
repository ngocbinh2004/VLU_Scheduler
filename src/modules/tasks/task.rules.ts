export class TasksRule {
  constructor(
    public ruleName: string, // Name of the rule
    public cronExpression: string, // Cron expression (e.g., "0 0 * * *")
    public execute: () => Promise<void>, // The function to execute
  ) {}
}
