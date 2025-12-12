import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  Project,
  Generation,
  Edit,
  SegmentationMask,
  BrushStroke,
  SafetySetting,
  HarmCategory,
  AspectRatio,
  ResolutionTier,
  VideoGeneration,
  VideoModel,
  VideoAspectRatio,
  VideoResolution,
  VideoDuration,
  DEFAULT_SAFETY_SETTINGS,
} from '../types';

interface AppState {
  // Current project
  currentProject: Project | null;

  // Canvas state
  canvasImage: string | null;
  canvasImages: string[];
  canvasImageIndex: number;
  canvasZoom: number;
  canvasPan: { x: number; y: number };

  // Upload state
  uploadedImages: string[];
  editReferenceImages: string[];

  // Brush strokes for painting masks
  brushStrokes: BrushStroke[];
  brushSize: number;
  showMasks: boolean;

  // Generation state
  isGenerating: boolean;
  currentPrompt: string;
  temperature: number;
  seed: number | null;
  selectedModel: string;
  safetySettings: SafetySetting[];
  aspectRatio: AspectRatio;
  resolutionTier: ResolutionTier;
  variantCount: number;

  // History and variants
  selectedGenerationId: string | null;
  selectedEditId: string | null;
  showHistory: boolean;

  // Panel visibility
  showPromptPanel: boolean;

  // UI state
  selectedTool: 'generate' | 'edit' | 'mask' | 'video';

  // Video canvas state
  canvasVideo: string | null;
  canvasVideoThumbnail: string | null;
  isVideoPlaying: boolean;
  videoCurrentTime: number;
  videoDuration: number;
  videoMuted: boolean;

  // Video generation settings
  videoModel: VideoModel;
  videoAspectRatio: VideoAspectRatio;
  videoResolution: VideoResolution;
  videoDurationSetting: VideoDuration;
  videoStartFrame: string | null;
  videoLastFrame: string | null;
  videoSourceVideo: string | null; // For video extension
  videoNegativePrompt: string;

  // Video history
  selectedVideoGenerationId: string | null;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setCanvasImage: (url: string | null) => void;
  setCanvasImages: (urls: string[]) => void;
  setCanvasImageIndex: (index: number) => void;
  setCanvasZoom: (zoom: number) => void;
  setCanvasPan: (pan: { x: number; y: number }) => void;

  addUploadedImage: (url: string) => void;
  removeUploadedImage: (index: number) => void;
  clearUploadedImages: () => void;

  addEditReferenceImage: (url: string) => void;
  removeEditReferenceImage: (index: number) => void;
  clearEditReferenceImages: () => void;

  addBrushStroke: (stroke: BrushStroke) => void;
  clearBrushStrokes: () => void;
  setBrushSize: (size: number) => void;
  setShowMasks: (show: boolean) => void;

  setIsGenerating: (generating: boolean) => void;
  setCurrentPrompt: (prompt: string) => void;
  setTemperature: (temp: number) => void;
  setSeed: (seed: number | null) => void;
  setSelectedModel: (model: string) => void;
  setAspectRatio: (aspectRatio: AspectRatio) => void;
  setResolutionTier: (tier: ResolutionTier) => void;
  setVariantCount: (count: number) => void;
  setSafetyThreshold: (category: HarmCategory, threshold: SafetySetting['threshold']) => void;
  resetSafetySettings: () => void;

  addGeneration: (generation: Generation) => void;
  addEdit: (edit: Edit) => void;
  selectGeneration: (id: string | null) => void;
  selectEdit: (id: string | null) => void;
  setShowHistory: (show: boolean) => void;

  setShowPromptPanel: (show: boolean) => void;

  setSelectedTool: (tool: 'generate' | 'edit' | 'mask' | 'video') => void;

