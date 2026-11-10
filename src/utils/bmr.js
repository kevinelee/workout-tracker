// Mifflin–St Jeor sex constant. 'other' uses the midpoint of the two.
const SEX_OFFSET = {
  male:   5,
  female: -161,
  other:  -78,
}

// TDEE multipliers by profile activity_level
export const ACTIVITY_MULTIPLIER = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
}

/**
 * Basal metabolic rate (kcal/day) via Mifflin–St Jeor:
 *   BMR = 10 × kg + 6.25 × cm − 5 × age + sex offset
 *
 * Returns null if any input is missing.
 */
export function calcBMR({ weightKg, heightCm, age, gender }) {
  const offset = SEX_OFFSET[gender]
  if (!weightKg || !heightCm || age == null || offset == null) return null
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + offset)
}

// WHO adult BMI categories (upper bound exclusive)
const BMI_CATEGORIES = [
  { max: 18.5,     label: 'Underweight' },
  { max: 25,       label: 'Healthy' },
  { max: 30,       label: 'Overweight' },
  { max: Infinity, label: 'Obese' },
]

/**
 * Body mass index = kg / m², rounded to one decimal.
 * Returns { value, category } or null if height or weight is missing.
 */
export function calcBMI({ weightKg, heightCm }) {
  if (!weightKg || !heightCm) return null
  const m = heightCm / 100
  const value = Math.round((weightKg / (m * m)) * 10) / 10
  const category = BMI_CATEGORIES.find(c => value < c.max).label
  return { value, category }
}

/**
 * Total daily energy expenditure (maintenance kcal/day) = BMR × activity multiplier.
 * Returns null if BMR or activity level is missing.
 */
export function calcTDEE(bmr, activityLevel) {
  const mult = ACTIVITY_MULTIPLIER[activityLevel]
  if (bmr == null || !mult) return null
  return Math.round(bmr * mult)
}
