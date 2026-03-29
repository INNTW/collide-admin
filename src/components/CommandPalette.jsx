import { useState, useRef, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { NAV_TREE } from "../constants/nav";
import EmptyState from "./EmptyState";
import { BRAND } from "../constants/brand";

const CommandPalette = ({ isOpen, onClose, pages, currentPage, onNavigate }) => {
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const allSearchablePages = useMemo(() => {
    const results = [];

    NAV_TREE.sections.forEach((section) => {
      if (section.page) {
        results.push({
          id: section.id,
          label: section.label,
          section: section.id,
          page: section.page,
        });
      }
      if (section.children) {
        section.children.forEach((child) => {
          results.push({
            id: child.id,
            label: `${section.label} > ${child.label}`,
            section: section.id,
            page: child.page,
          });
        });
      }
    });

    return results;
  }, []);

  const filtered = search
    ? allSearchablePages.filter(
        (p) =>
          p.label.toLowerCase().includes(search.toLowerCase()) ||
          p.id.toLowerCase().includes(search.toLowerCase())
      )
    : allSearchablePages;

  const handleSelect = (item) => {
    onNavigate({ section: item.section, page: item.page });
    setSearch("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center pt-12 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: BRAND.glass,
          border: `1px solid ${BRAND.glassBorder}`,
          backdropFilter: BRAND.blur,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
          <Search size={18} style={{ color: BRAND.primary }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-white"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
        </div>

        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyState title="No results" message="Try searching for a different page" />
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-3 hover:bg-white/10 transition"
                style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}
              >
                <p className="text-sm font-medium" style={{ color: BRAND.text }}>
                  {item.label}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
