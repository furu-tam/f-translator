/**
 * Content script - Inject translate buttons into comments
 * Runs in the context of the web page
 */

// Inject translate button into all comments and ticket description
function injectTranslateButtons() {
  // Find all content elements for both Backlog and GitHub/Git platforms
  const allContentElements = document.querySelectorAll(
    // Backlog selectors
    '.comment-content, .loom.comment-content, .ticket__description, #issueDescription, ' +
    // GitHub/Git selectors
    '#issue-body-viewer, .markdown-body, .IssueBodyViewer-module__IssueBody__xbjV0, ' +
    // Comment viewers for GitHub
    '[data-testid="issue-comment-viewer"], .IssueCommentViewer-module__IssueCommentViewer__'
  );

  // Filter to keep only top-level elements (not nested within other matched elements)
  const contentElements = Array.from(allContentElements).filter(el => {
    // Check if this element is a child of any other matched element
    for (let other of allContentElements) {
      if (other !== el && other.contains(el)) {
        return false; // Skip if it's nested inside another matched element
      }
    }
    return true;
  });

  contentElements.forEach((contentEl) => {
    // Skip if button already exists in this content
    if (contentEl.querySelector('.translator-btn')) {
      return;
    }

    // Get text from content
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
  chrome.storage.local.get(['provider', 'claudeKey', 'openaiKey', 'openaiModel', 'geminiKey', 'geminiModel', 'customInstruction'], (data) => {
    const provider = data.provider || 'claude';
    let apiKey = '';
    let model = '';
    
    switch(provider) {
      case 'openai': 
        apiKey = data.openaiKey; 
        model = data.openaiModel || 'gpt-4-turbo';
        break;
      case 'gemini': 
        apiKey = data.geminiKey; 
        model = data.geminiModel || 'gemini-2.5-flash';
        break;
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
        model: model,
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

// Convert plain text to formatted HTML
function formatTranslationText(text) {
  // Escape HTML first
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // Split into lines
  const lines = html.split('\n');
  let formatted = [];
  let inList = false;
  let inParagraph = false;
  let paragraph = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Skip empty lines but close paragraph
    if (!trimmed) {
      if (paragraph.length > 0) {
        formatted.push(`<p>${paragraph.join(' ')}</p>`);
        paragraph = [];
        inParagraph = false;
      }
      if (inList) {
        formatted.push('</ul>');
        inList = false;
      }
      return;
    }

    // Detect heading (line that looks like heading - typically shorter, or ends with colons)
    if (trimmed.match(/^[ぁ-ん一-龯ァ-ヴー々〆〤a-zA-Z0-9]{2,30}$/) && idx > 0 && lines[idx + 1]?.trim() === '') {
      if (paragraph.length > 0) {
        formatted.push(`<p>${paragraph.join(' ')}</p>`);
        paragraph = [];
      }
      if (inList) {
        formatted.push('</ul>');
        inList = false;
      }
      formatted.push(`<h2>${trimmed}</h2>`);
      return;
    }

    // Detect list items (starting with · or -)
    if (trimmed.match(/^[・\-•*]\s/)) {
      if (paragraph.length > 0) {
        formatted.push(`<p>${paragraph.join(' ')}</p>`);
        paragraph = [];
        inParagraph = false;
      }

      if (!inList) {
        formatted.push('<ul>');
        inList = true;
      }

      const listItem = trimmed.replace(/^[・\-•*]\s+/, '');
      formatted.push(`<li>${listItem}</li>`);
      return;
    }

    // Regular paragraph
    if (inList) {
      formatted.push('</ul>');
      inList = false;
    }

    paragraph.push(trimmed);
    inParagraph = true;
  });

  // Close remaining elements
  if (paragraph.length > 0) {
    formatted.push(`<p>${paragraph.join(' ')}</p>`);
  }
  if (inList) {
    formatted.push('</ul>');
  }

  return formatted.join('\n');
}

// Display translation below comment
function displayTranslation(contentEl, original, translation) {
  // Remove existing translation if any
  const existing = contentEl.querySelector('.translator-result');
  if (existing) {
    existing.remove();
  }

  // Format translation text to HTML
  const formattedTranslation = formatTranslationText(translation);

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
    <style>
      .translator-result h1 {
        font-size: 24px;
        font-weight: bold;
        margin: 16px 0 8px 0;
        border-bottom: 2px solid #4caf50;
        padding-bottom: 4px;
      }
      .translator-result h2 {
        font-size: 20px;
        font-weight: bold;
        margin: 14px 0 8px 0;
        border-bottom: 1px solid #81c784;
        padding-bottom: 4px;
      }
      .translator-result h3 {
        font-size: 18px;
        font-weight: bold;
        margin: 12px 0 6px 0;
      }
      .translator-result h4,
      .translator-result h5,
      .translator-result h6 {
        font-size: 16px;
        font-weight: bold;
        margin: 10px 0 4px 0;
      }
      .translator-result p {
        margin: 8px 0;
        line-height: 1.6;
      }
      .translator-result ul,
      .translator-result ol {
        margin: 8px 0;
        padding-left: 24px;
      }
      .translator-result li {
        margin: 4px 0;
        line-height: 1.6;
      }
      .translator-result a {
        color: #1976d2;
        text-decoration: underline;
      }
      .translator-result a:hover {
        color: #1565c0;
      }
      .translator-result code {
        background: rgba(0,0,0,0.08);
        padding: 2px 6px;
        border-radius: 3px;
        font-family: monospace;
        font-size: 12px;
      }
      .translator-result pre {
        background: rgba(0,0,0,0.08);
        padding: 8px;
        border-radius: 3px;
        overflow-x: auto;
        font-family: monospace;
        font-size: 12px;
      }
      .translator-result blockquote {
        border-left: 4px solid #81c784;
        padding-left: 12px;
        margin-left: 0;
        color: #558b2f;
        font-style: italic;
      }
      .translator-result strong,
      .translator-result b {
        font-weight: bold;
        color: #1b5e20;
      }
      .translator-result em,
      .translator-result i {
        font-style: italic;
      }
      .translator-result table {
        border-collapse: collapse;
        width: 100%;
        margin: 8px 0;
      }
      .translator-result table th,
      .translator-result table td {
        border: 1px solid #81c784;
        padding: 8px;
        text-align: left;
      }
      .translator-result table th {
        background: rgba(76, 175, 80, 0.1);
        font-weight: bold;
      }
    </style>
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
    <div style="clear: both; margin-top: 6px;">${formattedTranslation}</div>
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

// Re-run when DOM changes (for infinite scroll, lazy loading, dynamic content)
const observer = new MutationObserver(() => {
  injectTranslateButtons();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('✅ Content script loaded - Translate buttons injected on comments & ticket description (Backlog, GitHub, Jira, etc)');
