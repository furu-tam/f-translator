# 📦 File Structure & Overview

## 📂 Backlog Translator Extension

```
translator-extension/
├── manifest.json          # ⚙️ Extension config (Chrome manifest v3)
├── content.js             # 🕷️ Page script - crawl comments từ HTML
├── popup.html             # 🖥️ Popup UI - giao diện chính
├── popup.js               # ⚙️ Popup logic - xử lý dịch & API
├── background.js          # 🔧 Background service - handle requests
├── package.json           # 📦 Project metadata
├── test-data.js           # 🧪 Mock data để test
├── README.md              # 📚 Full documentation
├── QUICKSTART.md          # 🚀 Quick start guide  
├── CUSTOMIZATION.md       # 🔧 Advanced customization
└── FILES_OVERVIEW.md      # 📄 File này
```

---

## 📄 File Details

### 1️⃣ `manifest.json` (103 lines)
**Mục đích:** Chrome extension config file (bắt buộc)

**Nội dung:**
- Định nghĩa extension metadata (tên, phiên bản)
- Permissions (activeTab, scripting, storage)
- Content scripts injection
- Background service worker
- Popup action

**Khi edit:** Khi muốn:
- Thêm permissions mới
- Thay đổi content script matches
- Update manifest version

---

### 2️⃣ `content.js` (102 lines)
**Mục đích:** Chạy trong page context, crawl comment từ HTML

**Chức năng chính:**
```javascript
getPageComments()       // Trích comment từ page
getPageContent()        // Lấy title, description, comments
message listener        // Nhận msg từ popup
injectTranslations()    // Inject translation vào page
```

**Cách hoạt động:**
1. Findall comments bằng multiple selectors
2. Trích text từ mỗi comment
3. Listen for messages từ popup
4. Inject translated text back vào page

**Selectors dùng:**
```javascript
[data-testid*="comment"]        // Jira
.comment, [class*="comment"]    // Generic
[class*="message"]              // Others
```

**Khi edit:** Cần update selector nếu:
- Website khác (Salesforce, custom platform)
- HTML structure thay đổi
- Muốn crawl thêm field (author, timestamp, etc.)

---

### 3️⃣ `popup.html` (150+ lines)
**Mục đích:** Giao diện extension popup

**Hiển thị:**
- Header (Backlog Translator)
- Settings (API Key input, translate mode)
- Buttons (Save, Fetch, Translate)
- Status message
- Result display area

