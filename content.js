/**
 * Content script - Inject translate buttons into comments
 * Runs in the context of the web page
 */

// Supported languages for editor translation
const SUPPORTED_LANGUAGES = {
  'vi': 'Tiếng Việt',
  'en': 'English',
  'ja': '日本語 (Japanese)',
  'zh': '中文 (Chinese)',
  'ko': '한국어 (Korean)',
  'es': 'Español (Spanish)',
  'fr': 'Français (French)',
  'de': 'Deutsch (German)',
  'it': 'Italiano (Italian)',
  'pt': 'Português (Portuguese)',
  'ru': 'Русский (Russian)',
  'ar': 'العربية (Arabic)',
  'hi': 'हिन्दी (Hindi)',
  'th': 'ไทย (Thai)',
  'id': 'Bahasa Indonesia',
  'my': 'မြန်မာ (Myanmar)',
  'tl': 'Tagalog (Filipino)',
  'tr': 'Türkçe (Turkish)',
  'pl': 'Polski (Polish)',
  'uk': 'Українська (Ukrainian)',
  'el': 'Ελληνικά (Greek)',
  'he': 'עברית (Hebrew)',
  'nl': 'Nederlands (Dutch)',
  'sv': 'Svenska (Swedish)',
  'no': 'Norsk (Norwegian)',
  'da': 'Dansk (Danish)',
  'fi': 'Suomi (Finnish)'
};

// Inject translate button into all comments and ticket description
function injectTranslateButtons() {
  // Handle Backlog comments separately
  injectBacklogTranslateButtons();
  
  // Handle GitHub comments
  injectGitHubTranslateButtons();
  
  // Handle Jira comments and descriptions
  injectJiraTranslateButtons();
  
  // Handle ticket descriptions
  injectTicketDescriptionTranslateButton();
  
  // Handle Google Sheets
  injectGoogleSheetsTranslation();
}

