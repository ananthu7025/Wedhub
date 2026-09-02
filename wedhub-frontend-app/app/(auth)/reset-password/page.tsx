import Link from "next/link";
import type { Metadata } from "next";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex justify-center text-2xl font-semibold text-brand-ink-soft">
          Wed<span className="font-bold text-brand-primary">Hub</span>
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-brand-ink-soft">Set a new password</h1>

        {!token ? (
          <p className="text-center text-sm text-red-70">
            This reset link is missing or invalid.{" "}
            <Link href="/forgot-password" className="font-semibold text-brand-primary no-underline">
              Request a new one
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="mb-7 text-center text-sm text-text-grey">Choose a new password below.</p>
            <ResetPasswordForm token={token} />
          </>
        )}
      </div>
    </div>
  );
}
