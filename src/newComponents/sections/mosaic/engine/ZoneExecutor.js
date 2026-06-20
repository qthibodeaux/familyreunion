import { buildStaggerSequence } from "./effects";

export const TRANSITION_DURATION = 500;

export const createTransition = (type = "flip") => ({
  type,
  direction: ["left", "right", "up", "down"][Math.floor(Math.random() * 4)],
  duration: type === "fade" ? 800 : TRANSITION_DURATION,
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  id: Math.random(),
});

export const executeZone = ({
  tiles,
  instructions,
  effect = "sync",
  transition = "flip",
  holdDuration = 1000,
  onRelease,
  updateTile,
  registerTimer,
}) => {
  const sequence = buildStaggerSequence(effect, tiles);

  sequence.forEach(({ tileIndex, delay }) => {
    const timer = setTimeout(() => {
      updateTile(tiles[tileIndex].id, instructions[tileIndex], createTransition(transition));
    }, delay);
    registerTimer?.(timer);
  });

  const lastDelay = sequence.reduce((max, item) => Math.max(max, item.delay), 0);
  const releaseTimer = setTimeout(() => {
    onRelease();
  }, lastDelay + TRANSITION_DURATION + holdDuration);
  registerTimer?.(releaseTimer);
};
