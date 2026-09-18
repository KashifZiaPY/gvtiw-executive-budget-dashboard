import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Check,
  ChevronDown,
  Filter,
  Search,
  X,
  Layers,
} from 'lucide-react';
import { TfcChallanRecord, COURSE_TITLE_MAP } from '../data/tfcChallanData';

export interface TfcCourseMultiSelectProps {
  availableCourses: string[];
  selectedCourses: string[];
  onChange: (selected: string[]) => void;
  challans: TfcChallanRecord[];
  darkMode: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const TfcCourseMultiSelect: React.FC<TfcCourseMultiSelectProps> = ({
  availableCourses,
  selectedCourses,
  onChange,
  challans,
  darkMode,
  size = 'md',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Count challans per course
  const courseCounts = useMemo(() => {
    const map: Record<string, number> = {};
    challans.forEach((c) => {
      const abbr = c.courseAbbreviation || 'OTHER';
      map[abbr] = (map[abbr] || 0) + 1;
    });
    return map;
  }, [challans]);

  // Is all courses currently selected
  const isAllSelected = useMemo(() => {
    if (selectedCourses.length === 0 || selectedCourses.includes('ALL')) return true;
    return availableCourses.length > 0 && availableCourses.every((c) => selectedCourses.includes(c));
  }, [selectedCourses, availableCourses]);

  // Active selected list (non-'ALL')
  const effectiveSelected = useMemo(() => {
    if (isAllSelected) return availableCourses;
    return selectedCourses.filter((c) => c !== 'ALL');
  }, [isAllSelected, selectedCourses, availableCourses]);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Toggle all
  const handleSelectAll = () => {
    onChange(['ALL']);
  };

  // Clear all (or revert to ALL)
  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(['ALL']);
  };

  // Toggle single course
  const handleToggleCourse = (course: string) => {
    if (isAllSelected) {
      // If currently all selected, clicking one unchecks it: select all others
      const remaining = availableCourses.filter((c) => c !== course);
      onChange(remaining.length === 0 ? ['ALL'] : remaining);
      return;
    }

    if (effectiveSelected.includes(course)) {
      const remaining = effectiveSelected.filter((c) => c !== course);
      if (remaining.length === 0) {
        // If user deselects last one, revert to ALL
        onChange(['ALL']);
      } else {
        onChange(remaining);
      }
    } else {
      const next = [...effectiveSelected, course];
      if (next.length === availableCourses.length) {
        onChange(['ALL']);
      } else {
        onChange(next);
      }
    }
  };

  // Select ONLY this course
  const handleSelectOnly = (course: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([course]);
  };

  // Filter available courses by search term
  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return availableCourses;
    const term = searchTerm.toLowerCase();
    return availableCourses.filter((c) => {
      const title = COURSE_TITLE_MAP[c] || c;
      return c.toLowerCase().includes(term) || title.toLowerCase().includes(term);
    });
  }, [availableCourses, searchTerm]);

  // Trigger label text
  const triggerLabel = useMemo(() => {
    if (isAllSelected) {
      return `All Courses (${availableCourses.length} Trades)`;
    }
    if (effectiveSelected.length === 1) {
      const single = effectiveSelected[0];
      const title = COURSE_TITLE_MAP[single] || single;
      return `${single} — ${title}`;
    }
    return `${effectiveSelected.length} Courses Selected`;
  }, [isAllSelected, effectiveSelected, availableCourses.length]);

  const badgeColors: Record<string, string> = {
    BTE: 'bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    BT: 'bg-pink-100 text-pink-900 dark:bg-pink-950/70 dark:text-pink-300 border-pink-300 dark:border-pink-800',
    CO: 'bg-sky-100 text-sky-900 dark:bg-sky-950/70 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    ADDM: 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    FD: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    DM: 'bg-teal-100 text-teal-900 dark:bg-teal-950/70 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    CK: 'bg-orange-100 text-orange-900 dark:bg-orange-950/70 dark:text-orange-300 border-orange-300 dark:border-orange-800',
    MVi: 'bg-blue-100 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    MVii: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    TUV: 'bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800',
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-2 rounded-xl border font-bold text-left transition-all cursor-pointer shadow-2xs ${
          size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'
        } ${
          !isAllSelected
            ? 'border-teal-500 ring-1 ring-teal-500 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200'
            : darkMode
            ? 'bg-slate-950 border-slate-700 text-white hover:border-slate-600'
            : 'bg-white border-slate-300 text-slate-900 hover:border-slate-400'
        }`}
        title="Click to select single or multiple courses"
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <Filter
            className={`w-3.5 h-3.5 shrink-0 ${
              !isAllSelected ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'
            }`}
          />
          <span className="truncate">{triggerLabel}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {!isAllSelected && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-teal-200 dark:hover:bg-teal-800/60 text-teal-700 dark:text-teal-300 transition-colors"
              title="Reset to All Courses"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          {!isAllSelected && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-teal-600 text-white">
              {effectiveSelected.length}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-teal-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-1.5 z-50 w-80 sm:w-96 rounded-2xl shadow-2xl border p-2.5 backdrop-blur-md transition-all ${
            darkMode
              ? 'bg-slate-900/98 border-slate-700 text-slate-100 shadow-black/80'
              : 'bg-white/98 border-slate-200 text-slate-800 shadow-slate-400/30'
          }`}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-black tracking-wide">
                Filter by Course / Trade
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAll}
                className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer transition-colors ${
                  isAllSelected
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-2 py-0.5 text-[11px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search course code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                darkMode
                  ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Course Checklist */}
          <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
            {filteredCourses.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No courses match "{searchTerm}"
              </div>
            ) : (
              filteredCourses.map((c) => {
                const isSelected = isAllSelected || effectiveSelected.includes(c);
                const title = COURSE_TITLE_MAP[c] || c;
                const count = courseCounts[c] || 0;
                const badgeStyle =
                  badgeColors[c] ||
                  'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700';

                return (
                  <div
                    key={c}
                    onClick={() => handleToggleCourse(c)}
                    className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors border ${
                      isSelected
                        ? darkMode
                          ? 'bg-teal-950/40 border-teal-800/70 text-white'
                          : 'bg-teal-50/70 border-teal-200 text-teal-950'
                        : darkMode
                        ? 'bg-slate-950/40 border-transparent hover:bg-slate-800/60 text-slate-300'
                        : 'bg-white border-transparent hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {/* Left: Checkbox + Abbreviation Badge + Title */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-teal-600 border-teal-600 text-white'
                            : darkMode
                            ? 'border-slate-600 bg-slate-800'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-black font-mono border shrink-0 ${badgeStyle}`}
                      >
                        {c}
                      </span>

                      <span className="text-xs font-semibold truncate" title={title}>
                        {title}
                      </span>
                    </div>

                    {/* Right: Challan Count & "Only" shortcut */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleSelectOnly(c, e)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/60 dark:hover:bg-teal-800 text-teal-800 dark:text-teal-200 transition-opacity"
                        title={`Select ONLY ${c}`}
                      >
                        Only
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Popover Footer */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500">
            <span>
              {isAllSelected
                ? `All ${availableCourses.length} courses active`
                : `${effectiveSelected.length} of ${availableCourses.length} active`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
