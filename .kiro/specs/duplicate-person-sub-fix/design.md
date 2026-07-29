# Duplicate Person Sub Fix - Bugfix Design

## Overview

The application crashes with `IncorrectResultSizeDataAccessException` when `PersonRepository.findBySub()` returns multiple `Person` documents for the same `sub` value. Duplicate documents exist because of a race condition in `TokenFilter.doFilterInternal()`: two concurrent requests for an unknown user both find `null` from `findBySub()`, then both insert a new document. Although `Person.sub` is annotated `@Indexed(unique = true, sparse = true)`, pre-existing duplicates may prevent the index from being enforced, or the index may have been created as non-unique before the annotation was added.

The fix is four-pronged:
1. Deduplicate existing data at startup
2. Ensure the unique index is actually enforced in MongoDB
3. Handle `DuplicateKeyException` in `TokenFilter` with a retry-lookup pattern
4. Change `findBySub` to `findFirstBySub` so the query never throws even if duplicates somehow survive

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug – `PersonRepository.findBySub(sub)` returns more than one document (i.e., duplicate `Person` documents with the same `sub` exist)
- **Property (P)**: The desired behavior – at most one `Person` document per `sub` value, and concurrent inserts resolve to a single document without crashing
- **Preservation**: Existing single-user lookup behavior, new-user creation, legacy migration, and unauthenticated pass-through must remain unchanged
- **TokenFilter**: The Spring `OncePerRequestFilter` in `TokenFilter.java` that resolves or creates `Person` documents per authenticated request
- **PersonRepository**: Spring Data MongoDB repository interface for `Person` documents
- **sub**: The OIDC subject claim used as the unique user identifier

## Bug Details

### Bug Condition

The bug manifests when `PersonRepository.findBySub(sub)` is invoked for a `sub` that maps to more than one `Person` document in MongoDB. Spring Data's derived query method expects a single result and throws `IncorrectResultSizeDataAccessException` when multiple are returned.

The duplicates are created because `TokenFilter.doFilterInternal()` performs a check-then-act sequence (`findBySub` → null check → `save`) without any concurrency control. Two threads can interleave between the null check and the save.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { sub: String, personCollection: List<Person> }
  OUTPUT: boolean
  
  duplicates := personCollection.filter(p -> p.sub == input.sub)
  RETURN duplicates.size() > 1
         OR (concurrentRequestsForSameSub(input.sub) AND noAtomicGuard())
