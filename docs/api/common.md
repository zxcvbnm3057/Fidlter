# 通用信息

本文档包含Conda Task Manager API的通用信息，包括状态码说明和注意事项。

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

## 数据持久化机制

系统所有数据都会被持久化存储，确保在容器重启或系统崩溃后数据不会丢失：

1. 任务配置数据存储在 `/var/fidlter/config` 目录
2. 系统记录数据存储在 `/var/fidlter/data` 目录

**注意**：Conda环境由容器自动管理，系统仅保存环境的配置元数据（环境名、Python版本和包列表），不直接管理环境的创建和删除操作。

### 数据存储结构

```
/var/fidlter/
├── config/
│   ├── tasks.json          # 任务配置信息
│   └── system_config.json  # 系统配置信息
└── data/
    ├── task_history/       # 任务执行历史记录
    │   ├── <task_id1>.json # 任务1的历史记录
    │   └── <task_id2>.json # 任务2的历史记录
    ├── env_info/           # 环境配置元数据
    │   ├── <env_name1>.json # 环境1的配置信息(名称、Python版本、包列表)
    │   └── <env_name2>.json # 环境2的配置信息(名称、Python版本、包列表)
    └── stats/              # 统计数据
        ├── tasks_stats.json # 任务统计信息
        └── conda_stats.json # Conda环境统计信息
```

### 数据持久化保证

1. **即时写入**: 所有数据修改会立即写入磁盘，确保在系统崩溃时不会丢失数据
2. **启动加载**: 系统启动时会自动从磁盘加载所有持久化数据
3. **数据备份**: 系统会定期创建数据备份，默认每24小时备份一次
4. **文件锁**: 写入操作时使用文件锁防止并发写入导致的数据损坏
5. **日志记录**: 所有数据操作都会记录详细日志，便于问题追踪和恢复

### 数据恢复顺序

系统启动时按以下顺序恢复数据:

1. 加载系统配置 (`system_config.json`)
2. 加载环境配置元数据 (`env_info/`)
3. 加载任务配置 (`tasks.json`)
4. 加载任务历史记录 (`task_history/`)
5. 重建统计数据或加载缓存的统计数据 (`stats/`)

### 数据一致性保证

为确保数据一致性，系统实现了以下机制:

1. **原子写入**: 所有文件写入操作都是原子性的，使用临时文件写入然后重命名的方式
2. **事务支持**: 涉及多个文件的更改采用简单的事务机制，确保要么全部成功，要么全部失败
3. **版本标记**: 每个数据文件都包含版本标记，以便在格式变更时能够兼容处理旧数据
