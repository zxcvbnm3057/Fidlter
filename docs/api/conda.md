# Conda环境管理

本文档描述了Conda Task Manager系统的Conda环境管理相关API接口。

## 获取环境列表

**请求**:

- 方法: `GET`
- URL: `/api/conda/environments`
- 支持: 流式响应 (添加`stream=true`查询参数启用)

**响应**:

- 状态码: 200 (成功)
- 内容: 环境列表数组
  ```json
  [
    {
      "name": "环境名称",
      "python_version": "Python版本",
      "created_at": "创建时间",
      "basic_info_only": true  // 表示此环境信息是基本信息，详细信息需要单独加载
    }
  ]
  ```

**没有环境时的响应**:
- 正常模式: 返回空数组 `[]`
- 流式模式: 不返回任何数据行，连接会正常关闭

**流式响应说明**:
- 当使用查询参数`?stream=true`请求时，服务器将以流式方式返回响应
- 前端可以逐个接收环境数据，而不必等待所有环境信息全部加载完成
- 流式响应格式为每行一个JSON对象，表示单个环境数据
- 如果没有环境，流式响应不会返回任何数据行，连接会正常关闭
- 推荐在环境数量较多或网络延迟较高的情况下使用流式响应

**说明**:
- 此接口只返回基本环境信息，不包含磁盘空间和包数量等耗时计算的信息
- 默认情况下 `basic_info_only` 为 `true`，表示该环境信息不完整
- 通过调用 `/api/conda/environment/<env_name>/extended-info` 可以获取环境的扩展信息（磁盘使用量和包数量）

## 获取环境扩展信息

**请求**:

- 方法: `GET`
- URL: `/api/conda/environment/<env_name>/extended-info`

**响应**:

- 状态码: 200 (成功)
- 内容: 环境扩展信息
  ```json
  {
    "name": "环境名称",
    "disk_usage": 1.2,         // 环境占用空间（GB），如无法获取则为0
    "package_count": 42,       // 安装的包数量
    "is_size_accurate": true   // 磁盘占用数据是否准确
  }
  ```

**说明**:
- 此接口返回单个环境的扩展信息，包括磁盘使用量和包数量等需要耗时计算的信息
- `disk_usage`是环境占用的磁盘空间（GB）
  - 如果无法获取磁盘使用量，该值为0，前端将显示"未知"
- `is_size_accurate`表示磁盘占用数据是否准确
  - 即使`disk_usage`为0，只要`is_size_accurate`为true，前端也不应显示警告信息
  - 只有当`is_size_accurate`为false时，前端才显示"数据可能不准确"的警告
- `package_count`包含环境中已安装的包数量

## 获取环境统计信息

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
    ]
  }
  ```

**说明**:
- 此接口不需要任何参数，直接获取Conda环境的简要统计数据
- `total_environments` 是系统中所有Conda环境的数量
- `active_environments` 是当前被任务使用的环境数量
- `latest_created` 包含最近创建的环境信息
  - 如果无法确定环境创建时间，将使用当前时间
- `environment_usage` 包含各环境的使用率信息，用于生成饼图
- 总磁盘使用量和包数量统计需要通过获取各环境扩展信息后在前端计算

**注意**:
- 前端应负责根据环境扩展信息计算总磁盘使用量
- 当某些环境的磁盘使用量数据不准确时，前端应显示警告信息

## 获取环境详情

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
  - 如果无法获取Python版本，返回值可能为"Unknown"或null
- `created_at` 是环境的创建日期
  - 如果无法确定环境创建日期，将使用当前时间并在前端显示提示
- `usage_stats` 包含环境的使用统计信息，如总任务数、成功率等
  - `disk_usage` 如果无法获取，将返回0，前端显示为"未知"
  - `success_rate` 和 `avg_execution_time` 在无法统计时也可能为0或null
- `packages` 包含环境中已安装的主要包列表及其版本
  - 如果无法获取包信息，此数组可能为空，前端会显示相应提示

**数据完整性说明**:
- 环境详情可能会包含无法准确获取的数据，系统会清晰标识这些数据
- 前端将在相应位置显示"数据不完整"、"未知"或其他提示，而不是显示可能不准确的估算值
- 响应中的0或null值可能表示该数据实际无法获取，前端会适当处理这些情况

## 获取可用Python版本

**请求**:

- 方法: `GET`
- URL: `/api/conda/python-versions`

**响应**:

- 状态码: 200 (成功)
- 内容: Python版本列表
  ```json
  {
    "success": true,
    "versions": ["3.6", "3.7", "3.8", "3.9", "3.10", "3.11", "3.12"],
    "source": "conda"  // 表示数据来源："conda" 从Conda官网获取，"fallback" 使用预定义列表
  }
  ```

**错误情况**:

- 状态码: 200 (成功，但使用了fallback数据)
- 内容:
  ```json
  {
    "success": true,
    "versions": ["3.6", "3.7", "3.8", "3.9", "3.10", "3.11", "3.12"],
    "source": "fallback",
    "message": "无法从Conda官网获取版本信息，使用预定义版本列表"
  }
  ```

**说明**:
- 此接口不需要任何参数，直接返回可用的Python版本列表
- 系统会首先尝试从Conda官网获取最新的Python版本列表
- 如果获取失败（网络错误、超时等），系统会返回预定义的Python版本列表
- `source`字段指示数据来源，可用于前端显示数据来源提示

## 创建新环境

**请求**:

- 方法: `POST`
- URL: `/api/conda/environment`
- Content-Type: `application/json`

**请求体**:

```json
{
  "name": "环境名称",
  "python_version": "3.10",
  "packages": ["numpy", "pandas==1.5.0", "matplotlib>=3.4.0"]
}
```

**说明**:
- `name` (必需): 新环境的名称
- `python_version` (可选): 指定Python版本，如"3.6"、"3.10"等，默认使用系统默认Python版本
- `packages` (可选): 初始安装的包列表，每个元素表示一个包，可以包含版本约束，如"numpy==1.22.3"或"pandas>=1.3.0"
- **注意**: 前端输入时必须限制为每行一个包，不支持一行多个包或逗号分隔格式

**响应**:

- 状态码: 201 (创建成功)
- 内容: 创建结果
  ```json
  {
    "success": true,
    "message": "Environment created successfully",
    "env": {
      "name": "环境名称",
      "python_version": "3.10",
      "created_at": "创建时间"
    }
  }
  ```

## 修改环境

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

## 安装包

**请求**:

- 方法: `POST`
- URL: `/api/conda/environment/<env_name>/packages`
- Content-Type: `application/json`
- Cookie: `session=<会话ID>`

**请求体**:

```json
{
  "packages": ["numpy", "pandas==1.5.0", "matplotlib>=3.4.0"]
}
```

**说明**:
- `packages`: 要安装的包列表，每个元素表示一个包，可以包含版本约束
- **注意**: 前端输入时必须限制为每行一个包，不支持一行多个包或逗号分隔格式

**响应**:

- 状态码: 200 (安装成功)
- 内容: 安装结果

  ```json
  {
    "success": true,
    "message": "Packages installed successfully",
    "environment": "环境名称",
    "installed_packages": ["numpy", "pandas==1.5.0", "matplotlib>=3.4.0"]
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

## 移除包

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

## 删除环境

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
