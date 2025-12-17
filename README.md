# Peace Shuttle

A satirical Lunar Lander-style game where you pilot "Trumpleton's Peace Shuttle" on a dubious peace mission from Washington DC to Russia.

**Play now:** https://peace-shuttle.fly.dev/

## About the Game

Peace Shuttle is a physics-based flying game with political satire. Navigate your shuttle eastward through 9 countries, collect items, avoid hazards, and manage your fuel carefully to reach your destination: Putino's Palace in Russia.

### The Journey

Launch from **Kennedy Space Center** in Washington DC and fly east through:
- **USA** - Watch out for golf carts carrying classified materials
- **Atlantic Ocean** - Sharks patrol the waters, fishermen trade "fish"
- **United Kingdom** - Cannons fire teacups and double-decker buses
- **France** - Dodge baguettes and croissants
- **Switzerland** - Navigate treacherous mountain peaks
- **Germany** - Pretzels and beer fly at you
- **Poland** - Pierogis are weaponized
- **Russia** - Your final destination awaits

### Features

- **Physics-based flight** - Thrust, rotate, and land carefully
- **Dynamic weather** - Rain, wind, and lightning storms
- **Trading system** - Collect items and trade them for fuel at landing pads
- **Multiple game modes** - Single player, 2-player VS, and Dogfight (first to 10 kills)
- **33 achievements** - From "First Contact" to "Trophy Hunter"
- **Country-specific music** - Dynamic soundtrack changes as you travel
- **Destructible enemies** - Cannons, biplanes, sharks, and more
- **Power-ups** - Speed boosts, cannon bribes, and fuel pickups
- **Global highscores** - Compete for the top spot

## Controls

### Player 1 (Arrow Keys)
| Key | Action |
|-----|--------|
| UP | Thrust |
| LEFT/RIGHT | Rotate |
| SPACE | Toggle landing legs |
| C | Drop bomb (food item) |

### Player 2 (WASD)
| Key | Action |
|-----|--------|
| W | Thrust |
| A/D | Rotate |
| E | Toggle landing legs |
| S | Drop bomb |

### Global
| Key | Action |
|-----|--------|
| 1 | Single player mode |
| 2 | 2-Player VS mode |
| 3 | Dogfight mode |
| ENTER | Auto-sell items (trading) |
| ESC | Skip trading |

## How to Play

1. **Launch** - Start at Kennedy Space Center with a full tank of fuel
2. **Fly** - Use thrust to fight gravity, rotate to change direction
3. **Collect** - Pick up floating items for trading or bombing
4. **Land** - Extend landing legs (SPACE) and touch down gently on landing pads
5. **Trade** - Exchange collected items for fuel at landing pads
6. **Survive** - Avoid cannons, lightning, and running out of fuel
7. **Win** - Reach Putino's Palace in Russia

### Landing Tips
- **Landing legs must be extended** before touching down
- **Land slowly** - Perfect landings (velocity < 1.25) give +25% fuel bonus
- **Land level** - Keep your shuttle upright (within ~26 degrees of vertical)
- **Crash landings** destroy your shuttle

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Deployment

The game is deployed on [Fly.io](https://fly.io) with:
- **Frontend:** Static files served by nginx
- **Backend:** Node.js/Express API with SQLite database
- **Process manager:** supervisord (runs both nginx and API)

### Prerequisites

1. Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Login: `fly auth login`

### Deploy

```bash
npm run build && fly deploy
```

### First-time setup

If deploying to a new Fly.io app:

```bash
# Create the app
fly launch --name your-app-name --region arn

# Create persistent volume for database (1GB)
fly volumes create scores_data --region arn --size 1

# Scale to 1 machine (SQLite requires single writer)
fly scale count 1 -y

# Deploy
fly deploy
```

### Useful commands

```bash
# Check app status
fly status

# View logs
fly logs

# SSH into the machine
fly ssh console

# Open the app in browser
fly open
```

## Architecture

```
                        Fly.io
  +--------------------------------------------+
  |            Docker Container                |
  |  +----------+      +------------------+    |
  |  |  nginx   | ---> |  Static Files    |    |
  |  |  :8080   |      |  (game build)    |    |
  |  |          |      +------------------+    |
  |  |  /api/*  | ---> +------------------+    |
  |  |          |      |  Node.js API     |    |
  |  +----------+      |    :3000         |    |
  |                    |       |          |    |
  |                    |       v          |    |
  |                    | +------------+   |    |
  |                    | |  SQLite    |   |    |
  |                    | |  /data/    |   |    |
  |                    | +------------+   |    |
  |                    +------------------+    |
  +--------------------------------------------+
                        |
                 Fly.io Volume
                 (persistent)
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scores` | POST | Submit a score |
| `/api/scores/alltime` | GET | Top 10 all time |
| `/api/scores/today` | GET | Top 10 today |
| `/api/scores/week` | GET | Top 10 this week |
| `/api/scores/local` | GET | Top 10 from same IP |

## Tech Stack

- **Game Engine:** Phaser 3 with Matter.js physics
- **Language:** TypeScript
- **Build Tool:** Vite
- **Backend:** Node.js/Express with SQLite
- **Deployment:** Fly.io with Docker
- **Testing:** Vitest

## License

MIT
