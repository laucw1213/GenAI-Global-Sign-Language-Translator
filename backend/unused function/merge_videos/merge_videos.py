import os
import logging
import tempfile
import uuid
import functions_framework
from flask import jsonify
from google.cloud import storage
from moviepy.editor import VideoFileClip, concatenate_videoclips
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import pytz

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Google Cloud Storage client
storage_client = storage.Client()

# Define bucket names
SOURCE_BUCKET = "genasl-video-files"
DESTINATION_BUCKET = "genasl-merged-videos"

def get_hk_timestamp() -> str:
    """
    Get current timestamp in Hong Kong timezone.
    
    Returns:
        str: Formatted timestamp string
    """
    hk_tz = pytz.timezone('Asia/Hong_Kong')
    hk_time = datetime.now(hk_tz)
    return hk_time.strftime('%Y%m%d_%H%M%S')

class VideoMergeError(Exception):
    """Custom exception for video merge errors"""
    pass

def download_video(source_blob_name: str) -> str:
    """
    Download a video from the ASL videos bucket to a temporary file.
    
    Args:
        source_blob_name: Path to the video in GCS
        
    Returns:
        str: Path to the downloaded temporary file
    """
    try:
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
        temp_path = temp_file.name
        temp_file.close()

        # Download blob from source bucket
        bucket = storage_client.bucket(SOURCE_BUCKET)
        blob = bucket.blob(source_blob_name)
        blob.download_to_filename(temp_path)
        
        logger.info(f"Downloaded {source_blob_name} to {temp_path}")
        return temp_path
    
    except Exception as e:
        raise VideoMergeError(f"Failed to download video {source_blob_name}: {str(e)}")

def upload_merged_video(source_file: str, destination_blob_name: str) -> str:
    """
    Upload a merged video to the complete videos bucket.
    
    Args:
        source_file: Path to the local merged video file
        destination_blob_name: Destination path in GCS
        
    Returns:
        str: Public URL of the uploaded video
    """
    try:
        bucket = storage_client.bucket(DESTINATION_BUCKET)
        blob = bucket.blob(destination_blob_name)
        
        blob.upload_from_filename(source_file)
        
        # Make the blob publicly readable
        blob.make_public()
        
        logger.info(f"Uploaded merged video to {DESTINATION_BUCKET}/{destination_blob_name}")
        return blob.public_url
    
    except Exception as e:
        raise VideoMergeError(f"Failed to upload merged video: {str(e)}")

def merge_videos_from_paths(video_paths: List[str], output_path: str) -> None:
    """
    Merge multiple videos into a single video file.
    
    Args:
        video_paths: List of paths to input videos
        output_path: Path where the merged video will be saved
    """
    clips = []
    final_clip = None
    try:
        # Load all video clips
        clips = [VideoFileClip(path) for path in video_paths]
        
        # Concatenate clips
        final_clip = concatenate_videoclips(clips, method="compose")
        
        # Write output file
        final_clip.write_videofile(
            output_path,
            codec='libx264',
            audio_codec='aac',
            temp_audiofile='temp-audio.m4a',
            remove_temp=True
        )
        
        logger.info(f"Successfully merged {len(video_paths)} videos to {output_path}")
        
    except Exception as e:
        raise VideoMergeError(f"Failed to merge videos: {str(e)}")
    
    finally:
        # Cleanup clips
        try:
            for clip in clips:
                if clip:
                    clip.close()
            if final_clip:
                final_clip.close()
        except Exception as e:
            logger.warning(f"Error during cleanup: {str(e)}")

def validate_request(request_json: Dict[str, Any]) -> None:
    """
    Validate the incoming request data.
    
    Args:
        request_json: The request JSON data
        
    Raises:
        ValueError: If the request is invalid
    """
    if not request_json:
        raise ValueError("No JSON data received")
    
    if 'video_paths' not in request_json:
        raise ValueError("No video_paths provided in request")
    
    if not isinstance(request_json['video_paths'], list):
        raise ValueError("video_paths must be a list")
    
    if not request_json['video_paths']:
        raise ValueError("video_paths list is empty")
    
    # Validate each path
    for path in request_json['video_paths']:
        if not isinstance(path, (str, int)):
            raise ValueError(f"Invalid video path type: {type(path)}")

def cleanup_temp_files(file_paths: List[str]) -> None:
    """
    Clean up temporary files.
    
    Args:
        file_paths: List of file paths to clean up
    """
    for path in file_paths:
        try:
            if os.path.exists(path):
                os.remove(path)
                logger.info(f"Cleaned up temporary file: {path}")
        except Exception as e:
            logger.warning(f"Failed to clean up file {path}: {str(e)}")

@functions_framework.http
def merge_videos(request) -> tuple[Any, int]:
    """
    Cloud Function to merge multiple videos.
    
    Args:
        request: The Flask request object
        
    Returns:
        tuple: (response_json, status_code)
    """
    temp_files = []  # Track temporary files for cleanup
    
    try:
        # Get and validate request data
        request_json = request.get_json()
        validate_request(request_json)
        
        # Extract parameters
        video_paths = [str(path) for path in request_json['video_paths']]
        
        # Get Hong Kong timestamp
        timestamp = get_hk_timestamp()
        
        # Download videos from source bucket
        local_video_paths = []
        for path in video_paths:
            local_path = download_video(path)
            local_video_paths.append(local_path)
            temp_files.append(local_path)
        
        # Create output path
        output_path = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4').name
        temp_files.append(output_path)
        
        # Merge videos
        merge_videos_from_paths(local_video_paths, output_path)
        
        # Upload merged video to destination bucket with HK timestamp
        destination_blob_name = f"merged_{timestamp}.mp4"
        public_url = upload_merged_video(output_path, destination_blob_name)
        
        # Prepare successful response
        response = {
            'success': True,
            'merged_video_url': public_url,
            'processed_paths': video_paths,
            'timestamp': timestamp,
            'source_bucket': SOURCE_BUCKET,
            'destination_bucket': DESTINATION_BUCKET
        }
        
        return jsonify(response), 200, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        }
        
    except ValueError as e:
        return jsonify({
            'error': 'Invalid request',
            'error_details': {
                'type': 'ValueError',
                'message': str(e)
            },
            'source_bucket': SOURCE_BUCKET,
            'destination_bucket': DESTINATION_BUCKET
        }), 400, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        }
        
    except VideoMergeError as e:
        return jsonify({
            'error': 'Video merge failed',
            'error_details': {
                'type': 'VideoMergeError',
                'message': str(e)
            },
            'source_bucket': SOURCE_BUCKET,
            'destination_bucket': DESTINATION_BUCKET
        }), 500, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        }
        
    except Exception as e:
        return jsonify({
            'error': 'Unexpected error',
            'error_details': {
                'type': type(e).__name__,
                'message': str(e)
            },
            'source_bucket': SOURCE_BUCKET,
            'destination_bucket': DESTINATION_BUCKET
        }), 500, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        }
        
    finally:
        # Clean up temporary files
        cleanup_temp_files(temp_files)