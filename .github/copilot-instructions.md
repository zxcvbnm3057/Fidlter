# Conda Task Manager 开发指南

我使用pnpm管理前端依赖，conda管理后端依赖

对于功能性改动，你需要先编辑docs下的文档整理接口变化，然后再文档变化调整代码

## 项目架构

本项目采用前后端分离架构:
- 前端: React + Redux + Redux-Saga + CoreUI
- 后端: Python + Flask + 服务层架构

## 后端开发模式

### 分层架构
后端采用清晰的分层架构:

1. **路由层 (Routes)**: 
   - 位于 `/app/api/routes/` 目录
   - 负责接收HTTP请求并返回响应
   - 不包含业务逻辑，只负责参数验证和结果格式化
   - 调用服务层的方法处理业务逻辑

2. **服务层 (Services)**:
   - 位于 `/app/services/` 目录
   - 包含所有业务逻辑
   - 采用组合模式，将复杂功能拆分为多个专门的管理器类
   - 顶层管理器类(如`CondaManager`)组合多个子管理器(如`EnvironmentManager`, `PackageManager`, `StatsManager`)

3. **工具层 (Utils)**:
   - 位于 `/app/utils/` 目录
   - 提供通用工具函数和辅助类

### API响应规范

所有API响应遵循以下规范:

1. **成功响应**:
   - 服务层返回: `{"success": true, "output": 实际数据}`
   - 路由层返回: 直接返回`output`内容或格式化为API文档规定的格式

2. **错误响应**:
   - 服务层返回: `{"success": false, "error": "错误详情", "message": "错误概述"}`
   - 路由层返回: 根据错误类型设置合适的HTTP状态码，并格式化错误信息

### 服务层实现规范

1. 每个管理器类都有明确的职责，如`EnvironmentManager`负责环境管理，`PackageManager`负责包管理
2. 管理器类之间通过组合而非继承关系组织
3. 每个方法都要包含清晰的文档字符串，说明参数和返回值
4. 错误处理采用返回错误对象的方式，而不是抛出异常
5. 日志记录使用标准logging模块，记录关键操作和错误信息

## 前端开发模式

### 分层架构

1. **视图层**:
   - 组件(Components): 位于`/src/components/`目录
   - 页面(Pages): 位于`/src/pages/`目录
   - 布局(Layouts): 位于`/src/layouts/`目录

2. **状态管理**:
   - Redux Store: 位于`/src/redux/store.js`
   - Reducers: 按功能模块划分，位于`/src/redux/[模块名]/reducer.js`
   - Actions: 与reducer放在同一目录，或集成在reducer文件中
   - Sagas: 处理异步操作，位于`/src/redux/[模块名]/sagas.js`

3. **服务层**:
   - API服务: 位于`/src/services/`目录，如`condaService.js`
   - 负责与后端API交互，处理请求和响应

4. **工具层**:
   - 通用工具: 位于`/src/utils/`目录
   - 自定义Hooks: 位于`/src/hooks/`目录

### 组件开发规范

1. 使用函数组件和React Hooks
2. 大型组件拆分为小型子组件，放在专门的子目录中
3. 使用Redux管理全局状态，组件内部状态使用useState
4. 使用自定义Hooks封装通用逻辑
5. 组件props需要明确类型和默认值

### 状态管理规范

1. Redux使用切片模式(Slice Pattern)组织状态
2. 异步操作通过Redux-Saga处理
3. Saga负责API调用、错误处理和复杂的异步流程
4. Redux状态按功能模块划分，避免状态过于复杂

### API交互规范

1. 所有API请求通过服务层进行
2. 使用Axios作为HTTP客户端
3. API基地址和通用配置在`/src/utils/axios.js`中设置
4. 请求错误在服务层或Saga中统一处理

## 文档规范

1. API文档位于`/docs/api/`目录
2. 每个接口必须包含:
   - URL和HTTP方法
   - 请求参数说明
   - 响应格式和字段说明
   - 可能的错误情况和对应的响应
   - 示例代码(可选)

3. 代码修改必须先更新相应的API文档，再根据文档实现功能

## 开发流程

1. 分析需求，明确接口设计
2. 更新API文档，明确接口规范
3. 实现后端服务层逻辑
4. 实现后端路由层
5. 实现前端服务层与后端交互
6. 实现前端Redux状态管理
7. 实现前端UI组件
8. 编写测试和文档

## 项目规范示例

### 后端服务层示例

```python
class SomeManager:
    """负责某项功能的管理"""
    
    def __init__(self, dependency=None):
        self.dependency = dependency
        self.logger = logging.getLogger("SomeManager")
    
    def some_operation(self, param):
        """执行某项操作
        
        Args:
            param: 操作参数
            
        Returns:
            dict: 包含success和output/error字段的结果字典
        """
        try:
            # 执行业务逻辑
            result = self._process(param)
            return {"success": True, "output": result}
        except Exception as e:
            self.logger.error(f"Operation failed: {str(e)}")
            return {
                "success": False, 
                "error": str(e),
                "message": "Operation failed"
            }
```

### 后端路由层示例

```python
@some_routes.route('/resource', methods=['GET'])
def get_resource():
    """获取某项资源"""
    try:
        result = some_manager.get_resource()
        if result.get("success", False):
            return jsonify(result.get("output", {}))
        else:
            return jsonify({
                "message": result.get("message", "Failed to get resource"),
                "error": result.get("error", "Unknown error")
            }), 500
    except Exception as e:
        return jsonify({"message": "Failed to get resource", "error": str(e)}), 500
```

### 前端Redux+Saga示例

```javascript
// 定义Actions
export const fetchDataRequest = createAction('FETCH_DATA_REQUEST');
export const fetchDataSuccess = createAction('FETCH_DATA_SUCCESS');
export const fetchDataFailure = createAction('FETCH_DATA_FAILURE');

// Reducer
const initialState = {
  data: [],
  loading: false,
  error: null
};

export default createReducer(initialState, {
  [fetchDataRequest]: (state) => {
    state.loading = true;
    state.error = null;
  },
  [fetchDataSuccess]: (state, action) => {
    state.loading = false;
    state.data = action.payload;
  },
  [fetchDataFailure]: (state, action) => {
    state.loading = false;
    state.error = action.payload;
  }
});

// Saga
function* fetchDataSaga(action) {
  try {
    const data = yield call(apiService.fetchData, action.payload);
    yield put(fetchDataSuccess(data));
  } catch (error) {
    yield put(fetchDataFailure(error.message));
  }
}
```

### 前端组件示例

```jsx
const SomeComponent = ({ data, loading, error, onFetch }) => {
  useEffect(() => {
    onFetch();
  }, [onFetch]);

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <Alert color="danger">{error}</Alert>;
  }

  return (
    <div>
      {data.map(item => (
        <Card key={item.id}>
          <CardBody>
            <CardTitle>{item.title}</CardTitle>
            <CardText>{item.description}</CardText>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};
```
