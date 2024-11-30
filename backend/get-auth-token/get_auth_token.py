from google.auth import default, impersonated_credentials
from google.auth.transport.requests import Request
import functions_framework
from flask import jsonify, make_response
import google.auth.transport.requests

SERVICE_ACCOUNT = 'project-genasl@genasl.iam.gserviceaccount.com'
SCOPES = ['https://www.googleapis.com/auth/cloud-platform']

def cors_enabled_function(request):
    # 設置 CORS headers
    headers = {
        'Access-Control-Allow-Origin': 'https://storage.googleapis.com',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '3600'
    }

    # 如果是 OPTIONS 請求，直接返回
    if request.method == 'OPTIONS':
        return ('', 204, headers)

    try:
        # 獲取默認憑證
        source_credentials, project = default()
        
        # 建立模擬憑證
        target_credentials = impersonated_credentials.Credentials(
            source_credentials=source_credentials,
            target_principal=SERVICE_ACCOUNT,
            target_scopes=SCOPES,
            lifetime=3600  # 1 小時
        )
        
        # 刷新令牌
        auth_req = google.auth.transport.requests.Request()
        target_credentials.refresh(auth_req)
        
        response = make_response(jsonify({
            'token': target_credentials.token,
            'expiry': target_credentials.expiry.isoformat() if target_credentials.expiry else None
        }))
        
        # 添加 CORS headers
        for key, value in headers.items():
            response.headers[key] = value
            
        return response

    except Exception as e:
        error_response = make_response(jsonify({
            'error': str(e),
            'message': '無法獲取認證令牌'
        }), 500)
        
        # 添加 CORS headers
        for key, value in headers.items():
            error_response.headers[key] = value
            
        return error_response

# 註冊 HTTP 函數
@functions_framework.http
def get_auth_token(request):
    return cors_enabled_function(request)
