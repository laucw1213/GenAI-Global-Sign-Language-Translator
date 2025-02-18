import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  collection,
  addDoc,
  setDoc, 
  getDoc,
  updateDoc, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';

const firebaseConfig = {
  // 您的Firebase配置
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// 初始化Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const AUTH_URL = process.env.REACT_APP_AUTH_URL;

const useAuth = () => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  // 初始化或更新用戶檔案
  const initializeUserProfile = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      
      // 先檢查用戶是否存在
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // 如果是新用戶，創建新檔案
        await setDoc(userRef, {
          profile: {
            created_at: serverTimestamp(),
            last_active: serverTimestamp(),
            usage_count: 0
          }
        });
      } else {
        // 如果用戶已存在，只更新last_active
        await updateDoc(userRef, {
          'profile.last_active': serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Failed to initialize user profile:", err);
    }
  };

  // 記錄翻譯
  const recordTranslation = async (userId, translationData) => {
    try {
      // 創建新的翻譯記錄
      const translationsRef = collection(db, 'translations');
      await addDoc(translationsRef, {
        user_id: userId,
        timestamp: serverTimestamp(),
        input_text: translationData.input,
        output_gloss: translationData.output,
        success_status: translationData.success,
        processing_time: translationData.processing_time
      });

      // 更新用戶資料
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'profile.last_active': serverTimestamp(),
        'profile.usage_count': increment(1)
      });
    } catch (err) {
      console.error("Failed to record translation:", err);
    }
  };

  // 獲取GCP Token
  const getGcpToken = async (firebaseToken) => {
    try {
      const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
          'Accept': 'application/json'
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      return data.token;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    // 監聽認證狀態
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // 初始化用戶檔案
          await initializeUserProfile(user.uid);
          
          // 獲取Firebase Token
          const firebaseToken = await user.getIdToken();
          
          // 獲取GCP Token
          const gcpToken = await getGcpToken(firebaseToken);
          
          setUser(user);
          setToken(gcpToken);
          setError(null);
        } catch (err) {
          console.error("Authentication error:", err);
          setError("Authentication failed: " + err.message);
          setToken(null);
        }
      } else {
        // 嘗試匿名登錄
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("Anonymous sign in failed:", err);
          setError("Anonymous sign in failed: " + err.message);
        }
      }
    });

    // 清理函數
    return () => unsubscribe();
  }, []);

  return {
    token,
    user,
    error,
    recordTranslation,
    isAuthenticated: !!token
  };
};

export default useAuth;
