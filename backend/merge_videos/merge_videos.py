import functions_framework
from google.cloud import storage
import tempfile
import os
import json
from moviepy.editor import VideoFileClip, concatenate_videoclips
import logging

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@functions_framework.http
def merge_videos(request):
    """HTTP Cloud Function.
    Args:
        request (flask.Request): The request object.
    Returns:
        The response text, or any set of values that can be turned into a
        Response object using `make_response`
    """
    # Set CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '3600',
        'Content-Type': 'application/json'
    }

    # 處理 OPTIONS 請求
    if request.method == 'OPTIONS':
        return ('', 204, headers)

    try:
        # 獲取請求數據
        request_json = request.get_json(silent=True)
        logger.info(f"Received request data: {request_json}")

        if not request_json or 'video_paths' not in request_json:
            return json.dumps({
                'error': 'No video paths provided',
                'received_data': request_json
            }), 400, headers

        video_paths = request_json['video_paths']
        if not isinstance(video_paths, list):
            video_paths = [str(video_paths)]

        # 確保所有路徑都是字符串
        video_paths = [str(path) if not isinstance(path, list) else str(path[0]) for path in video_paths]
        logger.info(f"Processing video paths: {video_paths}")

        # 初始化 Storage 客戶端
        storage_client = storage.Client()
        source_bucket = storage_client.bucket('genasl-video-files')
        target_bucket = storage_client.bucket('genasl-merged-videos')

        # 使用臨時目錄
        with tempfile.TemporaryDirectory() as temp_dir:
            video_clips = []
            logger.info(f"Created temporary directory: {temp_dir}")

            # 下載並加載每個視頻
            for video_path in video_paths:
                local_path = os.path.join(temp_dir, os.path.basename(video_path))
                logger.info(f"Processing video: {video_path} -> {local_path}")
                
                # 檢查文件是否存在
                blob = source_bucket.blob(video_path)
                if not blob.exists():
                    raise FileNotFoundError(f"Video file not found in bucket: {video_path}")

                # 下載視頻文件
                blob.download_to_filename(local_path)
                logger.info(f"Downloaded video to: {local_path}")

                # 加載視頻
                clip = VideoFileClip(local_path)
                logger.info(f"Loaded video clip: {local_path}, duration: {clip.duration}")
                video_clips.append(clip)

            if not video_clips:
                raise ValueError("No valid video clips to merge")

            # 合併視頻
            logger.info("Starting video merge process")
            final_clip = concatenate_videoclips(video_clips, method="compose")
            logger.info(f"Created final clip with duration: {final_clip.duration}")

            # 保存合併後的視頻
            output_path = os.path.join(temp_dir, 'merged_video.mp4')
            logger.info(f"Writing merged video to: {output_path}")
            
            final_clip.write_videofile(output_path, 
                                     codec='libx264', 
                                     audio_codec='aac',
                                     threads=4,
                                     fps=24)

            # 上傳合併後的視頻
            output_blob_name = f"merged_{request_json.get('id', 'video')}.mp4"
            output_blob = target_bucket.blob(output_blob_name)
            logger.info(f"Uploading merged video to: {output_blob_name}")
            
            output_blob.upload_from_filename(output_path)
            
            # 清理資源
            for clip in video_clips:
                clip.close()
            final_clip.close()
            logger.info("Cleaned up video resources")

            # 生成公開訪問 URL
            public_url = f"https://storage.googleapis.com/genasl-merged-videos/{output_blob_name}"
            logger.info(f"Generated public URL: {public_url}")

            return json.dumps({
                'success': True,
                'merged_video_url': public_url,
                'processed_paths': video_paths,
                'duration': final_clip.duration
            }), 200, headers

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}", exc_info=True)
        error_response = {
            'error': str(e),
            'error_details': {
                'type': type(e).__name__,
                'message': str(e)
            },
            'processed_paths': video_paths if 'video_paths' in locals() else None
        }
        return json.dumps(error_response), 500, headers