const express = require("express");
const router = express.Router();
const matchingService = require("../services/matchingService");

/**
 * POST /api/matching/find-tutors
 * Find tutors that match student requirements
 */
router.post("/find-tutors", (req, res) => {
  try {
    const { language, budgetPerSecond } = req.body;

    if (!language || !budgetPerSecond) {
      return res.status(400).json({
        success: false,
        error: "Language and budgetPerSecond are required",
      });
    }

    const matchingTutors = matchingService.findMatchingTutors({
      language,
      budgetPerSecond,
    });

    res.json({
      success: true,
      tutors: matchingTutors,
      count: matchingTutors.length,
    });
  } catch (error) {
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
router.get("/stats", (req, res) => {
  try {
    const availableTutors = matchingService.getAvailableTutors();

    res.json({
      success: true,
      stats: {
        totalAvailableTutors: availableTutors.length,
        tutorsByLanguage: availableTutors.reduce((acc, tutor) => {
          tutor.languages.forEach((lang) => {
            acc[lang] = (acc[lang] || 0) + 1;
          });
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get matching stats",
    });
  }
});

module.exports = router;
