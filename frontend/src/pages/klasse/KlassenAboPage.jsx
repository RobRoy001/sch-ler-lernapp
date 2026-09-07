import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle, Copy, Check, AlertTriangle } from 'lucide-react';
import Logo from '../../components/Logo';
import { API_BASE_URL } from '../../config/api';

// ✅ Klassen-Abo-Sammelzahlung (2026-09-07, siehe LernApp-Preismodell-
// Nachhilfe-Klassenmodell-2026-09-02.md Abschnitt 3.2): Landing-/Checkout-
// Seite für das Klassen-Abo. Bewusst KEIN eigenes Eltern-Login - genau wie
// beim bestehenden individuellen Pro-Abo (SettingsPage.jsx) startet das
// eingeloggte KIND-Konto den Checkout, die Zahlungsdaten gibt dann
// üblicherweise ein Elternteil auf Stripes eigener Checkout-Seite ein (siehe
// Kommentar in backend/src/routes/parent.js: es gibt bewusst keine
// eigenständige Eltern-Registrierung). Diese Seite ist deshalb einfach über
// den normalen Klassen-Link teilbar ("Sammel-Zahlungslink an die Eltern") -
// wer ihn öffnet, muss dafür nur mit dem Kind-Konto eingeloggt und Mitglied
// dieser Klasse sein (serverseitig geprüft, siehe routes/classes.js
// GET .../klassenabo-status und routes/billing.js POST /checkout).
export default function KlassenAboPage() {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API_BASE_URL}/classes/${classId}/klassenabo-status`, {
          credentials: 'include'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Klassen-Abo-Status konnte nicht geladen werden');
        setStatus(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadStatus();
  }, [classId]);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/billing/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'klassenabo', classId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout konnte nicht gestartet werden');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setCheckoutLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Zwischenablage nicht verfügbar (z.B. sehr alter Browser) - kein
      // harter Fehler, der Link lässt sich auch von Hand aus der Adressleiste
      // kopieren.
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="text-gray-500 font-body">Wird geladen…</p>
      </div>
    );
  }

  const priceEuro = status ? (status.pricePerStudentCents / 100).toFixed(2).replace('.', ',') : '';
  const capEuro = status ? (status.capCents / 100).toFixed(0) : '';

  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(`/klasse/${classId}`)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm font-medium"
        >
          <ArrowLeft size={18} /> Zurück zur Klasse
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Logo size={32} />
          <h1 className="font-display text-2xl font-bold text-gray-900">Klassen-Abo</h1>
        </div>
        {status?.className && (
          <p className="text-gray-500 text-sm mb-8">für die Klasse „{status.className}“</p>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 bg-error-light border border-error/20 rounded-lg mb-6">
            <AlertTriangle size={18} className="text-error-dark flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error-dark">{error}</p>
          </div>
        )}

        <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm mb-6">
          <p className="text-gray-700 text-sm mb-4">
            Statt für jedes Kind einzeln ein Pro-Abo abzuschließen, kann jede Familie hier für ihr
            eigenes Kind zum ermäßigten Klassen-Preis zahlen. Sobald{' '}
            <strong>{status?.capPayers ?? 20} Familien</strong> aus dieser Klasse bezahlt haben, wird
            der Zugang für ALLE übrigen Mitglieder der Klasse automatisch mit freigeschaltet - auch
            für später beitretende.
          </p>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-display text-3xl font-bold text-gray-900">{priceEuro} €</span>
            <span className="text-gray-500 text-sm">/ Schüler:in / Jahr</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">gedeckelt bei {capEuro} € / Jahr für die ganze Klasse</p>

          <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
            <Users size={16} className="text-gray-400" />
            {status?.payerCount ?? 0} von {status?.capPayers ?? 20} haben bereits bezahlt
            {status?.memberCount ? ` · ${status.memberCount} Mitglieder in der Klasse` : ''}
          </div>

          {status?.alreadyActive ? (
            <div className="flex items-center gap-2 bg-success-light border border-success/30 rounded-lg p-4 text-success-dark text-sm">
              <CheckCircle size={18} className="flex-shrink-0" />
              {status.capReached
                ? 'Diese Klasse hat die Kappungsgrenze bereits erreicht - alle Mitglieder sind automatisch freigeschaltet.'
                : 'Du hast bereits Zugang (eigenes Abo oder eigener Kauf).'}
            </div>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white px-6 py-3 rounded-md font-semibold transition"
            >
              {checkoutLoading ? 'Wird geladen…' : `Jetzt für mein Kind zahlen (${priceEuro} €/Jahr)`}
            </button>
          )}
        </div>

        <div className="bg-cream border border-gray-100 rounded-lg p-5">
          <p className="text-sm font-semibold text-gray-900 mb-2">Diesen Link mit anderen Eltern teilen</p>
          <p className="text-xs text-gray-500 mb-3">
            Jede Familie öffnet diesen Link mit dem eigenen Kind-Konto und zahlt für ihr Kind selbst -
            aus rechtlichen Gründen kann niemand für ein fremdes Kind mitbezahlen.
          </p>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md font-medium transition"
          >
            {linkCopied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
            {linkCopied ? 'Link kopiert!' : 'Link kopieren'}
          </button>
        </div>
      </div>
    </div>
  );
}
