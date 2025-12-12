import { get, set, del, keys } from 'idb-keyval';
import { Project, Generation, Asset, BatchQueueRequest, VideoBatchQueueRequest, VideoGeneration } from '../types';

const CACHE_PREFIX = 'nano-banana';
const CACHE_VERSION = '1.0';

export class CacheService {
  private static getKey(type: string, id: string): string {
    return `${CACHE_PREFIX}-${CACHE_VERSION}-${type}-${id}`;
  }

  // Project caching
  static async saveProject(project: Project): Promise<void> {
    await set(this.getKey('project', project.id), project);
  }

  static async getProject(id: string): Promise<Project | null> {
    return (await get(this.getKey('project', id))) || null;
  }

  static async getAllProjects(): Promise<Project[]> {
    const allKeys = await keys();
    const projectKeys = allKeys.filter(key => 
      typeof key === 'string' && key.includes(`${CACHE_PREFIX}-${CACHE_VERSION}-project-`)
    );
    
    const projects = await Promise.all(
      projectKeys.map(key => get(key as string))
    );
    
    return projects.filter(Boolean) as Project[];
  }

  // Asset caching (for offline access)
  static async cacheAsset(asset: Asset, data: Blob): Promise<void> {
    await set(this.getKey('asset', asset.id), {
      asset,
      data,
      cachedAt: Date.now()
    });
  }

  static async getCachedAsset(assetId: string): Promise<{ asset: Asset; data: Blob } | null> {
    const cached = await get(this.getKey('asset', assetId));
    return cached || null;
  }

  // Generation metadata caching
  static async cacheGeneration(generation: Generation): Promise<void> {
    await set(this.getKey('generation', generation.id), generation);
  }

  static async getGeneration(id: string): Promise<Generation | null> {
    return (await get(this.getKey('generation', id))) || null;
  }

  // Clear old cache entries
  static async clearOldCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const allKeys = await keys();
    const now = Date.now();
    
    for (const key of allKeys) {
      if (typeof key === 'string' && key.startsWith(CACHE_PREFIX)) {
        const cached = await get(key);
        if (cached?.cachedAt && (now - cached.cachedAt) > maxAge) {
          await del(key);
        }
      }
    }
  }

  // Batch Queue Request methods
  static async saveQueuedRequest(request: BatchQueueRequest): Promise<void> {
    await set(this.getKey('queue', request.id), request);
  }

  static async getQueuedRequest(id: string): Promise<BatchQueueRequest | null> {
    return (await get(this.getKey('queue', id))) || null;
  }

  static async getAllQueuedRequests(): Promise<BatchQueueRequest[]> {
    const allKeys = await keys();
    const queueKeys = allKeys.filter(key =>
      typeof key === 'string' && key.includes(`${CACHE_PREFIX}-${CACHE_VERSION}-queue-`)
    );

    const requests = await Promise.all(
      queueKeys.map(key => get(key as string))
    );

    return (requests.filter(Boolean) as BatchQueueRequest[])
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  static async updateQueuedRequest(id: string, updates: Partial<BatchQueueRequest>): Promise<void> {
    const existing = await this.getQueuedRequest(id);
    if (existing) {
      await set(this.getKey('queue', id), { ...existing, ...updates });
    }
  }

  static async deleteQueuedRequest(id: string): Promise<void> {
    await del(this.getKey('queue', id));
  }

  // Video Batch Queue Request methods
  static async saveVideoQueuedRequest(request: VideoBatchQueueRequest): Promise<void> {
    await set(this.getKey('video-queue', request.id), request);
  }

  static async getVideoQueuedRequest(id: string): Promise<VideoBatchQueueRequest | null> {
    return (await get(this.getKey('video-queue', id))) || null;
  }

  static async getAllVideoQueuedRequests(): Promise<VideoBatchQueueRequest[]> {
    const allKeys = await keys();
    const queueKeys = allKeys.filter(key =>
      typeof key === 'string' && key.includes(`${CACHE_PREFIX}-${CACHE_VERSION}-video-queue-`)
    );

    const requests = await Promise.all(
      queueKeys.map(key => get(key as string))
    );

    return (requests.filter(Boolean) as VideoBatchQueueRequest[])
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  static async updateVideoQueuedRequest(id: string, updates: Partial<VideoBatchQueueRequest>): Promise<void> {
    const existing = await this.getVideoQueuedRequest(id);
    if (existing) {
      await set(this.getKey('video-queue', id), { ...existing, ...updates });
    }
  }

  static async deleteVideoQueuedRequest(id: string): Promise<void> {
    await del(this.getKey('video-queue', id));
  }

  // Video generation caching
  static async cacheVideoGeneration(generation: VideoGeneration): Promise<void> {
    await set(this.getKey('video-generation', generation.id), generation);
  }

  static async getVideoGeneration(id: string): Promise<VideoGeneration | null> {
    return (await get(this.getKey('video-generation', id))) || null;
  }
}