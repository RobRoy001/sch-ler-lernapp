// Zentrale Altersberechnung aus einem Geburtsdatum (ISO-String oder Date).
// Ausgelagert, damit sie an mehreren Stellen (Registrierung, spätere
// Altersgrenzen-Checks für Inhalte) exakt gleich funktioniert.
function calculateAge(dateOfBirth) {
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

module.exports = { calculateAge };