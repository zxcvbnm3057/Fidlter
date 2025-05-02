from datetime import datetime, timedelta


class TaskStats:
    """负责生成任务统计信息"""

    def __init__(self, history_manager, scheduler):
        """初始化统计管理器
        
        参数:
            history_manager: 任务历史记录管理器实例
            scheduler: 任务调度器实例
        """
        self.history = history_manager
        self.scheduler = scheduler

    def get_task_stats(self):
        """
        获取任务统计信息
        返回各种状态任务的数量统计和最近7天的任务统计
        """
        # 获取任务基本统计
        basic_stats = self._get_basic_stats()

        # 计算任务执行时间的统计信息
        execution_stats = self._get_execution_stats()

        # 添加最近7天的任务统计数据
        recent_stats = self._get_recent_stats()

        # 添加最近任务执行情况（前5条）
        recent_tasks = self._get_recent_executions(5)

        # 合并所有统计结果
        stats = {**basic_stats, **execution_stats, **recent_stats, "recent_tasks": recent_tasks}

        return stats

    def _get_basic_stats(self):
        """获取任务基本统计数据"""
        stats = {'total': len(self.scheduler.tasks), 'scheduled': 0, 'running': 0, 'completed': 0, 'failed': 0}

        for task in self.scheduler.tasks:
            status = task.get('status', 'unknown')
            if status in stats:
                stats[status] += 1
            else:
                stats[status] = 1

        return stats

    def _get_execution_stats(self):
        """获取任务执行统计数据"""
        durations = []

        for task_id, history in self.history.task_history.items():
            for execution in history:
                if execution.get('duration') is not None:
                    durations.append(execution.get('duration'))

        stats = {}
        if durations:
            stats['avg_duration'] = sum(durations) / len(durations)
            stats['min_duration'] = min(durations)
            stats['max_duration'] = max(durations)
        else:
            stats['avg_duration'] = 0
            stats['min_duration'] = 0
            stats['max_duration'] = 0

        # 计算成功率
        completed_count = stats.get('completed', 0)
        failed_count = stats.get('failed', 0)
        total_executed = completed_count + failed_count

        if total_executed > 0:
            stats['success_rate'] = (completed_count / total_executed) * 100
        else:
            stats['success_rate'] = 0

        return stats

    def _get_recent_stats(self):
        """获取最近7天的任务统计"""
        today = datetime.now()
        last_7_days = []

        # 计算最近7天的日期
        for i in range(6, -1, -1):  # 从6到0，代表前6天到今天
            day = today - timedelta(days=i)
            day_str = day.strftime('%Y-%m-%d')
            last_7_days.append(day_str)

        # 统计每天的成功和失败任务数
        success_counts = [0] * 7
        failed_counts = [0] * 7

        # 遍历所有任务历史记录
        for task_id, executions in self.history.task_history.items():
            for execution in executions:
                # 获取执行开始时间
                start_time_str = execution.get('start_time')
                if not start_time_str:
                    continue

                try:
                    start_time = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S')
                    start_date = start_time.strftime('%Y-%m-%d')

                    # 如果在最近7天内
                    if start_date in last_7_days:
                        day_index = last_7_days.index(start_date)
                        status = execution.get('status')

                        if status == 'completed':
                            success_counts[day_index] += 1
                        elif status == 'failed':
                            failed_counts[day_index] += 1
                except (ValueError, TypeError):
                    continue

        # 返回统计结果
        return {'last_7_days': {'dates': last_7_days, 'success_counts': success_counts, 'failed_counts': failed_counts}}

    def _get_recent_executions(self, limit=5):
        """获取最近的任务执行记录
        
        参数:
            limit: 返回的记录数量限制
            
        返回:
            最近的任务执行记录列表
        """
        all_executions = []

        # 遍历所有任务的历史记录
        for task_id, executions in self.history.task_history.items():
            task = next((t for t in self.scheduler.tasks if t.get('task_id') == task_id), None)
            if not task:
                continue

            for execution in executions:
                all_executions.append({
                    'task_id': task_id,
                    'name': task.get('task_name', f"Task-{task_id}"),
                    'status': execution.get('status', 'unknown'),
                    'start_time': execution.get('start_time'),
                    'end_time': execution.get('end_time'),
                    'duration': execution.get('duration')
                })

        # 按开始时间排序，取最近的几条
        all_executions.sort(key=lambda x: x.get('start_time', ''), reverse=True)
        return all_executions[:limit]
