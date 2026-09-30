/** Player-facing idea form. One URL; the ops sheet stays out of the game. */
export const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfb4LbBsZS2dmrE-1qWafZIFrQD3yBr1Hsf6xaZSjopVkXvgQ/viewform";

export function openFeedbackForm() {
  window.open(FEEDBACK_FORM_URL, "_blank", "noopener,noreferrer");
}
