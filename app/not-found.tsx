import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-page px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-lg bg-muted ring-1 ring-border">
          <FileQuestion
            className="size-6 text-muted-foreground"
            strokeWidth={1.5}
          />
        </div>
        <h1 className="mb-2 text-lg font-bold text-foreground">
          Page not found
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/">Go back home</Link>
        </Button>
      </div>
    </main>
  );
}
