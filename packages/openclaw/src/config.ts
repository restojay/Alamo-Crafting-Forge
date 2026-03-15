import { readFileSync, writeFileSync } from "fs";
import type { TelegramConfig } from "./types.js";

let _config: TelegramConfig | null = null;
let _configPath: string | null = null;

export function loadConfig(configPath?: string): TelegramConfig {
  if (_config) return _config;

  _configPath = configPath ?? null;
  let fileConfig: Record<string, unknown> = {};

  if (_configPath) {
    try {
      fileConfig = JSON.parse(readFileSync(_configPath, "utf-8"));
    } catch {
      // Config file missing — rely on env vars / defaults
    }
  }

  _config = {
    bot_token: (process.env.TELEGRAM_BOT_TOKEN || fileConfig.bot_token || "") as string,
    chat_id: (fileConfig.chat_id || "") as string,
    ceo_user_id: (process.env.CEO_USER_ID || fileConfig.ceo_user_id || "") as string,
    hub_port: parseInt(process.env.HUB_PORT || String(fileConfig.hub_port || 7700), 10),
    topics: (fileConfig.topics || {}) as Record<string, number>,
  };

  return _config;
}

export function resetConfig(): void {
  _config = null;
  _configPath = null;
}

export function getChannelTopicId(channel: string): number {
  const config = _config ?? loadConfig();
  return config.topics[channel] || config.topics["chat"] || 0;
}

export function saveTopicMapping(folder: string, topicId: number): void {
  const config = _config ?? loadConfig();
  config.topics[folder] = topicId;

  if (!_configPath) return;

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(readFileSync(_configPath, "utf-8"));
  } catch {
    console.error("Failed to read config file for topic save — skipping write");
    return;
  }

  raw.topics = config.topics;
  writeFileSync(_configPath, JSON.stringify(raw, null, 4), "utf-8");
}

export function getHubUrl(): string {
  const config = _config ?? loadConfig();
  return process.env.HUB_URL || `http://127.0.0.1:${config.hub_port}`;
}
