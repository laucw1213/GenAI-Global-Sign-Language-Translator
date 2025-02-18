# GenAI-powered Global Sign Language Translator

[English](#genai-powered-global-sign-language-translator-english) | [繁體中文](#基於生成式ai的全球手語翻譯器-繁體中文)

---

# GenAI-powered Global Sign Language Translator (English)

## Table of Contents
- [Introduction](#introduction)
- [Try it](#try-it)
- [System Architecture](#system-architecture)
- [Core Features](#core-features)
- [Workflow](#workflow)
- [Technical Implementation](#technical-implementation)
- [Vision](#vision)

## Introduction

GenAI-powered Global Sign Language Translator is an innovative sign language translation tool designed to break down communication barriers between hearing and deaf communities. By integrating Gemini 2.0 Flash AI model, this tool enables the conversion of multilingual text and speech into American Sign Language (ASL). The system supports various input methods, including text input, voice recording, and audio file upload, generating corresponding sign language videos within 5 seconds. Users can better learn and understand sign language through adjustable playback speeds (0.1x-1x) and loop playback functionality.

In this digital age, communication barriers should not create gaps between people. Sign language is not just a communication tool but an essential part of deaf culture. This project aims to provide a convenient tool for the general public to communicate easily with the deaf community through modern technology. It's not just a technological innovation but an important tool for promoting social inclusion.

## Try it

Visit our website: [ASL Translator](https://storage.googleapis.com/asl-translator-website/index.html)

## System Architecture

![System Architecture](architecture.png)

### Architecture Overview
1. **Client Side**
    - Desktop and Mobile browser support
    - Text, voice, and audio file input
    - Whisper API integration for audio transcription
    - Responsive user interface

2. **Frontend (Firebase)**
    - Firebase App Hosting for web application
    - Firebase Authentication for secure access
    - HTML/CSS/JavaScript implementation
    - React.js-based responsive interface

3. **Security Layer**
    - Firebase Authentication with OAuth 2.0
    - Cloud Functions for token management
    - Secure API access control
    - Rate limiting and request validation

4. **Core Processing (Workflows)**
    - Sentence cache for performance optimization
    - Cloud Translation API integration
    - Vertex AI (Gemini 2.0 flash) for ASL generation
    - Video matching and processing

5. **Data Storage**
    - Firestore Collections:
        * sentence_cache: Performance optimization
        * asl_mappings: Sign language data
    - Cloud Storage:
        * Video Dataset storage
        * ASL Video delivery
    - ComfyUI for video processing

## Core Features

### System Features
- **Quick Response**: 5-second translation and video generation
- **Multilingual Support**: Automatic language detection
- **Accurate Translation**: AI-powered sign language conversion
- **Reliable Service**: Cloud-based stability

### Input Features
- **Multilingual Text Input**: Real-time input support
- **Voice Recording**: 10-second voice input
- **Audio File Upload**: File processing support

### Video Playback Features
- **Speed Control**: 0.1x-1x adjustable speed
- **Loop Playback**: Learning support
- **Playback Control**: Full video controls
- **Progress Display**: Real-time progress

## Workflow

### Process Flow
1. **Input Processing**
    - User authentication (OAuth 2.0)
    - Text/voice/audio input handling
    - Audio transcription via Whisper API
    - Input validation and sanitization

2. **Cache and Translation**
    - Check sentence cache (performance optimization)
    - Language detection and automatic translation
    - Cache hit strategies:
        * Direct return of existing translations
        * Periodic updates of popular content
        * Smart preloading of related content

3. **Sign Language Processing**
    - ASL Gloss generation via Vertex AI
    - Expression optimization and grammar adjustment
    - Cultural adaptation and localization
    - Quality control and validation

4. **Video Generation**
    - Smart ASL video matching from database
    - Video combination with seamless transitions
    - Adaptive quality control
    - Efficient URL generation and delivery

5. **Performance Optimization**
    - Intelligent cache update strategies:
        * Usage frequency based
        * Time-based decay
        * Dynamic content updates
    - Response time optimization:
        * Server-side rendering
        * Resource preloading
        * Dynamic resource allocation
    - Resource management:
        * Auto-scaling
        * Load balancing
        * Failover handling

6. **Security Measures**
    - Multi-layer authentication:
        * JWT token validation
        * Session management
        * Permission control
    - API security:
        * Request rate limiting
        * Parameter validation
        * CORS policies
    - Monitoring and auditing:
        * Access logging
        * Anomaly detection
        * Real-time alerts

## Technical Implementation

### Core Technologies
- **Frontend Framework**: React.js with Tailwind CSS
- **Cloud Platform**: Google Cloud Platform
- **Authentication**: Firebase Authentication
- **AI Models**:
    * Gemini 2.0 Flash AI for ASL generation
    * Whisper API for speech recognition
- **Storage Solutions**:
    * Firestore for data management
    * Cloud Storage for video files
- **Processing Tools**:
    * Cloud Translation API
    * ComfyUI for video processing
    * Cloud Functions for authentication

### AI Model Application
#### Gemini 2.0 Flash AI Working Process
1. **Natural Language Understanding**
    - Semantic structure analysis
    - Context comprehension
    - Linguistic pattern recognition

2. **Sign Language Generation**
    - Semantic decomposition into basic units
    - Sign symbol mapping and selection
    - Grammar structure optimization
    - Expression sequence arrangement

3. **Quality Enhancement**
    - Context-aware refinement
    - Cultural adaptation
    - Expression naturality verification

### Video Generation Process
#### Video Mapping Algorithm
1. **Symbol Analysis**
    - Parse sign language symbol sequence
    - Identify compound expressions
    - Determine temporal relationships

2. **Video Matching**
    - Exact matching with standard sign videos
    - Combination strategy for complex expressions
    - Smooth transition optimization

3. **Performance Optimization**
    - Local caching of frequent segments
    - Context-based preloading
    - Streaming optimization

### Database Design
#### Firestore Data Structure

**sentence_cache Collection**
```json
{
    "gloss_text": "I WANT BUY COFFEE",                 // Sign language text
    "timestamp": "2025-02-14T04:49:17.311Z",          // Creation time
    "video_mappings": [                                // Video mapping array
        {
            "gloss": "I",                              // Individual sign
            "video_url": "https://storage.googleapis.com/genasl-video-files/I.mp4"  // Corresponding video URL
        },
        {
            "gloss": "WANT",
            "video_url": "https://storage.googleapis.com/genasl-video-files/WANT.mp4"
        },
        {
            "gloss": "BUY",
            "video_url": "https://storage.googleapis.com/genasl-video-files/BUY.mp4"
        },
        {
            "gloss": "COFFEE",
            "video_url": "https://storage.googleapis.com/genasl-video-files/COFFEE.mp4"
        }
    ]
}
```

**asl_mappings Collection**
```json
{
    "category": "general",                              // Sign language category
    "created_at": "2024-11-17T07:33:17.349Z",         // Creation time
    "gloss": "TEST",                                   // Sign symbol
    "metadata": {
        "format": "video/mp4"                          // Video format
    },
    "video_info": {
        "content_type": "video/mp4",                   // Content type
        "created": "2024-11-08T13:21:05.823Z",        // Video creation time
        "public_url": "https://storage.googleapis.com/genasl-video-files/TEST.mp4", // Video URL
        "size": 286522,                                // File size (bytes)
        "updated": "2024-11-08T13:21:05.823Z"         // Last update time
    },
    "video_path": "TEST.mp4"                           // Video file path
}
```

### Service Components
1. **Text-to-Gloss Service**
    - Language processing
    - Sign generation
    - Error handling

2. **Gloss-to-Video Service**
    - Video management
    - Access optimization
    - URL handling

## Vision

This project is not just a technical solution but a social innovation initiative. Through this tool, we aim to:

1. Reduce communication barriers and promote social inclusion
2. Provide convenient sign language learning tools
3. Enhance understanding of deaf culture
4. Promote technology-enabled social equality

---

# 基於生成式AI的全球手語翻譯器 (繁體中文)

## 目錄
- [項目簡介](#項目簡介)
- [立即體驗](#立即體驗)
- [系統架構](#系統架構)
- [核心功能](#核心功能)
- [工作流程](#工作流程)
- [技術實現](#技術實現)
- [項目願景](#項目願景)

## 項目簡介

基於生成式AI的全球手語翻譯器是一個創新的手語翻譯工具，旨在打破聾啞人士與普通人之間的溝通障礙。通過整合Gemini 2.0 Flash AI模型，該工具能夠實現多語言文本和語音到美國手語（ASL）的轉換。系統支持多種輸入方式，包括文本輸入、語音錄製和音頻文件上傳，並在5秒內生成對應的手語視頻。用戶可以通過可調節的播放速度（0.1x-1x）和循環播放功能，更好地學習和理解手語。

在這個數字時代，溝通的障礙不應該成為人與人之間的隔閡。手語不僅是一種溝通工具，更是聾啞人士文化身份的重要組成部分。本項目旨在通過現代科技，為普通人提供一個便捷的工具，讓他們能夠輕鬆地與聾啞人士進行交流。這不僅是一個科技創新，更是促進社會共融的重要工具，期望能為聾啞人士與普通人之間搭建一座雙向互動的溝通橋樑。

## 立即體驗

訪問我們的網站：[ASL Translator](https://storage.googleapis.com/asl-translator-website/index.html)

## 系統架構

![系統架構圖](architecture.png)

### 架構說明
1. **客戶端**
    - 支持桌面和移動端瀏覽器
    - 文本、語音和音頻文件輸入
    - Whisper API音頻轉錄集成
    - 響應式用戶界面

2. **前端（Firebase）**
    - Firebase應用托管
    - Firebase身份認證
    - HTML/CSS/JavaScript實現
    - 基於React.js的響應式界面

3. **安全層**
    - 基於OAuth 2.0的Firebase認證
    - 用於令牌管理的Cloud Functions
    - 安全的API訪問控制
    - 請求限制和驗證

4. **核心處理（Workflows）**
    - 句子緩存優化性能
    - Cloud Translation API集成
    - Vertex AI（Gemini 2.0 flash）生成ASL
    - 視頻匹配和處理

5. **數據存儲**
    - Firestore集合：
        * sentence_cache：性能優化
        * asl_mappings：手語數據
    - Cloud Storage：
        * 視頻數據集存儲
        * ASL視頻分發
    - ComfyUI視頻處理

## 核心功能

### 系統特點
- **快速響應**：5秒內完成處理
- **多語言支持**：自動語言檢測
- **準確翻譯**：AI驅動的轉換
- **穩定可靠**：雲端服務保障

### 輸入功能
- **多語言文本**：實時輸入支持
- **語音錄製**：10秒語音輸入
- **文件上傳**：音頻處理支持

### 視頻播放功能
- **速度調節**：0.1x-1x可調
- **循環播放**：學習輔助
- **播放控制**：完整控制項
- **進度顯示**：實時更新

## 工作流程

### 處理流程
1. **輸入處理**
    - 用戶身份認證（OAuth 2.0）
    - 文本/語音/音頻輸入處理
    - 通過Whisper API進行音頻轉錄
    - 輸入驗證和清理

2. **緩存和翻譯**
    - 檢查句子緩存（提升性能）
    - 語言檢測和自動翻譯
    - 緩存命中策略：
        * 直接返回已存在翻譯
        * 定期更新熱門內容
        * 智能預加載相關內容

3. **手語處理**
    - 通過Vertex AI生成ASL Gloss
    - 表達優化和語法調整
    - 文化適應和本地化
    - 質量控制和驗證

4. **視頻生成**
    - 從數據庫智能匹配ASL視頻
    - 視頻組合和無縫過渡處理
    - 自適應質量控制
    - 高效URL生成和分發

5. **性能優化**
    - 智能緩存更新策略：
        * 基於使用頻率
        * 基於時間衰減
        * 動態內容更新
    - 響應時間優化：
        * 服務器端渲染
        * 資源預加載
        * 動態資源分配
    - 資源管理：
        * 自動擴展
        * 負載均衡
        * 故障轉移

6. **安全措施**
    - 多層認證機制：
        * JWT令牌驗證
        * 會話管理
        * 權限控制
    - API安全：
        * 請求限流
        * 參數驗證
        * CORS策略
    - 監控和審計：
        * 訪問日誌
        * 異常檢測
        * 實時警報

## 技術實現

### 核心技術
- **前端框架**：React.js與Tailwind CSS
- **雲平台**：Google Cloud Platform
- **身份認證**：Firebase Authentication
- **AI模型**：
    * Gemini 2.0 Flash AI用於ASL生成
    * Whisper API用於語音識別
- **存儲解決方案**：
    * Firestore用於數據管理
    * Cloud Storage用於視頻文件
- **處理工具**：
    * Cloud Translation API
    * ComfyUI用於視頻處理
    * Cloud Functions用於認證

### AI模型應用
#### Gemini 2.0 Flash AI 工作流程
1. **自然語言理解**
    - 語義結構分析
    - 上下文理解
    - 語言模式識別

2. **手語生成**
    - 語義單元分解
    - 手語符號映射與選擇
    - 語法結構優化
    - 表達序列編排

3. **質量提升**
    - 上下文相關性優化
    - 文化適應性調整
    - 表達自然度驗證

### 視頻生成流程
#### 視頻映射算法
1. **符號分析**
    - 解析手語符號序列
    - 識別複合表達
    - 確定時序關係

2. **視頻匹配**
    - 標準手語視頻精確匹配
    - 複雜表達組合策略
    - 平滑過渡優化

3. **性能優化**
    - 常用片段本地緩存
    - 基於上下文的預加載
    - 流式傳輸優化

### 數據庫設計
#### Firestore 數據結構

**sentence_cache 集合**
```json
{
    "gloss_text": "I WANT BUY COFFEE", // 手語文本
    "timestamp": "2025-02-14T04:49:17.311Z", // 創建時間
    "video_mappings": [ // 視頻映射數組
        {
            "gloss": "I", // 單個手語符號
            "video_url": "https://storage.googleapis.com/genasl-video-files/I.mp4"  // 對應視頻URL
        },
        {
            "gloss": "WANT",
            "video_url": "https://storage.googleapis.com/genasl-video-files/WANT.mp4"
        },
        {
            "gloss": "BUY",
            "video_url": "https://storage.googleapis.com/genasl-video-files/BUY.mp4"
        },
        {
            "gloss": "COFFEE",
            "video_url": "https://storage.googleapis.com/genasl-video-files/COFFEE.mp4"
        }
    ]
}
```

**asl_mappings 集合**
```json
{
    "category": "general", // 手語類別
    "created_at": "2024-11-17T07:33:17.349Z", // 創建時間
    "gloss": "TEST", // 手語符號
    "metadata": {
        "format": "video/mp4" // 視頻格式
    },
    "video_info": {
        "content_type": "video/mp4", // 內容類型
        "created": "2024-11-08T13:21:05.823Z",  // 視頻創建時間
        "public_url": "https://storage.googleapis.com/genasl-video-files/TEST.mp4", // 視頻URL
        "size": 286522, // 文件大小（字節）
        "updated": "2024-11-08T13:21:05.823Z" // 更新時間
    },
    "video_path": "TEST.mp4" // 視頻文件路徑
}
```

### 服務組件
1. **文本轉手語服務**
    - 語言處理
    - 符號生成
    - 錯誤處理

2. **手語轉視頻服務**
    - 視頻管理
    - 訪問優化
    - URL處理

## 項目願景

本項目不僅僅是一個技術解決方案，更是一次社會創新的嘗試。我們期望通過這個工具：

1. 降低溝通障礙，促進社會包容
2. 提供便捷的手語學習工具
3. 增進對聾啞人士文化的理解
4. 推動科技賦能社會平等
