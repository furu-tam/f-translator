# Channel-Specific Settings Feature

## Overview
Cho phép người dùng cơ hình cài đặt riêng biệt cho từng platform/domain, bao gồm:
- AI Provider riêng
- Model riêng  
- Custom Instruction riêng

## Data Structure

### Storage Format (chrome.storage.local)
```javascript
{
  // Global API keys (unchanged)
  "provider": "claude",
  "claudeKey": "...",
  "openaiKey": "...",
  "geminiKey": "...",
  "openaiModel": "...",
  "geminiModel": "...",
  "customInstruction": "...",
  
  // Channel-specific settings (NEW)
  "channelSettings": [
    {
      "id": "backlog-example-jp",
      "platform": "backlog",
      "domain": "example.backlog.jp",  // Required for backlog/jira
      "name": "Team A Backlog",         // Display name
      "provider": "claude",
      "model": null,                     // Use provider's default
      "customInstruction": "...",
      "enabled": true,
      "createdAt": 1234567890
    },
    {
      "id": "jira-company-com",
      "platform": "jira",
      "domain": "jira.company.com",     // Required for jira
      "name": "Company Jira",
      "provider": "openai",
      "model": "gpt-4-turbo",
      "customInstruction": "Dịch sang tiếng Việt chuyên ngành...",
      "enabled": true,
      "createdAt": 1234567890
    },
    {
      "id": "github-default",
      "platform": "github",
      "domain": null,                    // Not needed for github
      "name": "GitHub (Global)",
      "provider": "gemini",
      "model": "gemini-2.5-flash",
      "customInstruction": null,
      "enabled": true,
      "createdAt": 1234567890
    },
    {
      "id": "excel-default",
      "platform": "excel",
      "domain": null,                    // Not needed for sheets
      "name": "Google Sheets (Global)",
      "provider": "claude",
      "model": null,
      "customInstruction": "Giữ định dạng Excel...",
      "enabled": true,
      "createdAt": 1234567890
    }
  ]
}
```

## Platform Configuration

### Platforms with Domain
- **Backlog**: `backlog.jp`, `example.backlog.jp`
- **Jira**: `jira.company.com`, `atlassian.net`

### Platforms without Domain (Global)
- **GitHub**: All github.com URLs use same config
- **Google Sheets**: All sheets.google.com URLs use same config

## Matching Logic

### Priority Order:
1. **Exact domain match** (if available)
   - `example.backlog.jp` matches exactly
2. **Platform match** (if no domain match)
   - `github.com/*` matches generic GitHub config
3. **Global fallback**
   - Use default provider settings

### Detection Code:
```javascript
// Detect current platform and domain
const detectPlatform = () => {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  if (url.includes('backlog')) return { platform: 'backlog', domain: hostname };
  if (hostname.includes('github.com')) return { platform: 'github', domain: null };
  if (hostname.includes('jira')) return { platform: 'jira', domain: hostname };
  if (url.includes('docs.google.com/spreadsheets')) return { platform: 'excel', domain: null };
  
  return { platform: null, domain: null };
};

// Get matching settings
const getChannelSettings = (platform, domain) => {
  const channelSettings = chrome.storage.local.get('channelSettings');
  
  // Exact domain match
  const exactMatch = channelSettings.find(s => 
    s.platform === platform && s.domain === domain && s.enabled
  );
  if (exactMatch) return exactMatch;
  
  // Platform match
  const platformMatch = channelSettings.find(s => 
    s.platform === platform && !s.domain && s.enabled
  );
  if (platformMatch) return platformMatch;
  
  // Fallback to global settings
  return null;
};
```

## UI Changes

### Popup.html
New tab: "🌐 Channel Settings"
- List of existing channel settings
- Form to add/edit channel
- Option to enable/disable per channel
- Delete channel setting

### Popup.js
- Load/save channel settings
- Add/edit/delete channel items
- Validate domain format
- Generate unique IDs

### Content.js
- Detect current platform/domain
- Load matching channel settings
- Apply custom model/instruction
- Fallback to global settings

## Implementation Steps

1. ✅ Define data structure
2. ⏳ Update popup.html with new tab
3. ⏳ Update popup.js to manage channel settings
4. ⏳ Update content.js to detect and apply channel settings
5. ⏳ Update background.js message handling
6. ⏳ Test with multiple domains

## Benefits

✅ **Per-platform customization**: Different AI models for different workspaces
✅ **Domain-specific**: Backlog Team A vs Team B can have different models
✅ **Unified global fallback**: Still have default provider settings
✅ **Easy management**: Add/remove channel settings from UI
✅ **Backward compatible**: Existing global settings still work as fallback
