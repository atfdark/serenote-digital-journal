from flask import Blueprint, request, jsonify
from app.database.db import db_session
from app.database.models import Todo
from datetime import datetime

todo_routes = Blueprint("todo", __name__)

@todo_routes.route("/user/<int:user_id>", methods=["GET"])
def get_todos(user_id):
    """Get all todos for a user."""
    todos = db_session.query(Todo).filter_by(user_id=user_id).order_by(Todo.created_at.desc()).all()
    result = [{
        "id": todo.id,
        "title": todo.title,
        "description": todo.description,
        "completed": todo.completed,
        "priority": todo.priority,
        "category": todo.category,
        "due_date": todo.due_date.isoformat() if todo.due_date else None,
        "created_at": todo.created_at.isoformat(),
        "updated_at": todo.updated_at.isoformat()
    } for todo in todos]
    return jsonify(result)

@todo_routes.route("/add", methods=["POST"])
def add_todo():
    """Add a new todo item."""
    data = request.json
    user_id = data.get("user_id")
    title = data.get("title")
    description = data.get("description", "")
    priority = data.get("priority", "medium")
    category = data.get("category", "general")
    due_date_str = data.get("due_date")

    if not all([user_id, title]):
        return jsonify({"message": "user_id and title are required"}), 400

    due_date = None
    if due_date_str:
        try:
            due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({"message": "Invalid due date format"}), 400

    new_todo = Todo(
        user_id=user_id,
        title=title,
        description=description,
        priority=priority,
        category=category,
        due_date=due_date
    )
    db_session.add(new_todo)
    db_session.commit()

    return jsonify({
        "message": "Todo added successfully",
        "id": new_todo.id
    }), 201

@todo_routes.route("/update/<int:todo_id>", methods=["PUT"])
def update_todo(todo_id):
    """Update a todo item."""
    todo = db_session.query(Todo).filter_by(id=todo_id).first()
    if not todo:
        return jsonify({"message": "Todo not found"}), 404

    data = request.json
    if "title" in data:
        todo.title = data["title"]
    if "description" in data:
        todo.description = data["description"]
    if "completed" in data:
        todo.completed = data["completed"]
    if "priority" in data:
        todo.priority = data["priority"]
    if "category" in data:
        todo.category = data["category"]
    if "due_date" in data:
        if data["due_date"]:
            try:
                todo.due_date = datetime.fromisoformat(data["due_date"].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({"message": "Invalid due date format"}), 400
        else:
            todo.due_date = None

    db_session.commit()
    return jsonify({"message": "Todo updated successfully"}), 200

@todo_routes.route("/delete/<int:todo_id>", methods=["DELETE"])
def delete_todo(todo_id):
    """Delete a todo item."""
    todo = db_session.query(Todo).filter_by(id=todo_id).first()
    if not todo:
        return jsonify({"message": "Todo not found"}), 404

    db_session.delete(todo)
    db_session.commit()
    return jsonify({"message": "Todo deleted successfully"}), 200

@todo_routes.route("/stats/<int:user_id>", methods=["GET"])
def get_todo_stats(user_id):
    """Get todo statistics for a user."""
    todos = db_session.query(Todo).filter_by(user_id=user_id).all()

    total = len(todos)
    completed = len([t for t in todos if t.completed])
    pending = total - completed

    # Priority breakdown
    high_priority = len([t for t in todos if t.priority == "high" and not t.completed])
    medium_priority = len([t for t in todos if t.priority == "medium" and not t.completed])
    low_priority = len([t for t in todos if t.priority == "low" and not t.completed])

    # Overdue todos
    now = datetime.now()
    overdue = len([t for t in todos if t.due_date and t.due_date < now and not t.completed])

    return jsonify({
        "total": total,
        "completed": completed,
        "pending": pending,
        "completion_rate": (completed / total * 100) if total > 0 else 0,
        "high_priority": high_priority,
        "medium_priority": medium_priority,
        "low_priority": low_priority,
        "overdue": overdue
    })