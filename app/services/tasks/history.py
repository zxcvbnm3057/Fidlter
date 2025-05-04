import threading
import logging
from datetime import datetime, timedelta

from ...utils.persistence import DataPersistence


class TaskHistory:
    """负责管理任务执行历史记录"""

    def __init__(self):
        self.task_history = {}  # 存储任务的历史执行记录 {task_id: [execution_records]}
        self.lock = threading.Lock()
        self.logger = logging.getLogger("TaskHistory")
        self.persistence = DataPersistence()

        # 从持久化存储加载历史记录
        self._load_from_persistence()

    def _load_from_persistence(self):
        """从持久化存储加载历史记录"""
        try:
            all_histories = self.persistence.load_all_task_histories()
            if all_histories:
                with self.lock:
                    self.task_history = all_histories
                self.logger.info(f"从持久化存储加载了 {len(all_histories)} 条任务历史记录")
        except Exception as e:
            self.logger.error(f"从持久化存储加载任务历史记录失败: {str(e)}")

    def _save_to_persistence(self, task_id):
        """将特定任务的历史记录保存到持久化存储"""
        try:
            with self.lock:
                if task_id in self.task_history:
                    history_data = self.task_history[task_id]
                    result = self.persistence.save_task_history(task_id, history_data)
                    if result:
                        self.logger.debug(f"任务 {task_id} 的历史记录保存成功")
                    else:
                        self.logger.warning(f"任务 {task_id} 的历史记录保存失败")
        except Exception as e:
            self.logger.error(f"保存任务 {task_id} 的历史记录时出错: {str(e)}")

    def add_execution_record(self, task_id, execution_record):
        """添加一条执行记录"""
        with self.lock:
            if task_id not in self.task_history:
                self.task_history[task_id] = []
            self.task_history[task_id].append(execution_record)

        # 保存到持久化存储
        self._save_to_persistence(task_id)

    def update_execution_record(self, task_id, execution_id, updates):
        """更新执行记录的特定字段"""
        updated = False
        with self.lock:
            if task_id in self.task_history:
                for record in self.task_history[task_id]:
                    if record.get('execution_id') == execution_id:
                        record.update(updates)
                        updated = True
                        break

        # 如果成功更新了记录，保存到持久化存储
        if updated:
            self._save_to_persistence(task_id)

    def get_execution_record(self, task_id, execution_id):
        """获取特定执行记录"""
        with self.lock:
            if task_id in self.task_history:
                for record in self.task_history[task_id]:
                    if record.get('execution_id') == execution_id:
                        return record
        return None

    def append_to_execution_log(self, task_id, execution_id, log_line):
        """向执行记录的日志中添加行"""
        updated = False
        with self.lock:
            record = self.get_execution_record(task_id, execution_id)
            if record:
                record['logs'] += log_line
                updated = True

        # 日志内容更新较频繁，可以选择性地减少写入频率
        # 这里采用日志大小达到一定程度才写入的策略
        if updated and log_line and len(log_line) > 100:  # 日志行比较长时才写入
            self._save_to_persistence(task_id)

    def clean_old_records(self):
        """清理超过一个月的任务执行记录"""
        one_month_ago = datetime.now() - timedelta(days=30)

        updated_task_ids = []
        with self.lock:
            for task_id in list(self.task_history.keys()):
                original_length = len(self.task_history[task_id])
                self.task_history[task_id] = [
                    execution for execution in self.task_history[task_id]
                    if datetime.strptime(execution['start_time'], '%Y-%m-%d %H:%M:%S') >= one_month_ago
                ]

                # 如果有记录被清理，记录下任务ID
                if len(self.task_history[task_id]) < original_length:
                    updated_task_ids.append(task_id)

        # 保存已更新的任务历史记录
        for task_id in updated_task_ids:
            self._save_to_persistence(task_id)

        if updated_task_ids:
            self.logger.info(f"清理了 {len(updated_task_ids)} 个任务的旧记录")

    def get_task_history(self):
        """获取最近一个月的任务执行历史记录
        
        返回所有任务的执行历史记录，已按照最近一个月进行过滤
        """
        # 先清理旧记录，确保只返回最近一个月的数据
        self.clean_old_records()

        history_records = []
        with self.lock:
            # 遍历所有任务的历史记录
            for task_id, executions in self.task_history.items():
                # 查找对应的任务信息（这里需要从外部获取task信息）
                task_name = f"Task-{task_id}"  # 默认名称，实际应从task获取

                # 使用提供的任务名称获取函数（如果已设置）
                if hasattr(self, 'get_task_name'):
                    name = self.get_task_name(task_id)
                    if name:
                        task_name = name

                # 添加每次执行的记录
                for execution in executions:
                    history_record = {
                        'task_id': task_id,
                        'task_name': task_name,
                        'status': execution.get('status', 'unknown'),
                        'execution_time': execution.get('start_time'),
                        'duration': execution.get('duration'),
                        'peak_memory': execution.get('peak_memory'),
                        'avg_memory': execution.get('avg_memory'),
                        'exit_code': execution.get('exit_code'),
                        'execution_id': execution.get('execution_id')
                    }
                    history_records.append(history_record)

            # 按执行时间降序排序，最近的记录在前
            history_records.sort(key=lambda x: x.get('execution_time', ''), reverse=True)

        return history_records

    def set_task_name_provider(self, provider_func):
        """设置任务名称提供函数，用于获取任务名称
        
        参数:
            provider_func: 函数，接受task_id参数，返回任务名称
        """
        self.get_task_name = provider_func

    def get_execution_logs(self, task_id, execution_id):
        """获取特定执行记录的日志内容
        
        此方法专门用于实时日志查询，只返回日志内容而不是整个执行记录
        
        参数:
            task_id: 任务ID
            execution_id: 执行ID
            
        返回:
            日志内容字符串，如果找不到记录则返回None
        """
        with self.lock:
            record = self.get_execution_record(task_id, execution_id)
            if record and 'logs' in record:
                return record.get('logs')
        return None
