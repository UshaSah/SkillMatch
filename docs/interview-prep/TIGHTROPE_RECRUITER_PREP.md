# Tightrope Recruiter Call Prep

## 1. Your Intro (30–45 seconds)

**Script:**

> I'm a software engineer with a mix of backend, distributed systems, and AI experience, and I really like building 0→1 products. Most recently I built a full-stack skill‑exchange platform as a freelance project, where I owned everything from the Next.js + TypeScript frontend to a production Node/Mongo backend on AWS. I spent a lot of time on reliability problems—things like getting notification delivery from ~85% to 99% by adding retries, outbox patterns, and monitoring. Before that I worked in Java/Spring Boot and C++ on distributed systems and a custom congestion control protocol, so I'm very comfortable thinking about correctness, concurrency, and failure modes. I'm now looking for a founding‑engineer type role where I can own hard infrastructure problems end‑to‑end—things like Tightrope's browser agents that have to be deterministic and safe in production.

---

## 2. Why Tightrope / Why This Space

**Question:** “Why Tightrope?”

**Answer:**

> I really like that Tightrope is going after a very real integration pain: so many critical systems—government portals, EHRs, logistics dashboards—are still web UIs with no APIs. I’ve already run into the pain of treating the browser as the “API” surface, and I like the idea of turning that into a first‑class, reliable abstraction instead of a pile of brittle scripts.
> 
> What excites me about Tightrope specifically is the combination of browser automation, safety, and AI. It’s not just scraping – you’re trying to make agents that can operate deterministically in production, authenticate real end users, survive DOM changes, and still be observable and debuggable. That sits right at the intersection of my interests: systems reliability, reasoning about failure, and using AI as a tool rather than a toy. Working directly with founders who’ve done this before at Merge and Stytch is also a big draw for me—I want to learn from people who’ve already built serious integration platforms.

---

## 3. Why Founding Role vs Big Tech (Stripe, etc.)

**Question:** “Why a founding role at a tiny startup instead of a stable job at a big tech company like Stripe?”

**Answer:**

> For me, it comes down to impact, learning, and ownership. I like building the plane while we're flying it. I built SkillMatch completely on my own—when production notification delivery dropped to ~85%, there was no one to escalate to, no team to lean on. I had to figure it out myself. That meant digging into provider rate limits, redesigning the pipeline with an outbox table, adding retries with backoff, and wiring up logs and metrics. Within about a week I'd taken it from 85% to 99% delivery. That experience of both breaking and fixing the plane mid‑air, completely solo, is exactly the kind of ownership I enjoy.
When I deployed the notification system, I noticed that only about 85% of notifications were successfully being sent and confirmed delivered—the rest were either failing silently or getting rate-limited by SES. I tracked this through SES delivery events and my outbox table, where I could see notifications stuck in 'pending' or 'failed' states.
> 
> At an early‑stage startup like Tightrope, that's the day‑to‑day: you're given fuzzy problems—“make this browser agent deterministic and safe”—and you design, build, and iterate until it works in a real customer environment. I know that's less stable and more demanding than a traditional big‑tech role, but I'm at a point in my career where I can take that risk, and I'd rather have outsized impact and steep learning than optimize a small piece of a huge system.

---

## 4. Behavioral Questions & Answers

### 4.1 “Tell me about a project that best represents your skills.”

> The best example is a full‑stack skill‑exchange platform I built as a freelance project. I owned the Node/Express API, MongoDB models, Next.js + TypeScript frontend, and AWS deployment. The hardest part was building a reliable notification pipeline—initially, emails would silently fail or get rate‑limited, during testing. So, I added an outbox collection, idempotency keys, retry with exponential backoff, and CloudWatch‑style metrics. That took delivery from ~85% to 99% and made failures observable instead of mysterious. It's a good example of me taking something from idea → production → fixing it when it behaves badly rather than just building a happy‑path prototype.

### 4.2 “Tell me about a time you had to figure something out on your own.”

> On the same project, I started getting intermittent MongoDB connection errors in production under load. There was no one to ask—it was just me. I dug through driver docs and logs, discovered that my connection pooling and timeouts were misconfigured, and that I was leaking connections in one error path. I reproduced it in a smaller test harness, fixed the leak, tuned pool sizes and timeouts, and added a simple connection‑health endpoint plus alerts. That kind of unfamiliar, end‑to‑end debugging is something I enjoy rather than avoid.

### 4.3 “Tell me about a time you worked in ambiguity.”

