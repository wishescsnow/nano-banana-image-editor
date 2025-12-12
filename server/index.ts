import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Gemini
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

const genAI = new GoogleGenAI({ apiKey: API_KEY });

// Constants
const DEFAULT_MODEL = 'gemini-3-pro-image-preview';
const DEFAULT_VIDEO_MODEL = 'veo-3.0-generate-001';

const VIDEO_MODELS = [
  'veo-3.1-generate-preview',
  'veo-3.1-fast-generate-preview',
  'veo-3.0-generate-001',
  'veo-3.0-fast-generate-001'
] as const;

const DEFAULT_SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_LOW_AND_ABOVE' },
];

// Helper functions
function buildEditPrompt(instruction: string, hasMask: boolean): string {
  const maskInstruction = hasMask
    ? "\n\nIMPORTANT: Apply changes ONLY where the mask image shows white pixels (value 255). Leave all other areas completely unchanged. Respect the mask boundaries precisely and maintain seamless blending at the edges."
    : "";

  return `Edit this image according to the following instruction: ${instruction}

Maintain the original image's lighting, perspective, and overall composition. Make the changes look natural and seamlessly integrated.${maskInstruction}

Preserve image quality and ensure the edit looks professional and realistic.`;
}

function buildSegmentationPrompt(query: string): string {
  return `Analyze this image and create a segmentation mask for: ${query}

Return a JSON object with this exact structure:
{
  "masks": [
    {
      "label": "description of the segmented object",
      "box_2d": [x, y, width, height],
      "mask": "base64-encoded binary mask image"
    }
  ]
}

Only segment the specific object or region requested. The mask should be a binary PNG where white pixels (255) indicate the selected region and black pixels (0) indicate the background.`;
}

function buildImageConfig(aspectRatio?: string, resolutionTier?: string) {
  const imageConfig: Record<string, string> = {};
  if (aspectRatio && aspectRatio !== 'auto') {
    imageConfig.aspectRatio = aspectRatio;
  }
  if (resolutionTier) {
    imageConfig.imageSize = resolutionTier;
  }
  return Object.keys(imageConfig).length > 0 ? imageConfig : undefined;
}

// POST /api/generate - Generate images from prompt
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, referenceImages, temperature, seed, model, safetySettings, aspectRatio, resolutionTier, variantCount } = req.body;

    const contents: any[] = [];
    const config: Record<string, unknown> = {
      safetySettings: safetySettings ?? DEFAULT_SAFETY_SETTINGS,
    };

    if (temperature !== undefined) {
      config.temperature = temperature;
    }
    if (seed !== undefined) {
      config.seed = seed;
    }
    if (variantCount !== undefined) {
      config.candidateCount = Math.max(1, Number(variantCount) || 1);
    }
    const imageConfig = buildImageConfig(aspectRatio, resolutionTier);
    if (imageConfig) {
      config.imageConfig = imageConfig;
    }

    // Add prompt first
    contents.push({ text: prompt });

    // Add reference images if provided
    if (referenceImages && referenceImages.length > 0) {
      contents.push({
        text: `[${referenceImages.length} reference image(s) provided as reference-1 through reference-${referenceImages.length}]`
      });
      referenceImages.forEach((image: string, index: number) => {
        contents.push({ text: `reference-${index + 1}:` });
        contents.push({
          inlineData: {
            mimeType: "image/png",
            data: image,
          },
        });
      });
    }

    const response = await genAI.models.generateContent({
      model: model ?? DEFAULT_MODEL,
      contents,
      config,
    });

    const images: string[] = [];
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        images.push(part.inlineData.data);
      }
    }

    res.json({ images });
  } catch (error: any) {
    console.error('Error in /api/generate:', error);
    res.status(500).json({ error: error.message || 'Failed to generate image' });
  }
});

