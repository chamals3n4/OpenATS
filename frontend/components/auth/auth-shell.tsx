import Image from "next/image";

// Shared frame for the sign-in, forgot password and reset password pages.
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
    <div className="flex min-h-svh items-center justify-center bg-background p-6 md:p-8">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Image
            src="/assets/openats-logo.png"
            alt="OpenATS"
            width={40}
            height={40}
            className="size-10 object-contain dark:brightness-0 dark:invert"
            priority
          />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {description ? (
              <p className="text-sm text-muted-foreground text-balance">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
