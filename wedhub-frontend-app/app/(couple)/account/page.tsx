import type { Metadata } from "next";
import { CoupleShell } from "@/components/shared/CoupleShell";
import { getMe } from "@/lib/api/account";
import { AccountActions, AccountDetailsForm, NotificationPreferencesForm, WeddingDetailsForm } from "./AccountForms";

export const metadata: Metadata = {
  title: "My Profile",
};

export default async function AccountPage() {
  const { data: me } = await getMe();
  const displayName = [me.profile?.firstName, me.profile?.lastName].filter(Boolean).join(" ") || me.email;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <CoupleShell activeHref="/account">
      <div className="mx-auto max-w-[640px] px-6 py-8">
        <div className="mb-7 flex items-center gap-4.5">
          <div className="flex h-18 w-18 items-center justify-center rounded-full bg-brand-ink-soft text-xl font-bold text-white">
            {initials}
          </div>
          <div>
            <h1 className="mb-0.5 text-2xl font-bold">{displayName}</h1>
            <p className="text-sm text-text-grey">{me.email}</p>
          </div>
        </div>

        <section className="mb-5 rounded-xl border border-border bg-white p-6">
          <h3 className="mb-4 text-base font-bold">Wedding details</h3>
          <WeddingDetailsForm me={me} />
        </section>

        <section className="mb-5 rounded-xl border border-border bg-white p-6">
          <h3 className="mb-4 text-base font-bold">Account</h3>
          <AccountDetailsForm me={me} />
        </section>

        <section className="mb-5 rounded-xl border border-border bg-white p-6">
          <h3 className="mb-1 text-base font-bold">Notification preferences</h3>
          <NotificationPreferencesForm me={me} />
        </section>

        <section className="rounded-xl border border-border bg-white p-6">
          <h3 className="mb-4 text-base font-bold">Account actions</h3>
          <AccountActions />
        </section>
      </div>
    </CoupleShell>
  );
}
