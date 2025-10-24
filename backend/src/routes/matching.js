const express = require("express");
const router = express.Router();
const matchingService = require("../services/matchingService");

/**
 * POST /api/matching/find-tutors
 * Find tutors that match student requirements
 */
router.post("/find-tutors", async (req, res) => {
  try {
    const { language, budgetPerSecond, studentAddress } = req.body;

    if (!language || !budgetPerSecond) {
      return res.status(400).json({
        success: false,
        error: "Language and budgetPerSecond are required",
      });
    }

    const matchingTutors = await matchingService.findMatchingTutors({
      language,
      budgetPerSecond,
      studentAddress,
    });

    res.json({
      success: true,
      tutors: matchingTutors,
      count: matchingTutors.length,
    });
  } catch (error) {
    console.error('Error finding tutors:', error);
    res.status(500).json({
      success: false,
      error: "Failed to find matching tutors",
    });
  }
});

/**
 * GET /api/matching/stats
 * Get matching system statistics
 */
router.get("/stats", async (req, res) => {
  try {
    const availableTutors = await matchingService.getAvailableTutors();

    // Group tutors by language
    const tutorsByLanguage = availableTutors.reduce((acc, tutor) => {
      if (tutor.language) {
        acc[tutor.language] = (acc[tutor.language] || 0) + 1;
      }
      return acc;
    }, {});

    res.json({
      success: true,
      stats: {
        totalAvailableTutors: availableTutors.length,
        tutorsByLanguage,
      },
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: "Failed to get matching stats",
    });
  }
});

module.exports = router;
