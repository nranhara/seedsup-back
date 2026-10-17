const express = require("express");
const router = express.Router();
const {
  getRankedSuppliers,
  getAHPConfig,
  saveAHPConfig,
} = require("../controllers/supplierController");

router.get("/ahp-config", getAHPConfig);
router.put("/ahp-config", saveAHPConfig);
router.post("/rank", getRankedSuppliers);

module.exports = router;
