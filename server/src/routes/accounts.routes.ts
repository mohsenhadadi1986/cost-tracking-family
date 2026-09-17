import { Router } from 'express';
import {
  AccountInUseError,
  AccountNotFoundError,
  AccountService,
} from '../services/account.service';
import { parseAccountIdParam } from '../validation/account.validation';

export function createAccountsRouter(service: AccountService): Router {
  const router = Router();

  /**
   * @openapi
   * /api/accounts:
   *   get:
   *     tags:
   *       - Accounts
   *     summary: List money places
   *     description: Bank accounts, Satispay, PayPal, and any custom places.
   *     responses:
   *       200:
   *         description: List of accounts
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Account'
   */
  router.get('/', (_req, res) => {
    res.status(200).json(service.list());
  });

  /**
   * @openapi
   * /api/accounts:
   *   post:
   *     tags:
   *       - Accounts
   *     summary: Create a money place
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateAccountRequest'
   *     responses:
   *       201:
   *         description: Account created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Account'
   *       400:
   *         description: Validation error
   */
  router.post('/', (req, res) => {
    try {
      const created = service.create(req.body);
      res.status(201).json(created);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid account',
      });
    }
  });

  /**
   * @openapi
   * /api/accounts/{id}:
   *   patch:
   *     tags:
   *       - Accounts
   *     summary: Update a money place
   *     description: Renames a place and updates linked transaction rows that use the old name.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateAccountRequest'
   *     responses:
   *       200:
   *         description: Account updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Account'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Account not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.patch('/:id', (req, res) => {
    try {
      const id = parseAccountIdParam(req.params.id);
      const updated = service.update(id, req.body);
      res.status(200).json(updated);
    } catch (error) {
      if (error instanceof AccountNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid account',
      });
    }
  });

  /**
   * @openapi
   * /api/accounts/{id}:
   *   delete:
   *     tags:
   *       - Accounts
   *     summary: Delete a money place
   *     description: Deletes a place when it is not referenced by any transaction.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Account deleted
   *       404:
   *         description: Account not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       409:
   *         description: Account is referenced by transactions
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.delete('/:id', (req, res) => {
    try {
      const id = parseAccountIdParam(req.params.id);
      service.delete(id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof AccountNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }

      if (error instanceof AccountInUseError) {
        res.status(409).json({ error: error.message });
        return;
      }

      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid account',
      });
    }
  });

  return router;
}
