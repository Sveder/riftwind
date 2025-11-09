# Rate Limiting - Current Implementation & How It Works

## Riot API Rate Limits

### Development Key Limits (What you're using)
- **20 requests per second**
- **100 requests per 2 minutes**

### Production Key Limits (If you get approved)
- **500+ requests per second** (varies by endpoint)
- Much higher burst capacity

## Current Rate Limiting Strategy

### Summary
**Reactive, not proactive** - We wait for 429 errors, then back off and retry.

### Where It Happens

#### 1. Match IDs Endpoint (app.py:261-270)

**Code:**
```python
if match_response.status_code == 429:
    print(f"[MATCH API] Rate limited (429), sleeping for 2 seconds...")
    time.sleep(2)
    # Retry once after rate limit
    match_response = requests.get(match_url, headers=headers, timeout=30)
    if match_response.status_code == 200:
        match_ids_batch = match_response.json()
    else:
        print(f"[MATCH API] Still failing after retry, using data collected so far")
        break
```

**Strategy:**
- Hit 429? Sleep 2 seconds
- Retry once
- Still 429? Give up and use partial data

**Problem:**
- Fixed 2-second delay might not be enough
- Only retries once
- Doesn't check Retry-After header

#### 2. Match Details Endpoint (app.py:305-315)

**Code:**
```python
elif detail_response.status_code == 429:
    print(f"[MATCH DETAILS] Rate limited (429) on match {match_id}, sleeping for 1 second...")
    time.sleep(1)
    # Retry once after rate limit
    detail_response = requests.get(match_detail_url, headers=headers, timeout=30)
    if detail_response.status_code == 200:
        match_data = detail_response.json()
        print(f"[MATCH DETAILS] Successfully fetched match {match_id} after retry")
    else:
        print(f"[MATCH DETAILS] Still rate limited, skipping match {match_id}")
        continue
```

**Strategy:**
- Hit 429? Sleep 1 second
- Retry once
- Still 429? Skip this match

**Problem:**
- Only 1-second delay (might not be enough)
- Only retries once
- Skips data on second failure
- Doesn't check Retry-After header

#### 3. Timelines Endpoint

**Not handled at all!** If timeline requests hit 429, they just fail silently.

## What's NOT Being Done

### 1. No Retry-After Header Checking

Riot API sends `Retry-After` header telling you EXACTLY how long to wait:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 5
X-Rate-Limit-Type: service
```

**We should be reading this header** instead of guessing sleep times!

### 2. No Rate Limit Headers Tracking

Riot sends helpful headers with EVERY response:

```http
X-App-Rate-Limit: 20:1,100:120
X-App-Rate-Limit-Count: 15:1,45:120
X-Method-Rate-Limit: 2000:60
X-Method-Rate-Limit-Count: 1500:60
```

**We could use these to avoid hitting limits in the first place!**

### 3. No Proactive Rate Limiting

We could track our own request counts and sleep BEFORE hitting limits:

```python
# Track requests
requests_last_second = []
requests_last_2_min = []

# Before making request
if len(requests_in_last_second) >= 19:
    sleep(0.1)  # Slow down, approaching limit
```

### 4. No Exponential Backoff

When we retry, we always wait the same amount. Should increase:

```
First retry: 1 second
Second retry: 2 seconds
Third retry: 4 seconds
Fourth retry: 8 seconds
...
```

### 5. No Request Queuing/Throttling

We make requests in a tight loop:

```python
for match_id in match_ids[:1000]:  # Bang bang bang!
    make_request()
```

Could add delays between requests:

```python
for match_id in match_ids[:1000]:
    make_request()
    time.sleep(0.05)  # 50ms between requests = max 20/sec
```

## Why Current Approach Works (Sometimes)

### 1. Caching Saves Us

With 1-year cache, most requests don't even hit the API:
- First search: 1000+ API calls
- Second search: 0 API calls

### 2. Low Traffic

You probably don't have many concurrent users hitting the API simultaneously.

### 3. Batch Size Limits

Only fetching 1000 matches max, not unlimited.

### 4. Simple Retry Logic

The simple "sleep and retry once" actually works for sporadic rate limits.

## What Happens During Rate Limiting

### Scenario: First-time Jankos search

```
Request 1-20:  ✅ Success (20/sec limit not hit yet)
Request 21:    ❌ 429 Rate Limited!
  → Sleep 1 second
  → Retry: ✅ Success
Request 22-40: ✅ Success
Request 41:    ❌ 429 Rate Limited!
  → Sleep 1 second
  → Retry: ❌ Still 429
  → Skip this match
