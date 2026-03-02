import type { SubsidiaryConfig } from "@servicebot/core/config/types.js";

const config: SubsidiaryConfig = {
  id: "sunny-side-hvac",
  name: "Sunny Side HVAC",
  sector: "hvac",

  email: {
    inbound: "info@sunnysidehvac.com",
    smtp: "smtp.gmail.com",
    credentialKey: "SUNNY_SIDE_EMAIL_CREDENTIALS",
    pollIntervalMinutes: 5,
  },

  agent: {
    businessContext:
      "Sunny Side HVAC is a client project managed by ACF Designs. " +
      "It is a residential and commercial HVAC contractor located at " +
      "4210 Brackenridge Ave, San Antonio TX. " +
      "Service calls Monday through Saturday, emergency service available 24/7. " +
      "Licensed and insured. " +
      "Owner: Maria Santos. Tech and website managed by ACF Designs.",
    tone: "professional and friendly",
    faq: [
      {
        question: "Do you offer emergency service?",
        answer:
          "Yes, Sunny Side HVAC offers 24/7 emergency HVAC service. Call us anytime.",
      },
      {
        question: "What are your hours?",
        answer:
          "We schedule service calls Monday through Saturday. Emergency service is available 24/7.",
      },
      {
        question: "What areas do you serve?",
        answer:
          "We serve the greater San Antonio metro area including Boerne, New Braunfels, and surrounding communities.",
      },
      {
        question: "Are you licensed and insured?",
        answer:
          "Yes! We are fully licensed and insured for residential and commercial HVAC work.",
      },
    ],
    services: [
      "AC Repair",
      "Furnace Installation",
      "HVAC Maintenance",
      "Duct Cleaning",
      "Heat Pump Service",
      "Thermostat Installation",
      "Indoor Air Quality",
      "Emergency Service",
    ],
  },

  operations: {
    businessHours: "Monday–Saturday, service calls by appointment; 24/7 emergency",
    escalationContact: "Maria Santos (owner)",
    slaOverrides: {
      booking: 4,   // respond to service requests within 4 hours
      general: 24,  // general inquiries within 24 hours
    },
  },

  tasks: {
    recurring: [
      { label: "Send maintenance reminders", cron: "0 9 * * 1-6" },
      { label: "Weekly service summary", cron: "0 18 * * 6" },
    ],
    categories: ["service-call", "inquiry", "follow-up", "cancellation"],
  },
};

export default config;
