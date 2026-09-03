import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Logo from '../components/Logo';

// Sicherheitsaudit Hoch #12 (Art. 13/14 DSGVO - Informationspflicht):
// vorher gab es keine echte Datenschutzerklärung-Seite in der App.
//
// WICHTIG - ENTWURF MIT PLATZHALTERN: Verantwortlicher/Kontakt sind noch
// Platzhalter (eckige Klammern). Die technischen Angaben (welche Daten,
// welche Dienstleister, welche Rechte) sind bereits so formuliert, dass sie
// zum tatsächlichen Stand der App passen - die sollten trotzdem nochmal
// gegengelesen werden, sobald echte KI-Generierung (Kritisch #6) oder
// weitere Dienste dazukommen, weil sich der Text dann ändern muss.
//
// Kein Ersatz für eine rechtliche Prüfung - insbesondere weil sich die App
// an Minderjährige richtet, ist das ein Bereich mit erhöhtem Risiko.
const DRAFT_MODE = true;

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function DatenschutzPage() {
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
          <h1 className="font-display text-2xl font-bold text-gray-900">Datenschutzerklärung</h1>
        </div>

        {DRAFT_MODE && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6 text-sm text-amber-900">
            <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
            <p>
              <strong>Entwurf – noch nicht vollständig.</strong> Verantwortlicher und Kontakt
              sind Platzhalter. Vor dem echten Live-Betrieb ersetzen und idealerweise einmal
              rechtlich gegenprüfen lassen (siehe Kritisch #5 – die App verarbeitet Daten von
              Minderjährigen, das ist ein Bereich mit erhöhten Anforderungen).
            </p>
          </div>
        )}

        <div className="bg-cream border border-gray-100 rounded-lg p-6 shadow-sm space-y-6 text-sm text-gray-700 leading-relaxed">
          <Section title="1. Verantwortlicher">
            <p>
              [VOR- UND NACHNAME, bzw. Firmenname]
              <br />
              [STRASSE UND HAUSNUMMER]
              <br />
              [PLZ UND ORT]
              <br />
              E-Mail: [KONTAKT-EMAIL FÜR DATENSCHUTZANFRAGEN]
            </p>
          </Section>

          <Section title="2. Welche Daten wir verarbeiten">
            <p>Bei der Registrierung: Name, E-Mail-Adresse, Passwort (nur als Hash gespeichert, nie im Klartext), optional Klassenstufe, sowie Geburtsdatum zur Altersprüfung.</p>
            <p>
              Bist du bei der Registrierung unter 16 Jahre alt, verarbeiten wir zusätzlich die
              E-Mail-Adresse eines Erziehungsberechtigten, um dessen Zustimmung einzuholen
              (Art. 8 DSGVO). Das Konto bleibt gesperrt, bis diese Zustimmung über einen
              Bestätigungslink erteilt wurde.
            </p>
            <p>Bei Nutzung der App: hochgeladene bzw. ausgewählte Lerninhalte, daraus erstellte Tests und deine Testergebnisse.</p>
          </Section>

          <Section title="3. Warum wir diese Daten verarbeiten (Rechtsgrundlage)">
            <p>
              Zur Bereitstellung der App-Funktionen (Konto, Tests, Ergebnisse) – Art. 6 Abs. 1
              lit. b DSGVO (Vertragserfüllung).
            </p>
            <p>
              Bei Nutzern unter 16 Jahren zusätzlich gestützt auf die Einwilligung des
              Erziehungsberechtigten – Art. 6 Abs. 1 lit. a i.V.m. Art. 8 DSGVO.
            </p>
          </Section>

          <Section title="4. Wo deine Daten gespeichert werden">
            <p>
              Die Datenbank läuft bei Supabase (Hosting-Region: EU/Irland). Die Backend-Anwendung
              läuft bei Railway, das Frontend bei Vercel. [PRÜFEN: Hosting-Region/Serverstandort
              von Railway und Vercel für dieses Projekt bestätigen und hier ergänzen.]
            </p>
            <p>
              Für die automatische Erstellung von Testfragen aus hochgeladenen Inhalten ist eine
              Anbindung an OpenAI vorgesehen. Diese ist aktuell noch NICHT aktiv – Testfragen
              werden derzeit aus festen Beispieldaten erzeugt, hochgeladene Inhalte werden dafür
              nicht an OpenAI oder einen anderen externen KI-Anbieter übertragen. Dieser Abschnitt
              wird aktualisiert, sobald die echte KI-Anbindung live geht.
            </p>
          </Section>

          <Section title="5. Wie lange wir deine Daten speichern">
            <p>
              Solange dein Konto besteht. Du kannst dein Konto jederzeit in den Einstellungen
              selbst löschen – deine Daten werden dann unwiderruflich entfernt (siehe Punkt 6).
            </p>
          </Section>

          <Section title="6. Deine Rechte">
            <p>Du hast jederzeit das Recht auf:</p>
            <p>
              Auskunft über deine gespeicherten Daten (Art. 15 DSGVO) und Datenübertragbarkeit
              (Art. 20 DSGVO) – nutze dafür den Button „Meine Daten exportieren" in den
              Einstellungen.
            </p>
            <p>
              Löschung deiner Daten (Art. 17 DSGVO) – nutze dafür den Button „Konto löschen" in
              den Einstellungen.
            </p>
            <p>
              Berichtigung unrichtiger Daten (Art. 16 DSGVO), Einschränkung der Verarbeitung
              (Art. 18 DSGVO) und Widerspruch (Art. 21 DSGVO) – wende dich dafür an die oben
              genannte Kontakt-E-Mail.
            </p>
            <p>
              Beschwerde bei einer Datenschutz-Aufsichtsbehörde – zuständig ist die
              Aufsichtsbehörde [BUNDESLAND EINTRAGEN, z.B. „des Bundeslandes, in dem der
              Verantwortliche seinen Sitz hat"].
            </p>
          </Section>

          <Section title="7. Cookies und lokale Speicherung">
            <p>
              Kapiert? verwendet nach aktuellem Stand keine Marketing- oder Analyse-Cookies. Zur
              Anmeldung wird ein Sitzungs-Token technisch notwendig im lokalen Speicher deines
              Browsers (localStorage) abgelegt; dieser verlässt dein Gerät nicht und wird beim
              Abmelden gelöscht.
            </p>
          </Section>

          <Section title="8. Minderjährigenschutz">
            <p>
              Nutzer unter 16 Jahren benötigen die Zustimmung eines Erziehungsberechtigten, bevor
              das Konto nutzbar wird (siehe Punkt 2). Erziehungsberechtigte können jederzeit über
              [KONTAKT-EMAIL] die Löschung des Kontos ihres Kindes verlangen.
            </p>
          </Section>

          <Section title="9. Änderungen dieser Datenschutzerklärung">
            <p>
              Wir aktualisieren diese Datenschutzerklärung bei Bedarf. Deine Nutzung der LernApp nach
              einer Änderung gilt als Zustimmung zur überarbeiteten Version.
            </p>
            <p><strong>Letzte Aktualisierung:</strong> 2. September 2026</p>
          </Section>
        </div>

        <p className="text-gray-400 text-xs mt-6 text-center">
          Siehe auch: <Link to="/impressum" className="underline hover:text-gray-600">Impressum</Link>
        </p>
      </div>
    </div>
  );
}
