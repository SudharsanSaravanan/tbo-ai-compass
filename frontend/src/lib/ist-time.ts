const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function getISTNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + IST_OFFSET_MS);
}

export function getISTDateString(): string {
  return getISTNow().toISOString().split("T")[0];
}

export function formatDateIST(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
}
