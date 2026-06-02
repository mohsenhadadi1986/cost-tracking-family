import { Component, HostBinding, Input } from '@angular/core';

/** Logo lockup: full (mark + wordmark) or mark (icon only). */
export type AppLogoVariant = 'full' | 'mark';

/** Display size for the logo image. */
export type AppLogoSize = 'sm' | 'md' | 'lg';

const LOGO_ASSETS: Record<AppLogoVariant, string> = {
  full: '/assets/branding/logo.svg',
  mark: '/assets/branding/logo-mark.svg',
};

@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <img
      class="app-logo__image"
      [src]="logoSrc"
      [alt]="imgAlt"
      [class]="className || null"
      [attr.aria-hidden]="decorative ? 'true' : null" />
  `,
  styles: [`
    :host {
      display: inline-block;
      line-height: 0;
    }

    .app-logo__image {
      display: block;
      width: auto;
      height: auto;
      max-width: 100%;
    }

    :host(.app-logo--full.app-logo--sm) .app-logo__image {
      height: 20px;
    }

    :host(.app-logo--full.app-logo--md) .app-logo__image {
      height: 24px;
    }

    :host(.app-logo--full.app-logo--lg) .app-logo__image {
      height: 32px;
    }

    :host(.app-logo--mark.app-logo--sm) .app-logo__image {
      height: 20px;
      width: 20px;
    }

    :host(.app-logo--mark.app-logo--md) .app-logo__image {
      height: 24px;
      width: 24px;
    }

    :host(.app-logo--mark.app-logo--lg) .app-logo__image {
      height: 32px;
      width: 32px;
    }
  `]
})
export class AppLogoComponent {
  /** Logo lockup: full (mark + wordmark) or mark (icon only). */
  @Input() variant: AppLogoVariant = 'full';

  /** Display size for the logo image. */
  @Input() size: AppLogoSize = 'md';

  /** Accessible name when the logo is not decorative. */
  @Input() alt = 'Family Expenses';

  /**
   * Hides the image from assistive tech when adjacent visible text
   * already conveys the app name (e.g. mark beside a title).
   */
  @Input() decorative = false;

  /** Optional class names merged onto the logo image for layout hooks. */
  @Input() className = '';

  @HostBinding('class')
  get hostClasses(): string {
    return [
      'app-logo',
      `app-logo--${this.variant}`,
      `app-logo--${this.size}`,
    ].join(' ');
  }

  get logoSrc(): string {
    return LOGO_ASSETS[this.variant];
  }

  get imgAlt(): string {
    return this.decorative ? '' : this.alt;
  }
}
