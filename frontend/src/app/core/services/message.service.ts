import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    Message,
    Conversation,
    SendMessageData,
    ConversationResponse,
    ConversationListResponse,
    SendMessageResponse,
    MessagingUser,
    UsersListResponse,
    UnreadCountResponse,
} from '../models';

@Injectable({
    providedIn: 'root',
})
export class MessageService {
    private http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/messages`;

    // Signals for state management
    private conversationsSignal = signal<Conversation[]>([]);
    private activeConversationSignal = signal<Message[]>([]);
    private activePartnerSignal = signal<string | null>(null);
    private usersSignal = signal<MessagingUser[]>([]);
    private unreadCountSignal = signal<number>(0);
    private isLoadingSignal = signal<boolean>(false);

    // Public readonly signals
    readonly conversations = computed(() => this.conversationsSignal());
    readonly activeConversation = computed(() => this.activeConversationSignal());
    readonly activePartner = computed(() => this.activePartnerSignal());
    readonly users = computed(() => this.usersSignal());
    readonly unreadCount = computed(() => this.unreadCountSignal());
    readonly isLoading = computed(() => this.isLoadingSignal());

    /**
     * Load all conversation threads (inbox)
     */
    getConversations(): Observable<ConversationListResponse> {
        this.isLoadingSignal.set(true);
        return this.http.get<ConversationListResponse>(`${this.apiUrl}/conversations`).pipe(
            tap((response) => {
                this.conversationsSignal.set(response.data.conversations);
                this.isLoadingSignal.set(false);
            })
        );
    }

    /**
     * Load conversation with a specific user
     */
    getConversation(userId: string, page = 1, limit = 50): Observable<ConversationResponse> {
        return this.http
            .get<ConversationResponse>(`${this.apiUrl}/conversations/${userId}`, {
                params: { page: page.toString(), limit: limit.toString() },
            })
            .pipe(
                tap((response) => {
                    this.activeConversationSignal.set(response.data);
                    this.activePartnerSignal.set(userId);

                    // Reduce unread count for messages from this partner
                    const conversations = this.conversationsSignal();
                    const updatedConversations = conversations.map((c) =>
                        c.userId === userId ? { ...c, unreadCount: 0 } : c
                    );
                    this.conversationsSignal.set(updatedConversations);

                    // Recalculate total unread
                    const total = updatedConversations.reduce(
                        (sum, c) => sum + c.unreadCount,
                        0
                    );
                    this.unreadCountSignal.set(total);
                })
            );
    }

    /**
     * Send a message
     */
    sendMessage(data: SendMessageData): Observable<SendMessageResponse> {
        return this.http.post<SendMessageResponse>(this.apiUrl, data).pipe(
            tap((response) => {
                const newMsg = response.data.message;

                // Append to active conversation
                const current = this.activeConversationSignal();
                this.activeConversationSignal.set([...current, newMsg]);

                // Update conversation list
                const conversations = this.conversationsSignal();
                const idx = conversations.findIndex((c) => c.userId === data.receiverId);
                if (idx !== -1) {
                    const updated = [...conversations];
                    updated[idx] = {
                        ...updated[idx],
                        lastMessage: data.content,
                        lastMessageAt: new Date(),
                    };
                    this.conversationsSignal.set(updated);
                }
            })
        );
    }

    /**
     * Get users available to message
     */
    getUsers(): Observable<UsersListResponse> {
        return this.http.get<UsersListResponse>(`${this.apiUrl}/users`).pipe(
            tap((response) => {
                this.usersSignal.set(response.data.users);
            })
        );
    }

    /**
     * Get unread message count
     */
    getUnreadCount(): Observable<UnreadCountResponse> {
        return this.http.get<UnreadCountResponse>(`${this.apiUrl}/unread-count`).pipe(
            tap((response) => {
                this.unreadCountSignal.set(response.data.unreadCount);
            })
        );
    }

    /**
     * Mark messages from a sender as read
     */
    markAsRead(senderId: string): Observable<unknown> {
        return this.http.patch(`${this.apiUrl}/read/${senderId}`, {});
    }

    /**
     * Clear active conversation
     */
    clearActiveConversation(): void {
        this.activeConversationSignal.set([]);
        this.activePartnerSignal.set(null);
    }
}
