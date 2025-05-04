import os
import shutil
from app.utils.persistence import DataPersistence


class TaskFileManager:
    """
    任务文件管理器 - 负责处理任务文件的上传、存储和管理
    """

    def __init__(self):
        """初始化任务文件管理器"""
        self.data_persistence = DataPersistence()

    def process_script_file(self, file_content, filename, task_id=None):
        """
        处理上传的脚本文件
        
        Args:
            file_content: 文件内容，可以是bytes或字符串
            filename: 文件名
            task_id: 任务ID，如果有则直接保存到任务目录
            
        Returns:
            dict: 包含success和output/error字段的结果字典
        """
        try:
            # 处理字节内容
            if isinstance(file_content, bytes):
                try:
                    file_content = file_content.decode('utf-8')
                except UnicodeDecodeError:
                    # 如果无法解码，保持为bytes（二进制文件）
                    pass

            # 保存脚本文件
            script_path = self.data_persistence.save_script_file(file_content, filename,
                                                                 str(task_id) if task_id else None)
            if not script_path:
                return {
                    "success": False,
                    "message": "Failed to save script file",
                    "error": "Could not save the uploaded script file"
                }

            return {"success": True, "output": {"script_path": script_path, "filename": os.path.basename(script_path)}}
        except Exception as e:
            return {"success": False, "message": "Failed to process script file", "error": str(e)}

    def process_zip_file(self, file_content, task_id=None, command=None):
        """
        处理上传的ZIP文件
        
        Args:
            file_content: ZIP文件内容(bytes)
            task_id: 任务ID，如果有则直接解压到任务目录
            command: 自定义启动命令
            
        Returns:
            dict: 包含success和output/error字段的结果字典
        """
        try:
            # 解压ZIP文件
            result = self.data_persistence.save_script_from_zip(file_content, str(task_id) if task_id else None)
            if not result.get('success', False):
                return {
                    "success": False,
                    "message": "Failed to process ZIP file",
                    "error": result.get('error', 'Unknown error')
                }

            # 设置默认命令
            if not command:
                command = "python main.py"  # 默认命令

            # 使用ZIP包中提供的目录作为脚本路径
            script_path = result.get('script_dir')
            if not script_path:
                return {
                    "success": False,
                    "message": "Failed to extract ZIP directory",
                    "error": "Could not extract the uploaded ZIP file"
                }

            return {
                "success": True,
                "output": {
                    "script_path": script_path,
                    "command": command,
                    "saved_files": result.get('saved_files', []),
                    "temp_result": result  # 保留完整的结果，以便后续处理
                }
            }
        except Exception as e:
            return {"success": False, "message": "Failed to process ZIP file", "error": str(e)}

    def move_temp_files_to_task_dir(self, task_id, script_path, filename, is_zip=False, temp_result=None):
        """
        将临时文件移动到任务专用目录
        
        Args:
            task_id: 任务ID
            script_path: 脚本路径
            filename: 文件名
            is_zip: 是否为ZIP文件
            temp_result: ZIP临时结果信息
            
        Returns:
            dict: 包含success和output/error字段的结果字典
        """
        try:
            new_script_path = script_path

            if is_zip:
                # 将ZIP包内容移动到任务专用目录
                if temp_result:
                    saved_files = []
                    for file in os.listdir(os.path.dirname(script_path)):
                        src_path = os.path.join(os.path.dirname(script_path), file)
                        if os.path.isfile(src_path):
                            dst_path = self.data_persistence.get_script_path(task_id, file)
                            os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                            shutil.move(src_path, dst_path)
                            saved_files.append(dst_path)

                            # 更新主脚本路径
                            if src_path == script_path:
                                new_script_path = dst_path

                    return {"success": True, "output": {"script_path": new_script_path, "saved_files": saved_files}}
            else:
                # 移动单个脚本文件
                new_script_path = self.data_persistence.get_script_path(task_id, os.path.basename(script_path))
                os.makedirs(os.path.dirname(new_script_path), exist_ok=True)
                shutil.move(script_path, new_script_path)

                return {"success": True, "output": {"script_path": new_script_path}}
        except Exception as e:
            return {"success": False, "message": "Failed to move files to task directory", "error": str(e)}

    def cleanup_temp_files(self, script_path):
        """
        清理临时文件
        
        Args:
            script_path: 脚本路径
            
        Returns:
            bool: 清理是否成功
        """
        try:
            if os.path.exists(script_path):
                if os.path.isdir(os.path.dirname(script_path)):
                    shutil.rmtree(os.path.dirname(script_path))
                else:
                    os.remove(script_path)
            return True
        except Exception:
            return False  # 忽略清理错误
