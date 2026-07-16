/**
 * FooterComponent Unit Tests
 * 
 * Tests for the footer component.
 * Covers:
 * - Component creation
 * - Link group rendering
 * - Contact info display
 * - Copyright year
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
    let component: FooterComponent;
    let fixture: ComponentFixture<FooterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FooterComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(FooterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display the app name', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain(component['appName']);
    });

    it('should display current year in copyright', () => {
        const currentYear = new Date().getFullYear();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain(currentYear.toString());
    });

    it('should render all link groups', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        const headings = compiled.querySelectorAll('.footer-heading');
        expect(headings.length).toBe(component['linkGroups'].length);
    });

    it('should render social links', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        const socialLinks = compiled.querySelectorAll('.social-link');
        expect(socialLinks.length).toBe(component['socialLinks'].length);
    });

    it('should display contact email', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain(component['contactInfo'].email);
    });

    it('should display contact phone', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.textContent).toContain(component['contactInfo'].phone);
    });

    it('should have external links with proper attributes', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        const externalLinks = compiled.querySelectorAll('.social-link');

        externalLinks.forEach(link => {
            expect(link.getAttribute('target')).toBe('_blank');
            expect(link.getAttribute('rel')).toContain('noopener');
        });
    });
});
