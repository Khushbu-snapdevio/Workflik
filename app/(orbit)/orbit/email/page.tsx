import { desc } from "drizzle-orm";
import { OrbitPageHeader } from "@/components/admin/orbit-page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { emailOutbox } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "Email",
};

export default async function OrbitEmailPage() {
  const outbox = await db
    .select()
    .from(emailOutbox)
    .orderBy(desc(emailOutbox.createdAt))
    .limit(50);

  return (
    <div>
      <OrbitPageHeader
        eyebrow="Admin"
        title="Email"
        description="Transactional email queue and delivery status."
      />

      <Card>
        <CardHeader>
          <CardTitle>Outbox</CardTitle>
          <CardDescription>Queued and delivered transactional emails.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outbox.map((email) => (
                <TableRow key={email.id}>
                  <TableCell>{email.recipientEmail}</TableCell>
                  <TableCell>{email.subject}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        email.status === "sent"
                          ? "text-success"
                          : email.status === "failed"
                            ? undefined
                            : "text-warning"
                      }
                      variant={email.status === "failed" ? "destructive" : "default"}
                    >
                      {email.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{email.attemptCount}</TableCell>
                  <TableCell>{formatDateTime(email.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
