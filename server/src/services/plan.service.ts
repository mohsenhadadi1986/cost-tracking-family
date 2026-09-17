import { Plan, PlanRecord } from '../models/plan.model';
import { AccountRepository } from '../repositories/account.repository';
import { PlanRepository } from '../repositories/plan.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { parsePlanWriteInput } from '../validation/plan.validation';
import { markPlanOccurrences, remainingUnpaidCount } from '../utils/plan-schedule';

export class PlanNotFoundError extends Error {
  constructor() {
    super('plan not found');
    this.name = 'PlanNotFoundError';
  }
}

export class PlanService {
  constructor(
    private readonly repository: PlanRepository,
    private readonly accountRepository: AccountRepository,
    private readonly transactionRepository: TransactionRepository
  ) {}

  list(): Plan[] {
    return this.withCounts(this.repository.findAll());
  }

  create(body: unknown): Plan {
    const input = parsePlanWriteInput(body);
    this.assertAccountExists(input.account);
    return this.withCount(this.repository.create(input));
  }

  update(id: number, body: unknown): Plan {
    const existing = this.repository.findById(id);
    if (!existing) {
      throw new PlanNotFoundError();
    }

    const input = parsePlanWriteInput(body, existing);
    this.assertAccountExists(input.account);
    const updated = this.repository.update(id, input);
    if (!updated) {
      throw new PlanNotFoundError();
    }

    return this.withCount(updated);
  }

  delete(id: number): void {
    const existing = this.repository.findById(id);
    if (!existing) {
      throw new PlanNotFoundError();
    }

    this.repository.delete(id);
  }

  private assertAccountExists(name: string): void {
    if (!this.accountRepository.existsByName(name)) {
      const names = this.accountRepository.findAllNames();
      throw new Error(`account must be one of: ${names.join(', ')}`);
    }
  }

  private withCounts(plans: PlanRecord[]): Plan[] {
    const occurrences = markPlanOccurrences(this.repository.findAll(), this.transactionRepository.findAll());
    return plans.map(plan => ({
      ...plan,
      remainingCount: remainingUnpaidCount(occurrences, plan.id),
      totalCount: occurrences.filter(occurrence => occurrence.planId === plan.id).length,
    }));
  }

  private withCount(plan: PlanRecord): Plan {
    return this.withCounts([plan])[0];
  }
}
