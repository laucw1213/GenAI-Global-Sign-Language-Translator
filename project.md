### **項目計劃：ASL 虛擬人動畫生成系統（基於 GCP）**

#### **1\. 項目目標**

* 使用 Google Cloud 平台搭建一個系統，自動生成美國手語（ASL）虛擬人動畫，提升聽障人士的交流可達性。

  #### **2\. 需求分析**

* 語音轉文本：將語音轉換為英語文本。  
* 文本到 ASL 符號（gloss）轉換。  
* ASL 符號與動作數據配對。  
* 生成 ASL 虛擬人動畫。  
* 將生成的動畫存儲至雲端。

  #### **3\. 系統架構**

1. **語音轉文本**  
   * 使用 Google Cloud Speech-to-Text API 將語音轉換為文本。此步驟旨在自動捕獲語音輸入並精確地轉換成可處理的文字形式。  
   * 通過 Cloud Functions 進行音頻處理。Cloud Functions 能夠對語音文件進行預處理，包含接收音頻、分段處理及錯誤管理，確保語音數據轉換的可靠性。  
2. **文本轉 ASL 符號（gloss）**  
   * 文本可以來自語音轉文本的輸出或用戶直接輸入。使用 Gemini API 處理輸入的文本內容，生成 ASL gloss。這些 gloss 是手語中的中介符號，便於後續動作查找。  
   * 利用 Cloud Function 進行調用和文本處理，這樣可以對輸入的文本進行結構化處理並轉換為 ASL gloss。這一步對於標準化文本內容非常重要，便於後續查找和配對。  
3. **動作數據配對**  
   * **存儲大量影片於 Cloud Storage**：這些影片代表手語的具體動作。Cloud Storage 能夠高效存儲和管理這些大文件，提供可靠的媒體存儲解決方案。  
   * **Firestore 存儲 ASL gloss 與影片的對應關係**：在 Firestore 中存儲 ASL gloss 與對應影片的映射數據。每個 ASL gloss 都會作為一個文檔的字段，並包含對應的影片索引或影片 ID，這些索引用來定位存儲於 Cloud Storage 的具體影片。Firestore 具有強大的查詢能力和靈活的結構，支持多種查詢條件，這使得它能夠快速檢索並匹配用戶輸入的 ASL gloss，並找到對應的手語動作影片。這樣的結構設計有助於高效管理和檢索大量的手語數據。  
   * **使用 Cloud Function 進行查詢和配對**：當 ASL gloss 輸入後，Cloud Function 會自動查詢 Firestore，找出對應的影片索引，並從 Cloud Storage 中檢索相關影片。  
4. **生成 ASL 動作動畫**(local)  
   * 通過 API 調用本地/雲端部署的 stable diffusion,  animatediff 服務 ，並使用 comfyui 製作工作流  ,根據配對的動作數據分析生成dwpose 人體姿態動畫。stable diffusion 根據關鍵詞生成虛擬人, animatediff 通過接收人體姿態動畫,虛擬人 ，將其處理成符合虛擬人模型的照片, 並通過 KSampler把animediff 生成照片合併為流暢的動畫，以實現可視化手語動作。  
5. **存儲至雲端**  
   * 將生成的 ASL 動作動畫上傳至 Google Cloud Storage，供未來使用和存取。這樣不僅方便影片的分發與共享，還提供高可用性和可擴展的存儲解決方案。

   #### **4\. 工作流程**

* 使用 Google Cloud Workflows 編排各個步驟，確保每個過程按順序執行。Workflows 提供了一個直觀的方式來控制整個流程，確保每一步驟自動無誤地運行。  
* 為每一步設計錯誤處理和回滾機制，確保系統穩定性，例如在查詢或存儲失敗時進行重新嘗試，或將流程回退到前一安全狀態。

  #### **5\. 技術工具**

