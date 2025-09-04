# Dropdown API Documentation

## Overview

This document provides comprehensive API documentation for all dropdown endpoints in the COS360 multi-tenant school management system. Dropdown endpoints are optimized for UI components and provide minimal data (id + name/title) for maximum performance.

**Key Features:**
- **Rate Limited**: 100 requests per minute per endpoint
- **Cached**: 5-minute server-side caching with automatic invalidation
- **Multi-tenant Support**: Automatic tenant detection via headers
- **Consistent Schema**: All dropdowns follow standardized patterns
- **Active Filtering**: Optional filtering for active records only

## Base URL Structure

All dropdown endpoints follow the pattern:
```
/api/v1/{module}/{entity}/dropdown
```

## Authentication

All endpoints require proper multi-tenant authentication. Include the tenant identifier in the request headers:

```
X-Client-Name: cos360_main
```

**Note**: Replace `cos360_main` with your actual tenant identifier.

## Rate Limiting

All dropdown endpoints are rate limited to **100 requests per minute**. Exceeding this limit will result in:

```json
{
  "detail": "Rate limit exceeded. Try again later."
}
```

## Caching

- All responses are cached for **5 minutes** on the server
- Cache is automatically invalidated when underlying data changes
- Cached responses include `Cache-Control` headers

## Error Handling

### Common HTTP Status Codes

| Status Code | Description | Example Response |
|-------------|-------------|------------------|
| 200 | Success | Dropdown data returned |
| 404 | Not Found | Endpoint or tenant not found |
| 422 | Validation Error | Invalid parameters |
| 429 | Rate Limit Exceeded | Too many requests |
| 500 | Server Error | Internal server error |

### Error Response Format
```json
{
  "detail": "Error description"
}
```

---

# 1. Academic Years Dropdown

## Overview
Get academic years for dropdown selection with id and title only.

## Endpoint
**GET** `/api/v1/masters/academic_years/dropdown`

## Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| active_only | boolean | No | true | Filter only active academic years |

## Request Example
```bash
curl -H "X-Client-Name: cos360_main" \
  "http://localhost:8000/api/v1/masters/academic_years/dropdown?active_only=true"
```

## Response Schema
```json
[
  {
    "id": "integer",
    "title": "string"
  }
]
```

## Response Example
```json
[
  {
    "id": 1,
    "title": "AY-2025-26"
  },
  {
    "id": 2,
    "title": "AY-2024-25"
  }
]
```

---

# 2. Classes Dropdown

## Overview
Get classes for dropdown selection with id and name only.

## Endpoint
**GET** `/api/v1/masters/class_sections/dropdown`

## Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| active_only | boolean | No | true | Filter only active classes |

## Request Example
```bash
curl -H "X-Client-Name: cos360_main" \
  "http://localhost:8000/api/v1/masters/class_sections/dropdown?active_only=true"
```

## Response Schema
```json
[
  {
    "id": "integer",
    "name": "string"
  }
]
```

## Response Example
```json
[
  {
    "id": 1,
    "name": "First Class"
  },
  {
    "id": 2,
    "name": "Second Class"
  },
  {
    "id": 3,
    "name": "UKG"
  }
]
```

---

# 3. Sections by Class Dropdown

## Overview
Get sections for a specific class for dropdown selection.

## Endpoint
**GET** `/api/v1/masters/class_sections/by_class_id/{class_id}/sections`

## Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| class_id | integer | Yes | ID of the class |

## Request Example
```bash
curl -H "X-Client-Name: cos360_main" \
  "http://localhost:8000/api/v1/masters/class_sections/by_class_id/1/sections"
```

## Response Schema
```json
[
  {
    "id": "integer",
    "name": "string"
  }
]
```

## Response Example
```json
[
  {
    "id": 1,
    "name": "A"
  },
  {
    "id": 2,
    "name": "B"
  },
  {
    "id": 3,
    "name": "C"
  }
]
```

---

# 4. Subject Categories Dropdown

## Overview
Get subject categories for dropdown selection with id and name only.

## Endpoint
**GET** `/api/v1/masters/subject_categories/categories/dropdown`

