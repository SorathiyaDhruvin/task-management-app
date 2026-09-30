from flask import jsonify

def success_response(data=None, status_code=200):
    response = {"success": True}
    if data is not None:
        response["data"] = data
    return jsonify(response), status_code

def error_response(code, message, status_code=400):
    response = {
        "success": False,
        "error": {
            "code": code,
            "message": message
        }
    }
    return jsonify(response), status_code
