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
            # 在锁外执行I/O操作
            tasks_data = self.persistence.load_tasks_config()
            if tasks_data:
                tasks_list = tasks_data.get("tasks", [])
                next_id = tasks_data.get("next_task_id", 1)

                # 计算max_id也放在锁外
                max_id = 0
                if tasks_list:
                    max_id = max(task.get('task_id', 0) for task in tasks_list)

                # 只在更新共享数据时持有锁
                with self.lock:
                    self.tasks = tasks_list
                    self.next_task_id = max(next_id, max_id + 1)

                self.logger.info(f"从持久化存储加载了 {len(self.tasks)} 个任务")
        except Exception as e:
            self.logger.error(f"从持久化存储加载任务失败: {str(e)}")

    def _save_to_persistence(self):
        """将任务配置保存到持久化存储"""
        try:
            # 在锁内复制数据，然后在锁外执行I/O操作
            tasks_copy = None
            next_id_copy = 0

            with self.lock:
                tasks_copy = [task.copy() for task in self.tasks]  # 创建任务列表的深拷贝
                next_id_copy = self.next_task_id

            # 锁外执行可能耗时的操作
            if tasks_copy is not None:
                tasks_data = {
                    "tasks": tasks_copy,
                    "next_task_id": next_id_copy,
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
        # 准备数据，在锁外进行
        task_copy = task.copy()  # 创建任务数据的副本

        # 设置script_path
        if 'script_path' not in task_copy and 'script' in task_copy:
            task_copy['script_path'] = task_copy['script']

        # 如果是Git任务且没有script_path字段，将其设置为None
        if task_copy.get('is_git_task', False) and 'script_path' not in task_copy:
            task_copy['script_path'] = None

        # 获取锁并修改共享数据结构
        task_id = 0
        with self.lock:
            # 分配任务ID
            task_id = self.next_task_id
            self.next_task_id += 1

            # 设置任务ID
            task_copy['task_id'] = task_id

            # 添加到任务列表
            self.tasks.append(task_copy)

        # 锁外执行持久化操作
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
                    # 在锁内创建副本以确保线程安全
                    return task.copy()
        return None

    def _get_task(self, task_id):
        """内部方法：获取任务的引用而非副本（仅在已持有锁时调用）
        
        警告：此方法仅在已经持有锁的上下文中使用，返回原始任务引用而非副本
        """
        for task in self.tasks:
            if task.get('task_id') == task_id:
                return task
        return None

    def get_all_tasks(self) -> List[Dict[str, Any]]:
        """获取所有任务的列表
        
        Returns:
            List[Dict[str, Any]]: 任务字典列表的副本
        """
        with self.lock:
            # 返回整个列表的深拷贝，确保线程安全
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

        # 锁外执行持久化操作
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
            # 计算新的任务列表，避免在持有锁时直接修改
            original_length = len(self.tasks)
            new_tasks = [task for task in self.tasks if task.get('task_id') != task_id]
            deleted = len(new_tasks) < original_length

            # 只有在确实有删除时才更新任务列表
            if deleted:
                self.tasks = new_tasks

        # 锁外执行持久化操作
        if deleted:
            self._save_to_persistence()

        return deleted

    def get_tasks_by_status(self, status: str) -> List[Dict[str, Any]]:
        """获取特定状态的任务列表
        
        Args:
            status: 任务状态
            
        Returns:
            List[Dict[str, Any]]: 符合条件的任务字典列表
        """
        with self.lock:
            # 返回过滤后的列表深拷贝
            return [task.copy() for task in self.tasks if task.get('status') == status]

    def get_task_by_name(self, task_name: str) -> Optional[Dict[str, Any]]:
        """根据任务名称获取任务
        
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
