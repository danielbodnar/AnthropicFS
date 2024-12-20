import { fuse } from 'bun:ffi';
import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';

interface FuseStats {
  mode: number;
  size: number;
  mtime: Date;
}

class AnthropicFS extends EventEmitter {
  private anthropic: Anthropic;
  private cache: Map<string, any>;
  private conversations: Map<string, any>;

  constructor(apiKey: string) {
    super();
    this.anthropic = new Anthropic({ apiKey });
    this.cache = new Map();
    this.conversations = new Map();
  }

  private async getattr(path: string): Promise<FuseStats> {
    const parts = path.split('/').filter(Boolean);
    
    if (parts.length === 0) {
      return {
        mode: 0o755 | fuse.S_IFDIR,
        size: 4096,
        mtime: new Date(),
      };
    }

    if (parts[0] === 'conversations') {
      return {
        mode: 0o644 | fuse.S_IFREG,
        size: 0,
        mtime: new Date(),
      };
    }

    throw new Error('ENOENT');
  }

  private async readdir(path: string): Promise<string[]> {
    const parts = path.split('/').filter(Boolean);

    if (parts.length === 0) {
      return ['conversations', 'completions', 'config', 'status.txt'];
    }

    if (parts[0] === 'conversations') {
      return Array.from(this.conversations.keys());
    }

    throw new Error('ENOENT');
  }

  private async read(path: string, offset: number, length: number): Promise<Buffer> {
    const parts = path.split('/').filter(Boolean);

    if (parts[0] === 'conversations') {
      const conversationId = parts[1];
      const conversation = this.conversations.get(conversationId);
      
      if (!conversation) {
        throw new Error('ENOENT');
      }

      const messages = await this.anthropic.conversations.messages.list(conversationId);
      const content = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      
      return Buffer.from(content).slice(offset, offset + length);
    }

    throw new Error('ENOENT');
  }

  private async write(path: string, buffer: Buffer, offset: number): Promise<number> {
    const parts = path.split('/').filter(Boolean);

    if (parts[0] === 'conversations') {
      if (parts.length === 1) {
        // Create new conversation
        const conversation = await this.anthropic.conversations.create({
          model: 'claude-3-5-sonnet-latest',
          max_tokens: 8192,
        });
        this.conversations.set(conversation.id, conversation);
        return buffer.length;
      }

      const conversationId = parts[1];
      const content = buffer.toString();

      await this.anthropic.conversations.messages.create(conversationId, {
        role: 'user',
        content,
      });

      return buffer.length;
    }

    throw new Error('ENOENT');
  }

  public async mount(mountPoint: string): Promise<void> {
    const options = {
      getattr: this.getattr.bind(this),
      readdir: this.readdir.bind(this),
      read: this.read.bind(this),
      write: this.write.bind(this),
    };

    await Bun.spawn(['fusermount', '-u', mountPoint]).exited;
    await Bun.spawn(['mkdir', '-p', mountPoint]).exited;
    
    // Initialize FUSE mount
    fuse.mount(mountPoint, options);
    
    this.emit('mounted', mountPoint);
  }

  public async unmount(mountPoint: string): Promise<void> {
    await Bun.spawn(['fusermount', '-u', mountPoint]).exited;
    this.emit('unmounted', mountPoint);
  }
}

export default AnthropicFS;
