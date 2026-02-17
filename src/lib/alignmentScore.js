/**
 * Alignment Score Calculator
 * Compares actual intake vs targets and produces alignment scores
 */

/**
 * Calculate carb alignment score
 * @param {number} actualCarbs - Actual carbs consumed (grams)
 * @param {number} targetCarbs - Target carbs (grams)
 * @returns {number} - Score 0-100
 */
export function calculateCarbScore(actualCarbs, targetCarbs) {
  if (!targetCarbs || targetCarbs <= 0) return 0
  if (!actualCarbs || actualCarbs < 0) return 0
  
  // Score = (actual / target) * 100, capped at 100
  // Going over target is fine, we just cap at 100
  const score = Math.min(100, (actualCarbs / targetCarbs) * 100)
  return Math.round(score)
}

/**
 * Calculate protein alignment score
 * @param {number} actualProtein - Actual protein consumed (grams)
 * @param {number} targetProtein - Target protein (grams)
 * @returns {number} - Score 0-100
 */
export function calculateProteinScore(actualProtein, targetProtein) {
  if (!targetProtein || targetProtein <= 0) return 0
  if (!actualProtein || actualProtein < 0) return 0
  
  // Score = (actual / target) * 100, capped at 100
  const score = Math.min(100, (actualProtein / targetProtein) * 100)
  return Math.round(score)
}

/**
 * Calculate overall alignment score
 * Weighted: 60% carbs, 40% protein
 * @param {number} carbScore - Carb score (0-100)
 * @param {number} proteinScore - Protein score (0-100)
 * @returns {number} - Overall score 0-100
 */
export function calculateOverallScore(carbScore, proteinScore) {
  const overall = (carbScore * 0.6) + (proteinScore * 0.4)
  return Math.round(overall)
}

/**
 * Calculate all alignment scores
 * @param {object} intake - Day intake object { carbs_g, protein_g }
 * @param {object} targets - Day targets { carb_target_g, protein_target_g }
 * @returns {object} - All scores { carbScore, proteinScore, overallScore }
 */
export function calculateAlignmentScores(intake, targets) {
  const carbScore = calculateCarbScore(intake?.carbs_g, targets?.carb_target_g)
  const proteinScore = calculateProteinScore(intake?.protein_g, targets?.protein_target_g)
  const overallScore = calculateOverallScore(carbScore, proteinScore)
  
  return {
    carbScore,
    proteinScore,
    overallScore
  }
}

/**
 * Get score badge color based on score
 * @param {number} score - Score 0-100
 * @returns {string} - Color name
 */
export function getScoreBadgeColor(score) {
  if (score >= 90) return 'green'
  if (score >= 75) return 'yellow'
  if (score >= 50) return 'orange'
  return 'red'
}

/**
 * Get score description
 * @param {number} score - Score 0-100
 * @returns {string} - Description
 */
export function getScoreDescription(score) {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 50) return 'Fair'
  if (score > 0) return 'Needs improvement'
  return 'No data'
}

/**
 * Format score for display
 * @param {number} score - Score 0-100
 * @returns {string} - Formatted score
 */
export function formatScore(score) {
  if (score === null || score === undefined) return '-'
  return `${score}%`
}

