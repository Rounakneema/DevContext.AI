const https = require('https');

const API_ENDPOINT = 'https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod';
const TEST_REPO = 'https://github.com/facebook/react';

console.log('🧪 Testing Stage 2 (Intelligence Report) Implementation\n');
console.log('API Endpoint:', API_ENDPOINT);
console.log('Test Repository:', TEST_REPO);
console.log('='.repeat(60) + '\n');

// Step 1: Start analysis
console.log('Step 1: Starting analysis...');

const postData = JSON.stringify({ repositoryUrl: TEST_REPO });

const options = {
  hostname: '2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com',
  path: '/prod/analyze',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => data += chunk);
  
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error('❌ Failed to start analysis');
      console.error('Status:', res.statusCode);
      console.error('Response:', data);
      return;
    }
    
    const result = JSON.parse(data);
    console.log('✅ Analysis started!');
    console.log('Analysis ID:', result.analysisId);
    console.log('\nStep 2: Waiting for completion (checking every 10 seconds)...\n');
    
    // Poll for completion
    let attempts = 0;
    const maxAttempts = 36; // 6 minutes max
    
    const checkStatus = () => {
      attempts++;
      
      https.get(`${API_ENDPOINT}/analysis/${result.analysisId}/status`, (statusRes) => {
        let statusData = '';
        
        statusRes.on('data', (chunk) => statusData += chunk);
        
        statusRes.on('end', () => {
          const status = JSON.parse(statusData);
          
          console.log(`[${attempts}/${maxAttempts}] Status: ${status.status}, Completed: ${status.completedStages?.join(', ') || 'none'}, Progress: ${status.progress}%`);
          
          if (status.status === 'completed') {
            console.log('\n✅ Analysis completed!');
            console.log('\nStep 3: Fetching full results...\n');
            
            // Get full analysis
            https.get(`${API_ENDPOINT}/analysis/${result.analysisId}`, (analysisRes) => {
              let analysisData = '';
              
              analysisRes.on('data', (chunk) => analysisData += chunk);
              
              analysisRes.on('end', () => {
                const analysis = JSON.parse(analysisData);
                
                console.log('='.repeat(60));
                console.log('📊 ANALYSIS RESULTS');
                console.log('='.repeat(60));
                
                if (analysis.projectReview) {
                  console.log('\n✅ Stage 1: Project Review');
                  console.log(`   Code Quality: ${analysis.projectReview.codeQuality.score}/100`);
                  console.log(`   Employability: ${analysis.projectReview.employabilitySignal.score}/100`);
                }
                
                if (analysis.intelligenceReport) {
                  console.log('\n✅ Stage 2: Intelligence Report');
                  console.log(`   Design Decisions: ${analysis.intelligenceReport.designDecisions?.length || 0}`);
                  console.log(`   Trade-offs: ${analysis.intelligenceReport.technicalTradeoffs?.length || 0}`);
                  console.log(`   Resume Bullets: ${analysis.intelligenceReport.resumeBullets?.length || 0}`);
                  
                  if (analysis.intelligenceReport.architectureOverview) {
                    console.log('\n   Architecture Overview:');
                    console.log(`   - Components: ${analysis.intelligenceReport.architectureOverview.components?.length || 0}`);
                    console.log(`   - Patterns: ${analysis.intelligenceReport.architectureOverview.patterns?.join(', ') || 'none'}`);
                  }
                }
                
                if (analysis.interviewSimulation) {
                  console.log('\n✅ Stage 3: Interview Questions');
                  console.log(`   Total Questions: ${analysis.interviewSimulation.questions?.length || 0}`);
                  console.log(`   Categories:`, analysis.interviewSimulation.categoryCounts);
                }
                
                console.log('\n' + '='.repeat(60));
                console.log('✅ All stages completed successfully!');
                console.log('='.repeat(60));
              });
            }).on('error', (err) => {
              console.error('❌ Error fetching analysis:', err.message);
            });
            
          } else if (status.status === 'failed') {
            console.error('\n❌ Analysis failed:', status.errorMessage);
          } else if (attempts >= maxAttempts) {
            console.error('\n❌ Timeout: Analysis taking too long');
          } else {
            // Check again in 10 seconds
            setTimeout(checkStatus, 10000);
          }
        });
      }).on('error', (err) => {
        console.error('❌ Error checking status:', err.message);
      });
    };
    
    // Start checking after 10 seconds
    setTimeout(checkStatus, 10000);
  });
});

req.on('error', (err) => {
  console.error('❌ Error starting analysis:', err.message);
});

req.write(postData);
req.end();
