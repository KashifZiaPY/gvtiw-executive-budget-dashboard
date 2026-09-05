import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  code?: string;
  subtitle?: string;
  category?: string;
  icon?: string | React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

export interface SearchableComboboxProps {
  id?: string;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  darkMode?: boolean;
  categories?: { label: string; value: string; count?: number }[];
  className?: string;
  disabled?: boolean;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  id,
  label,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Type to search & filter...',
  options,
  value,
  onChange,
  darkMode = false,
  categories,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  // Filtered options based on search query and category
  const filteredOptions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => {
      // Category filter
      if (selectedCategory !== 'ALL' && opt.category) {
        if (opt.category.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // Search query filter
      if (!q) return true;

      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchCode = opt.code ? opt.code.toLowerCase().includes(q) : false;
      const matchSubtitle = opt.subtitle ? opt.subtitle.toLowerCase().includes(q) : false;
      const matchCategory = opt.category ? opt.category.toLowerCase().includes(q) : false;
      const matchValue = opt.value.toLowerCase().includes(q);

      return matchLabel || matchCode || matchSubtitle || matchCategory || matchValue;
    });
  }, [options, searchQuery, selectedCategory]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    } else {
      setSearchQuery('');
      setSelectedCategory('ALL');
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll('.combobox-item');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < filteredOptions.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Highlight matching characters helper
  const highlightMatches = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark
              key={i}
              className="bg-amber-300 text-slate-950 dark:bg-amber-400 dark:text-slate-950 rounded-xs px-0.5 font-bold"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label htmlFor={id} className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </label>
          <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 font-bold">
            {options.length} Items
          </span>
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-2 text-left text-xs font-bold transition-all shadow-xs cursor-pointer ${
          darkMode
            ? 'bg-slate-900 border-slate-700 text-white hover:border-blue-500 focus:border-blue-500'
            : 'bg-white border-slate-300 text-slate-900 hover:border-blue-500 focus:border-blue-600'
        } ${isOpen ? 'ring-2 ring-blue-500/40 border-blue-500' : ''} ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.icon && (
            <span className="text-base shrink-0">{selectedOption.icon}</span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold">
              {selectedOption ? selectedOption.label : placeholder}
            </div>
            {selectedOption?.subtitle && (
              <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">
                {selectedOption.subtitle}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedOption && value !== 'ALL' && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('ALL');
              }}
              title="Reset to ALL"
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-500' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[380px] animate-in fade-in zoom-in-95 duration-100 ${
            darkMode
              ? 'bg-[#0b172a] border-slate-700 text-white'
              : 'bg-white border-slate-300 text-slate-900'
          }`}
          style={{ minWidth: '280px' }}
        >
          {/* Integrated Search Input Header */}
          <div className={`p-2.5 border-b ${darkMode ? 'bg-slate-900/90 border-slate-700/80' : 'bg-slate-50 border-slate-200'}`}>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder={searchPlaceholder}
                className={`w-full pl-8 pr-7 py-1.5 rounded-lg border text-xs font-bold outline-none transition-all ${
                  darkMode
                    ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Optional Category Filter Pills inside dropdown */}
            {categories && categories.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pt-2 pb-0.5 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.value);
                      setHighlightedIndex(0);
                    }}
                    className={`px-2 py-0.5 text-[9px] font-bold rounded-md whitespace-nowrap cursor-pointer transition-colors ${
                      selectedCategory === cat.value
                        ? 'bg-blue-600 text-white shadow-xs'
                        : darkMode
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {cat.label} {cat.count !== undefined ? `(${cat.count})` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results List */}
          <div ref={listRef} className="overflow-y-auto flex-1 p-1 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[260px]">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
                No matching options found for &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`combobox-item p-2.5 rounded-lg flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected
                        ? darkMode
                          ? 'bg-blue-950/60 text-blue-300 font-bold'
                          : 'bg-blue-50 text-blue-900 font-bold'
                        : isHighlighted
                        ? darkMode
                          ? 'bg-slate-800/80 text-white'
                          : 'bg-slate-100 text-slate-900'
                        : darkMode
                        ? 'text-slate-200 hover:bg-slate-800/50'
                        : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {opt.icon && <span className="text-base shrink-0">{opt.icon}</span>}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {opt.code && (
                            <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {highlightMatches(opt.code, searchQuery)}
                            </span>
                          )}
                          <span className="text-xs truncate font-bold">
                            {highlightMatches(opt.label, searchQuery)}
                          </span>
                        </div>
                        {opt.subtitle && (
                          <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                            {highlightMatches(opt.subtitle, searchQuery)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded ${
                            opt.badgeColor || (darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info Strip */}
          <div className={`p-2 border-t text-[10px] font-mono flex items-center justify-between ${
            darkMode ? 'bg-slate-900/90 border-slate-700/80 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <span>Showing {filteredOptions.length} of {options.length}</span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 hidden sm:inline">
              Use ↑↓ keys & Enter to select
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
