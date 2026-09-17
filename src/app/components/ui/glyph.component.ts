import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlyphSet, glyphKey } from '../../utils/glyph';

@Component({
  selector: 'app-glyph',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="glyph" [class]="'glyph--' + set + ' glyph--' + size" [attr.data-icon]="key" aria-hidden="true">
      <ng-container [ngSwitch]="key">
        <svg *ngSwitchCase="'revolut'" viewBox="0 0 24 24" role="img">
          <rect width="24" height="24" rx="6" fill="#0666EB" />
          <path fill="#fff" d="M16.9 7.1c0-2.4-2-4.4-4.4-4.4H5.5v2.5h6.9c1.1 0 2 .9 2 1.9 0 1.1-.9 1.9-2 1.9H9.8c-.2 0-.3.1-.3.3v2.2l4.5 6.3h3.4l-4.6-6.4c2.3-.1 4.1-2.1 4.1-4.3zM8.4 6.5H5.5V18h2.9z"/>
        </svg>
        <svg *ngSwitchCase="'paypal'" viewBox="0 0 24 24" role="img">
          <rect width="24" height="24" rx="6" fill="#003087" />
          <path fill="#fff" d="M7.3 16.4H4.6a.36.36 0 0 1-.35-.41L6.1 4.37A.44.44 0 0 1 6.54 4h4.6c2.18 0 3.76 1.59 3.73 3.51a4.33 4.33 0 0 1-4.33 3.66H8.3a.44.44 0 0 0-.44.37l-.65 4.1-.01.06-.3 1.7zm8.15-8.33A4.95 4.95 0 0 1 10.54 12.3H8.74l-.64 4.06-.01.05-.44.27h-1.5l-.32 2.01a.36.36 0 0 0 .35.41h2.3c.22 0 .4-.16.44-.37l.61-3.85a.44.44 0 0 1 .44-.37h1.36a4.33 4.33 0 0 0 4.28-3.67c.2-1.24-.3-2.39-1.2-3.13z"/>
        </svg>
        <svg *ngSwitchCase="'ing'" viewBox="0 0 24 24" role="img">
          <rect width="24" height="24" rx="6" fill="#FF6200" />
          <path fill="#fff" d="M7.2 16.4c.4-2.4 1.8-4.4 4.3-5.4.4-1.3 1.5-2.3 2.8-2.5.1 1.2-.2 2.4-.9 3.3 1.4.6 2.4 1.8 2.6 3.3-.9.9-2.2 1.2-3.4.8-.6 1.3-1.8 2.2-3.3 2.3-1.4.1-2.3-.5-2.1-1.8z"/>
          <path fill="#FF6200" d="M11.4 12.2c.5.3 1.2.4 1.8.2-.2.7-.7 1.2-1.4 1.4-.4-.4-.5-1-.4-1.6z"/>
        </svg>
        <svg *ngSwitchCase="'satispay'" viewBox="0 0 24 24" role="img">
          <rect width="24" height="24" rx="6" fill="#FF2D55" />
          <path fill="#fff" d="M8.2 8.2c1.1-1.2 3.1-1.6 4.8-.9 1.4.6 2.1 1.8 2 3.1 0 1.6-1.3 2.4-2.8 2.9l-1.6.5c-.6.2-.9.5-.9.9 0 .6.6 1 1.6 1 1.2 0 2.1-.5 2.8-1.2l1.4 1.4c-1.1 1.1-2.7 1.8-4.4 1.8-2.6 0-4.2-1.4-4.2-3.4 0-1.6 1.1-2.5 2.8-3.1l1.7-.6c.6-.2.9-.5.9-.9 0-.5-.5-.9-1.4-.9-1 0-1.9.4-2.6 1.1L8.2 8.2z"/>
        </svg>
        <svg *ngSwitchCase="'post'" viewBox="0 0 24 24" role="img">
          <rect width="24" height="24" rx="6" fill="#FFCC00" />
          <path fill="#003399" d="M6 9.2h12v1.6H6zm0 4h12v1.6H6z"/>
          <path fill="#003399" d="M8.2 7.4 12 5.6l3.8 1.8v2.1L12 7.7 8.2 9.5z"/>
          <circle cx="12" cy="16.6" r="1.3" fill="#003399"/>
        </svg>
        <svg *ngSwitchCase="'cash'" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="24" height="24" rx="6" fill="#059669" stroke="none"/>
          <rect x="5" y="8" width="14" height="9" rx="1.5"/>
          <circle cx="12" cy="12.5" r="1.6"/>
          <path d="M7 8V7a1 1 0 0 1 1-1h8"/>
        </svg>
        <svg *ngSwitchCase="'card'" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="24" height="24" rx="6" fill="#334155" stroke="none"/>
          <rect x="5" y="7" width="14" height="10" rx="1.5"/>
          <path d="M5 11h14"/>
        </svg>
        <svg *ngSwitchCase="'wallet'" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="24" height="24" rx="6" fill="#64748b" stroke="none"/>
          <path d="M6 9.5h12v8H6z"/>
          <path d="M6 9.5 8.5 6h7L18 9.5"/>
          <circle cx="15.2" cy="13.5" r="0.8" fill="#fff" stroke="none"/>
        </svg>
        <svg *ngSwitchCase="'table'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18M3 12h18M3 18h18M8 6v12"/>
        </svg>
        <svg *ngSwitchCase="'chart'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
          <path d="M22 12A10 10 0 0 0 12 2v10z"/>
        </svg>
        <svg *ngSwitchCase="'plus'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 8v8M8 12h8"/>
        </svg>
        <svg *ngSwitchCase="'tags'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l8.58-8.58a1 1 0 0 0 0-1.42Z"/>
          <circle cx="7" cy="7" r="1.2"/>
        </svg>
        <svg *ngSwitchCase="'layout'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="8" height="8" rx="1.5"/>
          <rect x="13" y="3" width="8" height="8" rx="1.5"/>
          <rect x="3" y="13" width="8" height="8" rx="1.5"/>
          <rect x="13" y="13" width="8" height="8" rx="1.5"/>
        </svg>
        <svg *ngSwitchCase="'settings'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H8a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V8c.3.6.9 1 1.5 1H21a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z"/>
        </svg>
        <svg *ngSwitchCase="'food'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
          <path d="M7 2v20"/>
          <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
        </svg>
        <svg *ngSwitchCase="'baby'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="4"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
          <path d="M9 20h6"/>
          <path d="M12 16v4"/>
        </svg>
        <svg *ngSwitchCase="'wrench'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4L16 11l-3-3z"/>
        </svg>
        <svg *ngSwitchCase="'bus'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 6h16v10H4z"/>
          <path d="M6 16v2M18 16v2"/>
          <path d="M6 10h12"/>
          <circle cx="8" cy="13" r="0.8" fill="currentColor" stroke="none"/>
          <circle cx="16" cy="13" r="0.8" fill="currentColor" stroke="none"/>
        </svg>
        <svg *ngSwitchCase="'fuel'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 4h8v12H6z"/>
          <path d="M6 16v4h8"/>
          <path d="M14 8h2a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2"/>
        </svg>
        <svg *ngSwitchCase="'road'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19 8 5h8l4 14"/>
          <path d="M12 7v3M12 13v3"/>
        </svg>
        <svg *ngSwitchCase="'shield'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3 4 7v6c0 5 3.4 7.6 8 9 4.6-1.4 8-4 8-9V7z"/>
        </svg>
        <svg *ngSwitchCase="'wifi'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12.5a9 9 0 0 1 14 0"/>
          <path d="M8.5 16a5 5 0 0 1 7 0"/>
          <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>
        </svg>
        <svg *ngSwitchCase="'phone'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="8" y="3" width="8" height="18" rx="2"/>
          <path d="M11 18h2"/>
        </svg>
        <svg *ngSwitchCase="'flame'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3c2 4-2 5-1 9 3-2 6-1 6 4a5 5 0 0 1-10 0c0-4 3-6 5-13z"/>
        </svg>
        <svg *ngSwitchCase="'zap'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2 4 14h7l-1 8 9-12h-7z"/>
        </svg>
        <svg *ngSwitchCase="'droplet'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3s7 7.2 7 11.2A7 7 0 1 1 5 14.2C5 10.2 12 3 12 3z"/>
        </svg>
        <svg *ngSwitchCase="'building'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 21V7l8-4 8 4v14"/>
          <path d="M9 21v-6h6v6"/>
          <path d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01"/>
        </svg>
        <svg *ngSwitchCase="'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 11 12 4l9 7"/>
          <path d="M5 10v10h14V10"/>
        </svg>
        <svg *ngSwitchCase="'alert'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3 2 20h20z"/>
          <path d="M12 9v5M12 17h.01"/>
        </svg>
        <svg *ngSwitchCase="'film'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2"/>
          <path d="M7 5v14M17 5v14M3 10h4M3 14h4M17 10h4M17 14h4"/>
        </svg>
        <svg *ngSwitchCase="'banknote'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="6" width="18" height="12" rx="2"/>
          <circle cx="12" cy="12" r="2.4"/>
        </svg>
        <svg *ngSwitchCase="'trend'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 17 9 11l4 4 8-8"/>
          <path d="M14 7h7v7"/>
        </svg>
        <svg *ngSwitchDefault viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2H3v9l8.3 8.3a1 1 0 0 0 1.4 0L21 11.7a1 1 0 0 0 0-1.4Z"/>
          <circle cx="7.5" cy="7.5" r="1.2"/>
        </svg>
      </ng-container>
    </span>
  `,
  styles: [`
    :host {
      display: inline-flex;
      flex-shrink: 0;
      line-height: 0;
      color: inherit;
    }

    .glyph {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .glyph svg {
      display: block;
    }

    .glyph--sm svg {
      width: 16px;
      height: 16px;
    }

    .glyph--md svg {
      width: 20px;
      height: 20px;
    }

    .glyph--place svg,
    .glyph--tab.glyph--md svg {
      width: 20px;
      height: 20px;
    }
  `]
})
export class GlyphComponent {
  @Input() set: GlyphSet = 'category';
  @Input() name = '';
  @Input() size: 'sm' | 'md' = 'md';

  get key(): string {
    return glyphKey(this.set, this.name);
  }
}
