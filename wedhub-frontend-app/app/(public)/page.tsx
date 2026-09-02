import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="mb-2 text-xs font-bold tracking-wide text-text-grey uppercase">
        Frontend Arch Phase 0/1 — scaffold + auth
      </p>
      <h1 className="mb-4 text-3xl font-bold text-brand-ink-soft">
        Wed<span className="text-brand-primary">Hub</span>
      </h1>
      <p className="mb-8 text-text-grey">
        Project setup, design system, and auth flows are in place. The real home screen (ported from{" "}
        <code>../wedhub-frontend/couple/home.html</code>) ships in Frontend Arch Phase 2 — see{" "}
        <code>frontenddocs/04-stage-couple-experience.md</code>.
      </p>
      <Card className="mb-4">
        <p className="mb-4 text-sm text-text-grey">Design system smoke test:</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="dark">Dark</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
      </Card>
      <div className="flex gap-3">
        <Button href="/login" variant="primary">
          Log in
        </Button>
        <Button href="/signup" variant="secondary">
          Sign up
        </Button>
      </div>
    </main>
  );
}
