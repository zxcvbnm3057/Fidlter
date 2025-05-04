@task_routes.route('', methods=['POST'])
def schedule_task():
    """创建新任务，支持上传脚本文件或ZIP包，以及cron表达式或延时执行"""
    try:
        # 处理多部分表单数据
        script_file = request.files.get('script_file')
        conda_env = request.form.get('conda_env')
        task_name = request.form.get('task_name')

        # 获取requirements - 可以是文件或文本
        requirements = None
        requirements_file = request.files.get('requirements_file')
        if requirements_file:
            requirements = requirements_file.read().decode('utf-8')
        elif request.form.get('requirements'):
            requirements = request.form.get('requirements')

        # 其他参数
        reuse_env = request.form.get('reuse_env', 'false').lower() == 'true'
        cron_expression = request.form.get('cron_expression')
        delay_seconds = request.form.get('delay_seconds')
        if delay_seconds and delay_seconds.isdigit():
            delay_seconds = int(delay_seconds)
        else:
            delay_seconds = None
        priority = request.form.get('priority', 'normal')
        memory_limit = request.form.get('memory_limit')
        if memory_limit and memory_limit.isdigit():
            memory_limit = int(memory_limit)
        else:
            memory_limit = None

        # 获取自定义启动命令
        command = request.form.get('command')

        # 验证必要参数
        if not script_file:
            return jsonify({"success": False, "message": "Script file is required"}), 400
        if not conda_env:
            return jsonify({"success": False, "message": "Environment name is required"}), 400

        # 验证cron表达式和delay_seconds不能同时提供
        if cron_expression and delay_seconds is not None:
            return jsonify({
                "success": False,
                "message": "Please specify either cron expression or delay seconds, not both",
                "error": "Cannot specify both cron_expression and delay_seconds"
            }), 400

        # 处理上传的文件 - 首先保存为临时文件，获取任务ID后再移到正确位置
        from app.utils.persistence import DataPersistence
        data_persistence = DataPersistence()

        # 判断文件类型 - 是单个脚本还是ZIP包
        filename = script_file.filename
        script_path = None

        if filename.endswith('.zip'):
            # 处理ZIP包
            file_content = script_file.read()
            temp_result = data_persistence.save_script_from_zip(file_content)
            if not temp_result.get('success', False):
                return jsonify({
                    "success": False,
                    "message": "Failed to process ZIP file",
                    "error": temp_result.get('error', 'Unknown error')
                }), 400

            # 对于ZIP文件，必须提供启动命令
            if not command:
                command = "python main.py"  # 默认命令

            # 使用ZIP包中提供的目录作为脚本路径
            script_path = temp_result.get('script_dir')
            if not script_path:
                return jsonify({
                    "success": False,
                    "message": "Failed to extract ZIP directory",
                    "error": "Could not extract the uploaded ZIP file"
                }), 400
        else:
            # 处理单个脚本文件
            file_content = script_file.read()
            if isinstance(file_content, bytes):
                file_content = file_content.decode('utf-8')

            # 临时保存脚本
            script_path = data_persistence.save_script_file(file_content, filename)
            if not script_path:
                return jsonify({
                    "success": False,
                    "message": "Failed to save script file",
                    "error": "Could not save the uploaded script file"
                }), 400

        # 使用保存的脚本路径创建任务
        task_result = task_scheduler.schedule_task(script_path=script_path,
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
            # 如果任务创建成功，将临时脚本文件移动到任务目录中
            task_id = task_result['task'].get('task_id')
            if task_id:
                if filename.endswith('.zip'):
                    # 将ZIP包内容移动到任务专用目录
                    temp_result['saved_files'] = []  # 清空之前的文件列表
                    for file in os.listdir(os.path.dirname(script_path)):
                        src_path = os.path.join(os.path.dirname(script_path), file)
                        if os.path.isfile(src_path):
                            dst_path = data_persistence.get_script_path(task_id, file)
                            os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                            shutil.move(src_path, dst_path)
                            temp_result['saved_files'].append(dst_path)

                            # 更新主脚本路径
                            if src_path == script_path:
                                script_path = dst_path
                else:
                    # 移动单个脚本文件
                    new_script_path = data_persistence.get_script_path(task_id, os.path.basename(script_path))
                    os.makedirs(os.path.dirname(new_script_path), exist_ok=True)
                    shutil.move(script_path, new_script_path)
                    script_path = new_script_path

                # 更新任务中的脚本路径
                task_scheduler.scheduler.repository.update_task(task_id, {'script_path': script_path})
                task_result['task']['script_path'] = script_path

            return jsonify(task_result), 201
        else:
            # 如果任务创建失败，清理临时文件
            try:
                if os.path.exists(script_path):
                    if os.path.isdir(os.path.dirname(script_path)):
                        shutil.rmtree(os.path.dirname(script_path))
                    else:
                        os.remove(script_path)
            except Exception as e:
                pass  # 忽略清理错误

            return jsonify(task_result), 400
    except Exception as e:
        import traceback
        return jsonify({
            "success": False,
            "message": "An error occurred while processing your request",
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500