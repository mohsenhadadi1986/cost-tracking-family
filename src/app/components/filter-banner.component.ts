import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../services/transaction.service';
import { formatFilterSummary } from '../utils/format-filter-summary';

@Component({
  selector: 'app-filter-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showFilterBanner()" class="card status-banner status-info">
      <p class="filter-banner-title">{{ title }}</p>
      <p *ngIf="filterSummary()" class="filter-banner-detail">{{ filterSummary() }}</p>
    </div>
  `,
  styles: [`
    .filter-banner-title {
      margin: 0;
      font-weight: 600;
    }

    .filter-banner-detail {
      margin: var(--space-sm) 0 0;
      font-size: 0.875rem;
    }
  `]
})
export class FilterBannerComponent {
  @Input() title = 'Active filters applied';

  activeFilter = this.transactionService.getActiveFilter();

  showFilterBanner = computed(() => this.activeFilter() !== null);

  filterSummary = computed(() => {
    const filter = this.activeFilter();
    return filter ? formatFilterSummary(filter) : '';
  });

  constructor(private transactionService: TransactionService) {}
}
