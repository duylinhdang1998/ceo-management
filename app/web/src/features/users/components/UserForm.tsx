import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import type { User } from '@/shared/types';
import { useCreateUser, useUpdateUser } from '../hooks/useUserMutations';

// ── Validation schemas ────────────────────────────────────────────────────
//
// Both modes share a single FormValues type where tempPassword is optional.
// The zod schemas enforce it as required (create) or absent (edit) at
// runtime via .superRefine, keeping a single useForm call with no casts.

// Vietnamese phone: starts with 0, followed by 9 digits (total 10 digits)
const vnPhoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;

// Unified form values — tempPassword is optional at the TS level so both
// create and edit modes can share one useForm<FormValues> without casting.
const formSchema = z.object({
  name: z.string().min(1, 'Tên là bắt buộc').max(100, 'Tên quá dài'),
  email: z.string().min(1, 'Email là bắt buộc').email('Email không hợp lệ'),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || vnPhoneRegex.test(val), {
      message: 'Số điện thoại không đúng định dạng VN (VD: 0901234567)',
    }),
  tempPassword: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Runtime-refined schemas per mode — zod validates tempPassword only on create.
const createSchema = formSchema.superRefine((data, ctx) => {
  if (!data.tempPassword || data.tempPassword.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Vui lòng nhập mật khẩu tạm',
      path: ['tempPassword'],
    });
  }
});

const editSchema = formSchema;

// ── Props ─────────────────────────────────────────────────────────────────

export interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided: edit mode. When undefined: create mode. */
  user?: User;
}

// ── UserForm component ────────────────────────────────────────────────────

export function UserForm({ isOpen, onClose, user }: UserFormProps) {
  const isEdit = Boolean(user);
  const { mutate: createUser, isPending: isCreating, error: createError } = useCreateUser();
  const { mutate: updateUser, isPending: isUpdating, error: updateError } = useUpdateUser();

  const isPending = isCreating || isUpdating;
  const apiError = createError ?? updateError;
  const serverMessage =
    apiError?.response?.data?.error?.message ??
    apiError?.response?.data?.message ??
    (apiError ? 'Có lỗi xảy ra, vui lòng thử lại.' : null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      tempPassword: '',
    },
  });

  // Reset when user prop changes (edit different users)
  useEffect(() => {
    if (isOpen) {
      reset({
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        tempPassword: '',
      });
    }
  }, [isOpen, user, reset]);

  const onSubmit = (values: FormValues) => {
    if (isEdit && user) {
      updateUser(
        {
          id: user.id,
          name: values.name,
          email: values.email,
          phone: values.phone || undefined,
        },
        { onSuccess: onClose },
      );
    } else {
      createUser(
        {
          name: values.name,
          email: values.email,
          phone: values.phone || undefined,
          password: values.tempPassword ?? '',
        },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Sửa nhân viên' : 'Thêm nhân viên'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Hủy
          </Button>
          <Button
            variant="primary"
            isLoading={isPending}
            onClick={handleSubmit(onSubmit)}
          >
            Lưu
          </Button>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-md"
        data-testid="user-form"
      >
        {/* Server error */}
        {serverMessage && (
          <div
            role="alert"
            className="rounded border border-error-muted bg-error-muted px-md py-sm font-sans text-[13px] text-error-text"
          >
            {serverMessage}
          </div>
        )}

        <Input
          label="Tên nhân viên"
          required
          placeholder="Nguyễn Văn An"
          {...register('name')}
          isError={Boolean(errors.name)}
          errorText={errors.name?.message}
        />

        <Input
          label="Email"
          required
          type="email"
          placeholder="van.an@company.com"
          {...register('email')}
          isError={Boolean(errors.email)}
          errorText={errors.email?.message}
        />

        <Input
          label="Số điện thoại (tùy chọn)"
          placeholder="0901234567"
          {...register('phone')}
          isError={Boolean(errors.phone)}
          errorText={errors.phone?.message}
        />

        {!isEdit && (
          <Input
            label="Mật khẩu tạm"
            type="password"
            required
            placeholder="Nhập mật khẩu tạm"
            {...register('tempPassword')}
            isError={Boolean(errors.tempPassword)}
            errorText={errors.tempPassword?.message}
            helperText="Nhân viên sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu."
          />
        )}
      </form>
    </Modal>
  );
}
