# Deployment

## Docker Setup

### docker-compose.yml

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://...
      - BETTER_AUTH_URL=https://your-domain.com
      - BETTER_AUTH_SECRET=your-secret
      - RESEND_API_KEY=your-key
      - RESEND_FROM_EMAIL=noreply@your-domain.com
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=nextorx
      - POSTGRES_USER=nextorx
      - POSTGRES_PASSWORD=your-password

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

### Local Development

```bash
# Start services
docker compose -f docker-compose.local.yml up -d

# Run migrations
pnpm run db:migrate

# Seed database
pnpm run db:seed

# Start dev server
pnpm run dev

# Start WebSocket server
pnpm run dev:ws
```

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `BETTER_AUTH_SECRET` | Auth secret key (min 32 chars) |
| `BETTER_AUTH_URL` | Base URL for auth callbacks |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_FROM_EMAIL` | Sender email address |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | - |
| `S3_ENDPOINT` | S3-compatible storage endpoint | - |
| `S3_BUCKET` | S3 bucket name | - |
| `S3_ACCESS_KEY` | S3 access key | - |
| `S3_SECRET_KEY` | S3 secret key | - |

## Coolify Deployment

### 1. Create Project

1. Go to Coolify dashboard
2. Create new project
3. Select "Docker Compose" as deployment method

### 2. Configure Repository

1. Connect Git repository
2. Set build pack to Dockerfile
3. Set compose file to `docker-compose.yml`

### 3. Set Environment Variables

Add all required environment variables in Coolify UI.

### 4. Configure Domains

1. Add domain for the application
2. Enable SSL/TLS
3. Configure WebSocket support (wss://)

### 5. Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Run database migrations:
   ```bash
   docker compose exec app pnpm run db:migrate
   ```

### 6. Seed Database (First Deploy)

```bash
docker compose exec app pnpm run db:seed
```

## Health Checks

### API Health Check

```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-09-17T00:00:00.000Z"
}
```

### WebSocket Health

Connect to `wss://your-domain.com/ws` and verify connection is accepted.

## Production Checklist

- [ ] Environment variables set
- [ ] Database migrations run
- [ ] SSL/TLS configured
- [ ] WebSocket proxy configured
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] CSP headers set
- [ ] Logging configured
- [ ] Monitoring set up
- [ ] Backup strategy in place

## Commands

```bash
# Database
pnpm run db:migrate      # Run migrations
pnpm run db:push         # Push schema changes
pnpm run db:seed         # Seed database
pnpm run db:reset        # Reset database
pnpm run db:studio       # Open Prisma Studio

# Build
pnpm run build           # Build for production
pnpm run start           # Start production server
pnpm run start:prod      # Start with WebSocket server

# Development
pnpm run dev             # Start dev server
pnpm run dev:ws          # Start dev server with WebSocket
pnpm run lint            # Run ESLint
```
