import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { usersService } from "~/features/users/api/users.service";
import type { CreateUserPayload, UpdateUserPayload } from "~/features/users/types";

export const userKeys = {
  all: ["users"] as const,
  list: () => [...userKeys.all, "list"] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
};

export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: () => usersService.list(),
    staleTime: 60 * 1000,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ""),
    queryFn: () => usersService.get(id as string),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => usersService.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      usersService.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/** Deactivate, never delete. Somebody who has marked anything stays readable. */
export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersService.deactivate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useBulkImportUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => usersService.bulkImport(file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
