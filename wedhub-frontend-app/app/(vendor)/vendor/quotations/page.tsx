import { redirect } from "next/navigation";

export default function VendorQuotationsPage() {
  redirect("/vendor/finances?tab=quotes");
}
