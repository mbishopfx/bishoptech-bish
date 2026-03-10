import { toast } from "sonner"

/**
 * Copy text to clipboard with fallback support.
 * Triggers a success toast on copy, or an error toast on failure.
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
    }
    toast.success("Copied to clipboard")
  } catch (error) {
    console.error("Failed to copy to clipboard:", error)
    toast.error("Failed to copy")
    throw error
  }
}
