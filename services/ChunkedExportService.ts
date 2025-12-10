/**
 * ChunkedExportService.ts
 * 
 * Handles chunked video export with freemium model:
 * - Free users: Select any 30-second segment
 * - Paid users: Full song export
 * 
 * A Paul Phillips Manifestation
 * Join The Exoditical Moral Architecture Movement: Parserator.com
 */

// Simple EventEmitter for browser compatibility
class EventEmitter {
  private events: { [key: string]: Function[] } = {};
  
  on(event: string, listener: Function) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
  }
  
  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }
  
  off(event: string, listener: Function) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }
}

// Types
export interface ExportSegment {
  startTime: number;
  endTime: number;
  startFrame: number;
  endFrame: number;
  duration: number;
}

export interface ExportOptions {
  sourceFrames: string[];
  audioFile?: File | null;
  segment: ExportSegment;
  resolution: '720p' | '1080p' | '4K';
  frameRate: 24 | 30 | 60;
  isPaidUser: boolean;
  onProgress?: (progress: ExportProgress) => void;
}

export interface ExportProgress {
  phase: 'preparing' | 'processing' | 'encoding' | 'complete' | 'error';
  currentChunk: number;
  totalChunks: number;
  percentComplete: number;
  estimatedTimeRemaining: number;
  message: string;
  error?: string;
}

export interface ChunkResult {
  frames: ImageData[];
  startFrame: number;
  endFrame: number;
  success: boolean;
  error?: string;
}

// Constants
const FREE_TIER_LIMIT = 30; // seconds
const CHUNK_SIZE = 30; // Process in 30-second chunks for memory efficiency
const FRAMES_PER_SECOND = 24;

class ChunkedExportService extends EventEmitter {
  private worker: Worker | null = null;
  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  
  constructor() {
    super();
    this.initializeCanvas();
  }

  private initializeCanvas() {
    // Initialize offscreen canvas for processing
    if (typeof OffscreenCanvas !== 'undefined') {
      this.canvas = new OffscreenCanvas(1920, 1080);
      this.ctx = this.canvas.getContext('2d');
    }
  }

  /**
   * Validate export segment against user tier
   */
  validateSegment(segment: ExportSegment, isPaidUser: boolean): { valid: boolean; error?: string } {
    const duration = segment.endTime - segment.startTime;
    
    if (!isPaidUser && duration > FREE_TIER_LIMIT) {
      return {
        valid: false,
        error: `Free tier limited to ${FREE_TIER_LIMIT} seconds. Selected segment is ${duration} seconds.`
      };
    }
    
    if (segment.startTime < 0) {
      return { valid: false, error: 'Invalid start time' };
    }
    
    if (segment.endTime <= segment.startTime) {
      return { valid: false, error: 'End time must be after start time' };
    }
    
    return { valid: true };
  }

  /**
   * Calculate optimal chunk divisions for export
   */
  private calculateChunks(segment: ExportSegment): ExportSegment[] {
    const chunks: ExportSegment[] = [];
    const duration = segment.endTime - segment.startTime;
    const frameRate = FRAMES_PER_SECOND;
    
    // Split into CHUNK_SIZE second segments
    for (let t = segment.startTime; t < segment.endTime; t += CHUNK_SIZE) {
      const chunkEnd = Math.min(t + CHUNK_SIZE, segment.endTime);
      const startFrame = Math.floor(t * frameRate);
      const endFrame = Math.floor(chunkEnd * frameRate);
      
      chunks.push({
        startTime: t,
        endTime: chunkEnd,
        startFrame,
        endFrame,
        duration: chunkEnd - t
      });
    }
    
    return chunks;
  }

