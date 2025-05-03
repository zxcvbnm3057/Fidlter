from flask import Blueprint, request, jsonify, Response
from app.services import CondaManager
from datetime import datetime
import os
import json

# 创建实例
conda_manager = CondaManager()

# 创建蓝图
conda_routes = Blueprint('conda', __name__, url_prefix='/conda')


@conda_routes.route('/environments', methods=['GET'])
def list_conda_environments():
    """获取所有Conda环境列表，支持流式响应"""
    # 检查是否请求流式响应
    stream = request.args.get('stream', 'false').lower() == 'true'

    # 使用新的服务层方法获取格式化环境列表
    result = conda_manager.get_formatted_environments(stream)

    # 判断是否成功获取环境列表
    if not result.get("success", False):
        return jsonify({"message": "Failed to list environments", "error": result.get("error", "")}), 500

    # 获取处理结果
    output = result.get("output", [])

    # 处理流式响应
    if stream:

        def generate():
            # 对于空环境情况，生成器不会产生任何输出
            # 前端需要处理连接关闭但没有接收到数据的情况
            for env_data in output:
                yield json.dumps(env_data) + '\n'

        return Response(generate(), mimetype='application/json')
    else:
        # 正常响应直接返回JSON格式的数组
        return jsonify(output)


@conda_routes.route('/environment', methods=['POST'])
def create_conda_environment():
    """创建新的Conda环境"""
    data = request.json
    name = data.get('name')
    python_version = data.get('python_version')
    packages = data.get('packages', [])

    if not name:
        return jsonify({"success": False, "message": "Environment name is required"}), 400

    result = conda_manager.create_environment(name, python_version, packages)
    if result.get('success'):
        # 格式化为符合文档要求的响应
        return jsonify({
            "success": True,
            "message": "Environment created successfully",
            "environment": {
                "name": name,
                "python_version": python_version,
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        }), 201
    else:
        if "already exists" in result.get('error', '').lower():
            return jsonify({
                "success": False,
                "message": "Environment with this name already exists",
                "error": result.get('error', '')
            }), 400
        elif "not_found_packages" in result:
            # 处理包未找到的情况
            return jsonify({
                "success": False,
                "message": result.get('message', "Package validation failed"),
                "error": result.get('error', ''),
                "not_found_packages": result.get('not_found_packages', [])
            }), 400
        return jsonify(result), 400


@conda_routes.route('/environment/<env_name>', methods=['DELETE'])
def delete_conda_environment(env_name):
    """删除指定的Conda环境"""
    result = conda_manager.delete_environment(env_name)
    if result.get('success'):
        return '', 204  # 文档规定删除成功返回204无内容
    else:
        if "not found" in result.get('error', '').lower():
            return jsonify({"success": False, "message": "Environment not found"}), 404
        elif "in use by tasks" in result.get('error', ''):
            return jsonify({
                "success": False,
                "message": "Cannot delete environment that is referenced by tasks",
                "error": "Environment is in use by tasks",
                "referencing_tasks": result.get("referencing_tasks", [])
            }), 400
        return jsonify({"success": False, "message": "Failed to delete environment"}), 400


@conda_routes.route('/environment/<env_name>', methods=['PUT'])
def update_conda_environment(env_name):
    """修改Conda环境名称"""
    data = request.json
    new_name = data.get('new_name')
    if not new_name:
        return jsonify({"success": False, "message": "New name is required"}), 400

    result = conda_manager.rename_environment(env_name, new_name)
    if result.get('success'):
        # 根据文档要求格式化返回结果
        return jsonify({
            "success": True,
            "message": "Environment renamed successfully",
            "old_name": env_name,
            "new_name": new_name,
            "updated_tasks_count": result.get("updated_tasks_count", 0)
        }), 200
    else:
        if result.get('message') == 'Environment not found':
            return jsonify({"success": False, "message": "Environment not found"}), 404
        elif "already exists" in result.get('error', '').lower():
            return jsonify({
                "success": False,
                "message": "Environment with this name already exists",
                "error": "Cannot rename environment to an existing name"
            }), 400
        return jsonify(result), 400


@conda_routes.route('/environment/<env_name>/packages', methods=['POST'])
def install_packages(env_name):
    """在指定Conda环境中安装包"""
    data = request.json
    packages = data.get('packages', [])
    if not packages:
        return jsonify({"success": False, "message": "No packages specified"}), 400

    result = conda_manager.install_packages(env_name, packages)
    if result.get('success'):
        # 根据文档要求格式化返回结果
        return jsonify({
            "success": True,
            "message": "Packages installed successfully",
            "environment": env_name,
            "installed_packages": packages
        }), 200
    else:
        if result.get('message') == 'Environment not found':
            return jsonify({"success": False, "message": "Environment not found"}), 404
        elif "in use by tasks" in result.get('error', ''):
            return jsonify({
                "success": False,
                "message": "Cannot modify packages in environment that is referenced by running tasks",
                "error": "Environment is in use by tasks",
                "referencing_tasks": result.get("referencing_tasks", [])
            }), 400
        else:
            # 处理安装失败的情况
            return jsonify({
                "success": False,
                "message": "Failed to install packages",
                "failed_packages": result.get("failed_packages", []),
                "error_details": result.get("error_details", []),
                "error": result.get("error", "Unknown error")
            }), 400


@conda_routes.route('/environment/<env_name>/packages', methods=['DELETE'])
def remove_packages(env_name):
    """从指定Conda环境中移除包"""
    data = request.json
    packages = data.get('packages', [])
    if not packages:
        return jsonify({"success": False, "message": "No packages specified"}), 400

    result = conda_manager.remove_packages(env_name, packages)
    if result.get('success'):
        # 根据文档要求格式化返回结果
        return jsonify({
            "success": True,
            "message": "Packages removed successfully",
            "environment": env_name,
            "removed_packages": packages
        }), 200
    else:
        if result.get('message') == 'Environment not found':
            return jsonify({"success": False, "message": "Environment not found"}), 404
        elif "in use by tasks" in result.get('error', ''):
            return jsonify({
                "success": False,
                "message": "Cannot remove packages from environment that is referenced by running tasks",
                "error": "Environment is in use by tasks",
                "referencing_tasks": result.get("referencing_tasks", [])
            }), 400
        return jsonify({
            "success": False,
            "message": "Failed to remove packages",
            "error": result.get("error", "")
        }), 400


@conda_routes.route('/stats', methods=['GET'])
def get_conda_stats():
    """获取Conda环境统计信息"""
    try:
        stats_result = conda_manager.get_environment_stats()
        if stats_result.get("success", False):
            # 移除total_disk_usage和package_stats字段，前端将从环境列表计算
            stats = stats_result.get("output", {})
            if "total_disk_usage" in stats:
                del stats["total_disk_usage"]
            if "package_stats" in stats:
                del stats["package_stats"]
            return jsonify(stats)
        else:
            return jsonify({
                "message": stats_result.get("message", "Failed to get environment statistics"),
                "error": stats_result.get("error", "Unknown error")
            }), 500
    except Exception as e:
        return jsonify({"message": "Failed to get environment statistics", "error": str(e)}), 500


@conda_routes.route('/environment/<env_name>', methods=['GET'])
def get_conda_environment_details(env_name):
    """获取特定Conda环境的详细信息"""
    try:
        details_result = conda_manager.get_environment_details(env_name)
        if details_result.get("success", False):
            return jsonify(details_result.get("output", {}))
        else:
            # 如果环境不存在，返回404状态码
            if "not found" in details_result.get("message", "").lower():
                return jsonify({
                    "message":
                    details_result.get("message", "Environment not found"),
                    "error":
                    details_result.get("error", f"Environment with name '{env_name}' does not exist")
                }), 404
            # 其他错误返回500状态码
            return jsonify({
                "message": details_result.get("message", "Failed to get environment details"),
                "error": details_result.get("error", "Unknown error")
            }), 500
    except Exception as e:
        return jsonify({"message": "Failed to get environment details", "error": str(e)}), 500


@conda_routes.route('/environment/<env_name>/extended-info', methods=['GET'])
def get_conda_environment_extended_info(env_name):
    """获取环境的扩展信息（包括磁盘使用量和包数量）"""
    try:
        result = conda_manager.get_environment_extended_info(env_name)
        if result.get("success", False):
            return jsonify(result.get("output", {}))
        else:
            # 如果环境不存在，返回404状态码
            if "not found" in result.get("message", "").lower():
                return jsonify({
                    "message": result.get("message", "Environment not found"),
                    "error": result.get("error", f"Environment with name '{env_name}' does not exist")
                }), 404
            # 其他错误返回500状态码
            return jsonify({
                "message": result.get("message", "Failed to get environment extended info"),
                "error": result.get("error", "Unknown error")
            }), 500
    except Exception as e:
        return jsonify({"message": "Failed to get environment extended info", "error": str(e)}), 500


@conda_routes.route('/python-versions', methods=['GET'])
def get_python_versions():
    """获取可用的Python版本列表"""
    try:
        result = conda_manager.get_available_python_versions()
        if result.get("success", False):
            # 直接返回结果的output部分
            return jsonify(result.get("output", {}))
        else:
            return jsonify({
                "message": "Failed to get Python versions",
                "error": result.get("error", "Unknown error")
            }), 500
    except Exception as e:
        return jsonify({"message": "Failed to get Python versions", "error": str(e)}), 500
