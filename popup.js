const statusEl = document.getElementById('status');
const platformOrder = ['backlog', 'github', 'jira', 'excel'];
const platformLabels = {
  backlog: 'Backlog',
  github: 'Git',
  jira: 'Jira',
  excel: 'Excel'
};
const platformsWithDomain = ['backlog', 'jira'];
const providerModels = {
  claude: {
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet (Recommended)',
    'claude-3-opus-20240229': 'Claude 3 Opus (High Quality)',
    'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
    'claude-3-haiku-20240307': 'Claude 3 Haiku (Fast)'
  },
  openai: {
    'gpt-4-turbo': 'GPT-4 Turbo (Fast & Smart)',
    'gpt-4': 'GPT-4 (High Quality)',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo (Budget)'
  },
  gemini: {
    'gemini-2.5-flash': 'Gemini 2.5 Flash (Recommended)',
    'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite (Fast, Light)',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-1.5-pro': 'Gemini 1.5 Pro (High Quality)',
    'gemini-1.5-flash': 'Gemini 1.5 Flash',
    'gemini-3-flash': 'Gemini 3 Flash'
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  setupTabHandlers();
  setupFormHandlers();
  await ensureStorageDefaults();
  loadGlobalSettings();
  loadChannelSettings();
});

window.deleteChannel = deleteChannel;
window.toggleChannelEnabled = toggleChannelEnabled;

function getDefaultEnabledPlatforms() {
  return {
    backlog: true,
    github: true,
    jira: true,
    excel: true
  };
}

function getDefaultGlobalSettings() {
  return {
    provider: 'claude',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: '',
    customInstruction: '',
    enabledPlatforms: getDefaultEnabledPlatforms()
  };
}

function buildGlobalSettingsFromLegacy(data = {}) {
  const provider = data.provider || 'claude';
  let apiKey = '';
  let model = getDefaultModelForProvider(provider);

  switch (provider) {
    case 'openai':
      apiKey = data.openaiKey || '';
      model = data.openaiModel || getDefaultModelForProvider('openai');
      break;
    case 'gemini':
      apiKey = data.geminiKey || '';
      model = data.geminiModel || getDefaultModelForProvider('gemini');
      break;
    default:
      apiKey = data.claudeKey || '';
      model = getDefaultModelForProvider('claude');
      break;
  }

  return {
    provider,
    model,
    apiKey,
    customInstruction: data.customInstruction || '',
    enabledPlatforms: {
      ...getDefaultEnabledPlatforms(),
      ...(data.globalPlatformSettings || {})
    }
  };
}

function normalizeGlobalSettings(settings = {}) {
  const normalized = {
    ...getDefaultGlobalSettings(),
    ...settings
  };

  normalized.enabledPlatforms = {
    ...getDefaultEnabledPlatforms(),
    ...(settings.enabledPlatforms || {})
  };

  if (!normalized.model || !providerModels[normalized.provider]?.[normalized.model]) {
    normalized.model = getDefaultModelForProvider(normalized.provider);
  }

  return normalized;
}

function getDefaultModelForProvider(provider) {
  switch (provider) {
    case 'openai':
      return 'gpt-4-turbo';
    case 'gemini':
      return 'gemini-2.5-flash';
    default:
      return 'claude-3-5-sonnet-20241022';
  }
}

async function ensureStorageDefaults() {
  const data = await chrome.storage.local.get([
    'globalSettings',
    'channelSettings',
    'provider',
    'claudeKey',
    'openaiKey',
    'geminiKey',
    'openaiModel',
    'geminiModel',
    'customInstruction',
    'globalPlatformSettings'
  ]);
  const updates = {};

  if (!data.globalSettings) {
    updates.globalSettings = buildGlobalSettingsFromLegacy(data);
  } else {
    const normalizedGlobal = normalizeGlobalSettings(data.globalSettings);
    if (JSON.stringify(normalizedGlobal) !== JSON.stringify(data.globalSettings)) {
      updates.globalSettings = normalizedGlobal;
    }
  }

  if (!Array.isArray(data.channelSettings)) {
    updates.channelSettings = [];
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
}

function setupTabHandlers() {
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;

      document.querySelectorAll('.tab-btn').forEach((item) => item.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((item) => item.classList.remove('active'));

      button.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
}

function setupFormHandlers() {
  document.getElementById('globalProvider').addEventListener('change', (event) => {
    updateProviderModelGroups('global', event.target.value);
  });

  document.getElementById('channelProvider').addEventListener('change', (event) => {
    updateProviderModelGroups('channel', event.target.value);
  });

  document.getElementById('channelPlatform').addEventListener('change', (event) => {
    toggleChannelDomainField(event.target.value);
  });

  document.getElementById('saveGlobalBtn').addEventListener('click', saveGlobalSettings);
  document.getElementById('addChannelBtn').addEventListener('click', addChannel);
}

function updateProviderModelGroups(scope, provider) {
  const groupIds = {
    claude: `${scope}ClaudeModelGroup`,
    openai: `${scope}OpenaiModelGroup`,
    gemini: `${scope}GeminiModelGroup`
  };

  Object.values(groupIds).forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.style.display = 'none';
    }
  });

  const activeGroupId = groupIds[provider];
  if (activeGroupId) {
    document.getElementById(activeGroupId).style.display = 'block';
  }

  const modelSelect = document.getElementById(`${scope}${capitalize(provider)}Model`);
  if (modelSelect && !providerModels[provider]?.[modelSelect.value]) {
    modelSelect.value = getDefaultModelForProvider(provider);
  }
}