**Styling:**
- Gradient background (#667eea → #764ba2)
- Responsive layout
- Dark/light mode friendly
- Copy button tích hợp

**Khi edit:** Muốn tùy chỉnh:
- Màu sắc
- Layout (columns, spacing)
- Thêm fields (language selector, etc.)
- Đổi icon/emoji

---

### 4️⃣ `popup.js` (220+ lines)
**Mục đích:** Logic chính - dịch & gọi Claude API

**Hàm chính:**
```javascript
translateBtn click       // Main translate function
fetchBtn click          // Fetch comments từ page
saveSettingsBtn click   // Save API key
translateCommentsWithClaude()    // Gọi Claude API
injectTranslationsIntoPage()     // Gửi lại vào page
displayTranslations()   // Show kết quả
showStatus()            // Update status message
```

**Claude API Call:**
```javascript
// POST https://api.anthropic.com/v1/messages
model: claude-3-5-sonnet-20241022
max_tokens: 1024
prompt: "Dịch sang Tiếng Việt: {comment}"
```

**Error Handling:**
- API key validation
- Network error catch
- Rate limiting (500ms delay)
- User-friendly error messages

**Khi edit:** 
- Thay model (claude-3-5 → claude-opus)
- Update prompt format
- Thêm language selection
- Batch processing

---

### 5️⃣ `background.js` (35 lines)
**Mục đích:** Background service worker (optional for v1)

**Chức năng:**
```javascript
chrome.runtime.onInstalled      // Init on install
chrome.runtime.onMessage        // Handle messages
translateWithClaude()           // API call handler
```

**Khi edit:**
- Thêm storage initialization
- Add event listeners
- Custom API request logic

---

### 6️⃣ `test-data.js` (73 lines)
**Mục đích:** Mock data để test extension

**Contains:**
```javascript
mockPageContent {
  title: "...",
  issueKey: "SFDC-123",
  description: "...",
  comments: [...]
}

createTestHTML()  // Generate HTML để test
```

**Cách dùng:**
```javascript
// Paste vào DevTools console
console.log(mockPageContent);
```

---

### 📚 Documentation Files

#### `README.md` (300+ lines)
Full documentation:
- Features
- Installation guide
- Usage instructions
- How it works (detailed)
- Security
- Troubleshooting
- API reference
- Advanced usage

#### `QUICKSTART.md` (150 lines)
5-step quick start:
- Get API key (2 min)
- Load extension (1 min)
- Save key (30 sec)
- Load backlog (1 min)
- Translate (time varies)

#### `CUSTOMIZATION.md` (350 lines)
Advanced guides:
- Custom selectors for different platforms
- Custom styling
- Translation options
- Auto-injection features
- Security enhancements
- Performance optimization
- Testing approach

---

## 🔄 Data Flow

```
User opens Jira/Salesforce
         ↓
   Click extension icon
         ↓
   [popup.html] shows UI
         ↓
   User clicks "Dịch"
         ↓
   [popup.js] sends message to content script
         ↓
   [content.js] crawls page & extracts comments
         ↓
   [popup.js] receives comments
         ↓
   [popup.js] calls Claude API (per comment)
         ↓
   [popup.js] displays translations
         ↓
   [content.js] injects translation into page
         ↓
   User sees translation both:
   - In extension popup
   - On page (green box)
```

---

## 📊 File Dependencies

```
manifest.json
    ↓
├─→ content.js (injected by manifest)
├─→ popup.html (shown by action)
│   └─→ popup.js (script in popup.html)
│       └─→ content.js (message exchange)
│           ↓
│       [claudeAPI]
│           ↓
│       display results
│
└─→ background.js (service worker)
    └─→ API request handler (optional)
```

---

## 🔧 Configuration

### API Configuration
File: `popup.js`

```javascript
const API_ENDPOINT = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-3-5-sonnet-20241022'
const MAX_TOKENS = 1024
const DELAY = 500  // ms between requests
```

### Selectors Configuration
File: `content.js`

```javascript
const selectors = [
  '[data-testid*="comment"]',
  '.comment',
  '[class*="comment"]'
]
```

### UI Configuration
File: `popup.html` (CSS)

```css
Primary Color: #667eea
Secondary Color: #764ba2
Success: #4caf50
Error: #f44336
```

---

## 📈 Size & Performance

| File | Size | Type |
|------|------|------|
| manifest.json | ~1 KB | Config |
| content.js | ~3 KB | JS |
| popup.html | ~5 KB | HTML |
| popup.js | ~7 KB | JS |
| background.js | ~1 KB | JS |
| **Total** | ~17 KB | - |

> 💡 Tiny extension! ~17KB uncompressed

---

## 🎯 To Do: Extend Features

- [ ] Add language selector (not just Vietnamese)
- [ ] Cache translations locally
- [ ] Export translations to PDF/Excel
- [ ] Dark mode support
- [ ] Keyboard shortcuts
- [ ] Multiple API providers (OpenAI, Google)
- [ ] Rate limit counter display
- [ ] Translation history/search
- [ ] Auto-translate on page load
- [ ] Handle long comments (split/chunk)

---

## ✅ Validation Checklist

Before using:

- [ ] manifest.json is valid JSON
- [ ] All files in same folder
- [ ] content.js has proper event listeners
- [ ] popup.js has API calls with error handling
- [ ] popup.html loads popup.js correctly
- [ ] background.js is optional but safe
- [ ] Package.json is valid

```bash
# Quick validate on Mac
cd translator-extension
node -e "require('./manifest.json')"  # Should not error
```

---

Cần giúp gì thêm? 💪