// POST /api/edit - Edit an existing image
app.post('/api/edit', async (req, res) => {
  try {
    const { instruction, originalImage, referenceImages, maskImage, temperature, seed, model, safetySettings, aspectRatio, resolutionTier, variantCount } = req.body;

    const contents: any[] = [];
    const config: Record<string, unknown> = {
      safetySettings: safetySettings ?? DEFAULT_SAFETY_SETTINGS,
    };

    if (temperature !== undefined) {
      config.temperature = temperature;
    }
    if (seed !== undefined) {
      config.seed = seed;
    }
    if (variantCount !== undefined) {
      config.candidateCount = Math.max(1, Number(variantCount) || 1);
    }
    const imageConfig = buildImageConfig(aspectRatio, resolutionTier);
    if (imageConfig) {
      config.imageConfig = imageConfig;
    }

    // Add instruction first
    contents.push({ text: buildEditPrompt(instruction, !!maskImage) });

    // Add original image to edit
    contents.push({
      inlineData: {
        mimeType: "image/png",
        data: originalImage,
      },
    });

    // Add reference images if provided
    if (referenceImages && referenceImages.length > 0) {
      contents.push({
        text: `[${referenceImages.length} reference image(s) provided as reference-1 through reference-${referenceImages.length}]`
      });
      referenceImages.forEach((image: string, index: number) => {
        contents.push({ text: `reference-${index + 1}:` });
        contents.push({
          inlineData: {
            mimeType: "image/png",
            data: image,
          },
        });
      });
    }

    // Add mask image if provided
    if (maskImage) {
      contents.push({
        inlineData: {
          mimeType: "image/png",
          data: maskImage,
        },
      });
    }

    const response = await genAI.models.generateContent({
      model: model ?? DEFAULT_MODEL,
      contents,
      config,
    });

    const images: string[] = [];
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        images.push(part.inlineData.data);
      }
    }

    res.json({ images });
  } catch (error: any) {
    console.error('Error in /api/edit:', error);
    res.status(500).json({ error: error.message || 'Failed to edit image' });
  }
});

// POST /api/segment - Segment an image
app.post('/api/segment', async (req, res) => {
  try {
    const { query, image, maskImage, temperature, seed, model, safetySettings, aspectRatio, resolutionTier } = req.body;

    if ((image && maskImage) || (!image && !maskImage)) {
      return res.status(400).json({ error: 'Provide either image or maskImage, but not both' });
    }

    const targetImage = maskImage ?? image;

    const contents = [
      { text: buildSegmentationPrompt(query) },
      {
        inlineData: {
          mimeType: "image/png",
          data: targetImage,
        },
      },
    ];

    const config: Record<string, unknown> = {
      safetySettings: safetySettings ?? DEFAULT_SAFETY_SETTINGS,
    };

    if (temperature !== undefined) {
      config.temperature = temperature;
    }
    if (seed !== undefined) {
      config.seed = seed;
    }
    const imageConfig = buildImageConfig(aspectRatio, resolutionTier);
    if (imageConfig) {
      config.imageConfig = imageConfig;
    }

    const response = await genAI.models.generateContent({
      model: model ?? DEFAULT_MODEL,
      contents,
      config,
    });

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('No response text received');
    }

    // Try to parse as JSON, otherwise return raw text
    try {
      const jsonResponse = JSON.parse(responseText);
      res.json(jsonResponse);
    } catch {
      res.json({ raw: responseText });
    }
  } catch (error: any) {
    console.error('Error in /api/segment:', error);
    res.status(500).json({ error: error.message || 'Failed to segment image' });
  }
});

// POST /api/batch/generate - Submit batch generation request
app.post('/api/batch/generate', async (req, res) => {
  try {
    const { prompt, referenceImages, temperature, seed, model, safetySettings, aspectRatio, resolutionTier, variantCount } = req.body;

    const contents: any[] = [];

    contents.push({ text: prompt });

    if (referenceImages && referenceImages.length > 0) {
      contents.push({
        text: `[${referenceImages.length} reference image(s) provided as reference-1 through reference-${referenceImages.length}]`
      });
      referenceImages.forEach((image: string, index: number) => {
        contents.push({ text: `reference-${index + 1}:` });
        contents.push({
          inlineData: {
            mimeType: "image/png",
            data: image,
          },
        });
      });
    }

    const inlinedConfig: Record<string, unknown> = {
      safetySettings: safetySettings ?? DEFAULT_SAFETY_SETTINGS,
    };

    if (temperature !== undefined) {
      inlinedConfig.temperature = temperature;
    }
    if (seed !== undefined) {
      inlinedConfig.seed = seed;
    }
    const imageConfig = buildImageConfig(aspectRatio, resolutionTier);
    if (imageConfig) {
      inlinedConfig.imageConfig = imageConfig;
    }

    const requestCount = Math.max(1, Number(variantCount) || 1);
    const inlinedRequests = Array.from({ length: requestCount }, () => ({
      contents: [{
        parts: contents,
        role: 'user' as const
      }],
      config: inlinedConfig,
    }));

    const response = await genAI.batches.create({
      model: model ?? DEFAULT_MODEL,
      src: inlinedRequests,
      config: {
        displayName: `batch-${Date.now()}`,
      }
    });

    res.json({ batchName: response.name || '' });
  } catch (error: any) {
    console.error('Error in /api/batch/generate:', error);
    res.status(500).json({ error: error.message || 'Failed to submit batch request' });
  }
});

