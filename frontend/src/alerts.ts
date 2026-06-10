export interface Alert {
  id: string;
  symbol: string;
  op: ">" | "<";
  price: number;
  triggered: boolean;
  triggeredAt?: number;
}

export function notifyAlert(a: Alert, last: number) {
  const body = `${a.symbol} is at ${last.toFixed(2)} (alert: ${a.op} ${a.price})`;
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("⚠ PRICE ALERT", { body });
  }
}

export function requestNotifyPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}
