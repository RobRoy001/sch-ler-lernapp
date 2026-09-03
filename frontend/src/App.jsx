import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ParentConsentPage from './pages/ParentConsentPage';
import ImpressumPage from './pages/ImpressumPage';
import DatenschutzPage from './pages/DatenschutzPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ProcessingPage from './pages/ProcessingPage';
import TasksOverviewPage from './pages/TasksOverviewPage';
import TestPlayer from './pages/TestPlayer';
import ResultsPage from './pages/ResultsPage';
import SettingsPage from './pages/SettingsPage';
import Logo from './components/Logo';
import { API_BASE_URL } from './config/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // ✅ Fix (2026-09-03): Session-Check nutzt jetzt konsequent das
  // httpOnly-Cookie statt eines localStorage-Tokens. Seit der Umstellung
  // auf Cookies (Sicherheitsaudit Mittel #16) hat kein Code mehr wirklich
  // einen gültigen Token in localStorage geschrieben - LoginPage/
  // RegisterPage rufen onLoginSuccess nur noch mit den Nutzerdaten auf,
  // ohne Token. Dadurch landete hier vorher literal der String
  // "undefined" in localStorage, wurde als Bearer-Token mitgeschickt und
  // vom Backend zurecht abgelehnt - Nutzer wurden bei jedem Seiten-Reload
  // ausgeloggt, obwohl das Cookie die ganze Zeit gültig war.
  //
  // Jetzt: einfacher Check per Cookie. "credentials: 'include'" sorgt
  // dafür, dass der Browser das httpOnly-Cookie automatisch mitschickt -
  // das Frontend sieht/speichert den Token gar nicht mehr selbst.
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
          method: 'GET',
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Session-Check fehlgeschlagen:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      // Löscht das httpOnly-Cookie serverseitig (siehe server.js /auth/logout
      // und utils/cookies.js clearAuthCookie) - ohne diesen Aufruf bliebe das
      // Cookie im Browser bestehen und ein Reload würde die Session sofort
      // wiederherstellen, obwohl der Nutzer sich "ausgeloggt" hat.
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout-Request fehlgeschlagen:', error);
    }
    setUser(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size={56} />
          </div>
          <p className="text-gray-500 font-body">Wird geladen…</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {!isAuthenticated ? (
          <>
            <Route path="/" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
            <Route path="/register" element={<RegisterPage onLoginSuccess={handleLoginSuccess} />} />
            {/* Ziel des Links aus der Eltern-Email (Sicherheitsaudit Kritisch #5) -
                muss auch ohne Login erreichbar sein, da der Elternteil selbst
                kein Konto in der App hat. */}
            <Route path="/parent-consent" element={<ParentConsentPage />} />
            {/* Impressum/Datenschutz (Sicherheitsaudit Hoch #12) - müssen
                unabhängig vom Login-Status erreichbar sein (Pflicht nach
                § 5 DDG / Art. 13-14 DSGVO). */}
            <Route path="/impressum" element={<ImpressumPage />} />
            <Route path="/datenschutz" element={<DatenschutzPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : (
          <>
            <Route path="/" element={<DashboardPage user={user} onLogout={handleLogout} />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/tasks" element={<TasksOverviewPage />} />
            <Route path="/processing/:sourceId" element={<ProcessingPage />} />
            <Route path="/test/:sourceId" element={<TestPlayer />} />
            <Route path="/results/:submissionId" element={<ResultsPage />} />
            <Route path="/settings" element={<SettingsPage user={user} onLogout={handleLogout} />} />
            {/* Auch erreichbar, falls z.B. ein Elternteil den Link auf einem
                Gerät öffnet, auf dem gerade ein anderes Konto eingeloggt ist. */}
            <Route path="/parent-consent" element={<ParentConsentPage />} />
            <Route path="/impressum" element={<ImpressumPage />} />
            <Route path="/datenschutz" element={<DatenschutzPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
