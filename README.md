# 🌐 Backlog Translator Extension v1.1.0

**Inline Translation for Jira, Salesforce & Web Comments**

Translate any comment directly in your browser with a single click. Choose your AI provider (Claude, OpenAI, or Gemini) and customize translation instructions.

---

## ✨ Features

### 🎯 Inline Translation
- **Translate buttons appear directly on comments** in any Jira, Salesforce, or web page
- Click "🌐 Dịch" on any comment → translation appears below in 2-3 seconds
- No separate popup workflow needed

### 🤖 Multiple AI Providers
- **Claude** (Anthropic) - Best quality ⭐⭐⭐
- **OpenAI** (GPT-4) - Excellent quality ⭐⭐⭐
- **Gemini** (Google) - Free unlimited tier ⭐⭐

### 📝 Custom Instructions
- Set translation instructions once, applied to all translations
- Examples:
  - "Translate to professional Vietnamese, keep technical terms in English"
  - "Translate concisely, remove unnecessary details"
  - "Translate in conversational tone, very easy to understand"

### 💾 Persistent Settings
- API keys saved locally after first setup
- Custom instructions remembered across sessions
- One-time configuration, unlimited usage

### 🛡️ Secure
- API keys stored securely in Chrome's local storage
- No data sent to external servers except to translation APIs
- HTML escaped to prevent XSS attacks

### 🚀 Fast
- Translation results appear in 2-5 seconds depending on provider
- Automatic retry with exponential backoff for Gemini quota limits
- Rate limiting (1s between requests) for free-tier stability

---

## 📦 Project Structure

```
translator-extension/
├── manifest.json              # Extension configuration (Manifest v3)
├── popup.html                 # Settings UI
├── popup.js                   # Settings management
├── content.js                 # Inject translate buttons, handle clicks
├── background.js              # API calls to Claude/OpenAI/Gemini
├── icon16.png                 # Extension icons
├── icon48.png
├── icon128.png
│
├── Documentation/
├── README.md                  # This file
├── QUICKSTART.md              # User quick start guide
├── CHANGELOG_INLINE.md        # v1.1.0 changes
├── FILES_OVERVIEW.md          # Detailed file descriptions
├── CUSTOMIZATION.md           # How to customize
├── DEBUGGING.md               # Debug tips
│
└── Test/
    ├── test-data.js           # Mock data for testing
    ├── debug-gemini.js        # Gemini quota debugging
    └── TEST_CHECKLIST.md      # Manual testing checklist
```

---

## 🚀 Quick Start

### 1️⃣ Install Extension (30 seconds)
```
1. Open chrome://extensions/
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select translator-extension folder
5. ✅ Icon 🌐 appears on toolbar
```

### 2️⃣ Configure API Key (2 minutes)

**Choose ONE provider:**

<details>
<summary><strong>🔷 Claude (Recommended)</strong></summary>

```
1. https://console.anthropic.com/ → Sign up / Login
2. API Keys → Create Key
3. Copy key (sk-ant-...)
4. Extension popup → Paste key
5. Click "💾 Лавжу cài đặt"
```
</details>

<details>
<summary><strong>🟠 OpenAI</strong></summary>

```
1. https://platform.openai.com/api/keys → Sign up / Login
2. Create new secret key
3. Copy key (sk-...)
4. Extension popup → Select "OpenAI"
5. Paste key → "💾 Лавжу cài đặt"
```
</details>

<details>
<summary><strong>🔴 Gemini (Free)</strong></summary>

```
1. https://ai.google.dev/ → Sign up / Login
2. "Get API Key" → Create API key
3. Copy key (AIzaSy...)
4. Extension popup → Select "Gemini"
5. Paste key → "💾 Лавжу cài đặt"
```
</details>

### 3️⃣ Use It (30 seconds per comment)

