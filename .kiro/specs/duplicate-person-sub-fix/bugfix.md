# Bugfix Requirements Document

## Introduction

The application throws `IncorrectResultSizeDataAccessException` when `PersonRepository.findBySub()` is called from `TokenFilter.doFilterInternal()`. This occurs because multiple `Person` documents exist in MongoDB with the same `sub` value. The root cause is a race condition in `TokenFilter` that allows concurrent requests to insert duplicate documents, combined with the fact that pre-existing duplicates are not cleaned up even though a unique index annotation exists on the `sub` field. This bug blocks all authenticated requests for affected users.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN two concurrent authenticated requests arrive for the same user whose `sub` is not yet in the `person` collection THEN the system creates two `Person` documents with the same `sub` value due to a race condition between `findBySub()` returning null and `personRepository.save()`

1.2 WHEN a user whose `sub` already has duplicate `Person` documents makes any authenticated request THEN the system throws `IncorrectResultSizeDataAccessException` because `findBySub()` returns more than one result

1.3 WHEN the migration logic sets `sub` on a legacy user document THEN the system does not verify whether another document with that `sub` already exists, potentially creating a duplicate

1.4 WHEN the legacy lookup by `findByName(displayName)` finds an existing user and sets their `sub` THEN the system does not verify whether another document with that `sub` already exists, potentially creating a duplicate

### Expected Behavior (Correct)

2.1 WHEN two concurrent authenticated requests arrive for the same user whose `sub` is not yet in the `person` collection THEN the system SHALL create exactly one `Person` document for that `sub` value by using an atomic upsert or handling `DuplicateKeyException` with a retry lookup

2.2 WHEN `findBySub()` is called for any `sub` value THEN the system SHALL always return at most one `Person` document, never throwing `IncorrectResultSizeDataAccessException`

2.3 WHEN the migration logic sets `sub` on a legacy user document THEN the system SHALL atomically ensure no other document with that `sub` exists, or handle the conflict gracefully (e.g., merge duplicates or catch duplicate key error and re-query)

2.4 WHEN the legacy lookup sets `sub` on a found user THEN the system SHALL atomically ensure no other document with that `sub` exists, or handle the conflict gracefully

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an authenticated request arrives for a user whose `sub` already maps to exactly one `Person` document THEN the system SHALL CONTINUE TO resolve the user and set `userContext` correctly without any additional database writes

3.2 WHEN a brand-new user authenticates for the first time with no prior `Person` document THEN the system SHALL CONTINUE TO create a new `Person` document with the correct `name` and `sub` fields

3.3 WHEN a legacy user (with `sub` = null) authenticates and no duplicate exists THEN the system SHALL CONTINUE TO migrate their document by setting the `sub` field and optionally updating their display name

3.4 WHEN an unauthenticated request arrives (no JWT token) THEN the system SHALL CONTINUE TO pass the request through the filter chain without any person lookup or modification
