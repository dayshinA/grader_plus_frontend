import { api, apiWithMessage } from "~/lib/api-client";
import type { ApiResult } from "~/lib/api-client";
import type {
  BulkImportResult,
  CreateUserPayload,
  CreatedUser,
  UpdateMePayload,
  UpdateUserPayload,
  User,
} from "~/features/users/types";

/** Accounts. Deactivated, never deleted, so anybody who has marked stays readable. */
export const usersService = {
  me(): Promise<User> {
    return api.get<User>("/me");
  },

  updateMe(payload: UpdateMePayload): Promise<ApiResult<User>> {
    return apiWithMessage.patch<User>("/me", payload);
  },

  /** The whole set. There is no pagination anywhere in this API. */
  list(): Promise<User[]> {
    return api.get<User[]>("/users");
  },

  get(id: string): Promise<User> {
    return api.get<User>(`/users/${id}`);
  },

  /** Answers with the account, its first grant, and a generated password if one was made. */
  create(payload: CreateUserPayload): Promise<ApiResult<CreatedUser>> {
    return apiWithMessage.post<CreatedUser>("/users", payload);
  },

  update(id: string, payload: UpdateUserPayload): Promise<ApiResult<User>> {
    return apiWithMessage.patch<User>(`/users/${id}`, payload);
  },

  deactivate(id: string): Promise<ApiResult<User>> {
    return apiWithMessage.post<User>(`/users/${id}/deactivate`);
  },

  /**
   * A CSV or XLSX of email, name, role and the scope columns that role uses, named by what
   * a person has in front of them (school code, unit name, module code, academic year)
   * rather than UUIDs. Rows are independent, so a failed row never undoes an earlier one.
   */
  bulkImport(file: File): Promise<ApiResult<BulkImportResult>> {
    const body = new FormData();
    body.append("file", file);
    return apiWithMessage.post<BulkImportResult>("/users/bulk-import", body);
  },
};
