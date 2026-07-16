import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin, switchMap, tap, timer } from 'rxjs';
import { MessageService } from '../../core/services/message.service';
import { AuthService } from '../../core/services/auth.service';
import { Conversation, Message, MessagingUser } from '../../core/models';

@Component({
  selector: 'app-messaging',
  imports: [CommonModule, FormsModule],
  templateUrl: './messaging.component.html',
  styleUrl: './messaging.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagingComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  protected readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected messageText = signal<string>('');
  protected searchQuery = signal<string>('');
  protected showNewConversation = signal<boolean>(false);
  protected isSending = signal<boolean>(false);
  protected shouldScroll = false;

  //  Current user info
  protected readonly currentUser = computed(() => this.authService.currentUser());

  // Filtered conversations for search
  protected readonly filteredConversations = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.messageService
      .conversations()
      .filter(
        (c) =>
          !query ||
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(query) ||
          c.lastMessage.toLowerCase().includes(query),
      );
  });

  // Filtered users for new conversation
  protected readonly filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.messageService
      .users()
      .filter(
        (u) =>
          !query ||
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(query) ||
          u.role.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query),
      );
  });

  // Active conversation partner info
  protected readonly activePartnerInfo = computed(() => {
    const partnerId = this.messageService.activePartner();
    if (!partnerId) return null;
    return this.messageService.conversations().find((c) => c.userId === partnerId) ?? null;
  });

  ngOnInit(): void {
    this.loadData();
    // Poll for new messages every 10 seconds, tied to component lifecycle
    timer(10000, 10000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => this.refreshData()),
      )
      .subscribe();

    // Open conversation from route params if provided (e.g. /messages?userId=xxx)
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (params['userId']) {
        this.openConversation(params['userId']);
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.messageService.clearActiveConversation();
  }

  private loadData(): void {
    this.messageService.getConversations().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    this.messageService.getUsers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  private refreshData(): Observable<unknown> {
    const partnerId = this.messageService.activePartner();
    const requests: Observable<unknown>[] = [this.messageService.getConversations()];

    if (partnerId) {
      requests.push(
        this.messageService.getConversation(partnerId).pipe(
          tap(() => {
            this.shouldScroll = true;
          }),
        ),
      );
    }

    return forkJoin(requests);
  }

  protected openConversation(userId: string): void {
    this.showNewConversation.set(false);
    this.searchQuery.set('');
    this.messageService
      .getConversation(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.shouldScroll = true;
      });
  }

  protected sendMessage(): void {
    const content = this.messageText().trim();
    const partnerId = this.messageService.activePartner();
    if (!content || !partnerId || this.isSending()) return;

    this.isSending.set(true);
    this.messageService
      .sendMessage({ receiverId: partnerId, content })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageText.set('');
          this.isSending.set(false);
          this.shouldScroll = true;
        },
        error: () => {
          this.isSending.set(false);
        },
      });
  }

  protected startNewConversation(user: MessagingUser): void {
    // Check if conversation already exists
    const existing = this.messageService.conversations().find((c) => c.userId === user.id);
    if (existing) {
      this.openConversation(user.id);
      return;
    }
    // Otherwise, just set the active partner so user can type first message
    this.showNewConversation.set(false);
    this.messageService.clearActiveConversation();
    // Set partner as active (service trick: push a fake conversation entry so header shows)
    this.messageService
      .getConversation(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  protected isOwnMessage(message: Message): boolean {
    return message.senderId === this.currentUser()?.id;
  }

  protected formatTime(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days < 7)
      return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  protected getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      patient: 'Patient',
      doctor: 'Doctor',
      admin: 'Admin',
    };
    return labels[role] ?? role;
  }

  protected getRoleBadgeClass(role: string): string {
    const classes: Record<string, string> = {
      doctor: 'badge-doctor',
      patient: 'badge-patient',
      admin: 'badge-admin',
    };
    return classes[role] ?? '';
  }

  protected getInitials(firstName: string, lastName: string): string {
    return `${firstName?.charAt(0) ?? ''}${lastName?.charAt(0) ?? ''}`.toUpperCase();
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {
      /* scroll may fail if element is detached */
    }
  }

  protected trackByConversation(_: number, c: Conversation): string {
    return c.userId;
  }

  protected trackByMessage(_: number, m: Message): string {
    return m.id;
  }

  protected trackByUser(_: number, u: MessagingUser): string {
    return u.id;
  }
}
