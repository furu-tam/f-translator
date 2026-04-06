/**
 * Popup script - Settings only
 * Translate buttons are injected directly on the page by content.js
 */

const saveSettingsBtn = document.getElementById('saveSettings');
const status = document.getElementById('status');
const provider = document.getElementById('provider');
const claudeKey = document.getElementById('claudeKey');
const openaiKey = document.getElementById('openaiKey');
const openaiModel = document.getElementById('openaiModel');
const geminiKey = document.getElementById('geminiKey');
const geminiModel = document.getElementById('geminiModel');
const includeTicketContext = document.getElementById('includeTicketContext');
const customInstruction = document.getElementById('customInstruction');

let currentProvider = 'claude';

// Load saved settings from storage
chrome.storage.local.get(['provider', 'claudeKey', 'openaiKey', 'openaiModel', 'geminiKey', 'geminiModel', 'includeTicketContext', 'customInstruction'], (data) => {
  currentProvider = data.provider || 'claude';
  if (data.claudeKey) claudeKey.value = data.claudeKey;
  if (data.openaiKey) openaiKey.value = data.openaiKey;
  if (data.openaiModel) openaiModel.value = data.openaiModel;
  if (data.geminiKey) geminiKey.value = data.geminiKey;
  if (data.geminiModel) geminiModel.value = data.geminiModel;
  if (data.customInstruction) customInstruction.value = data.customInstruction;
  
  // Load context setting (default true)
  includeTicketContext.checked = data.includeTicketContext !== false;
  
  provider.value = currentProvider;
  updateProviderUI();
});

// Handle provider selection
provider.addEventListener('change', () => {
  currentProvider = provider.value;
  updateProviderUI();
});

// Update UI based on selected provider
function updateProviderUI() {
  document.getElementById('claudeKeyGroup').style.display = currentProvider === 'claude' ? 'block' : 'none';
  document.getElementById('openaiKeyGroup').style.display = currentProvider === 'openai' ? 'block' : 'none';
  document.getElementById('openaiModelGroup').style.display = currentProvider === 'openai' ? 'block' : 'none';
  document.getElementById('geminiKeyGroup').style.display = currentProvider === 'gemini' ? 'block' : 'none';
  document.getElementById('geminiModelGroup').style.display = currentProvider === 'gemini' ? 'block' : 'none';
}

// Save API keys and settings
saveSettingsBtn.addEventListener('click', () => {
  const apiKey = getSelectedApiKey();
  if (!apiKey) {
    showStatus(`❌ Vui lòng nhập API key cho ${getProviderName()}`, 'error');
    return;
  }
  
  const settings = {
    provider: currentProvider,
    claudeKey: claudeKey.value,
    openaiKey: openaiKey.value,
    openaiModel: openaiModel.value,
    geminiKey: geminiKey.value,
    geminiModel: geminiModel.value,
    includeTicketContext: includeTicketContext.checked,
    customInstruction: customInstruction.value || ''
  };
  
  chrome.storage.local.set(settings, () => {
    showStatus('✅ Cài đặt đã lưu', 'success');
  });
});

// Get selected API key based on provider
function getSelectedApiKey() {
  switch(currentProvider) {
    case 'openai': return openaiKey.value.trim();
    case 'gemini': return geminiKey.value.trim();
    default: return claudeKey.value.trim();
  }
}

// Get provider display name
function getProviderName() {
  switch(currentProvider) {
    case 'openai': return 'OpenAI';
    case 'gemini': return 'Gemini';
    default: return 'Claude';
  }
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';

  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 4000);
  }
}

console.log('✅ Popup script loaded - Settings only mode');
