// Ersetzt die alte Attrappe (backend/tests/rate-limit.test.js hatte elf
// "expect(true).toBe(true)"-Tests, die nie den echten Rate-Limiter
// angefasst haben). Dieser Test baut eine winzige, eigenständige
// Express-App, hängt den ECHTEN authLimiter/apiLimiter aus
// middleware/rateLimiter.js ein und schickt echte HTTP-Requests per
// supertest dagegen - kein Mock, keine Datenbank nötig, weil die
// Rate-Limiter selbst keine DB brauchen.
//
// WICHTIG: authLimiter/apiLimiter sind Singletons mit eigenem internen
// Zähler pro Prozess (keyed per IP, alle Test-Requests laufen über
// dieselbe lokale Adresse). Ohne jest.resetModules() vor JEDEM Test würden
// sich die 15-Minuten-Zähler über mehrere it()-Blöcke hinweg aufsummieren
// und die Tests würden sich gegenseitig verfälschen - deshalb wird das
// Middleware-Modul hier für jeden Test frisch geladen.
const express = require('express');
const request = require('supertest');

function buildApp(limiter) {
  const app = express();
  app.get('/test', limiter, (req, res) => res.json({ ok: true }));
  return app;
}

function loadFreshLimiters() {
  jest.resetModules();
  return require('../../src/middleware/rateLimiter');
}

describe('authLimiter (5 Versuche / 15 Minuten - Brute-Force-Schutz Login/Registrierung)', () => {
  it('lässt die ersten 5 Anfragen durch', async () => {
    const { authLimiter } = loadFreshLimiters();
    const app = buildApp(authLimiter);
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    }
  });

  it('blockiert die 6. Anfrage im selben Zeitfenster mit 429', async () => {
    const { authLimiter } = loadFreshLimiters();
    const app = buildApp(authLimiter);
    for (let i = 0; i < 5; i++) {
      await request(app).get('/test');
    }
    const res = await request(app).get('/test');
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/Anmeldeversuche/);
  });

  it('sendet RateLimit-Header, damit das Frontend/Client den Zustand kennt', async () => {
    const { authLimiter } = loadFreshLimiters();
    const app = buildApp(authLimiter);
    const res = await request(app).get('/test');
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
  });
});

describe('apiLimiter (200 Anfragen / 15 Minuten - allgemeiner Basisschutz)', () => {
  it('lässt normale Nutzung anstandslos durch', async () => {
    const { apiLimiter } = loadFreshLimiters();
    const app = buildApp(apiLimiter);
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-limit']).toBe('200');
  });
});