// POST /api/batch/edit - Submit batch edit request
app.post('/api/batch/edit', async (req, res) => {
  try {
    const { instruction, originalImage, referenceImages, maskImage, temperature, seed, model, safetySettings, aspectRatio, resolutionTier, variantCount } = req.body;

    const contents: any[] = [];

    contents.push({ text: buildEditPrompt(instruction, !!maskImage) });

    contents.push({
      inlineData: {
        mimeType: "image/png",
        data: originalImage,
      },
    });

    if (referenceImages && referenceImages.length > 0) {
      contents.push({
        text: `[${referenceImages.length} reference image(s) provided as reference-1 through reference-${referenceImages.length}]`
      });
      referenceImages.forEach((image: string, index: number) => {
        contents.push({ text: `reference-${index + 1}:` });
        contents.push({
          inlineData: {
            mimeType: "image/png",
            data: image,
          },
        });
      });
    }

    if (maskImage) {
      contents.push({
        inlineData: {
          mimeType: "image/png",
          data: maskImage,
        },
      });
    }

    const inlinedConfig: Record<string, unknown> = {
      safetySettings: safetySettings ?? DEFAULT_SAFETY_SETTINGS,
    };

    if (temperature !== undefined) {
      inlinedConfig.temperature = temperature;
    }
    if (seed !== undefined) {
      inlinedConfig.seed = seed;
    }
    const imageConfig = buildImageConfig(aspectRatio, resolutionTier);
    if (imageConfig) {
      inlinedConfig.imageConfig = imageConfig;
    }

    const requestCount = Math.max(1, Number(variantCount) || 1);
    const inlinedRequests = Array.from({ length: requestCount }, () => ({
      contents: [{
        parts: contents,
        role: 'user' as const
      }],
      config: inlinedConfig,
    }));

    const response = await genAI.batches.create({
      model: model ?? DEFAULT_MODEL,
      src: inlinedRequests,
      config: {
        displayName: `batch-edit-${Date.now()}`,
      }
    });

    res.json({ batchName: response.name || '' });
  } catch (error: any) {
    console.error('Error in /api/batch/edit:', error);
    res.status(500).json({ error: error.message || 'Failed to submit batch edit request' });
  }
});

// POST /api/batch/segment - Submit batch segmentation request
app.post('/api/batch/segment', async (req, res) => {
  try {
    const { query, image, maskImage, temperature, seed, model, safetySettings, aspectRatio, resolutionTier } = req.body;

    if ((image && maskImage) || (!image && !maskImage)) {
      return res.status(400).json({ error: 'Provide either image or maskImage, but not both' });
    }

    const targetImage = maskImage ?? image;

    const contents = [
      { text: buildSegmentationPrompt(query) },
      {
        inlineData: {
          mimeType: "image/png",
          data: targetImage,
        },
      },
    ];

    const inlinedConfig: Record<string, unknown> = {
      safetySettings: safetySettings ?? DEFAULT_SAFETY_SETTINGS,
    };

    if (temperature !== undefined) {
      inlinedConfig.temperature = temperature;
    }
    if (seed !== undefined) {
      inlinedConfig.seed = seed;
    }
    const imageConfig = buildImageConfig(aspectRatio, resolutionTier);
    if (imageConfig) {
      inlinedConfig.imageConfig = imageConfig;
    }

    const inlinedRequests = [{
      contents: [{
        parts: contents,
        role: 'user' as const
      }],
      config: inlinedConfig,
    }];

    const response = await genAI.batches.create({
      model: model ?? DEFAULT_MODEL,
      src: inlinedRequests,
      config: {
        displayName: `batch-segment-${Date.now()}`,
      }
    });

    res.json({ batchName: response.name || '' });
  } catch (error: any) {
    console.error('Error in /api/batch/segment:', error);
    res.status(500).json({ error: error.message || 'Failed to submit batch segment request' });
  }
});

// GET /api/batch/:name - Get batch status
app.get('/api/batch/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const response = await genAI.batches.get({ name });
    res.json({
      state: response.state || 'UNKNOWN',
      destFileName: response.dest?.fileName
    });
  } catch (error: any) {
    console.error('Error in /api/batch/:name:', error);
    res.status(500).json({ error: error.message || 'Failed to get batch status' });
  }
});

