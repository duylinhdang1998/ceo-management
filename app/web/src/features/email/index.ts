// ── Email feature public API ──────────────────────────────────────────────

// Hooks
export { useAiCompose } from './hooks/useAiCompose';
export type { ComposeRequest, ComposeResult, ComposeRecipient } from './hooks/useAiCompose';
export { useSendEmail } from './hooks/useSendEmail';
export type { SendEmailPayload, SendEmailResult } from './hooks/useSendEmail';

// Components
export { AiEmailButton } from './components/AiEmailButton';
export { AiEmailComposer } from './components/AiEmailComposer';
export { AttachmentPicker } from './components/AttachmentPicker';
export { RecipientPicker } from './components/RecipientPicker';
export { TextareaField } from './components/TextareaField';
export type { TextareaFieldProps } from './components/TextareaField';
export { ReportSelector } from './components/ReportSelector';
export type { ReportSelectorProps } from './components/ReportSelector';
