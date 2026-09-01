import { redirect } from "next/navigation";
import { verifySession, isAdminRole } from "@/lib/dal";

export default async function ConsolePanelRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await verifySession();

  if (!user) {
    redirect("/login?redirect=/console-panel");
  }

  if (!isAdminRole(user.role)) {
    redirect("/trade/demo");
  }

  return <>{children}</>;
}
