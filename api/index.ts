import { app } from '../server.ts';

export default async (req: any, res: any) => {
  try {
    if (req.url === '/api/ping' || req.url === '/ping') {
      return res.json({ pong: true, from: 'api/index.ts', timestamp: new Date().toISOString() });
    }
    
    // Express app handles everything else
    return app(req, res);
  } catch (e: any) {
    console.error('[Vercel API Error]:', e);
    res.status(500).json({ 
      error: 'API Error', 
      message: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }
};
