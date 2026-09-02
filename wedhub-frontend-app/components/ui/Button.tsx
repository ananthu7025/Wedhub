import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "dark" | "ghost" | "danger";
type ButtonSize = "md" | "sm";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand-primary text-white shadow-[0_4px_12px_rgba(224,11,65,0.18)] hover:bg-brand-primary-hover",
  secondary: "bg-white text-text-dark border border-border hover:bg-surface-input",
  dark: "bg-jet-black-90 text-white hover:bg-jet-black-70",
  ghost: "bg-transparent text-text-grey hover:bg-surface-input hover:text-text-dark",
  danger: "bg-white text-red border border-red-10 hover:bg-red-10",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "px-5 py-3 text-sm",
  sm: "px-3.5 py-2 text-[13px]",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-md font-bold font-sans transition-colors active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  children?: ReactNode;
}

type ButtonAsButtonProps = ButtonOwnProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof ButtonOwnProps> & {
    href?: undefined;
  };

type ButtonAsLinkProps = ButtonOwnProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof ButtonOwnProps> & {
    href: ComponentPropsWithoutRef<typeof Link>["href"];
  };

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", block = false, className, children, ...rest } = props;

  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    block && "w-full",
    className,
  );

  if ("href" in rest && rest.href !== undefined) {
    const { href, ...linkRest } = rest as ButtonAsLinkProps;
    return (
      <Link href={href} className={classes} {...linkRest}>
        {children}
      </Link>
    );
  }

  const buttonRest = rest as Omit<ButtonAsButtonProps, keyof ButtonOwnProps | "className">;
  return (
    <button className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
