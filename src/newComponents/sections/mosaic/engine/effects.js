const asPositions = (tiles) =>
  tiles.map((tile, tileIndex) => ({
    tileIndex,
    row: tile.row,
    col: tile.col,
  }));

const withDelay = (positions, step) =>
  positions.map((position, index) => ({
    tileIndex: position.tileIndex,
    delay: index * step,
  }));

const byDistanceFromCenter = (positions) => {
  const minRow = Math.min(...positions.map((p) => p.row));
  const maxRow = Math.max(...positions.map((p) => p.row));
  const minCol = Math.min(...positions.map((p) => p.col));
  const maxCol = Math.max(...positions.map((p) => p.col));
  const centerRow = (minRow + maxRow) / 2;
  const centerCol = (minCol + maxCol) / 2;

  return [...positions].sort((a, b) => {
    const aDistance = Math.abs(a.row - centerRow) + Math.abs(a.col - centerCol);
    const bDistance = Math.abs(b.row - centerRow) + Math.abs(b.col - centerCol);
    return aDistance - bDistance;
  });
};

const spiralPositions = (positions) => {
  const byCoord = new Map(positions.map((p) => [`${p.row}-${p.col}`, p]));
  const minRow = Math.min(...positions.map((p) => p.row));
  const maxRow = Math.max(...positions.map((p) => p.row));
  const minCol = Math.min(...positions.map((p) => p.col));
  const maxCol = Math.max(...positions.map((p) => p.col));
  const ordered = [];
  let top = minRow;
  let bottom = maxRow;
  let left = minCol;
  let right = maxCol;

  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c += 1) ordered.push(byCoord.get(`${top}-${c}`));
    top += 1;
    for (let r = top; r <= bottom; r += 1) ordered.push(byCoord.get(`${r}-${right}`));
    right -= 1;
    if (top <= bottom) {
      for (let c = right; c >= left; c -= 1) ordered.push(byCoord.get(`${bottom}-${c}`));
      bottom -= 1;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r -= 1) ordered.push(byCoord.get(`${r}-${left}`));
      left += 1;
    }
  }

  return ordered.filter(Boolean);
};

const randomWalk = (positions) => {
  const remaining = [...positions];
  const ordered = [];
  let current = remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0];
  ordered.push(current);

  while (remaining.length > 0) {
    const activeCurrent = current;
    remaining.sort((a, b) => {
      const aDistance = Math.abs(a.row - activeCurrent.row) + Math.abs(a.col - activeCurrent.col);
      const bDistance = Math.abs(b.row - activeCurrent.row) + Math.abs(b.col - activeCurrent.col);
      return aDistance - bDistance;
    });
    current = remaining.shift();
    ordered.push(current);
  }

  return ordered;
};

export const buildStaggerSequence = (effect, tiles) => {
  const positions = asPositions(tiles);

  if (positions.length === 0) return [];

  switch (effect) {
    case "diagonal-wave":
      return positions.map((position) => {
        const minRank = Math.min(...positions.map((p) => p.row + p.col));
        return { tileIndex: position.tileIndex, delay: (position.row + position.col - minRank) * 120 };
      });
    case "ripple":
      return withDelay(byDistanceFromCenter(positions), 100);
    case "wave":
      return positions
        .sort((a, b) => a.col - b.col || a.row - b.row)
        .map((position) => ({ tileIndex: position.tileIndex, delay: position.col * 80 }));
    case "domino":
      return withDelay(randomWalk(positions), 200);
    case "random-stagger":
      return withDelay([...positions].sort(() => Math.random() - 0.5), 40);
    case "spiral":
      return withDelay(spiralPositions(positions), 70);
    case "lineage-cascade":
      return withDelay([...positions].sort((a, b) => a.row - b.row || a.col - b.col), 200);
    case "sync":
    default:
      return positions.map((position) => ({ tileIndex: position.tileIndex, delay: 0 }));
  }
};
