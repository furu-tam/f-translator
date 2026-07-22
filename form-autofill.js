/**
 * Form Auto-fill
 * - Lưu cấu hình theo full URL path (origin + pathname)
 * - Lần sau vào form → auto fill từ config đã lưu
 * - Form mới → generate value theo input type / định dạng field
 */

(() => {
  const STORAGE_KEYS = {
    enabled: 'formAutofillEnabled',
    configs: 'formAutofillConfigs',
    allowedDomains: 'formAutofillAllowedDomains',
    dismissed: 'formAutofillDismissedDomains'
  };

  const PANEL_ID = 'translator-form-autofill-panel';
  const TOAST_ID = 'translator-form-autofill-toast';
  const STYLE_ID = 'translator-form-autofill-style';

  const FILLABLE_TYPES = new Set([
    'text', 'email', 'tel', 'url', 'search', 'password', 'number',
    'date', 'datetime-local', 'month', 'week', 'time', 'color', 'range', ''
  ]);

  let settingsCache = {
    enabled: true,
    configs: {},
    allowedDomains: [],
    dismissed: {}
  };
  let savePromptShownFor = new Set();
  let initDone = false;
  /** Ẩn panel trong phiên trang hiện tại (× hoặc tắt setting) — chỉ hiện lại khi reload. */
  let panelHiddenThisLoad = false;
  let panelShownThisLoad = false;

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

  function normalizeDomain(input) {
    let value = String(input || '').trim().toLowerCase();
    if (!value) return '';
    value = value.replace(/^https?:\/\//, '').replace(/^www\./, '');
    value = value.split('/')[0].split('?')[0].split('#')[0];
    return value.replace(/:\d+$/, '');
  }

  /** Chỉ hiện trên domain nằm trong Allow list (exact hoặc subdomain). */
  function isAllowedDomain() {
    const hostname = normalizeDomain(location.hostname);
    const allowed = settingsCache.allowedDomains || [];
    if (!hostname || !allowed.length) return false;
    return allowed.some((entry) => {
      const domain = normalizeDomain(entry);
      if (!domain) return false;
      return hostname === domain || hostname.endsWith(`.${domain}`);
    });
  }

  function teardownAutofillUi() {
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(TOAST_ID)?.remove();
  }

  function canShowPanel() {
    return (
      settingsCache.enabled &&
      !panelHiddenThisLoad &&
      !isTranslationPrioritySite() &&
      isAllowedDomain()
    );
  }

  function hidePanelForThisPage() {
    panelHiddenThisLoad = true;
    teardownAutofillUi();
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
        options,
        min: el.getAttribute('min') || '',
        max: el.getAttribute('max') || '',
        step: el.getAttribute('step') || '',
        maxLength: el.maxLength > 0 ? el.maxLength : 0,
        pattern: el.getAttribute('pattern') || '',
        inputMode: el.getAttribute('inputmode') || ''
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

  /**
   * Generate value theo type / định dạng field (không dùng AI).
   * Ưu tiên: HTML type → autocomplete → inputmode → label/name.
   */
  function generateValueByFieldType(field) {
    const type = String(field.type || 'text').toLowerCase();
    const ac = String(field.autocomplete || '').toLowerCase();
    const inputMode = String(field.inputMode || '').toLowerCase();
    const label = normalizeLabel(
      `${field.label || ''} ${field.name || ''} ${field.id || ''} ${field.placeholder || ''} ${ac}`
    );

    const clampText = (text) => {
      const raw = String(text);
      if (field.maxLength > 0 && raw.length > field.maxLength) {
        return raw.slice(0, field.maxLength);
      }
      return raw;
    };

    if (type === 'password') return clampText('SamplePass123!');
    if (type === 'checkbox') return 'true';
    if (type === 'radio') {
      if (field.options?.length) return field.options[0].value || field.options[0].text || 'on';
      return field.value || 'on';
    }
    if (field.tag === 'select' || type === 'select-one' || type === 'select-multiple') {
      const options = field.options || [];
      const opt = options.find((o) => String(o.value || '').trim() !== '') || options[0];
      return opt ? (opt.value || opt.text || 'sample') : 'sample';
    }

    if (type === 'email' || ac.includes('email') || /email|e-?mail/.test(label)) {
      return clampText('sample@example.com');
    }
    if (
      type === 'tel' ||
      ac.includes('tel') ||
      inputMode === 'tel' ||
      /phone|tel|mobile|sđt|so dien thoai|điện thoại/.test(label)
    ) {
      return clampText('0901234567');
    }
    if (type === 'url' || ac.includes('url') || /website|url|homepage/.test(label)) {
      return clampText('https://example.com');
    }
    if (type === 'number' || inputMode === 'numeric' || inputMode === 'decimal') {
      const min = field.min !== '' && !Number.isNaN(Number(field.min)) ? Number(field.min) : null;
      const max = field.max !== '' && !Number.isNaN(Number(field.max)) ? Number(field.max) : null;
      let n = 1;
      if (min != null) n = min;
      if (max != null && n > max) n = max;
      if (/age|tuoi/.test(label)) n = Math.min(max ?? 25, Math.max(min ?? 25, 25));
      return String(n);
    }
    if (type === 'date') {
      const today = new Date().toISOString().slice(0, 10);
      if (field.min && today < field.min) return field.min;
      if (field.max && today > field.max) return field.max;
      return today;
    }
    if (type === 'datetime-local') {
      return new Date().toISOString().slice(0, 16);
    }
    if (type === 'time') return '12:00';
    if (type === 'month') return new Date().toISOString().slice(0, 7);
    if (type === 'week') {
      const d = new Date();
      const oneJan = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil((((d - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
      return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
    }
    if (type === 'color') return '#1f6feb';
    if (type === 'range') {
      const min = field.min !== '' ? Number(field.min) : 0;
      const max = field.max !== '' ? Number(field.max) : 100;
      return String(Math.round((min + max) / 2));
    }

    // autocomplete / label heuristics for text-like fields
    if (ac.includes('given-name') || /first.?name|ten|firstname/.test(label)) {
      return clampText('Van');
    }
    if (ac.includes('family-name') || /last.?name|ho|surname|lastname/.test(label)) {
      return clampText('Nguyen');
    }
    if (
      ac.includes('name') ||
      /full.?name|ho ten|username|user.?name|display.?name/.test(label)
    ) {
      return clampText('Sample User');
    }
    if (ac.includes('organization') || /company|cong ty|organization|org|workplace/.test(label)) {
      return clampText('Sample Company');
    }
    if (ac.includes('street-address') || /address|dia chi|street/.test(label)) {
      return clampText('123 Sample Street');
    }
    if (ac.includes('address-level2') || /city|thanh pho/.test(label)) {
      return clampText('Ha Noi');
    }
    if (ac.includes('postal-code') || /zip|postal|postcode|ma buu chinh/.test(label)) {
      return clampText('100000');
    }
    if (ac.includes('country') || /country|quoc gia/.test(label)) {
      return clampText('VN');
    }
    if (/otp|captcha|csrf/.test(label)) return clampText('123456');

    if (field.tag === 'textarea' || type === 'textarea') {
      return clampText('Sample text for textarea field.');
    }
    if (type === 'search') return clampText('sample search');

    return clampText('Sample text');
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
      STORAGE_KEYS.allowedDomains,
      STORAGE_KEYS.dismissed
    ]);
    const allowedRaw = data[STORAGE_KEYS.allowedDomains];
    settingsCache = {
      enabled: data[STORAGE_KEYS.enabled] !== false,
      configs: data[STORAGE_KEYS.configs] || {},
      allowedDomains: Array.isArray(allowedRaw)
        ? allowedRaw.map(normalizeDomain).filter(Boolean)
        : [],
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
    if (!canShowPanel()) {
      teardownAutofillUi();
      return false;
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
        <button class="tfa-ghost" type="button" data-action="close" title="Ẩn đến khi reload">×</button>
      </div>
      <div class="tfa-body">
        <div class="tfa-hint">
          URL: <strong>${urlKey}</strong><br>
          ${hasConfig
            ? 'Đã có cấu hình lưu. Có thể auto-fill hoặc generate lại theo type.'
            : 'Form mới — Generate value theo loại input (email, tel, date…), rồi lưu nếu muốn.'}
          <br><span style="color:#888;font-size:11px">Đóng panel sẽ ẩn đến khi reload trang.</span>
        </div>
        <div class="tfa-actions">
          ${hasConfig
            ? '<button class="tfa-primary" type="button" data-action="autofill">⚡ Auto-fill</button>'
            : ''}
          <button class="tfa-secondary" type="button" data-action="generate">🪄 Generate</button>
          <button class="tfa-secondary" type="button" data-action="save">💾 Lưu cấu hình</button>
          ${hasConfig
            ? '<button class="tfa-danger" type="button" data-action="delete">Xóa cấu hình</button>'
            : ''}
        </div>
        <div class="tfa-status"></div>
      </div>
    `;

    panel.querySelector('[data-action="close"]').onclick = () => hidePanelForThisPage();
    panel.querySelector('[data-action="autofill"]')?.addEventListener('click', () => {
      const filled = applyValues(settingsCache.configs[urlKey]?.fields || {});
      setPanelStatus(filled ? `Đã điền ${filled} trường.` : 'Không khớp trường nào.');
    });
    panel.querySelector('[data-action="generate"]').onclick = () => runGenerateByType();
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

    panelShownThisLoad = true;
    return true;
  }

  function runGenerateByType() {
    const fields = collectFields();
    if (!fields.length) {
      setPanelStatus('Không tìm thấy input để generate.');
      return;
    }

    let filled = 0;
    fields.forEach((f) => {
      const el = matchElement(f);
      if (el && fillField(el, generateValueByFieldType(f))) filled += 1;
    });

    if (!filled) {
      setPanelStatus('Không điền được trường nào.');
      return;
    }

    setPanelStatus(`Đã generate ${filled}/${fields.length} trường theo input type. Có muốn lưu?`);

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

  function maybeAskSaveAfterManualFill() {
    if (!settingsCache.enabled || panelHiddenThisLoad) return;
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
        if (canShowPanel()) renderPanel();
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
    if (!settingsCache.enabled) return 0;
    const urlKey = urlPathKey();
    const config = settingsCache.configs?.[urlKey];
    if (!config?.fields) return 0;

    await new Promise((r) => setTimeout(r, 400));
    if (!settingsCache.enabled) return 0;
    const filled = applyValues(config.fields);
    if (filled > 0 && canShowPanel()) {
      setPanelStatus(`Auto-fill: đã điền ${filled} trường từ cấu hình đã lưu.`);
    }
    return filled;
  }

  /** Chỉ thử hiện panel lúc load trang (vài lần delay), không gắn MutationObserver để hiện lại. */
  function tryShowPanelOnLoad() {
    if (!canShowPanel() || panelShownThisLoad) return false;
    if (collectFields().length === 0) return false;
    renderPanel();
    tryAutofillFromConfig();
    return true;
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
    if (!settingsCache.enabled || !isAllowedDomain()) {
      teardownAutofillUi();
      return;
    }

    tryShowPanelOnLoad();
    // Form lazy lúc load: thử thêm vài lần, sau đó thôi (không hiện lại giữa phiên)
    [600, 1500, 3000].forEach((ms) => {
      setTimeout(() => {
        if (settingsCache.enabled && !panelHiddenThisLoad && isAllowedDomain()) {
          tryShowPanelOnLoad();
        }
      }, ms);
    });

    watchManualFill();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (isTranslationPrioritySite()) {
      teardownAutofillUi();
      return;
    }

    if (changes[STORAGE_KEYS.enabled]) {
      const enabled = changes[STORAGE_KEYS.enabled].newValue !== false;
      settingsCache.enabled = enabled;
      if (!enabled) {
        // Tắt ngay, chỉ hiện lại khi bật + reload trang
        hidePanelForThisPage();
        return;
      }
      // Bật lại: không hiện panel giữa phiên — chờ reload
      return;
    }

    if (changes[STORAGE_KEYS.allowedDomains]) {
      const next = changes[STORAGE_KEYS.allowedDomains].newValue;
      settingsCache.allowedDomains = Array.isArray(next)
        ? next.map(normalizeDomain).filter(Boolean)
        : [];
      if (!isAllowedDomain()) {
        teardownAutofillUi();
      }
      // Domain vừa được allow: chỉ hiện lại sau reload
      return;
    }

    if (changes[STORAGE_KEYS.configs]) {
      loadSettings().then(() => {
        if (!settingsCache.enabled || !isAllowedDomain()) {
          teardownAutofillUi();
          return;
        }
        // Cập nhật nội dung panel nếu đang mở; không mở mới giữa phiên
        if (document.getElementById(PANEL_ID) && canShowPanel()) {
          renderPanel();
        }
      });
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
