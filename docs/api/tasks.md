# 任务管理

本文档描述了Conda Task Manager系统的任务管理相关API接口。

## 创建任务

**请求**:

- 方法: `POST`
- URL: `/api/tasks`
- Content-Type: `multipart/form-data`

**请求参数**:

```
script_file: 脚本文件（必填，单个文件）或ZIP包
conda_env: Conda环境名称（必填）
task_name: 任务名称（可选）
requirements_file: requirements.txt文件（可选）或requirements内容
reuse_env: 是否复用环境 (可选，true/false)
cron_expression: Cron表达式（可选）
delay_seconds: 延迟执行秒数（可选）
command: 启动命令（可选，默认为"python main.py"）
```

**说明**:

- `script_file`: 必填，上传的Python脚本文件或包含多个文件的ZIP压缩包
- `conda_env`: 必填，任务执行时使用的Conda环境名称
- `task_name`: 可选，任务的名称，如不提供则使用脚本文件名
- `requirements_file`: 可选，requirements.txt文件，用于安装任务所需的依赖
- `reuse_env`: 可选，是否复用现有环境（true/false）
- `cron_expression`: 可选，Cron表达式，用于定义周期性执行的时间规则（例如："*/10 * * * *" 表示每10分钟执行一次）
- `delay_seconds`: 可选，延迟执行的秒数，用于一次性延迟执行
- `command`: 可选，启动命令，例如："python main.py --arg value"，默认为"python main.py"

**注意事项**:

