import nodemailer from "nodemailer";
import { sanitizeFilename } from "@/lib/file-utils";

type SendResultEmailInput = {
  to: string;
  filename: string;
  buffer: Buffer;
  mimeType: string;
  toolLabel: string;
};

function getEmailConfig() {
  const sender = process.env.GMAIL_SENDER?.trim();
  const password = process.env.GMAIL_APP_PASSWORD?.trim();

  if (!sender || !password) {
    throw new Error("Email delivery is not configured.");
  }

  return { sender, password };
}

/** Send a processed file to the user via Gmail SMTP. Sender is BCC'd. */
export async function sendResultEmail({
  to,
  filename,
  buffer,
  mimeType,
  toolLabel,
}: SendResultEmailInput): Promise<void> {
  const { sender, password } = getEmailConfig();
  const safeFilename = sanitizeFilename(filename);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: sender,
      pass: password,
    },
  });

  await transporter.sendMail({
    from: `"Pdfer" <${sender}>`,
    to,
    bcc: sender,
    subject: `Your ${toolLabel} from Pdfer`,
    text: [
      "Your file is attached.",
      "",
      "Pdfer processed it in memory and did not store a copy.",
      "If you did not request this email, you can ignore it.",
    ].join("\n"),
    attachments: [
      {
        filename: safeFilename,
        content: buffer,
        contentType: mimeType,
      },
    ],
  });
}
