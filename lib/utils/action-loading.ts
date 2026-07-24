import { toast } from "sonner";
import { useUiLoading } from "@/stores/ui-loading";

/** Wrap async actions with toast + global busy overlay. */
export async function withActionLoading<T>(
  message: string,
  action: () => Promise<T>,
  successMessage?: string
): Promise<T> {
  const { beginAction, endAction } = useUiLoading.getState();
  beginAction();
  const toastId = toast.loading(message);
  try {
    const result = await action();
    toast.success(successMessage ?? "Xong!", { id: toastId });
    return result;
  } catch (error) {
    const description =
      error instanceof Error ? error.message : "Có lỗi xảy ra";
    toast.error(description, { id: toastId });
    throw error;
  } finally {
    endAction();
  }
}
