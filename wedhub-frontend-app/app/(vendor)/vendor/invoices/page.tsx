import { redirect } from "next/navigation";

export default function VendorInvoicesPage() {
  redirect("/vendor/finances?tab=invoices");
}
