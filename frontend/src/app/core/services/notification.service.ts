import { Injectable, signal } from '@angular/core';
import { ToastMessage } from '../models';

@Injectable({
    providedIn: 'root',
})
export class NotificationService {
    private toastsSignal = signal<ToastMessage[]>([]);
    private nextId = 1;

    readonly toasts = this.toastsSignal;

    success(title: string, message: string, duration = 5000): void {
        this.addToast({ type: 'success', title, message, duration });
    }

    error(title: string, message: string, duration = 7000): void {
        this.addToast({ type: 'error', title, message, duration });
    }

    warning(title: string, message: string, duration = 5000): void {
        this.addToast({ type: 'warning', title, message, duration });
    }

    info(title: string, message: string, duration = 5000): void {
        this.addToast({ type: 'info', title, message, duration });
    }

    private addToast(toast: Omit<ToastMessage, 'id'>): void {
        const id = this.nextId++;
        const newToast: ToastMessage = { id, ...toast };

        this.toastsSignal.update((toasts) => [...toasts, newToast]);

        if (toast.duration && toast.duration > 0) {
            setTimeout(() => {
                this.removeToast(id);
            }, toast.duration);
        }
    }

    removeToast(id: number): void {
        this.toastsSignal.update((toasts) => toasts.filter((t) => t.id !== id));
    }

    clearAll(): void {
        this.toastsSignal.set([]);
    }
}
