import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Logo from '../components/Logo';

// Sicherheitsaudit Hoch #12 (§5 DDG, vormals §5 TMG - Impressumspflicht):
// vorher gab es keine Impressum-Seite in der App überhaupt.
//
// WICHTIG - ENTWURF MIT PLATZHALTERN: die eckigen Klammern unten müssen vor
// dem echten Live-Betrieb durch die tatsächlichen Angaben ersetzt werden.
// Ein unvollständiges oder falsches Impressum ist rechtlich riskanter als
// gar keins - deshalb der gut sichtbare Hinweisbanner unten, der erst
// verschwinden sollte, wenn alle Platzhalter ersetzt sind (siehe
// DRAFT_MODE weiter unten).
const DRAFT_MODE = true;

export default function ImpressumPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm font-medium"
        >
          <ArrowLeft size={18} /> Zurück
        </button>

        <div className="flex items-center gap-3 mb-8">
          <Logo size={32} />
          <h1 className="font-display text-2xl font-bold text-gray-900">Impressum</h1>
        </div>

        {DRAFT_MODE && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6 text-sm text-amber-900">
            <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
            <p>
              <strong>Entwurf – noch nicht vollständig.</strong> Diese Seite enthält
              Platzhalter (in eckigen Klammern) statt echter Angaben. Bevor die App
              öffentlich läuft, müssen alle Platzhalter ersetzt und <code>DRAFT_MODE</code>{' '}
              in dieser Datei auf <code>false</code> gesetzt werden.
            </p>
          </div>
        )}

        <div className="bg-cream border border-gray-100 rounded-lg p-6 shadow-sm space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
              Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)
            </h2>
            <p>
              [VOR- UND NACHNAME, bzw. Firmenname/Rechtsform, falls kein Einzelbetrieb]
              <br />
              [STRASSE UND HAUSNUMMER]
              <br />
              [PLZ UND ORT]
              <br />
              [LAND, falls nicht Deutschland]
            </p>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Kontakt</h2>
            <p>
              E-Mail: [KONTAKT-EMAIL]
              <br />
              Telefon: [TELEFONNUMMER – optional, kann entfallen]
            </p>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
              Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
            </h2>
            <p>
              [NAME UND ANSCHRIFT WIE OBEN, oder abweichende Person]
            </p>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
              Nur falls gewerblich/als Unternehmen betrieben
            </h2>
            <p>
              Umsatzsteuer-ID (falls vorhanden): [USt-IdNr. ODER DIESEN ABSCHNITT ENTFERNEN]
              <br />
              Registereintrag (falls z.B. GbR/UG/GmbH): [REGISTERGERICHT UND -NUMMER ODER ENTFERNEN]
            </p>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
              EU-Streitschlichtung
            </h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS)
              bereit: <span className="break-all">https://ec.europa.eu/consumers/odr/</span>.
              Zur Teilnahme an einem Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle sind wir nicht verpflichtet und nicht bereit,
              sofern sich aus den Angaben oben nichts anderes ergibt.
            </p>
          </section>
        </div>

        <p className="text-gray-400 text-xs mt-6 text-center">
          Siehe auch: <Link to="/datenschutz" className="underline hover:text-gray-600">Datenschutzerklärung</Link>
        </p>
      </div>
    </div>
  );
}
