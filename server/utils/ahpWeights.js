const CRITERIA = ["price", "rating", "distance_km", "stock"];
const RANDOM_INDEX = { 1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 };

// Convert the six expert judgments into a reciprocal 4 x 4 matrix.
// Each judgment compares the row criterion with the column criterion.
const buildPairwiseMatrix = (comparisons) => {
  const pairs = [
    [0, 1, "price_rating"],
    [0, 2, "price_distance"],
    [0, 3, "price_stock"],
    [1, 2, "rating_distance"],
    [1, 3, "rating_stock"],
    [2, 3, "distance_stock"],
  ];
  const matrix = Array.from({ length: 4 }, (_, i) =>
    Array.from({ length: 4 }, (_, j) => (i === j ? 1 : 0)),
  );

  for (const [i, j, key] of pairs) {
    const value = Number(comparisons?.[key]);
    if (!Number.isFinite(value) || value < 1 / 9 || value > 9 || value === 0) {
      throw new Error(`Invalid AHP comparison: ${key}`);
    }
    matrix[i][j] = value;
    matrix[j][i] = 1 / value;
  }
  return matrix;
};

const calculateAHPWeights = (pairwiseMatrix) => {
  const n = pairwiseMatrix.length;
  if (n < 2 || pairwiseMatrix.some((row) => !Array.isArray(row) || row.length !== n)) {
    throw new Error("The AHP pairwise matrix must be square.");
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (!Number.isFinite(pairwiseMatrix[i][j]) || pairwiseMatrix[i][j] <= 0) {
        throw new Error("All AHP matrix values must be positive numbers.");
      }
    }
    if (Math.abs(pairwiseMatrix[i][i] - 1) > 1e-9) {
      throw new Error("Every diagonal value in the AHP matrix must equal 1.");
    }
  }

  const columnSums = Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) columnSums[j] += pairwiseMatrix[i][j];
  }

  const normalizedMatrix = pairwiseMatrix.map((row) =>
    row.map((value, j) => value / columnSums[j]),
  );
  const weights = normalizedMatrix.map((row) =>
    row.reduce((sum, value) => sum + value, 0) / n,
  );
  const total = weights.reduce((sum, value) => sum + value, 0);
  const normalizedWeights = weights.map((value) => value / total);

  // Consistency Ratio (CR): CR <= 0.10 is commonly treated as acceptable.
  const weightedSum = pairwiseMatrix.map((row) =>
    row.reduce((sum, value, j) => sum + value * normalizedWeights[j], 0),
  );
  const lambdaMax = weightedSum.reduce(
    (sum, value, i) => sum + value / normalizedWeights[i], 0,
  ) / n;
  const consistencyIndex = n > 1 ? (lambdaMax - n) / (n - 1) : 0;
  const randomIndex = RANDOM_INDEX[n] ?? 1.49;
  const consistencyRatio = randomIndex === 0 ? 0 : Math.max(0, consistencyIndex) / randomIndex;

  return {
    criteria: CRITERIA,
    matrix: pairwiseMatrix,
    normalizedMatrix,
    weights: Object.fromEntries(CRITERIA.map((key, i) => [key, normalizedWeights[i]])),
    consistencyIndex,
    consistencyRatio,
    isConsistent: consistencyRatio <= 0.1,
  };
};

module.exports = { CRITERIA, buildPairwiseMatrix, calculateAHPWeights };
