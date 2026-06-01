import { API_ROUTES } from "@/lib/constants";

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

  const res = await fetch(API_ROUTES.sendResult, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let message = "Could not send email. Please try again.";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // use default message
    }
    throw new Error(message);
  }
}
