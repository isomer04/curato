import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { UserRole } from '../models';
import { environment } from '../../../environments/environment';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/admin/users`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUsers', () => {
    it('UserService — getUsers — with all filters — builds correct query params', () => {
      service
        .getUsers({ page: 2, limit: 20, role: UserRole.DOCTOR, isActive: true, search: 'Smith' })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url === apiUrl);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('20');
      expect(req.request.params.get('role')).toBe(UserRole.DOCTOR);
      expect(req.request.params.get('isActive')).toBe('true');
      expect(req.request.params.get('search')).toBe('Smith');
      req.flush({ success: true, data: [], metadata: { total: 0, page: 1, limit: 10, totalPages: 0 } });
    });

    it('UserService — getUsers — without optional filters — omits those params', () => {
      service.getUsers({ page: 1, limit: 10 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === apiUrl);
      expect(req.request.params.has('role')).toBeFalse();
      expect(req.request.params.has('search')).toBeFalse();
      expect(req.request.params.has('isActive')).toBeFalse();
      req.flush({ success: true, data: [], metadata: { total: 0, page: 1, limit: 10, totalPages: 0 } });
    });
  });

  describe('createUser', () => {
    it('UserService — createUser — happy path — sends POST with payload', () => {
      const payload = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@test.com',
        password: 'Secret123!',
        role: UserRole.PATIENT,
      };

      service.createUser(payload).subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ success: true, data: {} });
    });
  });

  describe('updateUser', () => {
    it('UserService — updateUser — happy path — sends PATCH to correct URL', () => {
      service.updateUser('user-1', { firstName: 'Updated' }).subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(`${apiUrl}/user-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ firstName: 'Updated' });
      req.flush({ success: true });
    });
  });

  describe('deleteUser', () => {
    it('UserService — deleteUser — happy path — sends DELETE request', () => {
      service.deleteUser('user-1').subscribe((res) => {
        expect(res.success).toBeTrue();
      });

      const req = httpMock.expectOne(`${apiUrl}/user-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });
  });

  describe('toggleUserStatus', () => {
    it('UserService — toggleUserStatus — activate — sends PATCH with isActive true', () => {
      service.toggleUserStatus('user-1', true).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ isActive: true });
      req.flush({ success: true });
    });

    it('UserService — toggleUserStatus — deactivate — sends PATCH with isActive false', () => {
      service.toggleUserStatus('user-1', false).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/user-1`);
      expect(req.request.body).toEqual({ isActive: false });
      req.flush({ success: true });
    });
  });
});
