import React, { useEffect, useState } from "react";
import { Upload, FileText, Sparkles, AlertCircle, Loader2, CheckCircle2, X, BookOpen, RefreshCw, RotateCcw } from "lucide-react";
import api from "../utils/api";

const TABS = [
  { id: "summary", label: "Tóm tắt" },
  { id: "keyPoints", label: "Điểm chính" },
  { id: "structure", label: "Cấu trúc" },
  { id: "concepts", label: "Khái niệm" },
  { id: "full", label: "Toàn bộ phân tích" },
];

const DocumentAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [statusText, setStatusText] = useState("");
  const [jobs, setJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  const handleFileSelect = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    // Giới hạn định dạng giống backend: PDF, DOC, DOCX, TXT (ưu tiên cho AI)
    const allowed = /\.(pdf|doc|docx|txt)$/i;
    if (!allowed.test(selected.name)) {
      setError("Chỉ hỗ trợ các định dạng: PDF, DOC, DOCX, TXT.");
      setFile(null);
      setResult(null);
      return;
    }

    // Giới hạn kích thước ~10MB (khớp multer documents)
    const maxSize = 10 * 1024 * 1024;
    if (selected.size > maxSize) {
      setError("File quá lớn. Kích thước tối đa cho phép là 10MB.");
      setFile(null);
      setResult(null);
      return;
    }

    setError("");
    setFile(selected);
    setResult(null);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setResult(null);
    setError("");
  };

  const fetchJobs = async () => {
    try {
      setIsLoadingJobs(true);
      const res = await api.get("/ai/analyze-document-jobs?limit=10");
      if (res.data?.success) {
        setJobs(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch jobs error:", err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const pollJobUntilDone = async (jobId) => {
    const maxPollAttempts = 120; // ~4 minutes (120 * 2s)
    let attempts = 0;
    while (attempts < maxPollAttempts) {
      attempts += 1;
      const statusRes = await api.get(`/ai/analyze-document-status/${jobId}`);
      const statusData = statusRes.data?.data;

      if (!statusRes.data?.success || !statusData) {
        throw new Error("Không lấy được trạng thái phân tích.");
      }

      if (statusData.message) {
        setStatusText(statusData.message);
      }

      if (statusData.status === "done") {
        setResult(statusData.result || null);
        setActiveTab("summary");
        setStatusText("Phân tích hoàn tất.");
        await fetchJobs();
        return;
      }

      if (statusData.status === "failed") {
        await fetchJobs();
        throw new Error(statusData.error || "Phân tích tài liệu thất bại.");
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error("Hết thời gian chờ phân tích. Vui lòng thử lại.");
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Vui lòng chọn một file (PDF, DOC, DOCX hoặc TXT) trước khi phân tích.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setStatusText("Đang gửi yêu cầu phân tích...");

    try {
      const formData = new FormData();
      // Backend middleware `uploadFiles` sử dụng field name `files`
      formData.append("files", file);

      const response = await api.post("/ai/analyze-document-upload", formData);
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Không thể phân tích tài liệu.");
      }

      const jobId = response.data?.data?.jobId;
      if (!jobId) {
        throw new Error("Không nhận được mã job phân tích từ server.");
      }

      await fetchJobs();
      await pollJobUntilDone(jobId);
    } catch (err) {
      console.error("Analyze document error:", err);
      const message =
        err.response?.data?.message ||
        err.message ||
        "Đã xảy ra lỗi khi phân tích tài liệu. Vui lòng thử lại.";
      setError(message);
      setStatusText("");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetryJob = async (jobId) => {
    try {
      setIsAnalyzing(true);
      setError("");
      setStatusText("Đang gửi yêu cầu thử lại...");
      const res = await api.post(`/ai/analyze-document-retry/${jobId}`);
      if (!res.data?.success || !res.data?.data?.jobId) {
        throw new Error(res.data?.message || "Không thể retry job.");
      }
      await fetchJobs();
      await pollJobUntilDone(res.data.data.jobId);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Retry thất bại.");
      setStatusText("");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderTabContent = () => {
    if (!result) {
      return (
        <div className="text-sm text-gray-500">
          Chọn một file tài liệu và nhấn{" "}
          <span className="font-semibold text-blue-600">“Phân tích bằng AI”</span> để xem kết quả tại đây.
        </div>
      );
    }

    if (activeTab === "summary") {
      return (
        <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
          {result.summary || "Chưa có nội dung tóm tắt từ AI."}
        </div>
      );
    }

    if (activeTab === "keyPoints") {
      return (
        <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
          {result.keyPoints || "Chưa có danh sách điểm chính từ AI."}
        </div>
      );
    }

    if (activeTab === "structure") {
      return (
        <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
          {result.structure || "Chưa có phân tích cấu trúc tài liệu từ AI."}
        </div>
      );
    }

    if (activeTab === "concepts") {
      return (
        <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
          {result.concepts || "Chưa có danh sách khái niệm quan trọng từ AI."}
        </div>
      );
    }

    // full
    return (
      <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
        {result.fullAnalysis || "Chưa có toàn bộ nội dung phân tích từ AI."}
      </div>
    );
  };

  const renderMetadata = () => {
    if (!result?.metadata) return null;
    const { fileName, fileType, textLength, analyzedAt } = result.metadata;

    return (
      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--fb-text-secondary)] mt-3">
        {fileName && (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-[var(--fb-input)] border border-[var(--fb-divider)]">
            <FileText className="w-3 h-3 mr-1 text-[var(--fb-icon)] opacity-70" />
            {fileName}
          </span>
        )}
        {fileType && (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-[var(--fb-input)] border border-[var(--fb-divider)]">
            {fileType.toUpperCase()}
          </span>
        )}
        {typeof textLength === "number" && (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-[var(--fb-input)] border border-[var(--fb-divider)]">
            ~{Math.round(textLength / 1000)}k ký tự
          </span>
        )}
        {analyzedAt && (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-[var(--fb-input)] border border-[var(--fb-divider)]">
            {new Date(analyzedAt).toLocaleString("vi-VN")}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[var(--fb-surface)] text-[var(--fb-text-primary)] rounded-lg shadow-md border border-[var(--fb-divider)] overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-[var(--fb-divider)] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--fb-text-primary)] flex items-center">AI Document Analyzer</h3>
            <p className="text-xs text-[var(--fb-text-secondary)]">
              Tải lên tài liệu (PDF, Word, TXT) để AI tóm tắt và rút trích ý chính giúp bạn học nhanh hơn.
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center text-xs text-[var(--fb-text-secondary)] opacity-80 space-x-2">
          <BookOpen className="w-4 h-4" />
          <span>Hỗ trợ tài liệu học tập</span>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Upload area */}
        <div className="border-2 border-dashed rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[var(--fb-input)] border-[var(--fb-divider)]">
          <div className="flex items-center space-x-3">
            <div className="bg-[var(--fb-surface)] rounded-full p-2 shadow-sm border border-[var(--fb-divider)]">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--fb-text-primary)]">
                {file ? "Đã chọn tài liệu:" : "Chọn tài liệu để phân tích"}
              </p>
              <p className="text-xs text-[var(--fb-text-secondary)]">Hỗ trợ: PDF, DOC, DOCX, TXT • Tối đa 10MB</p>
              {file && (
                <p className="text-xs text-[var(--fb-text-secondary)] mt-1">
                  <span className="font-semibold">{file.name}</span>{" "}
                  <span className="text-[var(--fb-text-secondary)] opacity-80">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {file && (
              <button
                type="button"
                onClick={handleRemoveFile}
                className="inline-flex items-center px-3 py-1.5 text-xs border border-[var(--fb-divider)] rounded-lg text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)] transition-colors"
              >
                <X className="w-3 h-3 mr-1" />
                Xóa file
              </button>
            )}
            <label className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--fb-surface)] border border-[var(--fb-divider)] text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)] cursor-pointer transition-colors">
              <FileText className="w-3 h-3 mr-1.5" />
              Chọn file
              <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleFileSelect} />
            </label>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!file || isAnalyzing}
              className="inline-flex items-center px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Đang phân tích...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 mr-2" />
                  Phân tích bằng AI
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start space-x-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {!error && isAnalyzing && statusText && (
          <div className="flex items-start space-x-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
            <Loader2 className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin" />
            <p>{statusText}</p>
          </div>
        )}

        <div className="border border-[var(--fb-divider)] rounded-lg bg-[var(--fb-surface)]">
          <div className="px-3 py-2 border-b border-[var(--fb-divider)] flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--fb-text-primary)]">Lịch sử phân tích gần đây</span>
            <button
              type="button"
              onClick={fetchJobs}
              className="inline-flex items-center px-2 py-1 text-xs border border-[var(--fb-divider)] rounded-md hover:bg-[var(--fb-hover)]"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingJobs ? "animate-spin" : ""}`} />
              Làm mới
            </button>
          </div>
          <div className="p-3 space-y-2">
            {jobs.length === 0 ? (
              <p className="text-xs text-[var(--fb-text-secondary)]">Chưa có job nào.</p>
            ) : (
              jobs.map((job) => (
                <div key={job.jobId} className="flex items-center justify-between border border-[var(--fb-divider)] rounded-md px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--fb-text-primary)] truncate">
                      {job.metadata?.fileName || "Tài liệu"}
                    </p>
                    <p className="text-xs text-[var(--fb-text-secondary)]">
                      Trạng thái: {job.status} {typeof job.progress === "number" ? `(${job.progress}%)` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.status === "failed" && (
                      <button
                        type="button"
                        onClick={() => handleRetryJob(job.jobId)}
                        disabled={isAnalyzing}
                        className="inline-flex items-center px-2 py-1 text-xs rounded-md border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => pollJobUntilDone(job.jobId).catch((e) => setError(e.message))}
                      disabled={isAnalyzing}
                      className="inline-flex items-center px-2 py-1 text-xs rounded-md border border-[var(--fb-divider)] hover:bg-[var(--fb-hover)] disabled:opacity-50"
                    >
                      Xem
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {result && !error && (
          <div className="border border-[var(--fb-divider)] rounded-lg bg-[var(--fb-surface)]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--fb-divider)]">
              <div className="flex items-center space-x-2 text-xs text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Đã phân tích tài liệu thành công</span>
              </div>
            </div>

            <div className="px-3 pt-3">
              {/* Tabs */}
              <div className="flex flex-wrap gap-1 mb-3 border-b border-[var(--fb-divider)] pb-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-700 border border-blue-100"
                        : "text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="pb-3 text-sm text-[var(--fb-text-primary)]">{renderTabContent()}</div>

              {renderMetadata()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentAnalyzer;






