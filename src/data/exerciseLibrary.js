// Predefined exercise library seeded with common movements per category
// isCustom: false = built-in, true = user-created

export const CATEGORIES = ['Push', 'Pull', 'Legs', 'Core', 'Cardio', 'Stretch']

// Muscle group filter chips — label is what the user sees, groups are the muscleGroup values it covers
export const MUSCLE_FILTERS = [
  { label: 'Chest',     groups: ['Chest'] },
  { label: 'Shoulders', groups: ['Shoulders', 'Rear Delts'] },
  { label: 'Arms',      groups: ['Biceps', 'Triceps', 'Forearms'] },
  { label: 'Back',      groups: ['Back', 'Lower Back', 'Traps'] },
  { label: 'Core',      groups: ['Abs', 'Obliques'] },
  { label: 'Legs',      groups: ['Quads', 'Hamstrings', 'Glutes', 'Calves'] },
  { label: 'Cardio',    groups: ['Full Body'] },
]

export const defaultExercises = [
  // ── Push ─────────────────────────────────────────────────────
  // Chest
  { id: 'bench-press',           name: 'Bench Press',            category: 'Push', muscleGroup: 'Chest',      isCustom: false },
  { id: 'incline-press',         name: 'Incline Bench Press',    category: 'Push', muscleGroup: 'Chest',      isCustom: false },
  { id: 'decline-press',         name: 'Decline Bench Press',    category: 'Push', muscleGroup: 'Chest',      isCustom: false },
  { id: 'dumbbell-press',        name: 'Dumbbell Chest Press',   category: 'Push', muscleGroup: 'Chest',      isCustom: false },
  { id: 'incline-dumbbell-press',name: 'Incline Dumbbell Press', category: 'Push', muscleGroup: 'Chest',      isCustom: false },
  { id: 'push-up',               name: 'Push-Up',                category: 'Push', muscleGroup: 'Chest',      prType: 'reps', isCustom: false },
  { id: 'chest-fly',             name: 'Chest Fly',              category: 'Push', muscleGroup: 'Chest',      isCustom: false },
  { id: 'cable-fly',             name: 'Cable Fly',              category: 'Push', muscleGroup: 'Chest',      isCustom: false },
  { id: 'pec-deck',              name: 'Pec Deck',               category: 'Push', muscleGroup: 'Chest',      isCustom: false },

  // Shoulders
  { id: 'overhead-press',        name: 'Overhead Press',         category: 'Push', muscleGroup: 'Shoulders',  isCustom: false },
  { id: 'dumbbell-shoulder-press',name: 'Dumbbell Shoulder Press',category: 'Push', muscleGroup: 'Shoulders', isCustom: false },
  { id: 'arnold-press',          name: 'Arnold Press',           category: 'Push', muscleGroup: 'Shoulders',  isCustom: false },
  { id: 'lateral-raise',         name: 'Lateral Raise',          category: 'Push', muscleGroup: 'Shoulders',  isCustom: false },
  { id: 'cable-lateral-raise',   name: 'Cable Lateral Raise',    category: 'Push', muscleGroup: 'Shoulders',  isCustom: false },
  { id: 'front-raise',           name: 'Front Raise',            category: 'Push', muscleGroup: 'Shoulders',  isCustom: false },

  // Triceps
  { id: 'dips',                  name: 'Dips',                   category: 'Push', muscleGroup: 'Triceps',    isCustom: false },
  { id: 'tricep-pushdown',       name: 'Tricep Pushdown',        category: 'Push', muscleGroup: 'Triceps',    isCustom: false },
  { id: 'skull-crushers',        name: 'Skull Crushers',         category: 'Push', muscleGroup: 'Triceps',    isCustom: false },
  { id: 'close-grip-bench',      name: 'Close Grip Bench Press', category: 'Push', muscleGroup: 'Triceps',    isCustom: false },
  { id: 'overhead-tricep-ext',   name: 'Overhead Tricep Extension', category: 'Push', muscleGroup: 'Triceps', isCustom: false },

  // ── Pull ─────────────────────────────────────────────────────
  // Lats
  { id: 'pull-up',               name: 'Pull Up',                category: 'Pull', muscleGroup: 'Back',       prType: 'reps', isCustom: false },
  { id: 'chin-up',               name: 'Chin Up',                category: 'Pull', muscleGroup: 'Back',       prType: 'reps', isCustom: false },
  { id: 'lat-pulldown',          name: 'Lat Pulldown',           category: 'Pull', muscleGroup: 'Back',       isCustom: false },
  { id: 'straight-arm-pulldown', name: 'Straight Arm Pulldown',  category: 'Pull', muscleGroup: 'Back',       isCustom: false },

  // Upper/Mid Back
  { id: 'deadlift',              name: 'Deadlift',               category: 'Pull', muscleGroup: 'Back',       isCustom: false },
  { id: 'barbell-row',           name: 'Bent-Over Row',          category: 'Pull', muscleGroup: 'Back',       isCustom: false },
  { id: 'dumbbell-row',          name: 'Dumbbell Row',           category: 'Pull', muscleGroup: 'Back',       isCustom: false },
  { id: 'seated-row',            name: 'Seated Cable Row',       category: 'Pull', muscleGroup: 'Back',       isCustom: false },
  { id: 't-bar-row',             name: 'T-Bar Row',              category: 'Pull', muscleGroup: 'Back',       isCustom: false },
  { id: 'chest-supported-row',   name: 'Chest-Supported Row',    category: 'Pull', muscleGroup: 'Back',       isCustom: false },

  // Lower Back
  { id: 'back-extension',        name: 'Back Extension',         category: 'Pull', muscleGroup: 'Lower Back', isCustom: false },

  // Rear Delts / Traps
  { id: 'face-pull',             name: 'Face Pull',              category: 'Pull', muscleGroup: 'Rear Delts', isCustom: false },
  { id: 'reverse-fly',           name: 'Reverse Fly',            category: 'Pull', muscleGroup: 'Rear Delts', isCustom: false },
  { id: 'upright-row',           name: 'Upright Row',            category: 'Pull', muscleGroup: 'Traps',      isCustom: false },
  { id: 'shrug',                 name: 'Barbell Shrug',          category: 'Pull', muscleGroup: 'Traps',      isCustom: false },
  { id: 'dumbbell-shrug',        name: 'Dumbbell Shrug',         category: 'Pull', muscleGroup: 'Traps',      isCustom: false },

  // Biceps
  { id: 'bicep-curl',            name: 'Bicep Curl',             category: 'Pull', muscleGroup: 'Biceps',     isCustom: false },
  { id: 'hammer-curl',           name: 'Hammer Curl',            category: 'Pull', muscleGroup: 'Biceps',     isCustom: false },
  { id: 'preacher-curl',         name: 'Preacher Curl',          category: 'Pull', muscleGroup: 'Biceps',     isCustom: false },
  { id: 'incline-dumbbell-curl', name: 'Incline Dumbbell Curl',  category: 'Pull', muscleGroup: 'Biceps',     isCustom: false },
  { id: 'cable-curl',            name: 'Cable Curl',             category: 'Pull', muscleGroup: 'Biceps',     isCustom: false },

  // Forearms
  { id: 'wrist-curl',            name: 'Wrist Curl',             category: 'Pull', muscleGroup: 'Forearms',   isCustom: false },
  { id: 'farmers-carry',         name: "Farmer's Carry",         category: 'Pull', muscleGroup: 'Forearms',   isCustom: false },

  // ── Legs ─────────────────────────────────────────────────────
  // Quads
  { id: 'squat',                 name: 'Squat',                  category: 'Legs', muscleGroup: 'Quads',      isCustom: false },
  { id: 'front-squat',           name: 'Front Squat',            category: 'Legs', muscleGroup: 'Quads',      isCustom: false },
  { id: 'goblet-squat',          name: 'Goblet Squat',           category: 'Legs', muscleGroup: 'Quads',      isCustom: false },
  { id: 'hack-squat',            name: 'Hack Squat',             category: 'Legs', muscleGroup: 'Quads',      isCustom: false },
  { id: 'leg-press',             name: 'Leg Press',              category: 'Legs', muscleGroup: 'Quads',      isCustom: false },
  { id: 'leg-extension',         name: 'Leg Extension',          category: 'Legs', muscleGroup: 'Quads',      isCustom: false },
  { id: 'lunges',                name: 'Lunges',                 category: 'Legs', muscleGroup: 'Quads',      isCustom: false },
  { id: 'step-up',               name: 'Step-Up',                category: 'Legs', muscleGroup: 'Quads',      isCustom: false },
  { id: 'jump-squat',            name: 'Jump Squat',             category: 'Legs', muscleGroup: 'Quads',      isCustom: false },

  // Hamstrings
  { id: 'romanian-deadlift',     name: 'Romanian Deadlift',      category: 'Legs', muscleGroup: 'Hamstrings', isCustom: false },
  { id: 'leg-curl',              name: 'Leg Curl',               category: 'Legs', muscleGroup: 'Hamstrings', isCustom: false },
  { id: 'nordic-curl',           name: 'Nordic Curl',            category: 'Legs', muscleGroup: 'Hamstrings', isCustom: false },
  { id: 'good-morning',          name: 'Good Morning',           category: 'Legs', muscleGroup: 'Hamstrings', isCustom: false },

  // Glutes
  { id: 'hip-thrust',            name: 'Hip Thrust',             category: 'Legs', muscleGroup: 'Glutes',     isCustom: false },
  { id: 'glute-bridge',          name: 'Glute Bridge',           category: 'Legs', muscleGroup: 'Glutes',     isCustom: false },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat',  category: 'Legs', muscleGroup: 'Glutes',     isCustom: false },
  { id: 'sumo-squat',            name: 'Sumo Squat',             category: 'Legs', muscleGroup: 'Glutes',     isCustom: false },
  { id: 'cable-kickback',        name: 'Cable Kickback',         category: 'Legs', muscleGroup: 'Glutes',     isCustom: false },

  // Calves
  { id: 'calf-raise',            name: 'Calf Raise',             category: 'Legs', muscleGroup: 'Calves',     isCustom: false },
  { id: 'seated-calf-raise',     name: 'Seated Calf Raise',      category: 'Legs', muscleGroup: 'Calves',     isCustom: false },
  { id: 'box-jump',              name: 'Box Jump',               category: 'Legs', muscleGroup: 'Calves',     isCustom: false },

  // ── Core ─────────────────────────────────────────────────────
  // Abs
  { id: 'plank',                 name: 'Plank',                  category: 'Core', muscleGroup: 'Abs',        isCustom: false },
  { id: 'crunch',                name: 'Crunch',                 category: 'Core', muscleGroup: 'Abs',        isCustom: false },
  { id: 'hanging-leg-raise',     name: 'Hanging Leg Raise',      category: 'Core', muscleGroup: 'Abs',        prType: 'reps', isCustom: false },
  { id: 'leg-raise',             name: 'Leg Raise',              category: 'Core', muscleGroup: 'Abs',        prType: 'reps', isCustom: false },
  { id: 'cable-crunch',          name: 'Cable Crunch',           category: 'Core', muscleGroup: 'Abs',        isCustom: false },
  { id: 'bicycle-crunch',        name: 'Bicycle Crunch',         category: 'Core', muscleGroup: 'Abs',        isCustom: false },
  { id: 'v-up',                  name: 'V-Up',                   category: 'Core', muscleGroup: 'Abs',        isCustom: false },
  { id: 'ab-wheel',              name: 'Ab Wheel Rollout',       category: 'Core', muscleGroup: 'Abs',        isCustom: false },
  { id: 'hollow-body',           name: 'Hollow Body Hold',       category: 'Core', muscleGroup: 'Abs',        isCustom: false },
  { id: 'mountain-climber',      name: 'Mountain Climbers',      category: 'Core', muscleGroup: 'Abs',        isCustom: false },
  { id: 'dead-bug',              name: 'Dead Bug',               category: 'Core', muscleGroup: 'Abs',        isCustom: false },

  // Obliques
  { id: 'russian-twist',         name: 'Russian Twist',          category: 'Core', muscleGroup: 'Obliques',   isCustom: false },
  { id: 'side-plank',            name: 'Side Plank',             category: 'Core', muscleGroup: 'Obliques',   isCustom: false },
  { id: 'wood-chop',             name: 'Wood Chop',              category: 'Core', muscleGroup: 'Obliques',   isCustom: false },

  // ── Cardio ───────────────────────────────────────────────────
  // cardioUnit: 'distance' = mi/km, 'time' = min, 'both' = both
  { id: 'treadmill',             name: 'Treadmill',              category: 'Cardio', muscleGroup: 'Full Body', cardioUnit: 'both',     isCustom: false },
  { id: 'running',               name: 'Running',                category: 'Cardio', muscleGroup: 'Full Body', cardioUnit: 'both',     isCustom: false },
  { id: 'sprints',               name: 'Sprints',                category: 'Cardio', muscleGroup: 'Full Body', cardioUnit: 'both',     isCustom: false },
  { id: 'bike',                  name: 'Stationary Bike',        category: 'Cardio', muscleGroup: 'Full Body', cardioUnit: 'distance', isCustom: false },
  { id: 'cycling',               name: 'Cycling',                category: 'Cardio', muscleGroup: 'Full Body', cardioUnit: 'distance', isCustom: false },
  { id: 'rowing-machine',        name: 'Rowing Machine',         category: 'Cardio', muscleGroup: 'Full Body', cardioUnit: 'time',     isCustom: false },
  { id: 'stair-climber',         name: 'Stair Climber',          category: 'Cardio', muscleGroup: 'Full Body', cardioUnit: 'time',     isCustom: false },
  { id: 'jump-rope',             name: 'Jump Rope',              category: 'Cardio', muscleGroup: 'Full Body', cardioUnit: 'time',     isCustom: false },
  { id: 'swimming',              name: 'Swimming',               category: 'Cardio', muscleGroup: 'Full Body', cardioUnit: 'both',     isCustom: false },
  { id: 'elliptical',            name: 'Elliptical',             category: 'Cardio', muscleGroup: 'Full Body', cardioUnit: 'both',     isCustom: false },
  { id: 'hiit',                  name: 'HIIT',                   category: 'Cardio', muscleGroup: 'Full Body', cardioUnit: 'time',     isCustom: false },
  { id: 'burpees',               name: 'Burpees',                category: 'Cardio', muscleGroup: 'Full Body', cardioUnit: 'time',     isCustom: false },
  { id: 'high-knees',            name: 'High Knees',             category: 'Cardio', muscleGroup: 'Full Body', cardioUnit: 'time',     isCustom: false },
  { id: 'agility-ladder',        name: 'Agility Ladder',         category: 'Cardio', muscleGroup: 'Full Body', cardioUnit: 'time',     isCustom: false },
  { id: 'kettlebell-swing',      name: 'Kettlebell Swing',       category: 'Cardio', muscleGroup: 'Full Body', cardioUnit: 'time',     isCustom: false },

  // ── Stretch ──────────────────────────────────────────────────
  // Stretch uses 'sec' field (stored in set.reps)
  { id: 'hip-flexor-stretch',    name: 'Hip Flexor Stretch',     category: 'Stretch', muscleGroup: 'Flexibility', isCustom: false },
  { id: 'hamstring-stretch',     name: 'Hamstring Stretch',      category: 'Stretch', muscleGroup: 'Flexibility', isCustom: false },
  { id: 'quad-stretch',          name: 'Quad Stretch',           category: 'Stretch', muscleGroup: 'Flexibility', isCustom: false },
  { id: 'butterfly-stretch',     name: 'Butterfly Stretch',      category: 'Stretch', muscleGroup: 'Flexibility', isCustom: false },
  { id: 'pigeon-pose',           name: 'Pigeon Pose',            category: 'Stretch', muscleGroup: 'Flexibility', isCustom: false },
  { id: 'shoulder-stretch',      name: 'Shoulder Stretch',       category: 'Stretch', muscleGroup: 'Flexibility', isCustom: false },
  { id: 'chest-opener',          name: 'Chest Opener',           category: 'Stretch', muscleGroup: 'Flexibility', isCustom: false },
  { id: 'doorway-stretch',       name: 'Doorway Chest Stretch',  category: 'Stretch', muscleGroup: 'Flexibility', isCustom: false },
  { id: 'lat-stretch',           name: 'Lat Stretch',            category: 'Stretch', muscleGroup: 'Flexibility', isCustom: false },
  { id: 'thoracic-rotation',     name: 'Thoracic Rotation',      category: 'Stretch', muscleGroup: 'Flexibility', isCustom: false },
  { id: 'cat-cow',               name: 'Cat-Cow',                category: 'Stretch', muscleGroup: 'Flexibility', isCustom: false },
  { id: 'childs-pose',           name: "Child's Pose",           category: 'Stretch', muscleGroup: 'Flexibility', isCustom: false },
  { id: 'spinal-twist',          name: 'Spinal Twist',           category: 'Stretch', muscleGroup: 'Flexibility', isCustom: false },
  { id: 'calf-stretch',          name: 'Calf Stretch',           category: 'Stretch', muscleGroup: 'Flexibility', isCustom: false },
  { id: 'ankle-circles',         name: 'Ankle Circles',          category: 'Stretch', muscleGroup: 'Flexibility', isCustom: false },
  { id: 'neck-stretch',          name: 'Neck Stretch',           category: 'Stretch', muscleGroup: 'Flexibility', isCustom: false },
]