// GET /api/batch/:name/results - Get batch results
app.get('/api/batch/:name/results', async (req, res) => {
  try {
    const { name } = req.params;
    const batchJob = await genAI.batches.get({ name });

    if (batchJob.state !== 'JOB_STATE_SUCCEEDED') {
      throw new Error(`Batch job not completed. Current state: ${batchJob.state}`);
    }

    const images: string[] = [];
    const dest = batchJob.dest as any;

    if (dest?.inlinedResponses && dest.inlinedResponses.length > 0) {
      for (const item of dest.inlinedResponses) {
        const response = item.response;
        if (response?.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              images.push(part.inlineData.data);
            }
          }
        }
      }
    }

    if (dest?.responses && dest.responses.length > 0) {
      for (const response of dest.responses) {
        if (response?.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              images.push(part.inlineData.data);
            }
          }
        }
      }
    }

    res.json({ images });
  } catch (error: any) {
    console.error('Error in /api/batch/:name/results:', error);
    res.status(500).json({ error: error.message || 'Failed to get batch results' });
  }
});

// ============================================
// VIDEO GENERATION ENDPOINTS (Veo)
// ============================================

// POST /api/video/generate - Start video generation (returns operation name for polling)
app.post('/api/video/generate', async (req, res) => {
  try {
    const {
      prompt,
      negativePrompt,
      model,
      aspectRatio,
      resolution,
      durationSeconds,
      image,          // base64 - first frame
      lastFrame,      // base64 - last frame
      referenceImages, // base64[] - up to 3 style references
      video,          // base64 - for video extension
      seed
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Build video generation config (for settings like aspectRatio, resolution, etc.)
    const config: Record<string, unknown> = {};

    // Check if this is interpolation mode (both first and last frame)
    const isInterpolationMode = image && lastFrame;

    if (negativePrompt) config.negativePrompt = negativePrompt;
    if (aspectRatio) config.aspectRatio = aspectRatio;

    // Duration and resolution are NOT allowed in interpolation mode
    if (!isInterpolationMode) {
      if (resolution) config.resolution = resolution;
      if (durationSeconds) config.durationSeconds = durationSeconds;
    }

    if (seed !== undefined) config.seed = seed;

    // Build the generateVideos request params
    // Note: image, video are TOP-LEVEL params, lastFrame goes in config
    const generateParams: Record<string, unknown> = {
      model: model && VIDEO_MODELS.includes(model) ? model : DEFAULT_VIDEO_MODEL,
      prompt,
    };

    // Add config if we have any settings
    if (Object.keys(config).length > 0) {
      generateParams.config = config;
    }

    // Add first frame image (image-to-video) - TOP LEVEL param
    if (image) {
      generateParams.image = {
        imageBytes: image,
        mimeType: 'image/png'
      };
    }

    // Add last frame image (interpolation mode) - INSIDE CONFIG
    if (lastFrame) {
      console.log('Interpolation mode:', isInterpolationMode);
      config.lastFrame = {
        imageBytes: lastFrame,
        mimeType: 'image/png'
      };
      generateParams.config = config;
    }

    // Add reference images (up to 3) - TOP LEVEL param
    if (referenceImages && referenceImages.length > 0) {
      generateParams.referenceImages = referenceImages.slice(0, 3).map((img: string) => ({
        referenceImage: {
          imageBytes: img,
          mimeType: 'image/png'
        },
        referenceType: 'REFERENCE_TYPE_STYLE'
      }));
    }

    // Add source video for extension - TOP LEVEL param
    if (video) {
      generateParams.video = {
        videoBytes: video,
        mimeType: 'video/mp4'
      };
    }

    // Log the params (without image bytes for brevity)
    const paramsForLog = { ...generateParams };
    if (paramsForLog.image) paramsForLog.image = { ...(generateParams.image as any), imageBytes: `[${(generateParams.image as any).imageBytes.length} chars]` };
    if (paramsForLog.config && (paramsForLog.config as any).lastFrame) {
      paramsForLog.config = { ...(paramsForLog.config as any), lastFrame: { ...((paramsForLog.config as any).lastFrame), imageBytes: `[${((paramsForLog.config as any).lastFrame).imageBytes.length} chars]` } };
    }

    // Call Veo API - returns long-running operation
    const operation = await genAI.models.generateVideos(generateParams as any);

    res.json({
      operationName: operation.name,
      model: generateParams.model as string
    });
  } catch (error: any) {
    console.error('Error in /api/video/generate:', error);
    res.status(500).json({ error: error.message || 'Failed to start video generation' });
  }
});

// GET /api/video/operation/status - Poll video operation status
// Operation name passed as query param to handle names with slashes
// Uses REST API directly since SDK requires full operation object which can't be serialized
app.get('/api/video/operation/status', async (req, res) => {
  try {
    const operationName = req.query.name as string;

    if (!operationName) {
      return res.status(400).json({ error: 'Operation name is required' });
    }

    // Poll operation status using REST API directly
    // The SDK's getVideosOperation requires the full operation object with internal methods,
    // which we can't reconstruct from just the name string
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${API_KEY}`;
    const apiResponse = await fetch(apiUrl);

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed with status ${apiResponse.status}`);
    }

    const operation = await apiResponse.json();

    const response: {
      done: boolean;
      state: string;
      error?: string;
      progress?: number;
    } = {
      done: operation.done ?? false,
      state: operation.done
        ? (operation.error ? 'FAILED' : 'SUCCEEDED')
        : 'RUNNING'
    };

    if (operation.error) {
      response.error = operation.error.message || 'Video generation failed';
    }

    // Include progress metadata if available
    const metadata = operation.metadata;
    if (metadata?.progress) {
      response.progress = metadata.progress;
    }

    res.json(response);
  } catch (error: any) {
    console.error('Error in /api/video/operation/status:', error);
    res.status(500).json({ error: error.message || 'Failed to get operation status' });
  }
});

