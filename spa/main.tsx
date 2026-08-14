import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../src/styles.css";
import { SaucerRaid } from "../src/components/game/SaucerRaid";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SaucerRaid />
  </StrictMode>,
);
