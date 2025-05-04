import threading
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Union

from ...utils.persistence import DataPersistence


class TaskRepository:
    """负责任务的存储和基本操作"""

    def __init__(self):
        self.tasks = []
        self.next_task_id = 1
        self.lock = threading.Lock()
        self.logger = logging.getLogger("TaskRepository")
        self.persistence = DataPersistence()

        # 从持久化存储加载任务
        self._load_from_persistence()

    def _load_from_persistence(self):
        """从持久化存储加载任务配置"""
        try:
            tasks_data = self.persistence.load_tasks_config()
            if tasks_data:
                with self.lock:
                    self.tasks = tasks_data.get("tasks", [])
                    self.next_task_id = tasks_data.get("next_task_id", 1)

                    # 确保next_task_id大于所有现有任务ID
                    if self.tasks:
                        max_id = max(task.get('task_id', 0) for task in self.tasks)
                        self.next_task_id = max(self.next_task_id, max_id + 1)

                self.logger.info(f"从持久化存储加载了 {len(self.tasks)} 个任务")
        except Exception as e:
            self.logger.error(f"从持久化存储加载任务失败: {str(e)}")

    def _save_to_persistence(self):
        """将任务配置保存到持久化存储"""
        try:
            with self.lock:
                tasks_data = {
                    "tasks": self.tasks,
                    "next_task_id": self.next_task_id,
                    "updated_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }
                result = self.persistence.save_tasks_config(tasks_data)
                if result:
                    self.logger.debug("任务配置保存成功")
                else:
                    self.logger.warning("任务配置保存失败")
        except Exception as e:
            self.logger.error(f"保存任务配置时出错: {str(e)}")

    def add_task(self, task: Dict[str, Any]) -> int:
        """添加一个新任务
        
        Args:
            task: 任务数据字典
            
        Returns:
            int: 新任务的ID
        """
        with self.lock:
            # 分配任务ID
            task_id = self.next_task_id
            self.next_task_id += 1

            # 设置任务ID
            task['task_id'] = task_id

            # 如果没有script_path字段，但有script字段，则使用script作为script_path
            if 'script_path' not in task and 'script' in task:
                task['script_path'] = task['script']

            # 如果是Git任务且没有script_path字段，将其设置为None
            if task.get('is_git_task', False) and 'script_path' not in task:
                task['script_path'] = None

            # 添加到任务列表
            self.tasks.append(task)

            # 保存到持久化存储
            self._save_to_persistence()

            return task_id

    def get_task(self, task_id: int) -> Optional[Dict[str, Any]]:
        """根据ID获取任务
        
        Args:
            task_id: 任务ID
            
        Returns:
            Optional[Dict[str, Any]]: 任务字典或None（如果未找到）
        """
        with self.lock:
            for task in self.tasks:
                if task.get('task_id') == task_id:
                    return task.copy()
        return None

    def get_all_tasks(self) -> List[Dict[str, Any]]:
        """获取所有任务
        
        Returns:
            List[Dict[str, Any]]: 所有任务的列表
        """
        with self.lock:
            return [task.copy() for task in self.tasks]

    def update_task(self, task_id: int, updates: Dict[str, Any]) -> bool:
        """更新任务
        
        Args:
            task_id: 任务ID
            updates: 需要更新的字段
            
        Returns:
            bool: 是否成功更新任务
        """
        updated = False
        with self.lock:
            for task in self.tasks:
                if task.get('task_id') == task_id:
                    task.update(updates)
                    updated = True
                    break

        if updated:
            self._save_to_persistence()

        return updated

    def delete_task(self, task_id: int) -> bool:
        """删除任务
        
        Args:
            task_id: 任务ID
            
        Returns:
            bool: 是否成功删除任务
        """
        deleted = False
        with self.lock:
            self.tasks = [task for task in self.tasks if task.get('task_id') != task_id]
            deleted = True

        if deleted:
            self._save_to_persistence()

        return deleted

    def get_tasks_by_status(self, status: str) -> List[Dict[str, Any]]:
        """根据状态获取任务
        
        Args:
            status: 任务状态
            
        Returns:
            List[Dict[str, Any]]: 匹配状态的任务列表
        """
        with self.lock:
            return [task.copy() for task in self.tasks if task.get('status') == status]

    def get_task_by_name(self, task_name: str) -> Optional[Dict[str, Any]]:
        """根据名称获取任务
        
        Args:
            task_name: 任务名称
            
        Returns:
            Optional[Dict[str, Any]]: 任务字典或None（如果未找到）
        """
        with self.lock:
            for task in self.tasks:
                if task.get('task_name') == task_name:
                    return task.copy()
        return None
