// Predefined exercise library seeded with common movements per category
// isCustom: false = built-in, true = user-created

export const CATEGORIES = ['Push', 'Pull', 'Legs', 'Core', 'Cardio']

export const defaultExercises = [
  // Push
  { id: 'bench-press',        name: 'Bench Press',         category: 'Push', muscleGroup: 'Chest',     isCustom: false },
  { id: 'overhead-press',     name: 'Overhead Press',      category: 'Push', muscleGroup: 'Shoulders', isCustom: false },
  { id: 'incline-press',      name: 'Incline Bench Press', category: 'Push', muscleGroup: 'Chest',     isCustom: false },
  { id: 'dips',               name: 'Dips',                category: 'Push', muscleGroup: 'Triceps',   isCustom: false },
  { id: 'tricep-pushdown',    name: 'Tricep Pushdown',     category: 'Push', muscleGroup: 'Triceps',   isCustom: false },

  // Pull
  { id: 'deadlift',           name: 'Deadlift',            category: 'Pull', muscleGroup: 'Back',      isCustom: false },
  { id: 'pull-up',            name: 'Pull Up',             category: 'Pull', muscleGroup: 'Back',      isCustom: false },
  { id: 'barbell-row',        name: 'Barbell Row',         category: 'Pull', muscleGroup: 'Back',      isCustom: false },
  { id: 'lat-pulldown',       name: 'Lat Pulldown',        category: 'Pull', muscleGroup: 'Back',      isCustom: false },
  { id: 'bicep-curl',         name: 'Bicep Curl',          category: 'Pull', muscleGroup: 'Biceps',    isCustom: false },

  // Legs
  { id: 'squat',              name: 'Squat',               category: 'Legs', muscleGroup: 'Quads',     isCustom: false },
  { id: 'romanian-deadlift',  name: 'Romanian Deadlift',   category: 'Legs', muscleGroup: 'Hamstrings',isCustom: false },
  { id: 'leg-press',          name: 'Leg Press',           category: 'Legs', muscleGroup: 'Quads',     isCustom: false },
  { id: 'lunges',             name: 'Lunges',              category: 'Legs', muscleGroup: 'Quads',     isCustom: false },
  { id: 'calf-raise',         name: 'Calf Raise',          category: 'Legs', muscleGroup: 'Calves',    isCustom: false },

  // Core
  { id: 'plank',              name: 'Plank',               category: 'Core', muscleGroup: 'Abs',       isCustom: false },
  { id: 'crunch',             name: 'Crunch',              category: 'Core', muscleGroup: 'Abs',       isCustom: false },
  { id: 'hanging-leg-raise',  name: 'Hanging Leg Raise',   category: 'Core', muscleGroup: 'Abs',       isCustom: false },
  { id: 'cable-crunch',       name: 'Cable Crunch',        category: 'Core', muscleGroup: 'Abs',       isCustom: false },
  { id: 'russian-twist',      name: 'Russian Twist',       category: 'Core', muscleGroup: 'Obliques',  isCustom: false },

  // Cardio
  { id: 'treadmill',          name: 'Treadmill',           category: 'Cardio', muscleGroup: 'Full Body', isCustom: false },
  { id: 'rowing-machine',     name: 'Rowing Machine',      category: 'Cardio', muscleGroup: 'Full Body', isCustom: false },
  { id: 'jump-rope',          name: 'Jump Rope',           category: 'Cardio', muscleGroup: 'Full Body', isCustom: false },
  { id: 'bike',               name: 'Stationary Bike',     category: 'Cardio', muscleGroup: 'Full Body', isCustom: false },
  { id: 'stair-climber',      name: 'Stair Climber',       category: 'Cardio', muscleGroup: 'Full Body', isCustom: false },
]
