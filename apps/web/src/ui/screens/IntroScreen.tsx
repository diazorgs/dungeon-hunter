import { CARDS } from "@dh/shared";
import { useMarkSeen } from "../../profile/queries.ts";
import { useSessionStore } from "../../stores/session.ts";
import { CardsScreen } from "./CardsScreen.tsx";

export function IntroScreen() {
  const goTo = useSessionStore((s) => s.goTo);
  const markSeen = useMarkSeen();
  const done = () => {
    markSeen.mutate("intro");
    goTo("staging");
  };
  return <CardsScreen cards={CARDS.intro} onDone={done} />;
}
