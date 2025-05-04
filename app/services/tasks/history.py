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
            # 在锁外执行I/O操作
            all_histories = self.persistence.load_all_task_histories()

            # 只在更新共享数据时持有锁
            if all_histories:
                with self.lock:
                    self.task_history = all_histories
                self.logger.info(f"从持久化存储加载了 {len(all_histories)} 条任务历史记录")
        except Exception as e:
            self.logger.error(f"从持久化存储加载任务历史记录失败: {str(e)}")

    def _save_to_persistence(self, task_id):
        """将特定任务的历史记录保存到持久化存储"""
        try:
            # 在锁内复制数据，在锁外执行I/O操作
            history_data = None

            with self.lock:
                if task_id in self.task_history:
                    # 创建深拷贝以避免在I/O操作期间发生变化
                    history_data = [record.copy() for record in self.task_history[task_id]]

            # 锁外执行可能耗时的操作
            if history_data is not None:
                result = self.persistence.save_task_history(task_id, history_data)
                if result:
                    self.logger.debug(f"任务 {task_id} 的历史记录保存成功")
                else:
                    self.logger.warning(f"任务 {task_id} 的历史记录保存失败")
        except Exception as e:
            self.logger.error(f"保存任务 {task_id} 的历史记录时出错: {str(e)}")

    def add_execution_record(self, task_id, execution_record):
        """添加一条执行记录"""
        # 创建执行记录的副本以确保线程安全
        record_copy = execution_record.copy()

        # 确保记录中包含logs、stdout和stderr字段
        if 'logs' not in record_copy:
            record_copy['logs'] = ''
        if 'stdout' not in record_copy:
            record_copy['stdout'] = ''
        if 'stderr' not in record_copy:
            record_copy['stderr'] = ''

        with self.lock:
            if task_id not in self.task_history:
                self.task_history[task_id] = []
            self.task_history[task_id].append(record_copy)

        # 保存到持久化存储（锁外执行）
        self._save_to_persistence(task_id)

    def update_execution_record(self, task_id, execution_id, updates):
        """更新执行记录的特定字段"""
        updated = False

        # 创建更新字段的副本
        updates_copy = updates.copy()

        with self.lock:
            if task_id in self.task_history:
                for record in self.task_history[task_id]:
                    if record.get('execution_id') == execution_id:
                        record.update(updates_copy)
                        updated = True
                        break

        # 如果成功更新了记录，保存到持久化存储（锁外执行）
        if updated:
            self._save_to_persistence(task_id)

    def get_execution_record(self, task_id, execution_id):
        """获取特定执行记录"""
        with self.lock:
            if task_id in self.task_history:
                for record in self.task_history[task_id]:
                    if record.get('execution_id') == execution_id:
                        # 返回记录的副本以确保线程安全
                        return record.copy()
        return None

    def append_to_execution_log(self, task_id, execution_id, log_line, log_type='logs'):
        """向执行记录的日志中添加行
        
        参数:
            task_id: 任务ID
            execution_id: 执行ID
            log_line: 要添加的日志行
            log_type: 日志类型，可以是'logs'(默认)、'stdout'或'stderr'
        """
        if not log_line:  # 跳过空日志行
            return

        updated = False
        log_line_copy = log_line  # 字符串是不可变的，无需复制

        with self.lock:
            record = None
            if task_id in self.task_history:
                for rec in self.task_history[task_id]:
                    if rec.get('execution_id') == execution_id:
                        record = rec
                        # 确保所有日志字段都存在
                        for field in ['logs', 'stdout', 'stderr']:
                            if field not in record:
                                record[field] = ''

                        # 添加到指定的日志类型
                        record[log_type] += log_line_copy

                        # 如果是stdout或stderr，也添加到综合日志
                        if log_type in ['stdout', 'stderr'] and log_type != 'logs':
                            record['logs'] += log_line_copy

                        updated = True
                        break

        # 日志内容更新较频繁，减少写入操作以提高性能
        # 只有当日志行较长或包含重要内容时才写入
        if updated and (len(log_line) > 100 or "error" in log_line.lower() or "exception" in log_line.lower()
                        or "completed" in log_line.lower()):
            self._save_to_persistence(task_id)

    def clean_old_records(self):
        """清理超过一个月的任务执行记录"""
        one_month_ago = datetime.now() - timedelta(days=30)

        # 需要更新的任务ID列表
        updated_task_ids = []
        task_history_copy = {}

        # 在锁内复制和过滤数据
        with self.lock:
            # 遍历所有任务
            for task_id in list(self.task_history.keys()):
                original_length = len(self.task_history[task_id])

                # 过滤掉一个月前的记录
                filtered_records = [
                    execution for execution in self.task_history[task_id]
                    if datetime.strptime(execution['start_time'], '%Y-%m-%d %H:%M:%S') >= one_month_ago
                ]

                # 如果有记录被清理，记录下任务ID
                if len(filtered_records) < original_length:
                    self.task_history[task_id] = filtered_records
                    updated_task_ids.append(task_id)
                    task_history_copy[task_id] = filtered_records.copy()

        # 锁外保存已更新的任务历史记录
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

        # 在锁内复制数据
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
        
        此方法专门用于实时日志查询，返回日志内容
        
        参数:
            task_id: 任务ID
            execution_id: 执行ID
            
        返回:
            字典，包含logs，如果找不到记录则返回None
        """
        with self.lock:
            if task_id in self.task_history:
                for record in self.task_history[task_id]:
                    if record.get('execution_id') == execution_id:
                        # 确保logs字段存在
                        if 'logs' not in record:
                            record['logs'] = ''

                        return {'logs': record.get('logs', '')}
        return None
