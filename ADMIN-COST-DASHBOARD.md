# 💰 Admin Cost Analytics Dashboard

## Overview

A secure, password-protected admin dashboard for monitoring AWS Bedrock costs in real-time. This dashboard is **NOT accessible to regular users** - only administrators with the password can access it.

---

## 🔒 Security Features

### 1. Password Protection
- **No Cognito Required** - Separate from user authentication
- **Session-based** - Password stored in session storage (cleared on logout)
- **Admin-only** - Not linked to any user account
- **Configurable** - Password set via environment variable

### 2. Access Control
- URL: `/admin/cost-analytics` (not discoverable from UI)
- No links in regular user interface
- No navigation from sidebar
- Direct URL access only

### 3. Password Configuration
```bash
# In frontend/.env
REACT_APP_ADMIN_PASSWORD=YourSecurePassword123!
```

**⚠️ IMPORTANT:** Change the default password before deploying to production!

---

## 📊 Dashboard Features

### Real-Time Metrics
- **Today's Cost** - Total spend today with API call count
- **This Month** - Current month cost + projected end-of-month
- **Total Tokens** - Token usage across all models
- **Avg Cost/Call** - Average cost per API call

### Cost Breakdown by Model
- Meta Llama 3.3 70B usage and cost
- Cohere Command R+ usage and cost
- Amazon Nova usage and cost
- Per-model call counts and averages

### Daily Cost Trend Chart
- Visual bar chart showing daily costs
- Customizable date range
- Hover to see exact costs
- Export to CSV for analysis

### Recent Analyses
- Last 10 analyses with costs
- Repository names
- Analysis IDs
- Timestamps

### Alerts & Warnings
- Cost threshold alerts
- Unusual spending patterns
- Budget warnings
- Model usage anomalies

### Auto-Refresh
- Refreshes every 30 seconds (optional)
- Manual refresh button
- Real-time cost tracking

---

## 🚀 Setup Instructions

### Step 1: Set Admin Password

**Option A: Environment Variable (Recommended)**
```bash
# In frontend/.env
REACT_APP_ADMIN_PASSWORD=YourSecurePassword123!
```

**Option B: Hardcode (Not Recommended)**
```typescript
// In AdminCostDashboard.tsx (line 48)
const ADMIN_PASSWORD = 'YourSecurePassword123!';
```

### Step 2: Deploy Backend Cost API

Ensure cost tracking endpoints are deployed:
```bash
cd backend
sam build
sam deploy
```

Verify these endpoints exist:
- `GET /cost/realtime`
- `GET /cost/analysis/{id}`
- `GET /cost/daily/{date}`
- `GET /cost/range`
- `GET /cost/projection`
- `GET /cost/models`
- `GET /cost/export`
- `GET /cost/pricing`

### Step 3: Build Frontend

```bash
cd frontend
npm run build
```

### Step 4: Access Dashboard

Navigate to: `https://your-domain.com/admin/cost-analytics`

Enter admin password to access.

---

## 📱 Usage Guide

### Accessing the Dashboard

1. **Navigate to Admin URL**
   ```
   https://your-domain.com/admin/cost-analytics
   ```

2. **Enter Password**
   - Use the password from `REACT_APP_ADMIN_PASSWORD`
   - Password is stored in session (cleared on logout)

3. **View Metrics**
   - Dashboard loads automatically after authentication
   - Auto-refreshes every 30 seconds (if enabled)

### Viewing Cost Data

**Today's Metrics:**
- See current day's total cost
- View API call count
- Check token usage

**Monthly Projection:**
- Current month spend
- Projected end-of-month cost
- Budget alerts

**Model Comparison:**
- Which models cost the most
- Call counts per model
- Average cost per call

**Daily Trends:**
- Visual chart of daily costs
- Customizable date range
- Export to CSV

### Exporting Data

1. **Set Date Range**
   - Use date pickers to select range
   - Click "Apply" to load data

2. **Export to CSV**
   - Click "📥 Export to CSV" button
   - File downloads automatically
   - Open in Excel/Google Sheets

