import { Account } from '../models/account.model';
import { AccountRepository } from '../repositories/account.repository';
import { parseAccountWriteInput } from '../validation/account.validation';

export class AccountNotFoundError extends Error {
  constructor() {
    super('account not found');
    this.name = 'AccountNotFoundError';
  }
}

export class AccountInUseError extends Error {
  constructor() {
    super('account is referenced by one or more transactions');
    this.name = 'AccountInUseError';
  }
}

export class AccountService {
  constructor(private readonly repository: AccountRepository) {}

  list(): Account[] {
    return this.repository.findAll();
  }

  create(body: unknown): Account {
    return this.repository.create(parseAccountWriteInput(body));
  }

  update(id: number, body: unknown): Account {
    const existing = this.repository.findById(id);
    if (!existing) {
      throw new AccountNotFoundError();
    }

    const updated = this.repository.update(id, parseAccountWriteInput(body, existing));
    if (!updated) {
      throw new AccountNotFoundError();
    }

    return updated;
  }

  delete(id: number): void {
    const account = this.repository.findById(id);
    if (!account) {
      throw new AccountNotFoundError();
    }

    if (this.repository.countTransactionsReferencing(account.name) > 0) {
      throw new AccountInUseError();
    }

    if (this.repository.countCreditCardsChargedFrom(account.name) > 0) {
      throw new AccountInUseError();
    }

    this.repository.delete(id);
  }
}
