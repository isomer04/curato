import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { NotificationService } from '../../../core/services/notification.service';
import { User, UserRole } from '../../../core/models';

@Component({
  selector: 'app-users',
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);

  users = signal<User[]>([]);
  totalUsers = signal(0);
  isLoading = signal(false);
  isSaving = signal(false);

  showAddModal = signal(false);
  showEditModal = signal(false);
  showDeleteModal = signal(false);

  searchTerm = '';
  selectedRole: UserRole | '' = '';
  selectedStatus = '';
  currentPage = 1;

  editingUser: Partial<User> & { password?: string } = {};

  private getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const nested = (error as { error?: { message?: unknown } }).error?.message;
      if (typeof nested === 'string' && nested.trim().length > 0) {
        return nested;
      }
    }

    return fallback;
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);

    this.userService
      .getUsers({
        page: this.currentPage,
        limit: 10,
        role: this.selectedRole || undefined,
        isActive:
          this.selectedStatus === 'active'
            ? true
            : this.selectedStatus === 'inactive'
              ? false
              : undefined,
        search: this.searchTerm || undefined,
      })
      .subscribe({
        next: (response) => {
          this.users.set(response.data || []);
          this.totalUsers.set(response.metadata?.total || 0);
          this.isLoading.set(false);
        },
        error: () => {
          this.users.set([]);
          this.totalUsers.set(0);
          this.isLoading.set(false);
          this.notificationService.error('Failed to load users', 'Please try again.');
        },
      });
  }

  searchUsers(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedRole = '';
    this.selectedStatus = '';
    this.currentPage = 1;
    this.loadUsers();
  }

  changePage(page: number): void {
    if (page >= 1) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  editUser(user: User): void {
    this.editingUser = { ...user };
    this.showEditModal.set(true);
  }

  confirmDelete(user: User): void {
    this.editingUser = { ...user };
    this.showDeleteModal.set(true);
  }

  closeModals(): void {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.showDeleteModal.set(false);
    this.editingUser = {};
  }

  saveUser(): void {
    if (
      !this.editingUser.firstName?.trim() ||
      !this.editingUser.lastName?.trim() ||
      !this.editingUser.email?.trim()
    ) {
      this.notificationService.error(
        'Validation',
        'First name, last name, and email are required.',
      );
      return;
    }

    this.isSaving.set(true);

    if (this.showEditModal()) {
      if (!this.editingUser.id) return;
      this.userService
        .updateUser(this.editingUser.id, {
          firstName: this.editingUser.firstName,
          lastName: this.editingUser.lastName,
          email: this.editingUser.email,
          role: this.editingUser.role,
        })
        .subscribe({
          next: () => {
            this.notificationService.success('Success', 'User updated successfully');
            this.isSaving.set(false);
            this.closeModals();
            this.loadUsers();
          },
          error: (error: unknown) => {
            this.notificationService.error(
              'Error',
              this.getErrorMessage(error, 'Failed to update user'),
            );
            this.isSaving.set(false);
          },
        });
    } else {
      if (!this.editingUser.password?.trim()) {
        this.notificationService.error('Validation', 'Password is required for new users.');
        this.isSaving.set(false);
        return;
      }
      this.userService
        .createUser({
          firstName: this.editingUser.firstName ?? '',
          lastName: this.editingUser.lastName ?? '',
          email: this.editingUser.email ?? '',
          password: this.editingUser.password ?? '',
          role: this.editingUser.role || UserRole.PATIENT,
        })
        .subscribe({
          next: () => {
            this.notificationService.success('Success', 'User created successfully');
            this.isSaving.set(false);
            this.closeModals();
            this.loadUsers();
          },
          error: (error: unknown) => {
            this.notificationService.error(
              'Error',
              this.getErrorMessage(error, 'Failed to create user'),
            );
            this.isSaving.set(false);
          },
        });
    }
  }

  deleteUser(): void {
    if (!this.editingUser.id) return;
    this.isSaving.set(true);
    this.userService.deleteUser(this.editingUser.id).subscribe({
      next: () => {
        this.notificationService.success('Success', 'User deleted successfully');
        this.isSaving.set(false);
        this.closeModals();
        this.loadUsers();
      },
      error: (error: unknown) => {
        this.notificationService.error(
          'Error',
          this.getErrorMessage(error, 'Failed to delete user'),
        );
        this.isSaving.set(false);
      },
    });
  }

  toggleUserStatus(user: User): void {
    const newStatus = !user.isActive;
    this.userService.toggleUserStatus(user.id, newStatus).subscribe({
      next: () => {
        const action = newStatus ? 'activated' : 'deactivated';
        this.notificationService.success('Success', `User ${action} successfully`);
        this.loadUsers();
      },
      error: (error: unknown) => {
        this.notificationService.error(
          'Error',
          this.getErrorMessage(error, 'Failed to update user status'),
        );
      },
    });
  }

  exportUsers(): void {
    const allUsers = this.users();
    if (allUsers.length === 0) {
      this.notificationService.warning('Export', 'No users to export.');
      return;
    }
    const headers = ['First Name', 'Last Name', 'Email', 'Role', 'Status', 'Created'];
    const rows = allUsers.map((u) => [
      u.firstName,
      u.lastName,
      u.email,
      u.role,
      u.isActive ? 'Active' : 'Inactive',
      new Date(u.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.notificationService.success('Export', 'Users exported successfully.');
  }

  getRoleColorClass(role: UserRole): string {
    const classes: Record<UserRole, string> = {
      [UserRole.PATIENT]: 'bg-info-subtle text-info',
      [UserRole.DOCTOR]: 'bg-success-subtle text-success',
      [UserRole.ADMIN]: 'bg-primary-subtle text-primary',
    };
    return classes[role] || 'bg-secondary-subtle text-secondary';
  }

  getRoleBadgeClass(role: UserRole): string {
    const classes: Record<UserRole, string> = {
      [UserRole.PATIENT]: 'bg-info',
      [UserRole.DOCTOR]: 'bg-success',
      [UserRole.ADMIN]: 'bg-primary',
    };
    return classes[role] || 'bg-secondary';
  }
}
