# AI Voice Agent Proposal for HealthTexas Medical Group
## Prepared by Alamo Crafting Forge | March 2026

---

## Executive Summary

HealthTexas Medical Group operates 18 clinics across San Antonio, New Braunfels, Schertz, and Boerne with 40+ primary care physicians. Every one of those clinics fields a constant stream of inbound calls — appointment scheduling, prescription refill requests, insurance verification questions, clinic hours, and post-visit follow-ups — all hitting front-desk staff who are simultaneously checking patients in, managing walk-ins, and coordinating with providers.

We propose deploying a **Retell AI-powered voice agent** that handles the majority of HealthTexas's inbound call volume 24/7 and automates targeted outbound call workflows — reducing hold times, eliminating missed calls after hours, and freeing clinical staff to focus on in-person patient care.

**Projected impact:**
- Handle up to **70% of inbound call volume** without human intervention
- Extend service availability to **24/7/365** (currently limited to M-F 8-5, Wed 10-5)
- Estimated **$150K-$250K annual savings** in front-desk labor reallocation
- Patient satisfaction scores above **89%** based on comparable deployments

---

## The Problem

### What HealthTexas Deals With Today

| Pain Point | Impact |
|-|-|
| Hold times during peak hours (Mon AM, post-lunch) | Patients abandon calls, book elsewhere or show up as walk-ins |
| Zero after-hours call handling | Missed appointment requests evenings, weekends, holidays |
| Staff splitting attention between phone and lobby | Degraded in-person experience, slower check-in |
| Manual appointment reminder calls | Staff hours burned on outbound calls that could be automated |
| Prescription refill request bottleneck | Calls queue behind scheduling calls with no triage |
| No-show rates | Industry average 18-25% for primary care; every empty slot is lost revenue |

### The Math on Missed Calls

A conservative estimate for an 18-clinic network: each clinic receives ~80-120 inbound calls/day. At 15-20% abandonment (industry standard for healthcare), that's **215-360 lost patient interactions per day** across the network. Even if 30% of those are appointment requests, that's 65-108 potential bookings lost daily.

---

## The Solution: Retell AI Voice Agent

### What It Is

Retell AI is a production-grade conversational AI platform purpose-built for phone call automation. It creates voice agents that sound natural, respond in sub-second latency (~780ms), and integrate directly with scheduling systems, EHRs, and internal knowledge bases.

**Key compliance:** HIPAA compliant, SOC2 Type II certified, GDPR compliant.

### What We Build for HealthTexas

#### Phase 1: Inbound Call Automation (Weeks 1-6)

**Primary Agent — "HealthTexas Patient Line"**

The AI voice agent answers every inbound call and handles:

1. **Appointment Scheduling & Rescheduling**
   - Books, cancels, and reschedules appointments directly in your scheduling system
   - Knows provider availability, clinic hours, and location-specific schedules
   - Handles same-day appointment requests (a key HealthTexas differentiator)
   - Routes to the nearest clinic or patient's preferred provider

2. **Clinic Information & FAQs**
   - Hours of operation (including Saturday hours at San Pedro & Wurzbach)
   - Directions and parking for all 18 locations
   - Insurance acceptance (including the Medicare/Medicaid/Exchange nuances)
   - New patient registration guidance

3. **Prescription Refill Requests**
   - Collects patient info, medication details, and preferred pharmacy
   - Submits structured refill request to the appropriate provider
   - No more refill calls clogging the scheduling queue

4. **Intelligent Triage & Escalation**
   - Identifies urgent/emergent situations and routes to nurse triage or 911
   - Transfers to a live agent when the patient requests it or the issue requires clinical judgment
   - Target: **30% or lower transfer rate** to human staff (based on comparable healthcare deployments)

5. **Bilingual Support**
   - English and Spanish voice agents — critical for the San Antonio patient population

#### Phase 2: Outbound Call Automation (Weeks 6-10)

