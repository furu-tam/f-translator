/**
 * Content script - Inject translate buttons into comments
 * Runs in the context of the web page
 */

// Inject translate button into all comments (only 1 per comment-content)
function injectTranslateButtons() {
  // Find all comment-content elements (actual comment text)
  const commentContents = document.querySelectorAll('.comment-content, .loom.comment-content');

  commentContents.forEach((contentEl) => {
    // Skip if button already exists in this content
    if (contentEl.querySelector('.translator-btn')) {
      return;
    }

    // Get text from comment-content only
    const text = contentEl.innerText?.trim();
    if (!text || text.length < 5) {
      return;
    }

    // Create and style button
    const button = document.createElement('button');
    button.className = 'translator-btn';
    button.innerHTML = '🌐 Dịch';
    button.style.cssText = `
      display: block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 8px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      margin-top: 12px;
      margin-bottom: 0;
      transition: all 0.3s ease;
      width: 100%;
    `;

    button.addEventListener('mouseover', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
    });

    button.addEventListener('mouseout', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = 'none';
    });

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Get text from comment-content only
      const commentText = contentEl.innerText?.trim();
      if (!commentText) {
        showErr(contentEl, '❌ Không tìm thấy text để dịch');
        return;
      }

      // Use comment-content element as target for translation display
      translateComment(contentEl, commentText, button);
    });

    // Inject button after comment-content
    contentEl.appendChild(button);
  });
}

// Translate single comment
async function translateComment(contentEl, text, button) {
  // Get settings from storage
  chrome.storage.local.get(['provider', 'claudeKey', 'openaiKey', 'geminiKey', 'customInstruction'], (data) => {
    const provider = data.provider || 'claude';
    let apiKey = '';
    
    switch(provider) {
      case 'openai': apiKey = data.openaiKey; break;
      case 'gemini': apiKey = data.geminiKey; break;
      default: apiKey = data.claudeKey;
    }

    if (!apiKey) {
      showErr(contentEl, `❌ Vui lòng cài đặt API key cho ${provider}`);
      return;
    }

    // Show loading
    button.disabled = true;
    button.innerHTML = '⏳ Dịch...';

    // Call background script to translate
    chrome.runtime.sendMessage(
      {
        type: 'TRANSLATE_TEXT',
        text: text,
        provider: provider,
        apiKey: apiKey,
        customInstruction: data.customInstruction || ''
      },
      (response) => {
        button.disabled = false;
        button.innerHTML = '🌐 Dịch';

        if (response && response.success) {
          displayTranslation(contentEl, text, response.translation);
        } else {
          showErr(contentEl, `❌ Lỗi: ${response?.error || 'Unknown error'}`);
        }
      }
    );
  });
}

// Display translation below comment
function displayTranslation(contentEl, original, translation) {
  // Remove existing translation if any
  const existing = contentEl.querySelector('.translator-result');
  if (existing) {
    existing.remove();
  }

  const resultDiv = document.createElement('div');
  resultDiv.className = 'translator-result';
  resultDiv.style.cssText = `
    background-color: #e8f5e9;
    border-left: 4px solid #4caf50;
    padding: 12px;
    margin-top: 12px;
    border-radius: 4px;
    font-size: 13px;
    color: #2e7d32;
  `;

  resultDiv.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 6px;">📝 Bản dịch:
      <button class="copy-trans-btn" style="
        float: right;
        background: white;
        border: 1px solid #4caf50;
        color: #4caf50;
        padding: 2px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
      ">📋 Copy</button>
    </div>
    <div>${escapeHtml(translation)}</div>
  `;

  // Copy button handler
  resultDiv.querySelector('.copy-trans-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(translation);
    const btn = resultDiv.querySelector('.copy-trans-btn');
    const originalText = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });

  contentEl.appendChild(resultDiv);
}

// Show error
function showErr(contentEl, message) {
  const errDiv = document.createElement('div');
  errDiv.style.cssText = `
    background-color: #ffebee;
    border-left: 4px solid #f44336;
    padding: 12px;
    margin-top: 12px;
    border-radius: 4px;
    font-size: 13px;
    color: #c62828;
  `;
  errDiv.textContent = message;
  contentEl.appendChild(errDiv);

  setTimeout(() => {
    errDiv.remove();
  }, 5000);
}

// Escape HTML for security
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Run on page load
injectTranslateButtons();

// Re-run when DOM changes (for infinite scroll, lazy loading)
const observer = new MutationObserver(() => {
  injectTranslateButtons();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('✅ Content script loaded - Translate buttons injected');
