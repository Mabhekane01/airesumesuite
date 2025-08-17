# Job Intelligence Platform

A comprehensive microservices platform for job market intelligence, providing job scraping, data processing, and AI-powered insights.

## Architecture

```
job-intelligence-platform/
├── packages/
│ ├── core/              # Shared libraries and utilities
│ ├── scraper-engine/    # Main scraping service
│ ├── etl-pipeline/      # Data transformation service  
│ ├── scheduler/         # Job scheduling service
│ ├── api-gateway/       # REST/GraphQL API
│ └── ai-service/        # NLP/ML processing
├── infrastructure/     # Deployment configurations
└── monitoring/         # Observability stack
```

## Services

### Core Package
- Configuration management
- Database connections
- Queue systems (Redis/RabbitMQ)
- Caching layer
- Monitoring utilities

### Scraper Engine
- Multi-source job site scraping
- Rate limiting and proxy management
- Data extraction and parsing
- Anti-bot detection handling

### ETL Pipeline
- Data transformation and validation
- Data enrichment with external APIs
- Duplicate detection and deduplication
- Data quality monitoring

### Scheduler
- Cron-based job scheduling
- Workflow orchestration
- Task monitoring and failure handling
- Resource allocation

### API Gateway
- Public REST and GraphQL APIs
- Authentication and authorization
- Rate limiting and throttling
- API documentation and versioning

### AI Service
- Named Entity Recognition (NER)
- Job classification and categorization
- Skill extraction and matching
- Salary prediction and analytics

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for Node.js services)
- Python 3.11+ (for AI service)
- PostgreSQL
- Redis

### Development

```bash
# Clone the repository
git clone <repository-url>
cd job-intelligence-platform

# Start all services
docker-compose up -d

# Start individual service
cd packages/scraper-engine
npm install
npm run dev
```

### Production Deployment

Deploy using Docker Compose on cloud platforms like Render, Railway, or DigitalOcean.

## API Documentation

- **Base URL**: `http://localhost:3000` (development)
- **GraphQL Playground**: `http://localhost:3000/graphql`
- **REST API Docs**: `http://localhost:3000/docs`

## Monitoring

- **Redis Commander**: `http://localhost:8081` (Redis monitoring)
- **Health Checks**: Each service exposes `/health` endpoint
- **Logs**: Use `docker-compose logs <service-name>` for debugging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](./LICENSE) file for details.