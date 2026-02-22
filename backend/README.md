## Folder Structure

```
backend/
├── src/
│   ├── app.js              # Express app configuration
│   ├── routes/             # API routes
│   │   └── index.js
│   ├── controllers/        # Request handlers
│   ├── models/             # Data models
│   └── config/             # Configuration files
│       └── db.js
├── server.js               # Entry point
├── package.json            # Dependencies
├── .env                    # Environment variables
├── .env.example            # Environment template
├── .gitignore             # Git ignore rules
├── Dockerfile             # Docker configuration
├── .dockerignore          # Docker ignore rules
└── README.md              # Documentation
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### Configure Environment
Copy `.env.example` to `.env` and update the values:
```bash
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trip_weaver_dev
DB_USER=postgres
DB_PASSWORD=your_password
```

### 3. Run the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### General
- `GET /api` - API information
- `GET /health` - Health check

## Docker Support

### Build Docker Image
```bash
docker build -t trip-weaver-backend .
```

### Run Docker Container
```bash
docker run -p 5000:5000 --env-file .env trip-weaver-backend
```
## Development

### Project Structure
- **src/app.js** - Main Express application setup
- **src/routes/** - API route definitions
- **src/controllers/** - Business logic and request handlers
- **src/models/** - Data models and database schemas
- **src/config/** - Configuration files (database, etc.)

### Adding New Routes
1. Create route file in `src/routes/`
2. Create controller in `src/controllers/`
3. Import and use in `src/routes/index.js`