// Inject translate buttons for Backlog comments (1 button per comment item)
function injectBacklogTranslateButtons() {
  // Select comment items and ticket description
  const commentItems = document.querySelectorAll('.comment-item__inner');
  
  commentItems.forEach((commentItem) => {
    // Find the content element within this comment item
    const contentEl = commentItem.querySelector('.comment-content, .loom.comment-content');
    if (!contentEl) return;
    
    // Skip if button already exists
    if (commentItem.querySelector('.translator-btn')) {
      return;
    }
    
    // Get text from content
    const text = contentEl.innerText?.trim();
    if (!text || text.length < 5) {
      return;
    }
    
    // Create button with icon-button style (like star button)
    const button = document.createElement('button');
    button.className = 'translator-btn icon-button icon-button--default'; 
    button.innerHTML = '🌐';
    button.title = 'Translate comment';
    button.type = 'button';
    button.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      color: #333;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-right: 8px;
      transition: all 0.2s ease;
      white-space: nowrap;
      opacity: 0.7;
    `;
    
    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = '#f0f0f0';
      button.style.opacity = '1';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = 'transparent';
      button.style.opacity = '0.7';
    });
    
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const commentText = contentEl.innerText?.trim();
      if (!commentText) {
        showErr(contentEl, '❌ Không tìm thấy text để dịch');
        return;
      }
      translateComment(contentEl, commentText, button);
    });
    
    // Insert button into comment-item__actions before star-container
    const actionsDiv = commentItem.querySelector('.comment-item__actions');
    const starContainer = actionsDiv?.querySelector('.star-container');
    if (starContainer) {
      starContainer.parentElement.insertBefore(button, starContainer);
    } else if (actionsDiv) {
      actionsDiv.insertBefore(button, actionsDiv.firstChild);
    }
  });
}

// Inject translate buttons for GitHub comments
function injectGitHubTranslateButtons() {
  // Find comment containers by looking for markdown-body within comment items
  const markdownBodies = document.querySelectorAll('.markdown-body');
  
  markdownBodies.forEach((contentEl) => {
    // Skip if button already added to this element
    if (contentEl.querySelector('.translator-btn')) {
      return;
    }
    
    // Get the parent comment container
    const container = contentEl.closest('[data-testid="issue-comment-viewer"], .Box-row, [class*="Comment"]');
    if (!contentEl) return;
    
    const text = contentEl.innerText?.trim();
    if (!text || text.length < 5) {
      return;
    }
    
    // Create button
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
      const commentText = contentEl.innerText?.trim();
      if (!commentText) {
        showErr(contentEl, '❌ No content to translate');
        return;
      }
      translateComment(contentEl, commentText, button);
    });
    
    // Append button after markdown content
    const existingButton = contentEl.parentElement?.querySelector('.translator-btn');
    if (!existingButton) {
      contentEl.appendChild(button);
    }
  });
}

// Inject translate buttons for Jira comments
function injectJiraTranslateButtons() {
  const jiraComments = document.querySelectorAll('.ak-renderer-wrapper.is-comment');
  
  jiraComments.forEach((commentEl) => {
    // Skip if button already exists in this comment
    if (commentEl.parentElement?.querySelector('.translator-btn')) {
      return;
    }
    
    const text = commentEl.innerText?.trim();
    if (!text || text.length < 5) {
      return;
    }
    
    // Create button
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
      const commentText = commentEl.innerText?.trim();
      if (!commentText) {
        showErr(commentEl, '❌ No content to translate');
        return;
      }
      translateComment(commentEl, commentText, button);
    });
    
    commentEl.appendChild(button);
  });
}

// Inject translate button for ticket descriptions
function injectTicketDescriptionTranslateButton() {
  // Backlog/Jira ticket description
  const ticketDesc = document.querySelector('.ticket__description, #issueDescription, [data-testid="issue.views.field.rich-text.description"]');
  
  if (!ticketDesc || ticketDesc.querySelector('.translator-btn')) {
    return;
  }
  
  const text = ticketDesc.innerText?.trim();
  if (!text || text.length < 5) {
    return;
  }
  
  // Create button
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
    const descText = ticketDesc.innerText?.trim();
    if (!descText) {
      showErr(ticketDesc, '❌ No content to translate');
      return;
    }
    translateComment(ticketDesc, descText, button);
  });
  
  // Find and insert before GitHub issue body viewer if present
  const issueBodyViewer = document.querySelector('#issue-body-viewer, .IssueBodyViewer-module__IssueBody__xbjV0');
  if (issueBodyViewer) {
    issueBodyViewer.appendChild(button);
  } else {
    ticketDesc.appendChild(button);
  }
}

// Google Sheets translation with popover
let googleSheetsPopoverInitialized = false;

function injectGoogleSheetsTranslation() {
  // Check if already initialized
  if (googleSheetsPopoverInitialized) {
    return;
  }
  
  // Detect Google Sheets
  if (!document.querySelector('[data-spreadsheet-id]') && !document.querySelector('.grid-container')) {
    console.log('[GS] Google Sheets not detected - not initializing');
    return;
  }
  
  console.log('[GS] Google Sheets detected - initializing translation popover');
  
  googleSheetsPopoverInitialized = true;
  
  // Create popover element (hidden by default)
  const popover = document.createElement('div');
  popover.id = 'translator-gs-popover';
  popover.style.cssText = `
    position: fixed;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    display: none;
    width: 320px;
    min-height: 200px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    overflow: hidden;
  `;
  
  popover.innerHTML = `
    <div id="translator-gs-header" style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 8px 12px;
      cursor: move;
      user-select: none;
      font-weight: 600;
      font-size: 13px;
    ">
      <span>🌐 Translator</span>
      <button id="translator-gs-close" style="
        background: transparent;
        color: white;
        border: none;
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">✕</button>
    </div>
    <div style="padding: 12px;">
      <div style="display: flex; gap: 8px; margin-bottom: 10px;">
        <select id="translator-gs-lang" style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">
          <option value="">📖 Choose language...</option>
        </select>
        <button id="translator-gs-btn" style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        ">🌐 Dịch</button>
      </div>
      <div id="translator-gs-result" style="
        background: #f5f5f5;
        border-radius: 4px;
        padding: 8px;
        min-height: 60px;
        max-height: 300px;
        overflow-y: auto;
        display: none;
      "></div>
    </div>
    <div id="translator-gs-resize" style="
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      cursor: se-resize;
      background: linear-gradient(135deg, transparent 0%, #667eea 100%);
      border-radius: 0 0 8px 0;
    "></div>
  `;
  
  document.body.appendChild(popover);
  
  // Populate language options
  const langSelect = popover.querySelector('#translator-gs-lang');
  Object.entries(SUPPORTED_LANGUAGES).forEach(([code, name]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    langSelect.appendChild(option);
  });
  langSelect.value = 'ja'; // Default to Japanese
  
  // Track current cell content
  let currentCellContent = '';
  let lastInputValue = '';
  
  // Dragging state
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  
  // Resizing state
  let isResizing = false;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let resizeStartWidth = 320;
  let resizeStartHeight = 200;
  
  // Get the position of the active cell indicator in Google Sheets
  const getActiveCellPosition = () => {
    // Look for the active cell border (Google Sheets has a blue border around active cell)
    const activeCellBorder = document.querySelector('[class*="active-cell"], .active-cell-border');
    if (activeCellBorder) {
      const rect = activeCellBorder.getBoundingClientRect();
      return { x: rect.right + 10, y: rect.top };
    }
    
    // Look for cell with specific styling indicating it's selected
    const selectedCells = document.querySelectorAll('[class*="selected"], [style*="border"]');
    for (let cell of selectedCells) {
      const style = window.getComputedStyle(cell);
      if (style.borderColor && style.borderColor !== 'transparent') {
        const rect = cell.getBoundingClientRect();
        return { x: rect.right + 10, y: rect.top };
      }
    }
    
    // Fallback: position near grid center
    const gridContainer = document.querySelector('.grid-container');
    if (gridContainer) {
      const rect = gridContainer.getBoundingClientRect();
      return { x: rect.left + 400, y: rect.top + 150 };
    }
    
    return { x: 100, y: 100 };
  };
  
  // Function to find and monitor cell content from formula bar or contenteditable elements
  const getCellContent = () => {
    // Try multiple ways to get the current cell content
    
    // Method 1: Look for formula bar input
    let formulaBar = document.querySelector('[data-is-formula]') ||
                     document.querySelector('[role="textbox"][aria-label*="Formula"]') ||
                     document.querySelector('input[aria-label*="formula"]') ||
                     document.querySelector('[data-formula-bar]');
    
    if (formulaBar) {
      const content = formulaBar.value || formulaBar.innerText || formulaBar.textContent || '';
      console.log('[GS] Found formula bar with method 1:', content?.substring(0, 50));
      return content;
    }
    
    // Method 2: Look for contenteditable div in toolbar area
    const editableArea = document.querySelector('[contenteditable="true"][role="textbox"]');
    if (editableArea && editableArea.innerText) {
      const content = editableArea.innerText.trim();
      console.log('[GS] Found editable area with method 2:', content?.substring(0, 50));
      return content;
    }
    
    // Method 3: Search for input fields in the top toolbar that might show cell value
    const inputs = document.querySelectorAll('input[type="text"], input:not([type]), [contenteditable="true"]');
    for (let input of inputs) {
      const content = input.value || input.innerText || input.textContent || '';
      if (content && content.length > 0 && content.length < 5000) {
        // Check if it looks like cell content (not too short, not too long)
        if (content.length >= 1) {
          console.log('[GS] Found input with method 3:', content?.substring(0, 50));
          return content.trim();
        }
      }
    }
    
    console.log('[GS] No cell content found');
    return '';
  };
  
  // Monitor for cell selection changes
  const monitorCellContent = () => {
    const content = getCellContent();
    
    if (content && content !== lastInputValue && content.length > 0) {
      lastInputValue = content;
      currentCellContent = content;
      
      // Get active cell position and position popover next to it
      const cellPos = getActiveCellPosition();
      
      popover.style.top = cellPos.y + 'px';
      popover.style.left = Math.min(cellPos.x, window.innerWidth - 340) + 'px';
      
      // Reset result display
      popover.querySelector('#translator-gs-result').innerHTML = `📝 Content: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`;
      popover.querySelector('#translator-gs-result').style.display = 'block';
      
      console.log('[GS] Popover positioned at:', cellPos);
      
      // Show popover
      popover.style.display = 'block';
    }
  };
  
  // Listen for keyboard events (arrow keys navigate cells)
  document.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(e.key)) {
      setTimeout(monitorCellContent, 100);
    }
  });
  
  // Listen for click events on the grid
  document.addEventListener('click', (e) => {
    // Check if clicking inside grid container
    if (e.target.closest('.grid-container') || e.target.closest('[data-spreadsheet-id]')) {
      setTimeout(monitorCellContent, 50);
    }
  }, true);
  
  // Monitor input changes in any input fields or contenteditable areas
  document.addEventListener('input', () => {
    monitorCellContent();
  }, true);
  
  // Use MutationObserver to watch for changes in the document
  const observer = new MutationObserver(() => {
    monitorCellContent();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
    attributeFilter: ['aria-label', 'data-value', 'value'],
    characterDataOldValue: false
  });
  
  // =========================
  // Dragging functionality
  // =========================
  const header = popover.querySelector('#translator-gs-header');
  
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragOffsetX = e.clientX - popover.offsetLeft;
    dragOffsetY = e.clientY - popover.offsetTop;
    header.style.cursor = 'grabbing';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      popover.style.left = (e.clientX - dragOffsetX) + 'px';
      popover.style.top = (e.clientY - dragOffsetY) + 'px';
    }
    
    if (isResizing) {
      const newWidth = Math.max(250, resizeStartWidth + (e.clientX - resizeStartX));
      const newHeight = Math.max(150, resizeStartHeight + (e.clientY - resizeStartY));
      popover.style.width = newWidth + 'px';
      popover.style.minHeight = newHeight + 'px';
    }
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
    isResizing = false;
    header.style.cursor = 'move';
  });
  
  // =========================
  // Resizing functionality
  // =========================
  const resizeHandle = popover.querySelector('#translator-gs-resize');
  
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartWidth = popover.offsetWidth;
    resizeStartHeight = popover.offsetHeight;
    resizeHandle.style.opacity = '1';
  });
  
  // Close button
  popover.querySelector('#translator-gs-close').addEventListener('click', () => {
    popover.style.display = 'none';
    currentCellContent = '';
    lastInputValue = '';
  });
  
  // Translate button
  const translateBtn = popover.querySelector('#translator-gs-btn');
  translateBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentCellContent) {
      alert('❌ No content to translate');
      return;
    }
    
    const language = langSelect.value;
    if (!language) {
      alert('❌ Please select a language');
      return;
    }
    
    // Show loading
    translateBtn.disabled = true;
    translateBtn.textContent = '⏳ Dịch...';
    
    // Get settings
    chrome.storage.local.get(['provider', 'claudeKey', 'openaiKey', 'geminiKey', 'openaiModel', 'geminiModel', 'customInstruction'], (data) => {
      const provider = data.provider || 'claude';
      const apiKey = data[provider + 'Key'];
      let model = '';
      
      if (!apiKey) {
        translateBtn.disabled = false;
        translateBtn.textContent = '🌐 Dịch';
        alert('❌ Please set up your API key in the extension settings');
        return;
      }
      
      switch(provider) {
        case 'openai':
          model = data.openaiModel || 'gpt-4-turbo';
          break;
        case 'gemini':
          model = data.geminiModel || 'gemini-2.5-flash';
          break;
      }
      
      const langName = SUPPORTED_LANGUAGES[language];
      const translationInstruction = `Translate to ${langName}. Only translate, do not add comments or explanations. Preserve formatting.`;
      
      // Send translation request
      chrome.runtime.sendMessage({
        type: 'TRANSLATE_TEXT',
        text: currentCellContent,
        provider: provider,
        apiKey: apiKey,
        model: model,
        customInstruction: translationInstruction,
        context: ''
      }, (response) => {
        translateBtn.disabled = false;
        translateBtn.textContent = '🌐 Dịch';
        
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          const resultDiv = popover.querySelector('#translator-gs-result');
          resultDiv.innerHTML = `❌ Error: ${chrome.runtime.lastError.message}`;
          resultDiv.style.display = 'block';
          return;
        }
        
        if (response && response.success) {
          const resultDiv = popover.querySelector('#translator-gs-result');
          const formattedTranslation = formatTranslationText(response.translation);
          resultDiv.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px; color: #667eea;">📝 Translation:</div>
            <div style="color: #333; line-height: 1.5;">${formattedTranslation}</div>
            <button id="translator-gs-copy" style="
              background: white;
              border: 1px solid #667eea;
              color: #667eea;
              padding: 4px 8px;
              border-radius: 3px;
              cursor: pointer;
              font-size: 11px;
              margin-top: 8px;
            ">📋 Copy</button>
          `;
          resultDiv.style.display = 'block';
          
          // Copy button
          resultDiv.querySelector('#translator-gs-copy')?.addEventListener('click', () => {
            navigator.clipboard.writeText(response.translation);
            const btn = resultDiv.querySelector('#translator-gs-copy');
            const originalText = btn.textContent;
            btn.textContent = '✅ Copied!';
            setTimeout(() => {
              btn.textContent = originalText;
            }, 2000);
          });
        } else if (response && response.error) {
          const resultDiv = popover.querySelector('#translator-gs-result');
          resultDiv.innerHTML = `❌ Error: ${response.error}`;
          resultDiv.style.display = 'block';
        } else {
          const resultDiv = popover.querySelector('#translator-gs-result');
          resultDiv.innerHTML = '❌ No response from background script';
          resultDiv.style.display = 'block';
        }
      });
    });
  });
  
  // Close popover when clicking outside
  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && !e.target.closest('.grid-container')) {
      // popover.style.display = 'none';  // Don't auto-close to allow user to interact
    }
  }, true);
}