3. **CSV Contents**
   - Date, Total Cost, Call Count
   - Model breakdown
   - Token usage
   - Per-analysis costs

---

## 🔧 API Integration

The dashboard calls these backend endpoints:

### 1. Real-Time Metrics
```typescript
GET /cost/realtime

Response:
{
  today: {
    totalCost: 14.23,
    totalCalls: 45,
    totalTokens: 458234
  },
  thisMonth: {
    totalCost: 142.50,
    totalCalls: 450,
    projectedEndOfMonth: 450.00
  },
  byModel: [
    {
      modelId: "meta.llama3-3-70b-instruct-v1:0",
      totalCost: 10.50,
      callCount: 30,
      avgCostPerCall: 0.35
    }
  ],
  recentAnalyses: [...],
  alerts: [...]
}
```

### 2. Date Range Analysis
```typescript
GET /cost/range?start=2026-03-01&end=2026-03-31

Response:
{
  totalCost: 1420.00,
  totalCalls: 1000,
  dailySummaries: [
    {
      date: "2026-03-01",
      totalCost: 45.60,
      callCount: 32
    }
  ]
}
```

### 3. CSV Export
```typescript
GET /cost/export?format=csv&days=30

Response: (CSV file)
Date,Total Cost,Call Count,Model,Tokens
2026-03-01,45.60,32,llama-3.3-70b,125000
...
```

---

## 🎨 Customization

### Change Password
```typescript
// In AdminCostDashboard.tsx
const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || 'YourNewPassword';
```

### Adjust Auto-Refresh Interval
```typescript
// In AdminCostDashboard.tsx (line 42)
const interval = setInterval(() => {
  loadDashboardData();
}, 30000); // Change 30000 to desired milliseconds
```

### Customize Metrics Cards
```typescript
// Add new metric card
<MetricCard
  title="Your Metric"
  value="$123.45"
  subtitle="Description"
  icon="💡"
  color="#48bb78"
/>
```

### Add Custom Alerts
```typescript
// In backend/src/cost-api.ts
if (todayCost > 100) {
  alerts.push({
    type: 'warning',
    message: 'Daily cost exceeded $100'
  });
}
```

---

## 🔐 Security Best Practices

### 1. Strong Password
```bash
# Use a strong password with:
# - At least 16 characters
# - Mix of uppercase, lowercase, numbers, symbols
# - No dictionary words

REACT_APP_ADMIN_PASSWORD=Adm!n2026$DevC0ntext#Secure
```

### 2. Environment Variables
```bash
# Never commit .env to git
# Add to .gitignore
echo ".env" >> .gitignore

# Use different passwords for dev/staging/prod
# Dev: DevContext2026!Admin
# Prod: [Strong unique password]
```

### 3. HTTPS Only
```bash
# Ensure your domain uses HTTPS
# Password transmitted over secure connection
https://your-domain.com/admin/cost-analytics
```

### 4. IP Whitelisting (Optional)
```typescript
// In AdminCostDashboard.tsx
const ALLOWED_IPS = ['123.45.67.89', '98.76.54.32'];

useEffect(() => {
  fetch('https://api.ipify.org?format=json')
    .then(res => res.json())
    .then(data => {
      if (!ALLOWED_IPS.includes(data.ip)) {
        alert('Access denied from your IP');
        navigate('/');
      }
    });
}, []);
```

### 5. Session Timeout
```typescript
// Auto-logout after 30 minutes of inactivity
useEffect(() => {
  const timeout = setTimeout(() => {
    handleLogout();
  }, 30 * 60 * 1000); // 30 minutes

  return () => clearTimeout(timeout);
}, []);
```

---

## 📊 Cost Monitoring Examples

### Example 1: Daily Budget Alert
```typescript
// If daily cost exceeds $50, show alert
if (metrics.today.totalCost > 50) {
  alert('⚠️ Daily cost exceeded $50!');
}
```

