import traceback
from app.services.tasks.file_manager import TaskFileManager


class TaskOperationManager:
    """
    任务操作管理器 - 负责处理任务的创建、更新和脚本更新等操作
    """

    def __init__(self, task_scheduler):
        """
        初始化任务操作管理器
        
        Args:
            task_scheduler: 任务调度器实例
        """
        self.task_scheduler = task_scheduler
        self.file_manager = TaskFileManager()

    def validate_task_params(self, script_file, conda_env, cron_expression, delay_seconds):
        """
        验证任务参数的有效性
        
        Args:
            script_file: 脚本文件对象
            conda_env: Conda环境名称
            cron_expression: Cron表达式
            delay_seconds: 延迟执行秒数
            
        Returns:
            dict: 如果验证失败，返回错误信息；否则返回None
        """
        if not script_file:
            return {"success": False, "message": "Script file is required"}

        if not conda_env:
            return {"success": False, "message": "Environment name is required"}

        # 验证cron表达式和delay_seconds不能同时提供
        if cron_expression and delay_seconds is not None:
            return {
                "success": False,
                "message": "Please specify either cron expression or delay seconds, not both",
                "error": "Cannot specify both cron_expression and delay_seconds"
            }

        return None

    def create_task(self,
                    script_file,
                    conda_env,
                    task_name,
                    requirements=None,
                    reuse_env=False,
                    cron_expression=None,
                    delay_seconds=None,
                    priority="normal",
                    memory_limit=None,
                    command=None):
        """
        创建新任务，处理文件上传和任务调度
        
        Args:
            script_file: 上传的脚本文件对象
            conda_env: Conda环境名称
            task_name: 任务名称
            requirements: 环境依赖要求
            reuse_env: 是否复用环境
            cron_expression: Cron表达式
            delay_seconds: 延迟执行秒数
            priority: 任务优先级
            memory_limit: 内存限制
            command: 自定义启动命令
            
        Returns:
            dict: 包含success和output/error字段的结果字典
        """
        try:
            # 验证参数
            validation_error = self.validate_task_params(script_file, conda_env, cron_expression, delay_seconds)
            if validation_error:
                return validation_error

            # 处理文件
            filename = script_file.filename
            script_path = None

            if filename.endswith('.zip'):
                # 处理ZIP包
                file_content = script_file.read()
                result = self.file_manager.process_zip_file(file_content, command=command)
                if not result.get('success', False):
                    return result

                script_path = result['output']['script_path']
                command = result['output']['command']
                temp_result = result['output']['temp_result']
            else:
                # 处理单个脚本文件
                file_content = script_file.read()
                result = self.file_manager.process_script_file(file_content, filename)
                if not result.get('success', False):
                    return result

                script_path = result['output']['script_path']
                temp_result = None

            # 创建任务
            task_result = self.task_scheduler.schedule_task(script_path=script_path,
                                                            conda_env=conda_env,
                                                            task_name=task_name,
                                                            requirements=requirements,
                                                            reuse_env=reuse_env,
                                                            cron_expression=cron_expression,
                                                            delay_seconds=delay_seconds,
                                                            priority=priority,
                                                            memory_limit=memory_limit,
                                                            command=command)

            if task_result.get('success', False):
                # 如果任务创建成功，将临时文件移动到任务目录中
                task_id = task_result['task'].get('task_id')
                if task_id:
                    # 移动文件到任务目录
                    move_result = self.file_manager.move_temp_files_to_task_dir(task_id, script_path, filename,
                                                                                filename.endswith('.zip'), temp_result)

                    if move_result.get('success', False):
                        # 更新任务中的脚本路径
                        new_script_path = move_result['output']['script_path']
                        self.task_scheduler.scheduler.repository.update_task(task_id, {'script_path': new_script_path})
                        task_result['task']['script_path'] = new_script_path

                return task_result
            else:
                # 如果任务创建失败，清理临时文件
                self.file_manager.cleanup_temp_files(script_path)
                return task_result
        except Exception as e:
            return {
                "success": False,
                "message": "An error occurred while processing your request",
                "error": str(e),
                "traceback": traceback.format_exc()
            }

    def update_task_script(self, task_id, script_file, force_update=False, command=None):
        """
        更新任务脚本文件
        
        Args:
            task_id: 任务ID
            script_file: 上传的脚本文件对象
            force_update: 是否强制更新（停止运行中的任务）
            command: 自定义启动命令
            
        Returns:
            dict: 包含success和output/error字段的结果字典
        """
        try:
            # 检查任务是否存在
            task_status = self.task_scheduler.get_task_status(task_id)
            if not task_status.get('success', False):
                return {"success": False, "message": f"Task with ID {task_id} not found"}

            task = task_status.get('task', {})

            # 验证任务状态
            if task.get('status') in ['running', 'scheduled'] and not force_update:
                return {
                    "success": False,
                    "message": "Task script cannot be updated",
                    "error":
                    f"Cannot update a task with status: '{task.get('status')}'. Use force=true to stop and update.",
                    "current_status": task.get('status')
                }

            # 如果任务正在运行且指定了强制更新，先停止任务
            if task.get('status') in ['running', 'scheduled'] and force_update:
                stop_result = self.task_scheduler.stop_task(task_id)
                if not stop_result.get('success', False):
                    return {
                        "success": False,
                        "message": "Failed to stop running task for update",
                        "error": stop_result.get('error', "Unknown error stopping task"),
                        "current_status": task.get('status')
                    }

                # 更新任务状态以反映停止操作
                task = self.task_scheduler.get_task_status(task_id).get('task', {})

            # 处理文件
            filename = script_file.filename
            updated_files = []

            if filename.endswith('.zip'):
                # 处理ZIP包
                file_content = script_file.read()

                # 如果是ZIP文件且没有提供命令，保留原有命令或设置默认命令
                if not command and task.get('command'):
                    command = task.get('command')
                elif not command:
                    command = "python main.py"  # 默认命令

                # 解压ZIP文件到任务目录
                result = self.file_manager.process_zip_file(file_content, task_id)
                if not result.get('success', False):
                    return result

                # 收集更新的文件名
                updated_files = [os.path.basename(f) for f in result['output'].get('saved_files', [])]

                # 使用ZIP包解压目录作为脚本路径
                script_dir = result['output']['script_path']

                # 更新任务的脚本路径和命令
                updates = {'script_path': script_dir, 'command': command}
            else:
                # 处理单个脚本文件
                file_content = script_file.read()
                result = self.file_manager.process_script_file(file_content, filename, task_id)
                if not result.get('success', False):
                    return result

                # 收集更新的文件名
                updated_files = [os.path.basename(result['output']['script_path'])]

                # 更新任务的脚本路径
                updates = {'script_path': result['output']['script_path']}

                # 清除任何现有的自定义命令，因为单文件不需要自定义命令
                if task.get('command'):
                    updates['command'] = None

            # 更新任务配置
            self.task_scheduler.scheduler.repository.update_task(task_id, updates)

            # 获取更新后的任务信息
            updated_task = self.task_scheduler.get_task_status(task_id).get('task', {})

            # 构建响应信息，包括是否自动停止了任务
            message = "Task script updated successfully"
            if force_update and task.get('status') in ['running', 'scheduled']:
                message += " (Task was automatically stopped)"

            return {
                "success": True,
                "message": message,
                "task": {
                    "task_id": updated_task.get('task_id'),
                    "task_name": updated_task.get('task_name'),
                    "script_path": updated_task.get('script_path'),
                    "command": updated_task.get('command'),
                    "status": updated_task.get('status'),
                    "previous_status": task.get('status') if force_update else None
                },
                "updated_files": updated_files,
                "force_applied": force_update and task.get('status') in ['running', 'scheduled']
            }
        except Exception as e:
            return {
                "success": False,
                "message": "Failed to update task script",
                "error": str(e),
                "traceback": traceback.format_exc()
            }
