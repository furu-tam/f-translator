/**
 * Manual Testing Checklist - Inline Translation Feature
 * 
 * Run these tests after loading the extension
 */

// ============================================
// 1. INSTALLATION TESTS
// ============================================

/**
 * ✅ TEST 1.1: Extension Loads
 * 
 * Steps:
 * 1. Open chrome://extensions/
 * 2. Enable "Developer mode"
 * 3. Click "Load unpacked"
 * 4. Select translator-extension folder
 * 
 * Expected:
 * - Extension shows as "Backlog Translator" 
 * - Icon shows 🌐 on toolbar
 * - No errors in console
 */

/**
 * ✅ TEST 1.2: Manifest Valid
 * 
 * Steps:
 * 1. Check manifest.json in DevTools
 * 2. Look for errors in extensions page
 * 
 * Expected:
 * - No parsing errors
 * - All files exist (popup.html, content.js, background.js)
 * - Permissions listed correctly
 */

// ============================================
// 2. POPUP TESTS
// ============================================

/**
 * ✅ TEST 2.1: Popup Opens
 * 
 * Steps:
 * 1. Click 🌐 icon on toolbar
 * 
 * Expected:
 * - Popup shows "Backlog Translator"
 * - Shows provider dropdown (Claude / OpenAI / Gemini)
 * - Shows API key input fields
 * - Shows custom instruction textarea
 * - Shows "💾 Lưu cài đặt" button
 */

/**
 * ✅ TEST 2.2: Provider Selection
 * 
 * Steps:
 * 1. Click 🌐
 * 2. Click dropdown → Select "OpenAI"
 * 3. Check which field shows
 * 4. Select "Gemini"
 * 5. Check which field shows
 * 6. Select "Claude"
 * 7. Check which field shows
 * 
 * Expected:
 * - Only selected provider's field shows
 * - Other fields hide properly
 * - Fields marked with correct format hints
 */

/**
 * ✅ TEST 2.3: Settings Persist
 * 
 * Steps:
 * 1. Click 🌐
 * 2. Type dummy API key: "test-key-123"
 * 3. Type custom instruction: "Test instruction"
 * 4. Click "💾 Lưu cài đặt"
 * 5. See success message
 * 6. Close popup
 * 7. Click 🌐 again
 * 
 * Expected:
 * - API key still shows "test-key-123"
 * - Custom instruction still shows
 * - No settings reset
 */

/**
 * ✅ TEST 2.4: Save Without Key - Error Message
 * 
 * Steps:
 * 1. Click 🌐
 * 2. Clear all API key fields
 * 3. Click "💾 Lưu cài đặt"
 * 
 * Expected:
 * - Shows error: "❌ Vui lòng nhập API key cho Claude"
 */

// ============================================
// 3. CONTENT SCRIPT TESTS
// ============================================

/**
 * ✅ TEST 3.1: Buttons Inject on Page Load
 * 
 * Steps:
 * 1. Configure API key (use real key if possible)
 * 2. Open page with comments:
 *    - Jira: https://atlassian.net/browse/TICKET
 *    - Salesforce: https://salesforce.com
 *    - Or test page with <div class="comment">...</div>
 * 3. Scroll page, look for buttons
 * 
 * Expected:
 * - "🌐 Dịch" button appears on each comment
 * - Button has gradient purple color
 * - Button appears at end of comment (before text)
 * - Button is clickable (cursor changes to pointer)
 */

/**
 * ✅ TEST 3.2: Button Click Without API Key
 * 
 * Steps:
 * 1. Clear API key from popup
 * 2. Find comment with button on page
 * 3. Click "🌐 Dịch" button
 * 
 * Expected:
 * - Shows error: "❌ Vui lòng cài đặt API key cho claude"
 * - Error disappears after 5 seconds
 * - Button returns to normal
 */

/**
 * ✅ TEST 3.3: Button Click With Valid Key
 * 
 * Steps:
 * 1. Set valid API key in popup
 * 2. Click "💾 Lưu cài đặt"
 * 3. Open page with comments
 * 4. Click "🌐 Dịch" on any comment
 * 
 * Expected:
 * - Button changes to "⏳ Dịch..." (loading state)
 * - Button becomes disabled
 * - After 2-5 seconds, green box appears below comment
 * - Green box shows "📝 Bản dịch:"
 * - Translated text displays
 * - Button changes back to "🌐 Dịch"
 */

/**
 * ✅ TEST 3.4: Translation Display
 * 
 * Steps:
 * 1. Get successful translation (green box visible)
 * 2. Look at green box styling
 * 3. Check if "📋 Copy" button shows
 * 
 * Expected:
 * - Green background (#e8f5e9)
 * - Green left border (4px)
 * - Padding and spacing look good
 * - Translated text is readable
 * - "📋 Copy" button shows on right
 */

