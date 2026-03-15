import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createNotifier } from "../notify.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, "..", "..", "config", "telegram-config.json");
const LOG_FILE = resolve(__dirname, "..", "..", ".boardroom", "telegram-log.md");

const args = process.argv.slice(2);

if (args[0] === "--approval") {
  const target = args[1];
  const approvalId = args[2];
  const message = args.slice(3).join(" ");

  if (!target || !approvalId || !message) {
    console.log("Usage: tsx src/cli/notify.ts --approval <channel> <approval-id> <message>");
    process.exit(1);
  }

  const { sendApproval } = createNotifier(CONFIG_PATH, LOG_FILE);
  sendApproval(target, message, approvalId).then((ok) => {
    if (!ok) process.exit(1);
  });
} else {
  const target = args[0];
  const message = args.slice(1).join(" ");

  if (!target || !message) {
    console.log("Usage: tsx src/cli/notify.ts <channel> <message>");
    console.log("Channels: briefings, chat, actions, or project name");
    console.log("\nApproval mode:");
    console.log("  tsx src/cli/notify.ts --approval <channel> <approval-id> <message>");
    process.exit(1);
  }

  const { sendText } = createNotifier(CONFIG_PATH, LOG_FILE);
  sendText(target, message).then((id) => {
    if (id === null) process.exit(1);
  });
}
