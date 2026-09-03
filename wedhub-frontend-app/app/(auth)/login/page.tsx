import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getOptionalSession } from "@/lib/auth/dal";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Log in",
};

const roleHomeRoute: Record<string, string> = {
  END_USER: "/shortlist",
  VENDOR: "/vendor/dashboard",
  ADMIN: "/admin/dashboard",
};

export default async function LoginPage() {
  const session = await getOptionalSession();
  if (session) {
    redirect(roleHomeRoute[session.role] ?? "/");
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
          <h2 className="mb-2 text-2xl leading-snug font-bold">
            Find the vendors who make your wedding day yours.
          </h2>
          <p className="text-sm opacity-85">
            Photographers, venues, makeup artists and more — all in one place.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex justify-center">
            <BrandLogo variant="dark" />
          </div>
          <h1 className="mb-2 text-center text-[30px] font-bold text-brand-ink-soft">Welcome back</h1>
          <p className="mb-7 text-center text-sm text-text-grey">
            New to itsmyKalyanam?
            <Link href="/signup" className="ml-1 font-bold text-brand-primary no-underline">
              Create an account
            </Link>
          </p>

          <LoginForm />

          <p className="mb-3 text-center text-[13px] text-text-grey">
            <Link href="/forgot-password" className="font-semibold text-text-grey hover:underline">
              Forgot password?
            </Link>
          </p>
          <p className="text-center text-[13px] text-text-grey">
            <Link href="/" className="font-semibold text-brand-primary no-underline hover:underline">
              ← Go to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
