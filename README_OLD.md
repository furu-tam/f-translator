# 🌐 Backlog Translator Extension

Chrome extension để dịch comment từ backlog (Jira, Salesforce) sang Tiếng Việt bằng Claude AI.

---

## 🎯 Tính năng

✅ **Crawl HTML comment** từ backlog, Jira, Salesforce  
✅ **Dịch sang Tiếng Việt** bằng Claude AI  
✅ **Hiển thị trực tiếp** trên trang web  
✅ **Lưu API key** để sử dụng lần sau  
✅ **Copy translation** dễ dàng  

---

## 📦 Cấu trúc Extension

```
translator-extension/
├── manifest.json       # Cấu hình extension
├── content.js         # Crawl HTML comment từ page
├── popup.html         # Giao diện popup
├── popup.js           # Logic dịch & Claude API
├── background.js      # Background service worker
└── README.md          # Hướng dẫn này
```

---

## 🚀 Cách Cài Đặt

### 1. Lấy Claude API Key

1. Truy cập [console.anthropic.com](https://console.anthropic.com/)
2. Tạo tài khoản / Đăng nhập
3. Vào **API Keys** → **Create Key**
4. Copy API key (định dạng: `sk-ant-xxxxx`)

### 2. Load Extension vào Chrome

1. Mở Chrome
2. Vào `chrome://extensions/`
3. Bật **Developer mode** (góc trên phải)
4. Click **Load unpacked**
5. Chọn folder `translator-extension`

👉 Extension sẽ hiện trên thanh toolbar

---

## 🎮 Cách Sử Dụng

### Bước 1: Lưu API Key

```
1. Click extension icon 🌐
2. Paste API key vào ô "Claude API Key"
3. Click "💾 Lưu cài đặt"
4. Status: "✅ Cài đặt đã lưu"
```

### Bước 2: Dịch Comment

```
1. Mở Jira/Salesforce ticket
2. Click extension icon 🌐
3. Click "📨 Tải comment" (xem preview)
4. Click "✨ Dịch ngay"
5. Chờ kết quả
6. Kết quả hiền phía dưới + trên page
```

### Bước 3: Copy Kết Quả

```
- Click "📋 Copy" để copy translation
- Paste vào bất kỳ đâu bạn cần
```

---

## 🔧 Cách Hoạt Động

### 1. Content Script (`content.js`)

- Chạy trong context của page
- Crawl comment bằng CSS selectors:
  ```javascript
  - Jira: [data-testid*="comment"]
  - Generic: .comment, [class*="comment"]
  ```
- Trích xuất text + HTML

### 2. Popup Script (`popup.js`)

- Gửi message đến content script
- Nhận comments từ page
- Gọi Claude API để dịch từng comment
- Hiển thị kết quả
- Inject translation vào page

### 3. Background Script (`background.js`)

- Handle API requests
- Store API key an toàn
- Log translation history

---

## 📝 Ví Dụ

### Input (English):
```
This bug occurs when user tries to upload a file larger than 10MB.
The system should validate file size before submission.
```

### Output (Vietnamese):
```
Lỗi này xảy ra khi người dùng cố gắng tải lên một tệp lớn hơn 10MB.
Hệ thống nên xác thực kích thước tệp trước khi gửi.
```

---

## 🛡️ Security

- ✅ API key lưu trên **Chrome storage** (local machine)
- ✅ Không gửi API key qua internet nếu không cần
- ✅ HTTPS-only cho API calls
- ✅ Content script chỉ chạy trên các site đã phép

---

## ⚠️ Lưu Ý

### 1. Rate Limiting
- Claude API có giới hạn request
- Extension delay 500ms giữa mỗi request
- Nếu bị rate limit → chờ một chút rồi thử lại

### 2. Cost
- Mỗi request tính tiền theo tokens
- ~1000 tokens = ~$0.003
- Monitor usage ở [console.anthropic.com](https://console.anthropic.com/)

### 3. Model
- Hiện dùng: `claude-3-5-sonnet-20241022`
- Có thể thay đổi trong `popup.js` hoặc `background.js`

---

## 🔍 Troubleshooting

### ❌ "❌ Lỗi khi tải comment"

**Nguyên nhân:** Trang không có comment hoặc selector sai

**Giải pháp:**
1. Inspect page bằng DevTools (F12)
2. Tìm comment HTML element
3. Update selector trong `content.js`

### ❌ "❌ Lỗi API Claude"

**Nguyên nhân:** API key sai hoặc không đủ credit

**Giải pháp:**
1. Kiểm tra API key có đúng không
2. Kiểm tra balance tại [console.anthropic.com](https://console.anthropic.com/)
3. Retry

### ❌ "❌ Không tìm thấy comment nào"

**Nguyên nhân:** Trang không có comment hoặc comment không load

**Giải pháp:**
1. Chờ trang load xong
2. Scroll down xem có insight bổ sung không
3. Kiểm tra HTML selector

---

## 📚 API Reference

### Content Script Messages

```javascript
// Get page content
chrome.tabs.sendMessage(tabId, { type: 'GET_CONTENT' });

// Get only comments
chrome.tabs.sendMessage(tabId, { type: 'GET_COMMENTS' });

// Inject translations
chrome.tabs.sendMessage(tabId, {
  type: 'INJECT_TRANSLATION',
  translations: ["dịch 1", "dịch 2"]
});
```

### Claude API

```javascript
// Request format
{
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  messages: [
    { role: "user", content: "Dịch sang Tiếng Việt: ..." }
  ]
}

// Response
{
  content: [{ type: "text", text: "Kết quả dịch..." }]
}
```

---

## 🚀 Advanced Usage

### 1. Auto-translate khi mở page

Thêm vào `content.js`:
```javascript
// Auto translate on page load
window.addEventListener('load', () => {
  chrome.storage.local.get(['autoTranslate'], (data) => {
    if (data.autoTranslate) {
      // Trigger translation
    }
  });
});
```

### 2. Save translation history

Thêm vào `popup.js`:
```javascript
chrome.storage.local.get(['translationHistory'], (data) => {
  const history = data.translationHistory || [];
  history.push({
    url: tab.url,
    timestamp: new Date(),
    translations: translations
  });
  chrome.storage.local.set({ translationHistory: history });
});
```

### 3. Custom CSS styling

Edit `popup.html` để tùy chỉnh giao diện

---

## 📞 Support

Nếu gặp lỗi:
1. Check console log (F12 → Console)
2. Check extension logs (chrome://extensions → Details → "background page")
3. Kiểm tra manifest.json syntax
4. Try reload extension (disable → enable)

---

## 📝 License

MIT License - Free to use & modify

---

## 🙏 Thanks

- Built with ❤️ for developers
- Powered by Anthropic Claude AI
