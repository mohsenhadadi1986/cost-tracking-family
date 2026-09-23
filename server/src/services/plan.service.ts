import { Plan, PlanRecord } from '../models/plan.model';
import { AccountRepository } from '../repositories/account.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { PlanRepository } from '../repositories/plan.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { todayIsoDate } from '../utils/credit-card';
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
    private readonly transactionRepository: TransactionRepository,
    private readonly categoryRepository: CategoryRepository
  ) {}

  list(): Plan[] {
    this.settleDueInstallments();
    return this.withCounts(this.repository.findAll());
  }

  settleDueInstallments(asOfDate = todayIsoDate()): void {
    const plans = this.repository.findAll();
    if (plans.length === 0) {
      return;
    }

    const due = markPlanOccurrences(plans, this.transactionRepository.findAll())
      .filter(occurrence => !occurrence.paid && occurrence.dueDate <= asOfDate);

    for (const occurrence of due) {
      this.transactionRepository.create({
        date: occurrence.dueDate,
        category: expenseCategoryForPlan(occurrence.name, this.categoryRepository),
        type: 'expense',
        amount: occurrence.amount,
        description: occurrence.name,
        account: occurrence.account,
      });
    }

    const settled = markPlanOccurrences(this.repository.findAll(), this.transactionRepository.findAll());
    for (const plan of plans) {
      const total = settled.filter(occurrence => occurrence.planId === plan.id).length;
      if (total > 0 && remainingUnpaidCount(settled, plan.id) === 0) {
        this.repository.delete(plan.id);
      }
    }
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

function expenseCategoryForPlan(name: string, categoryRepository: CategoryRepository): string {
  if (categoryRepository.existsByNameAndType(name, 'expense')) {
    return name;
  }

  const names = categoryRepository.findNamesByType('expense');
  const folded = name.toLowerCase();
  const match = names
    .filter(category => folded.includes(category.toLowerCase()))
    .sort((left, right) => right.length - left.length)[0];

  if (match) {
    return match;
  }

  if (names.includes('Unexpected cost')) {
    return 'Unexpected cost';
  }

  return names[0] ?? 'Unexpected cost';
}
