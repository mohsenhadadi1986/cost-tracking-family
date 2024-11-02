import { bootstrapApplication } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableComponent } from './app/components/table.component';
import { VisualizationComponent } from './app/components/visualization.component';
import { InsertDataComponent } from './app/components/insert-data.component';
import { SidebarComponent } from './app/components/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, TableComponent, VisualizationComponent, InsertDataComponent, SidebarComponent],
  template: `
    <div class="container">
      <app-sidebar></app-sidebar>
      
      <div class="content">
        <div class="tab-container">
          <button 
            *ngFor="let tab of tabs" 
            (click)="activeTab = tab"
            [class.active]="activeTab === tab"
            class="tab-button">
            {{tab}}
          </button>
        </div>

        <div [ngSwitch]="activeTab">
          <app-table *ngSwitchCase="'Table'"></app-table>
          <app-visualization *ngSwitchCase="'Visualization'"></app-visualization>
          <app-insert-data *ngSwitchCase="'Insert Data'"></app-insert-data>
        </div>
      </div>
    </div>
  `
})
export class App {
  tabs = ['Table', 'Visualization', 'Insert Data'];
  activeTab = 'Table';
}

bootstrapApplication(App, {
  providers: []
});