// Collect all issue/ticket content as context for translation
function collectIssueContext() {
  const contextParts = [];

  // Collect ticket/issue description (Backlog/Jira)
  const ticketDesc = document.querySelector('.ticket__description, #issueDescription, .ak-renderer-wrapper.is-comment, [data-testid="issue.views.field.rich-text.description"]');
  if (ticketDesc) {
    const ticketText = ticketDesc.innerText?.trim();
    if (ticketText) {
      contextParts.push(`[TICKET DESCRIPTION]\n${ticketText}`);
    }
  }

  // Collect GitHub issue body
  const issueBody = document.querySelector('#issue-body-viewer, .IssueBodyViewer-module__IssueBody__xbjV0, .markdown-body');
  if (issueBody && !ticketDesc) {
    const bodyText = issueBody.innerText?.trim();
    if (bodyText) {
      contextParts.push(`[ISSUE DESCRIPTION]\n${bodyText}`);
    }
  }

  // Collect all comments
  const allComments = document.querySelectorAll(
    '.comment-content, .loom.comment-content, [data-testid="issue-comment-viewer"], .IssueCommentViewer-module__IssueCommentViewer__'
  );
  
  // Filter to top-level only
  const comments = Array.from(allComments).filter(el => {
    for (let other of allComments) {
      if (other !== el && other.contains(el)) {
        return false;
      }
    }
    return true;
  });

  comments.forEach((comment, index) => {
    const text = comment.innerText?.trim();
    if (text && text.length > 5) {
      contextParts.push(`[COMMENT ${index + 1}]\n${text}`);
    }
  });

  return contextParts.length > 0 ? contextParts.join('\n\n---\n\n') : '';
}

