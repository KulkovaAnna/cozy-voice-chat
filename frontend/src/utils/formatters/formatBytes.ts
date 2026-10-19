export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let i = 0;
  let value = bytes;

  while (value >= 1000 && i < units.length - 1) {
    value /= 1000;
    i++;
  }

  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(2);

  return formatted + " " + units[i];
}
