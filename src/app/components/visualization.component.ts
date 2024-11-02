import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { TransactionService } from '../services/transaction.service';

@Component({
  selector: 'app-visualization',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  template: `
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
  `,
  styles: [`
    .charts-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 20px;
    }
    .chart-wrapper {
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h3 {
      text-align: center;
      margin-bottom: 15px;
    }
  `]
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
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
      }]
    };

    this.lineChartData = {
      labels: dailyTotals.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Income',
          data: dailyTotals.map(d => d.income),
          borderColor: '#4BC0C0',
          tension: 0.1,
          fill: false
        },
        {
          label: 'Expenses',
          data: dailyTotals.map(d => d.expense),
          borderColor: '#FF6384',
          tension: 0.1,
          fill: false
        }
      ]
    };
  }

  pieChartData: any = { labels: [], datasets: [{ data: [], backgroundColor: [] }] };
  pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    }
  };

  lineChartData: any = { labels: [], datasets: [] };
  lineChartOptions = {
    responsive: true,
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
        title: {
          display: true,
          text: 'Date'
        }
      }
    }
  };
}