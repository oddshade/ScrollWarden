import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PDFFile, PDFDocumentProxy, PDFPageProxy, PDFViewerState } from '../types/index.js';

interface PDFViewerProps {
  pdfFile: PDFFile;
  targetPage?: number;
}

interface PDFPageComponentProps {
  pageNumber: number;
  document: PDFDocumentProxy;
  scale: number;
  isVisible: boolean;
  onPageRendered: (pageNumber: number) => void;
}

const PDFPageComponent: React.FC<PDFPageComponentProps> = ({
  pageNumber,
  document,
  scale,
  isVisible,
  onPageRendered
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [viewport, setViewport] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const renderPage = useCallback(async () => {
    if (!canvasRef.current || isRendering || isRendered) return;

    try {
      setIsRendering(true);
      const page = await document.getPage(pageNumber);
      const pageViewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      canvas.height = pageViewport.height;
      canvas.width = pageViewport.width;
      
      setViewport({ width: pageViewport.width, height: pageViewport.height });

      const renderContext = {
        canvasContext: context,
        viewport: pageViewport,
      };

      await page.render(renderContext).promise;
      setIsRendered(true);
      onPageRendered(pageNumber);
    } catch (error) {
      console.error(`Error rendering page ${pageNumber}:`, error);
    } finally {
      setIsRendering(false);
    }
  }, [document, pageNumber, scale, isRendering, isRendered, onPageRendered]);

  useEffect(() => {
    if (isVisible && !isRendered && !isRendering) {
      renderPage();
    }
  }, [isVisible, isRendered, isRendering, renderPage]);

  // Re-render when scale changes
  useEffect(() => {
    if (isRendered) {
      setIsRendered(false);
      if (isVisible) {
        setTimeout(renderPage, 0);
      }
    }
  }, [scale, isRendered, isVisible, renderPage]);

  if (!isVisible && !isRendered) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 border-b border-gray-200"
        style={{ height: 800 }} // Default height
      >
        <div className="text-center text-gray-500">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-2"></div>
            <p className="text-sm">Page {pageNumber}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center bg-gray-100 border-b border-gray-200 p-4">
      <div className="relative bg-white shadow-lg">
        {/* Page number overlay */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-medium">
          {pageNumber}
        </div>
        
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Rendering page {pageNumber}...</p>
            </div>
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          className={`block ${isRendering ? 'opacity-50' : ''}`}
          style={{
            maxWidth: '100%',
            height: 'auto',
          }}
        />
      </div>
    </div>
  );
};

export const PDFViewer: React.FC<PDFViewerProps> = ({ pdfFile, targetPage }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  
  const [viewerState, setViewerState] = useState<PDFViewerState>({
    scale: 1.0,
    currentPage: 1,
    totalPages: 0,
    pagesRendered: new Set(),
    scrollToPage: targetPage
  });
  
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF document
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const arrayBuffer = await pdfFile.file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        const pdfDoc = await window.pdfjsLib.getDocument(uint8Array).promise;
        setDocument(pdfDoc);
        setViewerState(prev => ({
          ...prev,
          totalPages: pdfDoc.numPages
        }));
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
      } finally {
        setIsLoading(false);
      }
    };

    if (pdfFile && !pdfFile.isProcessing && !pdfFile.error) {
      loadPDF();
    }
  }, [pdfFile]);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!document) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const newVisiblePages = new Set(visiblePages);
        
        entries.forEach((entry) => {
          const pageNumber = parseInt(entry.target.getAttribute('data-page-number') || '0');
          
          if (entry.isIntersecting) {
            // Add current page and nearby pages for aggressive pre-loading
            for (let i = Math.max(1, pageNumber - 2); i <= Math.min(viewerState.totalPages, pageNumber + 2); i++) {
              newVisiblePages.add(i);
            }
          }
        });
        
        setVisiblePages(newVisiblePages);

        // Update current page based on which page is most visible
        const visibleEntries = entries.filter(entry => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          const mostVisibleEntry = visibleEntries.reduce((prev, current) => 
            prev.intersectionRatio > current.intersectionRatio ? prev : current
          );
          const currentPageNumber = parseInt(mostVisibleEntry.target.getAttribute('data-page-number') || '1');
          
          setViewerState(prev => ({
            ...prev,
            currentPage: currentPageNumber
          }));
        }
      },
      {
        root: containerRef.current,
        rootMargin: '200% 0px', // Very aggressive pre-loading
        threshold: [0, 0.25, 0.5, 0.75, 1]
      }
    );

    // Observe all page elements
    pageRefs.current.forEach((pageElement) => {
      if (observerRef.current) {
        observerRef.current.observe(pageElement);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [document, viewerState.totalPages]);

  // Handle target page scrolling
  useEffect(() => {
    if (targetPage && document && containerRef.current) {
      const scrollToTargetPage = () => {
        const pageElement = pageRefs.current.get(targetPage);
        if (pageElement) {
          pageElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      };

      // Wait a bit for pages to render if needed
      setTimeout(scrollToTargetPage, 100);
    }
  }, [targetPage, document]);

  // Zoom handlers
  const zoomIn = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      scale: Math.min(3.0, prev.scale + 0.25),
      pagesRendered: new Set() // Clear to force re-render at new scale
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      scale: Math.max(0.5, prev.scale - 0.25),
      pagesRendered: new Set() // Clear to force re-render at new scale
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setViewerState(prev => ({
      ...prev,
      scale: 1.0,
      pagesRendered: new Set() // Clear to force re-render at new scale
    }));
  }, []);

  // Handle page rendered callback
  const handlePageRendered = useCallback((pageNumber: number) => {
    setViewerState(prev => ({
      ...prev,
      pagesRendered: new Set([...prev.pagesRendered, pageNumber])
    }));
  }, []);

  // Register page ref
  const registerPageRef = useCallback((pageNumber: number, element: HTMLDivElement | null) => {
    if (element) {
      pageRefs.current.set(pageNumber, element);
    } else {
      pageRefs.current.delete(pageNumber);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading PDF...</p>
          <p className="text-sm text-gray-500">{pdfFile.name}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4 text-red-400">⚠️</div>
          <p className="text-lg font-medium text-red-700 mb-2">Failed to load PDF</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <p className="text-lg text-gray-600">No PDF loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-gray-800 truncate max-w-md" title={pdfFile.name}>
            {pdfFile.name}
          </h3>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Page indicator */}
          <div className="text-sm text-gray-600 font-medium">
            Page {viewerState.currentPage} of {viewerState.totalPages}
          </div>
          
          {/* Zoom controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={zoomOut}
              disabled={viewerState.scale <= 0.5}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H9" />
              </svg>
            </button>
            
            <button
              onClick={resetZoom}
              className="px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded min-w-[4rem]"
              title="Reset zoom"
            >
              {Math.round(viewerState.scale * 100)}%
            </button>
            
            <button
              onClick={zoomIn}
              disabled={viewerState.scale >= 3.0}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom in"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM15 10l-2 0m0 0l-2 0m2 0v2m0-2v-2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* PDF Pages */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        style={{ scrollBehavior: 'smooth' }}
      >
        {Array.from({ length: viewerState.totalPages }, (_, index) => {
          const pageNumber = index + 1;
          return (
            <div
              key={pageNumber}
              ref={(el) => registerPageRef(pageNumber, el)}
              data-page-number={pageNumber}
              className="page-container"
            >
              <PDFPageComponent
                pageNumber={pageNumber}
                document={document}
                scale={viewerState.scale}
                isVisible={visiblePages.has(pageNumber)}
                onPageRendered={handlePageRendered}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PDFViewer;