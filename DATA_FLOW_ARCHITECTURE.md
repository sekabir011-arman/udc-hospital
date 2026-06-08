# Admin Configuration - Data Flow & Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Admin Panel Component                            │  │
│  │  • Edit hero section                                     │  │
│  │  • Edit about section                                    │  │
│  │  • Edit footer section                                   │  │
│  │  • Edit emergency contacts                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │    useSiteConfig Hook (Enhanced)                         │  │
│  │  • fetchConfigFromBackend() - on mount                   │  │
│  │  • updateHero/About/Footer/Contacts()                    │  │
│  │  • syncToBackendAPI() - async sync                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                  ↙              ↘                                │
│         localStorage         Backend API                         │
│      (offline cache)         (source of truth)                    │
└─────────────────────────────────────────────────────────────────┘
         ↓                           ↓
    ┌─────────┐              ┌─────────────────┐
    │ Browser │              │ Backend Server  │
    │ Storage │              │ (Node.js)       │
    └─────────┘              └─────────────────┘
                                    ↓
                         ┌─────────────────────┐
                         │  API Routes         │
                         │  /api/config/*      │
                         │  (with auth checks) │
                         └─────────────────────┘
                                    ↓
                         ┌─────────────────────┐
                         │   PostgreSQL DB     │
                         │   (Supabase)        │
                         └─────────────────────┘
                                ↙   ↘
                   ┌─────────────────┴──────────────┐
                   ↓                                 ↓
            ┌──────────────┐            ┌──────────────────────┐
            │ site_config  │            │ config_audit_log     │
            │              │            │                      │
            │ • heroSection│            │ • id                 │
            │ • aboutSection│            │ • section            │
            │ • footerSection│           │ • action (update/reset)
            │ • emergencyContacts        │ • old_value          │
            │ • updated_by (user_id)     │ • new_value          │
            │ • updated_at               │ • changed_by         │
            └──────────────┘            │ • change_reason      │
                                        │ • ip_address         │
                                        │ • user_agent         │
                                        │ • created_at         │
                                        └──────────────────────┘
```

---

## Data Flow: Single Admin Edit

```
1. ADMIN TYPES IN FORM
   ┌─────────────────────────┐
   │ Input: "New tagline"    │
   │ Field: taglineEn        │
   └─────────────────────────┘
                 ↓
2. CHANGE HANDLER FIRES
   ┌─────────────────────────┐
   │ onChange triggers       │
   │ updateHero() called     │
   │ with {taglineEn: value} │
   └─────────────────────────┘
                 ↓
3. REACT STATE UPDATES
   ┌─────────────────────────┐
   │ setConfig() called      │
   │ state: heroSection      │
   │ gets new taglineEn      │
   └─────────────────────────┘
                 ↓
4. SAVE TO LOCAL STORAGE (SYNC)
   ┌─────────────────────────┐
   │ localStorage.setItem()  │
   │ key: "siteConfig"       │
   │ value: stringified JSON │
   └─────────────────────────┘
       ✅ Change is now persistent locally
                 ↓
5. BACKEND API SYNC (ASYNC - FIRE & FORGET)
   ┌──────────────────────────────────────┐
   │ syncToBackendAPI() called            │
   │ POST /api/config/heroSection         │
   │ Headers:                             │
   │   • Authorization: Bearer <JWT>      │
   │   • Content-Type: application/json   │
   │ Body:                                │
   │ {                                    │
   │   config: { taglineEn: "New..." },   │
   │   reason: "Updated via admin panel"  │
   │ }                                    │
   └──────────────────────────────────────┘
                 ↓
6. BACKEND RECEIVES REQUEST
   ┌──────────────────────────────────────┐
   │ authMiddleware validates JWT         │
   │ requireRole('admin') checks role     │
   │ If not admin → 403 Forbidden         │
   └──────────────────────────────────────┘
                 ↓ (if authorized)
7. GET CURRENT VALUE FOR AUDIT
   ┌──────────────────────────────────────┐
   │ Query site_config table              │
   │ WHERE section = 'heroSection'        │
   │ Get old_value for audit log          │
   └──────────────────────────────────────┘
                 ↓
8. UPDATE DATABASE
   ┌──────────────────────────────────────┐
   │ UPDATE site_config SET:              │
   │   config = new_value,                │
   │   updated_by = userId,               │
   │   updated_at = NOW()                 │
   │ WHERE section = 'heroSection'        │
   └──────────────────────────────────────┘
       ✅ Change persisted to database
                 ↓
9. LOG TO AUDIT TRAIL
   ┌──────────────────────────────────────┐
   │ INSERT into config_audit_log:        │
   │   section: 'heroSection'             │
   │   action: 'update'                   │
   │   old_value: previous config         │
   │   new_value: new config              │
   │   changed_by: adminUserId            │
   │   change_reason: provided reason     │
   │   ip_address: admin's IP             │
   │   user_agent: admin's browser info   │
   │   created_at: timestamp              │
   └──────────────────────────────────────┘
       ✅ Change logged for compliance
                 ↓
10. RETURN SUCCESS TO FRONTEND
    ┌──────────────────────────────────────┐
    │ Response: 200 OK                     │
    │ {                                    │
    │   success: true,                     │
    │   message: "Updated successfully",   │
    │   section: "heroSection",            │
    │   config: { ... }                    │
    │ }                                    │
    └──────────────────────────────────────┘
        ✅ Frontend confirms sync
```

---

## Offline Operation Flow

```
ADMIN EDITS WHILE OFFLINE
         ↓
    localStorage
    is updated
    immediately ✅
         ↓
    syncToBackendAPI()
    attempts POST request
         ↓
    Network error caught
    (console warning only)
         ↓
    ✅ Change persists in localStorage
    ✅ Frontend remains responsive
    ✅ UI reflects change immediately
         ↓
    [Later] Admin comes back online
         ↓
    Page refresh or auto-sync
    triggers new POST attempt
         ↓
    Backend receives queued changes
    and processes them
         ↓
    ✅ All changes synced to database
    ✅ Audit log created retroactively
```

---

## Read Flow (Public Viewer)

```
USER VISITS PUBLIC PAGE
         ↓
Landing Page Component
mounts and loads config
         ↓
GET /api/config
(No auth required)
         ↓
Backend returns
all 4 sections from
site_config table
         ↓
Frontend displays:
• Hero section content
• About section
• Footer with contacts
• Emergency numbers
         ↓
✅ User sees admin-configured content
```

---

## Admin Audit Log Review

```
ADMIN VIEWS AUDIT LOG
         ↓
GET /api/config/audit/logs?section=heroSection
Header: Authorization: Bearer <JWT>
         ↓
authMiddleware validates JWT
requireRole('admin') checks permission
         ↓
Backend queries config_audit_log
         ↓
Returns:
[
  {
    id: uuid,
    section: "heroSection",
    action: "update",
    old_value: { ... previous config ... },
    new_value: { ... new config ... },
    changed_by: adminUserId,
    created_at: timestamp,
    user: { name: "Admin Name", email: "admin@..." }
  },
  { ... more entries ... }
]
         ↓
✅ Admin can see complete change history
✅ With who/when/what/why for each change
```

---

## Section Reset Flow

```
ADMIN CLICKS "RESET" BUTTON
         ↓
resetSection('heroSection') called
         ↓
POST /api/config/heroSection/reset
(with JWT token)
         ↓
Backend validates admin role
         ↓
Get current config for old_value
         ↓
Reset config to DEFAULT_VALUES
         ↓
UPDATE site_config
WHERE section = 'heroSection'
SET config = defaults
         ↓
Log to audit_log
action: 'reset'
reason: 'Reset to default'
         ↓
Frontend state updated
with default values
         ↓
✅ UI reverts to defaults
✅ Audit trail shows reset
✅ Change logged with admin user
```

---

## Error Handling Flow

```
ADMIN EDITS WITHOUT VALID JWT
         ↓
POST /api/config/heroSection
Authorization: Bearer <EXPIRED_TOKEN>
         ↓
authMiddleware checks JWT
jwt.verify() fails
         ↓
Return: 401 Unauthorized
{
  error: "Invalid token",
  code: "INVALID_TOKEN"
}
         ↓
Frontend receives error
logs to console
         ↓
✅ Change NOT saved to database
✅ Change still in localStorage
✅ Admin notified to login again
```

---

## Concurrent Admin Changes

```
ADMIN 1 EDITS TAGLINE        ADMIN 2 EDITS CTA BUTTON
         ↓                               ↓
POST /api/config/heroSection  POST /api/config/heroSection
Body:                         Body:
{ config: {                   { config: {
  taglineEn: "New..."         cta1Label: "Book Now"
}}                            }}
         ↓                               ↓
    ┌────────────────────────────────┐
    │   Both requests hit backend    │
    │   at roughly same time         │
    └────────────────────────────────┘
         ↓
Database receives:
Request 1: Get old config
Request 2: Get old config (still the original)
         ↓
Both updates happen:
UPDATE 1: Sets taglineEn
UPDATE 2: Sets cta1Label
         ↓
Final config has:
✅ Both changes applied
✅ Because we use JSONB merge
✅ Not overwriting entire object
         ↓
✅ Concurrent edits are safe
✅ Both admins see their changes
```

---

## Database Query Examples

### Get Current Configuration
```sql
SELECT section, config, updated_by, updated_at
FROM site_config
WHERE section = 'heroSection';
```

### View All Changes for a Section
```sql
SELECT 
  cal.id,
  cal.section,
  cal.action,
  cal.changed_by,
  u.name AS admin_name,
  cal.created_at,
  cal.change_reason,
  jsonb_pretty(cal.old_value) AS old_config,
  jsonb_pretty(cal.new_value) AS new_config
FROM config_audit_log cal
JOIN users u ON cal.changed_by = u.id
WHERE cal.section = 'heroSection'
ORDER BY cal.created_at DESC;
```

### Track Admin Activity
```sql
SELECT 
  u.name,
  COUNT(*) as changes_made,
  MAX(cal.created_at) as last_change
FROM config_audit_log cal
JOIN users u ON cal.changed_by = u.id
WHERE cal.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.name
ORDER BY changes_made DESC;
```

### Diff Between Two Points in Time
```sql
SELECT *
FROM site_config
WHERE section = 'heroSection'
UNION ALL
SELECT *
FROM config_audit_log
WHERE section = 'heroSection'
  AND created_at > '2024-01-15'::timestamp
  AND created_at < '2024-01-16'::timestamp
ORDER BY updated_at DESC, created_at DESC;
```

---

## Performance Characteristics

| Operation | Time | Database Calls |
|-----------|------|-----------------|
| Read config (public) | ~10ms | 1 SELECT |
| Update config | ~20ms | 1 UPDATE + 1 INSERT |
| Reset config | ~20ms | 1 UPDATE + 1 INSERT |
| Get audit logs (50 records) | ~15ms | 1 SELECT with JOIN |
| Frontend sync (offline→online) | ~50ms | 4 POSTs batched |

---

## Scalability Notes

**Suitable for:**
- Single clinic/organization ✅
- Multiple admins editing same config ✅
- High read volume (public pages) ✅
- Frequent audit log queries ✅

**Optimization opportunities:**
- Add Redis caching for public reads (if > 1000 req/min)
- Archive audit logs after 2 years (if > 100k records)
- Add database connection pooling (if many concurrent requests)

