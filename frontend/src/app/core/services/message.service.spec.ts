import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MessageService } from './message.service';
import { Message, Conversation, UserRole } from '../models';
import { environment } from '../../../environments/environment';

describe('MessageService', () => {
  let service: MessageService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/messages`;

  const makeMessage = (id: string, senderId = 'u1'): Message => ({
    id,
    senderId,
    receiverId: 'u2',
    content: 'Hello',
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const makeConversation = (userId: string): Conversation => ({
    userId,
    firstName: 'Alice',
    lastName: 'Smith',
    role: UserRole.PATIENT,
    lastMessage: 'Hi',
    lastMessageAt: new Date(),
    unreadCount: 3,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MessageService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MessageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial signal state', () => {
    it('MessageService — initial state — conversations is empty', () => {
      expect(service.conversations()).toEqual([]);
    });

    it('MessageService — initial state — activeConversation is empty', () => {
      expect(service.activeConversation()).toEqual([]);
    });

    it('MessageService — initial state — activePartner is null', () => {
      expect(service.activePartner()).toBeNull();
    });

    it('MessageService — initial state — unreadCount is zero', () => {
      expect(service.unreadCount()).toBe(0);
    });
  });

  describe('getConversations', () => {
    it('MessageService — getConversations — happy path — populates conversations and clears loading', () => {
      const convos = [makeConversation('u1'), makeConversation('u2')];

      service.getConversations().subscribe();

      expect(service.isLoading()).toBeTrue();

      const req = httpMock.expectOne(`${apiUrl}/conversations`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: { conversations: convos } });

      expect(service.conversations()).toEqual(convos);
      expect(service.isLoading()).toBeFalse();
    });

    it('MessageService — getConversations — empty inbox — sets empty array', () => {
      service.getConversations().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/conversations`);
      req.flush({ success: true, data: { conversations: [] } });

      expect(service.conversations()).toEqual([]);
    });
  });

  describe('getConversation', () => {
    it('MessageService — getConversation — happy path — sets active conversation and partner', () => {
      const messages = [makeMessage('m1'), makeMessage('m2')];

      service.getConversation('u2').subscribe();

      const req = httpMock.expectOne((r) => r.url === `${apiUrl}/conversations/u2`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('50');
      req.flush({
        success: true,
        data: messages,
        metadata: { page: 1, limit: 50, total: 2, totalPages: 1 },
      });

      expect(service.activeConversation()).toEqual(messages);
      expect(service.activePartner()).toBe('u2');
    });

    it('MessageService — getConversation — resets unread count for that partner', () => {
      const convos = [makeConversation('u2'), makeConversation('u3')];
      (service as unknown as { conversationsSignal: { set: (v: Conversation[]) => void } }).conversationsSignal.set(convos);
      (service as unknown as { unreadCountSignal: { set: (v: number) => void } }).unreadCountSignal.set(6);

      service.getConversation('u2').subscribe();

      const req = httpMock.expectOne((r) => r.url === `${apiUrl}/conversations/u2`);
      req.flush({
        success: true,
        data: [],
        metadata: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });

      // u2's unread count should be reset to 0, u3 keeps 3
      expect(service.conversations().find((c) => c.userId === 'u2')?.unreadCount).toBe(0);
      expect(service.conversations().find((c) => c.userId === 'u3')?.unreadCount).toBe(3);
      // Total unread = 0 + 3 = 3
      expect(service.unreadCount()).toBe(3);
    });

    it('MessageService — getConversation — custom page and limit — passes params correctly', () => {
      service.getConversation('u2', 2, 25).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${apiUrl}/conversations/u2`);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('25');
      req.flush({ success: true, data: { messages: [], total: 0 } });
    });
  });

  describe('sendMessage', () => {
    it('MessageService — sendMessage — happy path — appends to active conversation', () => {
      const existing = makeMessage('m1');
      (service as unknown as { activeConversationSignal: { set: (v: Message[]) => void } }).activeConversationSignal.set([existing]);

      const newMsg = makeMessage('m2');

      service.sendMessage({ receiverId: 'u2', content: 'Hello!' }).subscribe();

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ receiverId: 'u2', content: 'Hello!' });
      req.flush({ success: true, data: { message: newMsg } });

      expect(service.activeConversation().length).toBe(2);
      expect(service.activeConversation()[1].id).toBe('m2');
    });

    it('MessageService — sendMessage — existing conversation in list — updates lastMessage', () => {
      const conv = makeConversation('u2');
      (service as unknown as { conversationsSignal: { set: (v: Conversation[]) => void } }).conversationsSignal.set([conv]);

      service.sendMessage({ receiverId: 'u2', content: 'New message' }).subscribe();

      const req = httpMock.expectOne(apiUrl);
      req.flush({ success: true, data: { message: makeMessage('m3') } });

      expect(service.conversations()[0].lastMessage).toBe('New message');
    });

    it('MessageService — sendMessage — no existing conversation — does not modify list', () => {
      (service as unknown as { conversationsSignal: { set: (v: Conversation[]) => void } }).conversationsSignal.set([makeConversation('u5')]);

      service.sendMessage({ receiverId: 'u2', content: 'Hello' }).subscribe();

      const req = httpMock.expectOne(apiUrl);
      req.flush({ success: true, data: { message: makeMessage('m4') } });

      // List length unchanged
      expect(service.conversations().length).toBe(1);
    });
  });

  describe('getUsers', () => {
    it('MessageService — getUsers — happy path — populates users signal', () => {
      const users = [
        {
          id: 'u1',
          firstName: 'Bob',
          lastName: 'Jones',
          role: UserRole.DOCTOR,
          email: 'b@b.com',
          isEmailVerified: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      service.getUsers().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/users`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: { users } });

      expect(service.users()).toEqual(users);
    });
  });

  describe('getUnreadCount', () => {
    it('MessageService — getUnreadCount — happy path — sets unreadCount signal', () => {
      service.getUnreadCount().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/unread-count`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: { unreadCount: 7 } });

      expect(service.unreadCount()).toBe(7);
    });
  });

  describe('markAsRead', () => {
    it('MessageService — markAsRead — happy path — sends PATCH request', () => {
      service.markAsRead('sender-1').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/read/sender-1`);
      expect(req.request.method).toBe('PATCH');
      req.flush({});
    });
  });

  describe('clearActiveConversation', () => {
    it('MessageService — clearActiveConversation — clears messages and active partner', () => {
      (service as unknown as { activeConversationSignal: { set: (v: Message[]) => void } }).activeConversationSignal.set([makeMessage('m1')]);
      (service as unknown as { activePartnerSignal: { set: (v: string | null) => void } }).activePartnerSignal.set('u2');

      service.clearActiveConversation();

      expect(service.activeConversation()).toEqual([]);
      expect(service.activePartner()).toBeNull();
    });
  });
});
