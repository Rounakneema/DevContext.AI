const https = require('https');

const ANALYSIS_ID = '62c77ab4-c210-4ffd-ad58-dba217997b4d';
const ID_TOKEN = 'eyJraWQiOiJ5YWQrN3NDd0lsQjhPcURWeWlLcVNvVkpid3JpTGI2K01lNW1tXC9RZng4Zz0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI5OTVhOTVmYy1jMDYxLTcwMTktODFjYi00MTg4YjJkNmI1ZGMiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLmFwLXNvdXRoZWFzdC0xLmFtYXpvbmF3cy5jb21cL2FwLXNvdXRoZWFzdC0xX1FWVGxMVlhleSIsImNvZ25pdG86dXNlcm5hbWUiOiI5OTVhOTVmYy1jMDYxLTcwMTktODFjYi00MTg4YjJkNmI1ZGMiLCJvcmlnaW5fanRpIjoiNGQ2ZDk0YjQtMGUyNy00OWYzLTlmOTktNWFmOWZjYjhjMTk3IiwiYXVkIjoiazNuazdwM2tsZ200MHJwM3FhbWk3N2xvdCIsImV2ZW50X2lkIjoiYWE5NTk3NTYtMzJjZi00Y2IxLWE3ZjctNGY0ZTQ5M2MyZjI3IiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE3NzIyMjEyNjgsImV4cCI6MTc3MjIyNDg2OCwiaWF0IjoxNzcyMjIxMjY4LCJqdGkiOiI5MGYzNTM3Mi1iOGIwLTQ0ZjUtOTY5MS00M2YyYzE2ZTVkNzEiLCJlbWFpbCI6Im5lZW1hcm91bmFrOTE3MUBnbWFpbC5jb20ifQ.f2TzaOd9VZQrxJcDqM4bT3CKGcX1JDqvWL1vwbHrjfkIhf6pzj4hnLH4WjWk-J6iEg5GpYlBgvnpHeYHi3yDJksllSTTfjISOqCUMJLc4jGkmp9vuqEUm7srnGXxF4zXYJ79fZV5v32Dc0D1jjKUWrxCOlsB_rMwApE7yT1ISnBYVyrRds9i5zf80vYrhJKkIIBmIy2Wcf3H_IXzuPznkLwcxV5VDQzXlQ9FNninV33IXdEIZ32ZYmk8MTW_Rdi3nmK9woPlY6OFmSan9Oo9MaA_-MJFgzD0SwDRLoOD7IKMPgeLgNWQz4eOmcuZ3Posina7eUO2tEr1dEFMIDGq0g';

const options = {
  hostname: '2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com',
  path: `/prod/analysis/${ANALYSIS_ID}`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${ID_TOKEN}`
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    console.log(JSON.stringify(result, null, 2));
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
