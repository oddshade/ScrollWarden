# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Setup and Installation
```bash
# Install dependencies
npm install
```

### Running the Application
This application uses Vite for development with TypeScript support.

```bash
# Development server (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The development server runs on `http://localhost:8000` by default.

### OpenAI API Setup
The application supports both mock responses (for demo) and real OpenAI integration:

**For Mock Responses (Default):**
- No setup required - works out of the box
- Shows "Demo" badge in chat interface
- Useful for testing UI and PDF processing

**For Real OpenAI Integration:**
1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add it to `.env` file:
   ```env
   VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
   ```
3. Restart dev server: `npm run dev`
4. Chat interface shows "OpenAI" badge when configured

See `SETUP.md` for detailed configuration instructions.

### Development Tools
- **Vite**: Fast build tool with TypeScript support and hot module replacement
- **TypeScript**: Full type safety across the application
- **React Fast Refresh**: Instant updates during development

## Architecture Overview

### Core Architecture Pattern
The application follows a **Single-Page Application (SPA)** pattern with:
- **Centralized State Management**: All application state is managed in `App.tsx` using React hooks
- **Service Layer Architecture**: Clear separation between UI components and business logic
- **Event-Driven Communication**: Components communicate through callback props, not direct coupling

### Key Architectural Decisions

**1. Vite Build System**
- Modern build tool with TypeScript support out of the box
- Hot module replacement for fast development
- Optimized production builds with code splitting
- TailwindCSS via CDN, PDF.js via CDN for external dependencies

**2. State Architecture**
- Single `AppState` interface manages all application state
- State flows unidirectionally from App.tsx down to components
- All state mutations handled through callback functions passed as props

**3. PDF Processing Pipeline**
```
File Upload → PDF.js Processing → Text Extraction → Page Markers → AI Integration
```

**4. Component Hierarchy**
```
App.tsx (state management)
├── PDFManagerSidebar (file management, upload, remove)
├── PDFViewer (lazy-loaded PDF rendering)
├── ChatPanel (AI interaction)
└── WelcomeScreen (initial state)
```

### Service Layer

**`pdfProcessor.ts`** - PDF text extraction with page markers
- Processes PDFs sequentially to maintain page order
- Adds `[Page X]` markers for citation accuracy
- Handles error cases gracefully (corrupted PDFs, password protection)

**`aiService.ts`** - AI integration abstraction
- Configurable AI provider support (OpenAI, Anthropic, etc.)
- Structured prompt construction with document context
- Citation parsing from AI responses using regex patterns
- Mock mode for development without API keys

### Performance Architecture

**PDF Viewer Optimizations:**
- **Lazy Loading**: Pages render only when visible in viewport
- **Aggressive Pre-loading**: Loads 2 pages before and after visible pages
- **Intersection Observer**: Efficient visibility detection without scroll events
- **Canvas Management**: Proper canvas cleanup to prevent memory leaks

**State Management Optimizations:**
- React.useCallback for all event handlers to prevent unnecessary re-renders
- Refs for managing PDF IDs and message IDs without state updates
- Minimal state updates using object spread patterns

### Citation System Architecture
The citation system creates a complete loop:
1. PDF text extraction includes page markers `[Page X]`
2. AI responses are parsed for citation patterns
3. Citation buttons in chat trigger PDF viewer navigation
4. PDF viewer scrolls to the specific page referenced

### File Structure Rationale

```
src/
├── types/index.ts          # Centralized type definitions
├── services/               # Business logic layer
│   ├── aiService.ts       # AI provider abstraction
│   └── pdfProcessor.ts    # PDF text extraction
└── components/            # Presentational components
    ├── App.tsx           # State management hub
    ├── PDFViewer.tsx     # High-performance PDF rendering
    ├── ChatPanel.tsx     # AI interaction interface
    ├── PDFManagerSidebar.tsx  # File management
    └── WelcomeScreen.tsx # Initial upload interface
```

## Key Development Patterns

### State Management Pattern
All components receive state and callbacks as props - no internal state management:
```typescript
// Pattern: State down, callbacks up
const handlePDFUpload: OnPDFUpload = useCallback(async (files: FileList) => {
  // State mutation logic
}, []);
```

### Error Handling Pattern
Three-layer error handling:
1. **Service Layer**: Catches and transforms errors into user-friendly messages
2. **Component Layer**: Displays error states in UI
3. **Global Layer**: Toast notifications for system-level errors

### TypeScript Integration Pattern
- All interfaces defined in `types/index.ts`
- Strict type checking for PDF.js integration
- Event handler types for consistent callback signatures

### Async Processing Pattern
- File uploads processed sequentially to maintain order
- Progress indicators during PDF text extraction
- Non-blocking UI during AI processing

### PDF Management Pattern
- **Individual Removal**: Hover-to-reveal remove buttons (×) on each PDF item
- **Bulk Removal**: "Clear All" button in sidebar header when PDFs are present
- **Smart Navigation**: Automatically selects next PDF when active PDF is removed
- **State Cleanup**: Clearing all PDFs also clears chat history for clean slate

## Browser Compatibility Requirements

- **ES Modules Support**: Chrome 61+, Firefox 60+, Safari 10.1+
- **Modern File API**: Required for PDF file processing
- **Canvas API**: Required for PDF rendering
- **Intersection Observer**: Required for lazy loading (polyfill available)
- **CSS Grid/Flexbox**: Required for responsive layout

## AI Provider Integration

The `aiService.ts` is designed for easy AI provider switching:

**Current Support:**
- OpenAI GPT models (configured)
- Mock responses (default)

**Easy to Add:**
- Anthropic Claude
- Google PaLM/Gemini
- Local LLM providers
- Custom API endpoints

**Integration Pattern:**
1. Update `AI_CONFIG` object
2. Modify `callRealAIAPI` function
3. Adjust prompt format if needed
4. Update citation parsing if response format differs

## Security Considerations

- No server-side processing - all PDF processing happens in browser
- API keys should be handled via environment variables
- No file uploads to external servers
- CORS considerations for AI API calls

## Limitations & Constraints

- **PDF Size**: Large PDFs may cause memory issues in browser
- **Text-Only**: Cannot extract text from scanned/image-based PDFs
- **Browser Storage**: No persistence - data lost on page refresh
- **Single Session**: No multi-user or session management
- **AI Rate Limits**: Dependent on chosen AI provider's limits