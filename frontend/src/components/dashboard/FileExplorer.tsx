import React, { useState, useCallback } from "react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
  extension?: string;
  selected?: boolean;
  priority?: number;
}

interface FileExplorerProps {
  onSelectionChange?: (selectedFiles: string[]) => void;
}

// Mock repository structure - will be replaced with actual data from API
const mockFileTree: FileNode[] = [
  {
    name: "src",
    path: "src",
    type: "folder",
    children: [
      {
        name: "components",
        path: "src/components",
        type: "folder",
        children: [
          {
            name: "App.tsx",
            path: "src/components/App.tsx",
            type: "file",
            extension: "tsx",
            selected: true,
            priority: 1,
          },
          {
            name: "Header.tsx",
            path: "src/components/Header.tsx",
            type: "file",
            extension: "tsx",
            selected: true,
            priority: 2,
          },
          {
            name: "Sidebar.tsx",
            path: "src/components/Sidebar.tsx",
            type: "file",
            extension: "tsx",
            selected: true,
            priority: 3,
          },
          {
            name: "Dashboard.tsx",
            path: "src/components/Dashboard.tsx",
            type: "file",
            extension: "tsx",
            selected: true,
            priority: 4,
          },
        ],
      },
      {
        name: "hooks",
        path: "src/hooks",
        type: "folder",
        children: [
          {
            name: "useAuth.ts",
            path: "src/hooks/useAuth.ts",
            type: "file",
            extension: "ts",
            selected: true,
            priority: 5,
          },
          {
            name: "useApi.ts",
            path: "src/hooks/useApi.ts",
            type: "file",
            extension: "ts",
            selected: true,
            priority: 6,
          },
        ],
      },
      {
        name: "utils",
        path: "src/utils",
        type: "folder",
        children: [
          {
            name: "helpers.ts",
            path: "src/utils/helpers.ts",
            type: "file",
            extension: "ts",
            selected: true,
            priority: 7,
          },
          {
            name: "constants.ts",
            path: "src/utils/constants.ts",
            type: "file",
            extension: "ts",
            selected: false,
          },
          {
            name: "validators.ts",
            path: "src/utils/validators.ts",
            type: "file",
            extension: "ts",
            selected: false,
          },
        ],
      },
      {
        name: "index.tsx",
        path: "src/index.tsx",
        type: "file",
        extension: "tsx",
        selected: true,
        priority: 8,
      },
      {
        name: "App.css",
        path: "src/App.css",
        type: "file",
        extension: "css",
        selected: false,
      },
    ],
  },
  {
    name: "server",
    path: "server",
    type: "folder",
    children: [
      {
        name: "controllers",
        path: "server/controllers",
        type: "folder",
        children: [
          {
            name: "userController.js",
            path: "server/controllers/userController.js",
            type: "file",
            extension: "js",
            selected: true,
            priority: 9,
          },
          {
            name: "authController.js",
            path: "server/controllers/authController.js",
            type: "file",
            extension: "js",
            selected: true,
            priority: 10,
          },
        ],
      },
      {
        name: "models",
        path: "server/models",
        type: "folder",
        children: [
          {
            name: "User.js",
            path: "server/models/User.js",
            type: "file",
            extension: "js",
            selected: true,
            priority: 11,
          },
          {
            name: "Post.js",
            path: "server/models/Post.js",
            type: "file",
            extension: "js",
            selected: true,
            priority: 12,
          },
        ],
      },
      {
        name: "routes",
        path: "server/routes",
        type: "folder",
        children: [
          {
            name: "index.js",
            path: "server/routes/index.js",
            type: "file",
            extension: "js",
            selected: true,
            priority: 13,
          },
          {
            name: "api.js",
            path: "server/routes/api.js",
            type: "file",
            extension: "js",
            selected: true,
            priority: 14,
          },
        ],
      },
      {
        name: "index.js",
        path: "server/index.js",
        type: "file",
        extension: "js",
        selected: true,
        priority: 15,
      },
      {
        name: "config.js",
        path: "server/config.js",
        type: "file",
        extension: "js",
        selected: false,
      },
    ],
  },
  {
    name: "package.json",
    path: "package.json",
    type: "file",
    extension: "json",
    selected: true,
    priority: 16,
  },
  {
    name: "README.md",
    path: "README.md",
    type: "file",
    extension: "md",
    selected: true,
    priority: 17,
  },
  {
    name: ".gitignore",
    path: ".gitignore",
    type: "file",
    extension: "",
    selected: false,
  },
  {
    name: "tsconfig.json",
    path: "tsconfig.json",
    type: "file",
    extension: "json",
    selected: false,
  },
];

