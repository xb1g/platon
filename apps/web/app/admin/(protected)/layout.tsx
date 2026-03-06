import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin/admin-shell";
import { readAdminSessionToken } from "../../../lib/admin/auth";
import { ADMIN_SESSION_COOKIE_NAME } from "../../../lib/admin/auth-cookie";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!readAdminSessionToken(token)) {
    redirect("/admin/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
