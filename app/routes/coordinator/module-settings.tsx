export function meta() {
  return [{ title: "Module Settings — GraderPlus" }];
}

export default function ModuleSettings() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Module Settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Coming soon. Will hold module create/edit (code, name,
        discrepancyThreshold, markingDeadline, departmentId) plus, for
        Department Admins, the FR40 delegate-module-creation-permission
        action as a tab on this same screen (see SYSTEM_DESIGN.md decision
        log).
      </p>
    </div>
  );
}
