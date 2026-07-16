/**
 * LoadingSpinnerComponent
 * 
 * A reusable loading indicator component that can be used throughout the application.
 * 
 * Features:
 * - Configurable size (small, medium, large)
 * - Optional overlay mode for blocking UI interactions
 * - Optional loading message
 * - Accessible with proper ARIA attributes
 * 
 * Usage:
 * ```html
 * <!-- Basic spinner -->
 * <app-loading-spinner />
 * 
 * <!-- Full-page overlay with message -->
 * <app-loading-spinner [overlay]="true" message="Loading data..." />
 * 
 * <!-- Small inline spinner -->
 * <app-loading-spinner size="small" />
 * ```
 */
import { Component, ChangeDetectionStrategy, input, type InputSignal } from '@angular/core';

/**
 * Available spinner sizes.
 * - small: 1rem - for inline indicators
 * - medium: 2rem - default size
 * - large: 3rem - for page-level loading
 */
type SpinnerSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'app-loading-spinner',
  imports: [],
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinnerComponent {
  /**
   * Size of the spinner.
   * Affects the visual size of the loading indicator.
   * @default 'medium'
   */
  readonly size: InputSignal<SpinnerSize> = input<SpinnerSize>('medium');

  /**
   * Whether to display the spinner with a full-screen overlay.
   * When true, blocks user interaction with the underlying content.
   * @default false
   */
  readonly overlay: InputSignal<boolean> = input(false);

  /**
   * Optional message to display below the spinner.
   * Useful for providing context about what is loading.
   */
  readonly message: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * CSS class to apply for the spinner size.
   * Maps the size input to the appropriate Bootstrap class.
   */
  protected get sizeClass(): string {
    const sizeClasses: Record<SpinnerSize, string> = {
      small: 'spinner-border-sm',
      medium: '',
      large: 'spinner-lg',
    };
    return sizeClasses[this.size()];
  }

}
