import { app } from '../server.ts';

export default async (req: any, res: any) => {
  try {
    // In Vercel, req.url might be just the subpath or the full path
    // We ensure it's logged for debugging
    console.log(`[Vercel API] ${req.method} ${req.url}`);
    
    if (req.url === '/api/ping' || req.url === '/ping') {
      return res.json({ 
        pong: true, 
        from: 'api/index.ts', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL
      });
    }
    
    if (!app) {
      console.error('[Vercel API] Express app is not initialized!');
      return res.status(500).json({ error: 'Express app is not initialized' });
    }
    
    // Express app handles everything else
    // We use the app as a function (standard for Vercel + Express)
    return app(req, res);
  } catch (e: any) {
    console.error('[Vercel API Error]:', e);
    res.status(500).json({ 
      error: 'Vercel API Error', 
      message: e.message,
      path: req.url
    });
  }
};
