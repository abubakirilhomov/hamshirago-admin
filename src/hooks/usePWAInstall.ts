import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Перехватываем событие на уровне модуля — до монтирования любых компонентов
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listeners: Array<() => void> = [];

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
  listeners.forEach((fn) => fn());
});

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(!!deferredPrompt);

  useEffect(() => {
    const notify = () => setCanInstall(true);
    listeners.push(notify);
    return () => {
      listeners = listeners.filter((fn) => fn !== notify);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      deferredPrompt = null;
      setCanInstall(false);
    }
  };

  return { canInstall, install };
}
