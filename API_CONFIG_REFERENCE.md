# Admin Configuration API - Quick Reference

## Overview

All admin edits to the site configuration (hero section, about section, footer, emergency contacts) are now stored in the backend database with full audit logging.

## API Endpoints

### Public Endpoints (No Auth Required)

#### Get All Configuration
```bash
GET /api/config
```

**Response:**
```json
{
  "heroSection": { ... },
  "aboutSection": { ... },
  "footerSection": { ... },
  "emergencyContacts": [ ... ]
}
```

#### Get Specific Section
```bash
GET /api/config/heroSection
```

**Response:**
```json
{
  "heroSection": {
    "taglineEn": "Dr. Arman Kabir's Care",
    "taglineBn": "ডা. আরমান কবিরের চেম্বার",
    "subheadingEn": "...",
    "cta1Label": "Book Appointment",
    "cta2Label": "Emergency"
  }
}
```

---

### Admin-Only Endpoints (Auth Required)

#### Update Configuration Section
```bash
POST /api/config/:section
Authorization: Bearer <JWT_TOKEN>

{
  "config": {
    "taglineEn": "New tagline",
    "taglineBn": "নতুন ট্যাগলাইন",
    "subheadingEn": "Updated subheading",
    "subheadingBn": "আপডেট করা সাব-হেডিং",
    "cta1Label": "Schedule Now",
    "cta2Label": "Emergency Support"
  },
  "reason": "Updated tagline for new campaign"
}
```

**Response:**
```json
{
  "success": true,
  "message": "heroSection updated successfully",
  "section": "heroSection",
  "config": { ... }
}
```

**Valid Sections:**
- `heroSection`
- `aboutSection`
- `footerSection`
- `emergencyContacts`

---

#### Reset Section to Default
```bash
POST /api/config/:section/reset
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "message": "heroSection reset to default successfully",
  "section": "heroSection",
  "config": {
    "taglineEn": "Dr. Arman Kabir's Care",
    "taglineBn": "ডা. আরমান কবিরের চেম্বার",
    "..."
  }
}
```

---

#### View Audit Logs
```bash
GET /api/config/audit/logs?section=heroSection&limit=50&offset=0
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `section` (optional) - Filter by section name
- `limit` (optional, default: 50) - Number of records to return
- `offset` (optional, default: 0) - Starting position

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "section": "heroSection",
      "action": "update",
      "changed_by": "user-uuid",
      "created_at": "2024-01-15T10:30:00Z",
      "change_reason": "Updated tagline for new campaign",
      "users": {
        "name": "Dr. Arman Kabir",
        "email": "dr.armankabir011@gmail.com"
      }
    }
  ],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

---

## Frontend Integration

### Automatic Behavior

The frontend automatically:

1. **Fetches on Mount** - Loads latest config from backend when the app starts
2. **Stores Locally** - Keeps a copy in localStorage for offline access
3. **Syncs on Edit** - When admin makes changes:
   - Saves to localStorage immediately
   - Sends to backend API asynchronously
   - Logs the audit trail
4. **Handles Offline** - If backend unavailable, changes stored locally and queued for sync

### Code Example

```typescript
import { useSiteConfig } from '@/hooks/useSiteConfig';

function AdminPanel() {
  const { config, updateHero, updateAbout, resetSection } = useSiteConfig();

  // Update hero section
  const handleHeroChange = (newTagline: string) => {
    updateHero({ taglineEn: newTagline });
    // Automatically synced to backend
  };

  // Reset to defaults
  const handleReset = () => {
    resetSection('heroSection');
    // Change logged in audit trail
  };

  return (
    <div>
      <input 
        value={config.heroSection.taglineEn}
        onChange={(e) => handleHeroChange(e.target.value)}
      />
      <button onClick={handleReset}>Reset</button>
    </div>
  );
}
```

---

## Data Structure Reference

### Hero Section
```typescript
{
  taglineEn: string;
  taglineBn: string;
  subheadingEn: string;
  subheadingBn: string;
  heroTaglineEn?: string;
  heroTaglineBn?: string;
  heroDescriptionEn?: string;
  heroDescriptionBn?: string;
  cta1Label: string;
  cta2Label: string;
}
```

### About Section
```typescript
{
  visible: boolean;
  clinicNameEn: string;
  clinicNameBn: string;
  descriptionEn: string;
  descriptionBn: string;
  yearsExperience: number;
  patientCount: string;
  doctorCount: number;
  specialties: string[];
  affiliations: string[];
}
```

### Footer Section
```typescript
{
  addressEn: string;
  addressBn: string;
  phone: string;
  email: string;
  openingHours: string;
  copyrightText: string;
  socialLinks: Array<{
    label: string;
    url: string;
    icon: string;
  }>;
}
```

### Emergency Contacts
```typescript
{
  contacts: Array<{
    doctorName: string;
    whatsappNumber: string;
    prefilledMessage: string;
  }>;
}
```

---

## Error Handling

### Common Error Responses

**Unauthorized (401)**
```json
{
  "error": "Invalid token",
  "code": "INVALID_TOKEN"
}
```

**Forbidden (403)**
```json
{
  "error": "Insufficient permissions",
  "code": "FORBIDDEN"
}
```

**Invalid Request (400)**
```json
{
  "error": "Invalid section",
  "code": "INVALID_SECTION"
}
```

**Server Error (500)**
```json
{
  "error": "Failed to update configuration",
  "code": "UPDATE_ERROR"
}
```

---

## Audit Trail Tracking

Every configuration change is automatically logged with:

| Field | Description |
|-------|-------------|
| `section` | Which config section was changed |
| `action` | Either "update" or "reset" |
| `old_value` | Previous configuration |
| `new_value` | New configuration |
| `changed_by` | Admin user ID who made the change |
| `change_reason` | Optional note about why change was made |
| `ip_address` | Admin's IP address |
| `user_agent` | Browser/client information |
| `created_at` | Timestamp of change |

---

## Configuration File Management

All configuration is stored in Supabase:

**Table: `site_config`**
- Stores current configuration per section
- One row per section with UNIQUE constraint
- Includes `updated_by` user ID
- Tracks timestamps

**Table: `config_audit_log`**
- Full audit history
- Every change is immutable
- Can be used for compliance/compliance audits
- Indexed by section, user, and timestamp

---

## Best Practices

1. ✅ **Always provide a reason** - Include `reason` field for important changes
2. ✅ **Check audit logs** - Review who made what changes and when
3. ✅ **Test offline** - Ensure changes queue correctly when offline
4. ✅ **Use JWT tokens** - Ensure secure authentication for all admin operations
5. ✅ **Version control** - Keep track of configuration versions
6. ✅ **Regular exports** - Consider backing up configuration periodically

---

## Troubleshooting

### Changes not syncing to backend?
- Check browser console for errors
- Verify JWT token is valid
- Ensure backend is running
- Check network tab for failed requests

### Can't access audit logs?
- Verify user has 'admin' role
- Check JWT token validity
- Ensure API endpoint is accessible

### Data not reflecting after changes?
- Clear browser cache
- Refresh page
- Check localStorage in DevTools
- Verify backend database has updated values

