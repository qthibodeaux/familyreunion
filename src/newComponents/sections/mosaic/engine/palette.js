export const PALETTES = {
  rosewood: {
    primary: "#30041e",
    secondary: "#5b1f40",
    accent: "#873d62",
    light: "#faeed6",
  },
  gold: {
    primary: "#6f4a12",
    secondary: "#b8860b",
    accent: "#f3e7b1",
    light: "#fff7d8",
  },
  blush: {
    primary: "#873d62",
    secondary: "#c68696",
    accent: "#eabea9",
    light: "#fff2e9",
  },
  moss: {
    primary: "#173629",
    secondary: "#2e6b55",
    accent: "#87a878",
    light: "#eff6df",
  },
  indigo: {
    primary: "#18264d",
    secondary: "#334d84",
    accent: "#9ab2d9",
    light: "#eef4ff",
  },
  ember: {
    primary: "#4a1a1a",
    secondary: "#8c3830",
    accent: "#d39a64",
    light: "#fff0dd",
  },
};

export const pickPalette = (paletteIds = ["rosewood"]) => {
  const id = paletteIds[Math.floor(Math.random() * paletteIds.length)] || "rosewood";
  return PALETTES[id] || PALETTES.rosewood;
};
