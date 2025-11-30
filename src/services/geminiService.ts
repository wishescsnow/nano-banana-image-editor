import { GoogleGenAI } from '@google/genai';

// Note: In production, this should be handled via a backend proxy
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'demo-key';
const genAI = new GoogleGenAI({ apiKey: API_KEY });

const safetySettings = [
  {
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_LOW_AND_ABOVE",
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH",
    threshold: "BLOCK_LOW_AND_ABOVE",
  },
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_LOW_AND_ABOVE",
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_LOW_AND_ABOVE",
  },
  {
    category: "HARM_CATEGORY_CIVIC_INTEGRITY",
    threshold: "BLOCK_LOW_AND_ABOVE",
  },
];

export interface GenerationRequest {
  prompt: string;
  referenceImages?: string[]; // base64 array
  temperature?: number;
  seed?: number;
}

export interface EditRequest {
  instruction: string;
  originalImage: string; // base64
  referenceImages?: string[]; // base64 array
  maskImage?: string; // base64
  temperature?: number;
  seed?: number;
}

export interface SegmentationRequest {
  image: string; // base64
  query: string; // "the object at pixel (x,y)" or "the red car"
}

export class GeminiService {
  async generateImage(request: GenerationRequest): Promise<string[]> {
    try {
      const contents: any[] = [{ text: request.prompt }];

      // Add reference images if provided
      if (request.referenceImages && request.referenceImages.length > 0) {
        request.referenceImages.forEach(image => {
          contents.push({
            inlineData: {
              mimeType: "image/png",
              data: image,
            },
          });
        });
      }

      const response = await genAI.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents,
        config: {
          safetySettings: safetySettings,
        },
      });

      const images: string[] = [];
      console.log('response', response);

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          images.push(part.inlineData.data);
        }
      }

      return images;
    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error('Failed to generate image. Please try again.');
    }
  }

  async editImage(request: EditRequest): Promise<string[]> {
    try {
      const contents = [
        { text: this.buildEditPrompt(request) },
        {
          inlineData: {
            mimeType: "image/png",
            data: request.originalImage,
          },
        },
      ];

      // Add reference images if provided
      if (request.referenceImages && request.referenceImages.length > 0) {
        request.referenceImages.forEach(image => {
          contents.push({
            inlineData: {
              mimeType: "image/png",
              data: image,
            },
          });
        });
      }

      if (request.maskImage) {
        contents.push({
          inlineData: {
            mimeType: "image/png",
            data: request.maskImage,
          },
        });
      }

      const response = await genAI.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents,
        config: {
          safetySettings: safetySettings,
        },
      });

      const images: string[] = [];
      console.log('response', response);

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          images.push(part.inlineData.data);
        }
      }

      return images;
    } catch (error) {
      console.error('Error editing image:', error);
      throw new Error('Failed to edit image. Please try again.');
    }
  }

  async segmentImage(request: SegmentationRequest): Promise<any> {
    try {
      const prompt = [
        {
          text: `Analyze this image and create a segmentation mask for: ${request.query}

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

Only segment the specific object or region requested. The mask should be a binary PNG where white pixels (255) indicate the selected region and black pixels (0) indicate the background.` },
        {
          inlineData: {
            mimeType: "image/png",
            data: request.image,
          },
        },
      ];

      const response = await genAI.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: prompt,
        config: {
          safetySettings: safetySettings,
        },
      });
      console.log('response', response);

      const responseText = response.candidates[0].content.parts[0].text;
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error segmenting image:', error);
      throw new Error('Failed to segment image. Please try again.');
    }
  }

  private buildEditPrompt(request: EditRequest): string {
    const maskInstruction = request.maskImage
      ? "\n\nIMPORTANT: Apply changes ONLY where the mask image shows white pixels (value 255). Leave all other areas completely unchanged. Respect the mask boundaries precisely and maintain seamless blending at the edges."
      : "";

    return `Edit this image according to the following instruction: ${request.instruction}

Maintain the original image's lighting, perspective, and overall composition. Make the changes look natural and seamlessly integrated.${maskInstruction}

Preserve image quality and ensure the edit looks professional and realistic.`;
  }

  // Batch API methods
  async submitBatchRequest(request: GenerationRequest): Promise<{ batchName: string }> {
    try {
      const contents: any[] = [{ text: request.prompt }];

      if (request.referenceImages && request.referenceImages.length > 0) {
        request.referenceImages.forEach(image => {
          contents.push({
            inlineData: {
              mimeType: "image/png",
              data: image,
            },
          });
        });
      }

      // For image generation, must specify responseModalities
      const inlinedRequests = [{
        contents: [{
          parts: contents,
          role: 'user' as const
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE']
        },
        safetySettings: safetySettings
      }];

      const response = await genAI.batches.create({
        model: 'gemini-3-pro-image-preview',
        src: inlinedRequests,
        config: {
          displayName: `batch-${Date.now()}`,
        }
      });

      console.log('Batch job created:', response);
      return { batchName: response.name || '' };
    } catch (error) {
      console.error('Error submitting batch request:', error);
      throw new Error('Failed to submit batch request. Please try again.');
    }
  }

  async getBatchStatus(batchName: string): Promise<{
    state: string;
    destFileName?: string;
  }> {
    try {
      const response = await genAI.batches.get({ name: batchName });
      return {
        state: response.state || 'UNKNOWN',
        destFileName: response.dest?.fileName
      };
    } catch (error) {
      console.error('Error getting batch status:', error);
      throw new Error('Failed to get batch status.');
    }
  }

  async getBatchResults(batchName: string): Promise<string[]> {
    try {
      const batchJob = await genAI.batches.get({ name: batchName });
      console.log('Batch job result:', JSON.stringify(batchJob, null, 2));

      if (batchJob.state !== 'JOB_STATE_SUCCEEDED') {
        throw new Error(`Batch job not completed. Current state: ${batchJob.state}`);
      }

      const images: string[] = [];
      const dest = batchJob.dest as any;

      // Check for inlinedResponses (inline request results)
      if (dest?.inlinedResponses && dest.inlinedResponses.length > 0) {
        console.log('Found inlinedResponses:', dest.inlinedResponses.length);
        for (const item of dest.inlinedResponses) {
          const response = item.response;
          if (response?.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData?.data) {
                console.log('Found image data, length:', part.inlineData.data.length);
                images.push(part.inlineData.data);
              }
            }
          }
        }
      }

      // Also check top-level responses property (alternative structure)
      if (dest?.responses && dest.responses.length > 0) {
        console.log('Found responses:', dest.responses.length);
        for (const response of dest.responses) {
          if (response?.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData?.data) {
                console.log('Found image data in responses, length:', part.inlineData.data.length);
                images.push(part.inlineData.data);
              }
            }
          }
        }
      }

      console.log('Total images found:', images.length);
      return images;
    } catch (error) {
      console.error('Error getting batch results:', error);
      throw new Error('Failed to get batch results.');
    }
  }
}

export const geminiService = new GeminiService();