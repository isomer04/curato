/**
 * LoadingSpinnerComponent Unit Tests
 * 
 * Tests for the loading spinner component.
 * Covers:
 * - Component creation
 * - Size variations
 * - Overlay mode
 * - Message display
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingSpinnerComponent } from './loading-spinner.component';

describe('LoadingSpinnerComponent', () => {
    let component: LoadingSpinnerComponent;
    let fixture: ComponentFixture<LoadingSpinnerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LoadingSpinnerComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(LoadingSpinnerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('size input', () => {
        it('should default to medium size', () => {
            expect(component.size()).toBe('medium');
        });

        it('should return empty class for medium size', () => {
            fixture.componentRef.setInput('size', 'medium');
            fixture.detectChanges();
            expect(component['sizeClass']).toBe('');
        });

        it('should return sm class for small size', () => {
            fixture.componentRef.setInput('size', 'small');
            fixture.detectChanges();
            expect(component['sizeClass']).toBe('spinner-border-sm');
        });

        it('should return lg class for large size', () => {
            fixture.componentRef.setInput('size', 'large');
            fixture.detectChanges();
            expect(component['sizeClass']).toBe('spinner-lg');
        });

        it('should apply inline dimensions for large size', () => {
            fixture.componentRef.setInput('size', 'large');
            fixture.detectChanges();
            const spinner = (fixture.nativeElement as HTMLElement).querySelector(
                '.spinner-border'
            ) as HTMLElement | null;
            expect(spinner).toBeTruthy();
            expect(spinner!.style.width).toBe('3rem');
            expect(spinner!.style.height).toBe('3rem');
        });
    });

    describe('overlay mode', () => {
        it('should default to no overlay', () => {
            expect(component.overlay()).toBeFalse();
        });

        it('should render overlay when enabled', () => {
            fixture.componentRef.setInput('overlay', true);
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('.spinner-overlay')).toBeTruthy();
        });

        it('should render inline when overlay is disabled', () => {
            fixture.componentRef.setInput('overlay', false);
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('.spinner-inline')).toBeTruthy();
        });
    });

    describe('message display', () => {
        it('should not display message by default', () => {
            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('.spinner-message')).toBeFalsy();
        });

        it('should display message when provided', () => {
            fixture.componentRef.setInput('message', 'Loading data...');
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            const messageElement = compiled.querySelector('.spinner-message');
            expect(messageElement).toBeTruthy();
            expect(messageElement?.textContent).toContain('Loading data...');
        });
    });

    describe('accessibility', () => {
        it('should have role="status"', () => {
            const compiled = fixture.nativeElement as HTMLElement;
            const statusElement = compiled.querySelector('[role="status"]');
            expect(statusElement).toBeTruthy();
        });

        it('should have aria-live attribute', () => {
            const compiled = fixture.nativeElement as HTMLElement;
            const liveElement = compiled.querySelector('[aria-live]');
            expect(liveElement).toBeTruthy();
        });

        it('should have visually-hidden loading text', () => {
            const compiled = fixture.nativeElement as HTMLElement;
            const hiddenText = compiled.querySelector('.visually-hidden');
            expect(hiddenText?.textContent).toContain('Loading');
        });
    });
});
