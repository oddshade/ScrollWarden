import React, { useRef, useCallback, useState } from 'react';
import { OnPDFUpload } from '../types/index.ts';

interface WelcomeScreenProps {
  onPDFUpload: OnPDFUpload;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onPDFUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      onPDFUpload(files);
    }
  }, [onPDFUpload]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files);
    // Reset input to allow re-selecting the same file
    event.target.value = '';
  }, [handleFileSelect]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragOver) {
      setIsDragOver(true);
    }
  }, [isDragOver]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Only set dragOver to false if we're leaving the drop zone entirely
    if (event.currentTarget === event.target) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    handleFileSelect(files);
  }, [handleFileSelect]);

  return (
    <div 
      className={`flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 transition-all duration-300 overflow-y-auto ${
        isDragOver ? 'bg-blue-100 scale-[1.02]' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="text-center max-w-2xl mx-auto p-8 w-full">
        {/* Main Icon */}
        <div className={`text-8xl mb-6 transition-transform duration-300 ${isDragOver ? 'scale-110' : ''}`}>
          📚
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Scroll Warden
        </h1>
        
        {/* Subtitle */}
        <p className="text-xl text-gray-600 mb-8">
          Your vigilant guardian for PDF document exploration. Upload your documents 
          and let Scroll Warden guide you to the exact information you need.
        </p>

        {/* Upload Area */}
        <div 
          className={`
            border-2 border-dashed rounded-lg p-12 mb-8 transition-all duration-300 cursor-pointer
            ${isDragOver 
              ? 'border-blue-500 bg-blue-50 shadow-lg' 
              : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
            }
          `}
          onClick={handleUploadClick}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className={`text-5xl transition-transform duration-300 ${isDragOver ? 'animate-bounce' : ''}`}>
              📄
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {isDragOver ? 'Drop your PDF files here!' : 'Upload PDF Documents'}
              </h3>
              <p className="text-gray-500">
                Drag and drop your PDF files here, or click to browse
              </p>
            </div>
            
            <button className="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg">
              Choose Files
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 text-left">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-3xl mb-3">🔍</div>
            <h4 className="font-semibold text-gray-800 mb-2">Smart Search</h4>
            <p className="text-sm text-gray-600">
              Ask natural language questions and get intelligent answers based on your document content.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-3xl mb-3">📍</div>
            <h4 className="font-semibold text-gray-800 mb-2">Precise Citations</h4>
            <p className="text-sm text-gray-600">
              Every answer includes clickable citations that take you directly to the relevant page.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-3xl mb-3">📱</div>
            <h4 className="font-semibold text-gray-800 mb-2">Easy to Use</h4>
            <p className="text-sm text-gray-600">
              No installation required. Just upload your PDFs and start asking questions immediately.
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-sm text-gray-500">
          <p>Supports multiple PDF files • No file size limits • All processing happens in your browser</p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default WelcomeScreen;