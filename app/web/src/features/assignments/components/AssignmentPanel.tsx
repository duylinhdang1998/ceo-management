import { useState, useMemo, useCallback, useEffect } from 'react';
import { UserX } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import type { User } from '@/shared/types';
import { AssigneePicker } from './AssigneePicker';
import {
  useReportAssignees,
  useAssign,
  useUnassign,
  type ReportDetail,
} from '../hooks/useAssignments';

// ── Types ─────────────────────────────────────────────────────────────────

export interface AssignmentPanelProps {
  reportId: string;
  /** Pass report detail if already fetched in parent (avoids second fetch) */
  reportDetail?: ReportDetail;
}

// ── AssignmentPanel component ─────────────────────────────────────────────
// Shows current assignees for a report, allows adding/removing via AssigneePicker.

export function AssignmentPanel({ reportId, reportDetail }: AssignmentPanelProps) {
  const { data: currentAssignees = [], isLoading: isLoadingAssignees } =
    useReportAssignees(reportId, reportDetail);

  const currentIds = useMemo(
    () => currentAssignees.map((u: User) => u.id),
    [currentAssignees],
  );

  // Local draft selection: initialized from current assignees once data loads
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && currentIds.length > 0) {
      setSelectedIds(currentIds);
      setInitialized(true);
    }
  }, [currentIds, initialized]);

  const { mutate: assign, isPending: isAssigning } = useAssign();
  const { mutate: unassign, isPending: isUnassigning } = useUnassign();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isPending = isAssigning || isUnassigning;

  const handleSave = useCallback(() => {
    setSuccessMsg(null);
    setErrorMsg(null);

    const currentSet = new Set(currentIds);
    const selectedSet = new Set(selectedIds);

    const toAdd = selectedIds.filter((id) => !currentSet.has(id));
    const toRemove = currentIds.filter((id) => !selectedSet.has(id));

    const doAssign = () => {
      if (toAdd.length === 0 && toRemove.length === 0) {
        setSuccessMsg('Không có thay đổi.');
        return;
      }

      const assignPromise =
        toAdd.length > 0
          ? new Promise<void>((res, rej) =>
              assign(
                { reportId, userIds: toAdd },
                {
                  onSuccess: () => res(),
                  onError: (err) => rej(err),
                },
              ),
            )
          : Promise.resolve();

      const unassignPromise =
        toRemove.length > 0
          ? new Promise<void>((res, rej) =>
              unassign(
                { reportId, userIds: toRemove },
                {
                  onSuccess: () => res(),
                  onError: (err) => rej(err),
                },
              ),
            )
          : Promise.resolve();

      Promise.all([assignPromise, unassignPromise])
        .then(() => setSuccessMsg('Gán báo cáo thành công'))
        .catch((err: unknown) => {
          const axiosErr = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
          setErrorMsg(
            axiosErr?.response?.data?.error?.message ??
              axiosErr?.response?.data?.message ??
              'Có lỗi xảy ra khi lưu.',
          );
        });
    };

    doAssign();
  }, [currentIds, selectedIds, assign, unassign, reportId]);

  const hasChanges = useMemo(() => {
    const currentSet = new Set(currentIds);
    const selectedSet = new Set(selectedIds);
    if (currentSet.size !== selectedSet.size) return true;
    for (const id of currentSet) {
      if (!selectedSet.has(id)) return true;
    }
    return false;
  }, [currentIds, selectedIds]);

  if (isLoadingAssignees) {
    return (
      <div className="flex justify-center py-xl">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-navy border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md" data-testid="assignment-panel">
      <h3 className="font-heading text-h3 font-semibold text-navy">
        Nhân viên được gán
      </h3>

      {/* Current assignees quick view */}
      {currentAssignees.length > 0 ? (
        <div className="flex flex-wrap gap-xs" data-testid="current-assignees">
          {currentAssignees.map((user: User) => (
            <div key={user.id} className="flex items-center gap-[4px]">
              <Chip variant="filter">{user.name}</Chip>
              <button
                type="button"
                title={`Bỏ gán ${user.name}`}
                className="rounded p-[2px] text-helper-text hover:text-error transition-colors"
                onClick={() =>
                  setSelectedIds((prev) => prev.filter((id) => id !== user.id))
                }
              >
                <UserX size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-sans text-[14px] text-helper-text">
          Chưa có nhân viên nào được gán.
        </p>
      )}

      <div className="border-t border-nav-border pt-md">
        <p className="mb-sm font-sans text-[13px] font-medium text-navy">
          Chọn nhân viên
        </p>
        <AssigneePicker selectedIds={selectedIds} onChange={setSelectedIds} />
      </div>

      {/* Feedback */}
      {successMsg && (
        <p
          role="status"
          className="font-sans text-[13px] text-success-text"
          data-testid="assignment-success"
        >
          {successMsg}
        </p>
      )}
      {errorMsg && (
        <p
          role="alert"
          className="font-sans text-[13px] text-error-text"
          data-testid="assignment-error"
        >
          {errorMsg}
        </p>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          isLoading={isPending}
          disabled={!hasChanges}
          onClick={handleSave}
        >
          Xác nhận gán
        </Button>
      </div>
    </div>
  );
}
