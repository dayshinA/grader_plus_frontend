import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useDepartments } from "~/features/departments/api/use-departments";
import { DepartmentFormDialog } from "~/features/departments/components/department-form-dialog";
import { useSchools } from "~/features/schools/api/use-schools";

/**
 * The FR43 "create a Department directly within my school" surface for a School Admin — the
 * "My Departments" tab on `coordinator/school-settings.tsx` (decision #38). Unlike
 * `DelegateModuleCreationPanel`/`DelegateDepartmentAdminPanel` one level down, there's no
 * existing edit/delegate action to offer here: `PATCH /departments/:departmentId` stays
 * Super-Admin-only regardless of who created the department, so this panel is read-mostly plus
 * a create action.
 */
export function SchoolAdminDepartmentsPanel() {
  const { data: schools } = useSchools();
  const { data: departments, isLoading, isError } = useDepartments();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogNonce, setCreateDialogNonce] = useState(0);
  const [toast, setToast] = useState<{ id: number; title: string; message: string } | null>(null);

  const adminSchools = useMemo(
    () => (schools ?? []).filter((school) => school.isAdmin === true),
    [schools],
  );
  const schoolOptions = useMemo(
    () => adminSchools.map((school) => ({ id: school.id, label: school.name })),
    [adminSchools],
  );
  const adminSchoolIds = useMemo(() => new Set(adminSchools.map((school) => school.id)), [
    adminSchools,
  ]);
  const schoolsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const school of adminSchools) map.set(school.id, school.name);
    return map;
  }, [adminSchools]);

  const departmentsInAdminSchools = useMemo(
    () => (departments ?? []).filter((department) => adminSchoolIds.has(department.schoolId)),
    [departments, adminSchoolIds],
  );

  function showToast(title: string, message: string) {
    setToast({ id: Date.now(), title, message });
  }

  if (adminSchools.length === 0) {
    return (
      <Alert
        variant="inline"
        status="info"
        timeout={0}
        title="No school to create departments in"
        message="You don't administer any school yet — ask a Super Admin to grant you School Admin access first."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">My departments</h2>
          <p className="text-sm text-muted-foreground">
            Departments within the school(s) you administer.
          </p>
        </div>
        <Button
          onClick={() => {
            setCreateDialogOpen(true);
            setCreateDialogNonce((n) => n + 1);
          }}
        >
          <Plus className="h-4 w-4" />
          Add department
        </Button>
      </div>

      {isError && (
        <Alert
          variant="inline"
          status="error"
          timeout={0}
          title="Couldn't load departments"
          message="Something went wrong. Please try again."
        />
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Loading departments...
                </TableCell>
              </TableRow>
            ) : departmentsInAdminSchools.length ? (
              departmentsInAdminSchools.map((department) => (
                <TableRow key={department.id}>
                  <TableCell className="font-medium">{department.code}</TableCell>
                  <TableCell>{department.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {schoolsById.get(department.schoolId) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={department.isActive ? "default" : "outline"}>
                      {department.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No departments yet in the school(s) you administer.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DepartmentFormDialog
        key={createDialogNonce}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        mode="create"
        schoolOptions={schoolOptions}
        onSuccess={(_mode, savedDepartment, apiMessage) =>
          showToast(
            apiMessage,
            `${savedDepartment.name} can now be assigned modules and a Department Admin.`,
          )
        }
      />

      {toast && (
        <Alert
          key={toast.id}
          variant="toast"
          status="success"
          title={toast.title}
          reducedMotion
          timeout={6000}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