```
1. Open any page with comments (Jira, Salesforce, etc.)
2. Locate comment you want to translate
3. Click "🌐 Дич" button (appears on each comment)
4. Wait 2-3 seconds for translation
5. See result in green box below comment
6. Click "📋 Copy" to copy translation
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| [QUICKSTART.md](./QUICKSTART.md) | Step-by-step user guide |
| [FILES_OVERVIEW.md](./FILES_OVERVIEW.md) | Deep dive into each file |
| [CUSTOMIZATION.md](./CUSTOMIZATION.md) | How to customize translations |
| [DEBUGGING.md](./DEBUGGING.md) | Troubleshooting & debug tips |
| [CHANGELOG_INLINE.md](./CHANGELOG_INLINE.md) | What's new in v1.1.0 |
| [TEST_CHECKLIST.md](./TEST_CHECKLIST.md) | Manual testing guide |

---

## 🎨 How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│ Web Page (Jira, Salesforce, etc.)              │
│  ┌──────────────────────────────────────────┐  │
│  │ Comment 1                                │  │
│  │ [🌐 Дич] ← Injected by content.js       │  │
│  │                                          │  │
│  │ 📝 Bản dịch:                            │  │
│  │ Translated text here                    │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
         ↓ (Click button, send message)
┌──────────────────────────────────────────────────────┐
│ background.js (Background Service Worker)          │
│  • Receives "TRANSLATE_TEXT" message               │
│  • Gets API key from popup.js settings             │
│  • Calls Claude/OpenAI/Gemini API                  │
│  • Returns translation result                       │
└──────────────────────────────────────────────────────┘
         ↓ (Return translation)
┌──────────────────────────────────────────────────────┐
│ content.js (Inject Result)                         │
│  • Creates green box with translation              │
│  • Shows below original comment                    │
│  • Adds "📋 Copy" button                          │
└──────────────────────────────────────────────────────┘
```

### Message Flow

```
content.js (TRANSLATE_TEXT message)
  ↓
background.js (Message Listener)
  ├─ Get settings (provider, API key, customInstruction)
  ├─ Call appropriate translation function
  │  ├─ translateWithClaude(text, apiKey, customInstruction)
  │  ├─ translateWithOpenAI(text, apiKey, customInstruction)
  │  └─ translateWithGemini(text, apiKey, customInstruction)
  └─ Return { success: true, translation: "..." }
  ↓
content.js (Display Translation)
  ├─ Create green result box
  ├─ Append to comment element
  └─ Add copy button listener
```

---

## 🔧 Key Features Explained

### Inline Translation

Each comment gets a "🌐 Дич" button automatically injected by `content.js`. When clicked:

1. Button shows "⏳ Дич..." (loading state)
2. Message sent to `background.js` with:
   - `text` - Comment text to translate
   - `provider` - Selected AI (claude, openai, or gemini)
   - `apiKey` - API key from popup settings
   - `customInstruction` - User's custom translation instruction
3. `background.js` calls the appropriate API
4. Translation returned to `content.js`
5. Green box displays result below comment
6. Button returns to "🌐 Дич"

### Custom Instructions

Instead of hardcoded prompts, users can set custom instructions:

```javascript
// Old approach (hardcoded)
const prompt = "Translate to Vietnamese. Only translate, no comments.";

// New approach (customizable)
const instruction = customInstruction || 'Default translation prompt...';
const prompt = `${instruction}:\n\n${text}`;
```

This allows users to fine-tune style, tone, terminology, length, etc.

### Multiple Providers

Extension abstracts provider differences:

```javascript
async function translateText(text, provider, apiKey, customInstruction) {
  switch(provider) {
    case 'openai': return await translateWithOpenAI(text, apiKey, customInstruction);
    case 'gemini': return await translateWithGemini(text, apiKey, customInstruction);
    default: return await translateWithClaude(text, apiKey, customInstruction);
  }
}
```

Users can seamlessly switch between providers without changing anything else.

### Dynamic Page Support

`content.js` uses `MutationObserver` to watch for DOM changes:

```javascript
const observer = new MutationObserver(() => {
  injectTranslateButtons(); // Re-inject on any DOM change
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

This handles:
- Infinite scroll pages
- Lazy-loaded comments
- Dynamic content loading
- No page refresh needed

---

## 🧪 Testing

### Quick Test

```
1. Load extension
2. Set API key
3. Open https://jira.example.com (or any Jira ticket)
4. Look for "🌐 Дич" buttons
5. Click one → See translation appear
6. ✅ Done!
```

### Full Testing

See [TEST_CHECKLIST.md](./TEST_CHECKLIST.md) for comprehensive test matrix covering:
- Installation & loading
- Popup UI & settings
- Inline buttons & translations
- All 3 AI providers
- Custom instructions
- Error handling
- Security & XSS prevention

---

## ⚙️ Configuration

### popup.html / popup.js

**Settings available:**
- AI Provider (Claude / OpenAI / Gemini)
- API Key (provider-specific format)
- Custom Instruction (optional, user-defined)

**Stored in:** `chrome.storage.local`

### content.js

**Customizable selectors for comments:**
```javascript
const commentSelectors = [
  '[data-testid*="comment"]',   // Jira
  '.comment',                    // Generic
  '[class*="comment"]',         // Any class with "comment"
  '[class*="message"]',         // Messages
  '.activity-item',             // Jira activity
  '[class*="note"]',            // Notes
  '[class*="reply"]'            // Replies
];
```

**Button styling:** See `translateBtn` in content.js (purple gradient)

### background.js

**API Endpoints:**
- Claude: `https://api.anthropic.com/v1/messages`
- OpenAI: `https://api.openai.com/v1/chat/completions`
- Gemini: `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`