/**
 * ✅ TEST 3.5: Copy Button Works
 * 
 * Steps:
 * 1. Get successful translation
 * 2. Click "📋 Copy" button
 * 3. Try to paste (Cmd+V / Ctrl+V) in notepad
 * 
 * Expected:
 * - Button text changes to "✅ Copied!"
 * - After 2 seconds, reverts to "📋 Copy"
 * - Clipboard contains translated text
 */

/**
 * ✅ TEST 3.6: Multiple Comments
 * 
 * Steps:
 * 1. Find page with 3+ comments
 * 2. Click "🌐 Dịch" on comment 1
 * 3. Wait for translation
 * 4. Click "🌐 Dịch" on comment 2
 * 5. Wait for translation
 * 6. Look at comment 1
 * 
 * Expected:
 * - Comment 1 still shows its translation (not replaced)
 * - Comment 2 now shows its own translation
 * - Both translations persist independently
 */

/**
 * ✅ TEST 3.7: Dynamic Page Loading
 * 
 * Steps:
 * 1. Open infinitely scrolling page (Jira comment section)
 * 2. Scroll down to load more comments
 * 3. Check if new comments have "🌐 Дич" button
 * 
 * Expected:
 * - New comments show buttons automatically
 * - No need to refresh page
 * - MutationObserver working correctly
 */

// ============================================
// 4. API PROVIDER TESTS
// ============================================

/**
 * ✅ TEST 4.1: Claude Translation
 * 
 * Steps:
 * 1. Popup → Select "Claude"
 * 2. Paste real Claude API key (sk-ant-...)
 * 3. Click "💾 Lưu cài đặt"
 * 4. Open page with comment
 * 5. Click "🌐 Дич" on comment
 * 
 * Expected:
 * - Translation appears after 2-3 seconds
 * - Text is good quality Vietnamese
 * - No API errors
 */

/**
 * ✅ TEST 4.2: OpenAI Translation
 * 
 * Steps:
 * 1. Popup → Select "OpenAI"
 * 2. Paste real OpenAI API key (sk-...)
 * 3. Click "💾 Лавжу cài đặt"
 * 4. Open page with comment
 * 5. Click "🌐 Дич"
 * 
 * Expected:
 * - Translation appears after 2-3 seconds
 * - Text quality similar to Claude
 * - No CORS errors
 */

/**
 * ✅ TEST 4.3: Gemini Translation
 * 
 * Steps:
 * 1. Popup → Select "Gemini"
 * 2. Paste real Gemini API key (AIzaSy...)
 * 3. Click "💾 Лавжу cài đặt"
 * 4. Open page with comment
 * 5. Click "🌐 Дич"
 * 6. Monitor Console for retry messages
 * 
 * Expected:
 * - Translation appears after 3-5 seconds
 * - Good quality Vietnamese (slightly less than Claude/OpenAI)
 * - May see "⚠️ Quota limit" messages (normal, auto-retries)
 */

/**
 * ✅ TEST 4.4: Invalid API Key
 * 
 * Steps:
 * 1. Enter fake API key: "invalid-key-xyz"
 * 2. Click "💾 Лавжу cài đặt"
 * 3. Try to translate comment
 * 
 * Expected:
 * - Shows error: "❌ Лoiapi: Unauthorized / Invalid Key"
 * - Error disappears after 5 seconds
 * - No crashes
 */

// ============================================
// 5. CUSTOM INSTRUCTION TESTS
// ============================================

/**
 * ✅ TEST 5.1: Custom Instruction Saves
 * 
 * Steps:
 * 1. Popup → Textarea "Custom Instruction"
 * 2. Type: "Dịch theo phong cách kỹ thuật, giữ nguyên từ tiếng Anh"
 * 3. Click "💾 Лавжу cài đặt"
 * 4. Close popup
 * 5. Open popup again
 * 
 * Expected:
 * - Custom instruction still shows in textarea
 * - Text preserved exactly
 */

/**
 * ✅ TEST 5.2: Custom Instruction Used
 * 
 * Steps:
 * 1. Set custom instruction: "Dịch ngắn gọn, loại bỏ chi tiết"
 * 2. Set another: "Dịch chi tiết, giữ nguyên tất cả"
 * 3. Translate same comment with both instructions
 * 4. Compare results
 * 
 * Expected:
 * - First translation is shorter than second
 * - Both follow the instruction pattern
 * - Instructions actually affect output
 */

/**
 * ✅ TEST 5.3: Empty Instruction Uses Default
 * 
 * Steps:
 * 1. Clear custom instruction textarea (leave empty)
 * 2. Save
 * 3. Translate comment
 * 
 * Expected:
 * - Translation still works
 * - Uses default prompt: "Dịch sang Tiếng Việt..."
 * - No errors
 */

