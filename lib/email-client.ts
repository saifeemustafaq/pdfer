import { API_ROUTES } from "@/lib/constants";
import { postFormData } from "@/lib/processing/server/fetch";

type SendResultByEmailInput = {
  blob: Blob;
  filename: string;
  email: string;
  toolLabel: string;
};

export async function sendResultByEmail({
  blob,
  filename,
  email,
  toolLabel,
}: SendResultByEmailInput): Promise<void> {
  const formData = new FormData();
  formData.append("email", email);
  formData.append("file", blob, filename);
  formData.append("filename", filename);
  formData.append("tool", toolLabel);

  await postFormData(
    API_ROUTES.sendResult,
    formData,
    "Could not send email. Please try again."
  );
}
