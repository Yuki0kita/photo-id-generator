'use client';
import React, { useState } from 'react';
import { Upload, Download, Loader2, AlertCircle } from 'lucide-react';

export default function PhotoIDGenerator() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('画像ファイルを選択してください');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
      setGeneratedImage('');
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      const response = await fetch('/api/generate', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setGeneratedImage(data.image);
    } catch (err) {
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `photo-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mt-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">証明写真ジェネレーター</h1>
          <p className="text-gray-600 mb-8">写真をアップロードすると、自動で証明写真規格に加工します</p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="text-red-500" size={20} />
              <p className="text-red-700">{error}</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">元の画像</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload size={48} className="text-gray-400" />
                      <p className="text-gray-600">クリックして画像を選択</p>
                    </div>
                  )}
                </label>
              </div>
              <button onClick={handleGenerate} disabled={!selectedFile || loading}
                className="w-full mt-6 bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="animate-spin" size={20} />処理中...</> : '証明写真を生成'}
              </button>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">生成された証明写真</h2>
              <div className="border-2 border-gray-200 rounded-lg p-8 min-h-[300px] flex items-center justify-center bg-gray-50">
                {generatedImage ? (
                  <img src={generatedImage} alt="Generated" className="max-h-64 rounded-lg shadow-lg" />
                ) : (
                  <p className="text-gray-400">生成された画像がここに表示されます</p>
                )}
              </div>
              {generatedImage && (
                <button onClick={handleDownload}
                  className="w-full mt-6 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2">
                  <Download size={20} />ダウンロード
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}