// GET /api/video/operation/result - Get completed video as base64
// Operation name passed as query param to handle names with slashes
// Uses REST API directly since SDK requires full operation object
app.get('/api/video/operation/result', async (req, res) => {
  try {
    const operationName = req.query.name as string;

    if (!operationName) {
      return res.status(400).json({ error: 'Operation name is required' });
    }

    // First verify operation is complete using REST API
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${API_KEY}`;
    const apiResponse = await fetch(apiUrl);

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed with status ${apiResponse.status}`);
    }

    const operation = await apiResponse.json();

    if (!operation.done) {
      return res.status(400).json({
        error: 'Video generation not complete',
        state: 'RUNNING'
      });
    }

    if (operation.error) {
      return res.status(400).json({
        error: operation.error.message || 'Video generation failed',
        state: 'FAILED'
      });
    }

    // Get the video from the response
    // The REST API response structure differs from SDK - check both possible formats
    const response = operation.response;
    const generatedVideos = response?.generateVideoResponse?.generatedSamples ||
      response?.generatedVideos ||
      response?.videos;

    if (!generatedVideos || generatedVideos.length === 0) {
      return res.status(404).json({ error: 'No video generated' });
    }

    const videoData = generatedVideos[0].video || generatedVideos[0];

    // Check if video has URI (needs download) or base64 data
    if (videoData.uri) {
      // Download video from URI directly via fetch
      // URI may already have query params (e.g., ?alt=media), so use & if needed
      const separator = videoData.uri.includes('?') ? '&' : '?';
      const downloadUrl = `${videoData.uri}${separator}key=${API_KEY}`;
      console.log('Downloading video from URI:', downloadUrl);
      const videoResponse = await fetch(downloadUrl);

      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.status}`);
      }

      const videoBuffer = await videoResponse.arrayBuffer();
      const base64Video = Buffer.from(videoBuffer).toString('base64');

      res.json({
        video: base64Video,
        mimeType: videoData.mimeType || videoData.encoding || 'video/mp4',
        durationSeconds: videoData.duration || 0,
        width: videoData.width || 1920,
        height: videoData.height || 1080
      });
    } else if (videoData.encodedVideo || videoData.videoBytes) {
      // Video is already base64 encoded
      res.json({
        video: videoData.encodedVideo || videoData.videoBytes,
        mimeType: videoData.mimeType || videoData.encoding || 'video/mp4',
        durationSeconds: videoData.duration || 0,
        width: videoData.width || 1920,
        height: videoData.height || 1080
      });
    } else {
      console.error('Unexpected video response format:', JSON.stringify(videoData, null, 2));
      console.error('Full response:', JSON.stringify(response, null, 2));
      return res.status(500).json({ error: 'Unexpected video response format' });
    }
  } catch (error: any) {
    console.error('Error in /api/video/operation/result:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve video' });
  }
});

// Note: Video generation does not support the Batch API like images do.
// Video generation is inherently async - you start a generation and poll for completion.
// The frontend "queue" for video uses the regular /api/video/generate endpoint
// and tracks progress in the queue panel.

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
