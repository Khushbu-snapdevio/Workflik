"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  token:         string;
  workspaceName: string;
  workspaceIcon: string | null;
  role:          string;
};

export function AcceptInviteClient({ token, workspaceName, workspaceIcon, role }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function accept() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invite/${token}/accept`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to accept invite");
        return;
      }
      const data = await res.json() as { workspaceSlug?: string };
      router.replace(data.workspaceSlug ? `/workspaces/join-setup/${data.workspaceSlug}` : "/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-page px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            {workspaceIcon && (
              <span className="mb-2 block text-4xl">{workspaceIcon}</span>
            )}
            <CardTitle>Join {workspaceName}</CardTitle>
            <CardDescription>
              You&apos;ve been invited to join as{" "}
              <strong className="capitalize">{role}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && (
              <p className="rounded bg-destructive/10 p-3 text-destructive text-sm">
                {error}
              </p>
            )}
            <Button className="w-full" disabled={loading} onClick={accept}>
              {loading ? "Joining..." : `Accept and join ${workspaceName}`}
            </Button>
            <Button
              className="w-full"
              disabled={loading}
              onClick={() => router.replace("/dashboard")}
              variant="ghost"
            >
              Decline
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
