import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ConfirmEmailChangeComponent } from './confirm-email-change.component';
import { AuthService } from '../../../core/services/auth.service';

describe('ConfirmEmailChangeComponent', () => {
  let component: ConfirmEmailChangeComponent;
  let fixture: ComponentFixture<ConfirmEmailChangeComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['confirmEmailChange', 'logout']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ConfirmEmailChangeComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: (key: string) => key === 'token' ? 'valid-token' : null }
            }
          }
        }
      ]
    }).compileComponents();
  });

  describe('Happy path', () => {
    beforeEach(() => {
      authServiceSpy.confirmEmailChange.and.returnValue(of({ success: true }));
      fixture = TestBed.createComponent(ConfirmEmailChangeComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create and verify token on init', () => {
      expect(component).toBeTruthy();
      expect(authServiceSpy.confirmEmailChange).toHaveBeenCalledWith('valid-token');
      expect(component.status()).toBe('success');
    });

    it('should navigate to login when goToLogin is called', () => {
      component.goToLogin();
      expect(authServiceSpy.logout).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('Error cases', () => {
    it('should handle API errors on init', () => {
      authServiceSpy.confirmEmailChange.and.returnValue(throwError(() => ({ error: { message: 'Token expired' } })));
      fixture = TestBed.createComponent(ConfirmEmailChangeComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.status()).toBe('error');
      expect(component.errorMessage()).toBe('Token expired');
    });

    it('should handle missing token on init', () => {
      TestBed.overrideProvider(ActivatedRoute, {
        useValue: {
          snapshot: {
            queryParamMap: { get: () => null }
          }
        }
      });

      fixture = TestBed.createComponent(ConfirmEmailChangeComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.status()).toBe('error');
      expect(component.errorMessage()).toBe('No confirmation token provided.');
      expect(authServiceSpy.confirmEmailChange).not.toHaveBeenCalled();
    });
  });
});
