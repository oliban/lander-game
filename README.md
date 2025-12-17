# Peace Shuttle

A Phaser 3 game where you pilot a shuttle on a peace mission to Russia.

**Play now:** https://peace-shuttle.fly.dev/

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
┌─────────────────────────────────────────────┐
│                  Fly.io                     │
│  ┌────────────────────────────────────────┐ │
│  │            Docker Container            │ │
│  │  ┌──────────┐      ┌────────────────┐  │ │
│  │  │  nginx   │ ───▶ │  Static Files  │  │ │
│  │  │  :8080   │      │  (game build)  │  │ │
│  │  │          │      └────────────────┘  │ │
│  │  │  /api/*  │ ───▶ ┌────────────────┐  │ │
│  │  │          │      │  Node.js API   │  │ │
│  │  └──────────┘      │    :3000       │  │ │
│  │                    │       │        │  │ │
│  │                    │       ▼        │  │ │
│  │                    │ ┌───────────┐  │  │ │
│  │                    │ │  SQLite   │  │  │ │
│  │                    │ │  /data/   │  │  │ │
│  │                    │ └───────────┘  │  │ │
│  │                    └────────────────┘  │ │
│  └────────────────────────────────────────┘ │
│                     │                       │
│              Fly.io Volume                  │
│              (persistent)                   │
└─────────────────────────────────────────────┘
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scores` | POST | Submit a score |
| `/api/scores/alltime` | GET | Top 10 all time |
| `/api/scores/today` | GET | Top 10 today |
| `/api/scores/week` | GET | Top 10 this week |
| `/api/scores/local` | GET | Top 10 from same IP |
