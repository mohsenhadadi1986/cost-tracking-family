import { Component, computed } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { FilterBannerComponent } from './filter-banner.component';
import { ButtonComponent } from './ui/button.component';
import { TransactionService } from '../services/transaction.service';
import { colorsForCategories } from '../utils/category-color';
import { hasCustomSidebarDates, OverviewInterval } from '../utils/overview-interval';

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [CommonModule, NgChartsModule, FilterBannerComponent, ButtonComponent],
  providers: [CurrencyPipe],
  template: `
    <h2 class="page-title">Charts</h2>
    <app-filter-banner title="Charts reflect active filters" />
    <div *ngIf="loadError()" class="card status-banner status-error">
      {{ loadError() }}
    </div>
    <div *ngIf="loading()" class="card empty-state">Loading charts…</div>
    <ng-container *ngIf="!loading() && !loadError()">
      <div class="overview-interval">
        <p class="overview-interval__label">Time range</p>
        <div class="overview-interval__chips" role="group" aria-label="Chart time range">
          <app-button
            *ngFor="let option of intervals"
            type="button"
            size="sm"
            [variant]="interval() === option.id ? 'primary' : 'secondary'"
            [disabled]="usesSidebarDates()"
            (click)="setInterval(option.id)">
            {{ option.label }}
          </app-button>
        </div>
        <p *ngIf="usesSidebarDates()" class="overview-interval__hint">
          Using the sidebar date range. Clear filters to switch Week / Month / Year.
        </p>
      </div>

      <div class="charts-container">
        <div class="chart-wrapper">
          <h3>Expense Distribution</h3>
          <canvas *ngIf="hasExpenseData()"
            baseChart
            [data]="doughnutChartData()"
            [type]="'doughnut'"
            [options]="doughnutChartOptions">
          </canvas>
          <div *ngIf="!hasExpenseData()" class="empty-state">
            No expense data yet. Add expense transactions in the Insert Data tab.
          </div>
        </div>

        <div class="chart-wrapper">
          <h3>Income vs Expenses</h3>
          <canvas *ngIf="lineChartData().labels.length > 0"
            baseChart
            [data]="lineChartData()"
            [type]="'line'"
            [options]="lineChartOptions">
          </canvas>
          <div *ngIf="lineChartData().labels.length === 0" class="empty-state">
            No activity in this range yet.
          </div>
        </div>
      </div>
    </ng-container>
  `
})
export class ChartsComponent {
  readonly intervals: Array<{ id: OverviewInterval; label: string }> = [
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ];

  activeFilter = this.transactionService.getActiveFilter();
  interval = this.transactionService.getOverviewInterval();
  summary = this.transactionService.getSummary();
  loading = this.transactionService.getLoading();
  loadError = this.transactionService.getLoadError();

  usesSidebarDates = computed(() => hasCustomSidebarDates(this.activeFilter()));

  hasExpenseData = computed(() => Object.keys(this.summary().categoryTotals).length > 0);

  doughnutChartData = computed(() => {
    const categoryTotals = this.summary().categoryTotals;
    const labels = Object.keys(categoryTotals);
    return {
      labels,
      datasets: [{
        data: Object.values(categoryTotals),
        backgroundColor: colorsForCategories(labels),
        borderWidth: 2,
        borderColor: '#ffffff',
      }]
    };
  });

  lineChartData = computed(() => {
    const dailyTotals = this.summary().dailyTotals;
    return {
      labels: dailyTotals.map(entry => this.formatBucketLabel(entry.date, dailyTotals.length > 0 && dailyTotals.every(item => item.date.endsWith('-01')))),
      datasets: [
        {
          label: 'Income',
          data: dailyTotals.map(entry => entry.income),
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.12)',
          tension: 0.2,
          fill: false
        },
        {
          label: 'Expenses',
          data: dailyTotals.map(entry => entry.expense),
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220, 38, 38, 0.12)',
          tension: 0.2,
          fill: false
        }
      ]
    };
  });

  doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          generateLabels: chart => {
            const dataset = chart.data.datasets[0];
            const values = (dataset.data as number[]) ?? [];
            const total = values.reduce((sum, value) => sum + value, 0);
            const colors = dataset.backgroundColor as string[];

            return (chart.data.labels ?? []).map((label, index) => {
              const value = values[index] ?? 0;
              const percent = total > 0 ? Math.round((value / total) * 100) : 0;
              const formatted = this.currencyPipe.transform(value) ?? String(value);
              return {
                text: `${label}: ${formatted} (${percent}%)`,
                fillStyle: colors[index],
                strokeStyle: colors[index],
                hidden: false,
                index,
              };
            });
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = Number(context.parsed);
            const total = (context.dataset.data as number[]).reduce((sum, n) => sum + Number(n), 0);
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            const formatted = this.currencyPipe.transform(value) ?? String(value);
            return `${formatted} (${percentage}%)`;
          }
        }
      }
    }
  };

  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Amount'
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

  constructor(
    private transactionService: TransactionService,
    private currencyPipe: CurrencyPipe
  ) {}

  setInterval(interval: OverviewInterval) {
    if (this.usesSidebarDates()) {
      return;
    }

    this.transactionService.setOverviewInterval(interval);
  }

  private formatBucketLabel(date: string, monthly: boolean): string {
    const parsed = new Date(`${date}T00:00:00`);
    if (monthly) {
      return parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
