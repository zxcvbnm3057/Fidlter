# Conda Task Manager

## 项目简介
Conda Task Manager 是一个基于 Web 的应用程序，用于管理 Conda 环境和调度 Python 脚本任务。用户可以通过友好的 Web 界面创建、删除和管理 Conda 环境，配置和调度任务，并查看任务的运行状态和历史记录。

## 功能特性
- 通过 Web 页面管理 Conda 环境
- 通过 Web 页面配置和调度 Python 脚本任务，支持选择 Conda 环境
- 通过 Web 页面查看任务运行状态和历史统计
- 支持 Git 同步脚本和任务配置
- 支持权限管理
- 可通过 Docker Compose 使用非特权用户部署

## 技术栈
- **后端**: Python, Flask (或 FastAPI)
- **前端**: React, CoreUI
- **数据库**: 可选 (如 SQLite, PostgreSQL)
- **容器化**: Docker, Docker Compose

## 项目结构
```
conda-task-manager
├── backend
│   ├── app
│   │   ├── __init__.py
│   │   ├── api
│   │   │   ├── __init__.py
│   │   │   ├── routes.py
│   │   │   └── auth.py
│   │   ├── models
│   │   │   └── __init__.py
│   │   ├── services
│   │   │   ├── conda_manager.py
│   │   │   ├── task_scheduler.py
│   │   │   └── git_sync.py
│   │   └── utils
│   │       └── __init__.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── docker-compose.yml
├── frontend
│   ├── public
│   │   └── index.html
│   ├── src
│   │   ├── components
│   │   │   ├── CondaManager.jsx
│   │   │   ├── TaskScheduler.jsx
│   │   │   └── Auth.jsx
│   │   ├── pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── TaskHistory.jsx
│   │   │   └── Login.jsx
│   │   ├── App.jsx
│   │   └── index.js
│   ├── package.json
│   ├── yarn.lock
│   └── Dockerfile
└── README.md
```

## 安装与运行
1. 克隆项目：
   ```
   git clone <repository-url>
   cd conda-task-manager
   ```

2. 后端安装依赖：
   ```
   cd backend
   pip install -r requirements.txt
   ```

3. 前端安装依赖：
   ```
   cd frontend
   yarn install
   ```

4. 启动后端服务：
   ```
   cd backend
   python -m app
   ```

5. 启动前端服务：
   ```
   cd frontend
   yarn start
   ```

6. 使用 Docker Compose 启动整个应用：
   ```
   docker-compose up --build
   ```

## 贡献
欢迎任何形式的贡献！请提交问题或拉取请求。

## 许可证
该项目采用 MIT 许可证。请查看 LICENSE 文件以获取更多信息。