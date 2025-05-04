# Git仓库同步

本文档描述了Conda Task Manager系统与Git仓库交互的相关API接口。

## 从Git仓库创建任务

**请求**:

- 方法: `POST`
- URL: `/api/git/tasks`
- Content-Type: `application/json`

**请求体**:

```json
{
  "repo_url": "https://github.com/username/repo.git",
  "branch": "main",
  "task_name": "从Git创建的任务",
  "command": "python main.py --arg value",
  "env_option": "create",
  "env_name": "my_new_env"
}
```

**参数说明**:

- `repo_url`: 必填，Git仓库的URL
- `branch`: 可选，要拉取的分支名称，默认为"main"
- `task_name`: 可选，创建的任务名称，如不提供则使用仓库名称
- `command`: 必填，启动命令，系统将不会自动检测主脚本文件
- `env_option`: 必填，环境选项，可选值:
  - `create`: 创建新环境或更新现有环境（如果环境已存在）
  - `existing`: 使用现有环境
- `env_name`: 当`env_option`为`create`时必填，指定要创建或更新的环境名称；当`env_option`为`existing`时必填，指定要使用的现有环境名称

**响应**:

- 状态码: 201 (创建成功)
- 内容: 任务详情

  ```json
  {
    "success": true,
    "message": "Task created from Git repository successfully",
    "task": {
      "task_id": 1,
      "task_name": "从Git创建的任务",
      "status": "scheduled",
      "script_path": "/path/to/cloned/repo/main.py",
      "command": "python main.py --arg value",
      "conda_env": "my_new_env",
      "created_at": "创建时间",
      "cron_expression": "*/10 * * * *",
      "next_run_time": "下次执行时间",
      "repo_url": "https://github.com/username/repo.git",
      "branch": "main"
    },
    "environment_message": "New environment 'my_new_env' created with requirements",
    "environment_warning": "Environment 'my_new_env' already exists and has been updated with new requirements"
  }
  ```

**错误响应**:

- 状态码: 400 (请求参数错误)
- 内容:

  ```json
  {
    "success": false,
    "message": "Invalid Git repository URL",
    "error": "Failed to clone repository"
  }
  ```

- 状态码: 404 (资源不存在)
- 内容:

  ```json
  {
    "success": false,
    "message": "Repository configuration files not found",
    "error": "No filter.conf or requirements.txt found in repository"
  }
  ```

## 更新Git仓库任务

**请求**:

- 方法: `PUT`
- URL: `/api/git/tasks/<task_id>`
- Content-Type: `application/json`

**参数说明**:

- `task_id`: 必填，任务的唯一标识ID

**请求体**:

```json
{
  "update_env": true
}
```

**参数说明**:

- `update_env`: 可选，是否更新Conda环境(根据最新的requirements.txt)，默认为true

**响应**:

- 状态码: 200 (成功)
- 内容: 更新后的任务详情

  ```json
  {
    "success": true,
    "message": "Task updated from Git repository successfully",
    "task": {
      "task_id": 1,
      "task_name": "从Git创建的任务",
      "status": "scheduled",
      "updated_at": "更新时间",
      "new_files": ["file1.py", "file2.py"],
      "changed_files": ["config.ini", "README.md"],
      "script_path": "/path/to/cloned/repo/main.py",
      "conda_env": "git_task_env_1"
    },
    "environment_message": "Requirements updated in environment 'git_task_env_1'"
  }
  ```

**错误响应**:

- 状态码: 404 (任务不存在)
- 内容:

  ```json
  {
    "success": false,
    "message": "Task not found",
    "error": "No task with ID 1 exists"
  }
  ```

- 状态码: 400 (任务不是Git仓库任务)
- 内容:

  ```json
  {
    "success": false,
    "message": "Not a Git repository task",
    "error": "This task was not created from a Git repository"
  }
  ```

## 获取Git任务状态

**请求**:

- 方法: `GET`
- URL: `/api/git/tasks/<task_id>`

**参数说明**:

- `task_id`: 必填，任务的唯一标识ID

**响应**:

- 状态码: 200 (成功)
- 内容: 任务Git同步状态

  ```json
  {
    "success": true,
    "task": {
      "task_id": 1,
      "task_name": "从Git创建的任务",
      "repo_url": "https://github.com/username/repo.git",
      "branch": "main",
      "last_synced": "2025-05-01 10:30:00",
      "local_changes": false,
      "ahead_commits": 0,
      "behind_commits": 2
    }
  }
  ```

**错误响应**:

- 状态码: 404 (任务不存在)
- 内容:
  
  ```json
  {
    "success": false,
    "message": "Task not found",
    "error": "No task with ID 1 exists"
  }
  ```