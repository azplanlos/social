# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Duplicate Sub Causes IncorrectResultSizeDataAccessException
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case: when 2+ Person documents exist with the same `sub` value and `findBySub(sub)` is called
  - Test setup: Use `@DataMongoTest` with embedded MongoDB. Manually insert two `Person` documents with identical `sub` values (e.g., `sub="test-sub-123"`) directly via `MongoTemplate`
  - Test assertion: Calling `personRepository.findBySub("test-sub-123")` should return exactly one `Person` without throwing `IncorrectResultSizeDataAccessException` (Expected Behavior from design: requirement 2.2)
  - Additionally test the `TokenFilter` race condition: simulate two concurrent calls to `doFilterInternal` for the same unknown `sub` using `CountDownLatch` to synchronize threads. Assert that exactly one `Person` document is created (Expected Behavior from design: requirement 2.1)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (`IncorrectResultSizeDataAccessException` is thrown by `findBySub` when duplicates exist, confirming the bug)
  - Document counterexamples found (e.g., "findBySub('test-sub-123') throws IncorrectResultSizeDataAccessException when 2 documents exist with that sub")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Single-User Lookup and New-User Creation Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code: `personRepository.findBySub("unique-sub")` returns the single matching `Person` document when exactly one exists
  - Observe on UNFIXED code: `TokenFilter.doFilterInternal()` creates a new `Person` with correct `name` and `sub` when no document exists for that sub (and no concurrency conflict)
  - Observe on UNFIXED code: Unauthenticated requests (no JWT) pass through the filter chain without any person lookup
  - Observe on UNFIXED code: Legacy user with `sub=null` found by name gets `sub` set correctly during migration
  - Write property-based tests using `@DataMongoTest` and Mockito for `TokenFilter` dependencies:
    - For all `sub` values where exactly one `Person` exists: `findBySub(sub)` returns that document correctly
    - For all new `sub` values where no `Person` exists (single-threaded): a new `Person` is created with the correct `name` and `sub`
    - For unauthenticated requests: filter chain continues without person repository interaction
    - For legacy users: migration sets `sub` correctly when no conflict exists
  - Verify tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3. Fix for duplicate Person sub causing IncorrectResultSizeDataAccessException

  - [ ] 3.1 Change `PersonRepository.findBySub` to `findFirstBySub`
    - In `PersonRepository.java`: rename method `findBySub(String sub)` to `findFirstBySub(String sub)`
    - This prevents `IncorrectResultSizeDataAccessException` — Spring Data's `findFirst` prefix returns only the first match even if multiple documents exist
    - Update all callers of `findBySub` to use `findFirstBySub` (primarily `TokenFilter.java`)
    - _Bug_Condition: isBugCondition(input) where personCollection.filter(p -> p.sub == input.sub).size() > 1_
    - _Expected_Behavior: findFirstBySub always returns at most one Person, never throws IncorrectResultSizeDataAccessException_
    - _Preservation: Single-user lookup behavior unchanged — when one document exists, findFirstBySub returns it identically to findBySub_
    - _Requirements: 2.2, 3.1_

  - [ ] 3.2 Wrap `save()` calls in `TokenFilter` with DuplicateKeyException handling
    - In `TokenFilter.doFilterInternal()`: wrap each `personRepository.save(user)` call in a try-catch for `org.springframework.dao.DuplicateKeyException`
    - On catch: retry `personRepository.findFirstBySub(sub)` to retrieve the document that won the race
    - This makes the check-then-act pattern safe under concurrency — the loser of the race gracefully falls back to the winner's document
    - Handle both save locations: the migration save and the new-user save
    - _Bug_Condition: concurrentRequestsForSameSub AND noAtomicGuard causes duplicate insert_
    - _Expected_Behavior: DuplicateKeyException is caught, retry lookup succeeds, no exception propagates to caller_
    - _Preservation: When no concurrent conflict exists, save() succeeds as before — try-catch adds no overhead to the happy path_
    - _Requirements: 2.1, 2.3, 2.4, 3.2, 3.3_

  - [ ] 3.3 Create `PersonDeduplicationRunner` to clean up existing duplicates at startup
    - Create new file `backend/src/main/java/eu/strietwald/social/backend/PersonDeduplicationRunner.java`
    - Implement as `ApplicationRunner` (Spring Boot)
    - Use `MongoTemplate` aggregation to find duplicate `sub` values: `$group` by `sub` (excluding null), `$match` count > 1
    - For each group of duplicates: keep the document with the most non-null fields (most complete data), delete the rest
    - Log each deduplication action with the kept document ID and deleted document IDs
    - After deduplication, ensure the unique sparse index on `sub` can be enforced
    - _Bug_Condition: pre-existing duplicates in person collection prevent unique index enforcement_
    - _Expected_Behavior: after runner completes, at most one Person document exists per sub value_
    - _Preservation: Documents with unique sub values or sub=null are not touched_
    - _Requirements: 2.1, 2.2_

  - [ ] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Duplicate Sub Resolves Without Exception
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (findFirstBySub returns one result, concurrent inserts resolve to single document)
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — findFirstBySub handles duplicates gracefully, DuplicateKeyException is caught on concurrent inserts)
    - _Requirements: 2.1, 2.2_

  - [ ] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Single-User Lookup and New-User Creation Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — single-user lookup, new-user creation, legacy migration, and unauthenticated pass-through all behave identically)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run full test suite: `./mvnw test` from the `backend/` directory
  - Verify all exploration tests pass (bug is fixed)
  - Verify all preservation tests pass (no regressions)
  - Verify existing `BackendApplicationTests.contextLoads()` still passes
  - Ensure all tests pass, ask the user if questions arise.
