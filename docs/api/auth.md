# 认证接口

本文档描述了Conda Task Manager系统的认证相关API接口。

## 用户登录

**请求**:

- 方法: `POST`
- URL: `/api/auth/login`
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

## 创建用户

> 注意：此接口需要管理员权限，通过会话Cookie进行权限验证

**请求**:

- 方法: `POST`
- URL: `/api/auth/create_user`
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

## 退出登录

**请求**:

- 方法: `POST`
- URL: `/api/auth/logout`
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

## 获取当前用户信息

**请求**:

- 方法: `GET`
- URL: `/api/auth/user`
- Cookie: `session=<会话ID>`

**响应**:

- 状态码: 200 (成功)
- 内容:
  ```json
  {
    "user": {
      "username": "用户名",
      "is_admin": true/false
    }
  }
  ```
- 状态码: 401 (未认证)
- 内容:
  ```json
  {
    "message": "Unauthorized"
  }
  ```

## 检查会话是否有效

**请求**:

- 方法: `GET`
- URL: `/api/auth/check`
- Cookie: `session=<会话ID>`

**响应**:

- 状态码: 200 (成功)
- 内容:
  ```json
  {
    "valid": true
  }
  ```
- 状态码: 401 (未认证或会话过期)
- 内容:
  ```json
  {
    "message": "Unauthorized"
  }
  ```
  或
  ```json
  {
    "message": "Session expired"
  }
  ```
