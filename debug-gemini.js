/**
 * Debug script để test Gemini API quota
 * Chạy script này trong Browser Console (F12) để kiểm tra API
 */

// ============================================
// 1. Test Gemini API Quota
// ============================================
async function testGeminiAPI(apiKey) {
  console.log('🔍 Testing Gemini API...');
  console.log('API Key (first 20 chars):', apiKey.substring(0, 20) + '***');
  
  try {
    // Test 1: Simple text generation
    console.log('\n📝 Test 1: Simple text generation');
    const response1 = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Hello, please respond with "OK"'
              }
            ]
          }
        ]
      })
    });

    const data1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Response:', data1);

    if (!response1.ok) {
      console.error('❌ API Error:', data1.error?.message);
      return false;
    }

    console.log('✅ API is working!');
    if (data1.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.log('Generated text:', data1.candidates[0].content.parts[0].text);
    }

    // Test 2: Translation test
    console.log('\n📝 Test 2: Translation test');
    const response2 = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Dịch sang Tiếng Việt:\n\nHello world'
              }
            ]
          }
        ]
      })
    });

    const data2 = await response2.json();
    console.log('Status:', response2.status);
    console.log('Response:', data2);

    if (response2.ok && data2.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.log('✅ Translation working!');
      console.log('Translation result:', data2.candidates[0].content.parts[0].text);
    }

    // Check headers for quota info
    console.log('\n📊 API Headers (Quota info):');
    response2.headers.forEach((value, name) => {
      if (name.toLowerCase().includes('quota') || 
          name.toLowerCase().includes('ratelimit') ||
          name.toLowerCase().includes('x-')) {
        console.log(`${name}: ${value}`);
      }
    });

    return true;

  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// ============================================
// 2. Quick Check from Storage
// ============================================
async function quickCheckGemini() {
  console.log('🚀 Quick Gemini API Check\n');
  
  // Get API key from Chrome storage
  return new Promise((resolve) => {
    chrome.storage.local.get(['geminiKey'], async (data) => {
      if (!data.geminiKey) {
        console.error('❌ No Gemini API key found in storage');
        console.log('Please save your Gemini API key first:\n');
        console.log('1. Click extension icon 🌐');
        console.log('2. Select "Gemini (Google)" from dropdown');
        console.log('3. Paste your API key');
        console.log('4. Click "💾 Lưu cài đặt"');
        resolve(false);
        return;
      }

      console.log('✅ Found Gemini API key in storage\n');
      const result = await testGeminiAPI(data.geminiKey);
      resolve(result);
    });
  });
}

// ============================================
// 3. Manual Test (for copying API key manually)
// ============================================
function manualTestGemini() {
  console.log('📋 Manual Test Instructions:\n');
  console.log('1. Get your Gemini API key from: https://aistudio.google.com/app/apikey');
  console.log('2. Copy and run in console:');
  console.log('   testGeminiAPI("AIzaSy...")');
  console.log('\nExample:');
  console.log('   testGeminiAPI("AIzaSyXXXXXXXXXXXX")');
}

// ============================================
// Export functions for console use
// ============================================
console.log('╔════════════════════════════════════════╗');
console.log('║  🔍 Gemini API Debug Tool             ║');
console.log('╚════════════════════════════════════════╝\n');
console.log('Available commands:\n');
console.log('1️⃣  quickCheckGemini()');
console.log('   → Auto check using saved API key\n');
console.log('2️⃣  testGeminiAPI("YOUR_API_KEY")');
console.log('   → Manual test with your API key\n');
console.log('3️⃣  manualTestGemini()');
console.log('   → Show instructions\n');
console.log('Example:');
console.log('   await quickCheckGemini()\n');

// Make functions available globally
window.testGeminiAPI = testGeminiAPI;
window.quickCheckGemini = quickCheckGemini;
window.manualTestGemini = manualTestGemini;
