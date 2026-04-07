# Remaining Tasks for Channel Settings Implementation

## Quick Update Guide

### Pattern Recognition
All translation message sending follows this pattern:

**OLD (Current):**
```javascript
chrome.storage.local.get(['provider', 'claudeKey', ...], (data) => {
  const provider = data.provider || 'claude';
  const apiKey = data[provider + 'Key'];
  // ... send message with provider, apiKey, model
});
```

**NEW (Should be):**
```javascript
const settings = await getEffectiveSettings();
// ... send message with settings.provider, settings.apiKey, settings.model
```

## Functions That Still Need Updates

### 1. Description Translation
- **Function**: (unnamed, around line 1300-1400)
- **Location**: Ticket description translate button handler
- **Status**: ⏳ Needs update
- **Platforms**: Backlog, Jira
- **Pattern**: chrome.storage.local.get → should call getEffectiveSettings()

### 2. Editor Translation
- **Function**: (unnamed, around line 1650-1750)
- **Location**: Comment editor translate button handler
- **Status**: ⏳ Needs update  
- **Platforms**: Backlog, GitHub, Jira
- **Pattern**: chrome.storage.local.get → should call getEffectiveSettings()

### 3. Review Thread Reply
- **Function**: `translateReviewThreadReplyContent()` (line 1999)
- **Location**: GitHub PR review reply translation
- **Status**: ⏳ Needs update
- **Platforms**: GitHub only
- **Pattern**: chrome.storage.local.get → should call getEffectiveSettings()

### 4. Generic Translate Helper
- **Function**: (unnamed, around line 2300-2400)
- **Status**: ⏳ Unknown, needs inspection
- **Pattern**: Likely follows same pattern

## How to Update (Step-by-Step)

### For Each Function:

1. **Make it async**:
   ```javascript
   // BEFORE
   function myTranslateFunction() {
     chrome.storage.local.get([...], (data) => {
   
   // AFTER
   async function myTranslateFunction() {
     const settings = await getEffectiveSettings();
   ```

2. **Replace settings collection**:
   ```javascript
   // REMOVE:
   chrome.storage.local.get(['provider', 'claudeKey', ...], (data) => {
     const provider = data.provider || 'claude';
     const apiKey = data[provider + 'Key'];
     // ... switch/case logic
   
   // ADD:
   const settings = await getEffectiveSettings();
   if (!settings.apiKey) {
     // Show error
     return;
   }
   ```

3. **Update message payload**:
   ```javascript
   // OLD:
   chrome.runtime.sendMessage({
     type: 'TRANSLATE_TEXT',
     text: text,
     provider: provider,
     apiKey: apiKey,
     model: model,
     customInstruction: customInstruction,
     context: context
   
   // NEW:
   chrome.runtime.sendMessage({
     type: 'TRANSLATE_TEXT',
     text: text,
     provider: settings.provider,
     apiKey: settings.apiKey,
     model: settings.model,
     customInstruction: settings.customInstruction || customInstruction,
     context: context
   ```

4. **Handle includeTicketContext**:
   ```javascript
   // includeTicketContext is NOT in effective settings
   // Still need to get it separately
   chrome.storage.local.get(['includeTicketContext'], (data) => {
     const includeContext = data.includeTicketContext !== false;
     const context = includeContext ? collectIssueContext() : '';
   ```

## Implementation Checklist

- [ ] Update description translation handler
  - Line: ~1300-1400
  - Platforms: Backlog, Jira ticket descriptions
  - Test: Add description translate button to test

- [ ] Update comment editor handler
  - Line: ~1650-1750
  - Platforms: All platforms
  - Test: Open comment editor, verify translation uses channel settings

- [ ] Update review thread reply handler
  - Function: `translateReviewThreadReplyContent()`
  - Line: ~1999
  - Platforms: GitHub
  - Test: Open PR review, translate reply

- [ ] Search for any other sendMessage calls
  - Use: `grep_search` for "chrome.runtime.sendMessage"
  - Verify all translate handlers are updated

## Testing After Updates

### Test Scenario 1: Backlog Domain-Specific
```
1. Setup channel: Backlog + example.backlog.jp + OpenAI
2. Visit example.backlog.jp
3. Create/edit comment
4. Click translate
5. Verify uses OpenAI (channel settings)
6. Visit different Backlog domain
7. Verify uses global Claude settings
```

### Test Scenario 2: Description Translation
```
1. Open Backlog ticket description
2. Click translate button
3. Verify uses correct provider from channel/global settings
4. Edit description, translate again
5. Verify settings applied correctly
```

### Test Scenario 3: GitHub (No Domain)
```
1. Setup channel: GitHub + Gemini
2. Visit any GitHub PR
3. Translate review comment
4. Verify uses Gemini (channel settings)
5. Verify works across different GitHub repos
```

### Test Scenario 4: Fallback Test
```
1. Delete all channels
2. Visit any platform
3. Verify translation uses global settings
4. Add back channel settings
5. Verify translation switches to channel settings
```

## Edge Cases to Handle

1. **Missing API Key after Update**
   - If channel specifies provider but global doesn't have that API key
   - Should show appropriate error message
   - Currently handled by checking if (settings.apiKey)

2. **Empty Channel Instruction**
   - Should use global instruction as fallback
   - Currently: `settings.customInstruction || globalInstruction`
   - Verify with: `settings.customInstruction || translationInstruction || ''`

3. **Platform Detection Failure**
   - If detectCurrentPlatform() returns null
   - getEffectiveSettings() returns global settings
   - Should still work but show "using global settings" in dev console

## Performance Notes

- `getEffectiveSettings()` is async - all handlers need to be async
- Used to be: sync callback-based (chrome.storage.local.get)
- Now: Promise-based (await getEffectiveSettings)
- No performance impact - both are non-blocking

## References

- Implementation file: content.js
- Functions to update:
  - translateComment() ✅ DONE
  - [description translator] ⏳ TODO
  - [editor translator] ⏳ TODO
  - translateReviewThreadReplyContent() ⏳ TODO
  - [generic helper] ⏳ TODO

---

**Estimated time**: 30-45 minutes for all updates
**Difficulty**: Low-Medium (pattern is repetitive)
**Risk**: Low (changes are isolated to message sending, not core logic)