## Request Example
```bash
curl -H "X-Client-Name: cos360_main" \
  "http://localhost:8000/api/v1/masters/subject_categories/categories/dropdown"
```

## Response Schema
```json
[
  {
    "id": "integer",
    "name": "string"
  }
]
```

## Response Example
```json
[
  {
    "id": 1,
    "name": "Academic"
  },
  {
    "id": 2,
    "name": "Extra-Curricular"
  },
  {
    "id": 3,
    "name": "Sports"
  }
]
```

---

# 5. Subjects Dropdown

## Overview
Get subjects for dropdown selection with id and name only.

## Endpoint
**GET** `/api/v1/masters/subjects/dropdown`

## Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| active_only | boolean | No | true | Filter only active subjects |

## Request Example
```bash
curl -H "X-Client-Name: cos360_main" \
  "http://localhost:8000/api/v1/masters/subjects/dropdown?active_only=true"
```

## Response Schema
```json
[
  {
    "id": "integer",
    "name": "string"
  }
]
```

## Response Example
```json
[
  {
    "id": 1,
    "name": "Mathematics"
  },
  {
    "id": 2,
    "name": "English"
  },
  {
    "id": 3,
    "name": "Science"
  }
]
```

---

# 6. Subjects by Category Dropdown

## Overview
Get subjects for a specific category for dropdown selection.

## Endpoint
**GET** `/api/v1/masters/subjects/categories/{category_id}/subjects/dropdown`

## Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category_id | integer | Yes | ID of the subject category |

## Request Example
```bash
curl -H "X-Client-Name: cos360_main" \
  "http://localhost:8000/api/v1/masters/subjects/categories/1/subjects/dropdown"
```

## Response Schema
```json
[
  {
    "id": "integer",
    "name": "string"
  }
]
```

## Response Example
```json
[
  {
    "id": 1,
    "name": "Mathematics"
  },
  {
    "id": 2,
    "name": "English"
  },
  {
    "id": 3,
    "name": "Science"
  }
]
```

---

# 7. Transport Routes Dropdown

## Overview
Get transport routes for dropdown selection with id and route name.

## Endpoint
**GET** `/api/v1/masters/routes/dropdown`

## Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| active_only | boolean | No | true | Filter only active routes |

## Request Example
```bash
curl -H "X-Client-Name: cos360_main" \
  "http://localhost:8000/api/v1/masters/routes/dropdown?active_only=true"
```

## Response Schema
```json
[
  {
    "id": "integer",
    "route_name": "string"
  }
]
```

## Response Example
```json
[
  {
    "id": 1,
    "route_name": "LB-Narsingi"
  },
  {
    "id": 2,
    "route_name": "Hitech City-Gachibowli"
  },
  {
    "id": 3,
    "route_name": "Kondapur-KPHB"
  }
]
```

---

# 8. Holidays Dropdown

## Overview
Get holidays for dropdown selection with id and name only.

## Endpoint
**GET** `/api/v1/masters/holidays/dropdown`

## Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| active_only | boolean | No | true | Filter only active holidays |

## Request Example
```bash
curl -H "X-Client-Name: cos360_main" \
  "http://localhost:8000/api/v1/masters/holidays/dropdown?active_only=true"
```

## Response Schema
```json
[
  {
    "id": "integer",
    "name": "string"
  }
]
```

## Response Example
```json
[
  {
    "id": 1,
    "name": "Diwali"
  },
  {
    "id": 2,
    "name": "Christmas"
  },
  {
    "id": 3,
    "name": "Summer Vacation"
  }
]
```

---

# UI Integration Guide

## React/Vue.js Integration Example

### 1. Academic Years Dropdown Component

```javascript
// React example
import { useState, useEffect } from 'react';

const AcademicYearDropdown = ({ onSelect }) => {
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        const response = await fetch('/api/v1/masters/academic_years/dropdown', {
          headers: {
            'X-Client-Name': 'cos360_main'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setAcademicYears(data);
        }
      } catch (error) {
        console.error('Failed to fetch academic years:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAcademicYears();
  }, []);

  if (loading) return <div>Loading academic years...</div>;

  return (
    <select onChange={(e) => onSelect(e.target.value)}>
      <option value="">Select Academic Year</option>
      {academicYears.map(year => (
        <option key={year.id} value={year.id}>
          {year.title}
        </option>
      ))}
    </select>
  );
};

export default AcademicYearDropdown;
```

