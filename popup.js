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

// ===========================
// Channel Settings Management
// ===========================

// Platforms that require domain
const platformsWithDomain = ['backlog', 'jira'];

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    if (tabName === 'channels') {
      loadChannelSettings();
    }
  });
});

// Load channel settings from storage
function loadChannelSettings() {
  chrome.storage.local.get('channelSettings', (data) => {
    const channels = data.channelSettings || [];
    renderChannelList(channels);
  });
}

// Render channel list
function renderChannelList(channels) {
  const list = document.getElementById('channelList');
  
  if (channels.length === 0) {
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: #999; font-size: 13px;">📭 Chưa có channel nào. Hãy thêm mới!</div>';
    return;
  }
  
  list.innerHTML = channels.map(ch => `
    <div class="channel-item">
      <div class="channel-info">
        <div class="channel-name">🔷 ${ch.name || `${ch.platform}${ch.domain ? ' - ' + ch.domain : ' (Global)'}`}</div>
        <div class="channel-meta">
          Platform: <strong>${ch.platform}</strong> 
          ${ch.domain ? `| Domain: <strong>${ch.domain}</strong>` : ''}
          | Provider: <strong>${ch.provider || 'Global'}</strong>
        </div>
      </div>
      <div class="channel-actions">
        <button onclick="editChannel('${ch.id}')">✏️ Edit</button>
        <button class="danger" onclick="deleteChannel('${ch.id}')">🗑️ Delete</button>
      </div>
    </div>
  `).join('');
}

// Delete channel
function deleteChannel(id) {
  if (!confirm('Xoá channel này?')) return;
  
  chrome.storage.local.get('channelSettings', (data) => {
    const channels = (data.channelSettings || []).filter(ch => ch.id !== id);
    chrome.storage.local.set({ channelSettings: channels }, () => {
      loadChannelSettings();
      showStatus('✅ Channel đã xoá', 'success');
    });
  });
}

// Edit channel (TODO: implement later)
function editChannel(id) {
  alert('Edit feature coming soon!');
}

// Handle platform change to show/hide domain field
document.getElementById('channelPlatform').addEventListener('change', function() {
  const domainGroup = document.getElementById('channelDomainGroup');
  const hasDomain = platformsWithDomain.includes(this.value);
  domainGroup.style.display = hasDomain ? 'block' : 'none';
  if (!hasDomain) {
    document.getElementById('channelDomain').value = '';
  }
});

// Add channel
document.getElementById('addChannelBtn').addEventListener('click', () => {
  const platform = document.getElementById('channelPlatform').value;
  const domain = document.getElementById('channelDomain').value.trim();
  const name = document.getElementById('channelName').value.trim();
  const provider = document.getElementById('channelProvider').value;
  const model = document.getElementById('channelModel').value.trim();
  const instruction = document.getElementById('channelInstruction').value.trim();
  
  // Validation
  if (!platform) {
    showStatus('❌ Vui lòng chọn platform', 'error');
    return;
  }
  
  if (platformsWithDomain.includes(platform) && !domain) {
    showStatus('❌ Vui lòng nhập domain', 'error');
    return;
  }
  
  // Check if channel already exists
  chrome.storage.local.get('channelSettings', (data) => {
    const channels = data.channelSettings || [];
    const exists = channels.some(ch => 
      ch.platform === platform && ch.domain === (domain || null)
    );
    
    if (exists) {
      showStatus('❌ Channel này đã tồn tại', 'error');
      return;
    }
    
    // Create new channel
    const newChannel = {
      id: `${platform}-${domain || 'global'}-${Date.now()}`,
      platform,
      domain: domain || null,
      name: name || `${platform}${domain ? ' - ' + domain : ' (Global)'}`,
      provider: provider || null,
      model: model || null,
      customInstruction: instruction || null,
      enabled: true,
      createdAt: Date.now()
    };
    
    channels.push(newChannel);
    chrome.storage.local.set({ channelSettings: channels }, () => {
      // Clear form
      document.getElementById('channelPlatform').value = '';
      document.getElementById('channelDomain').value = '';
      document.getElementById('channelName').value = '';
      document.getElementById('channelProvider').value = '';
      document.getElementById('channelModel').value = '';
      document.getElementById('channelInstruction').value = '';
      document.getElementById('channelDomainGroup').style.display = 'none';
      
      loadChannelSettings();
      showStatus('✅ Channel đã thêm', 'success');
    });
  });
});

console.log('✅ Popup script loaded - Settings and Channel management');