  /**
   * Process a single chunk of frames
   */
  private async processChunk(
    frames: string[],
    chunk: ExportSegment,
    resolution: string
  ): Promise<ChunkResult> {
    try {
      const processedFrames: ImageData[] = [];
      const { startFrame, endFrame } = chunk;
      
      // Process frames in this chunk
      for (let i = startFrame; i <= endFrame && i < frames.length; i++) {
        const frame = frames[i];
        
        // Load and process frame
        const imageData = await this.processFrame(frame, resolution);
        processedFrames.push(imageData);
        
        // Allow browser to breathe every 10 frames
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      return {
        frames: processedFrames,
        startFrame,
        endFrame,
        success: true
      };
      
    } catch (error: any) {
      return {
        frames: [],
        startFrame: chunk.startFrame,
        endFrame: chunk.endFrame,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process individual frame with resolution adjustment
   */
  private async processFrame(frameSrc: string, resolution: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        // Determine target dimensions based on resolution
        const dimensions = this.getResolutionDimensions(resolution);
        
        if (this.canvas && this.ctx) {
          this.canvas.width = dimensions.width;
          this.canvas.height = dimensions.height;
          
          // Draw and scale image
          this.ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
          
          // Get processed image data
          const imageData = this.ctx.getImageData(0, 0, dimensions.width, dimensions.height);
          resolve(imageData);
        } else {
          reject(new Error('Canvas not initialized'));
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load frame'));
      img.src = frameSrc;
    });
  }

  /**
   * Get dimensions for resolution
   */
  private getResolutionDimensions(resolution: string): { width: number; height: number } {
    switch (resolution) {
      case '4K':
        return { width: 3840, height: 2160 };
      case '1080p':
        return { width: 1920, height: 1080 };
      case '720p':
      default:
        return { width: 1280, height: 720 };
    }
  }

  /**
   * Main export function with chunked processing
   */
  async exportVideo(options: ExportOptions): Promise<Blob> {
    const {
      sourceFrames,
      audioFile,
      segment,
      resolution,
      frameRate,
      isPaidUser,
      onProgress
    } = options;

    // Validate segment
    const validation = this.validateSegment(segment, isPaidUser);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Calculate chunks
    const chunks = this.calculateChunks(segment);
    const totalChunks = chunks.length;
    
    // Process chunks
    const allProcessedFrames: ImageData[] = [];
    let processedChunks = 0;
    
    for (const chunk of chunks) {
      // Update progress
      if (onProgress) {
        onProgress({
          phase: 'processing',
          currentChunk: processedChunks + 1,
          totalChunks,
          percentComplete: (processedChunks / totalChunks) * 70, // 70% for processing
          estimatedTimeRemaining: this.estimateTimeRemaining(processedChunks, totalChunks),
          message: `Processing chunk ${processedChunks + 1} of ${totalChunks}`
        });
      }
      
      // Process chunk
      const result = await this.processChunk(sourceFrames, chunk, resolution);
      
      if (!result.success) {
        throw new Error(result.error || 'Chunk processing failed');
      }
      
      allProcessedFrames.push(...result.frames);
      processedChunks++;
      
      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Encode video
    if (onProgress) {
      onProgress({
        phase: 'encoding',
        currentChunk: totalChunks,
        totalChunks,
        percentComplete: 85,
        estimatedTimeRemaining: 10,
        message: 'Encoding video...'
      });
    }
    
    const videoBlob = await this.encodeVideo(allProcessedFrames, audioFile, frameRate);
    
    // Complete
    if (onProgress) {
      onProgress({
        phase: 'complete',
        currentChunk: totalChunks,
        totalChunks,
        percentComplete: 100,
        estimatedTimeRemaining: 0,
        message: 'Export complete!'
      });
    }
    
    return videoBlob;
  }

  /**
   * Encode frames into video using WebCodecs or fallback
   */
  private async encodeVideo(
    frames: ImageData[],
    audioFile: File | null,
    frameRate: number
  ): Promise<Blob> {
    // Check for WebCodecs support
    if (typeof VideoEncoder !== 'undefined') {
      return this.encodeWithWebCodecs(frames, audioFile, frameRate);
    } else {
      // Fallback to canvas recording or frame sequence
      return this.encodeWithCanvasRecorder(frames, audioFile, frameRate);
    }
  }

  /**
   * Modern encoding using WebCodecs API
   */
  private async encodeWithWebCodecs(
    frames: ImageData[],
    audioFile: File | null,
    frameRate: number
  ): Promise<Blob> {
    // This would use the WebCodecs API for efficient encoding
    // For now, return a placeholder
    return new Blob(['WebCodecs video data'], { type: 'video/mp4' });
  }

  /**
   * Fallback encoding using MediaRecorder
   */
  private async encodeWithCanvasRecorder(
    frames: ImageData[],
    audioFile: File | null,
    frameRate: number
  ): Promise<Blob> {
    // Create a canvas for playback
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }
    
    // Set canvas dimensions from first frame
    if (frames.length > 0) {
      canvas.width = frames[0].width;
      canvas.height = frames[0].height;
    }
    
    // Create MediaRecorder
    const stream = canvas.captureStream(frameRate);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm',
      videoBitsPerSecond: 8000000 // 8 Mbps
    });
    
    const chunks: Blob[] = [];
    
    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };
      
      mediaRecorder.onerror = (error) => {
        reject(error);
      };
      
      // Start recording
      mediaRecorder.start();
      
      // Play frames
      let frameIndex = 0;
      const interval = setInterval(() => {
        if (frameIndex < frames.length) {
          ctx.putImageData(frames[frameIndex], 0, 0);
          frameIndex++;
        } else {
          clearInterval(interval);
          mediaRecorder.stop();
        }
      }, 1000 / frameRate);
    });
  }

  /**
   * Estimate time remaining based on progress
   */
  private estimateTimeRemaining(processed: number, total: number): number {
    if (processed === 0) return total * 2; // Initial estimate: 2 seconds per chunk
    
    const averageTimePerChunk = 2; // seconds
    const remaining = total - processed;
    return remaining * averageTimePerChunk;
  }

  /**
   * Cancel ongoing export
   */
  cancelExport() {
    this.emit('cancelled');
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.cancelExport();
    this.canvas = null;
    this.ctx = null;
  }
}

// Singleton instance
export const chunkedExportService = new ChunkedExportService();

// Helper function for segment selection
export function createSegmentFromTimeRange(
  startTime: number,
  endTime: number,
  totalFrames: number,
  audioDuration: number
): ExportSegment {
  const frameRate = FRAMES_PER_SECOND;
  const startFrame = Math.floor((startTime / audioDuration) * totalFrames);
  const endFrame = Math.floor((endTime / audioDuration) * totalFrames);
  
  return {
    startTime,
    endTime,
    startFrame,
    endFrame,
    duration: endTime - startTime
  };
}

// Payment integration helpers
export const PaymentPlans = {
  SINGLE_EXPORT: {
    id: 'single_export',
    price: 4.99,
    name: 'Single Full Export',
    description: 'One-time full song export'
  },
  BASIC: {
    id: 'basic_monthly',
    price: 9.99,
    name: 'Basic',
    exports: 10,
    features: ['Full song exports', 'HD quality', 'Email delivery']
  },
  PRO: {
    id: 'pro_monthly', 
    price: 24.99,
    name: 'Pro',
    exports: 50,
    features: ['Full song exports', '4K quality', 'Batch processing', 'Priority queue']
  },
  STUDIO: {
    id: 'studio_monthly',
    price: 99.99,
    name: 'Studio',
    exports: 'unlimited',
    features: ['Unlimited exports', '4K quality', 'API access', 'Dedicated support']
  }
};

export default chunkedExportService;