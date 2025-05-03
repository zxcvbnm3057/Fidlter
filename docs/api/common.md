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
