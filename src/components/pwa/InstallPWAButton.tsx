
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, DownloadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWA_INSTALL_DISMISSED_KEY = 'pwaInstallDismissed';

export default function InstallPWAButton() {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  const handleBeforeInstallPrompt = useCallback((event: Event) => {
    event.preventDefault();
    const typedEvent = event as BeforeInstallPromptEvent;
    
    const dismissed = localStorage.getItem(PWA_INSTALL_DISMISSED_KEY);
    if (dismissed === 'true') {
      console.log('PWA install prompt previously dismissed.');
      return;
    }

    // Check if app is already installed (some browsers might still fire the event)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      console.log('PWA already installed.');
      setIsAppInstalled(true);
      setShowPrompt(false);
      return;
    }
    
    setInstallPromptEvent(typedEvent);
    setShowPrompt(true);
    console.log('beforeinstallprompt event captured.');
  }, []);

  const handleAppInstalled = useCallback(() => {
    console.log('PWA installed.');
    setInstallPromptEvent(null);
    setShowPrompt(false);
    setIsAppInstalled(true);
    localStorage.removeItem(PWA_INSTALL_DISMISSED_KEY); // Clear dismissal if installed
  }, []);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Initial check for installed status
    if (typeof window !== 'undefined') {
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsAppInstalled(true);
            setShowPrompt(false);
        } else {
            const dismissed = localStorage.getItem(PWA_INSTALL_DISMISSED_KEY);
            if (dismissed === 'true') {
                 setShowPrompt(false); // Don't show if dismissed, even if installable
            }
        }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [handleBeforeInstallPrompt, handleAppInstalled]);

  const handleInstallClick = async () => {
    if (!installPromptEvent) {
      console.log('Install prompt event not available.');
      return;
    }
    try {
      await installPromptEvent.prompt();
      console.log('Install prompt shown.');
      const { outcome } = await installPromptEvent.userChoice;
      console.log(`User choice: ${outcome}`);
      if (outcome === 'accepted') {
        // No need to call handleAppInstalled here, 'appinstalled' event will fire
        console.log('User accepted the PWA installation prompt.');
      } else {
        console.log('User dismissed the PWA installation prompt.');
        // Optionally, handle dismissal differently here (e.g., don't set localStorage flag to re-prompt sooner)
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
    } finally {
      // The prompt can only be used once.
      setInstallPromptEvent(null);
      setShowPrompt(false);
    }
  };

  const handleDismissClick = () => {
    setShowPrompt(false);
    setInstallPromptEvent(null); // Also clear the event so it doesn't re-appear this session
    localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, 'true');
    console.log('PWA install prompt dismissed by user.');
  };

  if (!showPrompt || !installPromptEvent || isAppInstalled) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-in-out',
        showPrompt ? 'translate-y-0' : 'translate-y-full'
      )}
      role="dialog"
      aria-labelledby="pwa-install-banner-title"
      aria-describedby="pwa-install-banner-description"
    >
      <div className="bg-background border-t border-border shadow-lg p-4 mx-auto max-w-3xl rounded-t-lg sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex sm:items-center">
          <DownloadCloud className="hidden sm:block h-10 w-10 text-primary mr-4" />
          <div>
            <h2 id="pwa-install-banner-title" className="text-lg font-semibold text-foreground">
              Install Our App!
            </h2>
            <p id="pwa-install-banner-description" className="text-sm text-muted-foreground mt-1">
              Get a better experience by installing our app on your device.
            </p>
          </div>
        </div>
        <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0 flex items-center gap-2">
          <Button onClick={handleInstallClick} size="sm">
            <DownloadCloud className="mr-2 h-4 w-4" /> Install
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDismissClick} aria-label="Dismiss install prompt">
            <X className="mr-1 h-4 w-4 sm:mr-0" /> 
            <span className="sm:hidden">Dismiss</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

