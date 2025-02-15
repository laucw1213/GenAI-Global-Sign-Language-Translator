import { useState } from 'react';
import axios from 'axios';

const WORKFLOW_URL = process.env.REACT_APP_WORKFLOW_URL;

const useWorkflow = (token, refreshToken) => {
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
    // 清除旧的结果
    setResult(null);
    
    if (!token) {
      setError("Authentication required");
      return;
    }
  
    if (!text.trim()) {
      setError("Please enter text");
      return;
    }
  
    try {
      setLoading(true);
      setError(null);
      
      // 确保text是字符串
      const textToProcess = typeof text === 'object' ? JSON.stringify(text) : String(text).trim();
      
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
        setResult([JSON.parse(executionResult)]);
      } else {
        throw new Error('Invalid workflow response');
      }
    } catch (err) {
      console.error("Processing error:", err);
      setError(err.message || 'Processing failed');
      setResult(null);
      
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
