import React, { useRef, useCallback, useEffect, useState } from 'react';
import { PDFFile, OnPDFUpload, OnPDFSelect, OnPDFRemove, OnClearAllPDFs, OnSidebarResize, OnSidebarToggle } from '../types/index.ts';

interface PDFManagerSidebarProps {
  pdfFiles: PDFFile[];
  activePdfId: string | null;
  collapsed: boolean;
  width: number;
  onPDFUpload: OnPDFUpload;
  onPDFSelect: OnPDFSelect;
  onPDFRemove: OnPDFRemove;
  onClearAll: OnClearAllPDFs;
  onResize: OnSidebarResize;
  onToggle: OnSidebarToggle;
}

export const PDFManagerSidebar: React.FC<PDFManagerSidebarProps> = ({
  pdfFiles,
  activePdfId,
  collapsed,
  width,
  onPDFUpload,
  onPDFSelect,
  onPDFRemove,
  onClearAll,
  onResize,
  onToggle
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  // Handle file input change
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onPDFUpload(files);
    }
    // Reset input value to allow re-uploading the same file
    event.target.value = '';
  }, [onPDFUpload]);

  // Handle drag and drop
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      onPDFUpload(files);
    }
  }, [onPDFUpload]);

  // Handle resize functionality
  const handleResizeStart = useCallback((event: React.MouseEvent) => {
    if (collapsed) return;
    
    setIsDragging(true);
    const rect = sidebarRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset(event.clientX - rect.right);
    }
    
    event.preventDefault();
  }, [collapsed]);

  const handleResizeMove = useCallback((event: MouseEvent) => {
    if (!isDragging) return;
    
    const rect = sidebarRef.current?.getBoundingClientRect();
    if (rect) {
      const newWidth = event.clientX - rect.left - dragOffset;
      onResize(newWidth);
    }
  }, [isDragging, dragOffset, onResize]);

  const handleResizeEnd = useCallback(() => {
    setIsDragging(false);
    setDragOffset(0);
  }, []);

  // Add mouse event listeners for resize
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleResizeMove, handleResizeEnd]);

  // Upload button click handler
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div
      ref={sidebarRef}
      className={`relative bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col ${
        collapsed ? 'w-12' : ''
      }`}
      style={{ width: collapsed ? 48 : width }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-gray-800">PDF Documents</h2>
            {pdfFiles.length > 0 && (
              <button
                onClick={onClearAll}
                className="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                title="Clear all PDFs"
              >
                Clear All
              </button>
            )}
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* PDF List */}
          <div className="flex-1 overflow-y-auto p-2">
            {pdfFiles.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <div className="text-4xl mb-3">📚</div>
                <p className="text-sm mb-4">No PDFs uploaded yet</p>
                <p className="text-xs text-gray-400">
                  Drop PDF files here or use the upload button below
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pdfFiles.map(pdf => (
                  <div
                    key={pdf.id}
                    className={`
                      group relative p-3 rounded-lg border transition-all duration-200
                      ${activePdfId === pdf.id
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                      ${pdf.isProcessing || pdf.error ? 'opacity-75' : ''}
                    `}
                  >
                    <div 
                      onClick={() => !pdf.isProcessing && !pdf.error && onPDFSelect(pdf.id)}
                      className={`${pdf.isProcessing || pdf.error ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center space-x-2">
                            <div className="text-2xl">📄</div>
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-sm font-medium text-gray-900 truncate"
                                title={pdf.name}
                              >
                                {pdf.name}
                              </p>
                              {pdf.pages > 0 && (
                                <p className="text-xs text-gray-500">
                                  {pdf.pages} pages • {formatFileSize(pdf.file.size)}
                                </p>
                              )}
                            </div>
                          </div>

                          {pdf.error && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                              Error: {pdf.error}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-1">
                          {pdf.isProcessing && (
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Remove button - appears on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPDFRemove(pdf.id);
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition-all duration-200 shadow-sm"
                      title="Remove PDF"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Section */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleUploadClick}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload PDF
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            <p className="mt-2 text-xs text-gray-500 text-center">
              Or drag and drop PDF files anywhere in this sidebar
            </p>
          </div>
        </>
      )}

      {/* Resize Handle */}
      {!collapsed && (
        <div
          ref={resizeRef}
          className="absolute top-0 right-0 w-1 h-full resize-handle hover:bg-blue-500 transition-colors cursor-col-resize"
          onMouseDown={handleResizeStart}
        />
      )}

      {/* Drag overlay for better visual feedback */}
      <div className="absolute inset-0 pointer-events-none">
        {/* This will be styled with CSS when dragging over */}
      </div>
    </div>
  );
};

export default PDFManagerSidebar;