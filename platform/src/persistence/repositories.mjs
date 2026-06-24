function stamp(record, now) {
  return {
    ...record,
    created_at: record.created_at || now,
    updated_at: now,
  };
}

export class GenericRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  get(tx, id) {
    return tx.get(this.tableName, id);
  }

  list(tx) {
    return tx.list(this.tableName);
  }

  async insert(tx, record, now) {
    const row = stamp(record, now);
    await tx.insert(this.tableName, row);
    return row;
  }

  async update(tx, id, patch, now) {
    return tx.update(this.tableName, id, (current) => stamp({ ...current, ...patch }, now));
  }
}

export function createRepositories() {
  return {
    users: new GenericRepository("users"),
    roleAssignments: new GenericRepository("role_assignments"),
    products: new GenericRepository("products"),
    builds: new GenericRepository("builds"),
    releases: new GenericRepository("releases"),
    qaPlans: new GenericRepository("qa_plans"),
    qaExecutions: new GenericRepository("qa_executions"),
    bugs: new GenericRepository("bugs"),
    betaApplications: new GenericRepository("beta_applications"),
    betaFeedback: new GenericRepository("beta_feedback"),
    automationJobs: new GenericRepository("automation_jobs"),
    runnerNodes: new GenericRepository("runner_nodes"),
    testEvidenceObjects: new GenericRepository("test_evidence_objects"),
    testSchedules: new GenericRepository("test_schedules"),
    supportCases: new GenericRepository("support_cases"),
    incidents: new GenericRepository("incidents"),
    integrationStates: new GenericRepository("integration_states"),
    knowledgeBaseEntries: new GenericRepository("knowledge_base_entries"),
    readinessSnapshots: new GenericRepository("readiness_snapshots"),
  };
}
