import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

// Placeholder until the dashboard feature ships. The real home calls GET /me/home and
// renders whatever the response is shaped as for that caller.
export default function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1">
            <h1 className="text-lg font-medium">GraderPlus</h1>
            <p className="text-sm text-muted-foreground">
              Version 2 rebuild in progress. No screens are wired up yet.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link to="/dev/preview">Component library</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
