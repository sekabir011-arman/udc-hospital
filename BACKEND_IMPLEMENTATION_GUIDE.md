# Backend Admin Configuration - Implementation Guide

## Files Changed/Created

### 1. Database Migration
**File:** `src/backend/supabase/migrations/002_site_config.sql`

Creates two new tables:
- `site_config` - Current configuration storage
- `config_audit_log` - Audit trail of all changes

**Key Features:**
- Automatic timestamp tracking
- Admin user tracking
- Full JSONB storage for flexibility
- Indexed for performance
- Pre-seeded with default values

### 2. Backend API Routes
**File:** `src/backend/src/routes/config.ts`

Implements complete REST API for configuration management:
- Public GET endpoints (no auth required)
- Admin-only POST endpoints (role-based access control)
- Audit logging on every change
- Error handling and validation

**Endpoints Implemented:**
1. `GET /api/config` - Get all sections
2. `GET /api/config/:section` - Get specific section
3. `POST /api/config/:section` - Update section (admin only)
4. `POST /api/config/:section/reset` - Reset to defaults (admin only)
5. `GET /api/config/audit/logs` - View audit logs (admin only)

### 3. Backend Main File
**File:** `src/backend/src/index.ts`

**Changes:**
- Imported `configRoutes` 
- Registered routes with `app.use('/api/config', configRoutes)`
- Made routes public (no auth middleware on base path)
- Individual route handlers apply auth as needed

### 4. Frontend Hook
**File:** `src/frontend/src/hooks/useSiteConfig.tsx`

**Changes:**
- Added `useEffect` import
- Added `fetchConfigFromBackend()` function
- Added `syncToBackendAPI()` function
- Enhanced `useSiteConfig()` with backend fetch on mount
- Maintains offline-first with localStorage
- Graceful degradation if backend unavailable

---

## Deployment Checklist

### Prerequisites
- [ ] Backend running on accessible URL
- [ ] Supabase project set up and migrations ready
- [ ] Frontend environment variables configured
- [ ] JWT token generation working

### 1. Database Setup

```bash
# Navigate to backend directory
cd src/backend

# Run migrations (adjust command based on your setup)
# If using Supabase CLI:
supabase migration up

# Or if using direct SQL:
psql -h <host> -U <user> -d <database> -f supabase/migrations/002_site_config.sql
```

**Verification:**
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('site_config', 'config_audit_log');

-- Verify default data
SELECT section, jsonb_pretty(config) FROM site_config;
```

### 2. Backend Deployment

```bash
# Install dependencies (if needed)
cd src/backend
npm install

# Run tests (if available)
npm test

# Start backend
npm run dev  # Development
npm run build && npm start  # Production
```

**Verification:**
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test public config endpoint
curl http://localhost:3000/api/config

# Should return all 4 sections (hero, about, footer, emergency)
```

### 3. Frontend Configuration

**Update `.env.local`:**
```env
VITE_API_URL=http://localhost:3000  # Change to your backend URL in production
```

**For Production:**
```env
VITE_API_URL=https://your-backend-domain.com
```

### 4. Test Admin Functions

**Before testing, ensure:**
- User is logged in as admin role
- Valid JWT token in localStorage
- Backend is running and accessible

**Test Steps:**

1. **Test Public Read:**
```bash
curl http://localhost:3000/api/config/heroSection
```

2. **Test Admin Write (with auth):**
```bash
curl -X POST http://localhost:3000/api/config/heroSection \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "taglineEn": "Test Update",
      "taglineBn": "পরীক্ষা",
      "subheadingEn": "Test",
      "subheadingBn": "পরীক্ষা",
      "cta1Label": "Book",
      "cta2Label": "Emergency"
    },
    "reason": "Testing deployment"
  }'
```

