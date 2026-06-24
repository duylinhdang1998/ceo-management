/**
 * TanStack Query key factories.
 * Centralise all query keys to avoid string duplication and allow
 * precise cache invalidation.
 */

export const queryKeys = {
  // Auth
  me: () => ['me'] as const,

  // Users
  users: {
    all: () => ['users'] as const,
    list: (params: Record<string, unknown>) => ['users', 'list', params] as const,
    detail: (id: string) => ['users', id] as const,
  },

  // Reports
  reports: {
    all: () => ['reports'] as const,
    list: (params: Record<string, unknown>) => ['reports', 'list', params] as const,
    detail: (id: string) => ['reports', id] as const,
    content: (id: string) => ['reports', id, 'content'] as const,
  },

  // Assignments
  assignments: {
    byReport: (reportId: string) => ['assignments', reportId] as const,
  },

  // Notes
  notes: {
    byReport: (reportId: string) => ['notes', reportId] as const,
  },

  // Email logs
  emailLogs: {
    all: () => ['email-logs'] as const,
    list: (params: Record<string, unknown>) => ['email-logs', 'list', params] as const,
  },

  // Personal access tokens
  tokens: {
    all: () => ['tokens'] as const,
  },
} as const;
