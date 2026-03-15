export default (req: any, res: any) => {
  res.json({ pong: true, date: new Date().toISOString() });
};
