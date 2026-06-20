"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsIndexPage() {
  const router  = useRouter();
  const params  = useParams<{ workspace: string }>();

  useEffect(() => {
    router.replace(`/app/${params.workspace}/settings/profile`);
  }, [params.workspace, router]);

  return null;
}