// Translate single comment
async function translateComment(contentEl, text, button) {
  // Get settings from storage
  chrome.storage.local.get(['provider', 'claudeKey', 'openaiKey', 'openaiModel', 'geminiKey', 'geminiModel', 'includeTicketContext', 'customInstruction'], (data) => {
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

    // Collect full issue context only if enabled
    const includeContext = data.includeTicketContext !== false;
    const context = includeContext ? collectIssueContext() : '';

    // Call background script to translate
    chrome.runtime.sendMessage(
      {
        type: 'TRANSLATE_TEXT',
        text: text,
        provider: provider,
        apiKey: apiKey,
        model: model,
        customInstruction: data.customInstruction || '',
        context: context
      },
      (response) => {
        button.disabled = false;
        button.innerHTML = '🌐 Dịch';

        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          showErr(contentEl, `❌ Lỗi: ${chrome.runtime.lastError.message}`);
          return;
        }

        if (response && response.success) {
          displayTranslation(contentEl, text, response.translation);
        } else if (response && response.error) {
          showErr(contentEl, `❌ Lỗi: ${response.error}`);
        } else {
          showErr(contentEl, `❌ Lỗi: No response from background script`);
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

// Inject editor translation feature for Backlog
function injectEditorTranslation() {
  const editor = document.getElementById('switchStatusAddCommentForm');
  if (!editor) return;

  // Skip if already injected
  if (editor.querySelector('.translator-lang-selector')) {
    return;
  }

  const inputWrapper = editor.querySelector('.comment-editor__input-wrapper');
  
  if (!inputWrapper) return;

  // Create container for language selector and translate button
  const container = document.createElement('div');
  container.className = 'translator-editor-container';
  container.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 0;
    margin-top: 12px;
    border-top: 1px solid #f0f0f0;
  `;

  // Language dropdown
  const langSelect = document.createElement('select');
  langSelect.className = 'translator-lang-selector';
  langSelect.style.cssText = `
    padding: 8px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    background-color: white;
    height: 36px;
    min-width: 200px;
  `;

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '📖 Chọn ngôn ngữ...';
  langSelect.appendChild(defaultOption);

  Object.entries(SUPPORTED_LANGUAGES).forEach(([code, name]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    langSelect.appendChild(option);
  });

  // Set default language to Japanese
  langSelect.value = 'ja';

  // Translate button
  const translateBtn = document.createElement('button');
  translateBtn.type = 'button';
  translateBtn.className = 'translator-editor-btn';
  translateBtn.innerHTML = '🌐 Dịch';
  translateBtn.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.3s ease;
    white-space: nowrap;
    height: 36px;
  `;

  translateBtn.addEventListener('mouseover', () => {
    translateBtn.style.transform = 'translateY(-2px)';
    translateBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
  });

  translateBtn.addEventListener('mouseout', () => {
    translateBtn.style.transform = 'translateY(0)';
    translateBtn.style.boxShadow = 'none';
  });

  translateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const selectedLang = langSelect.value;
    if (!selectedLang) {
      alert('❌ Vui lòng chọn ngôn ngữ');
      return;
    }
    translateEditorContent(selectedLang, translateBtn);
  });

  container.appendChild(langSelect);
  container.appendChild(translateBtn);

  // Insert after input-wrapper
  inputWrapper.parentNode.insertBefore(container, inputWrapper.nextSibling);
}

// Translate editor content
function translateEditorContent(targetLang, button) {
  const editor = document.getElementById('switchStatusAddCommentForm');
  const contentEl = editor.querySelector('[data-testid="textEditor"]');
  
  if (!contentEl) {
    alert('❌ Không tìm thấy editor');
    return;
  }

  // Get text from contenteditable div
  const text = contentEl.innerText?.trim();
  if (!text || text.length < 5) {
    alert('❌ Vui lòng nhập nội dung để dịch');
    return;
  }

  button.disabled = true;
  button.innerHTML = '⏳ Dịch...';

  // Get settings
  chrome.storage.local.get(['provider', 'claudeKey', 'openaiKey', 'openaiModel', 'geminiKey', 'geminiModel', 'includeTicketContext', 'customInstruction'], (data) => {
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
      alert(`❌ Vui lòng cài đặt API key cho ${provider}`);
      button.disabled = false;
      button.innerHTML = '🌐 Dịch';
      return;
    }

    // Collect full issue context only if enabled
    const includeContext = data.includeTicketContext !== false;
    const context = includeContext ? collectIssueContext() : '';
    const langName = SUPPORTED_LANGUAGES[targetLang];
    const contextNote = includeContext ? ' (Use ticket context as reference, but main focus is translating the selected comment)' : '';
    const translationInstruction = `Translate to ${langName}. Only translate, do not add comments or explanations. Preserve formatting.${contextNote}`;

    // Send to background script
    chrome.runtime.sendMessage(
      {
        type: 'TRANSLATE_TEXT',
        text: text,
        provider: provider,
        apiKey: apiKey,
        model: model,
        customInstruction: translationInstruction,
        context: context
      },
      (response) => {
        button.disabled = false;
        button.innerHTML = '🌐 Dịch';

        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          alert(`❌ Lỗi: ${chrome.runtime.lastError.message}`);
          return;
        }

        if (response && response.success) {
          // Display translation as preview using the editor form as container
          displayEditorTranslationPreview(editor, text, response.translation);
        } else if (response && response.error) {
          alert(`❌ Lỗi: ${response.error}`);
        } else {
          alert(`❌ Lỗi: No response from background script`);
        }
      }
    );
  });
}

// Display translation preview for editor content
function displayEditorTranslationPreview(editor, original, translation) {
  // Remove existing preview if any
  const existing = editor.querySelector('.translator-editor-result');
  if (existing) {
    existing.remove();
  }

  // Format translation text to HTML
  const formattedTranslation = formatTranslationText(translation);

  const resultDiv = document.createElement('div');
  resultDiv.className = 'translator-editor-result';
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
      .translator-editor-result h1 {
        font-size: 24px;
        font-weight: bold;
        margin: 16px 0 8px 0;
        border-bottom: 2px solid #4caf50;
        padding-bottom: 4px;
      }
      .translator-editor-result h2 {
        font-size: 20px;
        font-weight: bold;
        margin: 14px 0 8px 0;
        border-bottom: 1px solid #81c784;
        padding-bottom: 4px;
      }
      .translator-editor-result h3 {
        font-size: 18px;
        font-weight: bold;
        margin: 12px 0 6px 0;
      }
      .translator-editor-result h4,
      .translator-editor-result h5,
      .translator-editor-result h6 {
        font-size: 16px;
        font-weight: bold;
        margin: 10px 0 4px 0;
      }
      .translator-editor-result p {
        margin: 8px 0;
        line-height: 1.6;
      }
      .translator-editor-result ul,
      .translator-editor-result ol {
        margin: 8px 0;
        padding-left: 24px;
      }
      .translator-editor-result li {
        margin: 4px 0;
        line-height: 1.6;
      }
      .translator-editor-result a {
        color: #1976d2;
        text-decoration: underline;
      }
      .translator-editor-result a:hover {
        color: #1565c0;
      }
      .translator-editor-result code {
        background: rgba(0,0,0,0.08);
        padding: 2px 6px;
        border-radius: 3px;
        font-family: monospace;
        font-size: 12px;
      }
      .translator-editor-result pre {
        background: rgba(0,0,0,0.08);
        padding: 8px;
        border-radius: 3px;
        overflow-x: auto;
        font-family: monospace;
        font-size: 12px;
      }
      .translator-editor-result blockquote {
        border-left: 4px solid #81c784;
        padding-left: 12px;
        margin-left: 0;
        color: #558b2f;
        font-style: italic;
      }
      .translator-editor-result strong,
      .translator-editor-result b {
        font-weight: bold;
        color: #1b5e20;
      }
      .translator-editor-result em,
      .translator-editor-result i {
        font-style: italic;
      }
      .translator-editor-result table {
        border-collapse: collapse;
        width: 100%;
        margin: 8px 0;
      }
      .translator-editor-result table th,
      .translator-editor-result table td {
        border: 1px solid #81c784;
        padding: 8px;
        text-align: left;
      }
      .translator-editor-result table th {
        background: rgba(76, 175, 80, 0.1);
        font-weight: bold;
      }
    </style>
    <div style="font-weight: 600; margin-bottom: 6px;">📝 Bản dịch:
      <button class="copy-trans-btn-editor" style="
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
  resultDiv.querySelector('.copy-trans-btn-editor').addEventListener('click', () => {
    navigator.clipboard.writeText(translation);
    const btn = resultDiv.querySelector('.copy-trans-btn-editor');
    const originalText = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });

  // Insert preview above input wrapper
  const inputWrapper = editor.querySelector('.comment-editor__input-wrapper');
  if (inputWrapper) {
    inputWrapper.parentNode.insertBefore(resultDiv, inputWrapper);
  } else {
    // Fallback: append to edit area
    const editArea = editor.querySelector('.comment-editor__edit-area');
    if (editArea) {
      editArea.appendChild(resultDiv);
    }
  }
}

// Inject editor translation feature for GitHub
function injectGitHubEditorTranslation() {
  // Find GitHub comment composer textarea
  const textarea = document.querySelector('textarea[placeholder*="comment" i]');
  if (!textarea) return;

  // Find the closest comment composer wrapper
  const composerContainer = textarea.closest('.IssueCommentComposer-module__commentBoxWrapper__W0nBE, [class*="CommentBox"]');
  if (!composerContainer) return;

  // Skip if already injected
  if (composerContainer.querySelector('.translator-github-lang-selector')) {
    return;
  }

  // Find the footer or toolbar area to inject language selector
  const footer = composerContainer.querySelector('.Footer-module__footer__asFN1, [class*="Footer"]');
  const toolbar = composerContainer.querySelector('.Toolbar-module__toolbar__oK14P, [class*="Toolbar"]');
  const insertionPoint = footer || toolbar;

  if (!insertionPoint) return;

  // Create container for language selector and translate button
  const container = document.createElement('div');
  container.className = 'translator-github-editor-container';
  container.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid #e1e4e8;
    background-color: #fafbfc;
    margin-top: 8px;
  `;

  // Language dropdown
  const langSelect = document.createElement('select');
  langSelect.className = 'translator-github-lang-selector';
  langSelect.style.cssText = `
    padding: 8px 10px;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    background-color: white;
    height: 36px;
    min-width: 200px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  `;

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '📖 Choose language...';
  langSelect.appendChild(defaultOption);

  Object.entries(SUPPORTED_LANGUAGES).forEach(([code, name]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    langSelect.appendChild(option);
  });

  // Set default to Japanese
  langSelect.value = 'ja';

  // Translate button
  const translateBtn = document.createElement('button');
  translateBtn.type = 'button';
  translateBtn.className = 'translator-github-editor-btn';
  translateBtn.innerHTML = '🌐 Translate';
  translateBtn.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.3s ease;
    white-space: nowrap;
    height: 36px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  `;

  translateBtn.addEventListener('mouseover', () => {
    translateBtn.style.transform = 'translateY(-2px)';
    translateBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
  });

  translateBtn.addEventListener('mouseout', () => {
    translateBtn.style.transform = 'translateY(0)';
    translateBtn.style.boxShadow = 'none';
  });

  translateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const selectedLang = langSelect.value;
    if (!selectedLang) {
      alert('❌ Please select a language');
      return;
    }
    translateGitHubEditorContent(selectedLang, translateBtn, textarea, composerContainer);
  });

  container.appendChild(langSelect);
  container.appendChild(translateBtn);

  // Insert after toolbar or at the beginning of footer
  if (toolbar) {
    toolbar.parentNode.insertBefore(container, toolbar.nextSibling);
  } else if (footer) {
    footer.parentNode.insertBefore(container, footer);
  }
}

