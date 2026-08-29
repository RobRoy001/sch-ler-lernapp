import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, Loader } from 'lucide-react';

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
          `http://localhost:5000/api/content/books?grade_level=${gradeFilter}&subject=${subjectFilter}`
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
      const res = await fetch(`http://localhost:5000/api/content/books/${book.id}/chapters`);
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
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Filter</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 text-sm mb-2">Klassenstufe</label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
            >
              <option value="7">Klasse 7</option>
              <option value="8">Klasse 8</option>
              <option value="9">Klasse 9</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-2">Fach</label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
            >
              <option value="Mathe">Mathe</option>
              <option value="Deutsch">Deutsch</option>
              <option value="Englisch">Englisch</option>
            </select>
          </div>
        </div>
      </div>

      {/* Books List */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Verfügbare Bücher</h3>

        {error && (
          <div className="text-red-400 text-sm mb-4">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size={24} className="text-blue-400 animate-spin" />
          </div>
        ) : books.length === 0 ? (
          <p className="text-slate-400 text-sm">Keine Bücher gefunden</p>
        ) : (
          <div className="space-y-2">
            {books.map(book => (
              <button
                key={book.id}
                onClick={() => handleBookSelect(book)}
                className={`w-full text-left p-4 rounded-lg transition border ${
                  selectedBook?.id === book.id
                    ? 'bg-blue-600/20 border-blue-500'
                    : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  <BookOpen size={20} className="mt-1 flex-shrink-0 text-blue-400" />
                  <div className="flex-1">
                    <p className="font-semibold text-white">{book.title}</p>
                    <p className="text-slate-400 text-sm">{book.author}</p>
                    <p className="text-slate-500 text-xs mt-1">{book.total_pages} Seiten</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chapters Selection */}
      {selectedBook && chapters.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Kapitel aus "{selectedBook.title}"
          </h3>

          <div className="space-y-2">
            {chapters.map(chapter => (
              <label
                key={chapter.id}
                className="flex items-center p-3 rounded-lg bg-slate-700/30 border border-slate-600 hover:border-slate-500 cursor-pointer transition"
              >
                <input
                  type="checkbox"
                  checked={selectedChapters.some(c => c.id === chapter.id)}
                  onChange={() => handleChapterToggle(chapter)}
                  className="w-4 h-4 accent-blue-500"
                />
                <div className="ml-3 flex-1">
                  <p className="text-white font-medium">
                    {chapter.chapter_number}. {chapter.chapter_title}
                  </p>
                  <p className="text-slate-400 text-sm">
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