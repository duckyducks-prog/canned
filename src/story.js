// ============================================================================
// STORY FILE — this is yours to edit. No code below, just content.
//
// Each can in the room gets its contents from the pool here. The engine
// shuffles placement every run, so don't assume which physical can holds what.
// ============================================================================

// The door code for Round 1. Split across the two fragment notes below.
export const DOOR_CODE = '4719';

// Notes found inside cans. `kind` controls how the engine treats them:
//   'story'    — pure narrative, safe to lose to damage
//   'fragment' — carries part of the door code (text should include it)
//   'hint'     — helps the player narrow the search
export const NOTES = [
  {
    kind: 'fragment',
    text: 'Day 112.\n\nSplit the code like they taught us.\nFirst half: 4 7\n\nThe rest is where the fruit is sweetest.',
  },
  {
    kind: 'fragment',
    text: 'If you are reading this, I am probably wrong about everything.\n\nSecond half: 1 9\n\nDo not trust the meatballs.',
  },
  {
    kind: 'hint',
    text: 'Inventory note, week 3:\nkeep tools where nobody looks.\nNobody ever opens the tuna.',
  },
  {
    kind: 'story',
    text: 'Day 4.\n\nThe hum in the walls is the generator. That is what I keep telling myself.',
  },
  {
    kind: 'story',
    text: 'Day 61.\n\nRan the numbers again. Enough cans for nine years.\nEnough, if it is just me.',
  },
  {
    kind: 'story',
    text: 'Day 90.\n\nHeard knocking today. Three knocks, very polite.\nI did not answer. The pantry does not have a door to knock on.',
  },
];

// Flavor lines when a can just contains food.
export const FOOD_LINES = {
  tomato:   'Tomato soup. Still red. Probably fine.',
  chicken:  'Chicken soup. It sloshes in a way you decide not to think about.',
  corn:     'Corn soup. Sweet, yellow, loyal.',
  peaches:  'Peaches in syrup. A little piece of summer, canned in a bunker.',
  beans:    'Beans. There are always beans.',
  meatballs:'Meatballs. The note said not to trust them.',
  tuna:     'Tuna. Dry. Honest. Judging you.',
};

// What the tools say when found.
export const TOOL_LINES = {
  rock:  'A ROCK, hidden in a can. Someone put it there on purpose.\nStrikes harder — but paper does not survive rocks well.',
  spoon: 'A SPOON, taped under the lid.\n"Nobody ever opens the tuna."\nPry with it — slower hands, cleaner opens.',
};
