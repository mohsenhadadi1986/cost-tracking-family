import { Router } from 'express';
import {
  CategoryInUseError,
  CategoryNotFoundError,
  CategoryService,
} from '../services/category.service';
import { parseCategoryIdParam, parseCategoryTypeFilter } from '../validation/category.validation';

export function createCategoriesRouter(service: CategoryService): Router {
  const router = Router();

  /**
   * @openapi
   * /api/categories:
   *   get:
   *     tags:
   *       - Categories
   *     summary: List categories
   *     description: Returns all income and expense categories, optionally filtered by type.
   *     parameters:
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [expense, income]
   *         description: Filter categories by transaction type
   *     responses:
   *       200:
   *         description: List of categories
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Category'
   *       400:
   *         description: Invalid filter parameters
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.get('/', (req, res) => {
    try {
      const type = parseCategoryTypeFilter(req.query.type);
      res.status(200).json(service.list(type));
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid filter parameters',
      });
    }
  });

  /**
   * @openapi
   * /api/categories:
   *   post:
   *     tags:
   *       - Categories
   *     summary: Create a category
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateCategoryRequest'
   *     responses:
   *       201:
   *         description: Category created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Category'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.post('/', (req, res) => {
    try {
      const { name, type } = req.body;
      const created = service.create({ name, type });
      res.status(201).json(created);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid category',
      });
    }
  });

  /**
   * @openapi
   * /api/categories/{id}:
   *   patch:
   *     tags:
   *       - Categories
   *     summary: Update a category
   *     description: Renames a category and updates linked transaction rows that use the old name.
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
   *             $ref: '#/components/schemas/UpdateCategoryRequest'
   *     responses:
   *       200:
   *         description: Category updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Category'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Category not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.patch('/:id', (req, res) => {
    try {
      const id = parseCategoryIdParam(req.params.id);
      const { name } = req.body;
      const updated = service.update(id, { name });
      res.status(200).json(updated);
    } catch (error) {
      if (error instanceof CategoryNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid category',
      });
    }
  });

  /**
   * @openapi
   * /api/categories/{id}:
   *   delete:
   *     tags:
   *       - Categories
   *     summary: Delete a category
   *     description: Deletes a category when it is not referenced by any transaction.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Category deleted
   *       404:
   *         description: Category not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       409:
   *         description: Category is referenced by transactions
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.delete('/:id', (req, res) => {
    try {
      const id = parseCategoryIdParam(req.params.id);
      service.delete(id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof CategoryNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }

      if (error instanceof CategoryInUseError) {
        res.status(409).json({ error: error.message });
        return;
      }

      res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid category',
      });
    }
  });

  return router;
}
