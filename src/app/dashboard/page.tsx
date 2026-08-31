import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardPanel } from "@/components/identity/dashboard-panel";
import { getAuth } from "@/server/infra/auth/auth";

export default async function DashboardPage() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="flex flex-1 items-start justify-center px-6 py-16">
      <DashboardPanel />
    </div>
  );
}
