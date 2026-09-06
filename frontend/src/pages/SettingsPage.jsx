import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, LogOut, User, Download, Trash2, AlertTriangle, Users, X, GraduationCap, ChevronRight, Crown, CheckCircle2 } from 'lucide-react';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../config/api';

export default function SettingsPage({ user, onLogout }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ Stripe-Billing (2026-09-06): "Kapiert Pro"-Status + Upgrade-Button.
  // Nutzt die in backend/src/routes/billing.js gebauten Endpunkte. Der
  // eigentliche Vertiefungsmodus-Einzelkauf bekommt seinen eigenen Kauf-
  // Button erst dort, wo das Feature selbst entsteht (Themen-Auswahl) -
  // hier geht es nur um das Jahres-Abo.
  const [billing, setBilling] = useState(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const billingBanner = searchParams.get('billing'); // "success" | "cancel" | null

  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');

  const [deleteMode, setDeleteMode] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // ✅ Eltern-Board (2026-09-03): "Verknüpfte Eltern" - zeigt, welche
  // Erziehungsberechtigten aktuell Lesezugriff auf den Fortschritt dieses
  // Kontos haben (siehe backend/src/routes/parent.js), mit der Möglichkeit,
  // den Zugriff selbst zu entziehen.
  const [linkedParents, setLinkedParents] = useState([]);
  const [parentsLoading, setParentsLoading] = useState(true);
  const [parentsError, setParentsError] = useState('');
  const [revokingId, setRevokingId] = useState(null);

  // ✅ Lehrer-Portal (2026-09-03): "Meine Klassen" - zeigt die per
  // Klassencode beigetretenen Klassen (siehe backend/src/server.js
  // GET /api/auth/my-classes) und ein Feld, um einem weiteren Klassencode
  // beizutreten (POST /api/auth/join-class). Läuft über das normale
  // Kind-Cookie ("token"), nicht über teacher_token/parent_token.
  const [myClasses, setMyClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    const loadParents = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/parent-links`, {
          credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Verknüpfte Eltern konnten nicht geladen werden');
        }
        setLinkedParents(data.parents || []);
      } catch (err) {
        setParentsError(err.message);
      } finally {
        setParentsLoading(false);
      }
    };
    loadParents();

    const loadClasses = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/my-classes`, {
          credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Klassen konnten nicht geladen werden');
        }
        setMyClasses(data.classes || []);
      } catch (err) {
        setClassesError(err.message);
      } finally {
        setClassesLoading(false);
      }
    };
    loadClasses();

    const loadBilling = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/billing/status`, {
          credentials: 'include'
        });
        // 404/503 heißt: Billing-Route existiert (noch) nicht oder Stripe ist
        // nicht konfiguriert (siehe config/stripe.js) - dann einfach so tun,
        // als wäre der Nutzer im kostenlosen Plan, statt einen Fehler zu zeigen.
        if (response.status === 404 || response.status === 503) {
          setBilling({ subscriptionStatus: 'free', purchases: [] });
          return;
        }
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Mitgliedschaftsstatus konnte nicht geladen werden');
        }
        setBilling(data);
      } catch (err) {
        setBillingError(err.message);
      } finally {
        setBillingLoading(false);
      }
    };
    loadBilling();
  }, []);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    setBillingError('');
    try {
      const response = await fetch(`${API_BASE_URL}/billing/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pro' })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout konnte nicht gestartet werden');
      window.location.href = data.url;
    } catch (err) {
      setBillingError(err.message);
      setCheckoutLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    setBillingError('');
    try {
      const response = await fetch(`${API_BASE_URL}/billing/portal`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Kundenportal konnte nicht geöffnet werden');
      window.location.href = data.url;
    } catch (err) {
      setBillingError(err.message);
      setPortalLoading(false);
    }
  };

  const dismissBillingBanner = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('billing');
    setSearchParams(next, { replace: true });
  };

  const handleRevokeParent = async (parentId) => {
    setRevokingId(parentId);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/parent-links/${parentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Zugriff konnte nicht entzogen werden');
      }
      setLinkedParents((prev) => prev.filter((p) => p.id !== parentId));
    } catch (err) {
      setParentsError(err.message);
    } finally {
      setRevokingId(null);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    setJoinError('');
    if (!joinCode.trim()) {
      setJoinError('Bitte gib einen Klassencode ein');
      return;
    }

    setJoinLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/join-class`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_code: joinCode.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Klasse konnte nicht beigetreten werden');

      setMyClasses((prev) => [
        { id: data.class.id, name: data.class.name, classCode: data.class.classCode, joinedAt: new Date().toISOString() },
        ...prev.filter((c) => c.id !== data.class.id)
      ]);
      setJoinCode('');
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  // ✅ Fix (2026-09-03): nutzt jetzt wie der Rest der App das httpOnly-
  // Cookie ("credentials: 'include'") statt eines localStorage-Tokens, den
  // seit der Umstellung auf Cookies (Sicherheitsaudit Mittel #16) niemand
  // mehr befüllt hat - dadurch schlug der Export vorher immer mit "Token
  // ungültig oder abgelaufen" fehl, obwohl die Session gültig war.
  const handleExport = async () => {
    setExportLoading(true);
    setExportError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/export-data`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Export fehlgeschlagen');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kapiert-meine-daten-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExportLoading(false);
    }
  };

  // ✅ Fix (2026-09-03): siehe handleExport oben - gleiche Umstellung von
  // localStorage-Token auf Cookie-basierte Auth.
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('Bitte gib dein Passwort ein');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/account`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: deletePassword })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Konto konnte nicht gelöscht werden');
      }

      onLogout();
      navigate('/');
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm font-medium"
        >
          <ArrowLeft size={18} /> Zurück zum Dashboard
        </button>

        <div className="flex items-center gap-3 mb-8">
          <Logo size={32} />
          <h1 className="font-display text-2xl font-bold text-gray-900">Einstellungen</h1>
        </div>

        {billingBanner === 'success' && (
          <div className="flex items-start justify-between gap-3 bg-success-light border border-success/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-success-dark flex-shrink-0 mt-0.5" />
              <p className="text-success-dark text-sm">
                Zahlung erfolgreich! Dein Kapiert Pro-Zugang wird in Kürze aktiv.
              </p>
            </div>
            <button onClick={dismissBillingBanner} className="text-success-dark/60 hover:text-success-dark flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        )}
        {billingBanner === 'cancel' && (
          <div className="flex items-start justify-between gap-3 bg-gray-100 border border-gray-200 rounded-lg p-4 mb-6">
            <p className="text-gray-600 text-sm">Der Bezahlvorgang wurde abgebrochen, es wurde nichts abgebucht.</p>
            <button onClick={dismissBillingBanner} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="bg-cream border border-gray-100 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">
            <Crown size={14} /> Mitgliedschaft
          </h2>

          {billingLoading && <p className="text-gray-400 text-sm">Wird geladen…</p>}

          {!billingLoading && billing?.subscriptionStatus === 'active' && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-gray-900 font-semibold text-sm">Kapiert Pro ist aktiv</p>
                {billing.subscriptionCurrentPeriodEnd && (
                  // ✅ Fix (2026-09-06): "Verlängert sich" war irreführend,
                  // sobald im Stripe-Kundenportal gekündigt wurde - das Abo
                  // bleibt zwar bis zum Periodenende aktiv (deshalb weiterhin
                  // subscriptionStatus "active"), verlängert sich danach
                  // aber gerade NICHT automatisch (siehe billing.js
                  // subscriptionCancelAtPeriodEnd).
                  <p className={`text-xs mt-0.5 ${billing.subscriptionCancelAtPeriodEnd ? 'text-accent-dark font-medium' : 'text-gray-500'}`}>
                    {billing.subscriptionCancelAtPeriodEnd
                      ? `Gekündigt – läuft am ${new Date(billing.subscriptionCurrentPeriodEnd).toLocaleDateString('de-DE')} aus`
                      : `Verlängert sich am ${new Date(billing.subscriptionCurrentPeriodEnd).toLocaleDateString('de-DE')}`}
                  </p>
                )}
              </div>
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-5 py-2.5 rounded-md font-semibold text-sm transition disabled:opacity-60"
              >
                {portalLoading ? 'Wird geöffnet…' : 'Abo verwalten'}
              </button>
            </div>
          )}

          {!billingLoading && billing?.subscriptionStatus !== 'active' && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-gray-900 font-semibold text-sm">Aktuell: Kostenloser Zugang</p>
                <p className="text-gray-500 text-xs mt-0.5">Mit Kapiert Pro bekommst du erweiterte Funktionen.</p>
              </div>
              <button
                onClick={handleUpgrade}
                disabled={checkoutLoading}
                className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-md font-semibold text-sm transition disabled:opacity-60"
              >
                <Crown size={16} />
                {checkoutLoading ? 'Wird geöffnet…' : 'Jetzt upgraden'}
              </button>
            </div>
          )}

          {billingError && <p className="text-error-dark text-sm mt-3">{billingError}</p>}
        </div>

        <div className="bg-cream border border-gray-100 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">Profil</h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center text-primary flex-shrink-0">
              <User size={26} />
            </div>
            <div>
              <p className="text-gray-900 font-semibold">{user?.name || '—'}</p>
              <p className="text-gray-500 text-sm">{user?.email || '—'}</p>
              {user?.grade_level && (
                <p className="text-gray-400 text-xs mt-0.5">Klasse {user.grade_level}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-cream border border-gray-100 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">
            <GraduationCap size={14} /> Meine Klassen
          </h2>

          {classesLoading && <p className="text-gray-400 text-sm">Wird geladen…</p>}
          {classesError && <p className="text-error-dark text-sm mb-3">{classesError}</p>}

          {!classesLoading && myClasses.length === 0 && !classesError && (
            <p className="text-gray-500 text-sm mb-4">
              Du bist noch keiner Klasse beigetreten. Trage den Klassencode ein, den du von
              deiner Lehrkraft bekommen hast.
            </p>
          )}

          {myClasses.length > 0 && (
            <div className="space-y-2 mb-4">
              {myClasses.map((c) => (
                <Link
                  key={c.id}
                  to={`/klasse/${c.id}`}
                  className="flex items-center justify-between bg-white border border-gray-100 rounded-md px-4 py-3 hover:border-primary/40 transition"
                >
                  <span className="text-gray-700 text-sm font-medium">{c.name}</span>
                  <ChevronRight size={16} className="text-gray-300" />
                </Link>
              ))}
            </div>
          )}

          <form onSubmit={handleJoinClass} className="flex gap-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Klassencode eingeben (z.B. KL-AB12CD)"
              className="flex-1 h-11 px-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={joinLoading}
              className="bg-primary hover:bg-primary-dark text-white font-semibold rounded-md px-5 transition disabled:opacity-60"
            >
              {joinLoading ? 'Wird beigetreten…' : 'Beitreten'}
            </button>
          </form>
          {joinError && <p className="text-error-dark text-sm mt-3">{joinError}</p>}
        </div>

        <div className="bg-cream border border-gray-100 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">
            Verknüpfte Eltern
          </h2>

          {parentsLoading && <p className="text-gray-400 text-sm">Wird geladen…</p>}

          {parentsError && (
            <p className="text-error-dark text-sm mb-3">{parentsError}</p>
          )}

          {!parentsLoading && linkedParents.length === 0 && !parentsError && (
            <p className="text-gray-500 text-sm">
              Aktuell hat kein Erziehungsberechtigter Zugriff auf dein Eltern-Board.
            </p>
          )}

          {linkedParents.length > 0 && (
            <div className="space-y-2">
              {linkedParents.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-white border border-gray-100 rounded-md px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Users size={16} className="text-gray-400" />
                    <span className="text-gray-700 text-sm">{p.email}</span>
                  </div>
                  <button
                    onClick={() => handleRevokeParent(p.id)}
                    disabled={revokingId === p.id}
                    className="flex items-center gap-1 text-gray-400 hover:text-error-dark text-xs font-medium transition disabled:opacity-60"
                  >
                    <X size={14} />
                    {revokingId === p.id ? 'Wird entfernt…' : 'Zugriff entfernen'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-cream border border-gray-100 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Datenschutz</h2>
          <p className="text-gray-600 text-sm mb-4">
            Deine Daten werden ausschließlich zur Erstellung deiner Lerninhalte verwendet.
            Weitere Infos findest du in unserer{' '}
            <Link to="/datenschutz" className="underline hover:text-gray-900">
              Datenschutzerklärung
            </Link>{' '}
            und im{' '}
            <Link to="/impressum" className="underline hover:text-gray-900">
              Impressum
            </Link>
            .
          </p>

          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-5 py-2.5 rounded-md font-semibold text-sm transition disabled:opacity-60"
          >
            <Download size={16} />
            {exportLoading ? 'Wird vorbereitet…' : 'Meine Daten exportieren'}
          </button>

          {exportError && (
            <p className="text-error-dark text-sm mt-3">{exportError}</p>
          )}
        </div>

        <div className="bg-error-light border border-error/20 rounded-lg p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-error-dark mb-4">Konto</h2>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-error hover:bg-error-dark text-white px-5 py-2.5 rounded-md font-semibold text-sm transition mb-4"
          >
            <LogOut size={16} />
            Abmelden
          </button>

          <div className="h-px bg-error/20 mb-4" />

          {!deleteMode ? (
            <button
              onClick={() => setDeleteMode(true)}
              className="flex items-center gap-2 bg-white border border-error text-error-dark hover:bg-error-light px-5 py-2.5 rounded-md font-semibold text-sm transition"
            >
              <Trash2 size={16} />
              Konto löschen
            </button>
          ) : (
            <div>
              <div className="flex items-start gap-2 text-error-dark text-sm mb-3">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <p>
                  Dein Konto und alle zugehörigen Inhalte und Testergebnisse werden
                  unwiderruflich gelöscht. Gib zur Bestätigung dein Passwort ein.
                </p>
              </div>

              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Passwort"
                className="w-full h-11 px-4 border border-gray-200 rounded-md text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-error/40"
              />

              {deleteError && (
                <p className="text-error-dark text-sm mb-3">{deleteError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="bg-error hover:bg-error-dark text-white px-5 py-2.5 rounded-md font-semibold text-sm transition disabled:opacity-60"
                >
                  {deleteLoading ? 'Wird gelöscht…' : 'Endgültig löschen'}
                </button>
                <button
                  onClick={() => {
                    setDeleteMode(false);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-md font-semibold text-sm transition"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
