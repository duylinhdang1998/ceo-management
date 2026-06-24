// Re-export from shared so feature-internal imports (UserList) keep working.
// The canonical hook lives at @/shared/hooks/useUsers.
export {
  useUsers,
  type UsersQueryParams,
  type UsersPage,
} from '@/shared/hooks/useUsers';
