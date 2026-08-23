import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Empty states are one of the few places the expressive illustration layer is
 * allowed out — alongside onboarding, milestones and referral moments. It stays
 * out of core transactional flows, where it would undercut the professional
 * half of the brand.
 *
 * The illustrations are large and detailed, so they get generous whitespace and
 * never shrink below the size where the grain and outline still read.
 */
export function EmptyState({
  title,
  body,
  action,
  art = "coin",
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  art?: "coin" | "rocket" | "none";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {art !== "none" ? (
        <Image
          src={art === "rocket" ? "/brand/rocket.svg" : "/brand/coin-tilted.svg"}
          alt=""
          width={140}
          height={140}
          // A one-shot entrance, not a loop: this sits on a screen people see
          // often, and continuous motion on a daily surface becomes noise.
          className="mb-7 h-[140px] w-[140px] object-contain linq-fade-in"
          priority={false}
        />
      ) : null}
      <h3 className="text-base font-medium text-text">{title}</h3>
      {body ? <p className="mt-2 max-w-xs text-sm leading-6 text-text-muted">{body}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
