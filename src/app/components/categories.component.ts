import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from './ui/button.component';
import { TransactionTypeSelectComponent } from './ui/transaction-type-select.component';
import { Category, CategoryType } from '../models/category.model';
import { CategoryService } from '../services/category.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, TransactionTypeSelectComponent],
  template: `
    <h2 class="page-title">Categories</h2>

    <div *ngIf="loadError()" class="card status-banner status-error">
      {{ loadError() }}
    </div>

    <div *ngIf="submitError()" class="card status-banner status-error">
      {{ submitError() }}
    </div>

    <form class="card form-card" (ngSubmit)="onCreate()">
      <h3 class="categories-section-title">Add Category</h3>

      <div class="form-group">
        <label for="new-category-name">Name</label>
        <input
          id="new-category-name"
          type="text"
          [(ngModel)]="newCategory.name"
          name="newCategoryName"
          required
          [disabled]="submitting()"
          placeholder="Category name">
      </div>

      <div class="form-group">
        <app-transaction-type-select
          [(ngModel)]="newCategory.type"
          name="newCategoryType"
          [disabled]="submitting()">
        </app-transaction-type-select>
      </div>

      <app-button type="submit" variant="primary" [disabled]="submitting() || !newCategory.name.trim()">
        {{ submitting() ? 'Saving…' : 'Add Category' }}
      </app-button>
    </form>

    <section class="categories-section">
      <h3 class="categories-section-title">Expense Categories</h3>
      <ng-container
        *ngTemplateOutlet="categoryTable; context: {
          categories: expenseCategories(),
          emptyMessage: 'No expense categories yet.'
        }">
      </ng-container>
    </section>

    <section class="categories-section">
      <h3 class="categories-section-title">Income Categories</h3>
      <ng-container
        *ngTemplateOutlet="categoryTable; context: {
          categories: incomeCategories(),
          emptyMessage: 'No income categories yet.'
        }">
      </ng-container>
    </section>

    <ng-template #categoryTable let-categories="categories" let-emptyMessage="emptyMessage">
      <div class="table-shell">
        <div class="table-scroll">
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th class="categories-actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="loading()">
                  <td colspan="2" class="empty-state">Loading categories…</td>
                </tr>
                <tr *ngIf="!loading() && !loadError() && categories.length === 0">
                  <td colspan="2" class="empty-state">{{ emptyMessage }}</td>
                </tr>
                <tr *ngFor="let category of categories">
                  <td data-label="Name">
                    <ng-container *ngIf="editingId !== category.id; else editField">
                      {{ category.name }}
                    </ng-container>
                    <ng-template #editField>
                      <input
                        type="text"
                        [(ngModel)]="editingName"
                        [name]="'edit-' + category.id"
                        class="categories-edit-input"
                        [disabled]="submitting()"
                        (keydown.enter)="saveEdit(category)"
                        (keydown.escape)="cancelEdit()">
                    </ng-template>
                  </td>
                  <td data-label="Actions" class="categories-actions">
                    <ng-container *ngIf="editingId !== category.id; else editActions">
                      <app-button
                        type="button"
                        variant="secondary"
                        size="sm"
                        [disabled]="submitting()"
                        (click)="startEdit(category)">
                        Edit
                      </app-button>
                      <app-button
                        type="button"
                        variant="secondary"
                        size="sm"
                        [disabled]="submitting()"
                        (click)="onDelete(category)">
                        Delete
                      </app-button>
                    </ng-container>
                    <ng-template #editActions>
                      <app-button
                        type="button"
                        variant="primary"
                        size="sm"
                        [disabled]="submitting() || !editingName.trim()"
                        (click)="saveEdit(category)">
                        Save
                      </app-button>
                      <app-button
                        type="button"
                        variant="secondary"
                        size="sm"
                        [disabled]="submitting()"
                        (click)="cancelEdit()">
                        Cancel
                      </app-button>
                    </ng-template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .categories-section {
      margin-top: var(--space-lg);
    }

    .categories-section-title {
      margin: 0 0 var(--space-md);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
    }

    .categories-actions-header {
      width: 12rem;
      text-align: right;
    }

    .categories-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-xs);
    }

    .categories-edit-input {
      width: 100%;
      max-width: 16rem;
    }

    @media (max-width: 768px) {
      .categories-actions {
        justify-content: flex-start;
      }
    }
  `]
})
export class CategoriesComponent {
  loading = this.categoryService.getLoading();
  loadError = this.categoryService.getLoadError();
  submitting = this.categoryService.getSubmitting();
  submitError = this.categoryService.getSubmitError();

  expenseCategories = computed(() =>
    this.categoryService.getCategories()().filter(category => category.type === 'expense')
  );

  incomeCategories = computed(() =>
    this.categoryService.getCategories()().filter(category => category.type === 'income')
  );

  newCategory = {
    name: '',
    type: 'expense' as CategoryType
  };

  editingId: number | null = null;
  editingName = '';

  constructor(private categoryService: CategoryService) {}

  onCreate() {
    const name = this.newCategory.name.trim();
    if (!name) {
      return;
    }

    this.categoryService.clearSubmitError();
    this.categoryService.createCategory({ name, type: this.newCategory.type }).subscribe({
      next: () => {
        this.newCategory = { name: '', type: 'expense' };
      }
    });
  }

  startEdit(category: Category) {
    this.categoryService.clearSubmitError();
    this.editingId = category.id;
    this.editingName = category.name;
  }

  cancelEdit() {
    this.editingId = null;
    this.editingName = '';
  }

  saveEdit(category: Category) {
    const name = this.editingName.trim();
    if (!name || name === category.name) {
      this.cancelEdit();
      return;
    }

    this.categoryService.updateCategory(category.id, { name }).subscribe({
      next: () => this.cancelEdit()
    });
  }

  onDelete(category: Category) {
    const confirmed = window.confirm(
      `Delete "${category.name}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.categoryService.clearSubmitError();
    this.categoryService.deleteCategory(category.id).subscribe();
  }
}