function getSelectedModel(scope, provider) {
  switch (provider) {
    case 'openai':
      return document.getElementById(`${scope}OpenaiModel`).value;
    case 'gemini':
      return document.getElementById(`${scope}GeminiModel`).value;
    default:
      return document.getElementById(`${scope}ClaudeModel`).value;
  }
}

function renderGlobalPlatformOptions(enabledPlatforms) {
  const container = document.getElementById('globalPlatformOptions');
  container.innerHTML = platformOrder.map((platform) => `
    <label class="inline-checkbox">
      <input
        type="checkbox"
        data-platform="${platform}"
        ${enabledPlatforms[platform] ? 'checked' : ''}
      >
      <span>${platformLabels[platform]}</span>
    </label>
  `).join('');
}

function loadGlobalSettings() {
  chrome.storage.local.get(['globalSettings'], (data) => {
    const globalSettings = normalizeGlobalSettings(data.globalSettings);

    document.getElementById('globalProvider').value = globalSettings.provider;
    document.getElementById('globalApiKey').value = globalSettings.apiKey || '';
    document.getElementById('globalInstruction').value = globalSettings.customInstruction || '';

    document.getElementById('globalClaudeModel').value =
      globalSettings.provider === 'claude' && providerModels.claude[globalSettings.model]
        ? globalSettings.model
        : getDefaultModelForProvider('claude');
    document.getElementById('globalOpenaiModel').value =
      globalSettings.provider === 'openai' && providerModels.openai[globalSettings.model]
        ? globalSettings.model
        : getDefaultModelForProvider('openai');
    document.getElementById('globalGeminiModel').value =
      globalSettings.provider === 'gemini' && providerModels.gemini[globalSettings.model]
        ? globalSettings.model
        : getDefaultModelForProvider('gemini');

    renderGlobalPlatformOptions(globalSettings.enabledPlatforms);
    updateProviderModelGroups('global', globalSettings.provider);
  });
}

function saveGlobalSettings() {
  const provider = document.getElementById('globalProvider').value;
  const model = getSelectedModel('global', provider);
  const apiKey = document.getElementById('globalApiKey').value.trim();
  const customInstruction = document.getElementById('globalInstruction').value.trim();
  const enabledPlatforms = getEnabledPlatformsFromUi();

  if (!providerModels[provider]?.[model]) {
    showStatus('❌ Model global không hợp lệ', 'error');
    return;
  }

  const globalSettings = {
    provider,
    model,
    apiKey,
    customInstruction,
    enabledPlatforms
  };

  chrome.storage.local.set({ globalSettings }, () => {
    showStatus('✅ Đã lưu Global Settings', 'success');
  });
}

function getEnabledPlatformsFromUi() {
  return platformOrder.reduce((result, platform) => {
    result[platform] = Boolean(
      document.querySelector(`#globalPlatformOptions input[data-platform="${platform}"]`)?.checked
    );
    return result;
  }, {});
}

function toggleChannelDomainField(platform) {
  const needsDomain = platformsWithDomain.includes(platform);
  document.getElementById('channelDomainGroup').style.display = needsDomain ? 'block' : 'none';

  if (!needsDomain) {
    document.getElementById('channelDomain').value = '';
  }
}

function loadChannelSettings() {
  chrome.storage.local.get(['channelSettings'], (data) => {
    const channels = Array.isArray(data.channelSettings) ? data.channelSettings : [];
    renderChannelList(sortChannels(channels));
  });
}

function sortChannels(channels) {
  return [...channels].sort((a, b) => {
    const platformDiff = platformOrder.indexOf(a.platform) - platformOrder.indexOf(b.platform);
    if (platformDiff !== 0) {
      return platformDiff;
    }

    const domainA = (a.domain || '').toLowerCase();
    const domainB = (b.domain || '').toLowerCase();
    if (domainA !== domainB) {
      return domainA.localeCompare(domainB);
    }

    return (a.name || '').localeCompare(b.name || '');
  });
}

