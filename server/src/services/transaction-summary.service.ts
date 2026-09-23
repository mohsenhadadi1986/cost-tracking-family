import { TransactionSummaryResponse } from '../models/transaction-summary.model';
import { AccountRepository } from '../repositories/account.repository';
import { PlanRepository } from '../repositories/plan.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import type { TransactionFilterCriteria } from '../validation/transaction-filter.validation';
import { buildSummary } from './period-totals';
import { PlanService } from './plan.service';

export class TransactionSummaryService {
  constructor(
    private readonly repository: TransactionRepository,
    private readonly accountRepository: AccountRepository,
    private readonly planRepository: PlanRepository,
    private readonly planService: PlanService
  ) {}

  getSummary(criteria: TransactionFilterCriteria = {}): TransactionSummaryResponse {
    this.planService.settleDueInstallments();
    const transactions = this.repository.findFiltered(criteria);
    const lifetimeTransactions = this.repository.findAll();

    return buildSummary(transactions, criteria.startDate, criteria.endDate, {
      lifetimeTransactions,
      accounts: this.accountRepository.findAll().map(account => ({
        name: account.name,
        kind: account.kind,
      })),
      plans: this.planRepository.findAll(),
    });
  }
}
