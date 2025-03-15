# Model Service

This service provides LLM capabilities via LangGraph and ReAct agents using Claude 3.7.

## Streaming Modes

The model service supports different streaming modes when interacting with the LangGraph ReAct agent:

| Mode | Description |
|------|-------------|
| `messages` | Streams only the final message content (text) from the AI |
| `events` | Streams all LangGraph internal events (function calls, tool executions, etc.) |
| `debug` | Provides detailed debugging information about execution |
| `values` | Streams values being passed between graph nodes |
| `updates` | Streams updates to the graph state |
| `custom` | For custom user-defined events |

You can use multiple modes together by providing an array, e.g., `['messages', 'events']`.

## Tests

Tests are organized in the `tests/` directory:

```
tests/
├── functional/              # Tests for specific functionality
│   ├── react-agent.test.js  # Tests the basic ReAct agent
│   ├── stream.test.js       # Tests the basic streaming functionality
│   └── stream-modes.test.ts # Tests all different stream modes
├── integration/             # Tests requiring the server to be running
│   └── model-service.test.js # Tests the API endpoints
├── unit/                    # Unit tests (if any)
└── run-all.js               # Script to run all tests
```

### Running Tests

We have several test commands:

```bash
# Run all tests
npm run test

# Run specific tests
npm run test:integration  # Run integration tests
npm run test:simple       # Run simple API test
npm run test:react        # Test ReAct agent
npm run test:stream       # Test streaming functionality
npm run test:stream:modes # Test all stream modes
```

## API Usage

When using the streaming API, specify which stream modes you want:

```javascript
const stream = streamAgent([message], ['messages', 'events']);

for await (const chunk of stream) {
  // Process each chunk
  const parsedChunk = JSON.parse(chunk);
  // ...
}
```

Different stream modes provide different information, so choose the ones that match your needs.

## Utility Service Integration

The model service integrates with the utility service through three dedicated utilities:

1. **UtilityListUtilities**: Lists all available utilities from the utility service
2. **UtilityGetUtilityInfo**: Gets detailed information about a specific utility
3. **UtilityCallUtility**: Calls a utility with parameters and returns the result

This design provides a clean separation of concerns:
- The model service focuses on LLM interactions and provides utilities for utility discovery and usage
- The utility service implements the actual utility functions

### Using Utilities

To use the utilities in your code:

```typescript
import { UtilityListUtilities, UtilityGetUtilityInfo, UtilityCallUtility } from "./utility";

// Create the utilities
const listUtilities = new UtilityListUtilities({
  conversationId: "conversation-id",
  parentNodeId: "parent-node-id",
  parentNodeType: "parent-node-type"
});

const getUtilityInfo = new UtilityGetUtilityInfo({
  conversationId: "conversation-id",
  parentNodeId: "parent-node-id",
  parentNodeType: "parent-node-type"
});

const callUtility = new UtilityCallUtility({
  conversationId: "conversation-id",
  parentNodeId: "parent-node-id",
  parentNodeType: "parent-node-type"
});

// Add them to your agent's tools
const tools = [
  listUtilities,
  getUtilityInfo,
  callUtility
];
```

### Utility Discovery Flow

The utilities work together to create a discovery-based flow:

1. The agent can use **UtilityListUtilities** to discover available utilities
2. The agent can use **UtilityGetUtilityInfo** to learn how to use a specific utility
3. The agent can use **UtilityCallUtility** to actually call the utility with parameters

This allows the agent to dynamically discover and use utilities without hardcoding knowledge about specific utilities. 