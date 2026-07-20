const express = require('express');
const app = require('../dist/index').default;
const { connectDB } = require('../dist/lib/mongodb');

// Database middleware - connect before every request (no-op if already connected)
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error de conexión a la base de datos' });
  }
});

// JSON error handler for Express 5
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

module.exports = async (req, res) => {
  if (Buffer.isBuffer(req.body)) {
    try { req.body = JSON.parse(req.body.toString('utf-8')); } catch (e) { req.body = {}; }
  } else if (!req.body || typeof req.body !== 'object') {
    req.body = {};
  }
  req._body = true;
  await new Promise((resolve) => {
    res.on('finish', resolve);
    res.on('close', resolve);
    app(req, res);
  });
};