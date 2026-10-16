export interface SlashState {
  active: boolean;
  query: string;
}

export function computeSlashState(text: string): SlashState {
  const lastSlash = text.lastIndexOf("/");
  if (lastSlash === -1) return { active: false, query: "" };

  const before = text.slice(0, lastSlash);
  if (before.length > 0 && !/\s/.test(before[before.length - 1])) {
    return { active: false, query: "" };
  }

  const after = text.slice(lastSlash + 1);
  if (after.includes(" ")) return { active: false, query: "" };

  return { active: true, query: after };
}
