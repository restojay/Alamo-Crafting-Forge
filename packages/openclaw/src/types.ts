export interface TelegramConfig {
  bot_token: string;
  chat_id: string;
  ceo_user_id: string;
  hub_port: number;
  topics: Record<string, number>;
}

export type MessageType =
  | "text"
  | "voice"
  | "approval_request"
  | "approval_response"
  | "command"
  | "status"
  | "editMessage"
  | "keyboard_message"
  | "direct_message"
  | "callback";

export type MessageChannel = "briefings" | "chat" | "actions";

export const CHANNELS: Record<MessageChannel, string> = {
  briefings: "Briefings",
  chat: "Chat",
  actions: "Action Items",
};

// Project registry — folder name → display name
export const PROJECT_MAP: Record<string, string> = {
  "ECW-Integrations": "ECW Integrations",
  "OpenMill": "Open Mill",
  "ACFDice": "ACF Dice",
  "CCFantasyAPP": "CC Fantasy",
  "MTGApp-Expo": "MTG Mobile",
  "MTGApp": "MTG App",
  "HD2DVTT": "Diorama",
  "Forgepoint": "Forgepoint",
  "Realmforge": "Realmforge",
  "Alamo-Crafting-Forge": "Alamo Crafting Forge",
  "Anvil": "Anvil",
  "MailBridge": "MailBridge",
  "ACFDesigns": "ACF Designs",
  "LaunchControl": "Launch Control",
  "retell-mcp": "Retell MCP",
  "retell-gateway": "Retell Gateway",
  "OpenSCAD-MCP": "DesignForge",
  "Agents": "Boardroom",
};

export function resolveProjectFolder(cwd: string): string | null {
  const sorted = Object.keys(PROJECT_MAP).sort((a, b) => b.length - a.length);
  for (const folder of sorted) {
    if (cwd.includes(folder)) return folder;
  }
  return null;
}

export function resolveProjectName(cwd: string): string {
  const folder = resolveProjectFolder(cwd);
  return folder ? PROJECT_MAP[folder] : "Unknown";
}
