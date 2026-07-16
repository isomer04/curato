import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
    let service: NotificationService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [NotificationService]
        });
        service = TestBed.inject(NotificationService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should add a success toast', () => {
        service.success('Success Title', 'Success Message');
        const toasts = service.toasts();
        expect(toasts.length).toBe(1);
        expect(toasts[0].type).toBe('success');
        expect(toasts[0].title).toBe('Success Title');
    });

    it('should remove a toast by id', () => {
        service.success('Test', 'Message');
        const id = service.toasts()[0].id;

        service.removeToast(id);
        expect(service.toasts().length).toBe(0);
    });

    it('should auto-remove toast after duration', fakeAsync(() => {
        service.info('Auto Remove', 'Message', 1000);
        expect(service.toasts().length).toBe(1);

        tick(1000);
        expect(service.toasts().length).toBe(0);
    }));

    it('should clear all toasts', () => {
        service.success('1', '1');
        service.error('2', '2');
        expect(service.toasts().length).toBe(2);

        service.clearAll();
        expect(service.toasts().length).toBe(0);
    });
});
