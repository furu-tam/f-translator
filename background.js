/**
 * Background service worker
 * Handles API calls and background tasks
 */

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ Backlog Translator extension installed');
  
  // Set default values
  chrome.storage.local.get(['provider'], (data) => {
    if (!data.provider) {
      chrome.storage.local.set({
        provider: 'claude',
        claudeKey: '',
        openaiKey: '',
        geminiKey: '',
        translateMode: 'all',
        translationHistory: []
      });
    }
  });
});

// Background message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TRANSLATE_TEXT') {
    const { text, provider, apiKey, customInstruction } = request;
    translateText(text, provider, apiKey, customInstruction).then(translation => {
      sendResponse({ success: true, translation });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
});

// Translate text based on provider
async function translateText(text, provider, apiKey, customInstruction = '') {
  switch(provider) {
    case 'openai': return await translateWithOpenAI(text, apiKey, customInstruction);
    case 'gemini': return await translateWithGemini(text, apiKey, customInstruction);
    default: return await translateWithClaude(text, apiKey, customInstruction);
  }
}

// Claude (Anthropic)
async function translateWithClaude(text, apiKey, customInstruction = '') {
  const instruction = customInstruction || 'Dịch sang Tiếng Việt. Chỉ dịch nội dung, không thêm lời bình luận hay giải thích.';
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${instruction}\n\n${text}`
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
async function translateWithOpenAI(text, apiKey, customInstruction = '') {
  const instruction = customInstruction || 'Translate to Vietnamese. Only translate, do not add comments or explanations.';
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: instruction
        },
        {
          role: 'user',
          content: text
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
async function translateWithGemini(text, apiKey, customInstruction = '') {
  const instruction = customInstruction || 'Dịch sang Tiếng Việt. Chỉ dịch nội dung, không thêm lời bình luận hay giải thích.';
  let retries = 0;
  const maxRetries = 3;

  while (retries <= maxRetries) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${instruction}\n\n${text}`
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
