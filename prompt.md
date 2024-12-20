# AnthropicFS Agent Prompt Template

## SYSTEM PROMPT
```markdown
Here is the Anthropic SDK documentation:

<anthropic_sdk_docs>
{{ANTHROPIC_SDK_DOCS}}
</anthropic_sdk_docs>

You are an expert TypeScript developer tasked with creating a fuse filesystem interface for the Anthropic AI SDK using TypeScript and Bun's capabilities. This interface will allow users to interact with the Anthropic AI through file operations, providing a unique and intuitive way to use AI services.

Your task is to implement this fuse filesystem interface. Before writing the code, please plan your implementation carefully. Wrap your design process in <design_process> tags, considering the following aspects:

1. Basic structure of the fuse filesystem in TypeScript
2. Core fuse operations (read, write, getattr, readdir) and how they'll interact with the Anthropic AI SDK
3. List out the required Anthropic SDK functions and how they map to filesystem operations
4. Representation of AI interactions as files and directories
   - Consider an expanded concept of "prompts-as-files", where various AI functions and interactions are mapped to different file types or directory structures
   - Sketch out the proposed directory structure and file types
5. Use of Bun's shell capabilities for mounting and unmounting
6. Implementation of subprocess IPC for communication with the Anthropic AI SDK
7. Error handling and logging strategies
8. Any potential challenges or optimizations you foresee
9. Potential edge cases and how to handle them

After your planning phase, implement the fuse filesystem interface in TypeScript. Your code should be well-structured, follow TypeScript best practices, and include appropriate error handling. Provide detailed comments explaining the purpose and functionality of each major component and any complex operations.

Write your complete TypeScript code implementation inside <typescript_code> tags.

Finally, provide a brief explanation of how to use the implemented filesystem, including how to mount it and interact with the Anthropic AI through file operations. Write this explanation inside <usage_instructions> tags.

Remember to consider performance, scalability, and user experience in your implementation.
```

### DESIGN PROCESS
1. Basic Structure:
- Create a main FUSE class (AnthropicFS) that implements core FUSE operations
- Use Bun's FFI capabilities to interface with native FUSE bindings
- Implement a caching layer for AI responses
- Create separate handlers for different file types

2. Core FUSE Operations Mapping:
- read: Retrieve AI responses and conversation history
- write: Send prompts and create new conversations
- getattr: Return file/directory metadata
- readdir: List available conversations and command files

3. Anthropic SDK Function Mapping:
- conversations.create -> mkdir in /conversations
- conversations.messages.create -> write to conversation files
- conversations.messages.list -> read from conversation files
- completions.create -> write to /completions directory

4. Directory Structure:
```
/
├── conversations/
│   ├── [conversation-id]/
│   │   ├── messages.txt
│   │   ├── metadata.json
│   │   └── config.json
├── completions/
│   ├── new.txt
│   └── history/
├── config/
│   ├── model.txt
│   └── settings.json
└── status.txt
```

5. Implementation Considerations:
- Use Bun.write and Bun.read for file operations
- Implement in-memory caching for frequently accessed data
- Use JSON for structured data storage
- Implement proper locking mechanisms for concurrent access

6. Potential Challenges:
- Handling large conversations
- Managing API rate limits
- Ensuring proper cleanup of resources
- Maintaining conversation state

7. Error Handling:
- Implement detailed logging
- Map API errors to appropriate errno values
- Provide meaningful error messages in status.txt
- Implement automatic retry mechanisms

8. Edge Cases:
- Network failures
- API throttling
- Concurrent access to same conversation
- Large file operations


### IMPLEMENTATION

```typescript
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
```

### USAGE INSTRUCTIONS
To use the Anthropic FUSE filesystem:

1. Installation:
```bash
bun install @anthropic-ai/sdk fuse-native
```

2. Mount the filesystem:
```typescript
import AnthropicFS from './anthropic-fs';

const fs = new AnthropicFS('your-api-key');
await fs.mount('/mnt/anthropic');
```

3. Interact with the AI:
```bash
# Create a new conversation
echo "Hello" > /mnt/anthropic/conversations/new.txt

# Read conversation history
cat /mnt/anthropic/conversations/<conversation-id>/messages.txt

# Send a message in existing conversation
echo "What's the weather?" > /mnt/anthropic/conversations/<conversation-id>/messages.txt

# Create a completion
echo "Translate to French: Hello world" > /mnt/anthropic/completions/new.txt
```

4. Unmount:
```typescript
await fs.unmount('/mnt/anthropic');
```

Key Features:
- Conversations are automatically created when writing to /conversations/new.txt
- Message history is available in real-time through the filesystem
- Configuration can be modified through files in /config
- System status and errors are logged to status.txt

Note: Ensure you have FUSE installed on your system and appropriate permissions to mount filesystems.
