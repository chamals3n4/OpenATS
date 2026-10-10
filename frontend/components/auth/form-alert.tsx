import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <Alert variant="destructive">
      <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