**Retry logic:** Exponential backoff for Gemini quota errors (2s, 4s, 8s)

---

## 🐛 Troubleshooting

### Buttons don't appear
- ✅ Reload page (F5 / Cmd+R)
- ✅ Check Domain: Is the page included in `manifest.json` > `content_scripts` > `matches`?
- ✅ Check DevTools Console for errors

### Translation fails
- ✅ Verify API key is correct
- ✅ Check DevTools → Network tab for API response errors
- ✅ Consider quota limits (especially Gemini free tier)

### Custom instruction not working
- ✅ Check that you clicked "💾 Лавжу cài đặt"
- ✅ Verify instruction text in popup persists after reload
- ✅ Try simple instruction first: "Translate to Vietnamese"

### Gemini quota errors
- ✅ This is normal for free tier (~10 requests/minute)
- ✅ Extension automatically retries with backoff
- ✅ Wait a few minutes before trying again
- ✅ Consider switching to Claude/OpenAI for production use

For more details, see [DEBUGGING.md](./DEBUGGING.md)

---

## 🔐 Security

### API Keys
- Stored securely in `chrome.storage.local` (encrypted by browser)
- Never logged to console
- Never sent to external servers except target API (Claude/OpenAI/Gemini)
- Users have full control (can delete anytime)

### Content
- HTML is escaped before display (prevents XSS)
- No CORS issues (background script handles requests)
- Page content never leaves browser except for Translation APIs

### Privacy
- Translation text sent only to your chosen API provider
- No tracking, no telemetry, no data collection
- Open source (can audit the code)

---

## 📊 Supported Platforms

✅ Chrome 90+
✅ Brave (Chromium-based)
✅ Edge (Chromium-based)

❌ Firefox (would require Manifest v2 refactor)
❌ Safari (no support for Manifest v3)

---

## 🚀 Future Roadmap

- [ ] Batch translation - All comments at once
- [ ] Keyboard shortcuts - Alt+T to translate selected text
- [ ] Dark mode - Follow system preference
- [ ] Translation history - Store recent translations
- [ ] Language selection - Not just Vietnamese
- [ ] Performance optimizations - Cache translations
- [ ] Custom hotkeys - User-definable shortcuts
- [ ] Analytics (opt-in) - Usage statistics

---

## 📝 License

Open source under MIT license. Feel free to fork, modify, and redistribute.

---

## 🤝 Contributing

Found a bug? Have a feature request?

1. Check [Issues](../../issues)
2. Create new issue if not found
3. Include: What you tried, what happened, browser version
4. Submit pull request with fixes/features

---

## 📞 Support

- 📖 [QUICKSTART.md](./QUICKSTART.md) - How to use
- 🔧 [DEBUGGING.md](./DEBUGGING.md) - Troubleshooting
- 📚 [FILES_OVERVIEW.md](./FILES_OVERVIEW.md) - Code structure
- ✨ [CHANGELOG_INLINE.md](./CHANGELOG_INLINE.md) - What's new

---

## 📈 Version History

### v1.1.0 (April 6, 2026) - Inline Translation Release ⭐
- Complete rewrite: Popup → Inline workflow
- Translate buttons on every comment
- Custom translation instructions
- Support for Claude, OpenAI, Gemini
- Gemini quota handling with auto-retry

### v1.0.0 (April 4, 2026) - Initial Release
- Popup-based fetch & translate workflow
- Claude API integration
- Basic comment extraction

---

**Made with ❤️ for Vietnamese translators**

*Last updated: April 6, 2026*
