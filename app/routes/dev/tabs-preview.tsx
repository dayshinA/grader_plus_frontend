import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

export default function TabsPreview() {
  const [value, setValue] = useState("first");

  return (
    <main className="flex min-h-screen flex-col gap-10 bg-background p-10 text-foreground">
      <h1 className="text-xl font-semibold">Tabs preview</h1>

      <section className="flex max-w-md flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Uncontrolled (defaultValue)</h2>
        <Tabs defaultValue="account">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>
          <TabsContent value="account">Account settings content.</TabsContent>
          <TabsContent value="password">Password settings content.</TabsContent>
        </Tabs>
      </section>

      <section className="flex max-w-md flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Controlled — mirrors the module-settings.tsx "My Modules" / "Delegate Permissions"
          usage
        </h2>
        <Tabs value={value} onValueChange={setValue}>
          <TabsList>
            <TabsTrigger value="first">My Modules</TabsTrigger>
            <TabsTrigger value="second">Delegate Permissions</TabsTrigger>
          </TabsList>
          <TabsContent value="first">My Modules panel content.</TabsContent>
          <TabsContent value="second">Delegate Permissions panel content.</TabsContent>
        </Tabs>
        <p className="text-xs text-muted-foreground">value: {value}</p>
      </section>

      <section className="flex max-w-md flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Disabled trigger</h2>
        <Tabs defaultValue="enabled">
          <TabsList>
            <TabsTrigger value="enabled">Enabled</TabsTrigger>
            <TabsTrigger value="disabled" disabled>
              Disabled
            </TabsTrigger>
          </TabsList>
          <TabsContent value="enabled">Reachable content.</TabsContent>
          <TabsContent value="disabled">Unreachable content.</TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