// ============================================
// 6. ERROR HANDLING TESTS
// ============================================

/**
 * ✅ TEST 6.1: Network Error
 * 
 * Steps:
 * 1. Turn off internet (or go offline in DevTools)
 * 2. Try to translate
 * 
 * Expected:
 * - Shows error message
 * - Button returns to normal
 * - No crashes
 */

/**
 * ✅ TEST 6.2: Gemini Quota Error
 * 
 * Steps:
 * 1. Use Gemini API
 * 2. Make 20+ rapid translation clicks (exhaust free quota)
 * 3. Watch console
 * 
 * Expected:
 * - "⚠️ Quota limit - retry..." message
 * - Extension waits (2s, 4s, 8s)
 * - Retries automatically (max 3 times)
 * - After 3 retries, shows error
 */

/**
 * ✅ TEST 6.3: Empty Comment
 * 
 * Steps:
 * 1. Find element that matches comment selector but is empty
 * 2. Try to click "🌐 Дич" (if button created)
 * 
 * Expected:
 * - Either no button created (correct)
 * - Or shows error if clicked
 * - No crashes
 */

// ============================================
// 7. PERFORMANCE TESTS
// ============================================

/**
 * ✅ TEST 7.1: Page Load Time
 * 
 * Steps:
 * 1. Open DevTools → Performance tab
 * 2. Load page with extension active
 * 3. Record page load
 * 4. Disable extension, reload, record again
 * 5. Compare
 * 
 * Expected:
 * - Load time difference < 500ms
 * - Extension not significantly slowing page
 */

/**
 * ✅ TEST 7.2: Memory Usage
 * 
 * Steps:
 * 1. DevTools → Memory tab
 * 2. Take heap snapshot with extension
 * 3. Translate 10 comments
 * 4. Take another snapshot
 * 5. Check memory growth
 * 
 * Expected:
 * - Memory growth < 5MB
 * - No memory leaks
 */

/**
 * ✅ TEST 7.3: Many Comments Page
 * 
 * Steps:
 * 1. Open page with 100+ comments
 * 2. Check if buttons inject on all
 * 3. Translate 5-10 comments
 * 4. Scroll around
 * 5. Monitor performance
 * 
 * Expected:
 * - Buttons appear on visible comments
 * - Page stays responsive
 * - No significant lag
 * - Translations still fast
 */

// ============================================
// 8. SECURITY TESTS
// ============================================

/**
 * ✅ TEST 8.1: HTML Escaping
 * 
 * Steps:
 * 1. Find comment with HTML: "<img src=x onerror=alert('xss')>"
 * 2. Translate it
 * 3. Look at displayed translation
 * 4. Check if script runs
 * 
 * Expected:
 * - HTML is escaped (shows as text, not executed)
 * - No alert popup
 * - Safe from XSS
 */

/**
 * ✅ TEST 8.2: API Key Not Logged
 * 
 * Steps:
 * 1. Open DevTools → Console
 * 2. Translate comment
 * 3. Search for API key in network requests
 * 4. Search in console logs
 * 
 * Expected:
 * - API key NOT shown anywhere except Network → Headers (expected)
 * - Not logged to console
 * - Safe from accidental exposure
 */

/**
 * ✅ TEST 8.3: Storage Security
 * 
 * Steps:
 * 1. DevTools → Application → Storage → Local Storage
 * 2. Check what's stored
 * 3. Look for API key
 * 
 * Expected:
 * - Store shows: provider, claudeKey, openaiKey, geminiKey, customInstruction
 * - Keys are visible (but encrypted by browser)
 * - Same storage as websites (not extra security risk)
 * - Custom instruction stored normally
 */

// ============================================
// FINAL CHECKLIST
// ============================================

/*
MANUAL TEST SUMMARY:

Installation:           ✅ ❌
Popup UI:              ✅ ❌
Settings Persist:      ✅ ❌
Content Script:        ✅ ❌
Inline Buttons:        ✅ ❌
Translation Click:     ✅ ❌
Claude Provider:       ✅ ❌
OpenAI Provider:       ✅ ❌
Gemini Provider:       ✅ ❌
Custom Instruction:    ✅ ❌
Error Handling:        ✅ ❌
Performance:           ✅ ❌
Security:              ✅ ❌

BROWSER: Chrome ______ (version)
DATE: ____________
TESTER: ____________

NOTES:
_________________________________
_________________________________
_________________________________
*/

console.log('📋 Manual Testing Checklist Loaded');
console.log('⏱️ Estimated time: 1-2 hours for complete testing');
console.log('🧪 Run each test independently and document results');
