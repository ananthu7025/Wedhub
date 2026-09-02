"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { ApiResponse } from "@/lib/api/types";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const json = (await response.json()) as ApiResponse<{ passwordReset: true }>;

    if (!json.success) {
      setError(json.error.message);
      setPending(false);
      return;
    }

    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      {error && (
        <div className="mb-4 rounded-md bg-red-10 px-4 py-3 text-[13px] font-semibold text-red-70">
          {error}
        </div>
      )}
      <div className="mb-4.5">
        <Input
          type="password"
          placeholder="New password (min. 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </div>
      <Button type="submit" variant="primary" block disabled={pending}>
        {pending ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}
