import { redirect } from "next/navigation";
import { verifySession, isAdminRole } from "@/lib/dal";
import { prisma } from "@/lib/db";

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

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { twoFactorEnabled: true },
  });
  if (!profile?.twoFactorEnabled) {
    redirect("/setup-2fa");
  }

  return <>{children}</>;
}
