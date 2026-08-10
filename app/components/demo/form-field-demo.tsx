import { FormField } from "~/components/ui/form-field";

export function FormFieldDemo() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <FormField
        label="Email address"
        type="email"
        placeholder="j.smith@lboro.ac.uk"
        hint="Their Loughborough staff address."
      />
      <FormField
        label="Email address"
        type="email"
        defaultValue="taken@example.com"
        error="That email address is already in use."
      />
      <FormField label="Password" type="password" defaultValue="hunter2000" />
    </div>
  );
}
