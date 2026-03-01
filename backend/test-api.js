const https = require('https');

// Configuration - UPDATE THESE VALUES
const API_ENDPOINT = 'https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod';
const ID_TOKEN = 'eyJraWQiOiJ5YWQrN3NDd0lsQjhPcURWeWlLcVNvVkpid3JpTGI2K01lNW1tXC9RZng4Zz0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI5OTVhOTVmYy1jMDYxLTcwMTktODFjYi00MTg4YjJkNmI1ZGMiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLmFwLXNvdXRoZWFzdC0xLmFtYXpvbmF3cy5jb21cL2FwLXNvdXRoZWFzdC0xX1FWVGxMVlhleSIsImNvZ25pdG86dXNlcm5hbWUiOiI5OTVhOTVmYy1jMDYxLTcwMTktODFjYi00MTg4YjJkNmI1ZGMiLCJvcmlnaW5fanRpIjoiNGQ2ZDk0YjQtMGUyNy00OWYzLTlmOTktNWFmOWZjYjhjMTk3IiwiYXVkIjoiazNuazdwM2tsZ200MHJwM3FhbWk3N2xvdCIsImV2ZW50X2lkIjoiYWE5NTk3NTYtMzJjZi00Y2IxLWE3ZjctNGY0ZTQ5M2MyZjI3IiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE3NzIyMjEyNjgsImV4cCI6MTc3MjIyNDg2OCwiaWF0IjoxNzcyMjIxMjY4LCJqdGkiOiI5MGYzNTM3Mi1iOGIwLTQ0ZjUtOTY5MS00M2YyYzE2ZTVkNzEiLCJlbWFpbCI6Im5lZW1hcm91bmFrOTE3MUBnbWFpbC5jb20ifQ.f2TzaOd9VZQrxJcDqM4bT3CKGcX1JDqvWL1vwbHrjfkIhf6pzj4hnLH4WjWk-J6iEg5GpYlBgvnpHeYHi3yDJksllSTTfjISOqCUMJLc4jGkmp9vuqEUm7srnGXxF4zXYJ79fZV5v32Dc0D1jjKUWrxCOlsB_rMwApE7yT1ISnBYVyrRds9i5zf80vYrhJKkIIBmIy2Wcf3H_IXzuPznkLwcxV5VDQzXlQ9FNninV33IXdEIZ32ZYmk8MTW_Rdi3nmK9woPlY6OFmSan9Oo9MaA_-MJFgzD0SwDRLoOD7IKMPgeLgNWQz4eOmcuZ3Posina7eUO2tEr1dEFMIDGq0g'; // Get from get-token.js
const TEST_REPO = 'https://github.com/facebook/react';

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_ENDPOINT + path);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ID_TOKEN}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data ? JSON.parse(data) : null
        });
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing DevContext AI Backend API\n');
  console.log('API Endpoint:', API_ENDPOINT);
  console.log('Test Repository:', TEST_REPO);
  console.log('============================================================\n');

  try {
    // Test 1: Start analysis
    console.log('Test 1: POST /analyze - Start repository analysis');
    console.log('Request: Starting analysis for', TEST_REPO);
    
    const analyzeResponse = await makeRequest('POST', '/analyze', {
      repositoryUrl: TEST_REPO
    });
    
    console.log('Status:', analyzeResponse.status);
    console.log('Response:', JSON.stringify(analyzeResponse.body, null, 2));
    
    if (analyzeResponse.status === 200) {
      console.log('\n✅ Analysis started successfully!');
      const analysisId = analyzeResponse.body.analysisId;
      console.log('Analysis ID:', analysisId);
      
      // Test 2: Check status
      console.log('\n============================================================\n');
      console.log('Test 2: GET /analysis/{id}/status - Check analysis status');
      
      const statusResponse = await makeRequest('GET', `/analysis/${analysisId}/status`);
      console.log('Status:', statusResponse.status);
      console.log('Response:', JSON.stringify(statusResponse.body, null, 2));
      
      // Test 3: Get full analysis
      console.log('\n============================================================\n');
      console.log('Test 3: GET /analysis/{id} - Get analysis details');
      
      const detailsResponse = await makeRequest('GET', `/analysis/${analysisId}`);
      console.log('Status:', detailsResponse.status);
      console.log('Response:', JSON.stringify(detailsResponse.body, null, 2));
      
      console.log('\n============================================================\n');
      console.log('✅ All API tests completed!');
      console.log('\nNote: The analysis is running asynchronously.');
      console.log('Check the status endpoint periodically to see progress.');
    } else {
      console.log('\n❌ Analysis failed to start');
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

runTests();
