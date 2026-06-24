import { useState, useCallback } from 'react';
import { Search, UserCheck } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Input } from '@/shared/ui/Input';
import { useUsers } from '@/shared/hooks/useUsers';
import type { User } from '@/shared/types';

// ── RecipientPicker ───────────────────────────────────────────────────────
// Shown when AI compose returns requiresRecipientSelection=true.
// Lets CEO search and pick an employee from the active employee list.
// Optionally pre-shows AI-suggested candidates at the top.

export interface RecipientPickerProps {
  /** Pre-filtered candidates from AI compose (shown first) */
  candidates?: Pick<User, 'id' | 'name' | 'email'>[];
  onSelect: (user: Pick<User, 'id' | 'name' | 'email'>) => void;
  selectedId?: string;
}

export function RecipientPicker({ candidates, onSelect, selectedId }: RecipientPickerProps) {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useUsers({ search, limit: 20 });

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  // When candidates are supplied, show them first (no duplicates with full list)
  const candidateIds = new Set((candidates ?? []).map((c) => c.id));
  const filteredUsers = (data?.users ?? []).filter((u) => !candidateIds.has(u.id));

  const renderRow = (user: Pick<User, 'id' | 'name' | 'email'>) => {
    const isSelected = selectedId === user.id;
    return (
      <button
        key={user.id}
        type="button"
        onClick={() => onSelect(user)}
        className={cn(
          'flex w-full items-center gap-sm px-md py-[10px] text-left',
          'border-b border-nav-border last:border-b-0',
          'transition-colors duration-100 hover:bg-bg',
          isSelected && 'bg-[#0F172A06]',
        )}
      >
        {/* Avatar placeholder */}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/10 font-heading text-[12px] font-semibold text-navy">
          {user.name.charAt(0).toUpperCase()}
        </span>

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-sans text-[14px] font-medium text-navy">
            {user.name}
          </span>
          <span className="truncate font-sans text-[12px] text-helper-text">{user.email}</span>
        </span>

        {isSelected && <UserCheck size={16} className="shrink-0 text-sage" />}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-sm">
      <p className="font-sans text-[13px] font-medium text-warning">
        Không tìm thấy người nhận, vui lòng chọn từ danh sách
      </p>

      <Input
        placeholder="Tìm theo tên hoặc email..."
        value={search}
        onChange={handleSearch}
        leftIcon={<Search size={15} />}
      />

      <div className="max-h-[260px] overflow-y-auto rounded border border-nav-border bg-surface shadow-sm">
        {/* AI-suggested candidates first */}
        {candidates && candidates.length > 0 && (
          <>
            <div className="border-b border-nav-border bg-bg px-md py-[6px]">
              <span className="font-sans text-[11px] font-medium uppercase tracking-[0.5px] text-helper-text">
                Gợi ý
              </span>
            </div>
            {candidates.map(renderRow)}
            {filteredUsers.length > 0 && (
              <div className="border-b border-nav-border bg-bg px-md py-[6px]">
                <span className="font-sans text-[11px] font-medium uppercase tracking-[0.5px] text-helper-text">
                  Tất cả nhân viên
                </span>
              </div>
            )}
          </>
        )}

        {/* Full employee list (minus candidates already shown) */}
        {isLoading ? (
          <div className="flex items-center justify-center py-lg">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-navy border-t-transparent" />
          </div>
        ) : filteredUsers.length === 0 && (!candidates || candidates.length === 0) ? (
          <p className="px-md py-md font-sans text-[13px] text-helper-text">
            Không tìm thấy nhân viên nào
          </p>
        ) : (
          filteredUsers.map(renderRow)
        )}
      </div>
    </div>
  );
}
