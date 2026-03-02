/**
 * Subsidiary Config Template
 *
 * Copy this file and rename it to `<client-slug>.config.ts`.
 * Fill in every field — the config loader will validate it on startup.
 * See SubsidiaryConfig in @servicebot/core/config/types.ts for the full interface.
 */

import type { SubsidiaryConfig } from "@servicebot/core/config/types.js";

const config: SubsidiaryConfig = {
  // Unique slug used as the primary key for this client (kebab-case)
  id: "client-slug",

  // Display name shown in dashboards and agent responses
  name: "Client Business Name",

  // Industry sector (e.g. "salon", "restaurant", "law-firm", "retail")
  sector: "sector",

  email: {
    // The email address that receives inbound customer messages
    inbound: "info@clientdomain.com",

    // SMTP server used to send outbound replies
    smtp: "smtp.gmail.com",

    // Environment variable name holding the email credentials (never hardcode secrets)
    credentialKey: "CLIENT_EMAIL_CREDENTIALS",

    // How often (in minutes) to poll for new inbound email (1–60)
    pollIntervalMinutes: 5,
  },

  agent: {
    // A paragraph the AI agent reads before every reply. Include location,
    // hours, policies, and the ACF Designs client relationship.
    businessContext:
      "This is a client project managed by ACF Designs. " +
      "Describe the business, location, hours, and key policies here.",

    // Adjectives that shape the agent's writing style
    tone: "friendly, professional",

    // Common questions and canned answers the agent can reference
    faq: [
      {
        question: "What are your hours?",
        answer: "Describe hours here.",
      },
      // Add more FAQ entries as needed
    ],

    // List of services or products the business offers
    services: [
      "Service A",
      "Service B",
    ],
  },

  operations: {
    // Human-readable business hours string
    businessHours: "Monday–Friday, 9 AM – 5 PM",

    // Who gets notified when the agent cannot handle a request
    escalationContact: "Owner Name (role)",

    // Optional: override default SLA hours per category
    slaOverrides: {
      booking: 4,
      general: 24,
    },

    // Optional: route task categories to specific handler keys
    // taskRoutingDefaults: {
    //   billing: "cfo",
    // },
  },

  tasks: {
    // Scheduled tasks in cron format (UTC)
    recurring: [
      { label: "Example weekly digest", cron: "0 9 * * 1" },
    ],

    // Task categories used for routing and reporting
    categories: ["booking", "inquiry", "follow-up"],
  },

  // Optional: outbound SMTP for sending emails (separate from inbound Gmail)
  // smtp: {
  //   host: "smtp.sendgrid.net",
  //   port: 587,
  //   secure: false,
  //   username: "apikey",
  //   passwordEnv: "CLIENT_SMTP_PASSWORD",
  //   fromEmail: "ops@clientdomain.com",
  //   fromName: "Client Business Name",
  // },

  // Optional: webhooks fired on specific events
  // webhooks: [
  //   { event: "booking.created", url: "https://hooks.example.com/new-booking" },
  //   { event: "task.completed", url: "https://hooks.example.com/task-done", secretEnv: "HOOK_SECRET" },
  // ],
};

export default config;
