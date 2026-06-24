import { useRef, useCallback } from 'react';
import { Paperclip, X, File as FileIcon } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Tooltip } from '@/shared/ui/Tooltip';

// ── AttachmentPicker ──────────────────────────────────────────────────────
// File input styled like Gmail attach button.
// Managed externally: parent holds the File[] state.

export interface AttachmentPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  /** Accept string forwarded to <input accept> — defaults to all files */
  accept?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export function AttachmentPicker({ files, onChange, accept }: AttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = Array.from(e.target.files ?? []);
      if (picked.length === 0) return;
      // Merge — deduplicate by name+size
      const existing = new Set(files.map((f) => `${f.name}-${f.size}`));
      const merged = [...files, ...picked.filter((f) => !existing.has(`${f.name}-${f.size}`))];
      onChange(merged);
      // Reset input so the same file can be re-added after removal
      e.target.value = '';
    },
    [files, onChange],
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(files.filter((_, i) => i !== index));
    },
    [files, onChange],
  );

  return (
    <div className="flex flex-col gap-sm">
      {/* Hidden native file input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
        aria-label="Chọn file đính kèm"
      />

      {/* Trigger button */}
      <div className="flex items-center">
        <Tooltip label="Đính kèm file" side="top">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClick}
            className="h-7 px-sm py-0 text-[12px] gap-[4px]"
          >
            <Paperclip size={12} />
            Đính kèm file
          </Button>
        </Tooltip>
      </div>

      {/* Attached files list */}
      {files.length > 0 && (
        <ul className="flex flex-col gap-[6px]">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-sm rounded border border-nav-border bg-bg px-sm py-[6px]"
            >
              <FileIcon size={14} className="shrink-0 text-helper-text" />
              <span className="min-w-0 flex-1 truncate font-sans text-[13px] text-navy">
                {file.name}
              </span>
              <span className="shrink-0 font-sans text-[11px] text-helper-text">
                {formatBytes(file.size)}
              </span>
              <Tooltip label={`Xoá file ${file.name}`} side="top">
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="shrink-0 text-helper-text transition-colors hover:text-error"
                  aria-label={`Xoá file ${file.name}`}
                >
                  <X size={14} />
                </button>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
