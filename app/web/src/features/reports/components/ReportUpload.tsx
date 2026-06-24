import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import type { CreateReportPayload } from '../hooks/useReportMutations';

// ── Constants ──────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_MIME = 'text/html';
const ACCEPTED_EXT = '.html';

// ── Validation schema ──────────────────────────────────────────────────────
const uploadSchema = z.object({
  title: z.string().min(1, 'Tiêu đề là bắt buộc').max(200, 'Tiêu đề tối đa 200 ký tự'),
  description: z.string().max(1000).optional(),
  status: z.enum(['draft', 'published']),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

// ── Props ──────────────────────────────────────────────────────────────────
export interface ReportUploadProps {
  onSubmit: (payload: CreateReportPayload) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// ── ReportUpload ───────────────────────────────────────────────────────────
// Create-only form with file upload. Validates file type (.html) and size (≤5MB)
// client-side before sending to the server.
export function ReportUpload({ onSubmit, onCancel, isSubmitting }: ReportUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { status: 'draft' },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFileError(null);
    setSelectedFile(null);

    if (!file) return;

    // Type check — must be .html
    const isHtmlMime = file.type === ACCEPTED_MIME || file.type === 'text/html; charset=utf-8';
    const isHtmlExt = file.name.toLowerCase().endsWith(ACCEPTED_EXT);
    if (!isHtmlMime && !isHtmlExt) {
      setFileError('Chỉ chấp nhận file HTML (.html)');
      // Reset input so the same file can be re-selected after correction
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Size check — ≤ 5 MB
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`Kích thước file vượt quá 5MB (hiện tại: ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
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

  const handleFormSubmit = (values: UploadFormValues) => {
    if (!selectedFile) {
      setFileError('Vui lòng chọn file HTML');
      return;
    }
    onSubmit({ ...values, file: selectedFile });
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
        <label className="font-sans text-[14px] font-medium text-navy">Mô tả</label>
        <textarea
          rows={2}
          placeholder="Mô tả ngắn về báo cáo (tuỳ chọn)"
          className="w-full rounded border border-nav-border bg-surface px-[14px] py-[10px] font-sans text-[14px] text-navy placeholder:text-helper-text hover:border-navy focus:border-2 focus:border-navy focus:shadow-focus focus:outline-none transition-all duration-150 resize-none"
          {...register('description')}
        />
      </div>

      {/* Status */}
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

      {/* File upload */}
      <div className="flex flex-col gap-[6px]">
        <label className="font-sans text-[14px] font-medium text-navy">
          File HTML <span className="text-error">*</span>
        </label>

        {selectedFile ? (
          /* Selected file preview */
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
          /* Drop zone / browse button */
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-sm rounded border-2 border-dashed border-nav-border bg-bg px-lg py-xl hover:border-navy hover:bg-ghost-hover transition-colors text-center cursor-pointer"
            data-testid="upload-dropzone"
          >
            <Upload size={24} className="text-helper-text" />
            <span className="font-sans text-[14px] font-medium text-navy">
              Chọn file HTML
            </span>
            <span className="font-sans text-[12px] text-helper-text">
              Chỉ chấp nhận .html — tối đa 5MB
            </span>
          </button>
        )}

        {/* Hidden input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,text/html"
          className="sr-only"
          onChange={handleFileChange}
          data-testid="file-input"
        />

        {fileError && (
          <p className="font-sans text-[12px] text-error" data-testid="file-error">
            {fileError}
          </p>
        )}
        <p className="font-sans text-[12px] text-helper-text">
          Kích thước giới hạn: 5MB. Chỉ chấp nhận định dạng HTML.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-sm pt-sm">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Huỷ
        </Button>
        <Button type="submit" isLoading={isSubmitting} disabled={!selectedFile || isSubmitting}>
          Tạo báo cáo
        </Button>
      </div>
    </form>
  );
}
