export const getTileId = (row, col) => `${row}-${col}`;

export const canFit = ({ cols, rows }, tileMap, gridCols = 4, gridRows = 7) => {
  const possibleFits = [];

  for (let startRow = 0; startRow <= gridRows - rows; startRow += 1) {
    for (let startCol = 0; startCol <= gridCols - cols; startCol += 1) {
      const candidates = [];
      let fits = true;

      for (let r = startRow; r < startRow + rows; r += 1) {
        for (let c = startCol; c < startCol + cols; c += 1) {
          const tile = tileMap.find((candidate) => candidate.row === r && candidate.col === c);
          if (!tile || tile.state !== "idle") {
            fits = false;
            break;
          }
          candidates.push(tile);
        }
        if (!fits) break;
      }

      if (fits) {
        possibleFits.push(candidates);
      }
    }
  }

  if (possibleFits.length > 0) {
    const randomIndex = Math.floor(Math.random() * possibleFits.length);
    return possibleFits[randomIndex];
  }

  return null;
};