### 2. Cascading Dropdowns (Class -> Sections)

```javascript
// Cascading dropdown example
const ClassSectionCascade = () => {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    // Fetch classes on component mount
    fetchClasses();
  }, []);

  useEffect(() => {
    // Fetch sections when class changes
    if (selectedClass) {
      fetchSections(selectedClass);
    } else {
      setSections([]);
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    const response = await fetch('/api/v1/masters/class_sections/dropdown', {
      headers: { 'X-Client-Name': 'cos360_main' }
    });
    
    if (response.ok) {
      const data = await response.json();
      setClasses(data);
    }
  };

  const fetchSections = async (classId) => {
    const response = await fetch(
      `/api/v1/masters/class_sections/by_class_id/${classId}/sections`,
      {
        headers: { 'X-Client-Name': 'cos360_main' }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      setSections(data);
    }
  };

  return (
    <div>
      <select 
        value={selectedClass} 
        onChange={(e) => setSelectedClass(e.target.value)}
      >
        <option value="">Select Class</option>
        {classes.map(cls => (
          <option key={cls.id} value={cls.id}>
            {cls.name}
          </option>
        ))}
      </select>

      <select disabled={!selectedClass}>
        <option value="">Select Section</option>
        {sections.map(section => (
          <option key={section.id} value={section.id}>
            {section.name}
          </option>
        ))}
      </select>
    </div>
  );
};
```

## Performance Best Practices

### 1. Caching Strategy
- **Server-side**: Responses are cached for 5 minutes automatically
- **Client-side**: Implement client-side caching for frequently used dropdowns
- **Cache Invalidation**: Server automatically invalidates cache on data changes

### 2. Error Handling
```javascript
const fetchDropdownData = async (endpoint) => {
  try {
    const response = await fetch(endpoint, {
      headers: { 'X-Client-Name': 'cos360_main' }
    });

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait before retrying.');
    }

    if (response.status === 404) {
      throw new Error('Endpoint not found. Check your tenant configuration.');
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Dropdown fetch failed:', error);
    throw error;
  }
};
```

### 3. Rate Limit Handling
```javascript
const fetchWithRetry = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
};
```

## Testing

### Sample Test Cases

```javascript
describe('Dropdown API Tests', () => {
  const baseURL = 'http://localhost:8000/api/v1';
  const headers = { 'X-Client-Name': 'cos360_main' };

  test('Academic Years Dropdown', async () => {
    const response = await fetch(`${baseURL}/masters/academic_years/dropdown`, {
      headers
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('title');
    }
  });

  test('Rate Limiting', async () => {
    const promises = [];
    // Make 101 concurrent requests to trigger rate limit
    for (let i = 0; i < 101; i++) {
      promises.push(
        fetch(`${baseURL}/masters/academic_years/dropdown`, { headers })
      );
    }
    
    const responses = await Promise.all(promises);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
```

## Migration Guide

### From Full Endpoints to Dropdowns

**Before:**
```javascript
// Fetching full subject data (inefficient)
const response = await fetch('/api/v1/masters/subjects/', {
  headers: { 'X-Client-Name': 'cos360_main' }
});
const subjects = await response.json();
// Only using id and name from full response
```

**After:**
```javascript
// Fetching optimized dropdown data
const response = await fetch('/api/v1/masters/subjects/dropdown', {
  headers: { 'X-Client-Name': 'cos360_main' }
});
const subjects = await response.json();
// Minimal data transfer, better performance
```

## Support

For technical support or questions about dropdown APIs:

1. Check the error response for detailed error messages
2. Verify tenant configuration in `X-Client-Name` header
3. Monitor rate limiting (100 req/min per endpoint)
4. Review caching behavior (5-minute server cache)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-09 | Initial dropdown API implementation |
| | | - All master dropdowns implemented |
| | | - Rate limiting added |
| | | - Caching implemented |
| | | - Multi-tenant support |