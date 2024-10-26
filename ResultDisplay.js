export function ResultDisplay({ result }) {
  if (!result) return null;

  try {
    const { original_text, gloss_response, video_response } = result;
    let glossData = null;
    let videoData = null;

    try {
      glossData = typeof gloss_response === 'string' ? JSON.parse(gloss_response) : gloss_response;
    } catch (e) {
      console.error('Gloss parsing error:', e);
    }

    try {
      videoData = typeof video_response === 'string' ? JSON.parse(video_response) : video_response;
    } catch (e) {
      console.error('Video parsing error:', e);
    }

    return (
      <div className="mt-8 space-y-6">
        {/* 原始文字 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
            原始文字
          </h3>
          <p className="text-lg text-gray-700">{original_text}</p>
        </div>

        {/* ASL Gloss */}
        {glossData && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              ASL Gloss
            </h3>
            <p className="text-lg font-medium text-gray-700">
              {glossData.gloss || JSON.stringify(glossData)}
            </p>
          </div>
        )}

        {/* 影片部分 */}
        {videoData && videoData.video_mappings && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <h3 className="text-lg font-semibold text-gray-800 p-6 border-b flex items-center">
              <span className="w-2 h-2 bg-pink-500 rounded-full mr-2"></span>
              手語影片
            </h3>
            <div className="divide-y">
              {videoData.video_mappings.map((mapping, index) => (
                <div key={index} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">
                      {mapping.gloss}
                    </h4>
                    <span className="text-sm text-gray-500">
                      {mapping.duration}秒
                    </span>
                  </div>
                  {mapping.video_url ? (
                    <video
                      controls
                      className="w-full rounded-lg"
                      src={mapping.video_url}
                    >
                      您的瀏覽器不支援影片播放
                    </video>
                  ) : (
                    <p className="text-red-600">影片連結無效</p>
                  )}
                  {mapping.metadata && (
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">類別：</span>
                        <span className="ml-2 text-gray-900">{mapping.metadata.category}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">難度：</span>
                        <span className="ml-2 text-gray-900">{mapping.metadata.difficulty}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error in ResultDisplay:', error);
    return (
      <div className="mt-8 p-6 bg-red-50 text-red-600 rounded-xl">
        <h3 className="font-semibold mb-2">錯誤</h3>
        <p>{error.message}</p>
        <pre className="mt-4 text-xs overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    );
  }
}
