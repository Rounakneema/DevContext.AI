# File Management API Documentation

## Overview
The File Management API allows users to view all fetched repository files, see the automatically prioritized top 30 files, and customize which files to analyze through selection and drag-and-drop reordering.

## Use Cases
1. **View All Files**: See all files fetched from the repository with their priorities
2. **Filter Files**: Filter by language, framework, or tier
3. **Custom Selection**: Select/deselect specific files for analysis
4. **Drag & Drop Reorder**: Manually reorder files to prioritize what matters most
5. **Reprocess**: Re-run analysis with custom file selection

---

## API Endpoints

### 1. GET /analysis/{analysisId}/files
Get all fetched files with priorities and selection status.

**Request:**
```http
GET /analysis/abc123/files
Authorization: Bearer {token}
```

**Response:**
```json
{
  "analysisId": "abc123",
  "totalFiles": 147,
  "selectedFiles": 30,
  "top30Files": [
    "src/index.ts",
    "src/app.ts",
    "src/server.ts",
    "..."
  ],
  "files": [
    {
      "path": "src/index.ts",
      "tier": 1,
      "priority": 100,
      "category": "Entry Point",
      "selected": true,
      "rank": 1,
      "inTop30": true,
      "language": "TypeScript",
      "size": "Medium"
    },
    {
      "path": "src/utils/helper.ts",
      "tier": 2,
      "priority": 80,
      "category": "Core Module",
      "selected": true,
      "rank": 5,
      "inTop30": true,
      "language": "TypeScript",
      "size": "Small"
    },
    {
      "path": "tests/unit/test.ts",
      "tier": 3,
      "priority": 60,
      "category": "Supporting",
      "selected": false,
      "rank": 45,
      "inTop30": false,
      "language": "TypeScript",
      "size": "Small"
    }
  ],
  "filters": {
    "languages": ["TypeScript", "JavaScript", "Python"],
    "frameworks": ["Express", "React"],
    "tiers": ["tier1", "tier2", "tier3", "tier4"]
  }
}
```

**File Object Properties:**
- `path`: File path relative to repository root
- `tier`: Priority tier (1=Entry Points, 2=Core, 3=Supporting, 4=Other)
- `priority`: Numeric priority score (higher = more important)
- `category`: Human-readable category
- `selected`: Whether file is selected for analysis
- `rank`: Current rank in the list (1 = highest priority)
- `inTop30`: Whether file is in the top 30
- `language`: Detected programming language
- `size`: Estimated file size (Small/Medium/Large)

---

### 2. PUT /analysis/{analysisId}/files/selection
Update which files are selected for analysis.

**Request:**
```http
PUT /analysis/abc123/files/selection
Authorization: Bearer {token}
Content-Type: application/json

{
  "selectedFiles": [
    "src/new-feature.ts",
    "src/important-module.ts"
  ],
  "deselectedFiles": [
    "src/old-code.ts"
  ]
}
```

**Response:**
```json
{
  "analysisId": "abc123",
  "selectedFiles": 32,
  "deselectedFiles": 1,
  "message": "File selection updated successfully"
}
```

