import { useState } from 'react';
import axios from 'axios';

const WORKFLOW_URL = process.env.REACT_APP_WORKFLOW_URL;

const useWorkflow = (token, refreshToken, user, recordTranslation) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const checkExecutionStatus = async (executionName) => {
    const maxAttempts = 100;
    let attempts = 0;
    let executionResult = null;

    while (!executionResult && attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusResponse = await axios.get(
        `https://workflowexecutions.googleapis.com/v1/${executionName}`,
        {
          headers: { "Authorization": `Bearer ${token}` }
        }
      );
      
      if (statusResponse.data.state === "SUCCEEDED") {
        executionResult = statusResponse.data.result;
        break;
      } else if (statusResponse.data.state === "FAILED") {
        throw new Error(statusResponse.data.error?.message || 'Workflow failed');
      }
    }

    if (!executionResult) {
      throw new Error('Processing timeout');
    }

    return executionResult;
  };

  const processText = async (text) => {
    // 清除舊的結果
    setResult(null);
    
    if (!token) {
      setError("Authentication required");
      return;
    }
  
    if (!text.trim()) {
      setError("Please enter text");
      return;
    }
  
    const startTime = Date.now();
    let textToProcess;
    
    try {
      setLoading(true);
      setError(null);
      
      // 確保text是字符串
      textToProcess = typeof text === 'object' ? JSON.stringify(text) : String(text).trim();
      
      const requestBody = {
        argument: JSON.stringify({ 
          text: textToProcess
        }),
        callLogLevel: "CALL_LOG_LEVEL_UNSPECIFIED"
      };
  
      console.log('Sending to workflow:', requestBody);
  
      const response = await axios.post(WORKFLOW_URL, requestBody, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.data?.name) {
        const executionResult = await checkExecutionStatus(response.data.name);
        const parsedResult = JSON.parse(executionResult);
        setResult(parsedResult);

        const processingTime = (Date.now() - startTime) / 1000; // 轉換為秒

        // 記錄成功的翻譯
        if (user && recordTranslation) {
          await recordTranslation(user.uid, {
            input: textToProcess,
            output: parsedResult.gloss_response?.gloss || '',
            success: true,
            processing_time: processingTime
          });
        }
      } else {
        throw new Error('Invalid workflow response');
      }
    } catch (err) {
      console.error("Processing error:", err);
      setError(err.message || 'Processing failed');
      setResult(null);
      
      const processingTime = (Date.now() - startTime) / 1000; // 轉換為秒

      // 記錄失敗的翻譯
      if (user && recordTranslation) {
        await recordTranslation(user.uid, {
          input: textToProcess,
          output: '',
          success: false,
          processing_time: processingTime
        });
      }
      
      if (err.response?.status === 401) {
        refreshToken();
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    result,
    error,
    processText
  };
};

export default useWorkflow;
