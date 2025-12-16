type NotificationType = "status-change" | "alert" | "success";

const audioContext = typeof window !== "undefined" ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

export function playNotificationSound(type: NotificationType = "status-change") {
  if (!audioContext) return;

  // Resume audio context if suspended (browser autoplay policy)
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const now = audioContext.currentTime;

  switch (type) {
    case "status-change":
      // Two-tone notification
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.setValueAtTime(1100, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
      break;

    case "alert":
      // Urgent triple beep
      oscillator.frequency.setValueAtTime(800, now);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.setValueAtTime(0.01, now + 0.1);
      gainNode.gain.setValueAtTime(0.15, now + 0.15);
      gainNode.gain.setValueAtTime(0.01, now + 0.25);
      gainNode.gain.setValueAtTime(0.15, now + 0.3);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      oscillator.start(now);
      oscillator.stop(now + 0.4);
      break;

    case "success":
      // Rising tone
      oscillator.frequency.setValueAtTime(523, now);
      oscillator.frequency.setValueAtTime(659, now + 0.1);
      oscillator.frequency.setValueAtTime(784, now + 0.2);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      break;
  }
}

// Play alert for critical status changes (out-of-service, offline)
export function playAlertForStatus(newStatus: string) {
  if (newStatus === "out-of-service" || newStatus === "offline") {
    playNotificationSound("alert");
  } else if (newStatus === "available" || newStatus === "active") {
    playNotificationSound("success");
  } else {
    playNotificationSound("status-change");
  }
}
