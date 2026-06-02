import { Component, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { TransactionFilter } from '../models/transaction-filter.model';
import { TransactionService } from '../services/transaction.service';

@Component({
  selector: 'app-visualization',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  providers: [CurrencyPipe],
  template: `
    <h2 class="page-title">Overview</h2>
    <div *ngIf="showFilterBanner()" class="card status-banner status-info">
      <p class="filter-banner-title">Charts reflect active filters</p>
      <p *ngIf="filterSummary()" class="filter-banner-detail">{{ filterSummary() }}</p>
    </div>
    <div *ngIf="loadError()" class="card status-banner status-error">
      {{ loadError() }}
    </div>
    <div *ngIf="loading()" class="card empty-state">Loading overview…</div>
    <div class="charts-container" *ngIf="!loading()">
      <div class="chart-wrapper">
        <h3>Expense Distribution</h3>
        <canvas *ngIf="hasExpenseData()"
          baseChart
          [data]="pieChartData()"
          [type]="'pie'"
          [options]="pieChartOptions">
        </canvas>
        <div *ngIf="!hasExpenseData()" class="empty-state">
          No expense data yet. Add expense transactions in the Insert Data tab.
        </div>
      </div>
      
      <div class="chart-wrapper">
        <h3>Daily Income vs Expenses</h3>
        <canvas baseChart
          [data]="lineChartData()"
          [type]="'line'"
          [options]="lineChartOptions">
        </canvas>
      </div>
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
export class VisualizationComponent {
  activeFilter = this.transactionService.getActiveFilter();
  loading = this.transactionService.getLoading();
  loadError = this.transactionService.getLoadError();

  showFilterBanner = computed(() => this.activeFilter() !== null);

  filterSummary = computed(() => {
    const filter = this.activeFilter();
    return filter ? formatFilterSummary(filter) : '';
  });

  hasExpenseData = computed(() => {
    this.activeFilter();
    return Object.keys(this.transactionService.getCategoryTotals()).length > 0;
  });

  pieChartData = computed(() => {
    this.activeFilter();
    const categoryTotals = this.transactionService.getCategoryTotals();
    return {
      labels: Object.keys(categoryTotals),
      datasets: [{
        data: Object.values(categoryTotals),
        backgroundColor: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#1e40af']
      }]
    };
  });

  lineChartData = computed(() => {
    this.activeFilter();
    const dailyTotals = this.transactionService.getDailyTotals();
    return {
      labels: dailyTotals.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Income',
          data: dailyTotals.map(d => d.income),
          borderColor: '#059669',
          tension: 0.1,
          fill: false
        },
        {
          label: 'Expenses',
          data: dailyTotals.map(d => d.expense),
          borderColor: '#dc2626',
          tension: 0.1,
          fill: false
        }
      ]
    };
  });

  constructor(
    private transactionService: TransactionService,
    private currencyPipe: CurrencyPipe
  ) {}
  pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const
      },
      tooltip: {
        callbacks: {
          label: (context: { label?: string; parsed: number; dataset: { data: number[] } }) => {
            const value = context.parsed;
            const total = (context.dataset.data as number[]).reduce((sum, n) => sum + n, 0);
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            const formatted = this.currencyPipe.transform(value) ?? String(value);
            return `${formatted} (${percentage}%)`;
          }
        }
      }
    }
  };

  lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Amount ($)'
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          autoSkip: true
        },
        title: {
          display: true,
          text: 'Date'
        }
      }
    }
  };
}

function formatFilterSummary(filter: TransactionFilter): string {
  const parts: string[] = [];

  if (filter.startDate || filter.endDate) {
    const format = (date: string) =>
      new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    const start = filter.startDate ? format(filter.startDate) : 'any';
    const end = filter.endDate ? format(filter.endDate) : 'any';
    parts.push(`Date: ${start} – ${end}`);
  }

  if (filter.categories.length > 0) {
    parts.push(`Categories: ${filter.categories.join(', ')}`);
  }

  if (filter.type !== 'all') {
    const label = filter.type.charAt(0).toUpperCase() + filter.type.slice(1);
    parts.push(`Type: ${label}`);
  }

  return parts.join(' · ');
}
