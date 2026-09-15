import { format, isToday, isTomorrow } from "date-fns";

export function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (isToday(date)) return `Today · ${format(date, "h:mm a")}`;
  if (isTomorrow(date)) return `Tomorrow · ${format(date, "h:mm a")}`;
  return format(date, "MMM d, yyyy · h:mm a");
}

export function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "MMM d");
}

export function monthKey(date: Date) {
  return format(date, "yyyy-MM");
}
