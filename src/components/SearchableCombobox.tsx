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
  value?: string;
  onChange?: (value: string) => void;
  // Multi-select props
  multiSelect?: boolean;
  selectedValues?: string[];
  onMultiChange?: (values: string[]) => void;
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
  value = '',
  onChange,
  multiSelect = false,
  selectedValues = ['ALL'],
  onMultiChange,
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

  // Multi-select status computation
  const isAllMultiSelected = useMemo(() => {
    return !selectedValues || selectedValues.length === 0 || selectedValues.includes('ALL');
  }, [selectedValues]);

  const activeMultiValues = useMemo(() => {
    return isAllMultiSelected ? [] : selectedValues.filter((v) => v !== 'ALL');
  }, [isAllMultiSelected, selectedValues]);

  // Find currently selected option for single-select mode
  const selectedOption = useMemo(() => {
    if (multiSelect) return null;
    return options.find((opt) => opt.value === value) || null;
  }, [multiSelect, options, value]);

  // First selected option in multi-select mode (for button display)
  const firstSelectedMultiOption = useMemo(() => {
    if (!multiSelect || isAllMultiSelected || activeMultiValues.length === 0) return null;
    return options.find((opt) => opt.value === activeMultiValues[0]) || null;
  }, [multiSelect, isAllMultiSelected, activeMultiValues, options]);

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

  // Handle selection (single or multi)
  const handleSelect = (val: string) => {
    if (multiSelect) {
      if (val === 'ALL') {
        onMultiChange?.(['ALL']);
      } else {
        if (isAllMultiSelected) {
          onMultiChange?.([val]);
        } else if (activeMultiValues.includes(val)) {
          const next = activeMultiValues.filter((v) => v !== val);
          onMultiChange?.(next.length === 0 ? ['ALL'] : next);
        } else {
          onMultiChange?.([...activeMultiValues, val]);
        }
      }
      // In multi-select mode, do NOT close dropdown
      return;
    }

    if (onChange) {
      onChange(val);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

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

  // Compute trigger button display info
  const buttonDisplay = useMemo(() => {
    if (multiSelect) {
      if (isAllMultiSelected) {
        const allOpt = options.find((o) => o.value === 'ALL');
        return {
          label: allOpt?.label || 'All Budget Heads',
          subtitle: allOpt?.subtitle || 'Comprehensive statement across all sanctioned budget heads',
          code: undefined,
          badge: 'ALL',
          badgeColor: 'bg-blue-600 text-white',
          icon: allOpt?.icon || '📋',
          canReset: false,
        };
      }
      if (activeMultiValues.length === 1) {
        return {
          label: firstSelectedMultiOption?.label || activeMultiValues[0],
          subtitle: firstSelectedMultiOption?.subtitle,
          code: firstSelectedMultiOption?.code,
          badge: firstSelectedMultiOption?.badge || '1 HEAD',
          badgeColor: firstSelectedMultiOption?.badgeColor || 'bg-blue-600 text-white',
          icon: firstSelectedMultiOption?.icon || '📑',
          canReset: true,
        };
      }
      // 2 or more selected
      const firstCodeOrLabel = firstSelectedMultiOption?.code || firstSelectedMultiOption?.label || activeMultiValues[0];
      return {
        label: `${firstCodeOrLabel} +${activeMultiValues.length - 1} more`,
        subtitle: `${activeMultiValues.length} budget heads selected`,
        code: undefined,
        badge: `${activeMultiValues.length} HEADS`,
        badgeColor: 'bg-blue-600 text-white font-mono font-black',
        icon: '📑',
        canReset: true,
      };
    }

    // Single-select
    return {
      label: selectedOption ? selectedOption.label : placeholder,
      subtitle: selectedOption?.subtitle,
      code: selectedOption?.code,
      badge: selectedOption?.badge,
      badgeColor: selectedOption?.badgeColor,
      icon: selectedOption?.icon,
      canReset: Boolean(selectedOption && value !== 'ALL'),
    };
  }, [
    multiSelect,
    isAllMultiSelected,
    activeMultiValues,
    firstSelectedMultiOption,
    options,
    selectedOption,
    placeholder,
    value,
  ]);

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label htmlFor={id} className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </label>
          <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 font-bold">
            {multiSelect && !isAllMultiSelected
              ? `${activeMultiValues.length} Selected / ${options.length} Items`
              : `${options.length} Items`}
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
          {buttonDisplay.icon && (
            <span className="text-base shrink-0">{buttonDisplay.icon}</span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold flex items-center gap-1.5 flex-wrap">
              <span>{buttonDisplay.label}</span>
              {buttonDisplay.badge && (
                <span
                  className={`px-1.5 py-0.5 text-[9px] font-mono font-black uppercase rounded tracking-wider ${
                    buttonDisplay.badgeColor || (darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')
                  }`}
                >
                  {buttonDisplay.badge}
                </span>
              )}
            </div>
            {buttonDisplay.subtitle && (
              <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">
                {buttonDisplay.subtitle}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {buttonDisplay.canReset && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (multiSelect) {
                  onMultiChange?.(['ALL']);
                } else if (onChange) {
                  onChange('ALL');
                }
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
                const isSelected = multiSelect
                  ? opt.value === 'ALL'
                    ? isAllMultiSelected
                    : !isAllMultiSelected && activeMultiValues.includes(opt.value)
                  : opt.value === value;
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
                      {/* Multi-Select Checkbox */}
                      {multiSelect && (
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : darkMode
                              ? 'border-slate-600 bg-slate-800/80'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </div>
                      )}

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
                      {!multiSelect && isSelected && (
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
            <span>
              Showing {filteredOptions.length} of {options.length}
              {multiSelect && (
                <span className="ml-1.5 text-blue-600 dark:text-blue-400 font-bold">
                  • {isAllMultiSelected ? 'ALL Selected' : `${activeMultiValues.length} Selected`}
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {multiSelect && !isAllMultiSelected && (
                <button
                  type="button"
                  onClick={() => onMultiChange?.(['ALL'])}
                  className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  Reset to ALL
                </button>
              )}
              <span className="text-[9px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                {multiSelect ? 'Click to toggle selection' : 'Use ↑↓ keys & Enter to select'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
