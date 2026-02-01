'use client';

import { useState, useEffect } from 'react';

export function SurveyResults() {
  const [surveyFiles, setSurveyFiles] = useState<string[]>([]);
  const [totalSurveys, setTotalSurveys] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSurveyList = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/survey');
      if (!response.ok) {
        throw new Error('Failed to load survey list');
      }
      const data = await response.json();
      setSurveyFiles(data.files || []);
      setTotalSurveys(data.totalSurveys || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurveyList();
  }, []);

  const downloadAllSurveys = () => {
    // For now, we'll just show the directory location
    // In a production app, you'd implement actual file downloads
    alert(
      `Survey responses are saved in the survey-responses directory at the project root. Total surveys: ${totalSurveys}`
    );
  };

  return (
    <div className="border-t border-gray-700 p-4 bg-gray-900">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-200">
          Survey Responses
        </h3>
        <button
          onClick={loadSurveyList}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-200"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-400 mb-2">Error: {error}</div>
      )}

      <div className="text-xs text-gray-400 mb-2">
        Total surveys collected: <span className="font-semibold">{totalSurveys}</span>
      </div>

      {totalSurveys > 0 ? (
        <div className="space-y-2">
          <div className="max-h-32 overflow-y-auto">
            {surveyFiles.map((file, idx) => (
              <div
                key={idx}
                className="text-xs text-gray-300 py-1 px-2 bg-gray-800 rounded mb-1"
              >
                {file}
              </div>
            ))}
          </div>
          <button
            onClick={downloadAllSurveys}
            className="w-full text-xs px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium"
          >
            View Survey Files Location
          </button>
          <div className="text-xs text-gray-500 italic">
            Survey files are saved to: <code>survey-responses/</code>
          </div>
        </div>
      ) : (
        <div className="text-xs text-gray-500 italic">
          No surveys completed yet. Start a survey to collect responses!
        </div>
      )}
    </div>
  );
}
