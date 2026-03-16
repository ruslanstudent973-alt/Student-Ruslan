
export default async (req: any, res: any) => {
  console.log(`[Vercel API] Request: ${req.method} ${req.url}`);
  try {
    if (req.url === '/api/ping' || req.url === '/ping') {
      return res.json({ 
        pong: true, 
        from: 'api/index.ts', 
        timestamp: new Date().toISOString(),
        vercel: !!process.env.VERCEL,
        env: process.env.NODE_ENV
      });
    }
    
    console.log(`[Vercel API] Importing app...`);
    const { app } = await import('../src/app');
    
    if (!app) {
      console.error('[Vercel API] App import failed: app is undefined');
      return res.status(500).json({ error: 'Express app is not initialized' });
    }
    
    console.log(`[Vercel API] Passing request to Express app`);
    return app(req, res);
  } catch (e: any) {
    console.error('[Vercel API Error]:', e);
    res.status(500).json({ 
      error: 'Vercel API Error', 
      message: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined,
      path: req.url
    });
  }
};
