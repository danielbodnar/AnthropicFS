# Anthropic FUSE Filesystem

A FUSE-based filesystem interface for the Anthropic AI SDK, allowing you to interact with Claude and other Anthropic AI models through standard filesystem operations.

## Features

- 🗂️ Interact with Anthropic AI through familiar file operations
- 💬 Create and manage conversations as directories
- ⚡ Real-time message history and responses
- 🔄 Automatic caching and state management
- 🔒 Secure API key handling
- 📝 Simple file-based configuration
- 🚀 Built with TypeScript and Bun

## Installation

### Prerequisites

- Bun runtime
- FUSE installed on your system
- Anthropic API key

### Install via npm

```bash
npm install anthropic-fuse
```

Or with Bun:

```bash
bun add anthropic-fuse
```

## Quick Start

```typescript
import AnthropicFS from 'anthropic-fuse';

// Initialize and mount the filesystem
const fs = new AnthropicFS('your-api-key');
await fs.mount('/mnt/anthropic');
```

## Directory Structure

```
/mnt/anthropic/
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

## Usage Examples

### Create a New Conversation

```bash
echo "Hello Claude!" > /mnt/anthropic/conversations/new.txt
```

### Send Messages in an Existing Conversation

```bash
echo "What's the weather like?" > /mnt/anthropic/conversations/abc123/messages.txt
```

### Read Conversation History

```bash
cat /mnt/anthropic/conversations/abc123/messages.txt
```

### Create a Quick Completion

```bash
echo "Translate to French: Hello world" > /mnt/anthropic/completions/new.txt
cat /mnt/anthropic/completions/new.txt
```

### Configure Model Settings

```bash
echo "claude-2" > /mnt/anthropic/config/model.txt
```

## API Reference

### Class: AnthropicFS

#### Constructor

```typescript
constructor(apiKey: string)
```

#### Methods

- `mount(mountPoint: string): Promise<void>`
- `unmount(mountPoint: string): Promise<void>`

#### Events

- `mounted`: Emitted when filesystem is successfully mounted
- `unmounted`: Emitted when filesystem is unmounted
- `error`: Emitted when an error occurs

## Error Handling

Errors are handled gracefully and logged to `/mnt/anthropic/status.txt`. Common errors include:

- API rate limiting
- Network connectivity issues
- Invalid file operations
- Authentication failures

## Performance Considerations

- Implements in-memory caching for frequently accessed data
- Automatic cleanup of stale conversations
- Efficient handling of large conversations
- Rate limit awareness

## Security

- API keys are stored securely in memory
- File permissions follow UNIX standards
- No sensitive data is written to disk

## Development

### Building from Source

```bash
git clone https://github.com/yourusername/anthropic-fuse
cd anthropic-fuse
bun install
bun run build
```

### Running Tests

```bash
bun test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Anthropic AI team for their excellent SDK
- FUSE project contributors
- Bun runtime team

## Support

For support, please:
1. Check the [Issues](https://github.com/yourusername/anthropic-fuse/issues) page
2. Create a new issue if needed
3. Join our [Discord community](https://discord.gg/yourdiscord)

## Roadmap

- [ ] Add support for streaming responses
- [ ] Implement conversation branching
- [ ] Add compression for large conversations
- [ ] Develop GUI file browser integration
- [ ] Add multi-user support

## FAQ

**Q: Why use a filesystem interface?**
A: Filesystem interfaces provide a familiar and universal way to interact with services, enabling easy integration with existing tools and workflows.

**Q: Is this production-ready?**
A: While functional, please thoroughly test in your environment before using in production.

**Q: What are the system requirements?**
A: FUSE-compatible OS (Linux, macOS), Node.js 16+ or Bun runtime, and sufficient permissions to mount filesystems.