* **Cloud Functions**：用於處理語音到文本的轉換、文本處理、查詢和配對等。適合事件驅動且需要快速響應的任務。  
* **Firestore**：用於存儲 ASL gloss 與動作影片的對應關係，支持快速的數據檢索。  
* **Cloud Storage**：存儲最終生成的 ASL 動作影片以及原始手語動作影片。  
* **Cloud Workflows**：協調和編排各個步驟的執行，確保流程自動化和可靠性。  
* **Gemini API**：用於將文本轉換為 ASL gloss。  
* **stable diffusion/animatediff**：用於生成 ASL 動作動畫，基於查詢到的手語動作數據。

  #### **6\. 完整處理過程示例**

1. **用戶輸入**  
   用戶可以選擇以下三種輸入方式：  
   * 文本輸入：直接在前端界面輸入 "I want to buy a coffee"。  
   * 音頻輸入：通過上傳音頻，前端將上傳的音頻發送到後端進行處理。  
   * 語音輸入：通過語音將這段話讀出，前端將錄製的音頻發送到後端進行處理。  
2. **語音轉文本（如果是語音輸入）**  
   * Google Cloud Speech-to-Text API 會接收音頻，將其轉換為文本。在這裡，語音輸入會被轉換成文本 "I want to buy a coffee"。  
   * 使用 Cloud Function 處理音頻的接收和預處理，確保音頻被正確地提交給 Speech-to-Text API，並獲得可靠的文本輸出。  
3. **文本轉 ASL 符號（gloss）**  
   * 無論是用戶直接輸入文本，音頻還是語音轉文本，接下來的步驟都是一致的。  
   * Gemini API 接收文本 "I want to buy a coffee"，並將其轉換為對應的 ASL gloss。這些 gloss 是手語的中介符號，用來表達完整的句子含義。  
   * 利用 Cloud Function 自動執行這些文本轉換操作，生成的 ASL gloss 可能是多個詞的符號，例如 "I WANT BUY COFFEE"（這只是個例子）。  
4. **動作數據配對**  
   * 生成 ASL gloss 後，Cloud Function 會自動查詢 Firestore，查找與這些 gloss 對應的影片索引。  
   * Firestore 中存有 ASL gloss 和影片之間的對應關係，可以快速定位到每個 gloss 對應的動作影片。  
   * Cloud Storage 中存儲著這些手語動作的影片文件，根據 Firestore 中的索引，Cloud Function 會檢索並獲取對應的影片文件。  
   * 並會將檢測的圖片上傳到部署了ComfyUI 本地/雲端電腦,或者使用gemini更改workflow\_api.json 中VHS\_LoadVideoPath 的路徑指向影片文件路徑        
5. **生成 ASL 動作動畫**  (local)
   * 通過網路連接本地/雲端部署的stable diffusion/animatediff , 並使用 api 啟動 ComfyUI prompt workflow，根據查詢到的影片數據通過 DWPose Estimator  
   *  生成 ASL 人體姿態動畫。  
   * stable diffusion 根據關鍵詞生成虛擬人  
   * animatediff 將這些人體姿態動畫和stable diffusion 生成的虛擬人合成多張照片  
   * KSampler讓眾多照片合成為虛擬人動畫, 讓虛擬角色表達 "I want to buy a coffee" 的手語。  
6. **存儲至雲端**  
   * 最終生成的動畫會被上傳至 Google Cloud Storage，方便用戶隨時訪問和查看生成的手語動畫，並便於共享和分發。  
7. **工作流程協調**  
   * 整個過程由 Google Cloud Workflows 管理，每個步驟按正確的順序自動執行。Workflows 也負責監控每一步是否順利完成，並在發生錯誤時進行處理，確保系統的穩定性。

   #### **7\. 預期成果**

* 建立一個自動化的 ASL 虛擬人動畫生成系統，通過語音或文本輸入快速生成相應手語動畫，提升聽障人士的交流便利性。

