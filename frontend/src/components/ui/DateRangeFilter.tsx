import React, { useState, useRef, useEffect } from 'react';

export type DatePreset = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

interface DateRangeFilterProps {
  preset: DatePreset;
  startDate: string;
  endDate: string;
  onApply: (preset: DatePreset, start: string, end: string) => void;
  onClear: () => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  preset,
  startDate,
  endDate,
  onApply,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempPreset, setTempPreset] = useState<DatePreset>(preset);
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync temp state when props change
  useEffect(() => {
    setTempPreset(preset);
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [preset, startDate, endDate]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const getToday = () => new Date().toISOString().split('T')[0];

  const get7DaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  };

  const getFirstOfMonth = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  };

  const handleSelectPreset = (p: DatePreset) => {
    setTempPreset(p);
    if (p === 'ALL') {
      onApply('ALL', '', '');
      setIsOpen(false);
    } else if (p === 'TODAY') {
      const today = getToday();
      onApply('TODAY', today, today);
      setIsOpen(false);
    } else if (p === 'WEEK') {
      const start = get7DaysAgo();
      const end = getToday();
      onApply('WEEK', start, end);
      setIsOpen(false);
    } else if (p === 'MONTH') {
      const start = getFirstOfMonth();
      const end = getToday();
      onApply('MONTH', start, end);
      setIsOpen(false);
    } else if (p === 'CUSTOM') {
      // Keep dropdown open for custom inputs
    }
  };

  const handleApplyCustom = () => {
    onApply('CUSTOM', tempStart, tempEnd);
    setIsOpen(false);
  };

  const isFiltered = preset !== 'ALL' || !!startDate || !!endDate;

  const getButtonLabel = () => {
    if (preset === 'TODAY') return 'Today';
    if (preset === 'WEEK') return 'Last 7 Days';
    if (preset === 'MONTH') return 'This Month';
    if (preset === 'CUSTOM' || (startDate && endDate)) {
      if (startDate && endDate) {
        if (startDate === endDate) return startDate;
        return `${startDate} → ${endDate}`;
      }
      if (startDate) return `From ${startDate}`;
      if (endDate) return `Until ${endDate}`;
    }
    return 'All Dates';
  };

  return (
    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full sm:w-auto min-w-[170px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border transition shadow-xs ${
          isFiltered
            ? 'bg-blue-50/80 border-blue-300 text-blue-800'
            : 'bg-slate-50/70 hover:bg-white border-slate-200 text-slate-700'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <svg
            className={`w-4 h-4 shrink-0 ${isFiltered ? 'text-blue-600' : 'text-slate-400'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="truncate">{getButtonLabel()}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isFiltered && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
                setIsOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onClear();
                  setIsOpen(false);
                }
              }}
              className="w-4 h-4 rounded-full bg-blue-200/80 hover:bg-blue-300 text-blue-800 flex items-center justify-center text-[10px] cursor-pointer"
              title="Clear date filter"
            >
              ✕
            </span>
          )}
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Popover Menu - Anchored right to prevent screen overflow */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 p-4 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <span>Filter Invoices by Date</span>
            </div>
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setIsOpen(false);
                }}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-bold"
              >
                Reset
              </button>
            )}
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'ALL', label: 'All Dates' },
              { id: 'TODAY', label: 'Today' },
              { id: 'WEEK', label: 'Last 7 Days' },
              { id: 'MONTH', label: 'This Month' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectPreset(item.id as DatePreset)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold text-center transition border ${
                  tempPreset === item.id
                    ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                    : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Section */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">Custom Date Range</span>
              {tempPreset !== 'CUSTOM' && (
                <button
                  type="button"
                  onClick={() => setTempPreset('CUSTOM')}
                  className="text-[10px] text-blue-600 hover:text-blue-700 font-bold"
                >
                  Enable
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={tempStart}
                  onChange={(e) => {
                    setTempStart(e.target.value);
                    setTempPreset('CUSTOM');
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={tempEnd}
                  onChange={(e) => {
                    setTempEnd(e.target.value);
                    setTempPreset('CUSTOM');
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyCustom}
              disabled={!tempStart && !tempEnd}
              className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-xs"
            >
              Apply Date Range
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;
