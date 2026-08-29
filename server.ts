import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import authRouter from './server/routes/auth';
import profileRouter from './server/routes/profile';
import careersRouter from './server/routes/careers';
import recommendationsRouter from './server/routes/recommendations';
import roadmapRouter from './server/routes/roadmap';
import projectsRouter from './server/routes/projects';
import scholarshipsRouter from './server/routes/scholarships';
import chatRouter from './server/routes/chat';
import guardianRouter from './server/routes/guardian';
import counselorRouter from './server/routes/counselor';
import escalationsRouter from './server/routes/escalations';
import accountRouter from './server/routes/account';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Next_Path API Server', timestamp: new Date().toISOString() });
  });

  // Mount API v1 Routers
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/profile', profileRouter);
  app.use('/api/v1/careers', careersRouter);
  app.use('/api/v1/recommendations', recommendationsRouter);
  app.use('/api/v1/roadmap', roadmapRouter);
  app.use('/api/v1/projects', projectsRouter);
  app.use('/api/v1/scholarships', scholarshipsRouter);
  app.use('/api/v1/chat', chatRouter);
  app.use('/api/v1/guardian', guardianRouter);
  app.use('/api/v1/counselor', counselorRouter);
  app.use('/api/v1/escalations', escalationsRouter);
  app.use('/api/v1/account', accountRouter);

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Next_Path Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
