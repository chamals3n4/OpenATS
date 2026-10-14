export function generateAssessmentUrl(token: string): string {
  return `${window.location.origin}/assessment/${token}`;
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
