import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { TransactionService } from '../services/transaction.service';

@Component({
  selector: 'app-visualization',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  template: `
    <h2 class="page-title">Overview</h2>
    <div class="charts-container">
      <div class="chart-wrapper">
        <h3>Expense Distribution</h3>
        <canvas baseChart
          [data]="pieChartData"
          [type]="'pie'"
          [options]="pieChartOptions">
        </canvas>
      </div>
      
      <div class="chart-wrapper">
        <h3>Daily Income vs Expenses</h3>
        <canvas baseChart
          [data]="lineChartData"
          [type]="'line'"
          [options]="lineChartOptions">
        </canvas>
      </div>
    </div>
  `
})
export class VisualizationComponent implements OnInit {
  constructor(private transactionService: TransactionService) {}

  ngOnInit() {
    this.updateCharts();
  }

  updateCharts() {
    const categoryTotals = this.transactionService.getCategoryTotals();
    const dailyTotals = this.transactionService.getDailyTotals();

    this.pieChartData = {
      labels: Object.keys(categoryTotals),
      datasets: [{
        data: Object.values(categoryTotals),
        backgroundColor: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#1e40af']
      }]
    };

    this.lineChartData = {
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
  }

  pieChartData: any = { labels: [], datasets: [{ data: [], backgroundColor: [] }] };
  pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    }
  };

  lineChartData: any = { labels: [], datasets: [] };
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
