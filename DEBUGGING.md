# 🐛 Debugging & Troubleshooting Guide

## 📋 Common Issues & Solutions

### Issue 1: "❌ Lỗi khi tải comment"

**Nguyên nhân:**
- Trang không có comment
- Comment selector sai
- Extension chưa inject đúng

**Giải pháp:**

```bash
# Step 1: Check console for errors
F12 → Console tab
Look for red errors

# Step 2: Inspect page structure
Right-click on comment → Inspect (F12)
Find the actual HTML element structure

# Step 3: Test selector in console
document.querySelectorAll('[data-testid*="comment"]').length
# Nếu = 0 → selector sai

# Step 4: Find đúng selector
// Thử các alternatives:
document.querySelectorAll('.comment').length
document.querySelectorAll('[class*="comment"]').length
document.querySelectorAll('[id*="comment"]').length

# Step 5: Update content.js
```

**Update `content.js`:**

```javascript
function getPageComments() {
  const comments = [];
  
  // YOUR_CUSTOM_SELECTOR là selector bạn tìm được
  const elements = document.querySelectorAll('YOUR_CUSTOM_SELECTOR');
  
  console.log(`Found ${elements.length} comments`); // Debug log
  
  elements.forEach((el) => {
    const text = el.innerText?.trim();
    if (text && text.length > 0) {
      comments.push({ text });
    }
  });
  
  return comments;
}
```

**Test lại:**
```
1. Save content.js
2. Reload extension (chrome://extensions)
3. Reload target page
4. Click extension → "📨 Tải comment"
5. Check console for "Found X comments"
```

---

### Issue 2: "❌ Lỗi API Claude"

**Nguyên nhân:**
- API key sai/expired
- Không đủ credit
- Network error
- Rate limit

**Giải pháp:**

```bash
# Step 1: Validate API key format
# API key phải:
# ✅ Bắt đầu: sk-ant-
# ✅ Độ dài: >20 ký tự
# ✅ Không space/newline

# Step 2: Check balance & usage
Truy cập: https://console.anthropic.com/
→ Usage tab
→ Check current balance

# Step 3: Check rate limiting
Wait 1 minute → Try again

# Step 4: Test API key với curl
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "test"}]
  }'

# Step 5: Check browser console
F12 → Console
Look for fetch errors
```

**Debug `popup.js`:**

```javascript
// Add detailed logging
async function translateCommentsWithClaude(comments, apiKey) {
  console.log('🔍 Debug Info:');
  console.log('API Key valid:', validateAPIKey(apiKey));
  console.log('Comments count:', comments.length);
  
  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    
    console.log(`\n📝 Comment ${i + 1}:`, comment.text.substring(0, 50));
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `Dịch sang Tiếng Việt:\n\n${comment.text}`
          }]
        })
      });
      
      console.log(`✅ Response status: ${response.status}`);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ API Error:', error);
        throw new Error(error.error?.message);
      }
      
      const data = await response.json();
      console.log('✅ Translation:', data.content[0].text.substring(0, 50));
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}

function validateAPIKey(key) {
  console.log('Key starts with sk-ant-:', key.startsWith('sk-ant-'));
  console.log('Key length:', key.length);
  return key.startsWith('sk-ant-') && key.length > 20;
}
```

---

### Issue 3: "Translation không hiện trên page"

**Nguyên nhân:**
- Content script không inject được
- Iframe issues
- CSP (Content Security Policy) violation

**Giải pháp:**

```bash
# Step 1: Check content script injection
F12 → Console
Paste: window.console.log = (...args) => {}  // Preserve logs
# Should show: "✅ Backlog Translator content script loaded"

# Step 2: Check manifest permissions
manifest.json → host_permissions
Make sure "*://*/*" hoặc "<all_urls>"

# Step 3: Check for CSP errors
F12 → Console
Look for CSP violation messages

# Step 4: Reload extension
chrome://extensions
Find "Backlog Translator"
Click Reload button

# Step 5: Check iframe
If comment trong iframe:
// content.js
frame.contentDocument.querySelectorAll('...') 
```

**Add CSP-safe injection:**

```javascript
// content.js
function injectTranslations(translations) {
  const comments = document.querySelectorAll('[data-testid*="comment"]');
  
  comments.forEach((comment, idx) => {
    try {
      const translationDiv = document.createElement('div');
      translationDiv.style.cssText = `
        background-color: #e8f5e9;
        border-left: 4px solid #4caf50;
        padding: 12px;
        margin-top: 12px;
      `;
      
      // Create text node (safer than innerHTML)
      const textNode = document.createTextNode(translations[idx]);
      translationDiv.appendChild(textNode);
      
      comment.appendChild(translationDiv);
    } catch (error) {
      console.error('Failed to inject translation:', error);
    }
  });
}
```

