export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  tier: AchievementTier;
  hidden?: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Core Gameplay (6)
  {
    id: 'first_contact',
    name: 'First Contact',
    description: 'Land successfully for the first time',
    tier: 'bronze',
  },
  {
    id: 'smooth_operator',
    name: 'Smooth Operator',
    description: 'Perform a perfect landing',
    tier: 'silver',
  },
  {
    id: 'world_traveler',
    name: 'World Traveler',
    description: 'Visit all countries in one game',
    tier: 'gold',
  },
  {
    id: 'mission_complete',
    name: 'Welcome to Яussia',
    description: "Reach Putino's Palace - Dasvidaniya, freedomski!",
    tier: 'silver',
  },
  {
    id: 'peacekeeper',
    name: 'Peacekeeper',
    description: 'Deliver the Peace Medal',
    tier: 'gold',
  },
  {
    id: 'pacifist',
    name: 'Pacifist',
    description: 'Win without destroying any buildings',
    tier: 'gold',
  },

  // Destruction (5)
  {
    id: 'collateral_damage',
    name: 'Collateral Damage',
    description: 'Destroy your first building',
    tier: 'bronze',
  },
  {
    id: 'wrecking_ball',
    name: 'Wrecking Ball',
    description: 'Destroy 25 buildings in one game',
    tier: 'silver',
  },
  {
    id: 'cannon_fodder',
    name: 'Cannon Fodder',
    description: 'Destroy 5 cannons in one game',
    tier: 'bronze',
  },
  {
    id: 'fisher_of_men',
    name: 'Fisher of Men',
    description: 'Sink a fishing boat',
    tier: 'bronze',
  },
  {
    id: 'fore',
    name: 'Fore!',
    description: 'Destroy a golf cart',
    tier: 'bronze',
  },
  {
    id: 'red_baron',
    name: 'Red Baron',
    description: 'Shoot down the propaganda biplane',
    tier: 'silver',
    hidden: true,
  },
  {
    id: 'pablos_parking',
    name: "Pablo's Parking",
    description: 'Land on the fishing boat',
    tier: 'silver',
    hidden: true,
  },
  {
    id: 'shark_hunter',
    name: 'Shark Hunter',
    description: 'Hit a shark with a bomb',
    tier: 'bronze',
  },
  {
    id: 'greenland_deal',
    name: 'Greenland Deal',
    description: 'Deliver Greenland to Washington',
    tier: 'silver',
  },
  {
    id: 'vodka_on_the_rocks',
    name: 'Vodka on the Rocks',
    description: "Deliver Greenland to Putino's Palace",
    tier: 'silver',
  },
  {
    id: 'climate_change',
    name: 'Climate Change',
    description: 'Destroy Greenland with a bomb',
    tier: 'bronze',
  },
  {
    id: 'sonic_boom',
    name: 'Sonic Boom',
    description: 'Break the sound barrier',
    tier: 'silver',
  },

  // Deaths & Mishaps (5)
  {
    id: 'splashdown',
    name: 'Splashdown',
    description: 'Die by crashing into water',
    tier: 'bronze',
  },
  {
    id: 'duck_hunt',
    name: 'Duck Hunt',
    description: 'Get killed by a sitting duck',
    tier: 'bronze',
  },
  {
    id: 'lost_in_space',
    name: 'Lost in Space',
    description: 'Fall into the void',
    tier: 'bronze',
  },
  {
    id: 'gone_in_60_seconds',
    name: 'Gone in 60 Seconds',
    description: 'Die within the first minute',
    tier: 'bronze',
  },
  {
    id: 'frequent_flyer',
    name: 'Frequent Flyer',
    description: 'Die 10 times',
    tier: 'silver',
  },
  {
    id: 'running_on_empty',
    name: 'Running on Empty',
    description: 'Crash with zero fuel',
    tier: 'bronze',
  },
  {
    id: 'thunderstruck',
    name: 'Thunderstruck',
    description: 'Get struck by lightning',
    tier: 'bronze',
  },
  {
    id: 'singing_in_the_rain',
    name: 'Singing in the Rain',
    description: 'Reach Russia in heavy rain',
    tier: 'silver',
  },
  {
    id: 'puskas_award',
    name: 'Puskás Award',
    description: "Bounce a tombstone 3 times - hey you're Leo Messi!",
    tier: 'gold',
  },

  // 2-Player Combat (3)
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Get your first kill in 2-player mode',
    tier: 'bronze',
  },
  {
    id: 'ace_pilot',
    name: 'Ace Pilot',
    description: 'Get 5 kills in one 2-player session',
    tier: 'silver',
  },
  {
    id: 'domination',
    name: 'Domination',
    description: 'Win with 5+ kill lead',
    tier: 'gold',
  },

  // Meta (3)
  {
    id: 'high_roller',
    name: 'High Roller',
    description: 'Collect casino chips worth 500+ total',
    tier: 'silver',
  },
  {
    id: 'collector',
    name: 'Collector',
    description: 'Discover all collectible items',
    tier: 'gold',
  },
  {
    id: 'trophy_hunter',
    name: 'Trophy Hunter',
    description: 'Unlock all other achievements',
    tier: 'platinum',
  },
];

export const TIER_COLORS: Record<AchievementTier, number> = {
  bronze: 0xcd7f32,
  silver: 0xc0c0c0,
  gold: 0xffd700,
  platinum: 0xe5e4e2,
};

export const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: 'BRONZE',
  silver: 'SILVER',
  gold: 'GOLD',
  platinum: 'PLATINUM',
};
