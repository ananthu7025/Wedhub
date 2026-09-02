import type { CategorySelf } from "@/lib/api/vendor-self.types";

/**
 * Services offered — checkboxes sourced from the real category's services
 * list (GET /categories/:slug now embeds `services`, a Frontend Arch Phase
 * 5 backend addition — see ../docs/11-progress-log.md). Selection is
 * committed via POST/DELETE /vendors/me/services on save (see
 * ProfileEditor's diff-based sync), not this component directly.
 */
export function ServicesSection({
  category,
  selectedServiceIds,
  onChange,
}: {
  category: CategorySelf;
  selectedServiceIds: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const services = category.services ?? [];
  if (services.length === 0) {
    return null;
  }

  return (
    <div className="mb-3.5 text-sm">
      <span className="mb-1.5 block font-bold text-[13px]">Services offered</span>
      <div className="grid grid-cols-2 gap-2">
        {services.map((service) => (
          <label key={service.id} className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={selectedServiceIds.has(service.id)}
              onChange={(e) => {
                const next = new Set(selectedServiceIds);
                if (e.target.checked) next.add(service.id);
                else next.delete(service.id);
                onChange(next);
              }}
              className="accent-brand-primary"
            />
            {service.name}
          </label>
        ))}
      </div>
    </div>
  );
}