// Translate GitHub editor content
function translateGitHubEditorContent(targetLang, button, textarea, composerContainer) {
  const text = textarea.value?.trim();
  
  if (!text || text.length < 5) {
    alert('❌ Please enter content to translate');
    return;
  }

  button.disabled = true;
  button.innerHTML = '⏳ Translating...';

  // Get settings
  chrome.storage.local.get(['provider', 'claudeKey', 'openaiKey', 'openaiModel', 'geminiKey', 'geminiModel', 'includeTicketContext', 'customInstruction'], (data) => {
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
      alert(`❌ Please set API key for ${provider}`);
      button.disabled = false;
      button.innerHTML = '🌐 Translate';
      return;
    }

    // Collect full issue context only if enabled
    const includeContext = data.includeTicketContext !== false;
    const context = includeContext ? collectIssueContext() : '';
    const langName = SUPPORTED_LANGUAGES[targetLang];
    const contextNote = includeContext ? ' (Use issue context as reference, but main focus is translating the selected comment)' : '';
    const translationInstruction = `Translate to ${langName}. Only translate, do not add comments or explanations. Preserve formatting.${contextNote}`;

    // Send to background script
    chrome.runtime.sendMessage(
      {
        type: 'TRANSLATE_TEXT',
        text: text,
        provider: provider,
        apiKey: apiKey,
        model: model,
        customInstruction: translationInstruction,
        context: context
      },
      (response) => {
        button.disabled = false;
        button.innerHTML = '🌐 Translate';

        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          alert(`❌ Error: ${chrome.runtime.lastError.message}`);
          return;
        }

        if (response && response.success) {
          // Display translation as preview
          displayGitHubEditorTranslationPreview(composerContainer, text, response.translation);
        } else if (response && response.error) {
          alert(`❌ Error: ${response.error}`);
        } else {
          alert(`❌ Error: No response from background script`);
        }
      }
    );
  });
}

