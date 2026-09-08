// httpOnly-Cookie-Handling für die drei getrennten Login-Identitäten
// (Kind/Eltern/Lehrkraft, siehe Kommentar am Dateianfang von cookies.js -
// Sicherheitsaudit Mittel #16). Der wichtigste Verhaltensunterschied ist
// production vs. dev (secure/sameSite) - ein Fehler hier würde entweder das
// Cookie in production durch fehlendes "Secure" angreifbar machen, oder es
// in der lokalen Entwicklung per SameSite=None kaputt machen (Browser
// verlangen Secure für SameSite=None).

describe('cookies', () => {
  const ORIGINAL_ENV = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_ENV;
    jest.resetModules();
  });

  function fakeRes() {
    const calls = [];
    return { res: { cookie: (name, value, opts) => calls.push({ name, value, opts }) }, calls };
  }

  it('setzt in production Secure=true und SameSite=None', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { setAuthCookie } = require('../../src/utils/cookies');
    const { res, calls } = fakeRes();

    setAuthCookie(res, 'tok-123');

    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe('token');
    expect(calls[0].value).toBe('tok-123');
    expect(calls[0].opts.httpOnly).toBe(true);
    expect(calls[0].opts.secure).toBe(true);
    expect(calls[0].opts.sameSite).toBe('None');
  });

  it('setzt außerhalb von production Secure=false und SameSite=Lax', () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { setAuthCookie } = require('../../src/utils/cookies');
    const { res, calls } = fakeRes();

    setAuthCookie(res, 'tok-123');

    expect(calls[0].opts.secure).toBe(false);
    expect(calls[0].opts.sameSite).toBe('Lax');
  });

  it('clearAuthCookie setzt einen leeren Wert mit maxAge 0', () => {
    jest.resetModules();
    const { clearAuthCookie } = require('../../src/utils/cookies');
    const { res, calls } = fakeRes();

    clearAuthCookie(res);

    expect(calls[0].value).toBe('');
    expect(calls[0].opts.maxAge).toBe(0);
  });

  it('Kind/Eltern/Lehrer-Cookies benutzen unterschiedliche Namen (keine Kollision)', () => {
    jest.resetModules();
    const {
      setAuthCookie, setParentAuthCookie, setTeacherAuthCookie
    } = require('../../src/utils/cookies');

    const child = fakeRes();
    const parent = fakeRes();
    const teacher = fakeRes();

    setAuthCookie(child.res, 'a');
    setParentAuthCookie(parent.res, 'b');
    setTeacherAuthCookie(teacher.res, 'c');

    expect(child.calls[0].name).toBe('token');
    expect(parent.calls[0].name).toBe('parent_token');
    expect(teacher.calls[0].name).toBe('teacher_token');
  });

  it('liest ein Token korrekt aus dem Cookie-Header', () => {
    jest.resetModules();
    const { getTokenFromCookies, getParentTokenFromCookies } = require('../../src/utils/cookies');
    const req = { headers: { cookie: 'token=abc; parent_token=xyz; other=1' } };

    expect(getTokenFromCookies(req)).toBe('abc');
    expect(getParentTokenFromCookies(req)).toBe('xyz');
  });

  it('liefert undefined, wenn gar kein Cookie-Header gesetzt ist', () => {
    jest.resetModules();
    const { getTokenFromCookies } = require('../../src/utils/cookies');
    expect(getTokenFromCookies({ headers: {} })).toBeUndefined();
  });
});
