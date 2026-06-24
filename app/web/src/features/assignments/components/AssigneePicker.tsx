import { useState, useCallback, useMemo } from 'react';
import { Search, Check } from 'lucide-react';
import { Input } from '@/shared/ui/Input';
import { Chip } from '@/shared/ui/Chip';
import type { User } from '@/shared/types';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useUsers } from '@/shared/hooks/useUsers';

// ── Types ─────────────────────────────────────────────────────────────────

export interface AssigneePickerProps {
  /** IDs of users already assigned (shown as selected) */
  selectedIds: string[];
  /** Called when selection changes */
  onChange: (ids: string[]) => void;
}

// ── AssigneePicker component ──────────────────────────────────────────────
// Multi-select list of employees with search filter.
// Active employees only (BE filters inactive via isActive).

export function AssigneePicker({ selectedIds, onChange }: AssigneePickerProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading } = useUsers({ search: debouncedSearch, limit: 50 });

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleUser = useCallback(
    (userId: string) => {
      const next = new Set(selectedSet);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      onChange(Array.from(next));
    },
    [selectedSet, onChange],
  );

  const users = data?.users ?? [];

  return (
    <div className="flex flex-col gap-sm" data-testid="assignee-picker">
      {/* Search */}
      <Input
        placeholder="Tìm nhân viên..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        leftIcon={<Search size={14} />}
      />

      {/* Selected count badge */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-xs">
          <Chip variant="filter-active">{selectedIds.length} đã chọn</Chip>
          <button
            type="button"
            className="font-sans text-[12px] text-helper-text underline hover:text-navy"
            onClick={() => onChange([])}
          >
            Bỏ chọn tất cả
          </button>
        </div>
      )}

      {/* User list */}
      <div className="max-h-[280px] overflow-y-auto rounded border border-nav-border bg-surface">
        {isLoading ? (
          <div className="flex justify-center py-lg">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-navy border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <p className="py-lg text-center font-sans text-[14px] text-helper-text">
            Không tìm thấy nhân viên.
          </p>
        ) : (
          users.map((user: User) => {
            const isSelected = selectedSet.has(user.id);
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => toggleUser(user.id)}
                className="flex w-full items-center justify-between px-[16px] py-[10px] transition-colors hover:bg-list-hover"
                data-testid={`assignee-option-${user.id}`}
              >
                <div className="flex flex-col items-start gap-[2px]">
                  <span className="font-sans text-[14px] font-medium text-navy">
                    {user.name}
                  </span>
                  <span className="font-sans text-[12px] text-helper-text">
                    {user.email}
                  </span>
                </div>
                {isSelected && (
                  <Check size={16} className="flex-shrink-0 text-navy" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
