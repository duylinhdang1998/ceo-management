import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import type { Report } from '../hooks/useReports';
import type { CreateReportPayload, UpdateReportPayload } from '../hooks/useReportMutations';

// ── Validation schema ──────────────────────────────────────────────────────
const reportSchema = z.object({
  title: z.string().min(1, 'Tiêu đề là bắt buộc').max(200, 'Tiêu đề tối đa 200 ký tự'),
  description: z.string().max(1000, 'Mô tả tối đa 1000 ký tự').optional(),
  status: z.enum(['draft', 'published']),
});

type ReportFormValues = z.infer<typeof reportSchema>;

// ── Props ──────────────────────────────────────────────────────────────────
export interface ReportFormProps {
  /** When provided the form is in "edit" mode */
  report?: Report;
  onSubmit: (payload: CreateReportPayload | UpdateReportPayload) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// ── ReportForm ─────────────────────────────────────────────────────────────
// Handles metadata-only create/edit. File upload is handled by ReportUpload.
// Used inside a Modal; parent owns the modal open/close state.
export function ReportForm({ report, onSubmit, onCancel, isSubmitting }: ReportFormProps) {
  const isEdit = Boolean(report);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: report?.title ?? '',
      description: report?.description ?? '',
      status: report?.status ?? 'draft',
    },
  });

  // Sync form when report prop changes (e.g. opening a different report for edit)
  useEffect(() => {
    reset({
      title: report?.title ?? '',
      description: report?.description ?? '',
      status: report?.status ?? 'draft',
    });
  }, [report, reset]);

  const handleFormSubmit = (values: ReportFormValues) => {
    if (isEdit && report) {
      onSubmit({ id: report.id, ...values } satisfies UpdateReportPayload);
    } else {
      onSubmit(values as CreateReportPayload);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-md" noValidate>
      {/* Title */}
      <Input
        label="Tiêu đề"
        placeholder="Nhập tiêu đề báo cáo"
        isError={Boolean(errors.title)}
        errorText={errors.title?.message}
        {...register('title')}
      />

      {/* Description */}
      <div className="flex flex-col gap-[6px]">
        <label className="font-sans text-[14px] font-medium text-navy">
          Mô tả
        </label>
        <textarea
          rows={3}
          placeholder="Mô tả ngắn về báo cáo (tuỳ chọn)"
          className="w-full rounded border border-nav-border bg-surface px-[14px] py-[10px] font-sans text-[14px] text-navy placeholder:text-helper-text hover:border-navy focus:border-2 focus:border-navy focus:shadow-focus focus:outline-none transition-all duration-150 resize-none"
          {...register('description')}
        />
        {errors.description && (
          <p className="font-sans text-[12px] text-error">{errors.description.message}</p>
        )}
      </div>

      {/* Status toggle */}
      <div className="flex flex-col gap-[6px]">
        <label className="font-sans text-[14px] font-medium text-navy">Trạng thái</label>
        <select
          className="w-full h-[42px] rounded border border-nav-border bg-surface px-[14px] font-sans text-[14px] text-navy hover:border-navy focus:border-2 focus:border-navy focus:outline-none transition-all duration-150 cursor-pointer"
          {...register('status')}
        >
          <option value="draft">Nháp (Draft)</option>
          <option value="published">Đã xuất bản (Published)</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-sm pt-sm">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Huỷ
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {isEdit ? 'Cập nhật' : 'Lưu'}
        </Button>
      </div>
    </form>
  );
}
