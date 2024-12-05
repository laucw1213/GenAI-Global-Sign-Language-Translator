from google.cloud import firestore

def create_asl_mappings():
    # 初始化 Firestore 客戶端
    db = firestore.Client()
    
    # 定義映射數據
    mappings = {
        "TWO": {
            "video_path": "TWO.wav",
            "duration": 15.6,
            "metadata": {
                "category": "pronoun",
                "difficulty": "basic",
                "format": "audio/wav"
            }
        }
    }
    
    # 批量添加文檔
    for gloss, data in mappings.items():
        doc_ref = db.collection('asl_mappings').document(gloss)
        doc_ref.set(data)
        print(f"Created mapping for: {gloss}")

if __name__ == "__main__":
    create_asl_mappings()