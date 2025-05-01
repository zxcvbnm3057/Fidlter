from flask import Blueprint, request, jsonify, make_response
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
import time
from functools import wraps

auth_bp = Blueprint('auth', __name__)

# 会话存储，实际项目中应当使用Redis或数据库存储
sessions = {}  # {session_id: {'username': username, 'created_at': timestamp, 'is_admin': bool}}

# In-memory user storage for demonstration purposes
users = {"admin": {"password": generate_password_hash("admin123"), "is_admin": True}}

# 会话有效期（15分钟，单位：秒）
SESSION_EXPIRY = 900


def requires_session(f):

    @wraps(f)
    def decorated(*args, **kwargs):
        session_id = request.cookies.get('session')
        if not session_id or session_id not in sessions:
            return jsonify({"message": "Unauthorized"}), 401

        # 检查会话是否过期
        session = sessions[session_id]
        if time.time() - session['created_at'] > SESSION_EXPIRY:
            # 删除过期会话
            del sessions[session_id]
            return jsonify({"message": "Session expired"}), 401

        # 将用户信息添加到request中，方便后续使用
        request.user = session
        return f(*args, **kwargs)

    return decorated


def requires_admin(f):

    @wraps(f)
    def decorated(*args, **kwargs):
        # 首先检查会话
        session_id = request.cookies.get('session')
        if not session_id or session_id not in sessions:
            return jsonify({"message": "Unauthorized"}), 401

        # 检查会话是否过期
        session = sessions[session_id]
        if time.time() - session['created_at'] > SESSION_EXPIRY:
            # 删除过期会话
            del sessions[session_id]
            return jsonify({"message": "Session expired"}), 401

        # 检查管理员权限
        if not session.get('is_admin', False):
            return jsonify({"message": "Unauthorized - Admin privileges required"}), 403

        request.user = session
        return f(*args, **kwargs)

    return decorated


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if username not in users or not check_password_hash(users[username]['password'], password):
        return jsonify({"message": "Invalid username or password"}), 401

    # 创建会话
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        'username': username,
        'is_admin': users[username].get('is_admin', False),
        'created_at': time.time()
    }

    # 设置响应
    response = make_response(
        jsonify({
            "message": "Login successful",
            "user": {
                "username": username,
                "is_admin": users[username].get('is_admin', False)
            }
        }))

    # 设置会话Cookie，有效期15分钟
    response.set_cookie('session', session_id, httponly=True, max_age=SESSION_EXPIRY, path='/')

    return response


@auth_bp.route('/create_user', methods=['POST'])
@requires_admin
def create_user():
    data = request.get_json()

    # 创建新用户
    new_username = data.get('username')
    new_password = data.get('password')
    is_admin = data.get('is_admin', False)

    if not new_username or not new_password:
        return jsonify({"message": "Username and password are required"}), 400

    if new_username in users:
        return jsonify({"message": "User already exists"}), 400

    hashed_password = generate_password_hash(new_password)
    users[new_username] = {"password": hashed_password, "is_admin": is_admin}

    return jsonify({
        "message": "User created successfully",
        "user": {
            "username": new_username,
            "is_admin": is_admin
        }
    }), 201


@auth_bp.route('/logout', methods=['POST'])
def logout():
    session_id = request.cookies.get('session')

    # 删除会话（如果存在）
    if session_id and session_id in sessions:
        del sessions[session_id]

    # 设置响应并清除会话Cookie
    response = make_response(jsonify({"message": "Logout successful"}))
    response.set_cookie('session', '', expires=0, path='/')

    return response


# 辅助函数，用于清理过期会话
def cleanup_expired_sessions():
    expired_sessions = []
    current_time = time.time()

    for session_id, session in sessions.items():
        if current_time - session['created_at'] > SESSION_EXPIRY:
            expired_sessions.append(session_id)

    for session_id in expired_sessions:
        del sessions[session_id]
