/** Inline, per-field validation message shown directly under an invalid input (red text, no icon/border of its own — the Input component's `invalid` prop draws the red border). */
export function FieldError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-red">
      {message}
    </p>
  );
}