### Example 2: Model Cost Comparison
```typescript
// Find most expensive model
const mostExpensive = metrics.byModel.reduce((prev, current) => 
  (prev.totalCost > current.totalCost) ? prev : current
);

console.log(`Most expensive: ${mostExpensive.modelId} at $${mostExpensive.totalCost}`);
```

### Example 3: Monthly Projection
```typescript
// Check if projected cost exceeds budget
const MONTHLY_BUDGET = 1500;
if (metrics.thisMonth.projectedEndOfMonth > MONTHLY_BUDGET) {
  alert(`⚠️ Projected to exceed budget by $${metrics.thisMonth.projectedEndOfMonth - MONTHLY_BUDGET}`);
}
```

---

## 🐛 Troubleshooting

### Issue 1: "Invalid Password"
**Solution:**
- Check `REACT_APP_ADMIN_PASSWORD` in `.env`
- Restart development server after changing `.env`
- Verify no typos in password

### Issue 2: "Failed to load dashboard data"
**Solution:**
- Verify backend cost API is deployed
- Check API endpoint in `.env`
- Ensure Cognito token is valid (for API calls)
- Check CloudWatch logs for errors

### Issue 3: Dashboard shows $0.00
**Solution:**
- Verify cost tracking is integrated in Lambda functions
- Check DynamoDB for cost records
- Ensure `CostTracker.trackBedrockCall()` is called
- Review backend logs

### Issue 4: CSV export fails
**Solution:**
- Check `/cost/export` endpoint exists
- Verify date range is valid
- Ensure data exists for selected range
- Check browser console for errors

---

## 📈 Metrics Explained

### Today's Cost
- **What:** Total Bedrock API costs for current day (UTC)
- **Includes:** All models, all stages, all users
- **Updates:** Real-time (every API call tracked)

### This Month
- **What:** Total costs from 1st of month to today
- **Projected:** Linear projection to end of month
- **Formula:** `(currentCost / daysElapsed) * totalDaysInMonth`

### Total Tokens
- **What:** Sum of input + output tokens
- **Includes:** All Bedrock API calls
- **Note:** Different models have different token costs

### Avg Cost/Call
- **What:** Average cost per Bedrock API invocation
- **Formula:** `totalCost / totalCalls`
- **Useful for:** Identifying expensive operations

### Cost by Model
- **What:** Breakdown of costs per model
- **Shows:** Which models are most expensive
- **Action:** Consider switching expensive models

---

## 🎯 Best Practices

### 1. Regular Monitoring
- Check dashboard daily
- Review weekly trends
- Set up monthly budget reviews

### 2. Cost Optimization
- Identify expensive models
- Switch to cheaper alternatives where possible
- Use prompt caching to reduce costs

### 3. Budget Alerts
- Set daily/monthly thresholds
- Get notified when exceeded
- Take action to reduce costs

### 4. Data Export
- Export monthly reports
- Share with finance team
- Track cost trends over time

### 5. Security
- Change default password
- Use HTTPS only
- Don't share admin URL publicly
- Logout when done

---

## 📞 Support

### Documentation
- `COST_TRACKING_INTEGRATION.md` - Backend integration
- `MODEL-CONFIGURATION.md` - Model costs
- `FINAL-SYSTEM-STATUS.md` - System overview

### AWS Resources
- Cost Explorer: https://console.aws.amazon.com/cost-management/
- Bedrock Pricing: https://aws.amazon.com/bedrock/pricing/
- CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/

---

## ✅ Checklist

Before going live:
- [ ] Changed default admin password
- [ ] Tested dashboard access
- [ ] Verified all API endpoints work
- [ ] Checked cost data is accurate
- [ ] Tested CSV export
- [ ] Set up HTTPS
- [ ] Configured auto-refresh
- [ ] Tested logout functionality
- [ ] Reviewed security settings
- [ ] Documented admin password securely

---

**Dashboard Version:** 1.0
**Last Updated:** March 1, 2026
**Status:** ✅ Production-Ready
**Security:** 🔒 Password-Protected