  // Video actions
  setCanvasVideo: (url: string | null) => void;
  setCanvasVideoThumbnail: (url: string | null) => void;
  setIsVideoPlaying: (playing: boolean) => void;
  setVideoCurrentTime: (time: number) => void;
  setVideoDuration: (duration: number) => void;
  setVideoMuted: (muted: boolean) => void;

  setVideoModel: (model: VideoModel) => void;
  setVideoAspectRatio: (ratio: VideoAspectRatio) => void;
  setVideoResolution: (resolution: VideoResolution) => void;
  setVideoDurationSetting: (duration: VideoDuration) => void;
  setVideoStartFrame: (frame: string | null) => void;
  setVideoLastFrame: (frame: string | null) => void;
  setVideoSourceVideo: (video: string | null) => void;
  setVideoNegativePrompt: (prompt: string) => void;

  addVideoGeneration: (generation: VideoGeneration) => void;
  selectVideoGeneration: (id: string | null) => void;
  clearVideoSession: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentProject: null,
      canvasImage: null,
      canvasImages: [],
      canvasImageIndex: 0,
      canvasZoom: 1,
      canvasPan: { x: 0, y: 0 },

      uploadedImages: [],
      editReferenceImages: [],

      brushStrokes: [],
      brushSize: 20,
      showMasks: true,

      isGenerating: false,
      currentPrompt: '',
      temperature: 0.7,
      seed: null,
      selectedModel: 'gemini-3-pro-image-preview',
      safetySettings: DEFAULT_SAFETY_SETTINGS,
      aspectRatio: 'auto',
      resolutionTier: '1K',
      variantCount: 1,

      selectedGenerationId: null,
      selectedEditId: null,
      showHistory: true,

      showPromptPanel: true,

      selectedTool: 'generate',

      // Video canvas state
      canvasVideo: null,
      canvasVideoThumbnail: null,
      isVideoPlaying: false,
      videoCurrentTime: 0,
      videoDuration: 0,
      videoMuted: false,

      // Video generation settings
      videoModel: 'veo-3.0-generate-001',
      videoAspectRatio: '16:9',
      videoResolution: '720p',
      videoDurationSetting: 4,
      videoStartFrame: null,
      videoLastFrame: null,
      videoSourceVideo: null,
      videoNegativePrompt: '',

      // Video history
      selectedVideoGenerationId: null,

      // Actions
      setCurrentProject: (project) => set({ currentProject: project }),
      setCanvasImage: (url) => set({
        canvasImage: url,
        canvasImages: url ? [url] : [],
        canvasImageIndex: 0
      }),
      setCanvasImages: (urls) => set({
        canvasImages: urls,
        canvasImage: urls[0] ?? null,
        canvasImageIndex: 0
      }),
      setCanvasImageIndex: (index) => set((state) => {
        if (state.canvasImages.length === 0) return state;
        const len = state.canvasImages.length;
        const nextIndex = ((index % len) + len) % len;
        return {
          canvasImageIndex: nextIndex,
          canvasImage: state.canvasImages[nextIndex]
        };
      }),
      setCanvasZoom: (zoom) => set({ canvasZoom: zoom }),
      setCanvasPan: (pan) => set({ canvasPan: pan }),

      addUploadedImage: (url) => set((state) => ({
        uploadedImages: [...state.uploadedImages, url]
      })),
      removeUploadedImage: (index) => set((state) => ({
        uploadedImages: state.uploadedImages.filter((_, i) => i !== index)
      })),
      clearUploadedImages: () => set({ uploadedImages: [] }),

      addEditReferenceImage: (url) => set((state) => ({
        editReferenceImages: [...state.editReferenceImages, url]
      })),
      removeEditReferenceImage: (index) => set((state) => ({
        editReferenceImages: state.editReferenceImages.filter((_, i) => i !== index)
      })),
      clearEditReferenceImages: () => set({ editReferenceImages: [] }),

      addBrushStroke: (stroke) => set((state) => ({
        brushStrokes: [...state.brushStrokes, stroke]
      })),
      clearBrushStrokes: () => set({ brushStrokes: [] }),
      setBrushSize: (size) => set({ brushSize: size }),
      setShowMasks: (show) => set({ showMasks: show }),

