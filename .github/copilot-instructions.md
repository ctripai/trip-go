# TripGo AI Travel Planning

## Project Overview
TripGo is a Go-based AI-powered travel planning application that helps users ("lazy people") create personalized trip itineraries effortlessly. The project leverages AI to process user preferences and generate optimized travel plans.

## Architecture Principles
- **Modular Design**: Separate concerns into packages like `input`, `ai`, `itinerary`, `output`.
- **AI Integration**: Use external AI services or libraries for natural language processing and recommendation engines.
- **Data Flow**: User input → AI processing → Itinerary generation → Output formatting.

## Development Workflow
- **Build**: Use `go build` to compile the application.
- **Test**: Run `go test ./...` for unit and integration tests.
- **Run**: Execute `go run main.go` to start the server or CLI.
- **Dependencies**: Manage with `go mod`, pin versions for reproducibility.

## Code Conventions
- Follow standard Go idioms: use `gofmt`, `go vet`.
- Error handling: Return errors explicitly, use `errors.Wrap` for context.
- Logging: Use `log` package or structured logging like `zap`.
- AI Components: Abstract AI logic behind interfaces for easy testing and swapping.

## Key Files/Directories
- `main.go`: Entry point.
- `pkg/`: Core packages.
- `cmd/`: Commands if CLI-based.
- `internal/`: Internal utilities.

Since the codebase is in early stages, focus on building a solid foundation with TDD for AI features.</content>
<parameter name="filePath">/workspaces/trip-go/.github/copilot-instructions.md