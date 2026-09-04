"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { login } from "@/lib/api/auth-client";
import type { UserRole } from "@/lib/auth/types";
import { formatApiError } from "@/lib/utils/error";

const roleHomeRoute: Record<UserRole, string> = {
  END_USER: "/shortlist",
  VENDOR: "/vendor/dashboard",
  ADMIN: "/admin/dashboard",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = await login(identifier, password);

    if (!result.success) {
      setError(formatApiError(result.error));
      setPending(false);
      return;
    }

    const next = searchParams.get("next");
    const destination = next ?? roleHomeRoute[result.data.user.role];
    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {error && (
        <div className="mb-4 rounded-md bg-red-10 px-4 py-3 text-[13px] font-semibold text-red-70">
          {error}
        </div>
      )}

      <div className="mb-4.5">
        <Input
          type="text"
          placeholder="Email or phone"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          autoComplete="username"
        />
      </div>
      <div className="mb-4">
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      <Button type="submit" variant="primary" block disabled={pending} className="mb-4">
        {pending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
