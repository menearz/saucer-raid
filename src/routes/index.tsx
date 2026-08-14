import { createFileRoute } from "@tanstack/react-router";
import { SaucerRaid } from "@/components/game/SaucerRaid";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <SaucerRaid />;
}
