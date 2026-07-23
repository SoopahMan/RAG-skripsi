from typing import Dict
from uuid import uuid4

UPLOAD_TASKS: Dict[str, dict] = {}


def create_task():
    task_id = str(uuid4())

    UPLOAD_TASKS[task_id] = {
        "progress": 0,
        "stage": "Menunggu...",
        "finished": False,
        "error": None
    }

    return task_id


def update_task(task_id, progress, stage):
    if task_id in UPLOAD_TASKS:
        UPLOAD_TASKS[task_id]["progress"] = progress
        UPLOAD_TASKS[task_id]["stage"] = stage


def finish_task(task_id):
    if task_id in UPLOAD_TASKS:
        UPLOAD_TASKS[task_id]["progress"] = 100
        UPLOAD_TASKS[task_id]["stage"] = "Selesai"
        UPLOAD_TASKS[task_id]["finished"] = True


def error_task(task_id, error):
    if task_id in UPLOAD_TASKS:
        UPLOAD_TASKS[task_id]["finished"] = True
        UPLOAD_TASKS[task_id]["error"] = error