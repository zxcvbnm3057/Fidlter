# Use a multi-stage build to combine frontend and backend

# Stage 1: Build frontend
FROM node:14 AS frontend-builder
WORKDIR /app/frontend
COPY app/frontend/package.json app/frontend/yarn.lock ./
RUN yarn install
COPY app/frontend/ ./
RUN yarn build

# Stage 2: Build backend and serve frontend
FROM python:3.9-slim
WORKDIR /app

# Copy backend requirements and install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY app ./app

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/build ./app/static

# Expose ports for backend
EXPOSE 5000

# Command to run the backend
CMD ["python", "-m", "app"]