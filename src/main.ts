import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableComponent } from './app/components/table.component';
import { VisualizationComponent } from './app/components/visualization.component';
import { ChartsComponent } from './app/components/charts.component';
import { InsertDataComponent } from './app/components/insert-data.component';
import { CategoriesComponent } from './app/components/categories.component';
import { SidebarComponent } from './app/components/sidebar.component';
import { ButtonComponent } from './app/components/ui/button.component';
import { GlyphComponent } from './app/components/ui/glyph.component';
import { ApiHealthService } from './app/services/api-health.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, TableComponent, VisualizationComponent, ChartsComponent, InsertDataComponent, CategoriesComponent, SidebarComponent, ButtonComponent, GlyphComponent],
  template: `
    <div class="container">
      <app-sidebar></app-sidebar>
      
      <div class="content">
        <nav class="tab-container" aria-label="Main">
          <app-button
            *ngFor="let tab of tabs"
            type="button"
            variant="ghost"
            size="md"
            [active]="activeTab === tab.id"
            [attr.aria-current]="activeTab === tab.id ? 'page' : null"
            (click)="activeTab = tab.id">
            <app-glyph set="tab" [name]="tab.id" size="sm"></app-glyph>
            <span class="tab-label tab-label--full">{{ tab.label }}</span>
            <span class="tab-label tab-label--short">{{ tab.shortLabel }}</span>
          </app-button>
        </nav>

        <div class="content-main" [class.content-main--table]="activeTab === 'Table'">
          <div [ngSwitch]="activeTab">
            <app-table *ngSwitchCase="'Table'"></app-table>
            <app-visualization *ngSwitchCase="'Visualization'"></app-visualization>
            <app-charts *ngSwitchCase="'Charts'"></app-charts>
            <app-insert-data *ngSwitchCase="'Insert Data'"></app-insert-data>
            <app-categories *ngSwitchCase="'Settings'"></app-categories>
          </div>
        </div>
      </div>
    </div>
  `
})
export class App implements OnInit {
  readonly tabs = [
    { id: 'Table', label: 'Table', shortLabel: 'Table' },
    { id: 'Visualization', label: 'Overview', shortLabel: 'Overview' },
    { id: 'Charts', label: 'Charts', shortLabel: 'Charts' },
    { id: 'Insert Data', label: 'Insert Data', shortLabel: 'Add' },
    { id: 'Settings', label: 'Settings', shortLabel: 'Settings' },
  ] as const;
  activeTab: 'Table' | 'Visualization' | 'Charts' | 'Insert Data' | 'Settings' = 'Table';

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
