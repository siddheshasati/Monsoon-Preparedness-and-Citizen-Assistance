import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ location }) => {
    if (typeof window !== "undefined") {
      const token = sessionStorage.getItem("token");
      if (!token) {
        throw redirect({
          to: "/auth",
          search: {
            redirect: location.pathname,
          },
        });
      }
    }
  },
  component: DashboardShell,
});
