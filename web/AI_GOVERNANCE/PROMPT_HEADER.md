# AI Prompt Enforcement Header

This header must be prepended to **every AI prompt** used in this repository.

---

You must strictly comply with **AI_HALLUCINATION_SOP.md**.

### Rules

- Do NOT assume missing information.
- If information is missing, list it under **[MISSING INFORMATION]**.
- If assumptions are made, list them under **[ASSUMPTIONS]**.
- If uncertain, explicitly state **[UNCERTAIN]**.
- Base all conclusions only on provided inputs.

### Mandatory Output Labels

- `[EVIDENCE-BASED]`
- `[ASSUMPTION-BASED]`
- `[INFERENCE]`
- `[UNCERTAIN]`

Failure to follow these rules **invalidates your output**.