1. **Appointment Reminders & Confirmations**
   - Automated calls 48hr and 24hr before appointments
   - Patient confirms, reschedules, or cancels conversationally — no phone tree
   - Projected no-show reduction: **25-40%**

2. **Post-Visit Follow-Up**
   - Wellness check calls 48-72hr after visits
   - Collects patient satisfaction data conversationally
   - Flags concerns for nurse callback

3. **Recall & Preventive Care Outreach**
   - Annual wellness visit reminders
   - Chronic care management check-ins (diabetes, hypertension)
   - Overdue screening notifications

4. **Referral Follow-Through**
   - Confirms patients have scheduled referred specialist visits
   - Reduces referral leakage (a major revenue loss in primary care networks)

---

## Technical Architecture

```
Patient Call (Inbound/Outbound)
        |
   [Retell AI Voice Agent]
        |
   +-----------+-----------+-----------+
   |           |           |           |
[Scheduling  [EHR       [Knowledge  [Escalation
 System       Integration Base        Queue]
 via API]     HL7/FHIR]  (FAQs,      |
                          Policies)]  [Live Staff
                                       via Transfer]
```

### Integration Points

| System | Method | Purpose |
|-|-|-|
| Practice Management / Scheduling | REST API or HL7 | Real-time appointment CRUD |
| EHR (Epic, Athena, or current system) | FHIR / HL7 | Patient verification, refill routing |
| Phone System | SIP/Twilio/Vonage | Call routing, number porting or forwarding |
| CRM / Patient Outreach | REST API | Outbound campaign triggers |
| Internal Knowledge Base | Retell KB | Clinic info, policies, provider bios, insurance rules |

### Call Flow Example: Appointment Scheduling

```
Agent: "Thank you for calling HealthTexas Medical Group. How can I help you today?"
Patient: "I need to schedule an appointment with Dr. Martinez."
Agent: "I'd be happy to help. Can I get your date of birth to pull up your record?"
Patient: "March 15, 1982."
Agent: "Thank you, Sarah. I see you're established with Dr. Martinez at our
        Perrin Beitel clinic. She has availability this Thursday at 2:15 PM
        or Friday at 9:30 AM. Which works better for you?"
Patient: "Thursday works."
Agent: "Perfect. I've booked you with Dr. Martinez this Thursday, March 12th
        at 2:15 PM at the Perrin Beitel clinic. You'll receive a confirmation
        text shortly. Is there anything else I can help with?"
```

Sub-second response time. No hold music. No phone tree. Available at 10 PM on a Sunday.

---

## How Agencies Package This (Industry Context)

The Retell AI ecosystem has matured into three delivery models:

### 1. Managed Service (What We're Proposing)
- **Agency builds, deploys, and manages** the voice agent on behalf of the client
- Client pays a monthly retainer + per-minute usage
- Agency handles prompt engineering, knowledge base updates, integration maintenance, and optimization
- **Best for:** Organizations that want results without building internal AI capability

### 2. White-Label Platform
- Agency resells a branded version of the platform (via partners like Awaz AI or Call Supplai)
- Client gets a dashboard but limited customization
- **Best for:** High-volume call centers wanting self-service

### 3. Direct Build
- Client licenses Retell directly and builds internally
- Requires dedicated engineering resources
- **Best for:** Large health systems with in-house dev teams

**We recommend Model 1 (Managed Service)** for HealthTexas. You get a production-ready agent without hiring AI engineers, and we handle ongoing optimization as call patterns evolve.

---

## Pricing Model

### Our Fee Structure

| Component | Cost | Notes |
|-|-|-|
| **Setup & Build** | $15,000 - $25,000 | Agent design, prompt engineering, integration development, knowledge base creation, testing across all 18 clinics |
| **Monthly Management** | $3,500 - $5,000/mo | Ongoing optimization, knowledge base updates, performance monitoring, monthly reporting |
| **Per-Minute Usage** | ~$0.13 - $0.20/min | Pass-through Retell platform + LLM + telephony costs (volume discounts at scale) |

