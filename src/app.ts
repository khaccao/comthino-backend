import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import publicRoutes from './routes/publicRoutes';
import adminRoutes from './routes/adminRoutes';
import { errorHandler } from './middlewares/errorHandler';

// Load env variables
dotenv.config();

const app = express();

// The app is served behind nginx in Docker, so forwarded headers are expected.
app.set('trust proxy', 1);

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images to be loaded by frontend
  })
);

// CORS configuration
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(
  cors({
    origin: [frontendUrl, 'http://localhost:80', 'http://127.0.0.1'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Request Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Images Static Folder
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const absoluteUploadPath = path.isAbsolute(uploadDir)
  ? uploadDir
  : path.join(__dirname, '../', uploadDir);

// Serve public assets (robots.txt, sitemap.xml, etc.)
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

// Base route test
app.get('/', (req, res) => {
  res.json({ message: 'Com Thi No API is running successfully.' });
});

// Error handling middleware
app.use(errorHandler);

export default app;
