import os
import logging
from google.auth import default, impersonated_credentials
from google.auth.transport.requests import Request
import functions_framework
from flask import jsonify, make_response, request
import google.auth.transport.requests
import traceback
import firebase_admin
from firebase_admin import credentials, auth

# 初始化Firebase Admin SDK
cred = credentials.Certificate('firebase-service-account.json')
firebase_admin.initialize_app(cred)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Service account that will be impersonated
TARGET_SERVICE_ACCOUNT = 'project-genasl@genasl.iam.gserviceaccount.com'
# Required OAuth 2.0 scopes
SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/workflows'
]

def verify_firebase_token(id_token):
    try:
        # 驗證Firebase Token
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        logger.error(f'Firebase token verification failed: {str(e)}')
        raise

def cors_enabled_function(request):
    headers = {
        'Access-Control-Allow-Origin': 'https://genasl.web.app',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '3600'
    }

    if request.method == 'OPTIONS':
        return ('', 204, headers)

    try:
        logger.info('Starting authentication process')
        
        # 獲取Firebase Token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            raise ValueError('Invalid authorization header')
        
        firebase_token = auth_header.split('Bearer ')[1]
        
        # 驗證Firebase Token
        decoded_token = verify_firebase_token(firebase_token)
        logger.info(f'Firebase token verified for user: {decoded_token["uid"]}')
        
        # Get the default credentials that will do the impersonation
        credentials, project = default()
        logger.info(f'Using project: {project}')

        # Get a new token with extended scopes
        credentials.refresh(Request())
        
        # Create a token directly
        token = credentials.token
        expiry = credentials.expiry

        response_data = {
            'token': token,
            'expiry': expiry.isoformat() if expiry else None,
            'project': project,
            'user_id': decoded_token['uid']
        }

        response = make_response(jsonify(response_data))
        
        for key, value in headers.items():
            response.headers[key] = value
            
        logger.info('Authentication successful')
        return response

    except Exception as e:
        logger.error(f'Authentication error: {str(e)}')
        logger.error(f'Traceback: {traceback.format_exc()}')
        
        error_data = {
            'error': str(e),
            'message': 'Authentication failed',
            'trace': traceback.format_exc()
        }
        
        error_response = make_response(jsonify(error_data), 500)
        
        for key, value in headers.items():
            error_response.headers[key] = value
            
        return error_response

@functions_framework.http
def get_auth_token(request):
    return cors_enabled_function(request)