const getFileIcon = (extension?: string) => {
  const iconMap: Record<string, { color: string; icon: string }> = {
    tsx: { color: "#3178C6", icon: "TS" },
    ts: { color: "#3178C6", icon: "TS" },
    js: { color: "#F7DF1E", icon: "JS" },
    jsx: { color: "#61DAFB", icon: "RE" },
    json: { color: "#F5A623", icon: "{}" },
    md: { color: "#083FA1", icon: "MD" },
    css: { color: "#264DE4", icon: "#" },
    html: { color: "#E34F26", icon: "<>" },
    py: { color: "#3776AB", icon: "PY" },
    java: { color: "#ED8B00", icon: "JA" },
  };
  return iconMap[extension || ""] || { color: "var(--text3)", icon: "📄" };
};

const FileExplorer: React.FC<FileExplorerProps> = ({ onSelectionChange }) => {
  const [fileTree, setFileTree] = useState<FileNode[]>(mockFileTree);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["src", "src/components", "server", "server/controllers"]),
  );
  const [draggedFile, setDraggedFile] = useState<string | null>(null);
  const [dragOverFile, setDragOverFile] = useState<string | null>(null);

  // Get all selected files sorted by priority
  const getSelectedFiles = useCallback((nodes: FileNode[]): FileNode[] => {
    const files: FileNode[] = [];
    const traverse = (nodeList: FileNode[]) => {
      for (const node of nodeList) {
        if (node.type === "file" && node.selected) {
          files.push(node);
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(nodes);
    return files.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  }, []);

  const selectedFiles = getSelectedFiles(fileTree);
  const selectedCount = selectedFiles.length;

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const toggleFileSelection = (path: string) => {
    const updateNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.path === path && node.type === "file") {
          const newSelected = !node.selected;
          return {
            ...node,
            selected: newSelected,
            priority: newSelected ? selectedCount + 1 : undefined,
          };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    setFileTree(updateNodes(fileTree));
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, path: string) => {
    setDraggedFile(path);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, path: string) => {
    e.preventDefault();
    if (draggedFile && draggedFile !== path) {
      setDragOverFile(path);
    }
  };

  const handleDragLeave = () => {
    setDragOverFile(null);
  };

  const handleDrop = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    if (!draggedFile || draggedFile === targetPath) {
      setDraggedFile(null);
      setDragOverFile(null);
      return;
    }

    // Reorder priorities
    const draggedIdx = selectedFiles.findIndex((f) => f.path === draggedFile);
    const targetIdx = selectedFiles.findIndex((f) => f.path === targetPath);

    if (draggedIdx === -1 || targetIdx === -1) {
      setDraggedFile(null);
      setDragOverFile(null);
      return;
    }

    const newOrder = [...selectedFiles];
    const [removed] = newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, removed);

    // Update priorities based on new order
    const pathToPriority = new Map<string, number>();
    newOrder.forEach((file, idx) => {
      pathToPriority.set(file.path, idx + 1);
    });

    const updatePriorities = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.type === "file" && pathToPriority.has(node.path)) {
          return { ...node, priority: pathToPriority.get(node.path) };
        }
        if (node.children) {
          return { ...node, children: updatePriorities(node.children) };
        }
        return node;
      });
    };

    setFileTree(updatePriorities(fileTree));
    setDraggedFile(null);
    setDragOverFile(null);

    if (onSelectionChange) {
      onSelectionChange(newOrder.slice(0, 30).map((f) => f.path));
    }
  };

  const handleDragEnd = () => {
    setDraggedFile(null);
    setDragOverFile(null);
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.path);
      const iconInfo = getFileIcon(node.extension);
      const isSelected = node.selected;
      const priorityNum = node.priority;
      const isInTop30 = priorityNum !== undefined && priorityNum <= 30;

      if (node.type === "folder") {
        return (
          <div key={node.path} className="fe-folder">
            <div
              className="fe-folder-header"
              style={{ paddingLeft: `${12 + depth * 12}px` }}
              onClick={() => toggleFolder(node.path)}
            >
              <svg
                className={`fe-chevron ${isExpanded ? "expanded" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <svg
                className="fe-folder-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                {isExpanded ? (
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z" />
                ) : (
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                )}
              </svg>
              <span className="fe-name">{node.name}</span>
            </div>
            {isExpanded && node.children && (
              <div className="fe-folder-children">
                {renderFileTree(node.children, depth + 1)}
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          key={node.path}
          className={`fe-file ${isSelected ? "selected" : ""} ${
            dragOverFile === node.path ? "drag-over" : ""
          } ${draggedFile === node.path ? "dragging" : ""}`}
          style={{ paddingLeft: `${12 + depth * 12}px` }}
          onClick={() => toggleFileSelection(node.path)}
          draggable={isSelected}
          onDragStart={(e) => handleDragStart(e, node.path)}
          onDragOver={(e) => handleDragOver(e, node.path)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.path)}
          onDragEnd={handleDragEnd}
        >
          <div className="fe-file-icon" style={{ background: iconInfo.color }}>
            {iconInfo.icon.length <= 2 ? iconInfo.icon : ""}
          </div>
          <span className="fe-name">{node.name}</span>
          {isSelected && (
            <div
              className={`fe-priority ${isInTop30 ? "in-budget" : "over-budget"}`}
            >
              {priorityNum}
            </div>
          )}
          {isSelected && (
            <svg
              className="fe-check"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      );
    });
  };

  return (
    <div className="file-explorer">
      <div className="fe-header">
        <div className="fe-title">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          Repository Files
        </div>
        <div className="fe-count">
          <span className={selectedCount > 30 ? "over" : ""}>
            {Math.min(selectedCount, 30)}
          </span>
          /30 files
        </div>
      </div>

      <div className="fe-hint">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        Click to select files for analysis
      </div>

      <div className="fe-tree">{renderFileTree(fileTree)}</div>

      {selectedCount > 0 && (
        <div className="fe-selected-panel">
          <div className="fe-selected-header">
            <span>Analysis Queue</span>
            <span className="fe-selected-count">
              {Math.min(selectedCount, 30)} files
            </span>
          </div>
          <div className="fe-queue-hint">Drag to reorder priority</div>
          <div className="fe-selected-list">
            {selectedFiles.slice(0, 30).map((file, idx) => {
              const iconInfo = getFileIcon(file.extension);
              return (
                <div
                  key={file.path}
                  className={`fe-selected-item ${dragOverFile === file.path ? "drag-over" : ""} ${
                    draggedFile === file.path ? "dragging" : ""
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, file.path)}
                  onDragOver={(e) => handleDragOver(e, file.path)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, file.path)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="fe-selected-grip">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="6" r="1.5" />
                      <circle cx="15" cy="6" r="1.5" />
                      <circle cx="9" cy="12" r="1.5" />
                      <circle cx="15" cy="12" r="1.5" />
                      <circle cx="9" cy="18" r="1.5" />
                      <circle cx="15" cy="18" r="1.5" />
                    </svg>
                  </div>
                  <div className="fe-selected-num">{idx + 1}</div>
                  <div
                    className="fe-file-icon small"
                    style={{ background: iconInfo.color }}
                  >
                    {iconInfo.icon.length <= 2 ? iconInfo.icon : ""}
                  </div>
                  <span className="fe-selected-name" title={file.path}>
                    {file.name}
                  </span>
                  <button
                    className="fe-selected-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFileSelection(file.path);
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
          {selectedCount > 30 && (
            <div className="fe-overflow-warning">
              +{selectedCount - 30} files won't be analyzed (token limit)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
