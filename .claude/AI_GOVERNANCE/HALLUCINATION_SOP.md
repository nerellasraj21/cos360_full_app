# AI Hallucination Prevention – Standard Operating Procedure (SOP)

## 1. Purpose

This SOP defines mandatory rules to prevent hallucination (fabricated, incorrect, or unverifiable outputs) in all AI-assisted work within the COS360 project.

---

## 2. Scope

This SOP applies to **all AI-assisted activities**, including but not limited to:

- Requirements analysis
- Architecture and design
- New feature development
- Bug fixing
- Security and performance analysis
- Documentation and reporting

No exceptions are permitted.

---

## 3. Core Enforcement Rules

1. **No Silent Assumptions**  
   Any assumption made by AI must be explicitly declared.

2. **Evidence-Based Outputs Only**  
   All claims must be supported by one or more of the following:

   - Code references (file + function)
   - Logs or stack traces
   - Configuration files
   - Schemas or migrations
   - Provided documents or inputs

3. **Unknowns Are Valid Outcomes**  
   If sufficient information is not available, AI must explicitly state this.

4. **One Responsibility per Agent**  
   Analysis, planning, implementation, and validation must not be combined.

---

## 4. Mandatory Output Labels

All AI-generated outputs must label content using one or more of the following tags:

- `[EVIDENCE-BASED]`
- `[ASSUMPTION-BASED]`
- `[INFERENCE]`
- `[UNCERTAIN]`

Any output without these labels is considered invalid.

---

## 5. Forbidden Behaviors

AI must NOT:

- Invent APIs, files, configurations, or features
- Assume infrastructure, environment, or data
- Use vague language without evidence (e.g., “usually”, “best practice”)
- Mix analysis with implementation
- Skip validation or handover steps

---

## 6. Validation Authority

Any AI output that:

- Lacks evidence
- Contains hidden assumptions
- Violates role boundaries
- Skips required steps

is **automatically rejected**.

---

## 7. Final Enforcement Rule

> **If an AI output cannot clearly explain why it is correct, it is treated as incorrect.**
