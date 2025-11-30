import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Project, Generation, Edit, SegmentationMask, BrushStroke, SafetySetting, HarmCategory } from '../types';

const DEFAULT_SAFETY_SETTINGS: SafetySetting[] = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_LOW_AND_ABOVE' },
];

interface AppState {
  // Current project
  currentProject: Project | null;

  // Canvas state
  canvasImage: string | null;
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

  // History and variants
  selectedGenerationId: string | null;
  selectedEditId: string | null;
  showHistory: boolean;

  // Panel visibility
  showPromptPanel: boolean;

  // UI state
  selectedTool: 'generate' | 'edit' | 'mask';

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setCanvasImage: (url: string | null) => void;
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
  setSafetyThreshold: (category: HarmCategory, threshold: SafetySetting['threshold']) => void;
  resetSafetySettings: () => void;

  addGeneration: (generation: Generation) => void;
  addEdit: (edit: Edit) => void;
  selectGeneration: (id: string | null) => void;
  selectEdit: (id: string | null) => void;
  setShowHistory: (show: boolean) => void;

  setShowPromptPanel: (show: boolean) => void;

  setSelectedTool: (tool: 'generate' | 'edit' | 'mask') => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentProject: null,
      canvasImage: null,
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

      selectedGenerationId: null,
      selectedEditId: null,
      showHistory: true,

      showPromptPanel: true,

      selectedTool: 'generate',

      // Actions
      setCurrentProject: (project) => set({ currentProject: project }),
      setCanvasImage: (url) => set({ canvasImage: url }),
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
      setSelectedModel: (model) => set({ selectedModel: model }),
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
    }),
    { name: 'nano-banana-store' }
  )
);