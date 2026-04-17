/**
 * Background service worker
 * Handles API calls and background tasks
 */

const GOOGLE_SHEETS_TRANSLATE_MENU_ID = 'translator-gs-open-sheet-translator';

function ensureGoogleSheetsContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: GOOGLE_SHEETS_TRANSLATE_MENU_ID,
      title: '🌐 Dịch ô (Translator)',
      contexts: ['page'],
      documentUrlPatterns: ['https://docs.google.com/spreadsheets/*']
    });
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== GOOGLE_SHEETS_TRANSLATE_MENU_ID || tab?.id == null) {
    return;
  }
  chrome.tabs.sendMessage(tab.id, { type: 'OPEN_GOOGLE_SHEETS_TRANSLATOR' }).catch(() => {});
});

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ Backlog Translator extension installed');
  
  // Set default values
  chrome.storage.local.get([
    'globalSettings',
    'channelSettings',
    'provider',
    'claudeKey',
    'openaiKey',
    'geminiKey',
    'openaiModel',
    'geminiModel',
    'customInstruction',
    'globalPlatformSettings',
    'translateMode',
    'translationHistory'
  ], (data) => {
    const updates = {};

    if (!data.globalSettings) {
      const provider = data.provider || 'claude';
      let apiKey = '';
      let model = 'claude-3-5-sonnet-20241022';

      switch (provider) {
        case 'openai':
          apiKey = data.openaiKey || '';
          model = data.openaiModel || 'gpt-4-turbo';
          break;
        case 'gemini':
          apiKey = data.geminiKey || '';
          model = data.geminiModel || 'gemini-2.5-flash';
          break;
        default:
          apiKey = data.claudeKey || '';
          break;
      }

      updates.globalSettings = {
        provider,
        model,
        apiKey,
        customInstruction: data.customInstruction || '',
        enabledPlatforms: {
          backlog: true,
          github: true,
          jira: true,
          excel: true,
          ...(data.globalPlatformSettings || {})
        }
      };
    }

    if (!Array.isArray(data.channelSettings)) {
      updates.channelSettings = [];
    }

    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set({
        ...updates,
        translateMode: data.translateMode || 'all',
        translationHistory: data.translationHistory || []
      });
    }
  });
});

// Background message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TRANSLATE_TEXT') {
    const { text, provider, apiKey, model, customInstruction, context } = request;
    translateText(text, provider, apiKey, model, customInstruction, context).then(translation => {
      sendResponse({ success: true, translation });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
});

// Translate text based on provider
async function translateText(text, provider, apiKey, model = '', customInstruction = '', context = '') {
  switch(provider) {
    case 'openai': return await translateWithOpenAI(text, apiKey, model, customInstruction, context);
    case 'gemini': return await translateWithGemini(text, apiKey, model, customInstruction, context);
    default: return await translateWithClaude(text, apiKey, model, customInstruction, context);
  }
}

/** Chuẩn hóa lỗi mạng từ fetch() (thường là "Failed to fetch") thành hướng dẫn rõ ràng hơn. */
function enhanceFetchError(error) {
  const raw = error?.message || String(error);
  const lower = raw.toLowerCase();
  if (
    raw === 'Failed to fetch' ||
    lower.includes('networkerror when attempting to fetch') ||
    lower.includes('failed to fetch') ||
    lower.includes('load failed') ||
    lower.includes('network request failed')
  ) {
    return new Error(
      'Không gọi được API (Failed to fetch). Hãy kiểm tra: kết nối mạng/VPN; proxy/firewall có chặn domain API; extension/adblock có chặn api.anthropic.com, api.openai.com hoặc generativelanguage.googleapis.com; trong chrome://extensions → extension này → Quyền truy cập trang web nên là “Trên tất cả các trang” (hoặc bật đủ quyền host), sau đó tải lại extension và thử lại.'
    );
  }
  return error instanceof Error ? error : new Error(raw);
}

