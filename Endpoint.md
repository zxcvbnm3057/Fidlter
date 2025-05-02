# Conda Task Manager API 接口文档

本文档描述了Conda Task Manager系统的所有可用API接口。

## 目录

- [Conda Task Manager API 接口文档](#conda-task-manager-api-接口文档)
  - [目录](#目录)
  - [认证接口](#认证接口)
    - [用户登录](#用户登录)
    - [创建用户](#创建用户)
    - [退出登录](#退出登录)
  - [Conda环境管理](#conda环境管理)
    - [获取环境列表](#获取环境列表)
    - [获取环境统计信息](#获取环境统计信息)
    - [获取环境详情](#获取环境详情)
    - [创建新环境](#创建新环境)
    - [修改环境](#修改环境)
    - [安装包](#安装包)
    - [移除包](#移除包)
    - [删除环境](#删除环境)
  - [任务管理](#任务管理)
    - [创建任务](#创建任务)
    - [获取所有任务](#获取所有任务)
    - [获取任务状态](#获取任务状态)
    - [停止任务](#停止任务)
    - [获取任务统计信息](#获取任务统计信息)
    - [获取最近一个月的任务历史记录](#获取最近一个月的任务历史记录)
  - [状态码说明](#状态码说明)
  - [注意事项](#注意事项)

## 认证接口

### 用户登录

**请求**:

- 方法: `POST`
- URL: `/login`
- Content-Type: `application/json`

**请求体**:

```json
{
  "username": "用户名",
  "password": "密码"
}
```

**响应**:

- 状态码: 200 (成功)
- 设置Cookie: `session=<会话ID>; Path=/; HttpOnly; Max-Age=900;` (15分钟过期)
- 内容:

  ```json
  {
    "message": "Login successful",
    "user": {
      "username": "用户名",
      "is_admin": true/false
    }
  }
  ```
- 状态码: 401 (认证失败)
- 内容:

  ```json
  {
    "message": "Invalid username or password"
  }
  ```

### 创建用户

> 注意：此接口需要管理员权限，通过会话Cookie进行权限验证

**请求**:

- 方法: `POST`
- URL: `/create_user`
- Content-Type: `application/json`
- Cookie: `session=<会话ID>`

**请求体**:

```json
{
  "username": "新用户名",
  "password": "新用户密码",
  "is_admin": false
}
```

**响应**:

- 状态码: 201 (创建成功)
- 内容:

  ```json
  {
    "message": "User created successfully",
    "user": {
      "username": "新用户名",
      "is_admin": false
    }
  }
  ```
- 状态码: 400 (用户名已存在)
- 内容:

  ```json
  {
    "message": "User already exists"
  }
  ```
- 状态码: 403 (权限不足)
- 内容:

  ```json
  {
    "message": "Unauthorized - Admin privileges required"
  }
  ```

### 退出登录

**请求**:

- 方法: `POST`
- URL: `/logout`
- Cookie: `session=<会话ID>`

**响应**:

- 状态码: 200 (成功)
- 设置Cookie: `session=; Path=/; HttpOnly; Max-Age=0;` (清除会话Cookie)
- 内容:
  ```json
  {
    "message": "Logout successful"
  }
  ```

## Conda环境管理

### 获取环境列表

**请求**:

- 方法: `GET`
- URL: `/api/conda/environments`

**响应**:

- 状态码: 200 (成功)
- 内容: 环境列表数组
  ```json
  [
    {
      "name": "环境名称",
      "python_version": "Python版本",
      "packages": ["包列表"],
      "created_at": "创建时间"
    }
  ]
  ```

### 获取环境统计信息

**请求**:

- 方法: `GET`
- URL: `/api/conda/stats`

**响应**:

- 状态码: 200 (成功)
- 内容: 环境统计信息
  ```json
  {
    "total_environments": 5,           // 总环境数
    "active_environments": 3,          // 活跃环境数
    "total_disk_usage": 8.5,           // 总磁盘使用量（GB）
    "latest_created": {                // 最近创建的环境
      "name": "环境名称",
      "created_at": "2025-05-01 14:30:00"
    },
    "environment_usage": [             // 环境使用情况（用于饼图）
      {
        "name": "环境1",
        "usage_percent": 45
      },
      {
        "name": "环境2",
        "usage_percent": 30
      }
    ],
    "package_stats": [                 // 各环境包数量（用于柱状图）
      {
        "name": "环境1",
        "package_count": 42
      },
      {
        "name": "环境2",
        "package_count": 35
      }
    ]
  }
  ```

**说明**:
- 此接口不需要任何参数，直接获取所有Conda环境的统计数据
- `total_environments` 是系统中所有Conda环境的数量
- `active_environments` 是当前被任务使用的环境数量
- `total_disk_usage` 是所有环境占用的总磁盘空间（GB）
- `latest_created` 包含最近创建的环境信息
- `environment_usage` 包含各环境的使用率信息，用于生成饼图
- `package_stats` 包含各环境的包数量信息，用于生成柱状图

### 获取环境详情

**请求**:

- 方法: `GET`
- URL: `/api/conda/environment/<env_name>`

**响应**:

- 状态码: 200 (成功)
- 内容: 环境详细信息
  ```json
  {
    "name": "环境名称",
    "python_version": "3.9.7",
    "created_at": "2025-04-15",
    "usage_stats": {
      "total_tasks": 24,
      "success_rate": 92,
      "avg_execution_time": 45,
      "disk_usage": 1.2
    },
    "packages": [
      {
        "name": "numpy",
        "version": "1.24.3"
      },
      {
        "name": "pandas",
        "version": "2.0.1"
      },
      {
        "name": "scikit-learn",
        "version": "1.2.2"
      },
      {
        "name": "matplotlib",
        "version": "3.7.1"
      }
    ]
  }
  ```

**说明**:
- 此接口通过环境名称获取指定环境的详细信息
- `python_version` 是环境中安装的Python版本
- `created_at` 是环境的创建日期
- `usage_stats` 包含环境的使用统计信息，如总任务数、成功率等
- `packages` 包含环境中已安装的主要包列表及其版本

### 创建新环境

**请求**:

- 方法: `POST`
- URL: `/api/conda/environment`
- Content-Type: `application/json`

**请求体**:

```json
{
  "name": "环境名称"
}
```

**响应**:

- 状态码: 201 (创建成功)
- 内容: 创建结果
  ```json
  {
    "success": true,
    "message": "Environment created successfully",
    "environment": {
      "name": "环境名称",
      "created_at": "创建时间"
    }
  }
  ```

### 修改环境

**请求**:

- 方法: `PUT`
- URL: `/api/conda/environment/<env_name>`
- Content-Type: `application/json`
- Cookie: `session=<会话ID>`

**请求体**:

```json
{
  "new_name": "新环境名称"
}
```

**响应**:

- 状态码: 200 (修改成功)
- 内容: 修改结果

  ```json
  {
    "success": true,
    "message": "Environment renamed successfully",
    "old_name": "原环境名称",
    "new_name": "新环境名称",
    "updated_tasks_count": 2
  }
  ```
- 状态码: 400 (新环境名已存在)
- 内容:

  ```json
  {
    "success": false,
    "message": "Environment with this name already exists",
    "error": "Cannot rename environment to an existing name"
  }
  ```
- 状态码: 404 (环境不存在)
- 内容:

  ```json
  {
    "success": false,
    "message": "Environment not found"
  }
  ```
- 状态码: 403 (权限不足)
- 内容:

  ```json
  {
    "success": false,
    "message": "Unauthorized - Insufficient privileges",
    "error": "You do not have permission to modify this environment"
  }
  ```
- 状态码: 401 (未认证)
- 内容:

  ```json
  {
    "success": false,
    "message": "Authentication required",
    "error": "Please log in to perform this operation"
  }
  ```

### 安装包

**请求**:

- 方法: `POST`
- URL: `/api/conda/environment/<env_name>/packages`
- Content-Type: `application/json`
- Cookie: `session=<会话ID>`

**请求体**:

```json
{
  "packages": ["numpy", "pandas", "matplotlib>=3.4.0"]
}
```

**响应**:

- 状态码: 200 (安装成功)
- 内容: 安装结果

  ```json
  {
    "success": true,
    "message": "Packages installed successfully",
    "environment": "环境名称",
    "installed_packages": ["numpy", "pandas", "matplotlib>=3.4.0"]
  }
  ```
- 状态码: 400 (环境被任务使用中)
- 内容:

  ```json
  {
    "success": false,
    "message": "Cannot modify packages in environment that is referenced by running tasks",
    "error": "Environment is in use by tasks",
    "referencing_tasks": ["任务1脚本路径", "任务2脚本路径"]
  }
  ```
- 状态码: 400 (安装失败)
- 内容: 错误详情

  ```json
  {
    "success": false,
    "message": "Failed to install packages",
    "failed_packages": ["不存在的包名", "有冲突的包名"],
    "error_details": [
      "Package '不存在的包名' not found in available channels",
      "Package '有冲突的包名' has conflicts with existing packages"
    ],
    "error": "完整的命令行错误输出..."
  }
  ```
- 状态码: 404 (环境不存在)
- 内容:

  ```json
  {
    "success": false,
    "message": "Environment not found"
  }
  ```
- 状态码: 403 (权限不足)
- 内容:

  ```json
  {
    "success": false,
    "message": "Unauthorized - Insufficient privileges",
    "error": "You do not have permission to modify packages in this environment"
  }
  ```
- 状态码: 401 (未认证)
- 内容:

  ```json
  {
    "success": false,
    "message": "Authentication required",
    "error": "Please log in to perform this operation"
  }
  ```

### 移除包

**请求**:

- 方法: `DELETE`
- URL: `/api/conda/environment/<env_name>/packages`
- Content-Type: `application/json`
- Cookie: `session=<会话ID>`

**请求体**:

```json
{
  "packages": ["numpy", "pandas"]
}
```

**响应**:

- 状态码: 200 (移除成功)
- 内容: 移除结果

  ```json
  {
    "success": true,
    "message": "Packages removed successfully",
    "environment": "环境名称",
    "removed_packages": ["numpy", "pandas"]
  }
  ```
- 状态码: 400 (环境被任务使用中)
- 内容:

  ```json
  {
    "success": false,
    "message": "Cannot remove packages from environment that is referenced by running tasks",
    "error": "Environment is in use by tasks",
    "referencing_tasks": ["任务1脚本路径", "任务2脚本路径"]
  }
  ```
- 状态码: 404 (环境不存在)
- 内容:

  ```json
  {
    "success": false,
    "message": "Environment not found"
  }
  ```
- 状态码: 403 (权限不足)
- 内容:

  ```json
  {
    "success": false,
    "message": "Unauthorized - Insufficient privileges",
    "error": "You do not have permission to remove packages from this environment"
  }
  ```
- 状态码: 401 (未认证)
- 内容:

  ```json
  {
    "success": false,
    "message": "Authentication required",
    "error": "Please log in to perform this operation"
  }
  ```

### 删除环境

**请求**:

- 方法: `DELETE`
- URL: `/api/conda/environment/<env_name>`

**响应**:

- 状态码: 204 (删除成功，无内容)
- 状态码: 400 (环境被任务引用)
- 内容:

  ```json
  {
    "success": false,
    "message": "Cannot delete environment that is referenced by tasks",
    "error": "Environment is in use by tasks",
    "referencing_tasks": ["任务1脚本路径", "任务2脚本路径"]
  }
  ```
- 状态码: 404 (环境不存在)
- 内容:

  ```json
  {
    "success": false,
    "message": "Environment not found"
  }
  ```
- 状态码: 403 (权限不足)
- 内容:

  ```json
  {
    "success": false,
    "message": "Unauthorized - Insufficient privileges",
    "error": "You do not have permission to delete this environment"
  }
  ```
- 状态码: 401 (未认证)
- 内容:

  ```json
  {
    "success": false,
    "message": "Authentication required",
    "error": "Please log in to perform this operation"
  }
  ```

## 任务管理

### 创建任务

**请求**:

- 方法: `POST`
- URL: `/api/tasks`
- Content-Type: `application/json`

**请求体**:

```json
{
  "script": "Python脚本路径或内容",
  "conda_env": "Conda环境名称",
  "task_name": "任务名称（可选）",
  "requirements": "requirements.txt的内容（可选）",
  "reuse_env": false,
  "cron_expression": "*/10 * * * *",       // Cron表达式（可选）
  "delay_seconds": 3600                    // 延迟执行秒数（可选）
}
```

**参数说明**:

- `script`: 必填，Python脚本的路径或内容
- `conda_env`: 必填，任务执行时使用的Conda环境名称
- `task_name`: 可选，任务的名称，如不提供则使用脚本文件名
- `requirements`: 可选，requirements.txt的内容，用于安装任务所需的依赖
- `reuse_env`: 可选，是否复用现有环境（true/false）
- `cron_expression`: 可选，Cron表达式，用于定义周期性执行的时间规则（例如："*/10 * * * *" 表示每10分钟执行一次）
- `delay_seconds`: 可选，延迟执行的秒数，用于一次性延迟执行

**注意事项**:

- `cron_expression`和 `delay_seconds`不能同时提供
- 如果两者都不提供，任务将立即执行
- 如果提供 `cron_expression`，任务将按照Cron表达式定义的周期性时间执行
- 如果提供 `delay_seconds`，任务将在指定延迟后执行一次

**响应**:

- 状态码: 201 (创建成功)
- 内容: 任务详情

  ```json
  {
    "success": true,
    "message": "Task scheduled successfully",
    "task": {
      "task_id": 1,
      "task_name": "任务名称",
      "script_path": "脚本内容",
      "conda_env": "环境名称",
      "status": "scheduled",
      "created_at": "创建时间",
      "cron_expression": "*/10 * * * *",
      "next_run_time": "下次执行时间",
      "last_run_time": null,
      "last_run_duration": null,
      "requirements": "requirements.txt内容（如有）"
    },
    "environment_message": "Requirements installed in existing environment 'env_name'"
  }
  ```
- 状态码: 400 (任务名已存在)
- 内容:

  ```json
  {
    "success": false,
    "message": "Task with this name already exists",
    "error": "Task with name 'task_name' already exists"
  }
  ```
- 状态码: 400 (环境不存在，当reuse_env=true时)
- 内容:

  ```json
  {
    "success": false,
    "message": "Cannot reuse non-existing environment",
    "error": "Environment 'env_name' not found"
  }
  ```
- 状态码: 400 (cron表达式和delay_seconds同时提供)
- 内容:

  ```json
  {
    "success": false,
    "message": "Please specify either cron expression or delay seconds, not both",
    "error": "Cannot specify both cron_expression and delay_seconds"
  }
  ```
- 状态码: 400 (cron表达式无效)
- 内容:

  ```json
  {
    "success": false,
    "message": "The provided cron expression is invalid",
    "error": "Invalid cron expression: <具体错误详情>"
  }
  ```
- 状态码: 400 (delay_seconds无效)
- 内容:

  ```json
  {
    "success": false,
    "message": "Please provide a non-negative delay value",
    "error": "Delay seconds must be non-negative"
  }
  ```
- 状态码: 400 (在现有环境中安装requirements失败)
- 内容:

  ```json
  {
    "success": false,
    "message": "Failed to install requirements in existing environment",
    "error": "详细错误信息",
    "failed_packages": ["失败的包名1", "失败的包名2"],
    "error_details": ["包1的错误详情", "包2的错误详情"],
    "environment_state": "Environment may be in an inconsistent state, consider restoring from backup"
  }
  ```
- 状态码: 400 (创建新环境并安装requirements失败)
- 内容:

  ```json
  {
    "success": false,
    "message": "Failed to install requirements in new environment",
    "error": "详细错误信息",
    "failed_packages": ["失败的包名1", "失败的包名2"],
    "error_details": ["包1的错误详情", "包2的错误详情"]
  }
  ```

### 获取所有任务

**请求**:

- 方法: `GET`
- URL: `/api/tasks`

**响应**:

- 状态码: 200 (成功)
- 内容: 任务列表数组
  ```json
  [
    {
      "task_id": 1,
      "task_name": "任务名称",
      "status": "completed",
      "script_path": "脚本内容",
      "conda_env": "环境名称",
      "created_at": "创建时间",
      "cron_expression": "*/10 * * * *",
      "next_run_time_formatted": "2025-05-02 15:30:00",
      "last_run_time_formatted": "2025-05-02 15:20:00",
      "last_run_duration_formatted": 2.5,
      "completed_at": "完成时间"
    },
    {
      "task_id": 2,
      "task_name": "一次性任务",
      "status": "scheduled",
      "script_path": "脚本内容",
      "conda_env": "环境名称",
      "created_at": "创建时间",
      "cron_expression": null,
      "next_run_time_formatted": "2025-05-02 18:00:00",
      "last_run_time_formatted": null,
      "last_run_duration_formatted": null
    }
  ]
  ```

### 获取任务状态

**请求**:

- 方法: `GET`
- URL: `/api/tasks/<task_id>`

**参数说明**:

- `task_id`: 必填，任务的唯一标识ID

**响应**:

- 状态码: 200 (成功)
- 内容: 任务状态详情

  ```json
  {
    "success": true,
    "task": {
      "task_id": 1,
      "task_name": "任务名称",
      "status": "completed",
      "script_path": "脚本内容",
      "conda_env": "环境名称",
      "created_at": "创建时间",
      "cron_expression": "*/10 * * * *",
      "next_run_time": "下次执行时间",
      "last_run_time": "上次执行时间",
      "last_run_duration": 45.2,
      "last_execution_id": "最近一次执行的ID",
      "executions": ["执行ID1", "执行ID2", "执行ID3"]
    },
    "execution_history": [
      {
        "execution_id": "执行ID",
        "start_time": "开始时间",
        "end_time": "结束时间",
        "status": "completed",
        "duration": 45.2,
        "peak_memory": 128.5,
        "avg_memory": 78.3,
        "exit_code": 0,
        "logs": "任务输出日志（仅在latest_execution中提供完整日志）"
      }
    ],
    "performance_metrics": {
      "durations": [45.2, 42.1, 47.8],
      "timestamps": ["2025-05-01 10:00:00", "2025-05-01 20:00:00", "2025-05-02 06:00:00"],
      "peak_memories": [128.5, 135.2, 124.8],
      "avg_memories": [78.3, 82.1, 76.5]
    },
    "latest_execution": {
      "execution_id": "执行ID",
      "start_time": "开始时间",
      "end_time": "结束时间",
      "status": "completed",
      "duration": 45.2,
      "peak_memory": 128.5,
      "avg_memory": 78.3,
      "exit_code": 0,
      "logs": "任务执行日志内容..."
    }
  }
  ```
- 状态码: 404 (任务不存在)
- 内容:

  ```json
  {
    "success": false,
    "message": "Task with ID 1 not found"
  }
  ```

**说明**:

- `execution_history` 包含任务的所有执行记录
- `performance_metrics` 提供绘制性能图表所需的数据
- `latest_execution` 包含最近一次执行的完整详情，包括执行日志

### 停止任务

**请求**:

- 方法: `POST`
- URL: `/api/tasks/<task_id>/stop`
- Cookie: `session=<会话ID>`

**参数说明**:

- `task_id`: 必填，需要停止的任务的唯一标识ID

**响应**:

- 状态码: 200 (成功)
- 内容: 停止结果

  ```json
  {
    "success": true,
    "message": "Task stopped successfully",
    "task": {
      "task_id": 1,
      "task_name": "任务名称",
      "status": "stopped",
      "previous_status": "running"
    }
  }
  ```
- 状态码: 400 (任务不在运行状态)
- 内容:

  ```json
  {
    "success": false,
    "message": "Task is not in a running state",
    "error": "Cannot stop a task with status: 'completed'",
    "current_status": "completed"
  }
  ```
- 状态码: 404 (任务不存在)
- 内容:

  ```json
  {
    "success": false,
    "message": "Task with ID 1 not found"
  }
  ```
- 状态码: 403 (权限不足)
- 内容:

  ```json
  {
    "success": false,
    "message": "Unauthorized - Insufficient privileges",
    "error": "You do not have permission to stop this task"
  }
  ```
- 状态码: 401 (未认证)
- 内容:

  ```json
  {
    "success": false,
    "message": "Authentication required",
    "error": "Please log in to perform this operation"
  }
  ```

**说明**:

- 此接口用于停止正在运行的任务
- 只有状态为"running"的任务才能被停止
- 停止后的任务状态将变为"stopped"
- 周期性任务被停止后不会取消未来的调度，只会停止当前执行

### 获取任务统计信息

**请求**:

- 方法: `GET`
- URL: `/api/tasks/stats`

**响应**:

- 状态码: 200 (成功)
- 内容: 任务统计信息
  ```json
  {
    "total": 10,                 // 总任务数
    "scheduled": 2,              // 已调度但未执行的任务数
    "running": 1,                // 正在运行的任务数
    "completed": 5,              // 已完成的任务数
    "failed": 2,                 // 执行失败的任务数
    "avg_duration": 45.7,        // 所有任务的平均执行时间（秒）
    "min_duration": 2.3,         // 最短任务执行时间（秒）
    "max_duration": 120.5,       // 最长任务执行时间（秒）
    "success_rate": 71.4,        // 任务成功率（百分比）
    "last_7_days": {             // 最近7天的任务统计
      "dates": [                 // 日期数组，格式为YYYY-MM-DD
        "2025-04-26", "2025-04-27", "2025-04-28", 
        "2025-04-29", "2025-04-30", "2025-05-01", "2025-05-02"
      ],
      "success_counts": [3, 5, 2, 4, 1, 3, 2],  // 每天成功的任务数量
      "failed_counts": [1, 0, 1, 2, 0, 1, 0]    // 每天失败的任务数量
    },
    "recent_tasks": [            // 最近执行的任务（最多5条）
      {
        "task_id": 1,
        "name": "任务名称",
        "status": "completed",
        "start_time": "2025-05-02 10:30:00",
        "end_time": "2025-05-02 10:32:45",
        "duration": 165
      }
    ]
  }
  ```

**说明**:
- 此接口不需要任何参数，直接获取所有任务的统计数据
- `success_rate` 是根据 completed/(completed+failed) 计算得出的百分比
- 如果没有执行过的任务，则 `avg_duration`、`min_duration`、`max_duration` 和 `success_rate` 均为 0
- `last_7_days` 包含最近7天（包括今天）的任务统计数据，用于绘制趋势图
- `recent_tasks` 包含最近执行的任务（按开始时间倒序排列，最多5条）

### 获取最近一个月的任务历史记录

**请求**:

- 方法: `GET`
- URL: `/api/tasks/history`

**说明**:

- 此接口目前在API路由中定义，但后端功能可能尚未完全实现
- 该接口设计用于获取最近一个月内所有任务的执行历史记录

**响应**:

- 状态码: 200 (成功)
- 内容: 任务执行历史记录
  ```json
  {
    "status": "success",
    "data": [
      {
        "task_id": 1,
        "task_name": "任务名称",
        "status": "completed",
        "execution_time": "2025-05-01 15:30:00",
        "duration": 2.5,
        "peak_memory": 128.5,
        "avg_memory": 78.3,
        "exit_code": 0,
        "execution_id": "执行ID"
      }
    ]
  }
  ```

**错误响应**:

- 状态码: 500 (服务器错误)
- 内容:
  ```json
  {
    "status": "error",
    "message": "Feature not fully implemented"
  }
  ```

**注意**:

- 该接口可能使用 `TaskScheduler`类中的 `task_history`字典和 `clean_old_task_history`方法的逻辑
- 返回的历史记录已自动过滤为仅包含最近一个月的数据

## 状态码说明

- `200 OK`: 请求成功
- `201 Created`: 资源创建成功
- `204 No Content`: 请求成功，无返回内容
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 认证失败
- `403 Forbidden`: 权限不足
- `404 Not Found`: 资源不存在
- `500 Internal Server Error`: 服务器内部错误

## 注意事项

1. 所有请求和响应数据均使用JSON格式
2. 认证接口未指定前缀，其他接口均使用 `/api`前缀
3. 部分响应格式可能根据实际实现有所不同
4. 所有需要权限的操作均通过会话Cookie进行身份验证
5. 会话Cookie的有效期为15分钟，超时后需要重新登录
6. 所有接口请求都应该包含会话Cookie (除了登录接口)