- `cron_expression`和 `delay_seconds`不能同时提供
- 如果两者都不提供，任务将立即执行
- 如果提供 `cron_expression`，任务将按照Cron表达式定义的周期性时间执行
- 如果提供 `delay_seconds`，任务将在指定延迟后执行一次
- 对于ZIP压缩包，所有文件将被解压到`/var/fidlter/scripts/{task_id}/`目录下
- 对于ZIP压缩包，请不要在ZIP中包含额外的顶层目录，直接将所有文件放在ZIP的根目录中
- 启动命令将在`/var/fidlter/scripts/{task_id}/`目录下执行
- 如果上传ZIP包但未提供启动命令，默认使用`python main.py`

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
      "script_path": "脚本路径",
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
- 状态码: 400 (无法处理上传的文件)
- 内容:

  ```json
  {
    "success": false,
    "message": "Failed to process uploaded file",
    "error": "详细错误信息"
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

## 获取所有任务

**请求**:

- 方法: `GET`
- URL: `/api/tasks`
- 支持查询参数: `type=defined` (获取所有已定义任务，默认) 或 `type=history` (获取历史执行记录)

**响应**:

- 状态码: 200 (成功)
- 内容: 任务列表数组
  ```json
  [
    {
      "task_id": 1,
      "task_name": "任务名称",
      "status": "completed",
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
      "conda_env": "环境名称",
      "created_at": "创建时间",
      "cron_expression": null,
      "next_run_time_formatted": "2025-05-02 18:00:00",
      "last_run_time_formatted": null,
      "last_run_duration_formatted": null
    }
  ]
  ```

**说明**:
- 当使用 `type=defined` 参数或不提供 type 参数时，返回所有已定义的任务
- 当使用 `type=history` 参数时，返回历史执行记录
- 前端可以根据不同需求选择对应的参数来获取合适的数据

## 获取任务状态

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

## 获取任务执行日志

**请求**:

- 方法: `GET`
- URL: `/api/tasks/<task_id>/executions/<execution_id>/logs`
- 支持查询参数: 
  - `stream=true` (实时获取最新日志)

**参数说明**:

- `task_id`: 必填，任务的唯一标识ID
- `execution_id`: 必填，执行的唯一标识ID
- `stream`: 可选，布尔值，指示是否使用流式API获取实时日志，默认为false

**响应**:

当 `stream=false` 或未指定时:
- 状态码: 200 (成功)
- 内容:
  ```json
  {
    "success": true,
    "task_id": 1,
    "execution_id": "执行ID",
    "logs": "任务执行的详细日志内容...",
    "is_complete": false,         // 任务是否已完成
    "last_update": "2025-05-03 10:45:32"  // 日志最后更新时间
  }
  ```

当 `stream=true` 时:
- 状态码: 200 (成功)
- 内容类型: `text/event-stream`
- 响应体: 使用Server-Sent Events格式的数据流

每个事件的格式为:
```
data: {"logs": "新增日志内容", "is_complete": false}
```

当任务完成时，is_complete将为true:
```
data: {"logs": "新增日志内容", "is_complete": true}
```

- 状态码: 404 (任务或执行ID不存在)
- 内容:
  ```json
  {
    "success": false,
    "message": "Task execution with ID not found"
  }
  ```

- 状态码: 500 (内部服务器错误)
- 内容:
  ```json
  {
    "success": false,
    "message": "Failed to retrieve logs",
    "error": "详细错误信息"
  }
  ```

**说明**:
- 此接口用于获取特定任务执行的日志内容
- 当使用 `stream=false` 参数或不提供此参数时，接口将返回当前的完整日志内容
- 当使用 `stream=true` 参数时，服务器将使用Server-Sent Events技术保持连接打开，持续发送新的日志内容：
  - 第一次响应包含当前已有的完整日志
  - 后续响应只包含增量日志(新产生的日志内容)
  - 客户端无需轮询，服务器会自动推送新内容
  - 当任务执行完成时，服务器会发送一个complete事件并关闭连接
- `is_complete` 字段指示任务是否已完成执行
- 系统将确保无论是流式传输还是轮询方式，日志都不会丢失，始终能获取完整的执行历史

## 手动触发任务

**请求**:

- 方法: `POST`
- URL: `/api/tasks/<task_id>/trigger`
- Cookie: `session=<会话ID>`

**参数说明**:

- `task_id`: 必填，需要触发的任务的唯一标识ID

**响应**:

- 状态码: 200 (成功)
- 内容: 触发结果

  ```json
  {
    "success": true,
    "message": "Task triggered successfully",
    "task": {
      "task_id": 1,
      "task_name": "任务名称",
      "status": "running",
      "previous_status": "scheduled"
    }
  }
  ```
- 状态码: 400 (任务不能被触发)
- 内容:

  ```json
  {
    "success": false,
    "message": "Task cannot be triggered",
    "error": "Cannot trigger a task with status: 'running'",
    "current_status": "running"
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

- 此接口用于手动触发任务的立即执行
- 可以触发状态为"scheduled"、"paused"或"stopped"的任务
- 触发后任务状态将变为"running"
- 对于定时任务，手动触发不会影响其调度规则，下次仍会按原定时间执行

## 停止任务

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
- 状态码: 400 (任务不能被停止)
- 内容:

  ```json
  {
    "success": false,
    "message": "Task cannot be stopped",
    "error": "Cannot stop a task with status: 'stopped'",
    "current_status": "stopped"
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

- 此接口用于停止任务，包括正在运行的任务以及调度中的任务
- 对于正在运行的任务，停止会终止其执行进程
- 对于已调度的任务，停止会将其从调度系统中移除
- 停止后的任务状态将变为"stopped"，不会参与后续调度
- 停止功能整合了原来的"停止"和"禁用"功能，不再区分这两个操作
- 停止功能相当于将任务完全移出调度系统，如果想要重新执行已停止的任务，需要使用启动任务接口

## 暂停任务

**请求**:

- 方法: `POST`
- URL: `/api/tasks/<task_id>/pause`
- Cookie: `session=<会话ID>`

**参数说明**:

- `task_id`: 必填，需要暂停的任务的唯一标识ID

**响应**:

- 状态码: 200 (成功)
- 内容: 暂停结果

  ```json
  {
    "success": true,
    "message": "Task paused successfully",
    "task": {
      "task_id": 1,
      "task_name": "任务名称",
      "status": "paused",
      "previous_status": "scheduled"
    }
  }
  ```
- 状态码: 400 (任务不能被暂停)
- 内容:

  ```json
  {
    "success": false,
    "message": "Task cannot be paused",
    "error": "Cannot pause a task with status: 'stopped'",
    "current_status": "stopped"
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

- 此接口用于暂停任务，可以暂停正在运行的任务或已调度的任务
- 对于正在运行的任务，暂停会暂时挂起其执行进程，但不会终止进程
- 对于已调度的任务，暂停会暂时将其移出调度系统，但保留其调度信息
- 暂停后的任务状态将变为"paused"，可以通过恢复接口重新启动
- 与停止功能不同，暂停是临时性的，任务的所有信息和状态都会被保留，以便后续恢复

## 恢复任务

**请求**:

- 方法: `POST`
- URL: `/api/tasks/<task_id>/resume`
- Cookie: `session=<会话ID>`

**参数说明**:

- `task_id`: 必填，需要恢复的任务的唯一标识ID

**响应**:

- 状态码: 200 (成功)
- 内容: 恢复结果

  ```json
  {
    "success": true,
    "message": "Task resumed successfully",
    "task": {
      "task_id": 1,
      "task_name": "任务名称",
      "status": "running",
      "previous_status": "paused"
    }
  }
  ```
- 状态码: 400 (任务不处于暂停状态)
- 内容:

  ```json
  {
    "success": false,
    "message": "Task is not paused",
    "error": "Cannot resume a task with status: 'running'",
    "current_status": "running"
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

- 此接口用于恢复已暂停的任务
- 只有状态为"paused"的任务才能被恢复
- 恢复后任务状态将变为"running"，任务线程将继续执行
- 如果任务是定时任务，将同时恢复其调度

## 获取任务统计信息

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
    "paused": 2,                 // 已暂停的任务数
    "stopped_count": 2,          // 已停止的任务数
    "avg_duration": 45.7,        // 所有任务的平均执行时间（秒）
    "min_duration": 2.3,         // 最短任务执行时间（秒）
    "max_duration": 120.5,       // 最长任务执行时间（秒）
    "success_rate": 71.4,        // 任务成功率（百分比）
    "system_resources": {        // 系统资源使用情况（过去24小时，按小时统计）
      "timestamps": [            // 时间戳数组，格式为YYYY-MM-DD HH:00:00
        "2025-05-02 00:00:00", "2025-05-02 01:00:00", "2025-05-02 02:00:00",
        "2025-05-02 03:00:00", "2025-05-02 04:00:00", "2025-05-02 05:00:00",
        // ... 更多小时数据点
        "2025-05-02 23:00:00"
      ],
      "memory_usage": [          // 每小时系统内存使用情况(MB)
        4096, 4200, 3950, 4100, 3890, 4050, 
        // ... 更多小时数据点
        4150
      ],
      "total_memory": 8192,      // 系统总内存(MB)
      "task_counts": [           // 每小时执行的任务数量
        2, 1, 0, 3, 2, 1,
        // ... 更多小时数据点
        2
      ]
    },
    "task_success_rate": {       // 任务成功率分布（用于饼图）
      "success": 25,             // 成功任务数
      "failed": 8,               // 失败任务数
      "cancelled": 3,            // 被取消任务数
      "abnormal": 2              // 异常终止任务数
    },
    "last_7_days": {             // 最近7天的任务统计
      "dates": [                 // 日期数组，格式为YYYY-MM-DD
        "2025-04-26", "2025-04-27", "2025-04-28", 
        "2025-04-29", "2025-04-30", "2025-05-01", "2025-05-02"
      ],
      "success_counts": [3, 5, 2, 4, 1, 3, 2],  // 每天成功的任务数量
      "failed_counts": [1, 0, 1, 2, 0, 1, 0]    // 每天失败的任务数量
    },
    "upcoming_tasks": [          // 即将执行的任务（最多10条）
      {
        "task_id": 1,
        "task_name": "任务名称",
        "conda_env": "base",
        "command": "python script.py",
        "scheduled_time": "2025-05-03 12:30:00",
        "cron_expression": "0 */2 * * *"
      }
      // ... 更多即将执行的任务
    ],
    "recent_tasks": [            // 最近执行的任务（最多5条）
      {
        "task_id": 1,
        "name": "任务名称",
        "status": "completed",
        "start_time": "2025-05-02 10:30:00",
        "end_time": "2025-05-02 10:32:45",
        "duration": 165
      }
      // ... 更多最近执行的任务
    ]
  }
  ```

**说明**:
- 此接口不需要任何参数，直接获取所有任务的统计数据
- `system_resources` 字段包含过去24小时内每小时的系统资源使用情况:
  - `timestamps`: 每小时的时间戳
  - `memory_usage`: 每小时的内存使用量(MB)，非百分比
  - `total_memory`: 系统总内存(MB)
  - `task_counts`: 每小时执行的任务数量
- 使用真实数据而非模拟数据，当数据不可用时前端应显示占位图
- `task_success_rate` 字段表示任务成功率分布，用于饼图显示
- `upcoming_tasks` 字段返回即将执行的10条任务
- `success_rate` 是根据 completed/(completed+failed), 计算得出的百分比

**数据完整性说明**:
- 当系统资源统计数据不可用时(如系统监控服务不可用)，`system_resources`可能为null
- 此时前端应显示占位图或"数据不可用"提示，而非显示空图表

## 获取最近一个月的任务历史记录

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

## 删除任务

**请求**:

- 方法: `DELETE`
- URL: `/api/tasks/<task_id>`
- Cookie: `session=<会话ID>`

**参数说明**:

- `task_id`: 必填，需要删除的任务的唯一标识ID

**响应**:

- 状态码: 200 (成功)
- 内容: 删除结果

  ```json
  {
    "success": true,
    "message": "Task deleted successfully",
    "task_id": 1
  }
  ```
- 状态码: 400 (任务不能被删除)
- 内容:

  ```json
  {
    "success": false,
    "message": "Task cannot be deleted",
    "error": "Cannot delete a task that is currently running",
    "current_status": "running"
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
    "error": "You do not have permission to delete this task"
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

- 此接口用于从系统中永久删除任务及其关联的执行历史记录
- 正在运行的任务不能直接删除，需要先停止任务
- 与停止任务不同，删除任务会永久移除任务的定义和所有相关记录
- 该操作不可撤销，删除后任务将无法恢复

## 更新任务

**请求**:

- 方法: `PUT`
- URL: `/api/tasks/<task_id>`
- Content-Type: `application/json`
- Cookie: `session=<会话ID>`

**请求体**:

```json
{
  "task_name": "更新后的任务名称",
  "script": "更新后的Python脚本路径或内容",
  "conda_env": "更新后的Conda环境名称",
  "cron_expression": "更新后的Cron表达式",
  "requirements": "更新后的requirements.txt内容",
  "delay_seconds": 7200,
  "priority": "high"
}
```

**参数说明**:

- `task_name`: 可选，更新后的任务名称
- `script`: 可选，更新后的Python脚本路径或内容
- `conda_env`: 可选，更新后的Conda环境名称
- `cron_expression`: 可选，更新后的Cron表达式，如果提供此字段则会清除delay_seconds
- `delay_seconds`: 可选，更新后的延迟执行秒数，如果提供此字段则会清除cron_expression
- `requirements`: 可选，更新后的requirements.txt内容
- `priority`: 可选，更新后的任务优先级，可选值为：'low', 'normal', 'high'

**注意事项**:

- 请求体中的所有字段都是可选的，只需提供要更新的字段
- 未提供的字段将保持原值不变
- 正在运行的任务不能更新，需要先停止或暂停任务
- 如果提供了新的requirements，系统将会自动在指定环境中安装这些要求
- cron_expression和delay_seconds不能同时提供，否则会返回错误
- 如果当前任务有延迟执行设置，提供cron_expression会取消原有延迟并改为定时任务
- 如果当前任务有定时设置，提供delay_seconds会取消原有定时设置并改为延迟执行任务

**响应**:

- 状态码: 200 (成功)
- 内容: 更新后的任务

  ```json
  {
    "success": true,
    "message": "Task updated successfully",
    "task": {
      "task_id": 1,
      "task_name": "更新后的任务名称",
      "script_path": "更新后的脚本内容或路径",
      "conda_env": "更新后的环境名称",
      "status": "scheduled",
      "created_at": "创建时间",
      "updated_at": "更新时间",
      "cron_expression": "更新后的表达式",
      "next_run_time": "更新后的下次执行时间",
      "last_run_time": "上次执行时间",
      "last_run_duration": 45.2,
      "priority": "high"
    },
    "requirements_update": {
      "success": true,
      "installed_packages": ["package1", "package2"],
      "failed_packages": []
    }
  }
  ```
- 状态码: 400 (任务不能被更新)
- 内容:

  ```json
  {
    "success": false,
    "message": "Task cannot be updated",
    "error": "Cannot update a task that is currently running",
    "current_status": "running"
  }
  ```
- 状态码: 400 (更新参数无效)
- 内容:

  ```json
  {
    "success": false,
    "message": "Invalid update parameters",
    "error": "The provided cron expression is invalid: <具体错误详情>"
  }
  ```

  或

  ```json
  {
    "success": false,
    "message": "Invalid update parameters",
    "error": "Cannot specify both cron_expression and delay_seconds"
  }
  ```
- 状态码: 400 (环境不存在)
- 内容:

  ```json
  {
    "success": false,
    "message": "Environment not found",
    "error": "The specified conda environment 'env_name' does not exist"
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

- 此接口用于全面更新已有任务的配置
- 更新任务的cron表达式会导致任务调度时间重新计算
- 更新任务的conda环境会自动处理环境依赖关系
- 更新任务的脚本会影响后续执行，但不会影响历史执行记录
- 当更新包含环境或requirements变更时，系统会自动同步环境配置

## 更新任务脚本

**请求**:

- 方法: `POST`
- URL: `/api/tasks/<task_id>/update-script`
- Content-Type: `multipart/form-data`

**请求参数**:

```
script_file: 脚本文件（必填，单个文件）或ZIP包
command: 启动命令（可选，如不提供则使用当前命令或自动检测）
force: 是否强制更新（可选，如果为true则会自动停止运行中的任务，默认为false）
```

**参数说明**:

- `script_file`: 必填，更新的Python脚本文件或包含多个文件的ZIP压缩包，将替换任务的现有脚本文件
- `command`: 可选，更新的启动命令，命令将在脚本目录下执行
- `force`: 可选，布尔值，指示是否强制更新。当任务正在运行且此参数为true时，系统会先停止任务再更新脚本

**注意事项**:

- 如果任务状态为"running"或"scheduled"，且force参数为true，系统会自动停止任务后再更新脚本
- 如果任务状态为"running"或"scheduled"，且force参数为false或未提供，将返回错误
- 对于已是"paused"或"stopped"状态的任务，不受force参数影响
- 上传的文件将替换任务目录中的所有现有文件
- 对于ZIP压缩包，请不要在ZIP中包含额外的顶层目录，直接将所有文件放在ZIP的根目录中
- 如果未提供新的启动命令，将保留现有命令。如果任务之前没有启动命令，系统将尝试自动检测主要脚本文件

**响应**:

- 状态码: 200 (成功)
- 内容: 更新结果

  ```json
  {
    "success": true,
    "message": "Task script updated successfully",
    "task": {
      "task_id": 1,
      "task_name": "任务名称",
      "script_path": "更新后的脚本路径",
      "command": "更新后的命令",
      "status": "paused"
    },
    "updated_files": ["file1.py", "file2.py", "data.csv"]
  }
  ```
- 状态码: 400 (任务不能被更新)
- 内容:

  ```json
  {
    "success": false,
    "message": "Task script cannot be updated",
    "error": "Cannot update a task with status: 'running'",
    "current_status": "running"
  }
  ```
- 状态码: 400 (无脚本文件提供)
- 内容:

  ```json
  {
    "success": false,
    "message": "No script file provided",
    "error": "Script file is required for update"
  }
  ```
- 状态码: 400 (无法处理上传的文件)
- 内容:

  ```json
  {
    "success": false,
    "message": "Failed to process uploaded file",
    "error": "详细错误信息"
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

- 此接口专门用于更新任务的脚本文件，不影响任务的其他配置
- 更新脚本不会自动恢复任务执行，需要手动调用恢复任务接口
- 所有更新的文件都将被保存到任务的专属目录：`/var/fidlter/scripts/{task_id}/`
- 命令执行的工作目录将是`/var/fidlter/scripts/{task_id}/`
