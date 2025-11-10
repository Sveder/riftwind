# Rate Limit Issue Analysis - Why Jankos Still Hits Rate Limits

## Problem

Searching for "Jankos" (or any summoner) multiple times still causes rate limits, even though the data should be cached.

## Root Cause

**Only 3 out of 6 API endpoints are cached.** The first 3 endpoints make fresh API calls EVERY time.

## What's NOT Cached (The Problem)

### 1. Account Lookup (app.py:191)
```python
account_response = requests.get(account_url, headers=headers, timeout=30)
```
- **Endpoint**: `/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}`
- **When**: EVERY search
- **Impact**: 1 API call per search
- **Should be cached?**: YES - account PUUIDs rarely change

### 2. Summoner Info (app.py:206)
```python
summoner_response = requests.get(summoner_url, headers=headers, timeout=30)
```
- **Endpoint**: `/lol/summoner/v4/summoners/by-puuid/{puuid}`
- **When**: EVERY search
- **Impact**: 1 API call per search
- **Should be cached?**: MAYBE - level/icon can change, but not critical

### 3. Champion Mastery (app.py:219)
```python
mastery_response = requests.get(mastery_url, headers=headers, timeout=30)
```
- **Endpoint**: `/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}`
- **When**: EVERY search
- **Impact**: 1 API call per search
- **Should be cached?**: MAYBE - changes as they play, but slowly

## What IS Cached (Working Fine)

### 4. Match ID Lists (app.py:244) ✅
```python
match_ids_batch = cached_request(match_url, headers)
```
- **Endpoint**: `/lol/match/v5/matches/by-puuid/{puuid}/ids`
- **Cached**: YES (1 hour)
- **Impact**: Saves ~10 API calls per search

### 5. Match Details (app.py:289) ✅
```python
match_data = cached_request(match_detail_url, headers)
```
- **Endpoint**: `/lol/match/v5/matches/{matchId}`
- **Cached**: YES (1 hour)
- **Impact**: Saves ~1000 API calls per search (HUGE!)

### 6. Match Timelines (app.py:324) ✅
```python
timeline_data = cached_request(timeline_url, headers)
```
- **Endpoint**: `/lol/match/v5/matches/{matchId}/timeline`
- **Cached**: YES (1 hour)
- **Impact**: Saves ~15 API calls per search

## The Math

### First Search for Jankos
```
1. Account lookup:        1 call  (NOT cached)
2. Summoner info:         1 call  (NOT cached)
3. Champion mastery:      1 call  (NOT cached)
4. Match ID lists:       10 calls (cached after first)
5. Match details:      1000 calls (cached after first)
6. Timelines:            15 calls (cached after first)
-------------------------------------------
TOTAL:                 1028 calls
```

### Second Search for Jankos (Within 1 Hour)
```
1. Account lookup:        1 call  (NOT cached) ❌
2. Summoner info:         1 call  (NOT cached) ❌
3. Champion mastery:      1 call  (NOT cached) ❌
4. Match ID lists:        0 calls (FROM CACHE) ✅
5. Match details:         0 calls (FROM CACHE) ✅
6. Timelines:             0 calls (FROM CACHE) ✅
-------------------------------------------
TOTAL:                    3 calls

Savings: 1025 calls (99.7% reduction)
BUT still 3 calls that hit rate limit!
```

## Why Rate Limits Still Happen

Riot API rate limits (Development Key):
- **20 requests per second**
- **100 requests per 2 minutes**

If you search for Jankos 35 times quickly:
```
35 searches × 3 calls = 105 calls
```

This exceeds the **100 requests per 2 minutes** limit, causing:
```
Error 429: Rate limit exceeded
```

## The Fix

We need to cache the first 3 endpoints too!

### Option 1: Cache Account Lookup (Recommended)

**Why**: PUUIDs almost never change
**Duration**: 24 hours (very safe)

```python
# BEFORE (app.py:191)
account_response = requests.get(account_url, headers=headers, timeout=30)

# AFTER
account_data = cached_request(account_url, headers)
if not account_data:
    return jsonify({'error': 'Failed to find summoner'}), 400
```

### Option 2: Cache Summoner Info

**Why**: Level/icon changes are not critical
**Duration**: 1 hour

```python
# BEFORE (app.py:206)
summoner_response = requests.get(summoner_url, headers=headers, timeout=30)

# AFTER
summoner_data = cached_request(summoner_url, headers)
if not summoner_data:
    return jsonify({'error': 'Failed to get summoner info'}), 400
```

### Option 3: Cache Champion Mastery

**Why**: Mastery changes slowly
**Duration**: 1 hour

```python
# BEFORE (app.py:219)
mastery_response = requests.get(mastery_url, headers=headers, timeout=30)

# AFTER
mastery_data_response = cached_request(mastery_url, headers)
mastery_data = mastery_data_response if mastery_data_response else []
```

## Expected Results After Fix

### With All 6 Endpoints Cached

**First Search**: 1028 calls
**Second Search**: 0 calls (100% cache hit!)

**Rate Limit Impact**:
- Can search same summoner unlimited times within cache window
- No more 429 errors on repeat searches

## Verification

After implementing the fix, check logs:

```
[CACHE] Cache HIT for <account_url_hash>
[CACHE] Cache HIT for <summoner_url_hash>
[CACHE] Cache HIT for <mastery_url_hash>
[CACHE] Cache HIT for <match_ids_hash>
[CACHE] Cache HIT for <match_details_hash>
[CACHE] Cache HIT for <timeline_hash>
```

All should show "Cache HIT" on second search!

## Why This Wasn't Obvious

The code at app.py:142 has Flask cache decorator:
```python
@cache.cached(timeout=300, key_prefix=lambda: f"summoner_...")
```

This caches the **entire endpoint response** for 5 minutes, BUT:
- Only works if you reach the end of the function
- If rate limited early, cache never gets populated
- The 3 uncached API calls can still cause 429 before reaching cache save

## Recommendation

**Cache all 6 endpoints** to eliminate rate limit issues on repeat searches:

Priority:
1. **Account Lookup** (CRITICAL) - 24 hour cache
2. **Match IDs** (already cached) ✅
3. **Match Details** (already cached) ✅
4. **Timelines** (already cached) ✅
5. **Summoner Info** (NICE TO HAVE) - 1 hour cache
6. **Champion Mastery** (NICE TO HAVE) - 1 hour cache

This will reduce API calls from 3 per search to 0 per search (after first).
