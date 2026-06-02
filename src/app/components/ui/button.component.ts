import { Component, HostBinding, Input } from '@angular/core';

/** Visual style: primary (filled), secondary (outline), ghost (text). */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

/** Control size: sm, md (default), lg. */
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Native button type attribute. */
export type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button
      [attr.type]="type"
      [disabled]="disabled"
      [class]="buttonClasses">
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    :host(.btn-host--full-width) {
      display: block;
      width: 100%;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      border-radius: 6px;
      font-family: inherit;
      font-weight: 500;
      line-height: 1.5;
      cursor: pointer;
      transition: background-color 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s;
    }

    .btn--sm {
      padding: 8px 14px;
      font-size: 0.875rem;
    }

    .btn--md {
      padding: 10px 18px;
      font-size: 0.9375rem;
    }

    .btn--lg {
      padding: 12px 22px;
      font-size: 1rem;
    }

    .btn--primary {
      background-color: var(--color-primary);
      color: white;
      border: 1px solid var(--color-primary);
    }

    .btn--primary:hover:not(:disabled) {
      background-color: var(--color-primary-hover);
      border-color: var(--color-primary-hover);
    }

    .btn--primary:disabled:hover {
      background-color: var(--color-primary);
      border-color: var(--color-primary);
    }

    .btn--secondary {
      background-color: transparent;
      color: var(--color-primary);
      border: 1px solid var(--color-primary);
    }

    .btn--secondary:hover:not(:disabled) {
      background-color: var(--color-primary-light);
    }

    .btn--secondary:disabled:hover {
      background-color: transparent;
    }

    .btn--ghost {
      background-color: transparent;
      color: var(--color-muted);
      border: 1px solid transparent;
    }

    .btn--ghost:hover:not(:disabled) {
      background-color: var(--color-bg);
      color: var(--color-text);
    }

    .btn--ghost.btn--active {
      background-color: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }

    .btn--ghost.btn--active:hover:not(:disabled) {
      background-color: var(--color-primary-hover);
      border-color: var(--color-primary-hover);
      color: white;
    }

    .btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn--full-width {
      width: 100%;
    }

    .btn:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    @media (max-width: 768px) {
      .btn--md,
      .btn--lg {
        min-height: 44px;
      }
    }
  `]
})
export class ButtonComponent {
  /** Visual style: primary (filled), secondary (outline), ghost (text). */
  @Input() variant: ButtonVariant = 'primary';

  /** Native button type attribute. */
  @Input() type: ButtonType = 'button';

  /** Disables interaction and dims the control. */
  @Input() disabled = false;

  /** Stretches the button to the full width of its container. */
  @Input() fullWidth = false;

  /** Control size: sm, md (default), lg. */
  @Input() size: ButtonSize = 'md';

  /** Highlights ghost buttons (e.g. active tab). */
  @Input() active = false;

  @HostBinding('class.btn-host--full-width')
  get hostFullWidth(): boolean {
    return this.fullWidth;
  }

  get buttonClasses(): string {
    return [
      'btn',
      `btn--${this.variant}`,
      `btn--${this.size}`,
      this.active ? 'btn--active' : '',
      this.fullWidth ? 'btn--full-width' : ''
    ].filter(Boolean).join(' ');
  }
}