---

### Issue 4: Extension icon không thấy hoặc không work

**Giải pháp:**

```bash
# Step 1: Check installation
chrome://extensions → tìm "Backlog Translator"
Nếu không có → phải load lại

# Step 2: Load extension lại
chrome://extensions
Click "Load unpacked"
Select translator-extension folder
(Make sure chọn folder chứa manifest.json)

# Step 3: Check manifest.json
Mở manifest.json trong editor
Check JSON syntax (valid?)
Use online JSON validator

# Step 4: Check permissions
manifest.json → host_permissions
Ensure có "*://*/*" hoặc "<all_urls>"

# Step 5: Restart Chrome
Completely close Chrome
Reopen
Check if extension still there
```

**Validate manifest:**

```javascript
// Terminal/Node.js
node -e "console.log(JSON.stringify(require('./manifest.json'), null, 2))"
// Should print nicely formatted manifest without errors
```

---

## 🔧 Debug Tools

### 1️⃣ Browser DevTools

```bash
# Content Script Logs
F12 → Console (current page)
See what content.js outputs

# Popup Logs
Extension icon → Right-click → Inspect
Shows popup.js logs & errors

# Network
F12 → Network tab
See API calls to Claude
Check response status & body

# Storage
F12 → Application → Storage → Local Storage
Check if API key saved
```

### 2️⃣ Extension Management Page

```bash
chrome://extensions/
Find Backlog Translator
Click "Details"
→ "Inspect views" → "background page"
See background.js console
→ "Inspect views" → "popup.html"  
See popup.js console
```

### 3️⃣ Console Commands

```javascript
// Check if extension loaded
chrome.runtime                  // Should exist

// Send message to content script
chrome.tabs.query({active: true}, tabs => {
  chrome.tabs.sendMessage(tabs[0].id, {type: 'GET_CONTENT'}, response => {
    console.log(response);
  });
});

// Check storage
chrome.storage.local.get(null, data => {
  console.log('Stored data:', data);
});

// Check manifest
fetch(chrome.runtime.getURL('manifest.json'))
  .then(r => r.json())
  .then(m => console.log(m));
```

---

## 🎯 Step-by-Step Debugging

### When everything fails:

```
1. ✅ Validate manifest.json (JSON format)
2. ✅ Reload extension (chrome://extensions)
3. ✅ Reload target page (F5)
4. ✅ Check console for errors (F12)
5. ✅ Try different website (test if it's site-specific)
6. ✅ Check API key is correct
7. ✅ Try with mock data (test-data.js)
8. ✅ Check network tab (F12 → Network)
9. ✅ Inspect HTML structure (F12 → Elements)
10. ✅ Ask Claude/search docs

If still stuck:
→ Remove extension & reinstall
→ Check logs at chrome://extensions/
→ Create issue with error message
```

---

## 📊 Debug Checklist

- [ ] manifest.json is valid JSON
- [ ] content.js has console.log outputs
- [ ] popup.htmlloads popup.js
- [ ] popup.js can call fetch API
- [ ] background.js is optional
- [ ] Chrome version ≥ 90
- [ ] Extension loaded correctly
- [ ] No CSP violations
- [ ] API key format correct
- [ ] Network requests succeed

---

## 💡 Pro Tips

### 1. Save logs để analysis
```javascript
// popup.js
const logs = [];

function log(msg) {
  logs.push(`[${new Date().toISOString()}] ${msg}`);
  console.log(msg);
}

// Download logs
const a = document.createElement('a');
a.href = 'data:text/plain,' + encodeURIComponent(logs.join('\n'));
a.download = 'debug.log';
a.click();
```

### 2. Test với hardcoded comments
```javascript
// content.js
function getPageComments() {
  // For testing
  if (window.location.hostname === 'example.com') {
    return [
      { text: 'Test comment 1' },
      { text: 'Test comment 2' }
    ];
  }
  
  // Real implementation
  return [];
}
```

### 3. Temporary bypass đối với selectors
```javascript
// Thêm vào popup.js để test:
const testComments = [
  { text: 'This is a test comment' },
  { text: 'Another test comment' }
];

// Use testComments instead of fetching
```

---

Cần giúp gì thêm? 🆘
