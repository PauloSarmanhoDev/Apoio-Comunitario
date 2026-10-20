import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  public isOnline = signal<boolean>(navigator.onLine);
  public canInstall = signal<boolean>(false);
  private deferredPrompt: any = null;

  constructor() {
    this.initNetworkListeners();
    this.initInstallPromptListener();
  }

  private initNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline.set(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
    });
  }

  private initInstallPromptListener() {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      // Prevent automatic mini-infobar on mobile Chrome
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.canInstall.set(false);
      this.deferredPrompt = null;
      console.log('AlimentaRede PWA instalado com sucesso!');
    });
  }

  public async installApp(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    this.canInstall.set(false);
    return outcome === 'accepted';
  }
}
