import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UsersComponent } from './users.component';
import { UserService } from '../../../core/services/user.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserRole, User } from '../../../core/models';
import { of, throwError } from 'rxjs';

describe('UsersComponent', () => {
    let component: UsersComponent;
    let fixture: ComponentFixture<UsersComponent>;
    let mockUserService: jasmine.SpyObj<UserService>;
    let mockNotificationService: jasmine.SpyObj<NotificationService>;

    const mockUsers: User[] = [
        {
            id: '1', email: 'u1@test.com', role: UserRole.PATIENT,
            firstName: 'Alice', lastName: 'Smith',
            isActive: true, isEmailVerified: true,
            mfaEnabled: false,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        },
        {
            id: '2', email: 'u2@test.com', role: UserRole.DOCTOR,
            firstName: 'Bob', lastName: 'Jones',
            isActive: true, isEmailVerified: true,
            mfaEnabled: false,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        },
    ];

    beforeEach(async () => {
        mockUserService = jasmine.createSpyObj('UserService', ['getUsers', 'deleteUser', 'createUser', 'updateUser']);
        mockUserService.getUsers.and.returnValue(of({
            success: true,
            data: mockUsers,
            metadata: { total: 2, page: 1, limit: 10, totalPages: 1 }
        }));
        mockUserService.deleteUser.and.returnValue(of({ success: true }));
        mockUserService.createUser.and.returnValue(of({ success: true, data: {} }));
        mockUserService.updateUser.and.returnValue(of({ success: true }));

        mockNotificationService = jasmine.createSpyObj('NotificationService', ['success', 'error', 'info', 'warning']);

        await TestBed.configureTestingModule({
            imports: [UsersComponent],
            providers: [
                { provide: UserService, useValue: mockUserService },
                { provide: NotificationService, useValue: mockNotificationService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(UsersComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load users on init', () => {
        expect(mockUserService.getUsers).toHaveBeenCalled();
        expect(component.users().length).toBe(2);
        expect(component.totalUsers()).toBe(2);
    });

    it('UsersComponent — loadUsers — error — clears users and shows notification', fakeAsync(() => {
        mockUserService.getUsers.and.returnValue(throwError(() => new Error('Network')));
        component.loadUsers();
        tick();
        expect(component.users()).toEqual([]);
        expect(mockNotificationService.error).toHaveBeenCalled();
    }));

    describe('Filtering and Pagination', () => {
        it('should reload users when searching', () => {
            component.searchTerm = 'test';
            component.searchUsers();

            expect(component.currentPage).toBe(1);
            expect(mockUserService.getUsers).toHaveBeenCalledWith(jasmine.objectContaining({
                search: 'test'
            }));
        });

        it('should reload users when changing page', () => {
            component.changePage(2);
            expect(component.currentPage).toBe(2);
            expect(mockUserService.getUsers).toHaveBeenCalledWith(jasmine.objectContaining({
                page: 2
            }));
        });

        it('UsersComponent — changePage — page < 1 — does not change page', () => {
            component.changePage(0);
            expect(component.currentPage).toBe(1);
        });

        it('should reset filters', () => {
            component.searchTerm = 'something';
            component.selectedRole = UserRole.ADMIN;
            component.selectedStatus = 'active';
            component.resetFilters();

            expect(component.searchTerm).toBe('');
            expect(component.selectedRole).toBe('');
            expect(component.selectedStatus).toBe('');
            expect(component.currentPage).toBe(1);
            expect(mockUserService.getUsers).toHaveBeenCalled();
        });

        it('UsersComponent — loadUsers with status active — passes isActive true', () => {
            component.selectedStatus = 'active';
            component.loadUsers();
            expect(mockUserService.getUsers).toHaveBeenCalledWith(jasmine.objectContaining({ isActive: true }));
        });

        it('UsersComponent — loadUsers with status inactive — passes isActive false', () => {
            component.selectedStatus = 'inactive';
            component.loadUsers();
            expect(mockUserService.getUsers).toHaveBeenCalledWith(jasmine.objectContaining({ isActive: false }));
        });
    });

    describe('User Modal Actions', () => {
        it('should open edit modal with user data', () => {
            const user = mockUsers[0];
            component.editUser(user);

            expect(component.showEditModal()).toBeTrue();
            expect(component.editingUser.id).toBe(user.id);
            expect(component.editingUser.firstName).toBe(user.firstName);
        });

        it('UsersComponent — confirmDelete — sets editing user and opens delete modal', () => {
            component.confirmDelete(mockUsers[0]);
            expect(component.showDeleteModal()).toBeTrue();
            expect(component.editingUser.id).toBe('1');
        });

        it('UsersComponent — closeModals — resets all modals and editing user', () => {
            component.editUser(mockUsers[0]);
            component.closeModals();
            expect(component.showEditModal()).toBeFalse();
            expect(component.showAddModal()).toBeFalse();
            expect(component.showDeleteModal()).toBeFalse();
            expect(component.editingUser).toEqual({});
        });
    });

    describe('saveUser — edit mode', () => {
        beforeEach(() => {
            component.editUser(mockUsers[0]);
        });

        it('UsersComponent — saveUser — edit success — shows success and closes modal', fakeAsync(() => {
            component.saveUser();
            tick();
            expect(mockUserService.updateUser).toHaveBeenCalledWith('1', jasmine.objectContaining({ firstName: 'Alice' }));
            expect(mockNotificationService.success).toHaveBeenCalled();
            expect(component.showEditModal()).toBeFalse();
        }));

        it('UsersComponent — saveUser — missing firstName — shows validation error', () => {
            component.editingUser.firstName = '';
            component.saveUser();
            expect(mockNotificationService.error).toHaveBeenCalledWith('Validation', jasmine.any(String));
            expect(mockUserService.updateUser).not.toHaveBeenCalled();
        });

        it('UsersComponent — saveUser — missing email — shows validation error', () => {
            component.editingUser.email = '';
            component.saveUser();
            expect(mockNotificationService.error).toHaveBeenCalledWith('Validation', jasmine.any(String));
        });

        it('UsersComponent — saveUser — updateUser error — shows error notification', fakeAsync(() => {
            mockUserService.updateUser.and.returnValue(throwError(() => ({ error: { message: 'Failed' } })));
            component.saveUser();
            tick();
            expect(mockNotificationService.error).toHaveBeenCalledWith('Error', 'Failed');
        }));

        it('UsersComponent — saveUser — updateUser error without message — shows fallback error', fakeAsync(() => {
            mockUserService.updateUser.and.returnValue(throwError(() => ({ error: {} })));
            component.saveUser();
            tick();
            expect(mockNotificationService.error).toHaveBeenCalledWith('Error', 'Failed to update user');
        }));

        it('UsersComponent — saveUser — edit mode with missing id — does nothing', () => {
            component.editingUser.id = undefined;
            component.saveUser();
            expect(mockUserService.updateUser).not.toHaveBeenCalled();
        });
    });

    describe('saveUser — add mode', () => {
        beforeEach(() => {
            component.showAddModal.set(true);
            component.editingUser = {
                firstName: 'New',
                lastName: 'User',
                email: 'new@test.com',
                password: 'Password1!',
                role: UserRole.PATIENT,
            };
        });

        it('UsersComponent — saveUser — add mode success — creates user and reloads', fakeAsync(() => {
            component.saveUser();
            tick();
            expect(mockUserService.createUser).toHaveBeenCalled();
            expect(mockNotificationService.success).toHaveBeenCalled();
        }));

        it('UsersComponent — saveUser — missing password in add mode — shows validation error', () => {
            component.editingUser.password = '';
            component.saveUser();
            expect(mockNotificationService.error).toHaveBeenCalledWith('Validation', jasmine.any(String));
            expect(mockUserService.createUser).not.toHaveBeenCalled();
        });

        it('UsersComponent — saveUser — createUser error — shows error notification', fakeAsync(() => {
            mockUserService.createUser.and.returnValue(throwError(() => new Error('Create failed')));
            component.saveUser();
            tick();
            expect(mockNotificationService.error).toHaveBeenCalledWith('Error', jasmine.any(String));
        }));
    });

    describe('deleteUser', () => {
        it('should delete user and reload', fakeAsync(() => {
            component.editingUser.id = mockUsers[0].id;
            component.deleteUser();
            tick();

            expect(mockUserService.deleteUser).toHaveBeenCalledWith('1');
            expect(mockNotificationService.success).toHaveBeenCalled();
            expect(component.showDeleteModal()).toBeFalse();
        }));

        it('UsersComponent — deleteUser — no editing user id — does nothing', () => {
            component.editingUser = {};
            component.deleteUser();
            expect(mockUserService.deleteUser).not.toHaveBeenCalled();
        });

        it('UsersComponent — deleteUser — service error — shows error notification', fakeAsync(() => {
            component.editingUser.id = '1';
            mockUserService.deleteUser.and.returnValue(throwError(() => new Error('Delete failed')));
            component.deleteUser();
            tick();
            expect(mockNotificationService.error).toHaveBeenCalled();
        }));
    });
});


