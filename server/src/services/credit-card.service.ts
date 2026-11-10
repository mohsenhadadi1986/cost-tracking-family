import { TRANSFER_CATEGORY } from '../models/transaction.model';
import { AccountRepository } from '../repositories/account.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { buildCreditCardStatementPayoffs, todayIsoDate } from '../utils/credit-card';

export class CreditCardService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly accountRepository: AccountRepository
  ) {}

  settleDueStatements(asOfDate = todayIsoDate()): void {
    const accounts = this.accountRepository.findAll();
    if (!accounts.some(account => account.kind === 'credit')) {
      return;
    }

    const transactions = this.transactionRepository.findAll();
    const payoffs = buildCreditCardStatementPayoffs(transactions, accounts, asOfDate);

    for (const payoff of payoffs) {
      const existing = transactions.find(transaction =>
        transaction.type === 'transfer'
        && transaction.date === payoff.date
        && transaction.account === payoff.account
        && transaction.toAccount === payoff.toAccount
      );

      if (existing) {
        if (Math.round(existing.amount * 100) !== Math.round(payoff.amount * 100)) {
          this.transactionRepository.update(existing.id, {
            date: payoff.date,
            category: TRANSFER_CATEGORY,
            type: 'transfer',
            amount: payoff.amount,
            description: payoff.description,
            account: payoff.account,
            toAccount: payoff.toAccount,
          });
        }
        continue;
      }

      const created = this.transactionRepository.create({
        date: payoff.date,
        category: TRANSFER_CATEGORY,
        type: 'transfer',
        amount: payoff.amount,
        description: payoff.description,
        account: payoff.account,
        toAccount: payoff.toAccount,
      });
      transactions.push(created);
    }
  }
}
