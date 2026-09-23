import type { Metadata } from "next";
import { Landing } from "@/components/landing";

export const metadata: Metadata = {
  title: "APWRS — Plant on the right day, even in a drought year",
};

export default function Page() {
  return <Landing />;
}
