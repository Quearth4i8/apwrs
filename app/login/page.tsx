import type { Metadata } from "next";
import { LoginView } from "@/components/login";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return <LoginView initialView={view === "forgot" ? "forgot" : "login"} />;
}
