# Cost Calculation Bug Report

## Summary
The user correctly identified that the cost calculations were showing prices that were far too low. The bug was in the `MODEL_COSTS` constants where all pricing values were off by a factor of 1000.

## Issue Details

### Original Problem
- User reported 42 million tokens showing only $0.105 cost
- Even with 99% cache reads, this seemed impossibly low
- Current session showed 47.4M tokens for only $0.12

### Root Cause
The pricing constants in `/src/core/constants.ts` were using dollars per 1,000 tokens instead of dollars per 1 million tokens:

**Incorrect pricing (what was in the system):**
- Opus Input: $0.015 per million tokens
- Opus Output: $0.075 per million tokens  
- Opus Cache Write: $0.01875 per million tokens
- Opus Cache Read: $0.0015 per million tokens

**Correct pricing (Anthropic's actual rates):**
- Opus Input: $15 per million tokens
- Opus Output: $75 per million tokens
- Opus Cache Write: $18.75 per million tokens (25% more than input)
- Opus Cache Read: $1.50 per million tokens (10% of input)

### Impact Analysis

For the current session with 47.4M tokens:
- **Reported cost:** $0.12
- **Actual cost:** $120.36
- **Error factor:** 1,003x too low

Token breakdown showed:
- 94.33% cache reads (44.7M tokens)
- 5.55% cache writes (2.6M tokens)
- 0.11% output (53K tokens)
- 0.004% input (2K tokens)

### Fix Applied
Updated all model pricing in `MODEL_COSTS` by multiplying each value by 1000:
- Sonnet models: input $3, output $15, cache write $3.75, cache read $0.30
- Haiku models: input $0.80, output $4, cache write $1, cache read $0.08
- Opus models: input $15, output $75, cache write $18.75, cache read $1.50

## Verification

With corrected pricing:
- Current session (47.4M tokens) now correctly shows $120.36
- This represents $590 in savings from caching (would be $710 if all were input tokens)
- Effective cost per million tokens: $2.54 (vs $15 for pure input)
- Cache efficiency: 94.4% of tokens were cache reads

The fix has been applied and the system now correctly calculates costs according to Anthropic's official pricing.