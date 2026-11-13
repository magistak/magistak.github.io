/**
 * hellyeah VPS Backend Server (v1.1.0)
 * - Serves static frontend files from ./public (or root)
 * - Provides persistent JSON storage in ./data/storage.json via GET /api/load and POST /api/save
 * - Provides Google OAuth 2.0 authentication scaffolding via Passport (/api/auth/google, /api/auth/google/callback, /api/auth/status)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

try {
  require('dotenv').config();
} catch (e) {}

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
const STORAGE_FILE = path.join(DATA_DIR, 'storage.json');
const PUBLIC_DIR = fs.existsSync(path.join(__dirname, 'public')) ? path.join(__dirname, 'public') : __dirname;

// Ensure data/ directory and storage.json exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(STORAGE_FILE)) {
  fs.writeFileSync(
    STORAGE_FILE,
    JSON.stringify(
      {
        version: '1.1.0',
        updatedAt: new Date().toISOString(),
        chatMessages: [],
        settings: {},
        items: []
      },
      null,
      2
    )
  );
}

function readStorage() {
  try {
    const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { version: '1.1.0', updatedAt: new Date().toISOString(), chatMessages: [], settings: {}, items: [] };
  }
}

function writeStorage(patch) {
  const current = readStorage();
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(next, null, 2));
  return next;
}

// Try loading Express + Passport if installed in node_modules
let express = null;
try {
  express = require('express');
} catch (e) {
  express = null;
}

if (express) {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // CORS support so frontend can also connect from external domains if configured
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // Google OAuth 2.0 + Session setup (Passport)
  const oauthConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  try {
    const session = require('express-session');
    const passport = require('passport');
    const GoogleStrategy = require('passport-google-oauth20').Strategy;

    app.set('trust proxy', 1);
    app.use(
      session({
        secret: process.env.SESSION_SECRET || 'hellyeah-session-secret-change-in-prod',
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          maxAge: 30 * 24 * 60 * 60 * 1000
        }
      })
    );
    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));

    if (oauthConfigured) {
      passport.use(
        new GoogleStrategy(
          {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
          },
          (accessToken, refreshToken, profile, done) => {
            const userRecord = {
              id: profile.id,
              displayName: profile.displayName,
              email: profile.emails?.[0]?.value || null,
              avatar: profile.photos?.[0]?.value || null
            };
            return done(null, userRecord);
          }
        )
      );

      app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
      app.get(
        '/api/auth/google/callback',
        passport.authenticate('google', { failureRedirect: '/?auth=failed' }),
        (req, res) => {
          res.redirect('/?auth=success');
        }
      );
    } else {
      app.get('/api/auth/google', (req, res) => {
        res.status(501).json({
          ok: false,
          error: 'Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) not yet set in .env'
        });
      });
    }

    app.post('/api/auth/logout', (req, res) => {
      if (typeof req.logout === 'function') {
        req.logout(() => res.json({ ok: true }));
      } else {
        res.json({ ok: true });
      }
    });
  } catch (err) {
    // Passport optional fallback if only express is installed
  }

  app.get('/api/auth/status', (req, res) => {
    res.json({
      ok: true,
      authenticated: Boolean(req.user),
      user: req.user || null,
      oauthConfigured
    });
  });

  // Persistent Data Storage Endpoints (/api/load and /api/save)
  app.get('/api/load', (req, res) => {
    const data = readStorage();
    res.json({
      ok: true,
      backend: 'express-vps',
      user: req.user || null,
      data
    });
  });

  app.post('/api/save', (req, res) => {
    const payload = req.body || {};
    const updated = writeStorage(payload);
    res.json({
      ok: true,
      savedAt: updated.updatedAt,
      data: updated
    });
  });

  // Static frontend files
  app.use(express.static(PUBLIC_DIR));
  app.get('*', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[hellyeah] Express VPS server listening on http://0.0.0.0:${PORT}`);
  });
} else {
  // Built-in Node HTTP fallback (zero external dependencies required)
  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png'
  };

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    if (pathname === '/api/load' && req.method === 'GET') {
      const data = readStorage();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, backend: 'node-vps', user: null, data }));
    }

    if (pathname === '/api/save' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const updated = writeStorage(payload);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, savedAt: updated.updatedAt, data: updated }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });
      return;
    }

    if (pathname === '/api/auth/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          ok: true,
          authenticated: false,
          user: null,
          oauthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
        })
      );
    }

    if (pathname === '/api/auth/google') {
      res.writeHead(501, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          ok: false,
          error: 'Run npm install and configure GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env to enable Google OAuth redirect.'
        })
      );
    }

    // Serve static files
    const cleanPath = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.join(PUBLIC_DIR, path.normalize(cleanPath).replace(/^(\.\.[\/\\])+/, ''));
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      return fs.createReadStream(filePath).pipe(res);
    }

    const indexFallback = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexFallback)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(indexFallback).pipe(res);
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[hellyeah] VPS server listening on http://0.0.0.0:${PORT}`);
  });
}
