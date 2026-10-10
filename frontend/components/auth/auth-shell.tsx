import Image from "next/image";
import { ThemeSwitch } from "@/components/theme/theme-switch";

// Shared frame for the sign-in, forgot password and reset password pages:
// one centered card, with the theme switch in the corner.
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh items-center justify-center bg-muted/40 p-4 sm:p-6 dark:bg-background">
      <ThemeSwitch className="absolute right-4 top-4 sm:right-6 sm:top-6" />

      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex items-center justify-center gap-3 text-4xl font-semibold tracking-tight text-foreground">
          <Image
            src="/assets/openats-logo.png"
            alt=""
            width={52}
            height={52}
            className="size-[52px] object-contain dark:brightness-0 dark:invert"
            priority
          />
          OpenATS
        </div>

        <div className="rounded-xl border border-slate-300 bg-card p-6 shadow-none sm:p-8 dark:border-neutral-700">
          <div className="mb-6 flex flex-col gap-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {description ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
