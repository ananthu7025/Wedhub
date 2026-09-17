import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { ConfirmEmailChangeStatus } from "./ConfirmEmailChangeStatus";

export const metadata: Metadata = {
  title: "Confirm email change",
  robots: { index: false, follow: false },
};

export default async function ConfirmEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex justify-center">
          <BrandLogo variant="dark" />
        </div>
        <h1 className="mb-6 text-center text-2xl font-bold text-brand-ink-soft">Confirm email change</h1>

        {!token ? (
          <p className="text-center text-sm text-red-70">
            This confirmation link is missing or invalid.{" "}
            <Link href="/login" className="font-semibold text-brand-primary no-underline">
              Log in
            </Link>
            .
          </p>
        ) : (
          <ConfirmEmailChangeStatus token={token} />
        )}
      </div>
    </div>
  );
}