      setIsGenerating: (generating) => set({ isGenerating: generating }),
      setCurrentPrompt: (prompt) => set({ currentPrompt: prompt }),
      setTemperature: (temp) => set({ temperature: temp }),
      setSeed: (seed) => set({ seed: seed }),
      setSelectedModel: (model) => set((state) => ({
        selectedModel: model,
        resolutionTier: model === 'gemini-2.5-flash-image' ? '1K' : state.resolutionTier
      })),
      setAspectRatio: (aspectRatio) => set({ aspectRatio }),
      setResolutionTier: (tier) => set({ resolutionTier: tier }),
      setVariantCount: (count) => set({ variantCount: Math.max(1, Math.floor(count)) }),
      setSafetyThreshold: (category, threshold) => set((state) => ({
        safetySettings: state.safetySettings.map((s) =>
          s.category === category ? { ...s, threshold } : s
        )
      })),
      resetSafetySettings: () => set({ safetySettings: DEFAULT_SAFETY_SETTINGS }),

      addGeneration: (generation) => set((state) => ({
        currentProject: state.currentProject ? {
          ...state.currentProject,
          generations: [...state.currentProject.generations, generation],
          updatedAt: Date.now()
        } : null
      })),

      addEdit: (edit) => set((state) => ({
        currentProject: state.currentProject ? {
          ...state.currentProject,
          edits: [...state.currentProject.edits, edit],
          updatedAt: Date.now()
        } : null
      })),

      selectGeneration: (id) => set({ selectedGenerationId: id }),
      selectEdit: (id) => set({ selectedEditId: id }),
      setShowHistory: (show) => set({ showHistory: show }),

      setShowPromptPanel: (show) => set({ showPromptPanel: show }),

      setSelectedTool: (tool) => set({ selectedTool: tool }),

      // Video actions
      setCanvasVideo: (url) => set({
        canvasVideo: url,
        isVideoPlaying: false,
        videoCurrentTime: 0
      }),
      setCanvasVideoThumbnail: (url) => set({ canvasVideoThumbnail: url }),
      setIsVideoPlaying: (playing) => set({ isVideoPlaying: playing }),
      setVideoCurrentTime: (time) => set({ videoCurrentTime: time }),
      setVideoDuration: (duration) => set({ videoDuration: duration }),
      setVideoMuted: (muted) => set({ videoMuted: muted }),

      setVideoModel: (model) => set({ videoModel: model }),
      setVideoAspectRatio: (ratio) => set({ videoAspectRatio: ratio }),
      setVideoResolution: (resolution) => set({ videoResolution: resolution }),
      setVideoDurationSetting: (duration) => set({ videoDurationSetting: duration }),
      setVideoStartFrame: (frame) => set({ videoStartFrame: frame }),
      setVideoLastFrame: (frame) => set({ videoLastFrame: frame }),
      setVideoSourceVideo: (video) => set({ videoSourceVideo: video }),
      setVideoNegativePrompt: (prompt) => set({ videoNegativePrompt: prompt }),

      addVideoGeneration: (generation) => set((state) => ({
        currentProject: state.currentProject ? {
          ...state.currentProject,
          videoGenerations: [...(state.currentProject.videoGenerations || []), generation],
          updatedAt: Date.now()
        } : null
      })),

      selectVideoGeneration: (id) => set({ selectedVideoGenerationId: id }),

      clearVideoSession: () => set({
        canvasVideo: null,
        canvasVideoThumbnail: null,
        isVideoPlaying: false,
        videoCurrentTime: 0,
        videoDuration: 0,
        videoStartFrame: null,
        videoLastFrame: null,
        videoSourceVideo: null,
        videoNegativePrompt: '',
        videoMuted: false,
      }),
    }),
    { name: 'nano-banana-store' }
  )
);
