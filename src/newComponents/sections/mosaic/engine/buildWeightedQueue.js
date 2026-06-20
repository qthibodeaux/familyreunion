const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

export const buildWeightedQueue = (themes) => {
  const weighted = [];

  themes.forEach((theme) => {
    const count = Math.max(1, theme.weight || 1);
    for (let i = 0; i < count; i += 1) {
      weighted.push(theme);
    }
  });

  return shuffle(weighted);
};
