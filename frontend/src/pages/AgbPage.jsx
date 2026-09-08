import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Logo from '../components/Logo';

// AGB (2026-09-08, Frage von Robert: "brauche ich zusätzlich noch eine AGB
// in der App?" - Antwort: ja, sobald echt bezahlt wird. Siehe Datenschutz-
// erklärung/Impressum für den gleichen DRAFT_MODE-Aufbau.
//
// WICHTIG - ENTWURF MIT PLATZHALTERN, KEINE RECHTSBERATUNG: Firmierung/
// Kontakt sind Platzhalter wie in ImpressumPage.jsx. Die Preise (Klassen-
// Abo 9,99 €/Schüler/Jahr, gedeckelt bei 199 €, Vertiefungsmodus 2,49 €
// einmalig) sind aus dem tatsächlichen Code übernommen (routes/classes.js,
// Kommentar in routes/billing.js) - der genaue Pro-Abo-Preis steht NICHT im
// Code (nur als Stripe-Price-ID hinterlegt), deshalb dort ein Platzhalter.
// "Familie"-Abo aus dem Preiskonzept-Dokument bewusst NICHT aufgeführt, weil
// es aktuell nirgends im Code existiert (kein Stripe-Produkt, keine Route) -
// ein Vertrag darf nur echte, kaufbare Leistungen beschreiben.
//
// OFFENER PUNKT (Robert im Chat mitgeteilt, nicht in diesem Text versteckt):
// Der Checkout (routes/billing.js) holt aktuell KEINE ausdrückliche
// Bestätigung "ich verzichte auf mein Widerrufsrecht" ein, bevor der
// Vertiefungsmodus/das Abo sofort nutzbar wird. Ohne diese Bestätigung
// erlischt das Widerrufsrecht nach § 356 Abs. 5 BGB rechtlich NICHT vorzeitig
// - Abschnitt 6 unten beschreibt den Mechanismus so, wie er sein müsste,
// sobald diese Checkbox ergänzt ist.
const DRAFT_MODE = true;

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function AgbPage() {
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
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Allgemeine Geschäftsbedingungen
          </h1>
        </div>

        {DRAFT_MODE && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6 text-sm text-amber-900">
            <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
            <p>
              <strong>Entwurf – noch nicht vollständig.</strong> Firmierung, Kontakt und der
              genaue Pro-Abo-Preis sind Platzhalter. Bevor echtes Geld fließt, sollte diese
              Seite von einer Anwältin oder einem Anwalt gegengelesen werden – gerade weil
              sich die App auch an Minderjährige richtet und laufende Abos verkauft.
            </p>
          </div>
        )}

        <div className="bg-cream border border-gray-100 rounded-lg p-6 shadow-sm space-y-6 text-sm text-gray-700 leading-relaxed">
          <Section title="1. Geltungsbereich und Vertragspartner">
            <p>
              Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der
              Lern-App „Kapiert?“, angeboten von:
            </p>
            <p>
              [VOR- UND NACHNAME, bzw. Firmenname/Rechtsform]
              <br />
              [STRASSE UND HAUSNUMMER]
              <br />
              [PLZ UND ORT]
              <br />
              E-Mail: [KONTAKT-EMAIL]
            </p>
            <p>
              Sie gelten sowohl für die kostenlose Grundnutzung als auch für alle
              kostenpflichtigen Zusatzleistungen (siehe Abschnitt 4).
            </p>
          </Section>

          <Section title="2. Was Kapiert? macht">
            <p>
              In Kapiert? lädst du Lerninhalte hoch (z. B. als PDF) oder wählst sie aus einer
              Vorlage aus. Daraus werden automatisch Testfragen erstellt, teilweise mithilfe
              einer KI (siehe Datenschutzerklärung). Du bearbeitest die Tests, bekommst eine
              Auswertung und kannst dir zu falsch beantworteten Themen eine vertiefende
              Erklärung und einen Nachtest freischalten (Vertiefungsmodus). Für Schulklassen
              gibt es außerdem einen Beitritt per Klassencode und ein Klassen-Abo.
            </p>
            <p>
              Kapiert? wird laufend weiterentwickelt. Der Funktionsumfang kann sich ändern,
              erweitert oder in Einzelfällen eingeschränkt werden; wesentliche Änderungen
              teilen wir angemessen mit.
            </p>
            <p>
              Wichtig: Testfragen und Erklärungen werden automatisiert von einer KI erzeugt
              und können Fehler enthalten – siehe dazu Abschnitt 7.
            </p>
          </Section>

          <Section title="3. Registrierung und Minderjährige">
            <p>
              Die Nutzung setzt eine Registrierung voraus (Name, E-Mail-Adresse, Passwort,
              optional Klassenstufe). Bist du bei der Registrierung unter 16 Jahre alt, bleibt
              das Konto gesperrt, bis ein Erziehungsberechtigter über einen Bestätigungslink
              zugestimmt hat (siehe Datenschutzerklärung).
            </p>
            <p>
              Minderjährige sind nach §§ 107, 108 BGB in ihrer Geschäftsfähigkeit
              eingeschränkt. Die kostenlose Grundnutzung kann im Rahmen des sogenannten
              Taschengeldparagraphen (§ 110 BGB) selbst genutzt werden. Für kostenpflichtige
              Leistungen (Pro-Abo, Klassen-Abo, Vertiefungsmodus) ist zusätzlich die
              Zustimmung eines Erziehungsberechtigten erforderlich – in der Praxis ist es
              meist der Erziehungsberechtigte selbst, der den Kauf abschließt und seine
              Zahlungsdaten eingibt.
            </p>
          </Section>

          <Section title="4. Preise und Zahlungsbedingungen">
            <p>
              Registrierung, das Hochladen einzelner Lerninhalte, das Bearbeiten von Tests
              und die Grundauswertung sind kostenlos.
            </p>
            <p>
              <strong>Pro-Abo:</strong> [PREIS PRÜFEN UND EINTRAGEN, z. B. XX,XX € / Jahr] –
              jährliches Abonnement mit erweiterten Funktionen.
            </p>
            <p>
              <strong>Klassen-Abo:</strong> 9,99 € pro zahlendem Mitglied und Jahr, gedeckelt
              bei 199 € pro Jahr für die gesamte Klasse. Ab 20 zahlenden Mitgliedern ist die
              ganze Klasse freigeschaltet, auch für Mitglieder, die selbst nicht bezahlt
              haben.
            </p>
            <p>
              <strong>Vertiefungsmodus:</strong> 2,49 € als Einmalkauf pro Test, für die
              vertiefende Erklärung und den Nachtest zu falsch beantworteten Themen.
            </p>
            <p>
              Die Zahlung wird über den Zahlungsdienstleister Stripe abgewickelt. Es gelten
              ergänzend die Nutzungsbedingungen von Stripe. Alle Preise verstehen sich
              inklusive der gesetzlichen Umsatzsteuer, soweit diese anfällt. [PRÜFEN: Falls
              Kleinunternehmerregelung nach § 19 UStG genutzt wird, entsprechenden Hinweis
              ergänzen.]
            </p>
          </Section>

          <Section title="5. Laufzeit, automatische Verlängerung und Kündigung">
            <p>
              Pro-Abo und Klassen-Abo laufen jeweils ein Jahr und verlängern sich automatisch
              um ein weiteres Jahr, wenn sie nicht rechtzeitig gekündigt werden.
            </p>
            <p>
              Kündigen kannst du jederzeit zum Ende der laufenden Vertragslaufzeit, über den
              Button „Abo verwalten“ in den Einstellungen (öffnet das Stripe-Kundenportal).
              Die Kündigung beendet die automatische Verlängerung sofort; die bereits bezahlte
              Laufzeit bleibt bis zu ihrem Ende nutzbar.
            </p>
            <p>
              Der Vertiefungsmodus ist ein Einmalkauf ohne Laufzeit – hier ist keine
              Kündigung nötig.
            </p>
          </Section>

          <Section title="6. Widerrufsrecht für Verbraucher:innen">
            <p>
              Schließt ein Erziehungsberechtigter als Verbraucher:in ein kostenpflichtiges
              Abo oder den Vertiefungsmodus ab, steht ihm grundsätzlich ein 14-tägiges
              Widerrufsrecht zu.
            </p>
            <p>
              Bei digitalen Inhalten, die nicht auf einem körperlichen Datenträger geliefert
              werden – wie hier die Freischaltung von App-Funktionen –, erlischt das
              Widerrufsrecht vorzeitig, wenn du ausdrücklich zustimmst, dass die
              Freischaltung sofort beginnt, und zusätzlich bestätigst, dass du dadurch dein
              Widerrufsrecht verlierst (§ 356 Abs. 5 BGB). Ohne diese ausdrückliche
              Bestätigung beim Kauf bleibt das Widerrufsrecht die vollen 14 Tage bestehen.
            </p>
            <p>
              Für einen Widerruf reicht eine formlose Mitteilung an [KONTAKT-EMAIL] innerhalb
              der Frist.
            </p>
          </Section>

          <Section title="7. Verfügbarkeit und Haftung für KI-generierte Inhalte">
            <p>
              Wir bemühen uns um eine hohe Verfügbarkeit von Kapiert?, garantieren aber keine
              ununterbrochene Erreichbarkeit – etwa bei Wartungsarbeiten oder technischen
              Störungen.
            </p>
            <p>
              Testfragen und Erklärungen werden automatisiert mithilfe einer KI erstellt.
              Trotz Sorgfalt bei der Entwicklung können Fehler, Ungenauigkeiten oder fachlich
              falsche Inhalte nicht vollständig ausgeschlossen werden. Kapiert? ersetzt keine
              Lehrkraft und keine eigene Prüfung der Lerninhalte durch dich.
            </p>
            <p>
              Für Schäden haften wir unbeschränkt bei Vorsatz oder grober Fahrlässigkeit,
              bei der Verletzung von Leben, Körper oder Gesundheit sowie nach den zwingenden
              Vorschriften des Produkthaftungsgesetzes. Bei leicht fahrlässiger Verletzung
              einer wesentlichen Vertragspflicht ist die Haftung auf den vertragstypisch
              vorhersehbaren Schaden begrenzt. [PRÜFEN: Diese Klausel vor Live-Betrieb
              rechtlich prüfen lassen.]
            </p>
          </Section>

          <Section title="8. Änderungen dieser AGB">
            <p>
              Wir können diese AGB mit Wirkung für die Zukunft ändern, etwa bei neuen
              Funktionen oder rechtlichen Anforderungen. Über wesentliche Änderungen
              informieren wir registrierte Nutzer:innen rechtzeitig vor Inkrafttreten, zum
              Beispiel per E-Mail oder Hinweis in der App.
            </p>
          </Section>

          <Section title="9. Schlussbestimmungen">
            <p>
              Es gilt deutsches Recht. Bist du Verbraucher:in mit gewöhnlichem Aufenthalt in
              einem anderen EU-Land, bleiben die zwingenden verbraucherschützenden
              Vorschriften deines Aufenthaltslandes davon unberührt.
            </p>
            <p>
              Sollte eine Bestimmung dieser AGB unwirksam sein, bleiben die übrigen
              Bestimmungen davon unberührt.
            </p>
            <p>
              Fragen zu diesen AGB beantworten wir gerne unter [KONTAKT-EMAIL].
            </p>
            <p><strong>Stand:</strong> 8. September 2026.</p>
          </Section>
        </div>

        <p className="text-gray-400 text-xs mt-6 text-center">
          Siehe auch: <Link to="/datenschutz" className="underline hover:text-gray-600">Datenschutzerklärung</Link>
          {' · '}
          <Link to="/impressum" className="underline hover:text-gray-600">Impressum</Link>
        </p>
      </div>
    </div>
  );
}
