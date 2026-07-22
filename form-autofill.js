/**
 * Form Auto-fill
 * - Lưu cấu hình theo full URL path (origin + pathname)
 * - Lần sau vào form → auto fill từ config đã lưu
 * - Form mới → gợi ý bằng Gemini; thiếu giá trị thì fallback sample text
 */

(() => {
  const STORAGE_KEYS = {
    enabled: 'formAutofillEnabled',
    configs: 'formAutofillConfigs',
    profile: 'formAutofillProfile',
    dismissed: 'formAutofillDismissedDomains'
  };

  const PANEL_ID = 'translator-form-autofill-panel';
  const TOAST_ID = 'translator-form-autofill-toast';
  const STYLE_ID = 'translator-form-autofill-style';

  const FILLABLE_TYPES = new Set([
    'text', 'email', 'tel', 'url', 'search', 'password', 'number',
    'date', 'datetime-local', 'month', 'week', 'time', 'color', ''
  ]);

  let settingsCache = {
    enabled: true,
    configs: {},
    profile: {},
    dismissed: {}
  };
  let savePromptShownFor = new Set();
  let aiSuggestInFlight = false;
  let initDone = false;

  /** Key cấu hình = full URL path (không gồm hash). */
  function urlPathKey() {
    return `${location.origin}${location.pathname}${location.search || ''}`;
  }

  /**
   * Các site ưu tiên tính năng dịch — không hiện Form Auto-fill.
   * Khớp logic detect platform trong content.js: backlog, github, jira, slack.
   */
  function isTranslationPrioritySite() {
    const hostname = (location.hostname || '').toLowerCase();

    if (hostname.includes('backlog')) return true;
    if (hostname.includes('github.com') || hostname === 'github.com') return true;
    if (hostname.includes('jira') || hostname.includes('atlassian')) return true;
    if (hostname === 'app.slack.com' || hostname.endsWith('.slack.com')) return true;
    if (hostname.includes('gitlab.com') || hostname.includes('bitbucket.org')) return true;

    return false;
  }

  function teardownAutofillUi() {
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(TOAST_ID)?.remove();
  }

  function normalizeLabel(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .replace(/[*:：]/g, '')
      .trim()
      .toLowerCase();
  }

  function isVisible(el) {
    if (!el || el.disabled || el.readOnly) return false;
    if (el.type === 'hidden') return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function getLabelForField(el) {
    if (el.labels && el.labels.length) {
      return Array.from(el.labels).map((l) => l.textContent).join(' ').trim();
    }
    if (el.id) {
      const byFor = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (byFor) return byFor.textContent.trim();
    }
    const parentLabel = el.closest('label');
    if (parentLabel) return parentLabel.textContent.trim();

    const aria = el.getAttribute('aria-label');
    if (aria) return aria.trim();

    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      return labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent || '')
        .join(' ')
        .trim();
    }

    const prev = el.previousElementSibling;
    if (prev && /^(LABEL|SPAN|DIV|P|STRONG|B)$/i.test(prev.tagName)) {
      const t = prev.textContent.trim();
      if (t && t.length < 80) return t;
    }

    return el.placeholder || el.name || el.id || '';
  }

  function fieldKey(el) {
    const name = (el.name || '').trim();
    const id = (el.id || '').trim();
    const autocomplete = (el.getAttribute('autocomplete') || '').trim();
    const label = normalizeLabel(getLabelForField(el));

    if (name) return `name:${name}`;
    if (id) return `id:${id}`;
    if (autocomplete && autocomplete !== 'on' && autocomplete !== 'off') {
      return `ac:${autocomplete}`;
    }
    if (label) return `label:${label}`;
    return `tag:${el.tagName.toLowerCase()}:${el.type || 'text'}:${Math.random().toString(36).slice(2, 8)}`;
  }

  function collectFields(root = document) {
    const nodes = root.querySelectorAll('input, textarea, select');
    const fields = [];
    const seenRadioNames = new Set();

    nodes.forEach((el) => {
      if (el.closest(`#${PANEL_ID}`)) return;
      if (!isVisible(el)) return;

      const tag = el.tagName.toLowerCase();
      if (tag === 'input') {
        const type = (el.type || 'text').toLowerCase();
        if (!FILLABLE_TYPES.has(type) && type !== 'checkbox' && type !== 'radio') {
          return;
        }
      }

      if (el.type === 'radio') {
        const radioName = el.name || el.id || fieldKey(el);
        if (seenRadioNames.has(radioName)) return;
        seenRadioNames.add(radioName);
      }

      const key = fieldKey(el);
      const label = getLabelForField(el);
      let value = '';
      let options;

      if (el.type === 'checkbox') {
        value = el.checked ? 'true' : 'false';
      } else if (el.type === 'radio') {
        const radios = el.name
          ? Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`))
          : [el];
        const checked = radios.find((r) => r.checked);
        value = checked ? checked.value : (radios[0]?.value || '');
        options = radios.map((r) => ({
          value: r.value,
          text: getLabelForField(r) || r.value
        }));
      } else {
        value = el.value || '';
      }

      if (tag === 'select') {
        options = Array.from(el.options).map((o) => ({ value: o.value, text: o.textContent.trim() }));
      }

      fields.push({
        key,
        tag,
        type: (el.type || tag).toLowerCase(),
        name: el.name || '',
        id: el.id || '',
        autocomplete: el.getAttribute('autocomplete') || '',
        placeholder: el.placeholder || '',
        label,
        value,
        options
      });
    });

    return fields;
  }

  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor?.set) {
      descriptor.set.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function fillField(el, value) {
    if (value == null || value === '') return false;

    if (el.type === 'checkbox') {
      const checked = value === true || value === 'true' || value === '1' || value === 'on';
      if (el.checked !== checked) {
        el.checked = checked;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return true;
    }

    if (el.type === 'radio') {
      const radios = document.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`);
      let matched = false;
      radios.forEach((radio) => {
        if (radio.value === value) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          matched = true;
        }
      });
      return matched;
    }

    if (el.tagName === 'SELECT') {
      const options = Array.from(el.options);
      let opt = options.find((o) => o.value === value);
      if (!opt) {
        const lower = String(value).toLowerCase();
        opt = options.find((o) => o.textContent.trim().toLowerCase() === lower);
      }
      if (!opt) return false;
      el.value = opt.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    setNativeValue(el, String(value));
    return true;
  }

  function matchElement(fieldMeta) {
    const candidates = Array.from(document.querySelectorAll('input, textarea, select'))
      .filter((el) => isVisible(el) && !el.closest(`#${PANEL_ID}`));

    if (fieldMeta.name) {
      const byName = candidates.find((el) => el.name === fieldMeta.name);
      if (byName) return byName;
    }
    if (fieldMeta.id) {
      const byId = candidates.find((el) => el.id === fieldMeta.id);
      if (byId) return byId;
    }
    if (fieldMeta.autocomplete) {
      const byAc = candidates.find(
        (el) => (el.getAttribute('autocomplete') || '') === fieldMeta.autocomplete
      );
      if (byAc) return byAc;
    }
    if (fieldMeta.label) {
      const want = normalizeLabel(fieldMeta.label);
      const byLabel = candidates.find((el) => normalizeLabel(getLabelForField(el)) === want);
      if (byLabel) return byLabel;
    }
    if (fieldMeta.key) {
      return candidates.find((el) => fieldKey(el) === fieldMeta.key) || null;
    }
    return null;
  }

  function applyValues(fieldsMap) {
    let filled = 0;
    Object.values(fieldsMap || {}).forEach((meta) => {
      const el = matchElement(meta);
      if (!el) return;
      if (fillField(el, meta.value)) filled += 1;
    });
    return filled;
  }

  /** Fallback sample khi AI không trả giá trị cho field. */
  function sampleFallbackValue(field) {
    const type = String(field.type || 'text').toLowerCase();
    const label = normalizeLabel(`${field.label || ''} ${field.name || ''} ${field.id || ''} ${field.placeholder || ''}`);

    if (type === 'password') return 'SamplePass123!';
    if (type === 'checkbox') return 'true';
    if (type === 'radio') {
      if (field.options?.length) return field.options[0].value || field.options[0].text || 'on';
      return field.value || 'on';
    }
    if (type === 'email' || /email|e-?mail|mail/.test(label)) return 'sample@example.com';
    if (type === 'tel' || /phone|tel|mobile|sđt|so dien thoai|điện thoại/.test(label)) {
      return '0901234567';
    }
    if (type === 'url' || /website|url|homepage/.test(label)) return 'https://example.com';
    if (type === 'number' || /age|tuoi|quantity|qty|amount|so luong/.test(label)) return '1';
    if (type === 'date') return new Date().toISOString().slice(0, 10);
    if (type === 'datetime-local') return new Date().toISOString().slice(0, 16);
    if (type === 'time') return '12:00';
    if (type === 'month') return new Date().toISOString().slice(0, 7);
    if (type === 'week') return '2026-W01';
    if (type === 'color') return '#1f6feb';
    if (field.tag === 'select' || type === 'select-one' || type === 'select-multiple') {
      const options = field.options || [];
      const opt = options.find((o) => String(o.value || '').trim() !== '') || options[0];
      return opt ? (opt.value || opt.text || 'sample') : 'sample';
    }
    if (/name|ho ten|full.?name|first.?name|last.?name|username|user.?name/.test(label)) {
      return 'Sample User';
    }
    if (/company|cong ty|organization|org|workplace/.test(label)) return 'Sample Company';
    if (/address|dia chi|street|dia.chi/.test(label)) return '123 Sample Street';
    if (/city|thanh pho|tinh/.test(label)) return 'Sample City';
    if (/zip|postal|postcode|ma buu chinh/.test(label)) return '100000';
    if (/country|quoc gia/.test(label)) return 'Vietnam';
    if (field.tag === 'textarea' || type === 'textarea') return 'Sample text';
    return 'Sample text';
  }

  function resolveFillValue(field, suggestions = {}) {
    const aiValue = suggestions[field.key];
    if (aiValue != null && String(aiValue).trim() !== '') {
      return { value: aiValue, source: 'ai' };
    }
    return { value: sampleFallbackValue(field), source: 'sample' };
  }

  function buildConfigFromDom() {
    const fields = collectFields();
    const map = {};
    fields.forEach((f) => {
      if (f.type === 'password') return;
      if (!f.value && f.type !== 'checkbox') return;
      map[f.key] = {
        key: f.key,
        name: f.name,
        id: f.id,
        type: f.type,
        autocomplete: f.autocomplete,
        label: f.label,
        value: f.value
      };
    });
    return map;
  }

  async function loadSettings() {
    const data = await chrome.storage.local.get([
      STORAGE_KEYS.enabled,
      STORAGE_KEYS.configs,
      STORAGE_KEYS.profile,
      STORAGE_KEYS.dismissed
    ]);
    settingsCache = {
      enabled: data[STORAGE_KEYS.enabled] !== false,
      configs: data[STORAGE_KEYS.configs] || {},
      profile: data[STORAGE_KEYS.profile] || {},
      dismissed: data[STORAGE_KEYS.dismissed] || {}
    };
    return settingsCache;
  }

  async function saveUrlConfig(fieldsMap) {
    const key = urlPathKey();
    const configs = { ...(settingsCache.configs || {}) };
    configs[key] = {
      fields: fieldsMap,
      updatedAt: Date.now(),
      url: location.href
    };
    settingsCache.configs = configs;
    await chrome.storage.local.set({ [STORAGE_KEYS.configs]: configs });
  }

  async function deleteUrlConfig(key) {
    const configs = { ...(settingsCache.configs || {}) };
    delete configs[key];
    settingsCache.configs = configs;
    await chrome.storage.local.set({ [STORAGE_KEYS.configs]: configs });
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483646;
        width: 300px;
        background: #fff;
        color: #222;
        border: 1px solid #d8dee9;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,.18);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        overflow: hidden;
      }
      #${PANEL_ID} .tfa-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 12px 14px;
        background: linear-gradient(135deg, #1f6feb, #0d9488);
        color: #fff;
        font-weight: 700;
      }
      #${PANEL_ID} .tfa-body { padding: 12px 14px; }
      #${PANEL_ID} .tfa-hint { color: #666; margin-bottom: 10px; line-height: 1.4; word-break: break-all; }
      #${PANEL_ID} .tfa-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      #${PANEL_ID} button {
        border: none;
        border-radius: 8px;
        padding: 8px 10px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
      }
      #${PANEL_ID} .tfa-primary { background: #1f6feb; color: #fff; }
      #${PANEL_ID} .tfa-secondary { background: #eef2ff; color: #1f6feb; }
      #${PANEL_ID} .tfa-ghost { background: transparent; color: #fff; font-size: 16px; padding: 0 4px; }
      #${PANEL_ID} .tfa-danger { background: #fee2e2; color: #b91c1c; }
      #${PANEL_ID} .tfa-status { margin-top: 8px; color: #0f766e; min-height: 16px; }
      #${TOAST_ID} {
        position: fixed;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%);
        z-index: 2147483647;
        background: #111827;
        color: #fff;
        padding: 12px 14px;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0,0,0,.25);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: min(92vw, 420px);
      }
      #${TOAST_ID} button {
        border: none;
        border-radius: 6px;
        padding: 6px 10px;
        cursor: pointer;
        font-weight: 600;
        font-size: 12px;
      }
      #${TOAST_ID} .yes { background: #34d399; color: #064e3b; }
      #${TOAST_ID} .no { background: #374151; color: #fff; }
    `;
    document.documentElement.appendChild(style);
  }

  function showToast(message, { onYes, onNo } = {}) {
    ensureStyles();
    document.getElementById(TOAST_ID)?.remove();
    const toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.innerHTML = `
      <span>${message}</span>
      <button class="yes" type="button">Có</button>
      <button class="no" type="button">Không</button>
    `;
    toast.querySelector('.yes').onclick = () => {
      toast.remove();
      onYes?.();
    };
    toast.querySelector('.no').onclick = () => {
      toast.remove();
      onNo?.();
    };
    document.documentElement.appendChild(toast);
  }

  function setPanelStatus(text) {
    const el = document.querySelector(`#${PANEL_ID} .tfa-status`);
    if (el) el.textContent = text || '';
  }

  function renderPanel() {
    if (isTranslationPrioritySite()) {
      teardownAutofillUi();
      return;
    }
    ensureStyles();
    const urlKey = urlPathKey();
    const hasConfig = Boolean(settingsCache.configs?.[urlKey]?.fields);
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = PANEL_ID;
      document.documentElement.appendChild(panel);
    }

    panel.innerHTML = `
      <div class="tfa-header">
        <span>📝 Form Auto-fill</span>
        <button class="tfa-ghost" type="button" data-action="close" title="Ẩn">×</button>
      </div>
      <div class="tfa-body">
        <div class="tfa-hint">
          URL: <strong>${urlKey}</strong><br>
          ${hasConfig
            ? 'Đã có cấu hình lưu. Có thể auto-fill hoặc cập nhật.'
            : 'Form mới — dùng AI Gemini để gợi ý điền (thiếu thì dùng sample text), hoặc tự điền rồi lưu.'}
        </div>
        <div class="tfa-actions">
          ${hasConfig
            ? '<button class="tfa-primary" type="button" data-action="autofill">⚡ Auto-fill</button>'
            : ''}
          <button class="tfa-secondary" type="button" data-action="ai">✨ AI Suggest</button>
          <button class="tfa-secondary" type="button" data-action="save">💾 Lưu cấu hình</button>
          ${hasConfig
            ? '<button class="tfa-danger" type="button" data-action="delete">Xóa cấu hình</button>'
            : ''}
        </div>
        <div class="tfa-status"></div>
      </div>
    `;

    panel.querySelector('[data-action="close"]').onclick = () => panel.remove();
    panel.querySelector('[data-action="autofill"]')?.addEventListener('click', () => {
      const filled = applyValues(settingsCache.configs[urlKey]?.fields || {});
      setPanelStatus(filled ? `Đã điền ${filled} trường.` : 'Không khớp trường nào.');
    });
    panel.querySelector('[data-action="ai"]').onclick = () => runAiSuggest();
    panel.querySelector('[data-action="save"]').onclick = async () => {
      const map = buildConfigFromDom();
      if (!Object.keys(map).length) {
        setPanelStatus('Chưa có giá trị nào để lưu.');
        return;
      }
      await saveUrlConfig(map);
      setPanelStatus(`Đã lưu ${Object.keys(map).length} trường cho URL này.`);
      renderPanel();
    };
    panel.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
      await deleteUrlConfig(urlKey);
      setPanelStatus('Đã xóa cấu hình URL này.');
      renderPanel();
    });
  }

  async function getGeminiCredentials() {
    const data = await chrome.storage.local.get(['globalSettings', 'geminiKey', 'geminiModel']);
    const global = data.globalSettings || {};
    const apiKey = global.apiKey || data.geminiKey || '';
    const provider = global.provider || 'gemini';
    const model = global.model || data.geminiModel || 'gemini-2.5-flash';

    if (provider === 'gemini' && apiKey) {
      return { apiKey, model };
    }
    if (data.geminiKey) {
      return { apiKey: data.geminiKey, model: data.geminiModel || 'gemini-2.5-flash' };
    }
    return { apiKey: '', model: 'gemini-2.5-flash' };
  }

  async function runAiSuggest() {
    if (aiSuggestInFlight) return;
    aiSuggestInFlight = true;
    setPanelStatus('Đang hỏi Gemini...');

    try {
      const fields = collectFields();
      if (!fields.length) {
        setPanelStatus('Không tìm thấy input để gợi ý.');
        return;
      }

      const { apiKey, model } = await getGeminiCredentials();
      let suggestions = {};
      let aiError = '';

      if (apiKey) {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            {
              type: 'SUGGEST_FORM_FILL',
              apiKey,
              model,
              profile: settingsCache.profile || {},
              domain: location.hostname,
              url: urlPathKey(),
              fields: fields.map(({ key, type, name, id, label, placeholder, autocomplete, options, tag }) => ({
                key, type, name, id, label, placeholder, autocomplete, options, tag
              }))
            },
            (res) => resolve(res)
          );
        });

        if (response?.success) {
          suggestions = response.suggestions || {};
        } else {
          aiError = response?.error || 'AI suggest thất bại';
        }
      } else {
        aiError = 'Thiếu Gemini API key — dùng sample text';
      }

      let filled = 0;
      let fromAi = 0;
      let fromSample = 0;

      fields.forEach((f) => {
        const { value, source } = resolveFillValue(f, suggestions);
        const el = matchElement(f);
        if (el && fillField(el, value)) {
          filled += 1;
          if (source === 'ai') fromAi += 1;
          else fromSample += 1;
        }
      });

      if (!filled) {
        setPanelStatus(aiError || 'Không điền được trường nào.');
        return;
      }

      const parts = [`Đã điền ${filled}/${fields.length} trường`];
      if (fromAi) parts.push(`AI: ${fromAi}`);
      if (fromSample) parts.push(`sample: ${fromSample}`);
      if (aiError) parts.push(`(${aiError})`);
      setPanelStatus(`${parts.join(' · ')}. Có muốn lưu?`);

      const urlKey = urlPathKey();
      if (!savePromptShownFor.has(urlKey)) {
        savePromptShownFor.add(urlKey);
        showToast('Lưu cấu hình auto-fill cho URL này?', {
          onYes: async () => {
            await saveUrlConfig(buildConfigFromDom());
            setPanelStatus('Đã lưu cấu hình.');
            renderPanel();
          }
        });
      }
    } catch (error) {
      // AI lỗi vẫn fallback sample cho toàn bộ input
      try {
        const fields = collectFields();
        let filled = 0;
        fields.forEach((f) => {
          const el = matchElement(f);
          if (el && fillField(el, sampleFallbackValue(f))) filled += 1;
        });
        setPanelStatus(
          filled
            ? `AI lỗi — đã fallback sample cho ${filled} trường. (${error?.message || 'unknown'})`
            : (error?.message || 'Lỗi AI suggest.')
        );
        if (filled > 0) {
          const urlKey = urlPathKey();
          if (!savePromptShownFor.has(urlKey)) {
            savePromptShownFor.add(urlKey);
            showToast('Lưu cấu hình auto-fill cho URL này?', {
              onYes: async () => {
                await saveUrlConfig(buildConfigFromDom());
                setPanelStatus('Đã lưu cấu hình.');
                renderPanel();
              }
            });
          }
        }
      } catch {
        setPanelStatus(error?.message || 'Lỗi AI suggest.');
      }
    } finally {
      aiSuggestInFlight = false;
    }
  }

  function maybeAskSaveAfterManualFill() {
    const urlKey = urlPathKey();
    if (settingsCache.configs?.[urlKey]?.fields) return;
    if (settingsCache.dismissed?.[urlKey]) return;
    if (savePromptShownFor.has(`manual:${urlKey}`)) return;

    const map = buildConfigFromDom();
    const meaningful = Object.values(map).filter((f) => f.type !== 'checkbox' || f.value === 'true');
    if (meaningful.length < 2) return;

    savePromptShownFor.add(`manual:${urlKey}`);
    showToast('Bạn vừa điền form. Lưu cấu hình cho lần sau?', {
      onYes: async () => {
        await saveUrlConfig(map);
        renderPanel();
      },
      onNo: async () => {
        const dismissed = { ...(settingsCache.dismissed || {}), [urlKey]: Date.now() };
        settingsCache.dismissed = dismissed;
        await chrome.storage.local.set({ [STORAGE_KEYS.dismissed]: dismissed });
      }
    });
  }

  function watchManualFill() {
    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(maybeAskSaveAfterManualFill, 1800);
    };
    document.addEventListener('change', schedule, true);
    document.addEventListener('blur', (e) => {
      if (e.target?.matches?.('input, textarea, select')) schedule();
    }, true);
  }

  async function tryAutofillFromConfig() {
    const urlKey = urlPathKey();
    const config = settingsCache.configs?.[urlKey];
    if (!config?.fields) return 0;

    await new Promise((r) => setTimeout(r, 400));
    const filled = applyValues(config.fields);
    if (filled > 0) {
      setPanelStatus(`Auto-fill: đã điền ${filled} trường từ cấu hình đã lưu.`);
    }
    return filled;
  }

  async function init() {
    if (initDone) return;
    initDone = true;

    // Ưu tiên dịch trên Backlog / Slack / Git / Jira — không chạy auto-fill
    if (isTranslationPrioritySite()) {
      teardownAutofillUi();
      return;
    }

    await loadSettings();
    if (!settingsCache.enabled) return;

    const fieldCount = collectFields().length;
    if (fieldCount === 0) {
      // SPA / form lazy — vẫn gắn observer
    } else {
      renderPanel();
      await tryAutofillFromConfig();
    }

    watchManualFill();

    const observer = new MutationObserver(() => {
      if (isTranslationPrioritySite()) {
        teardownAutofillUi();
        return;
      }
      if (!settingsCache.enabled) return;
      if (document.getElementById(PANEL_ID)) return;
      if (collectFields().length > 0) {
        renderPanel();
        tryAutofillFromConfig();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (isTranslationPrioritySite()) {
      teardownAutofillUi();
      return;
    }
    if (
      changes[STORAGE_KEYS.enabled] ||
      changes[STORAGE_KEYS.configs] ||
      changes[STORAGE_KEYS.profile]
    ) {
      loadSettings().then(() => {
        if (!settingsCache.enabled) {
          teardownAutofillUi();
          return;
        }
        if (collectFields().length > 0) renderPanel();
      });
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
