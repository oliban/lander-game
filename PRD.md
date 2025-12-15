# Peace Shuttle - Product Requirements Document

**Purpose:** This document captures ALL game functionality for verification after refactoring.
**Version:** 1.0
**Last Updated:** 2025-12-15

---

## Table of Contents
1. [Game Overview](#1-game-overview)
2. [Controls](#2-controls)
3. [Physics & Movement](#3-physics--movement)
4. [Collectibles](#4-collectibles)
5. [Power-Ups](#5-power-ups)
6. [Enemies & Hazards](#6-enemies--hazards)
7. [Landing Mechanics](#7-landing-mechanics)
8. [Trading System](#8-trading-system)
9. [Weather System](#9-weather-system)
10. [Visual Effects](#10-visual-effects)
11. [Achievements](#11-achievements)
12. [Game Modes](#12-game-modes)
13. [Countries & Terrain](#13-countries--terrain)
14. [Audio System](#14-audio-system)
15. [UI Scenes](#15-ui-scenes)

---

## 1. Game Overview

Peace Shuttle is a satirical Lunar Lander-style game where players pilot a "Peace Shuttle" from Washington DC to Russia, collecting items, destroying buildings, and managing fuel while avoiding hazards.

### Core Loop
1. Launch from Kennedy Space Center
2. Navigate through countries (USA → Atlantic → UK → France → Switzerland → Germany → Poland → Russia)
3. Collect items for fuel/trading
4. Land on pads to refuel via trading
5. Avoid/destroy enemies
6. Reach Putino's Palace in Russia

### Win Condition
- Land at final destination (Putino's Palace, x=25000)
- Optional: Deliver Peace Medal for achievement

### Lose Conditions
- Crash into terrain at high velocity
- Crash into water
- Get hit by projectile
- Get struck by lightning
- Fall into void (below terrain)
- Run out of fuel and crash

---

## 2. Controls

### Player 1 (Arrow Keys)
| Key | Action |
|-----|--------|
| UP | Thrust |
| LEFT | Rotate counter-clockwise |
| RIGHT | Rotate clockwise |
| SPACE | Toggle landing legs |
| C | Drop bomb (food item) |

### Player 2 (WASD)
| Key | Action |
|-----|--------|
| W | Thrust |
| A | Rotate counter-clockwise |
| D | Rotate clockwise |
| E | Toggle landing legs |
| S | Drop bomb |

### Global Controls
| Key | Action |
|-----|--------|
| 1 | Single player mode |
| 2 | 2-Player VS mode |
| 3 | Dogfight mode (first to 10 kills) |
| 6 | Debug mode (P1 unlimited fuel) |
| ENTER | Auto-sell all items (trading) |
| ESC | Skip trading |

---

## 3. Physics & Movement

### Core Physics Values
| Parameter | Value | Notes |
|-----------|-------|-------|
| Gravity | 0.45 | Applied per frame |
| Thrust Power | 0.006 | Base acceleration |
| Rotation Speed | 0.04 rad/frame | 2× when not thrusting |
| Mass | 5 | Ship inertia |
| Friction (Air) | 0.02 | Dampening |
| Bounce | 0.7 | Ship-to-ship collisions |
| Angular Damping | 0.95 | Rotation slowdown |

### Fuel System
| Parameter | Value |
|-----------|-------|
| Initial Fuel | 100 units |
| Max Fuel | 100 units |
| Consumption Rate | 0.15/frame (while thrusting) |
| Legs Extended Penalty | 1.2× consumption (0.18/frame) |
| Thrust Reduction (legs out) | 0.7× thrust power |

### Landing Legs Effect
- **Drag Multiplier:** 1.5× (slower movement)
- **Thrust Reduction:** 30% less thrust
- **Fuel Consumption:** 20% increase

---

## 4. Collectibles

### Bomb Items (Droppable, Not Tradeable)
| Item | Fuel Value | Rarity | Color |
|------|-----------|--------|-------|
| BURGER | 0 | 0.15 | 0xFF6B35 |
| HAMBERDER | 0 | 0.12 | 0xFF6B35 |
| DIET_COKE | 0 | 0.12 | 0xFF6B35 |
| TRUMP_STEAK | 0 | 0.05 | 0xFF6B35 |
| VODKA | 0 | 0.05 | 0xFF6B35 (Russia only) |

### Standard Tradeable Items
| Item | Fuel Value | Rarity | Color |
|------|-----------|--------|-------|
| DOLLAR | 25 | 0.10 | 0x228B22 |
| HAIR_SPRAY | 35 | 0.07 | 0xFFD700 |
| TWITTER | 50 | 0.06 | 0x1DA1F2 |
| TAN_SUIT | 40 | 0.02 | 0xD2B48C |

### Rare Tradeable Items
| Item | Fuel Value | Rarity | Color |
|------|-----------|--------|-------|
| CASINO_CHIP | Random* | 0.04 | 0x9932CC |
| MAGA_HAT | 100 | 0.03 | 0xFF0000 |
| NFT | 0 | 0.04 | 0xFF69B4 |
| BITCOIN | 80 | 0.03 | 0xF7931A |
| CLASSIFIED_DOCS | 120 | 0.02 | 0x4169E1 |
| GOLDEN_TOILET | 200 | 0.01 | 0xFFD700 |

*Casino Chip Value Distribution:
- 80%: 10-74 fuel
- 15%: 75-199 fuel
- 4%: 200-399 fuel
- 1%: 400-500 fuel (jackpot)

### Russian Zone Items (x >= 12000, 3× spawn rate)
| Item | Fuel Value | Rarity | Color |
|------|-----------|--------|-------|
| MATRYOSHKA | 60 | 0.05 | 0xFF6347 |
| OLIGARCH_GOLD | 150 | 0.05 | 0xFFD700 |

### Special Spawn Items
| Item | Fuel Value | Source | Color |
|------|-----------|--------|-------|
| EPSTEIN_FILES | 40 | Golf Cart (on destroy) | 0x8B0000 |
| FISH_PACKAGE | 100 | Fisher Boat (15% chance) | 0x4682B4 |
| Propaganda Items | 50 | Biplane banners | Various |

---

## 5. Power-Ups

### COVFEFE (Fuel Boost)
- **Effect:** +10% of max fuel instantly
- **Duration:** Instant (one-time)
- **Rarity:** 0.08
- **Color:** 0x8B4513

### TRUMP_TOWER (Cannon Bribe)
- **Effect:** All cannons stop firing
- **Duration:** 10 seconds
- **Visual:** Gold bribe overlay on screen
- **Rarity:** 0.01
- **Color:** 0xFFD700

### RED_TIE (Speed Boost)
- **Effect:** 2× thrust multiplier
- **Duration:** 6 seconds
- **Visual:** Red tie trails behind shuttle, extended chemtrails
- **Rarity:** 0.01
- **Color:** 0xDC143C

---

## 6. Enemies & Hazards

### Cannons

**Behavior:**
- Fire rate: 2000ms (2 seconds)
- Projectile speed: 5 px/frame
- Damage: Instant death on hit
- Stops firing when bribed

**Projectiles by Country:**
| Country | Projectile Types |
|---------|-----------------|
| UK | teacup, doubledecker, blackcab, guardhat |
| France | baguette, wine, croissant |
| Switzerland | cheese, chocolate, watch, cuckoo, fondue |
| Germany | pretzel, beer |
| Poland | pierogi, pottery |
| Russia | matryoshka, balalaika, borscht, samovar |

**Collision Bounds:** 56×40px
**Point Value:** 200 points

### Biplane (Propaganda Plane)

**Spawn Conditions:**
- Spawns when entering new country
- 400px off-screen from country center
- Y: 100-140px (Switzerland: -1200px for mountains)

**Behavior:**
- Speed: 2.5 px/frame
- Bobbing: sin(time×0.003)×3 px
- Tows propaganda banner

**Point Value:** 1000 points
**Collision Bounds:** 70×35px

### Shark

**Spawn:** 80-120px below water surface in Atlantic

**States:**
| State | Trigger | Speed |
|-------|---------|-------|
| Alive | Default | 1.5 px/frame |
| Coughing | Pollution >= 0.3 | 0.75 px/frame |
| Dead | Pollution >= 0.6 | 0 (floats) |

**Food Chase:** Speed × 1.3 = 1.95 px/frame
**Detection Range:** 200px
**Point Value:** 500 points
**Collision Bounds:** 80×30px

### Fisher Boat

**Features:**
- Can be landed on (stable platform)
- 15% chance has contraband (FISH_PACKAGE)
- Bobs with waves

**Deck Bounds:** 64×8px
**Point Value:** 300 points

### Golf Cart

**Behavior:**
- Patrol speed: 0.5 px/frame
- Flee speed: 2.5 px/frame (when shuttle within 300px)
- Flee duration: 2000ms

**On Destroy:** Spawns 3 Epstein Files
**Point Value:** 500 points

### Lightning

**Conditions:**
- Only during stormy weather
- Check interval: 500ms
- Cloud cooldown: 5-10 seconds

**Warning System:**
1. Shuttle within 100px horizontal of storm cloud
2. 30% chance to trigger warning
3. Yellow flash warning (400ms)
4. Strike delay: 2-3 seconds
5. Escape if move 150px away or land

**Damage:** Instant death

### Oil Tower

**Behavior:**
- Passive (oil spurt animation)
- Explodes when bombed
- Creates large oil spill

**Point Value:** 100 points
**Collision Bounds:** 36×55px

---

## 7. Landing Mechanics

### Requirements for Safe Landing
1. Landing legs MUST be extended
2. Angle within 0.45 radians (~26°) of vertical
3. Velocity below crash threshold

### Landing Quality
| Quality | Velocity | Fuel Bonus |
|---------|----------|------------|
| PERFECT | ≤1.25 | +25% |
| GOOD | ≤3.5 | +10% |
| ROUGH | 3.5-15.0 | None |
| CRASH | >15.0 | Death |

### Crash Conditions
- Velocity > 15.0
- Landing legs not deployed
- Angle too steep (>0.45 rad)
- Max safe velocity: 5.0 (base threshold)

---

## 8. Trading System

### How Trading Works
1. Land on landing pad → Trading scene opens
2. Select items from inventory
3. Fuel gained = base_fuel_value × landing_bonus
4. Fuel capped at max (100)

### Landing Bonuses
| Landing | Multiplier |
|---------|------------|
| Perfect | 1.25× |
| Good | 1.10× |
| Rough | 1.00× |

### Auto-Sell
- Press ENTER to sell cheapest items first
- Fills remaining fuel capacity

### Casino Chips
- Show as "???" until traded
- Each has individual random value (10-500)
- Values weighted (see Section 4)

---

## 9. Weather System

### Weather States
| State | Probability | Clouds | Storm Chance |
|-------|-------------|--------|--------------|
| Clear | 25% | 15 | 0% |
| Cloudy | 15% | 25 | 15% |
| Stormy | 10% | 35 | 40% |
| Unstable | 50% | 30 | 25% |

### Unstable Weather
- Transitions every 15-20 seconds
- 40% increase intensity
- 40% decrease intensity
- 20% stay same

### Rain Intensity
| Intensity | Drop Count | Speed |
|-----------|-----------|-------|
| None | 0 | - |
| Light | 150 | 7-12 px/s |
| Medium | 300 | 10-18 px/s |
| Heavy | 500 | 14-24 px/s |

### Wind
- Range: -1.0 to +1.0 (negative=west)
- Change interval: 20-30 seconds
- Affects rain angle and debris

---

## 10. Visual Effects

### Explosion Effects Summary
| Object | Flash Radius | Debris Count | Duration |
|--------|-------------|--------------|----------|
| Cannon | 45px | 8 | 400ms |
| Biplane | 45px | 20 | 350ms |
| Fisher Boat | 50px | 12 | 500ms |
| Shark | 30px | 8 | 800ms |
| Golf Cart | 45px | 15 | 400ms |
| Oil Tower | 30px | 6 | 400ms |
| Building | 40px | 60 | 1200ms |
| Shuttle | 45px | 15 | 500ms |

### Scorch Marks
- Max marks: 150
- Creation: Every 50ms while thrusting
- Crater radius: 35-50px

### Thruster Particles
- Speed: 100-220 px/s (based on shuttle speed)
- Lifespan: 500-1300ms
- Colors: 0xFF6600, 0xFF8800, 0xFFAA00, 0xFFCC00

### Chemtrails
- Lifespan: 15 seconds
- Colors: 0x555555, 0x666666, 0x777777, 0x444444

---

## 11. Achievements

### Core Gameplay (6)
| ID | Name | Condition |
|----|------|-----------|
| first_contact | First Contact | Land on any pad |
| smooth_operator | Smooth Operator | Perfect landing (vel ≤1.25) |
| world_traveler | World Traveler | Visit ≥7 countries |
| mission_complete | Welcome to Russia | Reach final pad |
| peacekeeper | Peacekeeper | Deliver Peace Medal |
| pacifist | Pacifist | Win with 0 destruction |

### Destruction (11)
| ID | Name | Condition |
|----|------|-----------|
| collateral_damage | Collateral Damage | Destroy 1+ building |
| wrecking_ball | Wrecking Ball | Destroy ≥25 buildings |
| cannon_fodder | Cannon Fodder | Destroy ≥5 cannons |
| fisher_of_men | Fisher of Men | Destroy fisher boat |
| fore | Fore! | Destroy golf cart |
| red_baron | Red Baron | Destroy biplane (hidden) |
| pablos_parking | Pablo's Parking | Land on boat (hidden) |
| shark_hunter | Shark Hunter | Hit shark with bomb |
| greenland_deal | Greenland Deal | Deliver ice to Washington |
| vodka_on_the_rocks | Vodka on the Rocks | Deliver ice to Russia |
| climate_change | Climate Change | Destroy Greenland ice |

### Deaths & Mishaps (9)
| ID | Name | Condition |
|----|------|-----------|
| splashdown | Splashdown | Die in water |
| duck_hunt | Duck Hunt | Killed by duck projectile |
| lost_in_space | Lost in Space | Fall into void |
| gone_in_60_seconds | Gone in 60 Seconds | Die within 60 seconds |
| frequent_flyer | Frequent Flyer | Total deaths ≥10 |
| running_on_empty | Running on Empty | Crash with 0 fuel |
| thunderstruck | Thunderstruck | Hit by lightning |
| singing_in_the_rain | Singing in the Rain | Reach Russia in rain |
| puskas_award | Puskás Award | Bounce tombstone 3× (hidden) |

### 2-Player Combat (3)
| ID | Name | Condition |
|----|------|-----------|
| first_blood | First Blood | Get first kill |
| ace_pilot | Ace Pilot | Get ≥5 kills |
| domination | Domination | Win with ≥5 kill lead |

### Meta/Collection (3)
| ID | Name | Condition |
|----|------|-----------|
| high_roller | High Roller | Casino chips worth ≥500 |
| collector | Collector | Discover all item types |
| trophy_hunter | Trophy Hunter | Unlock all achievements |

### Achievement Tiers
| Tier | Color |
|------|-------|
| Bronze | 0xCD7F32 |
| Silver | 0xC0C0C0 |
| Gold | 0xFFD700 |
| Platinum | 0xE5E4E2 |

---

## 12. Game Modes

### Single Player (Press 1)
- Standard gameplay
- Navigate USA → Russia
- Trade at landing pads

### 2-Player VS (Press 2)
- Both players share world
- Can collide/bomb each other
- Separate fuel/inventory

### Dogfight (Press 3)
- First to 10 kills wins
- Quick respawn (1500ms)
- Auto landing gear within 150px of pad

---

## 13. Countries & Terrain

### Country Order (West to East)
| Country | Start X | Music |
|---------|---------|-------|
| Washington DC | 0 | usa |
| Atlantic Ocean | 2000 | ocean |
| United Kingdom | 4000 | uk |
| France | 6000 | france |
| Switzerland | 8000 | switzerland |
| Germany | 10000 | germany |
| Poland | 12000 | poland |
| Russia | 14000 | russia |

### Terrain Features
- Procedurally generated heights
- Swiss mountains (highest peaks)
- Atlantic ocean (water hazard)
- Country-specific decorations
- Landing pads per country

### Landing Pads
| Location | X Position |
|----------|------------|
| Kennedy Space Center | ~200 |
| Various mid-game | Per country |
| Putino's Palace | ~25000 |

---

## 14. Audio System

### Music System
- Country-based background music
- Crossfade duration: 1500ms
- Auto-switches when entering new country

### Sound Effects
- Thrust sound (looping while thrusting)
- Explosion sounds
- Pickup sounds
- Landing sounds
- Achievement unlock chime (procedurally generated)

---

## 15. UI Scenes

### Boot Scene
- Asset loading
- Progress bar
- Auto-transition to Menu

### Menu Scene
- Start buttons (1P, 2P, Dogfight)
- Mission briefing
- Stats panel
- Collection/Achievement buttons

### Game Scene
- Main gameplay
- HUD overlay (UIScene)

### UI Scene (HUD)
- Fuel bar
- Inventory display
- Country indicator
- Minimap
- Kill counter (dogfight)

### Trading Scene
- Item selection
- Fuel preview
- Auto-sell button

### Game Over Scene
- Death/Victory message
- Score breakdown
- Restart buttons

### Collection Scene
- Discovered items grid
- Progress counter
- Scrollable

### Achievements Scene
- Achievement list
- Unlock status
- Scrollable

---

## Verification Checklist

Use this checklist after refactoring to verify all systems work:

### Controls
- [ ] P1 arrow keys work
- [ ] P2 WASD works
- [ ] Landing legs toggle
- [ ] Bomb dropping works
- [ ] Mode switching (1, 2, 3 keys)

### Physics
- [ ] Gravity pulls shuttle down
- [ ] Thrust accelerates correctly
- [ ] Rotation at correct speed
- [ ] Fuel consumption accurate
- [ ] Legs affect drag/thrust

### Collectibles
- [ ] All item types spawn
- [ ] Correct fuel values
- [ ] Russian items spawn in Russia
- [ ] Casino chip randomization works

### Power-Ups
- [ ] Covfefe gives fuel boost
- [ ] Trump Tower bribes cannons
- [ ] Red Tie gives speed boost

### Enemies
- [ ] Cannons fire at correct rate
- [ ] Biplane spawns per country
- [ ] Sharks have 3 states
- [ ] Golf cart flees
- [ ] Lightning system works

### Landing
- [ ] Perfect/Good/Rough detection
- [ ] Crash detection
- [ ] Trading opens on land

### Weather
- [ ] All 4 states work
- [ ] Unstable transitions
- [ ] Rain intensity varies
- [ ] Wind affects debris

### Visual Effects
- [ ] All explosions look correct
- [ ] Scorch marks appear
- [ ] Thruster particles work
- [ ] Chemtrails persist

### Achievements
- [ ] All triggers work
- [ ] Popup appears
- [ ] Persistence (localStorage)

### Audio
- [ ] Music changes per country
- [ ] Crossfade smooth
- [ ] Sound effects play

---

**End of PRD**