// Display translation preview for GitHub editor
function displayGitHubEditorTranslationPreview(composerContainer, original, translation) {
  // Remove existing preview if any
  const existing = composerContainer.querySelector('.translator-github-editor-result');
  if (existing) {
    existing.remove();
  }

  // Format translation text to HTML
  const formattedTranslation = formatTranslationText(translation);

  const resultDiv = document.createElement('div');
  resultDiv.className = 'translator-github-editor-result';
  resultDiv.style.cssText = `
    background-color: #f6f8fa;
    border: 1px solid #e1e4e8;
    border-left: 4px solid #28a745;
    padding: 12px;
    margin: 12px;
    border-radius: 6px;
    font-size: 13px;
    color: #28a745;
  `;

  resultDiv.innerHTML = `
    <style>
      .translator-github-editor-result h1 {
        font-size: 24px;
        font-weight: bold;
        margin: 16px 0 8px 0;
        border-bottom: 2px solid #28a745;
        padding-bottom: 4px;
      }
      .translator-github-editor-result h2 {
        font-size: 20px;
        font-weight: bold;
        margin: 14px 0 8px 0;
        border-bottom: 1px solid #85e89d;
        padding-bottom: 4px;
      }
      .translator-github-editor-result h3 {
        font-size: 18px;
        font-weight: bold;
        margin: 12px 0 6px 0;
      }
      .translator-github-editor-result h4,
      .translator-github-editor-result h5,
      .translator-github-editor-result h6 {
        font-size: 16px;
        font-weight: bold;
        margin: 10px 0 4px 0;
      }
      .translator-github-editor-result p {
        margin: 8px 0;
        line-height: 1.6;
      }
      .translator-github-editor-result ul,
      .translator-github-editor-result ol {
        margin: 8px 0;
        padding-left: 24px;
      }
      .translator-github-editor-result li {
        margin: 4px 0;
        line-height: 1.6;
      }
      .translator-github-editor-result a {
        color: #0366d6;
        text-decoration: underline;
      }
      .translator-github-editor-result a:hover {
        color: #0256c7;
      }
      .translator-github-editor-result code {
        background: #f6f8fa;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: monospace;
        font-size: 12px;
      }
      .translator-github-editor-result pre {
        background: #f6f8fa;
        padding: 8px;
        border-radius: 6px;
        overflow-x: auto;
        font-family: monospace;
        font-size: 12px;
      }
      .translator-github-editor-result blockquote {
        border-left: 4px solid #d0d0d0;
        padding-left: 12px;
        margin-left: 0;
        color: #666;
        font-style: italic;
      }
      .translator-github-editor-result strong,
      .translator-github-editor-result b {
        font-weight: bold;
      }
      .translator-github-editor-result em,
      .translator-github-editor-result i {
        font-style: italic;
      }
      .translator-github-editor-result table {
        border-collapse: collapse;
        width: 100%;
        margin: 8px 0;
      }
      .translator-github-editor-result table th,
      .translator-github-editor-result table td {
        border: 1px solid #e1e4e8;
        padding: 8px;
        text-align: left;
      }
      .translator-github-editor-result table th {
        background: #f6f8fa;
        font-weight: bold;
      }
    </style>
    <div style="font-weight: 600; margin-bottom: 6px; color: #28a745;">📝 Translation:
      <button class="copy-trans-btn-github" style="
        float: right;
        background: white;
        border: 1px solid #28a745;
        color: #28a745;
        padding: 2px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
      ">📋 Copy</button>
    </div>
    <div style="clear: both; margin-top: 6px; color: #24292e;">${formattedTranslation}</div>
  `;

  // Copy button handler
  resultDiv.querySelector('.copy-trans-btn-github').addEventListener('click', () => {
    navigator.clipboard.writeText(translation);
    const btn = resultDiv.querySelector('.copy-trans-btn-github');
    const originalText = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });

  // Insert preview at the beginning of composer container
  const inputWrapper = composerContainer.querySelector('.MarkdownEditor-module__inputWrapper__i5oSw, [class*="inputWrapper"]');
  if (inputWrapper) {
    inputWrapper.parentNode.insertBefore(resultDiv, inputWrapper);
  } else {
    composerContainer.insertBefore(resultDiv, composerContainer.firstChild);
  }
}

