import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import scoresRouter from './routes/scores.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Fly.io (to get real IP)
app.set('trust proxy', 1);

// CORS - allow game origin
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'https://peace-shuttle.fly.dev',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
}));

app.use(express.json());

// Rate limiting for score submissions
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 submissions per hour per IP
  message: { error: 'Too many score submissions, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for reads (more generous)
const readLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters
app.use('/scores', readLimiter);
app.post('/scores', submitLimiter);

// Routes
app.use('/scores', scoresRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Score API server running on port ${PORT}`);
});