Request 42-60: ✅ Success
...
```

**Result**: Some matches might be skipped, but most get through.

### Scenario: Searching 5 summoners quickly

```
User 1 search: 1000 requests → Hit 100/2min limit
User 2 search: All from cache → 0 requests ✅
User 3 search: All from cache → 0 requests ✅
User 4 search: All from cache → 0 requests ✅
User 5 search: All from cache → 0 requests ✅
```

**Caching prevents the issue!**

## Problems With Current Approach

### 1. Data Loss
If a match detail gets 429 twice, it's **skipped forever** for that session.

### 2. Inefficient
We hit rate limits, wait, retry - wastes time.

### 3. No Visibility
User doesn't know if data is incomplete due to rate limiting.

### 4. Fixed Sleep Times
1-2 seconds might not be enough during heavy load.

### 5. Single Retry
One retry is optimistic - might need 3-5 retries during peak times.

## Recommended Improvements

### Priority 1: Read Retry-After Header ⭐⭐⭐

```python
if response.status_code == 429:
    retry_after = int(response.headers.get('Retry-After', 2))
    print(f"Rate limited, waiting {retry_after} seconds...")
    time.sleep(retry_after)
    # Then retry
```

### Priority 2: Add Exponential Backoff ⭐⭐⭐

```python
def fetch_with_retry(url, headers, max_retries=5):
    for attempt in range(max_retries):
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 429:
            wait_time = min(2 ** attempt, 60)  # 1, 2, 4, 8, 16, 32, 60
            print(f"Rate limited, retry {attempt+1}/{max_retries} in {wait_time}s")
            time.sleep(wait_time)
        else:
            return None
    return None
```

### Priority 3: Add Request Throttling ⭐⭐

```python
# Add delay between batch requests
for i, match_id in enumerate(matches_to_fetch):
    if i > 0:
        time.sleep(0.05)  # 50ms = max 20 requests/sec
    make_request(match_id)
```

### Priority 4: Track Rate Limit Headers ⭐

```python
def check_rate_limits(response):
    app_limit = response.headers.get('X-App-Rate-Limit-Count')
    if app_limit:
        # Parse "15:1,45:120"
        # If approaching limits, slow down
        pass
```

### Priority 5: Add Retry Library ⭐

Use a library that handles this:

```python
from tenacity import retry, wait_exponential, stop_after_attempt

@retry(
    wait=wait_exponential(min=1, max=60),
    stop=stop_after_attempt(5)
)
def make_api_call(url, headers):
    response = requests.get(url, headers=headers)
    if response.status_code == 429:
        raise Exception("Rate limited")
    return response.json()
```

## Best Practice: Riot API Rate Limiting

### From Riot's Documentation

1. **Always check Retry-After header**
2. **Implement exponential backoff**
3. **Track your own request counts**
4. **Use application-wide rate limiting** (not per-request)
5. **Spread requests over time** (don't burst)

### Example from Riot Docs

```python
import time
from collections import deque

class RateLimiter:
    def __init__(self, max_per_second=20, max_per_2min=100):
        self.requests_per_sec = deque(maxlen=max_per_second)
        self.requests_per_2min = deque(maxlen=max_per_2min)

    def wait_if_needed(self):
        now = time.time()

        # Check per-second limit
        if len(self.requests_per_sec) >= 20:
            oldest = self.requests_per_sec[0]
            if now - oldest < 1:
                time.sleep(1 - (now - oldest))

        # Check 2-minute limit
        if len(self.requests_per_2min) >= 100:
            oldest = self.requests_per_2min[0]
            if now - oldest < 120:
                time.sleep(120 - (now - oldest))

        # Record this request
        self.requests_per_sec.append(now)
        self.requests_per_2min.append(now)

# Usage
limiter = RateLimiter()

for match_id in matches:
    limiter.wait_if_needed()
    make_request(match_id)
```

## Current Status Summary

**What Works:**
- ✅ Caching prevents 99% of rate limit issues
- ✅ Simple retry logic handles sporadic 429s
- ✅ Batch size limits prevent unlimited hammering

**What Doesn't:**
- ❌ No Retry-After header checking
- ❌ No exponential backoff
- ❌ No proactive rate limiting
- ❌ Fixed sleep times (might not be enough)
- ❌ Data loss on second 429

**Risk Level:** 🟡 Medium
- Low traffic + good caching = usually fine
- Could fail under load or with multiple concurrent users
- Some data might be skipped silently

## Recommendation

**For now:** Current approach is acceptable given:
1. Good caching (1-year duration)
2. Low traffic volume
3. Batch size limits

**For production:** Implement at least:
1. Retry-After header checking (5 minutes to implement)
2. Exponential backoff (10 minutes to implement)
3. Better retry limits (increase from 1 to 5 retries)

**For scale:** Consider:
1. Redis-based distributed rate limiter
2. Request queue with throttling
3. Background job processing
4. Apply for Production API key
