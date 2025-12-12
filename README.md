# 🍌 Nano Banana + Veo 3.x Media Editor
Release Version: (v1.1)

**AI Image & Video Generation Platform**

A React + TypeScript application for AI-powered image and video generation using Google's Gemini 3.0 Pro Image model and Veo 3.x video models. Features text-to-image/video generation, conversational image editing with region-aware masks, video interpolation, and batch API queue for cost savings.

[![Nano Banana Image Editor](https://getsmartgpt.com/nano-banana-editor.jpg)](https://nanobananaeditor.dev)

## ✨ Key Features

### 🎨 **AI-Powered Creation**
- **Text-to-Image Generation** - Create stunning images from descriptive prompts
- **Live Quality Tips** - Real-time feedback to improve your prompts
- **Reference Image Support** - Use up to 10 reference images to guide generation
- **Advanced Controls** - Fine-tune creativity levels and use custom seeds

### ✏️ **Intelligent Editing**
- **Conversational Editing** - Modify images using natural language instructions
- **Region-Aware Selection** - Paint masks to target specific areas for editing
- **Style Reference Images** - Upload reference images to guide editing style
- **Non-Destructive Workflow** - All edits preserve the original image

### 🖼️ **Professional Canvas**
- **Interactive Canvas** - Zoom, pan, and navigate large images smoothly
- **Brush Tools** - Variable brush sizes for precise mask painting
- **Mobile Optimized** - Responsive design that works beautifully on all devices
- **Keyboard Shortcuts** - Efficient workflow with hotkeys

### 📚 **Project Management**
- **Generation History** - Track all your creations and edits
- **Variant Comparison** - Generate and compare multiple versions side-by-side
- **Full Undo/Redo** - Complete generation tree with branching history
- **Asset Management** - Organized storage of all generated content

### 🎬 **Video Generation (Veo 3.x)**
- **Text-to-Video** - Generate videos from descriptive prompts
- **Image-to-Video** - Use a start frame to guide video generation
- **Video Interpolation** - Provide first and last frames to generate in-between motion
- **Video Extension** - Extend existing videos with AI-generated content
- **Multiple Models** - Support for Veo 3.0 and 3.1 (standard and fast variants)
- **Video Controls** - Full playback controls with timeline, mute, and download

### ⏱️ **Batch API Queue (50% Cost Savings)**
- **Queue for Batch** - Submit image requests to Gemini Batch API at half the cost
- **Background Processing** - Requests process asynchronously (up to 24hr turnaround)
- **Persistent Queue** - Queued requests saved to IndexedDB, survive page refreshes
- **Status Tracking** - Monitor pending, processing, completed, and failed jobs
- **Auto-Load Results** - Click completed requests to load images directly to canvas

### 🔒 **Enterprise Features**
- **SynthID Watermarking** - Built-in AI provenance with invisible watermarks
- **Offline Caching** - IndexedDB storage for offline asset access
- **Type Safety** - Full TypeScript implementation with strict typing
- **Performance Optimized** - React Query for efficient state management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- A [Google AI Studio](https://aistudio.google.com/) API key

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd nano-banana-image-editor
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Add your Gemini API key to GEMINI_API_KEY
   ```

3. **Start development servers**:
   ```bash
   # Run both frontend and API server together
   npm run dev:all
   
   # Or run them separately:
   npm run dev:server  # Express API on http://localhost:3001
   npm run dev         # Vite frontend on http://localhost:5173
   ```

4. **Open in browser**: Navigate to `http://localhost:5173`

## 🎯 Usage Guide

### Creating Images
1. Select **Generate** mode
2. Write a detailed prompt describing your desired image
3. Optionally upload reference images (max 10)
4. Adjust creativity settings if needed
5. Click **Generate** or press `Cmd/Ctrl + Enter`

### Editing Images
1. Switch to **Edit** mode
2. Upload an image or use a previously generated one
3. Optionally paint a mask to target specific areas
4. Describe your desired changes in natural language
5. Click **Apply Edit** to see the results

### Advanced Workflows
- Use **Select** mode to paint precise masks for targeted edits
- Compare variants in the History panel
- Download high-quality PNG outputs
- Use keyboard shortcuts for efficient navigation

### Using Batch Queue (50% Savings)
1. Write your prompt as usual
2. Click the **dropdown arrow** next to the Generate button
3. Select **"Queue for Batch (50% cost)"**
4. Switch to the **Queue** tab in the right panel to monitor progress
5. Click **completed requests** to load results to the canvas
6. Use the **refresh button** to check status of pending jobs

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Enter` | Generate/Apply Edit |
| `Shift + R` | Re-roll variants |
| `E` | Switch to Edit mode |
| `G` | Switch to Generate mode |
| `M` | Switch to Select mode |
| `H` | Toggle history panel |
| `P` | Toggle prompt panel |

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Express.js API middleware (keeps API keys secure)
- **State Management**: Zustand for app state, React Query for server state
- **Canvas**: Konva.js for interactive image display and mask overlays
- **AI Integration**: Google Generative AI SDK (Gemini 3.0 Pro Image, Veo 3.x Video)
- **Storage**: IndexedDB for offline asset caching
- **Build Tool**: Vite for fast development and optimized builds

### Project Structure
```
├── server/              # Express API middleware
│   └── index.ts            # API endpoints for Gemini/Veo calls
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components (Button, Input, DropdownButton, etc.)
│   │   ├── PromptComposer.tsx  # Prompt input and tool selection
│   │   ├── ImageCanvas.tsx     # Interactive canvas with Konva (images and videos)
│   │   ├── VideoToolbar.tsx    # Video playback controls
│   │   ├── HistoryPanel.tsx    # Tabbed panel for history and queue
│   │   ├── QueuedRequestsPanel.tsx # Batch API and video queue management
│   │   ├── Header.tsx          # App header and navigation
│   │   └── InfoModal.tsx       # About modal with links
│   ├── services/           # External service integrations
│   │   ├── apiService.ts       # HTTP client for backend API
│   │   ├── geminiService.ts    # Gemini/Veo service facade
│   │   ├── cacheService.ts     # IndexedDB caching layer
│   │   └── imageProcessing.ts  # Image manipulation utilities
│   ├── store/              # Zustand state management
│   │   └── useAppStore.ts      # Global application state (image + video)
│   ├── hooks/              # Custom React hooks
│   │   ├── useImageGeneration.ts  # Image generation and editing logic
│   │   ├── useVideoGeneration.ts  # Video generation with polling
│   │   └── useKeyboardShortcuts.ts # Keyboard navigation
│   ├── utils/              # Utility functions
│   │   ├── cn.ts              # Class name utility
│   │   └── imageUtils.ts      # Image processing helpers
│   └── types/              # TypeScript type definitions
│       └── index.ts           # Core type definitions (image, video, requests)
```

## 🔧 Configuration

### Environment Variables
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### Model Configuration
- **Model**: `gemini-3-pro-image-preview`
- **Output Format**: 1024×1024 PNG with SynthID watermarks
- **Input Formats**: PNG, JPEG, WebP
- **Temperature Range**: 0-1 (0 = deterministic, 1 = creative)

## 🚀 Deployment

### Development
```bash
npm run dev:all     # Start frontend + API server together
npm run dev         # Start Vite frontend only
npm run dev:server  # Start Express API server only
npm run build       # Build frontend for production
npm run preview     # Preview production build
npm run lint        # Run ESLint
```

### Production Considerations
- **API Security**: ✅ Backend proxy implemented - API key stays server-side
- **Rate Limiting**: Add proper rate limiting and usage quotas
- **Authentication**: Consider user authentication for multi-user deployments
- **Storage**: Set up cloud storage for generated assets
- **Monitoring**: Add error tracking and analytics

## 📄 License & Copyright

This project is licensed under the **GNU Affero General Public License v3.0** (AGPL-3.0).

### What this means:
- ✅ **Free to use** for personal and commercial projects
- ✅ **Modify and distribute** with proper attribution
- ⚠️ **Share modifications** - Any changes must be shared under the same license
- ⚠️ **Network use** - If you run this as a web service, you must provide source code

See the [LICENSE](LICENSE) file for full details.

## 🤝 Contributing

We welcome contributions! Please:

1. **Follow the established patterns** - Keep components under 200 lines
2. **Maintain type safety** - Use TypeScript strictly with proper definitions
3. **Test thoroughly** - Ensure keyboard navigation and accessibility
4. **Document changes** - Update README and add inline comments
5. **Respect the license** - All contributions will be under AGPL-3.0

## 🔗 Links & Resources

- **Google AI Studio**: [Get your API key](https://aistudio.google.com/)
- **Gemini API Docs**: [Official Documentation](https://ai.google.dev/gemini-api/docs)
- **Veo API Docs**: [Video Generation](https://ai.google.dev/gemini-api/docs/video)
- **Batch API Docs**: [50% Cost Savings](https://ai.google.dev/gemini-api/docs/batch-api)

## 🐛 Known Issues & Limitations

- **Browser compatibility** - Requires modern browsers with Canvas and WebGL support
- **Rate limits** - Subject to Google AI Studio rate limits
- **Image size** - Optimized for 1024×1024 outputs (Gemini model output dimensions may vary)

## 🎯 Suggested Updates

- [x] Batch API integration for 50% cost savings
- [x] Backend API proxy implementation
- [x] Video generation with Veo 3.x models
- [x] Video interpolation and extension
- [ ] User authentication and project sharing
- [ ] Advanced brush tools and selection methods
- [ ] Plugin system for custom filters
- [ ] Integration with cloud storage providers

---

**Maintained by [wishescsnow](https://github.com/wishescsnow)** | **Originally created by [Mark Fulton](https://markfulton.com)** | **Powered by Gemini 3.0 Pro Image & Veo 3.x**
