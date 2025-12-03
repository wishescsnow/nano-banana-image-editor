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
    const { prompt, referenceImages, temperature, seed, model, safetySettings, aspectRatio, resolutionTier } = req.body;

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
    const { instruction, originalImage, referenceImages, maskImage, temperature, seed, model, safetySettings, aspectRatio, resolutionTier } = req.body;

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
    const { prompt, referenceImages, temperature, seed, model, safetySettings, aspectRatio, resolutionTier } = req.body;

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
    const { instruction, originalImage, referenceImages, maskImage, temperature, seed, model, safetySettings, aspectRatio, resolutionTier } = req.body;

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

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
