function register(app) {
  app.get('/api/custom/health', (req, res) => {
    res.json({ ok: true, namespace: 'custom', feature: 'health' });
  });
}

module.exports = {
  register,
};
