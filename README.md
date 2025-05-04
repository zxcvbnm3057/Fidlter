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
- 配置conda或npm私有镜像

## 任务管理功能说明

每个任务可以通过UI界面执行以下操作：

### 手动触发
- 功能：立即执行一次任务，不影响任务的周期调度设置
- 适用状态：未运行的任务（已调度、已暂停、已停止）
- 不可用状态：运行中的任务

### 暂停任务
- 功能：暂停正在运行的任务，并阻塞任务的后续启动，直到用户继续
- 适用状态：运行中的任务
- 不可用状态：未运行或已完成的任务

### 继续任务
- 功能：继续执行已暂停的任务
- 适用状态：已暂停的任务
- 不可用状态：未暂停的任务

### 停止任务
- 功能：停止任务调度，若任务正在运行，直接杀死进程
- 适用状态：所有未停止的任务
- 不可用状态：已停止、已完成、失败的任务

### 任务详情
- 功能：查看任务的详细信息、执行历史和日志
- 适用状态：所有任务

### UI界面规范
- 所有按钮始终显示在界面上，不会根据状态隐藏
- 不可用的按钮应显示为禁用状态（灰色）
- 按钮应有相应的tooltip提示其功能和当前不可用的原因

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
   pnpm install
   ```
4. 启动后端服务：

   ```
   cd backend
   python -m app
   ```
5. 启动前端服务：

   ```
   cd frontend
   pnpm run start
   ```
6. 使用 Docker Compose 启动整个应用：

   ```
   docker-compose up --build
   ```

## 贡献

欢迎任何形式的贡献！请提交问题或拉取请求。

## 许可证

该项目采用 MIT 许可证。请查看 LICENSE 文件以获取更多信息。