**Notes:**
- `selectedFiles`: Array of file paths to add to selection
- `deselectedFiles`: Array of file paths to remove from selection
- Both arrays are optional
- Changes are additive (won't remove previously selected files unless explicitly deselected)

---

### 3. POST /analysis/{analysisId}/files/reorder
Reorder files via drag-and-drop.

**Request:**
```http
POST /analysis/abc123/files/reorder
Authorization: Bearer {token}
Content-Type: application/json

{
  "customOrder": [
    "src/critical-file.ts",
    "src/index.ts",
    "src/app.ts",
    "src/server.ts",
    "..."
  ]
}
```

**Response:**
```json
{
  "analysisId": "abc123",
  "customOrder": 30,
  "message": "File order updated successfully"
}
```

**Notes:**
- `customOrder`: Complete ordered array of file paths
- Files not in the array will be sorted by default priority
- This overrides automatic prioritization

---

### 4. POST /analysis/{analysisId}/reprocess
Reprocess analysis with custom file selection.

**Request:**
```http
POST /analysis/abc123/reprocess
Authorization: Bearer {token}
```

**Response:**
```json
{
  "analysisId": "abc123",
  "status": "processing",
  "message": "Analysis reprocessing started with custom file selection",
  "selectedFiles": 32
}
```

**Error Responses:**
```json
// Analysis currently processing
{
  "error": "Analysis is currently processing"
}

// No files selected
{
  "error": "No files selected for reprocessing"
}
```

---

## Frontend Integration Example

### React Component with Drag & Drop

```typescript
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface File {
  path: string;
  tier: number;
  priority: number;
  category: string;
  selected: boolean;
  rank: number;
  inTop30: boolean;
  language: string;
  size: string;
}

export function FileManager({ analysisId }: { analysisId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState({ tier: 'all', language: 'all' });
  
  // Load files
  useEffect(() => {
    fetch(`/api/analysis/${analysisId}/files`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setFiles(data.files);
        setSelectedFiles(new Set(data.files.filter(f => f.selected).map(f => f.path)));
      });
  }, [analysisId]);
  
  // Toggle file selection
  const toggleFile = (path: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(path)) {
      newSelection.delete(path);
      // Update backend
      fetch(`/api/analysis/${analysisId}/files/selection`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ deselectedFiles: [path] })
      });
    } else {
      newSelection.add(path);
      // Update backend
      fetch(`/api/analysis/${analysisId}/files/selection`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ selectedFiles: [path] })
      });
    }
    setSelectedFiles(newSelection);
  };
  
  // Handle drag end
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(files);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setFiles(items);
    
    // Update backend
    fetch(`/api/analysis/${analysisId}/files/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        customOrder: items.map(f => f.path)
      })
    });
  };
  
  // Reprocess with custom selection
  const handleReprocess = () => {
    fetch(`/api/analysis/${analysisId}/reprocess`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        alert(`Reprocessing started with ${data.selectedFiles} files`);
      });
  };
  
  // Filter files
  const filteredFiles = files.filter(f => {
    if (filter.tier !== 'all' && f.tier !== parseInt(filter.tier)) return false;
    if (filter.language !== 'all' && f.language !== filter.language) return false;
    return true;
  });
  
  return (
    <div className="file-manager">
      <div className="header">
        <h2>File Selection ({selectedFiles.size} selected)</h2>
        <button onClick={handleReprocess}>Reprocess Analysis</button>
      </div>
      
      <div className="filters">
        <select value={filter.tier} onChange={e => setFilter({...filter, tier: e.target.value})}>
          <option value="all">All Tiers</option>
          <option value="1">Tier 1 - Entry Points</option>
          <option value="2">Tier 2 - Core Modules</option>
          <option value="3">Tier 3 - Supporting</option>
          <option value="4">Tier 4 - Other</option>
        </select>
        
        <select value={filter.language} onChange={e => setFilter({...filter, language: e.target.value})}>
          <option value="all">All Languages</option>
          <option value="TypeScript">TypeScript</option>
          <option value="JavaScript">JavaScript</option>
          <option value="Python">Python</option>
        </select>
      </div>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="files">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="file-list">
              {filteredFiles.map((file, index) => (
                <Draggable key={file.path} draggableId={file.path} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`file-item ${file.inTop30 ? 'top-30' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.path)}
                        onChange={() => toggleFile(file.path)}
                      />
                      <span className="rank">#{file.rank}</span>
                      <span className="path">{file.path}</span>
                      <span className={`tier tier-${file.tier}`}>{file.category}</span>
                      <span className="language">{file.language}</span>
                      {file.inTop30 && <span className="badge">Top 30</span>}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
```

### CSS Styling

```css
.file-manager {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.file-list {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 8px;
  background: white;
  cursor: move;
}

.file-item.top-30 {
  background: #f0f9ff;
  border-color: #3b82f6;
}

.file-item:hover {
  background: #f9fafb;
}

.rank {
  font-weight: bold;
  color: #6b7280;
  min-width: 40px;
}

.path {
  flex: 1;
  font-family: monospace;
}

.tier {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.tier-1 { background: #dcfce7; color: #166534; }
.tier-2 { background: #dbeafe; color: #1e40af; }
.tier-3 { background: #fef3c7; color: #92400e; }
.tier-4 { background: #f3f4f6; color: #4b5563; }

.badge {
  background: #3b82f6;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
```

---

## Workflow

1. **Initial Analysis**: System automatically prioritizes files into tiers
2. **View Files**: User calls `GET /files` to see all files with priorities
3. **Customize Selection**: User selects/deselects files via `PUT /files/selection`
4. **Reorder (Optional)**: User drags files to reorder via `POST /files/reorder`
5. **Reprocess**: User triggers reanalysis with `POST /reprocess`
6. **Monitor**: User checks status via `GET /analysis/{id}/status`

---

## File Tier System

### Tier 1 - Entry Points (Priority: 100)
- `index.js`, `main.py`, `app.ts`
- `server.js`, `index.html`
- Package entry points from `package.json`

### Tier 2 - Core Modules (Priority: 80)
- Files imported by entry points
- Route handlers, controllers
- Core business logic

### Tier 3 - Supporting (Priority: 60)
- Utilities, helpers
- Configuration files
- Middleware

### Tier 4 - Other (Priority: 40)
- Tests, documentation
- Build scripts
- Assets

---

## Best Practices

1. **Start with Top 30**: The system automatically selects the most important 30 files
2. **Review Tier 1 & 2**: Always include entry points and core modules
3. **Add Domain-Specific Files**: Select files relevant to your analysis goals
4. **Exclude Tests**: Unless testing patterns are important
5. **Reorder for Context**: Put related files together for better AI understanding
6. **Reprocess Incrementally**: Start with fewer files, add more if needed

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "error": "Error message",
  "message": "Detailed explanation"
}
```

Common status codes:
- `400`: Bad request (missing parameters)
- `401`: Unauthorized (invalid token)
- `404`: Resource not found
- `429`: Rate limit exceeded
- `500`: Internal server error