3. **Check Audit Log:**
```bash
curl http://localhost:3000/api/config/audit/logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Frontend Testing

In browser admin panel:
1. [ ] Edit hero section text
2. [ ] Check browser console for sync logs
3. [ ] Verify data persists after page refresh
4. [ ] Test reset button
5. [ ] Edit while offline (use DevTools to simulate)
6. [ ] Go back online and verify sync

---

## Troubleshooting

### Backend Routes Not Working

**Error: "Cannot find module"**
- Ensure config.ts is imported in index.ts
- Check file path is correct
- Verify TypeScript compilation

**Error: 401 Unauthorized**
- Check JWT_SECRET is set correctly
- Verify token hasn't expired
- Ensure user role is 'admin'

### Database Connection Issues

**Error: "Connection refused"**
- Verify Supabase credentials in .env
- Check database is running
- Verify network connectivity

**Error: "Table doesn't exist"**
- Run migrations: `supabase migration up`
- Verify migration 002 was applied
- Check database schema

### Frontend Not Syncing

**Changes not saving to backend?**
1. Check browser console for errors
2. Verify VITE_API_URL is correct
3. Check backend is accessible: `curl $VITE_API_URL/health`
4. Verify JWT token is valid
5. Check network tab for failed requests

**Data not updating?**
1. Clear localStorage: `localStorage.removeItem('siteConfig')`
2. Refresh page
3. Check backend database directly
4. Verify admin role in user record

---

## Performance Considerations

### Database Indexes
All crucial fields are indexed:
- `site_config.section` - Fast lookups
- `config_audit_log.section` - Filter audit logs
- `config_audit_log.changed_by` - Find admin's changes
- `config_audit_log.created_at` - Timeline queries

### Caching Strategy
**Frontend:**
- localStorage cache (offline access)
- 5-minute staleness acceptable

**Backend:**
- Could add Redis cache for public endpoints
- Audit logs rarely need caching
- Write operations always hit database

**Recommended:**
```typescript
// Add Redis for public config reads
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache public endpoints but not audit logs
// Invalidate cache on POST/update
```

### Database Optimization

**For large audit logs:**
```sql
-- Archive old logs (> 1 year)
DELETE FROM config_audit_log 
WHERE created_at < NOW() - INTERVAL '1 year';

-- Or move to archive table for compliance
INSERT INTO config_audit_log_archive
SELECT * FROM config_audit_log 
WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## Security Considerations

### Input Validation

All endpoints validate:
- ✅ Section name is in whitelist
- ✅ Config is valid JSON object
- ✅ Auth token is valid JWT
- ✅ User has admin role
- ✅ Required fields present

### Rate Limiting

Consider adding rate limiting:
```typescript
// Install: npm install express-rate-limit
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/config', limiter);
```

### CORS

Currently allows all origins. For production:
```typescript
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST'],
};

app.use(cors(corsOptions));
```

---

## Monitoring

### Logs to Monitor

1. **Successful Updates:**
   - Admin user ID
   - Section updated
   - Timestamp
   - Change reason

2. **Failed Updates:**
   - Error type and message
   - Admin user ID
   - Timestamp
   - Stack trace

3. **Audit Log Growth:**
   - Track size over time
   - Archive old logs if needed

### Alerting

Setup alerts for:
- Failed config updates
- Unusual admin activity (many changes in short time)
- Database size growth
- API errors/timeouts

---

## Future Enhancements

### 1. Configuration Versioning
```sql
-- Store versions as snapshots
CREATE TABLE config_versions (
  id UUID PRIMARY KEY,
  version_number INT,
  section TEXT,
  config JSONB,
  created_at TIMESTAMP,
  created_by UUID
);
```

### 2. Configuration Rollback
```typescript
// POST /api/config/:section/rollback/:versionId
// Revert to previous version
```

### 3. Scheduled Deployments
```typescript
// POST /api/config/:section/schedule
// Deploy configuration at specific time
```

### 4. Webhooks/Notifications
```typescript
// POST /api/config/:section with webhook trigger
// Notify external services of changes
```

### 5. Comparison View
```typescript
// GET /api/config/:section/diff
// Show differences between versions
```

---

## Maintenance

### Regular Tasks

**Weekly:**
- [ ] Review audit logs for unusual activity
- [ ] Verify all sections have valid data

**Monthly:**
- [ ] Archive old audit logs if needed
- [ ] Backup database
- [ ] Review performance metrics

**Quarterly:**
- [ ] Review and update default values
- [ ] Update documentation
- [ ] Performance optimization review

---

## Support

### Common Questions

**Q: Can I update multiple sections at once?**
A: Currently no - design keeps each section independent. Could add batch endpoint if needed.

**Q: What happens if backend is down?**
A: Frontend falls back to localStorage. Changes sync when backend comes back online.

**Q: How long are audit logs kept?**
A: Currently indefinite. Recommend archiving after 1 year for compliance.

**Q: Can non-admins read the config?**
A: Yes, public endpoints allow anyone to read current config. Only admins can write.

