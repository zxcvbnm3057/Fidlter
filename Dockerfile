# Use a multi-stage build to combine frontend and backend

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY app/frontend/package.json app/frontend/yarn.lock ./
RUN yarn install
COPY app/frontend/ ./
RUN yarn build

# Stage 2: Build backend and serve frontend
FROM continuumio/miniconda3:latest
WORKDIR /app

# 确保conda命令可用并更新到最新版本
RUN conda update -n base -c defaults conda && \
    conda install -y python=3.11

# Copy backend requirements and install dependencies
COPY requirements.txt ./
RUN conda install -y -n base -c conda-forge --file requirements.txt

# Copy backend code
COPY app ./app

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/build ./app/static

# Expose ports for backend
EXPOSE 5000

# Command to run the backend
CMD ["python", "-m", "app"]