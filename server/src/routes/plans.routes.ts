import { Router } from 'express';
import { PlanNotFoundError, PlanService } from '../services/plan.service';
import { parsePlanIdParam } from '../validation/plan.validation';

export function createPlansRouter(service: PlanService): Router {
  const router = Router();

  /**
   * @openapi
   * /api/plans:
   *   get:
   *     tags:
   *       - Plans
   *     summary: List installment and recurring payment plans
   *     responses:
   *       200:
   *         description: List of plans
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Plan'
   */
  router.get('/', (_req, res) => {
    res.status(200).json(service.list());
  });

  /**
   * @openapi
   * /api/plans:
   *   post:
   *     tags:
   *       - Plans
   *     summary: Create a payment plan
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreatePlanRequest'
   *     responses:
   *       201:
   *         description: Plan created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Plan'
   *       400:
   *         description: Validation error
   */
  router.post('/', (req, res) => {
    try {
      const created = service.create(req.body);
      res.status(201).json(created);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid plan',
      });
    }
  });

  /**
   * @openapi
   * /api/plans/{id}:
   *   patch:
   *     tags:
   *       - Plans
   *     summary: Update a payment plan
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
   *             $ref: '#/components/schemas/UpdatePlanRequest'
   *     responses:
   *       200:
   *         description: Plan updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Plan'
   *       400:
   *         description: Validation error
   *       404:
   *         description: Plan not found
   */
  router.patch('/:id', (req, res) => {
    try {
      const id = parsePlanIdParam(req.params.id);
      const updated = service.update(id, req.body);
      res.status(200).json(updated);
    } catch (error) {
      if (error instanceof PlanNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid plan',
      });
    }
  });

  /**
   * @openapi
   * /api/plans/{id}:
   *   delete:
   *     tags:
   *       - Plans
   *     summary: Delete a payment plan
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Plan deleted
   *       404:
   *         description: Plan not found
   */
  router.delete('/:id', (req, res) => {
    try {
      const id = parsePlanIdParam(req.params.id);
      service.delete(id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof PlanNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid plan',
      });
    }
  });

  return router;
}
