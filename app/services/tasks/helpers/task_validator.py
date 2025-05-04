import logging
from typing import Dict, Any, Union, Optional


class TaskValidator:
    """负责任务参数的验证"""

    def __init__(self, task_repository):
        """初始化任务验证器
        
        Args:
            task_repository: 任务仓库实例，用于检查任务名称是否存在
        """
        self.task_repository = task_repository
        self.logger = logging.getLogger("TaskValidator")

    def validate_task_parameters(self, script_path: str, conda_env: str, task_name: Optional[str],
                                 cron_expression: Optional[str], delay_seconds: Optional[int], priority: str,
                                 memory_limit: Optional[int]) -> Dict[str, Any]:
        """验证任务参数
        
        Args:
            script_path: 脚本路径
            conda_env: Conda环境名称
            task_name: 任务名称（可选）
            cron_expression: Cron表达式（可选）
            delay_seconds: 延迟执行的秒数（可选）
            priority: 任务优先级
            memory_limit: 内存限制（MB）
            
        Returns:
            Dict[str, Any]: 验证结果，包含success字段和错误信息（如果有）
        """
        # 检查任务名称是否已存在
        if task_name and self.task_repository.get_task_by_name(task_name):
            return {
                "success": False,
                "error": f"Task with name '{task_name}' already exists",
                "message": "Task with this name already exists"
            }

        # 验证调度参数
        if cron_expression and delay_seconds:
            return {
                "success": False,
                "error": "Cannot specify both cron_expression and delay_seconds",
                "message": "Please specify either cron expression or delay seconds, not both"
            }

        # 验证优先级参数
        if priority not in ["high", "normal", "low"]:
            return {
                "success": False,
                "error": f"Invalid priority value: {priority}",
                "message": "Priority must be one of: high, normal, low"
            }

        # 验证内存限制参数
        if memory_limit is not None:
            try:
                memory_limit = int(memory_limit)
                if memory_limit <= 0:
                    return {
                        "success": False,
                        "error": "Memory limit must be a positive integer",
                        "message": "Please provide a valid memory limit value"
                    }
            except ValueError:
                return {
                    "success": False,
                    "error": "Invalid memory limit value",
                    "message": "Memory limit must be a valid number"
                }

        # 验证脚本路径
        if not script_path or not isinstance(script_path, str):
            return {
                "success": False,
                "error": "Script path is required",
                "message": "Please provide a valid script path"
            }

        # 验证Conda环境
        if not conda_env or not isinstance(conda_env, str):
            return {
                "success": False,
                "error": "Conda environment name is required",
                "message": "Please provide a valid Conda environment name"
            }

        return {"success": True}
