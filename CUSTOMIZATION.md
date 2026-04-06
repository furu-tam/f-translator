# 🔧 Advanced Customization Guide

## 🎯 Tùy chỉnh cho từng Platform

### 📋 Jira (Atlassian)

Các selector cho Jira:

```javascript
// Title
document.querySelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]')

// Key
document.querySelector('[data-testid="issue.issue-key"]')

// Description
document.querySelector('[data-testid="issue.views.issue-base.foundation.description.description"]')

// Comments
document.querySelectorAll('[data-testid*="comment"]')

// Comment author
[data-testid*="comment.comment.item.author"]

// Comment time
[data-testid*="comment.comment.item.created"]
```

**Update `content.js`:**

```javascript
function getJiraComments() {
  const comments = [];
  const elements = document.querySelectorAll('[data-testid*="comment"]');
  
  elements.forEach((el) => {
    const author = el.querySelector('[data-testid*="author"]')?.innerText;
    const time = el.querySelector('[data-testid*="created"]')?.innerText;
    const text = el.innerText?.trim();
    
    if (text) {
      comments.push({
        author,
        time,
        text,
        type: 'jira'
      });
    }
  });
  
  return comments;
}
```

---

### 🌩️ Salesforce

Các selector cho Salesforce:

```javascript
// Field values
document.querySelector('[data-test-id*="fieldValue"]')

// Comments/Chatter
document.querySelectorAll('[data-test-id*="postFeedItem"]')

// Comment text
.forceLogListItem__body

// Activity feed
[class*="feedItem"]
```

**Update `content.js`:**

```javascript
function getSalesforceComments() {
  const comments = [];
  
  // Chatter posts
  const chatterItems = document.querySelectorAll('[data-test-id*="postFeedItem"]');
  chatterItems.forEach((item) => {
    const text = item.querySelector('.forceLogListItem__body')?.innerText;
    if (text) {
      comments.push({
        text,
        type: 'salesforce-chatter'
      });
    }
  });
  
  // Activity timeline
  const activityItems = document.querySelectorAll('[class*="feedItem"]');
  activityItems.forEach((item) => {
    const text = item.innerText?.trim();
    if (text && text.length > 10) {
      comments.push({
        text,
        type: 'salesforce-activity'
      });
    }
  });
  
  return comments;
}
```

---

### 📌 GitHub Issues

```javascript
// Issue title
document.querySelector('[data-testid="issue-title"]')

// Issue body
document.querySelector('.comment-body')

// Comments
document.querySelectorAll('[id^="issuecomment-"]')

// Comment text
.markdown-body
```

---

### 🐛 Linear App

```javascript
// Issue title
document.querySelector('[data-testid="issue-title"]')

// Comments
document.querySelectorAll('[data-testid*="comment"]')

// Comment content
.prose
```

---

## 🛠️ Custom Selector Setup

### 1. Inspect Element cần dịch

```
Right-click trên comment → Inspect (F12)
```

### 2. Find CSS Selector

```javascript
// Cách 1: Dùng querySelector
document.querySelector('.my-comment-class')

// Cách 2: Dùng XPath
document.evaluate('//div[@class="comment"]', document).iterateNext()

// Cách 3: Dùng attribute
document.querySelector('[data-testid="comment"]')
```

### 3. Update `content.js`

```javascript
function getPageComments() {
  const comments = [];
  
  // Add your custom selectors
  const selectors = [
    '.my-comment-class',
    '[data-comment-id]',
    '.post-content'
  ];
  
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      const text = el.innerText?.trim();
      if (text) comments.push({ text });
    });
  });
  
  return comments;
}
```

---

## 🎨 Custom Styling

### Change popup theme

File: `popup.html`

```css
/* Change primary color */
.btn-primary {
  background: linear-gradient(135deg, #FF6B6B 0%, #FF8E72 100%);
}

/* Change result background */
.result-translation {
  background: #FFE0B2;
  color: #E65100;
}
```

### Inject custom CSS into page

File: `content.js`

```javascript
function injectCustomCSS() {
  const style = document.createElement('style');
  style.textContent = `
    .translation-badge {
      background: #4CAF50;
      color: white;
      padding: 8px;
      border-radius: 4px;
      margin-top: 10px;
    }
  `;
  document.head.appendChild(style);
}
```

---

