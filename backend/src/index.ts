import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import visitRoutes from './routes/visits';
import prescriptionRoutes from './routes/prescriptions';
import userProfileRoutes from './routes/userProfiles';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/* ------------------------------------------------------------------
   🟢 STEP 1: DEFINE ALLOWED FRONTENDS (DEV + CODESPACES + PROD)
------------------------------------------------------------------ */
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",

  // Codespaces frontend (your current setup)
  "https://potential-telegram-r4jj5jxgqr5rcpxj4-5173.app.github.dev",

  // (future production frontend)
  "https://your-domain.com"
];

/* ------------------------------------------------------------------
   🟢 STEP 2: CORS CONFIG (FIXED + SAFE)
------------------------------------------------------------------ */
app.use(cors({
  origin: (origin, callback) => {
    // allow tools like Postman (no origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("❌ Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

/* ------------------------------------------------------------------
   🟢 STEP 3: CORE MIDDLEWARE
------------------------------------------------------------------ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ------------------------------------------------------------------
   🟢 STEP 4: LOGGER
------------------------------------------------------------------ */
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

/* ------------------------------------------------------------------
   🟢 STEP 5: HEALTH CHECK (NO AUTH, NO REDIRECT)
------------------------------------------------------------------ */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'backend',
    timestamp: new Date().toISOString()
  });
});

/* ------------------------------------------------------------------
   🟢 STEP 6: API ROUTES
------------------------------------------------------------------ */
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/user-profiles', userProfileRoutes);

/* ------------------------------------------------------------------
   🟢 STEP 7: 404 HANDLER
------------------------------------------------------------------ */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

/* ------------------------------------------------------------------
   🟢 STEP 8: ERROR HANDLER
------------------------------------------------------------------ */
app.use(errorHandler);

/* ------------------------------------------------------------------
   🟢 STEP 9: START SERVER
------------------------------------------------------------------ */
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});