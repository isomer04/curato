import { Injectable } from '@angular/core';
import { User } from '../models';

const USER_KEY = 'user';

@Injectable({
    providedIn: 'root',
})
export class StorageService {
    /**
     * Access token stored in-memory only (not localStorage/sessionStorage).
     * This prevents XSS attacks from exfiltrating the token via JavaScript.
     * The tradeoff is the token is lost on page refresh, but the HttpOnly
     * refresh-token cookie will re-issue a new one automatically.
     */
    private accessToken: string | null = null;

    getAccessToken(): string | null {
        return this.accessToken;
    }

    setTokens(accessToken: string): void {
        this.accessToken = accessToken;
    }

    getUser(): User | null {
        const userJson = sessionStorage.getItem(USER_KEY);
        if (userJson) {
            try {
                return JSON.parse(userJson) as User;
            } catch {
                return null;
            }
        }
        return null;
    }

    setUser(user: User): void {
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    clearAuth(): void {
        this.accessToken = null;
        sessionStorage.removeItem(USER_KEY);
    }

    clearAll(): void {
        this.accessToken = null;
        sessionStorage.clear();
    }

    setItem(key: string, value: string): void {
        sessionStorage.setItem(key, value);
    }

    getItem(key: string): string | null {
        return sessionStorage.getItem(key);
    }

    removeItem(key: string): void {
        sessionStorage.removeItem(key);
    }
}