## 🤖 Advanced Translation Options

### 1. Ngôn ngữ khác

File: `popup.js`

```javascript
// Thêm language selector
const userLang = document.getElementById('language').value;

// Update prompt
const prompt = `Translate to ${userLang}:\n\n${text}`;
```

### 2. Custom system prompt

```javascript
const systemPrompt = `You are a professional translator specializing in software development.
Keep technical terminology in English if appropriate.
Be concise and clear.`;

// Gửi vào Claude
body: JSON.stringify({
  model: 'claude-3-5-sonnet-20241022',
  system: systemPrompt,
  max_tokens: 1024,
  messages: [...]
})
```

### 3. Context-aware translation

```javascript
// Pass tên project/issue
const context = `
Project: Legal Advisory System
Issue: ${issueKey}
Focus: ${description}

Translate:
${text}
`;
```

---

## 📊 Auto-Injection into Page

### Inject directly HTML

File: `content.js`

```javascript
function injectTranslations(translations) {
  const comments = document.querySelectorAll('[data-testid*="comment"]');
  
  comments.forEach((comment, idx) => {
    const translation = translations[idx];
    
    const badge = document.createElement('div');
    badge.className = 'translation-badge';
    badge.innerHTML = `
      <strong>🌐 VI:</strong> ${translation}
      <button onclick="copyText('${translation}')">📋</button>
    `;
    
    comment.appendChild(badge);
  });
}
```

---

## 🔄 Auto-Translate Features

### 1. Auto translate khi scroll

```javascript
// content.js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Auto translate
      chrome.runtime.sendMessage({
        type: 'AUTO_TRANSLATE',
        element: entry.target
      });
    }
  });
});

document.querySelectorAll('[data-testid*="comment"]').forEach(el => {
  observer.observe(el);
});
```

### 2. Auto translate on page load

```javascript
// content.js
if (document.readyState === 'complete') {
  chrome.storage.local.get(['autoTranslate'], (data) => {
    if (data.autoTranslate) {
      // Trigger auto translation
    }
  });
}
```

### 3. Cache translations

```javascript
// popup.js
const cacheKey = `translation_${url}_${commentHash}`;

chrome.storage.local.get([cacheKey], (data) => {
  if (data[cacheKey]) {
    // Use cached translation
    return data[cacheKey];
  }
});
```

---

## 🔐 Security Enhancements

### 1. Encrypt API Key

```javascript
// popup.js
async function encryptAPIKey(apiKey) {
  const key = await crypto.subtle.generateKey(
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  
  // Store encrypted key
  chrome.storage.local.set({ 
    apiKeyEncrypted: true,
    apiKey: encryptedKey 
  });
}
```

### 2. Request validation

```javascript
// popup.js
function validateAPIKey(key) {
  // Should start with sk-ant-
  if (!key.startsWith('sk-ant-')) {
    throw new Error('Invalid API key format');
  }
  
  // Check length
  if (key.length < 20) {
    throw new Error('API key too short');
  }
  
  return true;
}
```

---

## 📈 Performance Optimization

### 1. Batch requests

```javascript
// Instead of 1 request per comment
const allTexts = comments.map(c => c.text).join('\n---\n');

const response = await fetch('https://api.anthropic.com/v1/messages', {
  body: JSON.stringify({
    messages: [{
      role: 'user',
      content: `Translate each section separated by "---":\n\n${allTexts}`
    }]
  })
});
```

### 2. Lazy loading

```javascript
// Only translate visible comments
const visibleComments = Array.from(
  document.querySelectorAll('[data-testid*="comment"]')
).filter(el => {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight;
});
```

---

## 🧪 Testing

### 1. Test on different sites

```javascript
// Check current site
console.log(window.location.hostname);

// Test selector
console.log(document.querySelectorAll('.comment').length);

// Mock comments
const mockComments = [
  { text: 'Test comment 1' },
  { text: 'Test comment 2' }
];
```

### 2. Debug mode

```javascript
// popup.js
const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[Translator]', ...args);
}
```

---

## 📚 Useful Resources

- [Anthropic API Docs](https://docs.anthropic.com/)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)
- [DOM Selectors](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector)
- [XPath Tutorial](https://www.w3schools.com/xml/xpath_intro.asp)

---

Có gì cần giúp thêm? 💪
