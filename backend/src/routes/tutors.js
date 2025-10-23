const express = require("express");
const router = express.Router();
const matchingService = require("../services/matchingService");
const contractService = require("../services/contractService");

/**
 * GET /api/tutors/available
 * Get all currently available tutors
 */
router.get("/available", async (req, res) => {
  try {
    const availableTutors = await matchingService.getAvailableTutors();
    res.json({
      success: true,
      tutors: availableTutors,
    });
  } catch (error) {
    console.error('Error getting available tutors:', error);
    res.status(500).json({
      success: false,
      error: "Failed to get available tutors",
    });
  }
});

/**
 * GET /api/tutors/:address
 * Get tutor information from smart contract
 */
router.get("/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const tutorInfo = await contractService.getTutorInfo(address);

    res.json({
      success: true,
      tutor: tutorInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get tutor information",
    });
  }
});

/**
 * GET /api/tutors/:address/availability
 * Check if a specific tutor is available
 */
router.get("/:address/availability", async (req, res) => {
  try {
    const { address } = req.params;
    const tutor = await matchingService.getTutorByAddress(address);

    res.json({
      success: true,
      isAvailable: tutor !== null,
      tutor: tutor,
    });
  } catch (error) {
    console.error('Error checking tutor availability:', error);
    res.status(500).json({
      success: false,
      error: "Failed to check tutor availability",
    });
  }
});

module.exports = router;
