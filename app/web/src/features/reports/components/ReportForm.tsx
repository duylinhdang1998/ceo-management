import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileText, Upload, X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import type { Report } from '../hooks/useReports';
import type { UpdateReportPayload } from '../hooks/useReportMutations';

// ── Constants ──────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES = 70 * 1024 * 1024;
const ACCEPTED_EXT = '.html';

// ── Validation schema (edit mode only; create uses ReportUpload) ───────────
const editSchema = z.object({
  title: z.string().min(1, 'Tiêu đề là bắt buộc').max(200, 'Tiêu đề tối đa 200 ký tự'),
  description: z.string().max(1000, 'Mô tả tối đa 1000 ký tự').optional(),
  status: z.enum(['draft', 'published']),
});

type EditFormValues = z.infer<typeof editSchema>;

// ── Props ──────────────────────────────────────────────────────────────────
export interface ReportFormProps {
  /** When provided the form is in "edit" mode */
  report: Report;
  onSubmit: (payload: UpdateReportPayload) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Nháp (Draft)' },
  { value: 'published', label: 'Đã xuất bản (Published)' },
];

// ── ReportForm ─────────────────────────────────────────────────────────────
// Edit mode form. Allows replacing metadata + optionally uploading a new HTML file.
// Status field shown only in edit mode (create = always published by backend).
export function ReportForm({ report, onSubmit, onCancel, isSubmitting }: ReportFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: report.title,
      description: report.description ?? '',
      status: report.status,
    },
  });

  const statusValue = watch('status');

  // Sync form when report prop changes
  useEffect(() => {
    reset({
      title: report.title,
      description: report.description ?? '',
      status: report.status,
    });
    setSelectedFile(null);
    setFileError(null);
  }, [report, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFileError(null);
    setSelectedFile(null);

    if (!file) return;

    const isHtmlMime = file.type === 'text/html' || file.type === 'text/html; charset=utf-8';
    const isHtmlExt = file.name.toLowerCase().endsWith(ACCEPTED_EXT);
    if (!isHtmlMime && !isHtmlExt) {
      setFileError('Chỉ chấp nhận file HTML (.html)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`Kích thước file vượt quá 70MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFormSubmit = (values: EditFormValues) => {
    const payload: UpdateReportPayload = {
      id: report.id,
      title: values.title,
      description: values.description,
      status: values.status,
    };
    if (selectedFile) payload.file = selectedFile;
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-md" noValidate>
      {/* Title */}
      <Input
        label="Tiêu đề"
        required
        placeholder="Nhập tiêu đề báo cáo"
        isError={Boolean(errors.title)}
        errorText={errors.title?.message}
        {...register('title')}
      />

      {/* Description */}
      <div className="flex flex-col gap-[6px]">
        <label className="font-sans text-[14px] font-medium text-navy">Mô tả</label>
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

      {/* Status (edit only) */}
      <div className="flex flex-col gap-[6px]">
        <label className="font-sans text-[14px] font-medium text-navy">Trạng thái</label>
        <Select
          value={statusValue}
          onValueChange={(v) => setValue('status', v as 'draft' | 'published')}
          options={STATUS_OPTIONS}
          aria-label="Trạng thái báo cáo"
        />
      </div>

      {/* Optional HTML file replacement */}
      <div className="flex flex-col gap-[6px]">
        <label className="font-sans text-[14px] font-medium text-navy">
          Thay thế file HTML{' '}
          <span className="font-normal text-helper-text text-[12px]">(tuỳ chọn)</span>
        </label>

        {selectedFile ? (
          <div className="flex items-center gap-sm rounded border border-nav-border bg-bg px-[14px] py-[10px]">
            <FileText size={16} className="shrink-0 text-helper-text" />
            <span className="flex-1 min-w-0 truncate font-sans text-[14px] text-navy">
              {selectedFile.name}
            </span>
            <span className="shrink-0 font-sans text-[12px] text-helper-text">
              {(selectedFile.size / 1024).toFixed(0)} KB
            </span>
            <button
              type="button"
              onClick={clearFile}
              className="shrink-0 text-helper-text hover:text-error transition-colors"
              aria-label="Xoá file"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-sm rounded border border-dashed border-nav-border bg-bg px-md py-sm hover:border-navy hover:bg-ghost-hover transition-colors cursor-pointer"
            data-testid="upload-replace-dropzone"
          >
            <Upload size={16} className="text-helper-text" />
            <span className="font-sans text-[14px] text-helper-text">
              Chọn file HTML để thay thế (≤70MB)
            </span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".html,text/html"
          className="sr-only"
          onChange={handleFileChange}
          data-testid="replace-file-input"
        />

        {fileError && (
          <p className="font-sans text-[12px] text-error">{fileError}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-sm pt-sm">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Huỷ
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Cập nhật
        </Button>
      </div>
    </form>
  );
}