### Projected Monthly Usage Cost

| Metric | Conservative | Moderate | High |
|-|-|-|-|
| Inbound calls handled by AI/day | 500 | 900 | 1,400 |
| Avg call duration | 2.5 min | 2.5 min | 2.5 min |
| Monthly AI minutes | 37,500 | 67,500 | 105,000 |
| Monthly usage cost | $4,875 | $8,775 | $13,650 |
| **Total monthly (mgmt + usage)** | **$8,375** | **$13,275** | **$18,650** |

### ROI Comparison

| Item | Current Cost (Est.) | With AI Agent |
|-|-|-|
| Front-desk phone time (FTE equivalent) | 6-10 FTEs across 18 clinics dedicated to phones (~$240K-$400K/yr) | 2-4 FTEs handling escalations only (~$80K-$160K/yr) |
| After-hours answering service | $2,000-$5,000/mo | Eliminated — AI handles 24/7 |
| Missed appointment revenue (no-shows) | ~$500K-$1M/yr at 20% no-show rate | 25-40% reduction = $125K-$400K recovered |
| **Net annual savings** | | **$150K-$450K+** |

**Payback period: 2-4 months.**

---

## Implementation Timeline

| Week | Milestone |
|-|-|
| 1-2 | Discovery: map all call flows, gather FAQs, audit current phone system, identify integration endpoints |
| 2-3 | Agent design: prompt engineering, conversation flows, escalation rules, bilingual scripting |
| 3-4 | Integration development: connect scheduling system, configure telephony, build knowledge base |
| 4-5 | Testing: internal QA, staff testing, simulated call scenarios across all clinic contexts |
| 5-6 | Pilot launch: deploy to 2-3 clinics, monitor live performance, tune |
| 6-8 | Full rollout: expand to all 18 clinics with proven configuration |
| 8-10 | Phase 2: outbound automation (reminders, follow-ups, recall campaigns) |

---

## Risk Mitigation

| Concern | Our Approach |
|-|-|
| Patient trust / "I want a real person" | Instant live-agent transfer on request; agent identifies itself as AI assistant upfront |
| HIPAA compliance | Retell is HIPAA compliant + SOC2 Type II; BAA executed before deployment |
| Clinical safety | Agent never provides medical advice; urgent keywords trigger immediate escalation to clinical staff or 911 |
| Accuracy of scheduling | Real-time API integration with scheduling system — no batch sync, no stale data |
| Staff adoption | Training sessions for front-desk teams; agent reduces their burden, not their jobs — reallocation to higher-value patient interaction |
| Spanish language quality | Native bilingual prompt engineering; tested with native speakers before launch |

---

## Why Alamo Crafting Forge

- **Local to San Antonio** — we understand the market, the patient demographics, and the bilingual requirement
- **Healthcare integration experience** — our portfolio includes eClinicalWorks FHIR integration work (ECW Integrations project)
- **Full-stack technical capability** — we handle the agent build, API integrations, telephony configuration, and ongoing management
- **Retell AI platform expertise** — we build on a proven, HIPAA-compliant platform rather than rolling custom voice AI from scratch
- **Managed service model** — HealthTexas gets a turnkey solution; we own the complexity

---

## Next Steps

1. **Discovery Call** — Walk through current call flows, phone system, and scheduling platform with HealthTexas operations team
2. **Technical Assessment** — Evaluate EHR/scheduling API access and telephony infrastructure
3. **Pilot Proposal** — Scoped plan for 2-3 clinic pilot with defined success metrics
4. **BAA Execution** — HIPAA Business Associate Agreement with Retell AI and ACF
5. **Build & Launch** — 6-week timeline to first live calls

---

**Contact:**
Alamo Crafting Forge
San Antonio, TX
[Contact details]

---

*This proposal is confidential and intended solely for HealthTexas Medical Group leadership.*
