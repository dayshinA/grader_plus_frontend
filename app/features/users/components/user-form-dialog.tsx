import { useState, type FormEvent } from "react";
import { Alert } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { PasswordInput } from "~/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { Role } from "~/features/auth/types";
import { useCreateUser } from "~/features/users/api/use-create-user";
import { useUpdateUser } from "~/features/users/api/use-update-user";
import type { UserResponse } from "~/features/users/types";
import { ApiError } from "~/lib/api-client";
import { generateSecurePassword } from "~/utils/generate-password";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "coordinator", label: "Coordinator" },
  { value: "marker", label: "Marker" },
  { value: "super_admin", label: "Super Admin" },
];

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  /** Required when mode is "edit" — the user being edited. */
  user?: UserResponse;
  /** Called after a successful create/update, once the dialog has closed —
   * `apiMessage` is the backend's own confirmation message (see decision #31). */
  onSuccess?: (mode: "create" | "edit", user: UserResponse, apiMessage: string) => void;
}

const EMPTY_FORM = {
  email: "",
  fullName: "",
  role: "marker" as Role,
  learnId: "",
  password: "",
};

/**
 * Note: this component is remounted by its caller (via a `key` that changes
 * every time the dialog is opened) rather than resetting its own state in an
 * effect — see `users-page.tsx`'s `formDialogNonce`. That means form fields
 * and mutation state both start fresh on every open, purely from initial
 * render, with no synchronization effect needed.
 */
export function UserFormDialog({
  open,
  onOpenChange,
  mode,
  user,
  onSuccess,
}: UserFormDialogProps) {
  const [form, setForm] = useState(() =>
    mode === "edit" && user
      ? {
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          learnId: user.learnId ?? "",
          password: "",
        }
      : EMPTY_FORM,
  );
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const mutation = mode === "create" ? createUser : updateUser;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "create") {
      createUser.mutate(
        {
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          role: form.role,
          learnId: form.learnId || null,
        },
        {
          onSuccess: ({ data: created, message }) => {
            onOpenChange(false);
            onSuccess?.("create", created, message);
          },
        },
      );
      return;
    }

    if (!user) return;
    updateUser.mutate(
      {
        id: user.id,
        request: {
          email: form.email,
          fullName: form.fullName,
          role: form.role,
          learnId: form.learnId || null,
          ...(form.password ? { password: form.password } : {}),
        },
      },
      {
        onSuccess: ({ data: updated, message }) => {
          onOpenChange(false);
          onSuccess?.("edit", updated, message);
        },
      },
    );
  }

  const error = mutation.error;
  const isPending = mutation.isPending;

  // Passed to the nested Select below as its portal container — see
  // SelectContentProps.container's doc comment for why this is needed
  // (Dialog's focus-trap vs. a document.body-portaled Select popover).
  const [dialogNode, setDialogNode] = useState<HTMLDivElement | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={setDialogNode}>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add user" : "Edit user"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new account. Set a password below (or generate one) and share it with them manually — there's no email delivery."
              : "Update this user's details. Leave the password blank to keep it unchanged."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert
            variant="inline"
            status="error"
            timeout={0}
            title={mode === "create" ? "Couldn't create user" : "Couldn't update user"}
            message={error instanceof ApiError ? error.message : "Something went wrong. Please try again."}
          />
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-full-name">Full name</Label>
            <Input
              id="user-full-name"
              autoComplete="name"
              required
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-role">Role</Label>
            <Select
              value={form.role}
              onValueChange={(value) => setForm((prev) => ({ ...prev, role: value as Role }))}
            >
              <SelectTrigger id="user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent container={dialogNode}>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-learn-id">Learn ID (optional)</Label>
            <Input
              id="user-learn-id"
              value={form.learnId}
              onChange={(event) => setForm((prev) => ({ ...prev, learnId: event.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="user-password">
                {mode === "create" ? "Password" : "New password (leave blank to keep current)"}
              </Label>
              <Button
                className="h-auto p-0 text-xs"
                onClick={() =>
                  setForm((prev) => ({ ...prev, password: generateSecurePassword() }))
                }
                type="button"
                variant="link"
              >
                Generate secure password
              </Button>
            </div>
            <PasswordInput
              id="user-password"
              autoComplete="new-password"
              required={mode === "create"}
              minLength={8}
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-loading={isPending}>
              {isPending ? "Saving..." : mode === "create" ? "Create" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
