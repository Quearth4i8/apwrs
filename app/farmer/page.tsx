import type { Metadata } from "next";
import { FarmerApp } from "@/components/farmer";

export const metadata: Metadata = { title: "My farm" };

export default function FarmerPage() {
  return <FarmerApp />;
}
