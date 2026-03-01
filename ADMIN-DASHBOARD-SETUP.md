# 🚀 Admin Cost Dashboard - Quick Setup Guide

## 5-Minute Setup

### Step 1: Set Admin Password (30 seconds)

```bash
# Edit frontend/.env
echo "REACT_APP_ADMIN_PASSWORD=YourSecurePassword123!" >> frontend/.env
```

**⚠️ IMPORTANT:** Change `YourSecurePassword123!` to a strong password!

---

### Step 2: Build Frontend (2 minutes)

```bash
cd frontend
npm run build
```

---

### Step 3: Access Dashboard (30 seconds)

Navigate to: `http://localhost:3000/admin/cost-analytics`

Enter your password from Step 1.

---

## ✅ What You Get

### Real-Time Metrics
- Today's cost: $14.23
- This month: $142.50
- Total tokens: 458K
- Avg cost/call: $0.35

### Visual Charts
- Daily cost trends
- Model comparison
- Recent analyses

### Export Options
- CSV download
- Date range selection
- Excel-compatible

---

## 🔒 Security

### Password Protection
- ✅ No Cognito required
- ✅ Session-based auth
- ✅ Admin-only access
- ✅ Not linked to user accounts

### Access Control
- ❌ Not in sidebar
- ❌ Not in navigation
- ❌ Not discoverable by users
- ✅ Direct URL only: `/admin/cost-analytics`

---

## 📊 Dashboard Features

### 1. Real-Time Metrics (Top Cards)
```
💵 Today's Cost        📊 This Month
$14.23                 $142.50
45 API calls           Projected: $450.00

🔢 Total Tokens        📈 Avg Cost/Call
458K                   $0.35
Today                  Today's average
```

### 2. Cost by Model (Table)
```
Model                  Calls    Total Cost    Avg/Call
🦙 Llama 3.3 70B      30       $10.50        $0.350
🔷 Cohere Command R+  10       $5.00         $0.500
⭐ Amazon Nova        5        $0.15         $0.030
```

### 3. Daily Cost Trend (Chart)
```
Visual bar chart showing:
- Last 30 days of costs
- Hover for exact amounts
- Customizable date range
```

### 4. Recent Analyses (Table)
```
Repository           Analysis ID    Cost     Date
user/my-app         abc123...      $1.42    Mar 1
user/project        def456...      $1.38    Mar 1
```

### 5. Alerts
```
⚠️ Daily cost exceeded $50
ℹ️ Llama 3.3 70B usage increased 20%
```

---

## 🎯 Quick Actions

### View Today's Cost
1. Open dashboard
2. See "Today's Cost" card
3. Shows real-time total

### Export Last 30 Days
1. Click "📥 Export to CSV"
2. File downloads automatically
3. Open in Excel/Sheets

### Check Model Costs
1. Scroll to "Cost by Model" table
2. See which models cost most
3. Consider switching if needed

### View Trends
1. See "Daily Cost Trend" chart
2. Adjust date range if needed
3. Hover bars for exact costs

---

## 🔧 Configuration

### Change Password
```bash
# In frontend/.env
REACT_APP_ADMIN_PASSWORD=NewSecurePassword456!
```

### Adjust Auto-Refresh
```typescript
// In AdminCostDashboard.tsx (line 42)
setInterval(() => {
  loadDashboardData();
}, 30000); // 30 seconds (change as needed)
```

### Set Budget Alerts
```typescript
// In backend/src/cost-api.ts
if (todayCost > 50) {
  alerts.push({
    type: 'warning',
    message: 'Daily cost exceeded $50'
  });
}
```

---

## 🐛 Troubleshooting

### Can't Login
- Check password in `.env`
- Restart dev server: `npm start`
- Clear browser cache

### Shows $0.00
- Verify backend deployed
- Check cost tracking integrated
- Review CloudWatch logs

### CSV Export Fails
- Check API endpoint exists
- Verify date range valid
- Check browser console

---

## 📱 Mobile Access

Dashboard is responsive and works on:
- ✅ Desktop (best experience)
- ✅ Tablet (good)
- ✅ Mobile (basic)

---

## 🎓 Tips

### Daily Monitoring
- Check dashboard every morning
- Review cost trends weekly
- Export monthly reports

### Cost Optimization
- Identify expensive models
- Switch to cheaper alternatives
- Use prompt caching

### Security
- Use strong password (16+ chars)
- Don't share admin URL
- Logout when done
- Use HTTPS in production

---

## ✅ Checklist

Setup complete when:
- [ ] Password set in `.env`
- [ ] Frontend built successfully
- [ ] Dashboard accessible at `/admin/cost-analytics`
- [ ] Login works with password
- [ ] Metrics display correctly
- [ ] CSV export works
- [ ] Auto-refresh enabled
- [ ] Logout works

---

## 📞 Quick Links

- Full Documentation: `ADMIN-COST-DASHBOARD.md`
- Cost Tracking: `COST_TRACKING_INTEGRATION.md`
- Model Config: `MODEL-CONFIGURATION.md`

---

**Setup Time:** ~5 minutes
**Difficulty:** Easy
**Status:** ✅ Ready to Use
