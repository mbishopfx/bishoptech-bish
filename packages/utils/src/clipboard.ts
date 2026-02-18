/**
 * Copy text to clipboard with fallback support.
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    throw error;
  }
}
