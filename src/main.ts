import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableComponent } from './app/components/table.component';
import { VisualizationComponent } from './app/components/visualization.component';
import { InsertDataComponent } from './app/components/insert-data.component';
import { SidebarComponent } from './app/components/sidebar.component';
import { ButtonComponent } from './app/components/ui/button.component';
import { ApiHealthService } from './app/services/api-health.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, TableComponent, VisualizationComponent, InsertDataComponent, SidebarComponent, ButtonComponent],
  template: `
    <div class="container">
      <app-sidebar></app-sidebar>
      
      <div class="content">
        <div class="tab-container">
          <app-button
            *ngFor="let tab of tabs"
            type="button"
            variant="ghost"
            size="md"
            [active]="activeTab === tab"
            (click)="activeTab = tab">
            {{tab}}
          </app-button>
        </div>

        <div class="content-main" [class.content-main--table]="activeTab === 'Table'">
          <div [ngSwitch]="activeTab">
            <app-table *ngSwitchCase="'Table'"></app-table>
            <app-visualization *ngSwitchCase="'Visualization'"></app-visualization>
            <app-insert-data *ngSwitchCase="'Insert Data'"></app-insert-data>
          </div>
        </div>
      </div>
    </div>
  `
})
export class App implements OnInit {
  tabs = ['Table', 'Visualization', 'Insert Data'];
  activeTab = 'Table';

  private readonly apiHealth = inject(ApiHealthService);

  ngOnInit() {
    this.apiHealth.check().subscribe({
      next: (response) => console.log('[API proxy smoke test]', response),
      error: (error) => console.warn('[API proxy smoke test] failed', error),
    });
  }
}

bootstrapApplication(App, {
  providers: [provideHttpClient()],
});
