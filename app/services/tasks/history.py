import threading
from datetime import datetime, timedelta


class TaskHistory:
    """负责管理任务执行历史记录"""

    def __init__(self):
        self.task_history = {}  # 存储任务的历史执行记录 {task_id: [execution_records]}
        self.lock = threading.Lock()

    def add_execution_record(self, task_id, execution_record):
        """添加一条执行记录"""
        with self.lock:
            if task_id not in self.task_history:
                self.task_history[task_id] = []
            self.task_history[task_id].append(execution_record)

    def update_execution_record(self, task_id, execution_id, updates):
        """更新执行记录的特定字段"""
        with self.lock:
            if task_id in self.task_history:
                for record in self.task_history[task_id]:
                    if record.get('execution_id') == execution_id:
                        record.update(updates)
                        break

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
        with self.lock:
            record = self.get_execution_record(task_id, execution_id)
            if record:
                record['logs'] += log_line

    def clean_old_records(self):
        """清理超过一个月的任务执行记录"""
        one_month_ago = datetime.now() - timedelta(days=30)
        with self.lock:
            for task_id in self.task_history:
                self.task_history[task_id] = [
                    execution for execution in self.task_history[task_id]
                    if datetime.strptime(execution['start_time'], '%Y-%m-%d %H:%M:%S') >= one_month_ago
                ]

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
