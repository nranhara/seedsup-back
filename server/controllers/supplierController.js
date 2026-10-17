const Supplier = require("../models/Supplier");
const AHPConfig = require("../models/AHPConfig");
const calculateTOPSIS = require("../utils/rankingAlgorithm");
const { buildPairwiseMatrix, calculateAHPWeights } = require("../utils/ahpWeights");

// Transparent starter configuration for first run only. Replace this with real expert judgments.
// These judgments are internally consistent and produce weights 1/3, 1/3, 1/6, 1/6.
const DEFAULT_COMPARISONS = {
  price_rating: 1,
  price_distance: 2,
  price_stock: 2,
  rating_distance: 2,
  rating_stock: 2,
  distance_stock: 1,
};

const getCurrentAHPConfig = async () => {
  let config = await AHPConfig.findById("default").lean();
  if (config) return config;

  const matrix = buildPairwiseMatrix(DEFAULT_COMPARISONS);
  const result = calculateAHPWeights(matrix);
  return {
    _id: "default",
    expertName: "System default (not expert-validated)",
    comparisons: DEFAULT_COMPARISONS,
    ...result,
    source: "default",
  };
};

const getAHPConfig = async (req, res) => {
  try {
    res.json(await getCurrentAHPConfig());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const saveAHPConfig = async (req, res) => {
  try {
    const expertName = String(req.body.expertName || "").trim();
    if (!expertName) {
      return res.status(400).json({ message: "Enter the expert's name or anonymized expert ID." });
    }

    const comparisons = req.body.comparisons;
    const matrix = buildPairwiseMatrix(comparisons);
    const result = calculateAHPWeights(matrix);

    if (!result.isConsistent) {
      return res.status(422).json({
        message: `The judgments are inconsistent (CR = ${result.consistencyRatio.toFixed(3)}). Please review the comparisons until CR is 0.10 or below.`,
        ...result,
        comparisons,
      });
    }

    const saved = await AHPConfig.findByIdAndUpdate(
      "default",
      {
        $set: {
          expertName,
          comparisons,
          matrix: result.matrix,
          weights: result.weights,
          consistencyIndex: result.consistencyIndex,
          consistencyRatio: result.consistencyRatio,
          isConsistent: result.isConsistent,
          source: "expert",
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();

    res.json({ message: "AHP configuration saved and will be used for supplier ranking.", ...saved });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getRankedSuppliers = async (req, res) => {
  try {
    const { seedType, region, minimumRating, maximumDistance } = req.body;
    if (!seedType || !region) {
      return res.status(400).json({ message: "seedType and region are required." });
    }

    const query = { seedType, region };
    if (minimumRating !== undefined && minimumRating !== "") {
      query.rating = { $gte: Number(minimumRating) };
    }
    if (maximumDistance !== undefined && maximumDistance !== "") {
      query.distance_km = { $lte: Number(maximumDistance) };
    }

    const suppliers = await Supplier.find(query);
    if (suppliers.length === 0) return res.json([]);

    const ahpConfig = await getCurrentAHPConfig();
    const rankedSuppliers = calculateTOPSIS(suppliers, ahpConfig.weights);
    res.json(rankedSuppliers);
  } catch (error) {
    console.error("Supplier ranking error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRankedSuppliers, getAHPConfig, saveAHPConfig };
