import React, { useState, useEffect } from 'react';
import { BookOpen, Loader } from 'lucide-react';

export default function BookCatalogSelector({
  selectedBook,
  onBookSelect,
  selectedChapters,
  onChaptersSelect
}) {
  const [books, setBooks] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gradeFilter, setGradeFilter] = useState('9');
  const [subjectFilter, setSubjectFilter] = useState('Mathe');

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await fetch(
          `https://web-production-adfb70.up.railway.app/api/content/books?grade_level=${gradeFilter}&subject=${subjectFilter}`
        );
        if (!res.ok) throw new Error('Bücher konnten nicht geladen werden');
        const data = await res.json();
        setBooks(data.books);
        setError(null);
      } catch (err) {
        setError(err.message);
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [gradeFilter, subjectFilter]);

  const handleBookSelect = async (book) => {
    onBookSelect(book);
    onChaptersSelect([]);

    try {
      const res = await fetch(`https://web-production-adfb70.up.railway.app/api/content/books/${book.id}/chapters`);
      if (!res.ok) throw new Error('Kapitel konnten nicht geladen werden');
      const data = await res.json();
      setChapters(data.chapters);
    } catch (err) {
      setError(err.message);
      setChapters([]);
    }
  };

  const handleChapterToggle = (chapter) => {
    onChaptersSelect(prev =>
      prev.find(c => c.id === chapter.id)
        ? prev.filter(c => c.id !== chapter.id)
        : [...prev, chapter]
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-cream border border-gray-100 rounded-lg p-6 shadow-sm">
        <h3 className="font-display text-base font-semibold text-gray-900 mb-4">Filter</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-500 text-sm mb-1.5">Klassenstufe</label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full h-11 bg-white text-gray-900 px-3 rounded-md border border-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
            >
              <option value="7">Klasse 7</option>
              <option value="8">Klasse 8</option>
              <option value="9">Klasse 9</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-500 text-sm mb-1.5">Fach</label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full h-11 bg-white text-gray-900 px-3 rounded-md border border-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
            >
              <option value="Mathe">Mathe</option>
              <option value="Deutsch">Deutsch</option>
              <option value="Englisch">Englisch</option>
            </select>
          </div>
        </div>
      </div>

      {/* Books List */}
      <div className="bg-cream border border-gray-100 rounded-lg p-6 shadow-sm">
        <h3 className="font-display text-base font-semibold text-gray-900 mb-4">Verfügbare Bücher</h3>

        {error && (
          <div className="text-error-dark text-sm mb-4">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size={22} className="text-primary animate-spin" />
          </div>
        ) : books.length === 0 ? (
          <p className="text-gray-400 text-sm">Keine Bücher gefunden</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {books.map(book => (
              <button
                key={book.id}
                onClick={() => handleBookSelect(book)}
                className={`text-left p-4 rounded-md transition border ${
                  selectedBook?.id === book.id
                    ? 'bg-primary-light/40 border-primary'
                    : 'bg-white border-gray-100 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <BookOpen size={20} className="mt-1 flex-shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{book.title}</p>
                    <p className="text-gray-500 text-xs">{book.author}</p>
                    <p className="text-gray-400 text-xs mt-1">{book.total_pages} Seiten</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chapters Selection */}
      {selectedBook && chapters.length > 0 && (
        <div className="bg-cream border border-gray-100 rounded-lg p-6 shadow-sm">
          <h3 className="font-display text-base font-semibold text-gray-900 mb-4">
            Kapitel aus „{selectedBook.title}"
          </h3>

          <div className="space-y-2">
            {chapters.map(chapter => (
              <label
                key={chapter.id}
                className="flex items-center p-3 rounded-md bg-white border border-gray-100 hover:border-primary/40 cursor-pointer transition"
              >
                <input
                  type="checkbox"
                  checked={selectedChapters.some(c => c.id === chapter.id)}
                  onChange={() => handleChapterToggle(chapter)}
                  className="w-5 h-5 accent-primary"
                />
                <div className="ml-3 flex-1">
                  <p className="text-gray-900 font-medium text-sm">
                    {chapter.chapter_number}. {chapter.chapter_title}
                  </p>
                  <p className="text-gray-400 text-xs">
                    Seite {chapter.start_page}-{chapter.end_page}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