// GitHub Review Thread Reply Translation
function injectReviewThreadReplyTranslation() {
  // More specific selector for reply textareas in review threads
  const replyTextareas = document.querySelectorAll('.review-thread-reply .inline-comment-form-box textarea');
  
  replyTextareas.forEach(textarea => {
    // Check if already injected using data attribute
    if (textarea.dataset.translatorInjected === 'true') {
      return;
    }

    const container = textarea.closest('.inline-comment-form-box');
    if (!container) return;

    // Find the form that contains this textarea
    const form = textarea.closest('form');
    if (!form) return;

    // Create language selector and button container
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'translator-review-thread-controls';
    controlsDiv.setAttribute('data-translator-review-controls', 'true');
    controlsDiv.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      padding: 8px;
      background: #f6f8fa;
      border-radius: 6px;
      border: 1px solid #e1e4e8;
    `;

    // Language selector
    const langSelect = document.createElement('select');
    langSelect.className = 'translator-lang-select-review';
    langSelect.style.cssText = `
      padding: 6px 8px;
      border: 1px solid #e1e4e8;
      border-radius: 4px;
      background: white;
      font-size: 12px;
      flex: 1;
      max-width: 200px;
    `;

    // Add language options
    Object.entries(SUPPORTED_LANGUAGES).forEach(([code, name]) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = name;
      langSelect.appendChild(option);
    });

    langSelect.value = 'ja'; // Set default to Japanese

    // Translate button
    const translateBtn = document.createElement('button');
    translateBtn.type = 'button'; // Prevent form submission
    translateBtn.textContent = '🌐 Dịch';
    translateBtn.style.cssText = `
      background: linear-gradient(135deg, #28a745 0%, #239a3b 100%);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: 0.3s;
      white-space: nowrap;
    `;

    translateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      translateReviewThreadReplyContent(textarea, langSelect.value, form, translateBtn);
    });

    controlsDiv.appendChild(langSelect);
    controlsDiv.appendChild(translateBtn);

    // Insert controls before the form (at the top of the reply section)
    form.parentNode.insertBefore(controlsDiv, form);

    // Mark as injected
    textarea.dataset.translatorInjected = 'true';
  });
}

function translateReviewThreadReplyContent(textarea, language, form, button) {
  const text = textarea.value.trim();
  if (!text) {
    alert('Vui lòng nhập nội dung cần dịch');
    return;
  }

  // Show loading state
  button.disabled = true;
  button.textContent = '⏳ Đang dịch...';

  // Get provider and API key
  chrome.storage.local.get(['provider', 'claudeKey', 'openaiKey', 'geminiKey', 'openaiModel', 'geminiModel', 'includeTicketContext', 'customInstruction'], (data) => {
    const provider = data.provider || 'claude';
    const apiKey = data[provider + 'Key'];
    let model = '';

    if (!apiKey) {
      button.disabled = false;
      button.textContent = '🌐 Dịch';
      alert('Please set up your API key in the extension settings');
      return;
    }

    switch(provider) {
      case 'openai':
        model = data.openaiModel || 'gpt-4-turbo';
        break;
      case 'gemini':
        model = data.geminiModel || 'gemini-2.5-flash';
        break;
    }

    // Collect issue context only if enabled
    const includeContext = data.includeTicketContext !== false;
    const context = includeContext ? collectIssueContext() : '';
    const langName = SUPPORTED_LANGUAGES[language];
    const contextNote = includeContext ? ' (Use issue context as reference, but main focus is translating the selected comment)' : '';
    const translationInstruction = `Translate to ${langName}. Only translate, do not add comments or explanations. Preserve formatting.${contextNote}`;

    // Send translation request using correct message format
    chrome.runtime.sendMessage({
      type: 'TRANSLATE_TEXT',
      text: text,
      provider: provider,
      apiKey: apiKey,
      model: model,
      customInstruction: translationInstruction,
      context: context
    }, (response) => {
      button.disabled = false;
      button.textContent = '🌐 Dịch';

      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
        alert(`Translation error: ${chrome.runtime.lastError.message}`);
        return;
      }

      if (response && response.success) {
        displayReviewThreadReplyTranslationPreview(response.translation, form);
      } else if (response && response.error) {
        alert('Translation error: ' + response.error);
      } else {
        alert('Translation error: No response from background script');
      }
    });
  });
}

function displayReviewThreadReplyTranslationPreview(translation, form) {
  // Remove existing preview if any
  const existingPreview = form.parentNode.querySelector('[data-translator-review-preview="true"]');
  if (existingPreview) {
    existingPreview.remove();
  }

  const formattedTranslation = formatTranslationText(translation);

  const resultDiv = document.createElement('div');
  resultDiv.setAttribute('data-translator-review-preview', 'true');
  resultDiv.style.cssText = `
    margin-bottom: 8px;
    padding: 12px;
    background: #f6f8fa;
    border: 2px solid #28a745;
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 13px;
    color: #28a745;
  `;

  resultDiv.innerHTML = `
    <style>
      .translator-review-reply-result h1 {
        font-size: 24px;
        font-weight: bold;
        margin: 16px 0 8px 0;
        border-bottom: 2px solid #28a745;
        padding-bottom: 4px;
      }
      .translator-review-reply-result h2 {
        font-size: 20px;
        font-weight: bold;
        margin: 14px 0 8px 0;
        border-bottom: 1px solid #85e89d;
        padding-bottom: 4px;
      }
      .translator-review-reply-result h3 {
        font-size: 18px;
        font-weight: bold;
        margin: 12px 0 6px 0;
      }
      .translator-review-reply-result h4,
      .translator-review-reply-result h5,
      .translator-review-reply-result h6 {
        font-size: 16px;
        font-weight: bold;
        margin: 10px 0 4px 0;
      }
      .translator-review-reply-result p {
        margin: 8px 0;
        line-height: 1.6;
      }
      .translator-review-reply-result ul,
      .translator-review-reply-result ol {
        margin: 8px 0;
        padding-left: 24px;
      }
      .translator-review-reply-result li {
        margin: 4px 0;
        line-height: 1.6;
      }
      .translator-review-reply-result a {
        color: #0366d6;
        text-decoration: underline;
      }
      .translator-review-reply-result a:hover {
        color: #0256c7;
      }
      .translator-review-reply-result code {
        background: #f6f8fa;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: monospace;
        font-size: 12px;
      }
      .translator-review-reply-result pre {
        background: #f6f8fa;
        padding: 8px;
        border-radius: 6px;
        overflow-x: auto;
        font-family: monospace;
        font-size: 12px;
      }
      .translator-review-reply-result blockquote {
        border-left: 4px solid #d0d0d0;
        padding-left: 12px;
        margin-left: 0;
        color: #666;
        font-style: italic;
      }
      .translator-review-reply-result strong,
      .translator-review-reply-result b {
        font-weight: bold;
      }
      .translator-review-reply-result em,
      .translator-review-reply-result i {
        font-style: italic;
      }
      .translator-review-reply-result table {
        border-collapse: collapse;
        width: 100%;
        margin: 8px 0;
      }
      .translator-review-reply-result table th,
      .translator-review-reply-result table td {
        border: 1px solid #e1e4e8;
        padding: 8px;
        text-align: left;
      }
      .translator-review-reply-result table th {
        background: #f6f8fa;
        font-weight: bold;
      }
    </style>
    <div style="font-weight: 600; margin-bottom: 6px; color: #28a745;">📝 Translation:
      <button class="copy-trans-btn-review" style="
        float: right;
        background: white;
        border: 1px solid #28a745;
        color: #28a745;
        padding: 2px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
      ">📋 Copy</button>
    </div>
    <div class="translator-review-reply-result" style="clear: both; margin-top: 6px; color: #24292e;">${formattedTranslation}</div>
  `;

  // Copy button handler
  resultDiv.querySelector('.copy-trans-btn-review').addEventListener('click', () => {
    navigator.clipboard.writeText(translation);
    const btn = resultDiv.querySelector('.copy-trans-btn-review');
    const originalText = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  });

  // Insert preview before the form (above the reply area)
  form.parentNode.insertBefore(resultDiv, form);
}

// Jira Comment Editor Translation
function injectJiraCommentEditorTranslation() {
  // Find all Jira editor containers in comment threads
  const editorContainers = document.querySelectorAll('[data-testid="issue.component.editor.default-editor"], .akEditor');
  
  editorContainers.forEach(container => {
    // Check if already injected
    if (container.querySelector('[data-translator-jira-controls="true"]')) {
      return;
    }

    // Find the ProseMirror editor area
    const editor = container.querySelector('.ProseMirror');
    if (!editor) return;

    // Find the toolbar
    const toolbar = container.querySelector('[data-testid="ak-editor-main-toolbar"], .ak-editor-main-toolbar');
    if (!toolbar) return;

    // Create controls container
    const controlsDiv = document.createElement('div');
    controlsDiv.setAttribute('data-translator-jira-controls', 'true');
    controlsDiv.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 8px 12px;
      background: #f5f5f5;
      border-top: 1px solid #ddd;
      border-bottom: 1px solid #ddd;
      margin-top: 8px;
    `;

    // Language selector
    const langSelect = document.createElement('select');
    langSelect.className = 'translator-jira-lang-select';
    langSelect.style.cssText = `
      padding: 6px 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: white;
      font-size: 12px;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    `;

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '📖 Choose language...';
    langSelect.appendChild(defaultOption);

    Object.entries(SUPPORTED_LANGUAGES).forEach(([code, name]) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = name;
      langSelect.appendChild(option);
    });

    langSelect.value = 'en'; // Default to English

    // Translate button
    const translateBtn = document.createElement('button');
    translateBtn.type = 'button';
    translateBtn.textContent = '🌐 Dịch';
    translateBtn.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.3s ease;
      white-space: nowrap;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    `;

    translateBtn.addEventListener('mouseover', () => {
      translateBtn.style.transform = 'translateY(-2px)';
      translateBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
    });

    translateBtn.addEventListener('mouseout', () => {
      translateBtn.style.transform = 'translateY(0)';
      translateBtn.style.boxShadow = 'none';
    });

    translateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!langSelect.value) {
        alert('❌ Please select a language');
        return;
      }
      translateJiraCommentContent(editor, langSelect.value, container, translateBtn);
    });

    controlsDiv.appendChild(langSelect);
    controlsDiv.appendChild(translateBtn);

    // Insert controls after toolbar
    toolbar.parentNode.insertBefore(controlsDiv, toolbar.nextSibling);

    // Mark as injected
    editor.setAttribute('data-translator-jira-injected', 'true');
  });
}

function translateJiraCommentContent(editor, language, container, button) {
  // Get text from ProseMirror editor
  const text = editor.innerText?.trim();
  if (!text) {
    alert('❌ Vui lòng nhập nội dung cần dịch');
    return;
  }

  // Show loading state
  button.disabled = true;
  button.textContent = '⏳ Đang dịch...';

  // Get provider and API key
  chrome.storage.local.get(['provider', 'claudeKey', 'openaiKey', 'geminiKey', 'openaiModel', 'geminiModel', 'includeTicketContext', 'customInstruction'], (data) => {
    const provider = data.provider || 'claude';
    const apiKey = data[provider + 'Key'];
    let model = '';

    if (!apiKey) {
      button.disabled = false;
      button.textContent = '🌐 Dịch';
      alert('❌ Please set up your API key in the extension settings');
      return;
    }

    switch(provider) {
      case 'openai':
        model = data.openaiModel || 'gpt-4-turbo';
        break;
      case 'gemini':
        model = data.geminiModel || 'gemini-2.5-flash';
        break;
    }

    // Collect issue context only if enabled
    const includeContext = data.includeTicketContext !== false;
    const context = includeContext ? collectIssueContext() : '';
    const langName = SUPPORTED_LANGUAGES[language];
    const contextNote = includeContext ? ' (Use issue context as reference, but main focus is translating the selected comment)' : '';
    const translationInstruction = `Translate to ${langName}. Only translate, do not add comments or explanations. Preserve formatting.${contextNote}`;

    // Send translation request
    chrome.runtime.sendMessage({
      type: 'TRANSLATE_TEXT',
      text: text,
      provider: provider,
      apiKey: apiKey,
      model: model,
      customInstruction: translationInstruction,
      context: context
    }, (response) => {
      button.disabled = false;
      button.textContent = '🌐 Dịch';

      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
        alert(`❌ Translation error: ${chrome.runtime.lastError.message}`);
        return;
      }

      if (response && response.success) {
        displayJiraCommentTranslationPreview(response.translation, container);
      } else if (response && response.error) {
        alert('❌ Translation error: ' + response.error);
      } else {
        alert('❌ Translation error: No response from background script');
      }
    });
  });
}

function displayJiraCommentTranslationPreview(translation, container) {
  // Remove existing preview
  const existingPreview = container.querySelector('[data-translator-jira-preview="true"]');
  if (existingPreview) {
    existingPreview.remove();
  }

  const formattedTranslation = formatTranslationText(translation);

  const resultDiv = document.createElement('div');
  resultDiv.setAttribute('data-translator-jira-preview', 'true');
  resultDiv.style.cssText = `
    background: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 12px;
    margin: 8px 0;
    font-size: 13px;
    line-height: 1.6;
  `;

  resultDiv.innerHTML = `
    <style>
      .translator-jira-result h1 {
        font-size: 20px;
        font-weight: bold;
        margin: 12px 0 8px 0;
        border-bottom: 2px solid #667eea;
        padding-bottom: 4px;
      }
      .translator-jira-result h2 {
        font-size: 18px;
        font-weight: bold;
        margin: 10px 0 6px 0;
        border-bottom: 1px solid #9ca3ff;
        padding-bottom: 4px;
      }
      .translator-jira-result h3 {
        font-size: 16px;
        font-weight: bold;
        margin: 8px 0 4px 0;
      }
      .translator-jira-result p {
        margin: 6px 0;
        line-height: 1.6;
      }
      .translator-jira-result ul, .translator-jira-result ol {
        margin: 6px 0;
        padding-left: 24px;
      }
      .translator-jira-result li {
        margin: 3px 0;
      }
      .translator-jira-result code {
        background: #f0f0f0;
        padding: 2px 5px;
        border-radius: 3px;
        font-family: monospace;
        font-size: 12px;
      }
      .translator-jira-result blockquote {
        border-left: 3px solid #667eea;
        padding-left: 10px;
        margin-left: 0;
        color: #555;
        font-style: italic;
      }
      .translator-jira-result strong {
        font-weight: bold;
      }
    </style>
    <div style="font-weight: 600; margin-bottom: 6px; color: #667eea;">
      📝 Bản dịch:
      <button class="copy-trans-btn-jira" style="
        float: right;
        background: white;
        border: 1px solid #667eea;
        color: #667eea;
        padding: 2px 8px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
      ">📋 Copy</button>
    </div>
    <div class="translator-jira-result" style="clear: both; margin-top: 6px;">${formattedTranslation}</div>
  `;

  // Copy button handler
  const copyBtn = resultDiv.querySelector('.copy-trans-btn-jira');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(translation);
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✅ Copied!';
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
  });

  // Insert preview above the editor
  const editorContentArea = container.querySelector('.ak-editor-content-area');
  if (editorContentArea) {
    editorContentArea.parentNode.insertBefore(resultDiv, editorContentArea);
  } else {
    container.insertBefore(resultDiv, container.firstChild);
  }
}

// Run on page load
injectTranslateButtons();
injectEditorTranslation();
injectGitHubEditorTranslation();
injectReviewThreadReplyTranslation();
injectJiraCommentEditorTranslation();

// Re-run when DOM changes (for infinite scroll, lazy loading, dynamic content)
// Debounce to prevent excessive calls
let observerTimeout;
const observer = new MutationObserver(() => {
  clearTimeout(observerTimeout);
  observerTimeout = setTimeout(() => {
    injectTranslateButtons();
    injectEditorTranslation();
    injectGitHubEditorTranslation();
    injectReviewThreadReplyTranslation();
    injectJiraCommentEditorTranslation();
  }, 500); // Wait 500ms after DOM changes stop before running
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('✅ Content script loaded - Translate buttons injected on comments & ticket description (Backlog, GitHub, Jira, etc)');
