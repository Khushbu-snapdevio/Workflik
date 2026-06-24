"use client";

export function WorkspaceGreeting({ firstName }: { firstName: string }) {
  const h = new Date().getHours();
  const label = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return (
    <span suppressHydrationWarning>
      {firstName ? (
        <>{label}, {firstName} 👋</>

      ) : (
        <>{label} 👋</>
      )}
    </span>
  );
}