> When I started SkillMatch, the only “requirements” were basically: make it possible for people to exchange skills locally. I had to define the data model, the matching logic, what “messaging” meant, and what success even looked like. I started with a thin slice—basic listing + messaging—shipped it, then iterated based on user feedback. Over time that led to things like geospatial search and notifications, but the core skill was being comfortable making decisions with incomplete information and refining them as I learned more.

### 4.4 “How do you like to work with founders?”

> I like tight feedback loops and a lot of context. My favorite way to work is: agree on the problem and constraints, sketch a simple design in a doc or quick diagram, then iterate in small, testable chunks. I’ll over‑communicate early—“here’s what I’m building this week, here’s how we’ll know it works”—and I appreciate direct feedback. If something’s not working, I’d rather hear it bluntly and fix it than discover it months later.

---

## 5. Technical Questions & Answers (Recruiter Level)

### 5.1 “How would you build an API on top of a website that’s constantly changing without it breaking every day?”

> I’d treat the website as an unstable dependency and put a stable abstraction layer in front of it. Externally, you expose a clean API like `getInvoice(id)`; internally, that calls a site‑specific adapter that knows how to drive the browser and extract data.
> 
> To avoid breaking on every DOM change, I’d:
> - Use resilient selectors and heuristics instead of brittle absolute XPaths—anchor on labels, text, and stable attributes, with multiple fallback strategies per field.
> - Keep parsing logic in configuration so small DOM tweaks are a config change, not a redeploy.
> - Add monitoring and canary runs for each portal so we detect when extraction success drops and can react quickly.
> 
> In other words: stable public contract, pluggable adapters, and good observability so you can fix breakages in hours, not weeks.

### 5.2 “What does ‘deterministic and safe browser automation’ mean to you?”

> Deterministic means: given the same input (user, portal state, operation), the agent takes the same sequence of steps and either succeeds or fails in a well‑understood way. Safe means: it doesn’t click random things, it doesn’t leak credentials, and failures are contained and observable.
> 
> Practically, that looks like:
> - Explicit state machines instead of ad‑hoc “if this element exists, click it” logic.
> - Idempotent operations and clear rollback/timeout behavior.
> - Strong sandboxing of the browser environment, careful handling of auth/session, and strict logging so every action is auditable.
> - Clear guardrails for any AI component so it can’t arbitrarily execute actions outside its allowed plan.

### 5.3 “How would you think about navigating anti‑bot detection without being sketchy?”

> I’d start from respecting the site’s terms of service and legal constraints—if a customer isn’t allowed to automate a portal, we shouldn’t be enabling that. Assuming we’re acting on behalf of an end user with their consent, the focus is on:
> - Making our automation behave like a real user: reasonable pacing, not hammering endpoints, obeying rate limits, avoiding obviously synthetic patterns.
> - Handling CSRF tokens, dynamic content, and occasional CAPTCHAs in a way that’s robust but still transparent to customers.
> - Having clear fallback paths—if a portal tightens bot defenses, we fail gracefully, alert, and either update the adapter or work with the customer on alternatives.

### 5.4 “How would you design ‘self‑healing’ agents that adapt when the DOM changes?”

> I’d combine defensive engineering with some learning. On the defensive side: use multiple selectors and semantic cues for each element, log when primary selectors start failing, and have a way to quickly push updated adapter configs. On the learning side, you can have an “inspector” component that, when it detects a change, uses heuristics or an LLM to propose new selectors given a description of the target element, then validates those against a test suite of known pages before promoting them. The key is: don’t let agents silently drift; detect breakage, propose a fix, and validate it before rollout.

---

## 6. Questions to Ask the Recruiter

- **Role & expectations**
  - What does success look like for this founding engineer in the first 3–6 months?
  - What are the gnarliest browser/portal integrations you’re working on today?

- **Tech & product**
  - How much of your current system is rule‑based scripts vs. agentic/LLM‑driven?
  - How do you think about the line between “scraping” and being a trusted infrastructure layer for your customers?

- **Team & culture**
  - How do you and Alex like to work with early engineers? What does a typical week look like?
  - What have been the biggest surprises or pivots since you started Tightrope?

---

## 7. Quick Practice Checklist

- [ ] Practice your 30–45s intro
- [ ] Practice the “Why Tightrope?” answer
- [ ] Practice the “Why founding role vs big tech?” answer
- [ ] Choose 1–2 technical answers to go slightly deeper on
- [ ] Pick 3 questions to ask the recruiter
- [ ] Do one full mock run aloud (5–10 minutes)

