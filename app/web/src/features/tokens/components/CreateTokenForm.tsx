import { useForm } from 'react-hook-form';
import { PlusCircle } from 'lucide-react';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';

// ── CreateTokenForm ────────────────────────────────────────────────────────
// Inline form (name field + submit) for creating a new PAT.

interface FormValues {
  name: string;
}

interface CreateTokenFormProps {
  isLoading: boolean;
  onSubmit: (name: string) => void;
}

export function CreateTokenForm({ isLoading, onSubmit }: CreateTokenFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { name: '' } });

  const submit = handleSubmit(({ name }) => {
    onSubmit(name.trim());
    reset();
  });

  return (
    <form onSubmit={submit} className="flex items-end gap-sm">
      <div className="flex-1">
        <Input
          label="Tên token"
          placeholder="Ví dụ: Claude Skill Production"
          isError={Boolean(errors.name)}
          errorText={errors.name?.message}
          {...register('name', {
            required: 'Tên token không được để trống',
            minLength: { value: 3, message: 'Tên token phải có ít nhất 3 ký tự' },
            maxLength: { value: 80, message: 'Tên token không được vượt quá 80 ký tự' },
          })}
        />
      </div>
      <Button
        type="submit"
        variant="primary"
        size="md"
        isLoading={isLoading}
        className="mb-px shrink-0"
      >
        <PlusCircle size={16} />
        Tạo token mới
      </Button>
    </form>
  );
}
