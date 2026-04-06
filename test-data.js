// Mock/Test Script
// Dùng để test extension trên local HTML file

// Create mock data
const mockPageContent = {
  title: "SFDC-123: Implement User Authentication in Legal Advisory Portal",
  issueKey: "SFDC-123",
  description: `
    As a user of the Legal Advisory Portal, I want to authenticate myself securely 
    so that I can access confidential legal documents and case materials.
    
    Acceptance Criteria:
    - User can login with email and password
    - Session timeout after 30 minutes
    - Password must be at least 8 characters
  `,
  comments: [
    {
      text: `This ticket is blocked by SFDC-120. We need to set up the database schema first.
             Team should start with creating the users table and authentication endpoints.
             Estimated effort: 5 story points.
             Can we prioritize this for next sprint?`,
      selector: "comment-1"
    },
    {
      text: `I suggest using OAuth 2.0 instead of basic authentication. 
             It's more secure and follows industry standards.
             Also need to consider MFA for admin accounts.`,
      selector: "comment-2"
    },
    {
      text: `Frontend is ready. Backend team should complete API by Friday.
             Let me know if you need any clarification on the specifications.
             Pushing to staging Monday morning.`,
      selector: "comment-3"
    },
    {
      text: `Critical issue found in the authentication flow. 
             User session is persisting even after logout.
             Need hot fix ASAP. This is blocking QA testing.`,
      selector: "comment-4"
    },
    {
      text: `All bugs fixed. Ready for production deployment.
             Please run final security audit before going live.
             Updated documentation in wiki.`,
      selector: "comment-5"
    }
  ]
};

// Create test HTML
function createTestHTML() {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test - Backlog Translator</title>
      <style>
        body { font-family: Arial; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        h2 { color: #333; margin-top: 20px; }
        .comment { background: #f9f9f9; border-left: 4px solid #999; padding: 12px; margin: 10px 0; }
        .translation { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 12px; margin: 10px 0; font-style: italic; color: #2e7d32; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${mockPageContent.title}</h1>
        <p><strong>Issue Key:</strong> ${mockPageContent.issueKey}</p>
        
        <h2>Description</h2>
        <p>${mockPageContent.description}</p>
        
        <h2>Comments</h2>
  `;
  
  mockPageContent.comments.forEach((comment, idx) => {
    html += `
      <div class="comment" id="comment-${idx + 1}">
        <strong>Comment #${idx + 1}</strong>
        <p>${comment.text}</p>
      </div>
    `;
  });
  
  html += `
      </div>
    </body>
    </html>
  `;
  
  return html;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mockPageContent,
    createTestHTML
  };
}

// Log formatted mock data
console.log('📊 Mock Page Content:');
console.table(mockPageContent);
console.log('📝 Mock Comments:');
mockPageContent.comments.forEach((c, i) => {
  console.log(`\n[${i + 1}] ${c.text.substring(0, 100)}...`);
});
