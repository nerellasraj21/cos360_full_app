# Fee Class Mapping Term Amounts - Findings and TODO

Findings
1. UUID(...) wrapping on already-UUID values causes 'UUID' object has no attribute 'replace' in create.
   File: app/service/fee/fee_class_map_term_amount_service.py
2. selectinload(FeeClassMappingTermAmountModel.class_mapping) references non-existent relationship; should be fee_class_mapping.
   File: app/service/fee/fee_class_map_term_amount_service.py
3. Data model mismatch: term_id points to fee_terms.id but multi-term logic needs per-term rows; current schema + uniqueness makes multi-term inserts impossible and UI likely sends fee_term_dates.id.
   Files: app/models/fee/fee_class_map_term_amount_model.py, app/models/fee/fee_term_dates_model.py

TODO
1. Fix UUID casting in create/update to accept Pydantic UUIDs without wrapping.
   Status: completed (2026-02-07)
2. Fix relationship name in all selectinload calls for term amount reads.
   Status: completed (2026-02-07)
3. Decide correct term reference (fee_terms.id vs fee_term_dates.id) and update model/schema/validators or UI payload accordingly.
   Status: completed (2026-02-07)
4. Re-test CRUD endpoints with Neon DB and active academic year data; record results.
   Status: completed (2026-02-07)

Update Log
- 2026-02-07: Initial findings and TODO created.
- 2026-02-07: Implemented fix for UUID wrapping in term amount create/update.
- 2026-02-07: Implemented fix for relationship name in term amount read/list queries.
- 2026-02-07: Enforced fee_terms.id usage for term_id and added guard for number_of_terms = 1.
- 2026-02-07: Removed remaining UUID wrapping in update/delete and fixed update lookup by id.
- 2026-02-07: CRUD re-test on Neon DB via localhost:8000 succeeded.
  Create: POST /api/v1/fee/class-mapping-term-amounts/ -> 201
  Read by id: GET /api/v1/fee/class-mapping-term-amounts/{id} -> 200
  Read by mapping: GET /api/v1/fee/class-mapping-term-amounts/by-mapping/{mapping_id} -> 200
  List: GET /api/v1/fee/class-mapping-term-amounts/?class_mapping_id=... -> 200
  Update: PUT /api/v1/fee/class-mapping-term-amounts/ -> 200
  Delete: DELETE /api/v1/fee/class-mapping-term-amounts/ -> 200
  Verify delete: GET /api/v1/fee/class-mapping-term-amounts/{id} -> 404
