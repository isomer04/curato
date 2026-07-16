/**
 * NavbarComponent Unit Tests
 *
 * Tests for the main navigation component.
 * Covers:
 * - Component creation
 * - Role-based navigation display
 * - User authentication state handling
 * - Menu toggle functionality
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavbarComponent } from './navbar.component';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MessageService } from '../../../core/services/message.service';
import { signal, WritableSignal } from '@angular/core';
import { UserRole } from '../../../core/models';
import { of } from 'rxjs';

describe('NavbarComponent', () => {
    let component: NavbarComponent;
    let fixture: ComponentFixture<NavbarComponent>;

    // Use writable signals so tests can push new values in-place
    let currentUserSignal: WritableSignal<{ id: string; role: UserRole; firstName: string; lastName?: string } | null>;
    let isAuthenticatedSignal: WritableSignal<boolean>;

    let mockAuthService: jasmine.SpyObj<AuthService>;
    let mockMessageService: jasmine.SpyObj<MessageService>;

    beforeEach(async () => {
        currentUserSignal = signal<{ id: string; role: UserRole; firstName: string; lastName?: string } | null>(null);
        isAuthenticatedSignal = signal(false);

        mockAuthService = jasmine.createSpyObj('AuthService', ['logout'], {
            isAuthenticated: isAuthenticatedSignal,
            currentUser: currentUserSignal,
        });

        mockMessageService = jasmine.createSpyObj('MessageService', ['getUnreadCount'], {
            unreadCount: signal(0),
        });
        mockMessageService.getUnreadCount.and.returnValue(
            of({ success: true, data: { unreadCount: 0 } })
        );

        await TestBed.configureTestingModule({
            imports: [NavbarComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: mockAuthService },
                { provide: MessageService, useValue: mockMessageService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(NavbarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('when user is not authenticated', () => {
        it('should display login and register links', () => {
            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('[routerLink="/auth/login"]')).toBeTruthy();
            expect(compiled.querySelector('[routerLink="/auth/register"]')).toBeTruthy();
        });

        it('should not display user dropdown', () => {
            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('#userDropdown')).toBeFalsy();
        });
    });

    describe('role-based navigation', () => {
        it('should display patient navigation items', () => {
            isAuthenticatedSignal.set(true);
            currentUserSignal.set({ id: '1', role: UserRole.PATIENT, firstName: 'P' });
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('[href="/patient/dashboard"]')).toBeTruthy();
        });

        it('should display doctor navigation items', () => {
            isAuthenticatedSignal.set(true);
            currentUserSignal.set({ id: '2', role: UserRole.DOCTOR, firstName: 'D' });
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('[href="/doctor/dashboard"]')).toBeTruthy();
            expect(compiled.querySelector('[href="/doctor/schedule"]')).toBeTruthy();
        });

        it('should display admin navigation items', () => {
            isAuthenticatedSignal.set(true);
            currentUserSignal.set({ id: '3', role: UserRole.ADMIN, firstName: 'A' });
            fixture.detectChanges();

            const compiled = fixture.nativeElement as HTMLElement;
            expect(compiled.querySelector('[href="/admin/dashboard"]')).toBeTruthy();
            expect(compiled.querySelector('[href="/admin/users"]')).toBeTruthy();
        });
    });

    describe('user dropdown', () => {
        it('should display correct initials', () => {
            isAuthenticatedSignal.set(true);
            currentUserSignal.set({
                id: '1', role: UserRole.PATIENT, firstName: 'John', lastName: 'Doe'
            });
            fixture.detectChanges();

            expect(component['userInitials']).toBe('JD');
        });
    });

    describe('menu toggle', () => {
        it('should toggle menu collapsed state', () => {
            expect(component['isMenuCollapsed']()).toBeTrue();

            component['toggleMenu']();
            expect(component['isMenuCollapsed']()).toBeFalse();

            component['toggleMenu']();
            expect(component['isMenuCollapsed']()).toBeTrue();
        });
    });

    describe('logout', () => {
        it('should call AuthService logout', () => {
            component['logout']();
            expect(mockAuthService.logout).toHaveBeenCalled();
        });
    });
});
