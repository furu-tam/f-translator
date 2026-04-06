# 🚀 Quick Start Guide - Inline Translation

## ⚡ 3 bước setup nhanh

### 1️⃣ Load Extension vào Chrome (30 giây)

```
1. Mở Chrome → chrome://extensions/
2. Bật "Developer mode" (góc phải trên)
3. Click "Load unpacked"
4. Chọn folder "translator-extension"
5. ✅ Thấy icon 🌐 trên toolbar
```

### 2️⃣ Cài đặt API Key (2 phút)

**Chọn 1 trong 3 options:**

#### 🔷 Option A: Claude (Anthropic) - Recommended
```
1. https://console.anthropic.com/ → Sign up / Login
2. API Keys (menu bên trái) → Create Key
3. Copy API key (sk-ant-...)
4. Click 🌐 → Paste key vào "Claude API Key"
5. Click "💾 Lưu cài đặt"
```

#### 🟠 Option B: OpenAI
```
1. https://platform.openai.com/api/keys → Sign up / Login
2. Create new secret key
3. Copy API key (sk-...)
4. Click 🌐 → Chọn "OpenAI (GPT-4)"
5. Paste key → Click "💾 Lưu cài đặt"
```

#### 🔴 Option C: Gemini (Google) - Free unlimited
```
1. https://ai.google.dev/generativelanguage/client?_gl=1*8jrpuq*_ga*MTY5MzMxNjU1NC4xNzEwNzQ0NzMz* → Sign up / Login
2. Click "Get API Key" → "Create new API key in Google AI Studio"
3. Copy API key (AIzaSy...)
4. Click 🌐 → Chọn "Gemini (Google)"
5. Paste key → Click "💾 Lưu cài đặt"
```

### 3️⃣ Sử dụng Extension (30 giây cho mỗi comment)

#### 📄 Workflow:
```
1. Mở bất kỳ trang web nào có comments:
   - Jira (atlassian.net, jira.com)
   - Salesforce (salesforce.com, lightning.force.com)
   - Hoặc bất kỳ trang web nào

2. Tìm comment bạn muốn dịch

3. Nhấn nút "🌐 Dịch" (xuất hiện trên mỗi comment)

4. Chờ ~2-5 giây

5. Xem bản dịch xuất hiện dưới comment với khung xanh
   - Nhấn "📋 Copy" để copy bản dịch
```

---

## 🎯 Advanced Features

### 📝 Custom Translation Instructions
```
1. Click 🌐 (icon extension)
2. Scroll xuống "Custom Instruction"
3. Nhập hướng dẫn tùy chỉnh:
   - VD: "Dịch theo phong cách chuyên môn, giữ nguyên từ kỹ thuật"
   - VD: "Dịch sang Tiếng Việt hiện đại, dễ hiểu"
   - VD: "Dịch ngắn gọn, loại bỏ các chi tiết không cần thiết"
4. Click "💾 Lưu cài đặt"
5. Custom instruction sẽ được áp dụng cho tất cả translations
```

### 🔄 Gemini 2.5 Flash - Rate Limiting
```
- Được phép: ~10 requests/phút, ~250-500 requests/ngày
- Extension sẽ tự động:
  - Delay 1 giây giữa mỗi request
  - Thử lại nếu gặp quota limit (retry 3 lần)
  - Chờ 2s, 4s, 8s tương ứng trước mỗi lần thử
```

---

## ❓ Troubleshooting

### ❌ "❌ Vui lòng cài đặt API key cho Claude"
→ Kiểm tra bạn đã nhập API key vàoclick "💾 Lưu cài đặt" chưa

### ❌ "❌ Lỗi: API error"
→ API key có thể không đúng hoặc hết hiệu lực
→ Kiểm tra lại xem bạn copy đúng API key không

### ❌ "⚠️ Quota limit - retry..."
→ Chỉ ảnh hưởng Gemini, extension sẽ thử lại tự động
→ Nếu vẫn lỗi, chờ vài phút rồi thử lại

### ❌ Nút "🌐 Dịch" không xuất hiện
→ Reload trang web (F5 hoặc Cmd+R)
→ Kiểm tra manifest.json có khai báo domain đó chưa

---

## 📊 Provider Comparison

| Provider | Cost | Free Tier | Speed | Quality |
|----------|------|-----------|-------|---------|
| **Claude** | $3-20/month | Trial | 🟢 Fast | 🟢⟢⟢ Excellent |
| **OpenAI** | $5-120/month | Trial | 🟢 Fast | 🟢⟢⟢ Excellent |
| **Gemini** | FREE | Unlimited | 🟡 Slower | 🟢⟢ Good |

---

## 💡 Tips

1. **Save time**: Nhập custom instruction một lần, dùng mãi
2. **Free option**: Gemini có free tier unlimited (rate limit ~10/phút)
3. **Best quality**: Claude 3.5 Sonnet nếu bạn có API key
4. **Batch translations**: Mở scroll page để load thêm comments, dịch nhiều lần

---

## 🔧 Technical Details

**Files cần biết:**
- `popup.html` / `popup.js` - Settings UI
- `content.js` - Inject translate buttons vào page
- `background.js` - API calls (Claude, OpenAI, Gemini)
- `manifest.json` - Extension configuration

**Message Flow:**
```
content.js (button click)
  → background.js (TRANSLATE_TEXT)
  → API (Claude/OpenAI/Gemini)
  → background.js (response)
  → content.js (display translation)
```

---

Created: April 6, 2026
Last updated: April 6, 2026
Status: ✅ Inline translation v1.0.0
