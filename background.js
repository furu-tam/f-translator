/**
 * Background service worker
 * Handles API calls and background tasks
 */

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

// Claude (Anthropic)
async function translateWithClaude(text, apiKey, model = '', customInstruction = '', context = '') {
  const instruction = customInstruction || 'Dịch sang Tiếng Việt. Chỉ dịch nội dung, không thêm lời bình luận hay giải thích.';
  const selectedModel = model || 'claude-3-5-sonnet-20241022';
  const contentMessage = context 
    ? `${instruction}\n\n[CONTEXT FROM CONVERSATION]\n${context}\n\n[TEXT TO TRANSLATE]\n${text}`
    : `${instruction}\n\n${text}`;
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API error');
  }

  const data = await response.json();
  return data.content[0].text;
}

// OpenAI
async function translateWithOpenAI(text, apiKey, model = '', customInstruction = '', context = '') {
  const instruction = customInstruction || 'Translate to Vietnamese. Only translate, do not add comments or explanations.';
  const selectedModel = model || 'gpt-4-turbo';
  const userContent = context
    ? `[CONTEXT FROM CONVERSATION]\n${context}\n\n[TEXT TO TRANSLATE]\n${text}`
    : text;
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API error');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Gemini (Google)
async function translateWithGemini(text, apiKey, model = '', customInstruction = '', context = '') {
  const instruction = customInstruction || 'Dịch sang Tiếng Việt. Chỉ dịch nội dung, không thêm lời bình luận hay giải thích.';
  const selectedModel = model || 'gemini-2.5-flash';
  const contentMessage = context
    ? `${instruction}\n\n[CONTEXT FROM CONVERSATION]\n${context}\n\n[TEXT TO TRANSLATE]\n${text}`
    : `${instruction}\n\n${text}`;
  let retries = 0;
  const maxRetries = 3;

  while (retries <= maxRetries) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${selectedModel}:generateContent?key=${apiKey}`, {
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

      if (!response.ok) {
        const error = await response.json();
        const errorMsg = error.error?.message || 'API error';
        
        // Check if it's a quota error
        if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
          throw new Error(`Quota exceeded: ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      retries++;
      
      if (retries <= maxRetries && (error.message.includes('429') || error.message.includes('Quota'))) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, retries) * 1000;
        console.log(`⚠️ Quota limit - retry ${retries}/${maxRetries} sau ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (retries > maxRetries) {
        throw error;
      }
    }
  }
}

console.log('✅ Background service worker started');
