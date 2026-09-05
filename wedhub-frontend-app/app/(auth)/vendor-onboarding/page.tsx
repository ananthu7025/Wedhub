import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/dal";
import { getMyVendor } from "@/lib/api/vendor-self";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { VendorOnboardingForm } from "./VendorOnboardingForm";

export const metadata: Metadata = {
  title: "Complete Vendor Setup | itsmyKalyanam",
};

export default async function VendorOnboardingPage() {
  await requireRole("VENDOR");

  // If the vendor profile row is already set up, jump straight to the dashboard.
  try {
    const existing = await getMyVendor();
    if (existing?.data?.id) {
      redirect("/vendor/dashboard");
    }
  } catch {
    // 404 expected when no vendor profile exists yet — continue to render the onboarding form.
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-2/5 overflow-hidden bg-gradient-to-br from-reseda-green-70 to-jet-black-90 lg:block">
        <Image
          src="https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=60"
          alt=""
          fill
          className="object-cover opacity-55"
          priority
        />
        <div className="absolute inset-0 flex flex-col justify-end p-12 text-white">
          <h2 className="mb-2 text-2xl font-bold leading-snug">
            Grow your wedding business with itsmyKalyanam.
          </h2>
          <p className="text-sm opacity-85">
            Connect with couples, showcase your portfolio, manage client leads, and get booked effortlessly.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-7 flex justify-center">
            <BrandLogo variant="dark" />
          </div>
          <h1 className="mb-2 text-center text-[28px] font-bold text-brand-ink-soft">
            Set up your vendor profile
          </h1>
          <p className="mb-8 text-center text-sm text-text-grey">
            Just one quick step to create your business listing and access your dashboard.
          </p>

          <VendorOnboardingForm />
        </div>
      </div>
    </div>
  );
}
