# Conda环境管理

本文档描述了Conda Task Manager系统的Conda环境管理相关API接口。

**注意**：系统会在用户对环境进行操作（创建、删除、重命名、增减包）时，自动更新相应的环境配置信息，并持久化存储到`/var/fidlter/data/env_info`目录下。所有数据在系统启动时从磁盘加载。

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
      "package_count": 42,        // 已安装的包数量
      "is_managed_by_container": true  // 指示环境由容器自动管理
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
- 此接口返回容器提供的环境列表
- `is_managed_by_container` 指示该环境由容器管理，前端应禁用某些手动管理操作

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
    "is_managed_by_container": true,
    "usage_stats": {
      "total_tasks": 24,
      "success_rate": 92,
      "avg_execution_time": 45
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
- `created_at` 是环境的创建日期（从容器记录获取）
- `is_managed_by_container` 指示该环境由容器管理
- `usage_stats` 包含环境的使用统计信息，如总任务数、成功率等
- `packages` 包含环境中已安装的包列表及其版本

**数据完整性说明**:
- 环境详情会尽量保持与容器内实际环境一致
- 系统会同步更新环境配置元数据，以反映容器中环境的变化

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
- 系统会首先尝试从容器获取可用的Python版本列表
- 如果获取失败，系统会返回预定义的Python版本列表
- `source`字段指示数据来源，可用于前端显示数据来源提示

## 创建新环境

**请求**:

- 方法: `POST`
- URL: `/api/conda/environment`
- Content-Type: `application/json`

**请求体**:

```json
{
  "name": "新环境名称",
  "python_version": "3.10",
  "packages": ["numpy", "pandas", "matplotlib"]
}
```

**说明**:
- `name` (必需): 新环境的名称
- `python_version` (必需): 环境中要安装的Python版本
- `packages` (可选): 要安装的包列表，每个元素可以是单纯的包名或带版本限制

**响应**:

- 状态码: 201 (创建成功)
- 内容: 创建结果
  ```json
  {
    "success": true,
    "message": "Environment created successfully",
    "env": {
      "name": "新环境名称",
      "python_version": "3.10",
      "created_at": "2025-05-03 12:34:56",
      "package_count": 3
    }
  }
  ```

**说明**:
- 此接口用于创建新的Conda环境
- 系统会自动记录环境的配置元数据，并持久化保存到`/var/fidlter/data/env_info`目录
- 当提供packages参数时，系统会自动安装指定的包并更新环境配置

## 删除环境

**请求**:

- 方法: `DELETE`
- URL: `/api/conda/environment/<env_name>`

**响应**:

- 状态码: 200 (成功)
- 内容: 删除结果
  ```json
  {
    "success": true,
    "message": "Environment 'env_name' deleted successfully"
  }
  ```

**说明**:
- 此接口用于删除指定的Conda环境
- 系统会自动同步删除相应的环境配置元数据
- 如果环境正在被任务使用，将返回错误

## 重命名环境

**请求**:

- 方法: `PUT`
- URL: `/api/conda/environment/<env_name>/rename`
- Content-Type: `application/json`

**请求体**:

```json
{
  "new_name": "新环境名称"
}
```

**说明**:
- `new_name` (必需): 环境的新名称

**响应**:

- 状态码: 200 (成功)
- 内容: 重命名结果
  ```json
  {
    "success": true,
    "message": "Environment renamed successfully",
    "old_name": "旧环境名称",
    "new_name": "新环境名称",
    "updated_tasks_count": 2  // 更新引用的任务数量
  }
  ```

**说明**:
- 此接口用于重命名指定的Conda环境
- 系统会自动更新所有引用该环境的任务
- 系统会自动同步更新环境配置元数据

## 在环境中安装包

**请求**:

- 方法: `POST`
- URL: `/api/conda/environment/<env_name>/packages`
- Content-Type: `application/json`

**请求体**:

```json
{
  "packages": ["numpy", "pandas==1.5.0", "matplotlib>=3.4.0"]
}
```

**说明**:
- `packages` (必需): 要安装的包列表，每个元素表示一个包，可以包含版本约束

**响应**:

- 状态码: 200 (成功)
- 内容: 安装结果
  ```json
  {
    "success": true,
    "message": "Packages installed successfully",
    "installed_packages": ["numpy-1.24.3", "pandas-1.5.0", "matplotlib-3.7.1"],
    "failed_packages": []
  }
  ```

**说明**:
- 此接口用于在指定环境中安装包
- 系统会自动同步更新环境的配置元数据
- 如果某些包安装失败，将在`failed_packages`字段中列出

## 从环境中移除包

**请求**:

- 方法: `DELETE`
- URL: `/api/conda/environment/<env_name>/packages`
- Content-Type: `application/json`

**请求体**:

```json
{
  "packages": ["numpy", "pandas", "matplotlib"]
}
```

**说明**:
- `packages` (必需): 要移除的包名列表

**响应**:

- 状态码: 200 (成功)
- 内容: 移除结果
  ```json
  {
    "success": true,
    "message": "Packages removed successfully",
    "removed_packages": ["numpy", "pandas", "matplotlib"],
    "failed_packages": []
  }
  ```

**说明**:
- 此接口用于从指定环境中移除包
- 系统会自动同步更新环境的配置元数据
- 如果某些包移除失败，将在`failed_packages`字段中列出

## 获取环境统计信息

**请求**:

- 方法: `GET`
- URL: `/api/conda/stats`

**响应**:

- 状态码: 200 (成功)
- 内容: 环境统计信息
  ```json
  {
    "total_environments": 5,
    "active_environments": 3,
    "latest_created": {
      "name": "data_science",
      "created_at": "2025-05-01 14:30:22"
    },
    "environment_usage": [
      {
        "name": "ml_env",
        "task_count": 12
      },
      {
        "name": "data_science",
        "task_count": 5
      },
      {
        "name": "web_dev",
        "task_count": 0
      }
    ]
  }
  ```

**说明**:
- 此接口返回所有环境的统计概览信息
- `total_environments` 表示系统中的总环境数
- `active_environments` 表示被任务引用的环境数
- `latest_created` 表示最近创建的环境信息
- `environment_usage` 列出每个环境被任务引用的数量，`task_count` 表示引用该环境的任务数

## 数据持久化说明

系统对于环境配置元数据的持久化遵循以下规则：

1. **存储位置**: 环境配置元数据存储在`/var/fidlter/data/env_info`目录下，每个环境一个JSON文件
2. **文件命名**: 文件名为`<环境名>.json`
3. **数据格式**: 每个文件包含环境名称、Python版本、创建时间、包列表等信息
4. **实时更新**: 环境配置在创建、删除、重命名或修改包列表时立即更新
5. **启动加载**: 系统启动时自动从磁盘加载所有环境配置元数据

## 环境配置元数据格式

```json
{
  "name": "环境名称",
  "python_version": "3.10",
  "created_at": "2025-05-03 12:34:56",
  "updated_at": "2025-05-03 14:22:18",
  "packages": [
    {
      "name": "numpy",
      "version": "1.24.3"
    },
    {
      "name": "pandas",
      "version": "2.0.1"
    }
  ]
}
```
````
