import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Union, Optional
from croniter import croniter


class ScheduleCalculator:
    """负责计算任务的调度时间"""

    def __init__(self):
        self.logger = logging.getLogger("ScheduleCalculator")

    def calculate_next_run_time(self,
                                cron_expression: Optional[str] = None,
                                delay_seconds: Optional[int] = None) -> Union[datetime, Dict[str, Any]]:
        """计算下一次运行时间
        
        Args:
            cron_expression: Cron表达式（可选）
            delay_seconds: 延迟执行的秒数（可选）
            
        Returns:
            Union[datetime, Dict[str, Any]]: 成功时返回下一次运行时间，失败时返回错误信息
        """
        if cron_expression:
            return self._calculate_from_cron(cron_expression)
        elif delay_seconds is not None:
            return self._calculate_from_delay(delay_seconds)
        else:
            # 如果既没有提供cron表达式也没有提供延迟时间，则立即执行
            return datetime.now()

    def _calculate_from_cron(self, cron_expression: str) -> Union[datetime, Dict[str, Any]]:
        """从cron表达式计算下一次运行时间
        
        Args:
            cron_expression: Cron表达式
            
        Returns:
            Union[datetime, Dict[str, Any]]: 成功时返回下一次运行时间，失败时返回错误信息
        """
        try:
            iter = croniter(cron_expression, datetime.now())
            return iter.get_next(datetime)
        except Exception as e:
            self.logger.error(f"Invalid cron expression: {cron_expression}, error: {str(e)}")
            return {
                "success": False,
                "error": f"Invalid cron expression: {str(e)}",
                "message": "The provided cron expression is invalid"
            }

    def _calculate_from_delay(self, delay_seconds: int) -> Union[datetime, Dict[str, Any]]:
        """从延迟秒数计算下一次运行时间
        
        Args:
            delay_seconds: 延迟执行的秒数
            
        Returns:
            Union[datetime, Dict[str, Any]]: 成功时返回下一次运行时间，失败时返回错误信息
        """
        try:
            delay_sec = int(delay_seconds)
            if delay_sec < 0:
                return {
                    "success": False,
                    "error": "Delay seconds must be non-negative",
                    "message": "Please provide a non-negative delay value"
                }
            return datetime.now() + timedelta(seconds=delay_sec)
        except ValueError:
            self.logger.error(f"Invalid delay seconds value: {delay_seconds}")
            return {
                "success": False,
                "error": "Invalid delay seconds value",
                "message": "Delay seconds must be a valid number"
            }

    def recalculate_next_run_time(self, cron_expression: str) -> Optional[str]:
        """重新计算任务的下一次运行时间
        
        Args:
            cron_expression: Cron表达式
            
        Returns:
            Optional[str]: 格式化的下一次运行时间，失败时返回None
        """
        result = self._calculate_from_cron(cron_expression)
        if isinstance(result, datetime):
            return result.strftime('%Y-%m-%d %H:%M:%S')
        return None