async function readErrorBody(response) {
  let detail = `HTTP ${response.status}`;
  try {
    const errJson = await response.json();
    detail = errJson.error?.message || errJson.message || detail;
  } catch {
    try {
      const t = await response.text();
      if (t && t.length < 500) {
        detail = t;
      }
    } catch {
      // ignore
    }
  }
  return detail;
}

// Claude (Anthropic)
async function translateWithClaude(text, apiKey, model = '', customInstruction = '', context = '') {
  const instruction = customInstruction || 'Dịch sang Tiếng Việt. Chỉ dịch nội dung, không thêm lời bình luận hay giải thích.';
  const selectedModel = model || 'claude-3-5-sonnet-20241022';
  const contentMessage = context 
    ? `${instruction}\n\n[CONTEXT FROM CONVERSATION]\n${context}\n\n[TEXT TO TRANSLATE]\n${text}`
    : `${instruction}\n\n${text}`;
  
  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: contentMessage
          }
        ]
      })
    });
  } catch (e) {
    throw enhanceFetchError(e);
  }

  if (!response.ok) {
    throw new Error(await readErrorBody(response));
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error('Phản hồi Claude không phải JSON hợp lệ.');
  }
  const block = data.content && data.content[0];
  const out = block && (block.text ?? (typeof block === 'string' ? block : null));
  if (out == null || out === '') {
    throw new Error('Claude trả về nội dung rỗng.');
  }
  return out;
}

// OpenAI
async function translateWithOpenAI(text, apiKey, model = '', customInstruction = '', context = '') {
  const instruction = customInstruction || 'Translate to Vietnamese. Only translate, do not add comments or explanations.';
  const selectedModel = model || 'gpt-4-turbo';
  const userContent = context
    ? `[CONTEXT FROM CONVERSATION]\n${context}\n\n[TEXT TO TRANSLATE]\n${text}`
    : text;
  
  let response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: instruction
          },
          {
            role: 'user',
            content: userContent
          }
        ],
        max_tokens: 1024
      })
    });
  } catch (e) {
    throw enhanceFetchError(e);
  }

  if (!response.ok) {
    throw new Error(await readErrorBody(response));
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error('Phản hồi OpenAI không phải JSON hợp lệ.');
  }
  const out = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (out == null || out === '') {
    throw new Error('OpenAI trả về nội dung rỗng.');
  }
  return out;
}

// Gemini (Google)
async function translateWithGemini(text, apiKey, model = '', customInstruction = '', context = '') {
  const instruction = customInstruction || 'Dịch sang Tiếng Việt. Chỉ dịch nội dung, không thêm lời bình luận hay giải thích.';
  const selectedModel = model || 'gemini-2.5-flash';
  const contentMessage = context
    ? `${instruction}\n\n[CONTEXT FROM CONVERSATION]\n${context}\n\n[TEXT TO TRANSLATE]\n${text}`
    : `${instruction}\n\n${text}`;
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let response;
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${selectedModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: contentMessage
                  }
                ]
              }
            ]
          })
        });
      } catch (e) {
        throw enhanceFetchError(e);
      }

      if (!response.ok) {
        const errorMsg = await readErrorBody(response);
        const isQuota = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED');
        if (isQuota && attempt < maxRetries) {
          const delay = Math.pow(2, attempt + 1) * 1000;
          console.log(`⚠️ Gemini quota — thử lại sau ${delay}ms (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const part = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0];
      const out = part && part.text;
      if (out == null || out === '') {
        throw new Error('Gemini trả về nội dung rỗng.');
      }
      return out;
    } catch (error) {
      const msg = error?.message || String(error);
      const isQuota = msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED');
      if (isQuota && attempt < maxRetries) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.log(`⚠️ Gemini quota — thử lại sau ${delay}ms (${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw enhanceFetchError(error);
    }
  }

  throw new Error('Gemini: hết số lần thử.');
}

ensureGoogleSheetsContextMenu();

console.log('✅ Background service worker started');