END FUNCTION
```

### Examples

- User "alice" (sub=`abc-123`) authenticates simultaneously from two browser tabs → two `Person` documents with `sub=abc-123` are created → next request throws `IncorrectResultSizeDataAccessException`
- Legacy user "bob" is found by `findByName("bob")` and has `sub` set to `xyz-456`, but another document already has `sub=xyz-456` from a previous concurrent insert → duplicate exists, subsequent lookups crash
- User "carol" (sub=`def-789`) has a single document → `findBySub("def-789")` works correctly (not a bug condition)
- Unauthenticated request → no person lookup occurs, unaffected

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Single-user lookup: when exactly one `Person` document exists for a `sub`, `TokenFilter` resolves it and sets `userContext` without additional writes
- New-user creation: when no `Person` document exists and no concurrency conflict occurs, a new document is created with correct `name` and `sub`
- Legacy migration: when a user with `sub=null` is found by name, their `sub` is set and their display name is updated from userinfo
- Unauthenticated pass-through: requests without a JWT token pass through the filter chain untouched

**Scope:**
All inputs where exactly one (or zero) `Person` documents exist for a given `sub`, and no concurrent insert race occurs, should be completely unaffected by this fix. This includes:
- Normal authenticated requests for existing users
- Single new-user registrations (no concurrent duplicate)
- Legacy user migrations when no conflicting document exists
- All unauthenticated requests

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Race Condition in TokenFilter (Primary)**: `doFilterInternal()` performs a non-atomic check-then-act:
   - Thread A: `findBySub("abc")` → null
   - Thread B: `findBySub("abc")` → null
   - Thread A: `save(new Person(sub="abc"))` → success
   - Thread B: `save(new Person(sub="abc"))` → success (if unique index is not enforced) OR `DuplicateKeyException` (if index is enforced but unhandled)
   
2. **Unique Index Not Enforced**: The `@Indexed(unique = true, sparse = true)` annotation on `Person.sub` may not have resulted in an actual unique index in MongoDB if duplicates already existed when the index was first requested, or if the index was created before the `unique` flag was added.

3. **No DuplicateKeyException Handling**: Even if the unique index IS enforced, the `save()` call has no try-catch for `DuplicateKeyException`. On a race, one thread would crash instead of gracefully retrying.

4. **Query Method Returns Multiple**: `findBySub(String sub)` returns a single `Person` object. Spring Data throws `IncorrectResultSizeDataAccessException` when the query finds 2+ documents. Changing to `findFirstBySub` would return one result and avoid the exception as a defense-in-depth measure.

## Correctness Properties

Property 1: Bug Condition - Concurrent Insert Resolves to Single Document

_For any_ pair of concurrent authenticated requests with the same `sub` where no `Person` document yet exists, the fixed `TokenFilter` SHALL ensure that exactly one `Person` document is created and both requests successfully resolve the user without throwing `IncorrectResultSizeDataAccessException` or `DuplicateKeyException` to the caller.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Single-User Lookup Unchanged

_For any_ authenticated request where exactly one `Person` document already exists for the given `sub`, the fixed code SHALL produce the same result as the original code: resolve the existing user, set `userContext`, and perform no additional database writes, preserving existing single-user lookup behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `backend/src/main/java/eu/strietwald/social/backend/PersonRepository.java`

**Change 1: Use `findFirstBySub` instead of `findBySub`**
- Rename `findBySub` to `findFirstBySub` returning `Person` (or `Optional<Person>`)
- This prevents `IncorrectResultSizeDataAccessException` even if duplicates exist – Spring Data's `findFirst` prefix returns only the first match
- Update all callers to use the new method name

**File**: `backend/src/main/java/eu/strietwald/social/backend/TokenFilter.java`

**Change 2: Handle DuplicateKeyException on save**
- Wrap each `personRepository.save(user)` call in a try-catch for `org.springframework.dao.DuplicateKeyException`
- On catch: retry `findFirstBySub(sub)` to retrieve the document that won the race
- This makes the check-then-act pattern safe under concurrency

**Change 3: Use the new `findFirstBySub` method**
- Replace `personRepository.findBySub(sub)` with `personRepository.findFirstBySub(sub)`
- If the return type is `Optional<Person>`, adjust the null checks accordingly

**File**: New file – `backend/src/main/java/eu/strietwald/social/backend/PersonDeduplicationRunner.java`

**Change 4: Startup deduplication script**
- Create an `ApplicationRunner` or `CommandLineRunner` that runs on startup
- Query for duplicate `sub` values using MongoDB aggregation (`$group` by `sub`, `$match` count > 1)
- For each group of duplicates: keep the document with the most data (non-null fields), delete the rest
- Log each deduplication action

**File**: `backend/src/main/java/eu/strietwald/social/backend/MongoConfig.java` (or new config)

**Change 5: Ensure unique index is enforced**
- Add startup logic to drop and recreate the unique sparse index on `person.sub` if it exists but is not unique
- Alternatively, rely on the deduplication runner clearing duplicates so the `@Indexed` annotation can create the index successfully on next app start

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate concurrent inserts into `PersonRepository` and then call `findBySub`. Run these tests on the UNFIXED code to observe `IncorrectResultSizeDataAccessException` and understand the root cause.

**Test Cases**:
1. **Concurrent Insert Race Test**: Simulate two threads calling `doFilterInternal` for the same new `sub` simultaneously (will fail on unfixed code – either duplicate created or unhandled exception)
2. **Pre-existing Duplicates Test**: Manually insert two `Person` documents with the same `sub`, then call `findBySub` (will fail on unfixed code – `IncorrectResultSizeDataAccessException`)
3. **Legacy Migration Conflict Test**: Insert a document with `sub=X`, then trigger migration path for a legacy user that should receive `sub=X` (will fail on unfixed code – duplicate or exception)
4. **Single Document Query Test**: Insert one document with `sub=Y`, call `findBySub("Y")` (will pass – confirms non-buggy path works)

**Expected Counterexamples**:
- `findBySub("abc-123")` throws `IncorrectResultSizeDataAccessException` when 2+ documents exist with that sub
- Concurrent `save()` calls succeed without error when unique index is not enforced, creating duplicates silently
- Possible causes: missing/non-unique index, no DuplicateKeyException handling, non-atomic check-then-act

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := tokenFilter_fixed.doFilterInternal(input)
  ASSERT result.userContext.person != null
  ASSERT result.statusCode != 500
  ASSERT countDocuments(sub = input.sub) == 1
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT tokenFilter_original.doFilterInternal(input) == tokenFilter_fixed.doFilterInternal(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various sub values, display names, existing/missing documents)
- It catches edge cases that manual unit tests might miss (null subs, blank names, special characters)
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for single-document lookups and new-user creation, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Single-User Lookup Preservation**: Verify that for any sub with exactly one Person document, the filter resolves the user correctly – same behavior before and after fix
2. **New-User Creation Preservation**: Verify that for any sub with no Person document and no concurrent conflict, a new document is created correctly – same behavior before and after fix
3. **Legacy Migration Preservation**: Verify that for any legacy user with sub=null found by name, the migration sets sub correctly – same behavior before and after fix
4. **Unauthenticated Pass-Through Preservation**: Verify that requests without JWT tokens pass through unchanged

### Unit Tests

- Test `findFirstBySub` returns a single document when duplicates exist (defense-in-depth)
- Test `TokenFilter` handles `DuplicateKeyException` by retrying lookup
- Test `TokenFilter` normal flow for existing single-user
- Test `TokenFilter` creates new user when none exists
- Test deduplication runner correctly identifies and removes duplicates
- Test deduplication runner keeps the most-populated document

### Property-Based Tests

- Generate random `sub` values and concurrent request counts, verify at most one document exists after processing
- Generate random existing person states (0, 1, or 2+ documents per sub), verify `findFirstBySub` never throws
- Generate random sequences of authenticate/migrate operations, verify preservation of single-user behavior

### Integration Tests

- Full integration test with embedded MongoDB: simulate concurrent HTTP requests with same JWT sub
- Startup deduplication test: seed duplicates, start app, verify only one document remains per sub
- Index enforcement test: after deduplication, attempt to insert a duplicate and verify `DuplicateKeyException` is thrown by MongoDB