function renderChannelList(channels) {
  const list = document.getElementById('channelList');

  if (channels.length === 0) {
    list.innerHTML = '<div style="padding: 20px; text-align: center; color: #999; font-size: 13px;">📭 Chưa có channel nào. Khi không có channel phù hợp, extension sẽ dùng Global Settings.</div>';
    return;
  }

  list.innerHTML = channels.map((channel) => `
    <div class="channel-item">
      <div class="channel-info">
        <div class="channel-name">
          <span>🔷 ${escapeHtml(channel.name || buildDefaultChannelName(channel.platform, channel.domain))}</span>
          <span class="badge ${channel.enabled ? 'on' : 'off'}">${channel.enabled ? 'ON' : 'OFF'}</span>
        </div>
        <div class="channel-meta">
          Platform: <strong>${escapeHtml(platformLabels[channel.platform] || channel.platform)}</strong>
          ${channel.domain ? `| Domain: <strong>${escapeHtml(channel.domain)}</strong>` : ''}
          | Provider: <strong>${escapeHtml(channel.provider || '-')}</strong>
          | Model: <strong>${escapeHtml(channel.model || '-')}</strong>
        </div>
      </div>
      <div class="channel-actions">
        <button class="btn-secondary" onclick="toggleChannelEnabled('${escapeHtml(channel.id)}')">
          ${channel.enabled ? 'Turn Off' : 'Turn On'}
        </button>
        <button class="btn-danger" onclick="deleteChannel('${escapeHtml(channel.id)}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function buildDefaultChannelName(platform, domain) {
  return domain ? `${platformLabels[platform] || platform} - ${domain}` : `${platformLabels[platform] || platform}`;
}

function addChannel() {
  const platform = document.getElementById('channelPlatform').value;
  const domain = document.getElementById('channelDomain').value.trim();
  const name = document.getElementById('channelName').value.trim();
  const provider = document.getElementById('channelProvider').value;
  const apiKey = document.getElementById('channelApiKey').value.trim();
  const customInstruction = document.getElementById('channelInstruction').value.trim();
  const enabled = document.getElementById('channelEnabled').checked;

  if (!platform) {
    showStatus('❌ Vui lòng chọn platform', 'error');
    return;
  }

  if (platformsWithDomain.includes(platform) && !domain) {
    showStatus('❌ Vui lòng nhập domain', 'error');
    return;
  }

  if (!provider) {
    showStatus('❌ Vui lòng chọn provider cho channel', 'error');
    return;
  }

  const model = getSelectedModel('channel', provider);
  if (!providerModels[provider]?.[model]) {
    showStatus('❌ Model channel không hợp lệ', 'error');
    return;
  }

  if (!apiKey) {
    showStatus('❌ Vui lòng nhập API key cho channel', 'error');
    return;
  }

  chrome.storage.local.get(['channelSettings'], (data) => {
    const channels = Array.isArray(data.channelSettings) ? data.channelSettings : [];
    const normalizedDomain = domain || null;
    const exists = channels.some((channel) =>
      channel.platform === platform && (channel.domain || null) === normalizedDomain
    );

    if (exists) {
      showStatus('❌ Channel này đã tồn tại', 'error');
      return;
    }

    channels.push({
      id: `${platform}-${normalizedDomain || 'global'}-${Date.now()}`,
      platform,
      domain: normalizedDomain,
      name: name || buildDefaultChannelName(platform, normalizedDomain),
      provider,
      model,
      apiKey,
      customInstruction,
      enabled,
      createdAt: Date.now()
    });

    chrome.storage.local.set({ channelSettings: channels }, () => {
      clearChannelForm();
      loadChannelSettings();
      showStatus('✅ Đã thêm channel mới', 'success');
    });
  });
}

function clearChannelForm() {
  document.getElementById('channelPlatform').value = '';
  document.getElementById('channelDomain').value = '';
  document.getElementById('channelName').value = '';
  document.getElementById('channelProvider').value = '';
  document.getElementById('channelApiKey').value = '';
  document.getElementById('channelInstruction').value = '';
  document.getElementById('channelEnabled').checked = true;
  toggleChannelDomainField('');
  updateProviderModelGroups('channel', '');
}

function toggleChannelEnabled(id) {
  chrome.storage.local.get(['channelSettings'], (data) => {
    const channels = (data.channelSettings || []).map((channel) => {
      if (channel.id !== id) {
        return channel;
      }

      return {
        ...channel,
        enabled: !channel.enabled
      };
    });

    chrome.storage.local.set({ channelSettings: channels }, () => {
      loadChannelSettings();
      showStatus('✅ Đã cập nhật trạng thái channel', 'success');
    });
  });
}

function deleteChannel(id) {
  if (!confirm('Xoá channel này?')) {
    return;
  }

  chrome.storage.local.get(['channelSettings'], (data) => {
    const channels = (data.channelSettings || []).filter((channel) => channel.id !== id);
    chrome.storage.local.set({ channelSettings: channels }, () => {
      loadChannelSettings();
      showStatus('✅ Đã xoá channel', 'success');
    });
  });
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';

  window.clearTimeout(showStatus.timeoutId);
  showStatus.timeoutId = window.setTimeout(() => {
    statusEl.style.display = 'none';
  }, 4000);
}

function capitalize(value = '') {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

console.log('✅ Popup script loaded - Global and channel settings ready');
