from datetime import datetime, timedelta
import random
import logging

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False


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
        self.logger = logging.getLogger("TaskStats")

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

        # 添加系统资源使用情况数据
        system_resources = self._get_system_resources()

        # 添加任务成功率分布数据
        task_success_rate = self._get_task_success_rate()

        # 添加即将执行的任务列表
        upcoming_tasks = self._get_upcoming_tasks(10)

        # 合并所有统计结果 - 移除了未使用的未来7天任务预测数据
        stats = {
            **basic_stats,
            **execution_stats,
            **recent_stats, "recent_tasks": recent_tasks,
            "system_resources": system_resources,
            "task_success_rate": task_success_rate,
            "upcoming_tasks": upcoming_tasks
        }

        return stats

    def _get_basic_stats(self):
        """获取任务基本统计数据"""
        stats = {
            'total': len(self.scheduler.repository.tasks),
            'scheduled': 0,
            'running': 0,
            'completed': 0,
            'failed': 0,
            'paused': 0,
            'disabled_count': 0
        }

        for task in self.scheduler.repository.tasks:
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
            task = next((t for t in self.scheduler.repository.tasks if t.get('task_id') == task_id), None)
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

    def _get_system_resources(self):
        """
        获取系统资源使用情况统计数据
        返回过去24小时内每小时的系统内存使用情况(MB)和任务执行数

        Returns:
            dict: 包含时间戳、内存使用量(MB)、系统总内存(MB)和任务数量的字典
                  如果无法获取系统资源数据，则返回None
        """
        try:
            if not HAS_PSUTIL:
                self.logger.warning("psutil库不可用，无法获取系统资源使用情况")
                return None

            # 获取当前时间并取整到小时
            now = datetime.now()
            current_hour = now.replace(minute=0, second=0, microsecond=0)

            # 生成过去24小时的时间点列表
            timestamps = []
            for i in range(23, -1, -1):
                hour_time = current_hour - timedelta(hours=i)
                timestamps.append(hour_time.strftime('%Y-%m-%d %H:00:00'))

            # 获取当前系统内存信息
            memory = psutil.virtual_memory()
            total_memory_mb = memory.total // (1024 * 1024)  # 转换为MB

            # 计算每小时的内存使用情况和任务执行数
            memory_usage = []
            task_counts = []
            has_data = False

            for hour_str in timestamps:
                hour_start = datetime.strptime(hour_str, '%Y-%m-%d %H:00:00')
                hour_end = hour_start + timedelta(hours=1)

                # 获取这个小时内执行的任务数量
                task_count = self._count_tasks_for_hour(hour_start, hour_end)
                task_counts.append(task_count)

                # 从任务执行记录中获取这个小时的内存使用情况
                hour_memory = self._get_memory_usage_for_hour(hour_start, hour_end)

                if hour_memory is not None:
                    memory_usage.append(hour_memory)
                    has_data = True
                else:
                    # 如果没有这个小时的内存数据，则添加None表示数据缺失
                    memory_usage.append(None)

            # 如果24小时内都没有内存使用数据，则返回None
            if not has_data:
                self.logger.info("过去24小时内没有可用的内存使用数据")
                return None

            return {
                'timestamps': timestamps,
                'memory_usage': memory_usage,
                'total_memory': total_memory_mb,
                'task_counts': task_counts
            }
        except Exception as e:
            self.logger.error(f"获取系统资源使用情况失败: {str(e)}")
            return None

    def _count_tasks_for_hour(self, hour_start, hour_end):
        """统计指定小时内执行的任务数量
        
        Args:
            hour_start: 小时开始时间，datetime对象
            hour_end: 小时结束时间，datetime对象
            
        Returns:
            int: 该小时内执行的任务数量
        """
        count = 0

        for task_id, executions in self.history.task_history.items():
            for execution in executions:
                start_time_str = execution.get('start_time')
                if not start_time_str:
                    continue

                try:
                    start_time = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S')
                    if hour_start <= start_time < hour_end:
                        count += 1
                except (ValueError, TypeError):
                    continue

        return count

    def _get_memory_usage_for_hour(self, hour_start, hour_end):
        """获取指定小时内的内存使用情况，考虑同时执行的多个任务
        
        计算方法：
        1. 收集该小时内所有任务在每个时间点的内存使用记录
        2. 对于同一时间点的多个任务，累加其内存使用量
        3. 计算该小时内的平均内存使用量
        
        Args:
            hour_start: 小时开始时间，datetime对象
            hour_end: 小时结束时间，datetime对象
            
        Returns:
            float: 该小时内的平均内存使用量(MB)，如果没有数据则返回None
        """
        # 查找这个小时内有执行记录的任务
        memory_samples = []

        for task_id, executions in self.history.task_history.items():
            for execution in executions:
                start_time_str = execution.get('start_time')
                end_time_str = execution.get('end_time')

                if not start_time_str:
                    continue

                try:
                    start_time = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S')

                    # 确定结束时间
                    if end_time_str:
                        end_time = datetime.strptime(end_time_str, '%Y-%m-%d %H:%M:%S')
                    else:
                        # 如果任务尚未完成，使用当前时间作为结束时间
                        end_time = datetime.now()

                    # 检查任务的执行时间是否与目标小时有重叠
                    if (start_time < hour_end and end_time > hour_start):
                        # 获取内存使用记录
                        memory_usage = execution.get('memory_usage', [])

                        # 如果有内存使用记录，为这个小时添加数据点
                        if memory_usage:
                            # 我们可以假设内存样本是均匀分布的
                            # 计算每个样本的时间点（近似）
                            duration = (end_time - start_time).total_seconds()
                            if duration > 0 and len(memory_usage) > 0:
                                time_per_sample = duration / len(memory_usage)

                                # 筛选出属于这个小时的内存样本
                                for i, memory_mb in enumerate(memory_usage):
                                    sample_time = start_time + timedelta(seconds=i * time_per_sample)
                                    if hour_start <= sample_time < hour_end:
                                        memory_samples.append(memory_mb)
                except (ValueError, TypeError):
                    continue

        # 如果有内存样本，计算平均值
        if memory_samples:
            return sum(memory_samples) / len(memory_samples)

        # 如果没有数据，返回None
        return None

    def _get_task_success_rate(self):
        """
        计算任务成功率分布
        返回成功、失败、取消和异常终止的任务数量
        """
        success_count = 0
        failed_count = 0
        cancelled_count = 0
        abnormal_count = 0

        # 遍历所有任务历史记录
        for task_id, executions in self.history.task_history.items():
            for execution in executions:
                status = execution.get('status', '')
                if status == 'completed':
                    success_count += 1
                elif status == 'failed':
                    failed_count += 1
                elif status == 'stopped':
                    cancelled_count += 1
                elif status in ['crashed', 'killed', 'timeout']:
                    abnormal_count += 1

        return {
            'success': success_count,
            'failed': failed_count,
            'cancelled': cancelled_count,
            'abnormal': abnormal_count
        }

    def _get_upcoming_tasks(self, limit=10):
        """
        获取即将执行的任务列表
        返回按照执行时间排序的前N条任务
        """
        upcoming = []

        # 获取所有状态为scheduled的任务
        scheduled_tasks = [t for t in self.scheduler.repository.tasks if t.get('status') == 'scheduled']

        # 按下一次执行时间排序
        sorted_tasks = sorted(scheduled_tasks,
                              key=lambda x: x.get('next_run_time', datetime.max.strftime('%Y-%m-%d %H:%M:%S')))

        # 提取需要的信息
        for task in sorted_tasks[:limit]:
            script_path = task.get('script_path', '')
            command = script_path
            if script_path.endswith('.py'):
                command = f"python {script_path}"
            elif script_path.endswith('.sh'):
                command = f"bash {script_path}"

            upcoming.append({
                'task_id': task.get('task_id'),
                'task_name': task.get('task_name', f"Task-{task.get('task_id')}"),
                'conda_env': task.get('conda_env'),
                'command': command,
                'scheduled_time': task.get('next_run_time'),
                'cron_expression': task.get('cron_expression')
            })

        return upcoming
