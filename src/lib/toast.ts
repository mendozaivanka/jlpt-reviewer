import { toast } from "sonner";

export { toast };

/** Copy text to the clipboard and confirm with a toast; falls back to showing the text. */
export async function copyText(text: string, successMessage = `Copied ${text}`) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    // Clipboard blocked (insecure context, permissions): at least show the text
    toast(text);
  }
}
