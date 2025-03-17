import os
from google.cloud import firestore, storage
import logging
from datetime import datetime
import json
from tqdm import tqdm

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, 'isoformat'):
            return obj.isoformat()
        return super().default(obj)

class ASLFirestoreSetup:
    def __init__(self):
        self.db = firestore.Client()
        self.storage_client = storage.Client()
        self.bucket = self.storage_client.bucket('genasl2-video-files')
        self.batch_size = 500

    def process_doc_for_json(self, doc_dict):
        """處理文檔以便 JSON 序列化"""
        processed = {}
        for key, value in doc_dict.items():
            if hasattr(value, 'isoformat'):
                processed[key] = value.isoformat()
            elif isinstance(value, dict):
                processed[key] = self.process_doc_for_json(value)
            else:
                processed[key] = value
        return processed

    def get_video_metadata(self, blob):
        """獲取影片的元數據"""
        try:
            metadata = {
                'content_type': blob.content_type,
                'size': blob.size,
                'created': blob.time_created.isoformat() if blob.time_created else None,
                'updated': blob.updated.isoformat() if blob.updated else None,
                'public_url': f"https://storage.googleapis.com/{self.bucket.name}/{blob.name}"
            }
            return metadata
        except Exception as e:
            logging.warning(f"Error getting metadata for {blob.name}: {str(e)}")
            return {}

    def determine_category(self, gloss):
        """確定 ASL 手語的類別"""
        # 基本類別判斷規則
        if len(gloss) == 1 and gloss.isalpha():
            return 'alphabet'
        elif any(num in gloss for num in ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN']):
            return 'numbers'
        elif gloss in {'RED', 'BLUE', 'GREEN', 'YELLOW', 'BLACK', 'WHITE', 'PURPLE', 'BROWN', 'PINK', 'ORANGE'}:
            return 'colors'
        elif gloss in {'HAPPY', 'SAD', 'ANGRY', 'LOVE', 'HATE', 'AFRAID', 'EXCITED', 'TIRED', 'HUNGRY'}:
            return 'emotions'
        elif gloss in {'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
                      'MONTH', 'WEEK', 'YEAR', 'DAY', 'MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'}:
            return 'time'
        elif gloss in {'HELLO', 'GOODBYE', 'PLEASE', 'THANK', 'SORRY', 'YES', 'NO'}:
            return 'common'
        return 'general'

    def process_videos(self):
        """處理所有視頻文件並添加到 Firestore"""
        try:
            blobs = list(self.bucket.list_blobs())
            logging.info(f"Found {len(blobs)} files in bucket")

            batch = self.db.batch()
            count = 0
            processed = 0

            for blob in tqdm(blobs, desc="Processing videos"):
                if not blob.name.lower().endswith('.mp4'):
                    continue

                try:
                    gloss = blob.name.replace('.mp4', '').upper()
                    category = self.determine_category(gloss)
                    
                    data = {
                        'video_path': blob.name,
                        'created_at': datetime.now(),
                        'gloss': gloss,
                        'category': category,
                        'metadata': {
                            'video_info': self.get_video_metadata(blob),
                            'format': 'video/mp4'
                        }
                    }

                    doc_ref = self.db.collection('asl_mappings').document(gloss)
                    batch.set(doc_ref, data)
                    count += 1
                    processed += 1

                    if count >= self.batch_size:
                        batch.commit()
                        logging.info(f"Committed batch of {count} documents")
                        batch = self.db.batch()
                        count = 0

                except Exception as e:
                    logging.error(f"Error processing {blob.name}: {str(e)}")
                    continue

            if count > 0:
                batch.commit()
                logging.info(f"Committed final batch of {count} documents")

            logging.info(f"Successfully processed {processed} videos")
            return processed

        except Exception as e:
            logging.error(f"Error in process_videos: {str(e)}")
            raise

    def verify_setup(self):
        """驗證設置是否成功"""
        try:
            sample_glosses = ['HELLO', 'THANK', 'YES']
            results = []
            
            for gloss in sample_glosses:
                doc_ref = self.db.collection('asl_mappings').document(gloss)
                doc = doc_ref.get()
                if doc.exists:
                    doc_dict = self.process_doc_for_json(doc.to_dict())
                    results.append({
                        'gloss': gloss,
                        'status': 'found',
                        'data': doc_dict
                    })
                else:
                    results.append({
                        'gloss': gloss,
                        'status': 'not_found'
                    })

            return results

        except Exception as e:
            logging.error(f"Error in verify_setup: {str(e)}")
            return None

    def save_results(self, processed_count, verification_results):
        """保存處理結果"""
        result = {
            'processed_videos': processed_count,
            'verification_results': verification_results,
            'timestamp': datetime.now().isoformat()
        }
        
        with open('setup_results.json', 'w') as f:
            json.dump(result, f, indent=2, cls=DateTimeEncoder)

def main():
    # 設置日誌
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('firestore_setup.log'),
            logging.StreamHandler()
        ]
    )

    try:
        setup = ASLFirestoreSetup()
        
        logging.info("Starting Firestore setup...")
        processed_count = setup.process_videos()
        
        logging.info("Verifying setup...")
        verification = setup.verify_setup()
        
        setup.save_results(processed_count, verification)
        
        logging.info("Setup completed successfully!")
        
    except Exception as e:
        logging.error(f"Setup failed: {str(e)}")
        raise

if __name__ == "__main__":
    main()