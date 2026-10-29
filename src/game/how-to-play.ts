import type { MsgKey } from "./i18n.ts";

/** Sections of the hangar How to play panel, in read order. */
export const HOW_TO_PLAY_SECTIONS: readonly { title: MsgKey; body: MsgKey }[] = [
  { title: "howPurposeTitle", body: "howPurposeBody" },
  { title: "howWinTitle", body: "howWinBody" },
  { title: "howLoseTitle", body: "howLoseBody" },
  { title: "howControlsTitle", body: "howControlsBody" },
  { title: "howAbductTitle", body: "howAbductBody" },
  { title: "howPointsTitle", body: "howPointsBody" },
  { title: "howThreatsTitle", body: "howThreatsBody" },
  { title: "howHullTitle", body: "howHullBody" },
  { title: "howHangarTitle", body: "howHangarBody" },
];

/** Escape closes the panel. P stays a raid pause key and does not dismiss it. */
export function isHowToPlayDismissKey(e: { code?: string; key?: string }): boolean {
  const code = e.code ?? "";
  const key = e.key ?? "";
  return code === "Escape" || key === "Escape" || key === "Esc";
}

/**
 * Where Tab should go inside the panel.
 * `null` means the browser's own move stays inside the panel, so leave it.
 * `activeIndex` is -1 when focus is outside the panel.
 */
export function trapTab(move: {
  count: number;
  activeIndex: number;
  shiftKey: boolean;
}): number | null {
  const { count, activeIndex, shiftKey } = move;
  if (count <= 0) return null;
  if (activeIndex < 0 || activeIndex >= count) return shiftKey ? count - 1 : 0;
  if (!shiftKey && activeIndex === count - 1) return 0;
  if (shiftKey && activeIndex === 0) return count - 1;
  return null;
}

/** Open / close for the hangar guide. `hide` returns focus to the opener. */
export class HowToPlaySession {
  open = false;
  private opener: { focus(): void } | null = null;

  show(opener: { focus(): void } | null) {
    this.opener = opener;
    this.open = true;
  }

  hide() {
    if (!this.open) return;
    this.open = false;
    const el = this.opener;
    this.opener = null;
    el?.focus();
  }

  /** True when this key closed the panel. */
  onKey(e: { code?: string; key?: string }): boolean {
    if (!this.open || !isHowToPlayDismissKey(e)) return false;
    this.hide();
    return true;
  }
}
