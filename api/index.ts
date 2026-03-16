import { app } from '../src/app';

export default async (req: any, res: any) => {
  try {
    if (req.url === '/api/ping' || req.url === '/ping') {
      return res.json({ 
        pong: true, 
        from: 'api/index.ts', 
        timestamp: new Date().toISOString(),
        vercel: !!process.env.VERCEL
      });
    }
    
    if (!app) {
      return res.status(500).json({ error: 'Express app is not initialized' });
    }
    
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
