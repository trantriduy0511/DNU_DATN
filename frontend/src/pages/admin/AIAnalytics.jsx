import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  Calendar, 
  MessageSquare,
  Sparkles,
  Lightbulb,
  AlertCircle,
  Loader,
  RefreshCw
} from 'lucide-react';
import api from '../../utils/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AIAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [aiInsights, setAiInsights] = useState('');
  const [prediction, setPrediction] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [timeRange, setTimeRange] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ai/analytics', {
        params: { timeRange, analysisType: 'comprehensive' }
      });
      
      if (res.data.success) {
        setAnalyticsData(res.data.data);
        setAiInsights(res.data.aiInsights);
      } else {
        console.error('Analytics API returned error:', res.data.message);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      console.error('Error details:', error.response?.data);
      alert('Lỗi khi tải dữ liệu phân tích: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchPrediction = async () => {
    try {
      setPredicting(true);
      const res = await api.get('/ai/predict', {
        params: { days: 30 }
      });
      
      if (res.data.success) {
        setPrediction(res.data.prediction);
      }
    } catch (error) {
      console.error('Error fetching prediction:', error);
    } finally {
      setPredicting(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      setRecommending(true);
      const res = await api.get('/ai/recommendations');
      
      if (res.data.success) {
        setRecommendations(res.data.recommendations);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setRecommending(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Đang phân tích dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Không thể tải dữ liệu phân tích</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-blue-500" />
                AI Phân Tích Dữ Liệu
              </h1>
              <p className="text-gray-600 mt-2">
                Phân tích thông minh và dự báo xu hướng cho hệ thống DNU Social
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>7 ngày</option>
                <option value={30}>30 ngày</option>
                <option value={90}>90 ngày</option>
              </select>
              <button
                onClick={fetchAnalytics}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Làm mới
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            {[
              { id: 'overview', label: 'Tổng Quan', icon: BarChart3 },
              { id: 'insights', label: 'AI Insights', icon: Lightbulb },
              { id: 'prediction', label: 'Dự Báo', icon: TrendingUp },
              { id: 'recommendations', label: 'Khuyến Nghị', icon: Sparkles }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={FileText}
                label="Tổng Bài Viết"
                value={formatNumber(analyticsData.overview.totalPosts)}
                change={`+${analyticsData.overview.postsLast30Days} trong ${timeRange} ngày`}
                color="blue"
              />
              <StatCard
                icon={Users}
                label="Tổng Người Dùng"
                value={formatNumber(analyticsData.overview.totalUsers)}
                change={`+${analyticsData.overview.newUsersLast30Days} người mới`}
                color="green"
              />
              <StatCard
                icon={Calendar}
                label="Sự Kiện"
                value={formatNumber(analyticsData.overview.totalEvents)}
                change={`${analyticsData.overview.upcomingEvents} sắp diễn ra`}
                color="purple"
              />
              <StatCard
                icon={MessageSquare}
                label="Bình Luận"
                value={formatNumber(analyticsData.overview.totalComments)}
                change={`+${analyticsData.overview.commentsLast30Days} trong ${timeRange} ngày`}
                color="orange"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Activity */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-bold mb-4">Hoạt Động Hàng Ngày (7 ngày)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="posts" stroke="#3b82f6" name="Bài viết" />
                    <Line type="monotone" dataKey="comments" stroke="#10b981" name="Bình luận" />
                    <Line type="monotone" dataKey="newUsers" stroke="#f59e0b" name="Người dùng mới" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Posts by Category */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-bold mb-4">Bài Viết Theo Danh Mục</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.posts.byCategory}
                      dataKey="count"
                      nameKey="_id"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {analyticsData.posts.byCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Users by Major */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-bold mb-4">Người Dùng Theo Chuyên Ngành</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.users.byMajor}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Events by Category */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-bold mb-4">Sự Kiện Theo Danh Mục</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.events.byCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Posts & Users */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-bold mb-4">Top 5 Bài Viết Phổ Biến</h3>
                <div className="space-y-3">
                  {analyticsData.engagement.topPosts.map((post, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {post.title || post.content?.substring(0, 50) + '...'}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span>❤️ {post.likesCount}</span>
                          <span>💬 {post.commentsCount}</span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {post.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-bold mb-4">Top 10 Người Dùng Tích Cực</h3>
                <div className="space-y-3">
                  {analyticsData.engagement.topUsers.map((user, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600">
                          {user.studentRole || 'Sinh viên'} • {user.postsCount} bài viết
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Insights Tab */}
        {activeTab === 'insights' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="w-6 h-6 text-yellow-500" />
              <h2 className="text-2xl font-bold">AI Insights & Phân Tích</h2>
            </div>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {aiInsights || 'Đang tải insights...'}
              </div>
            </div>
          </div>
        )}

        {/* Prediction Tab */}
        {activeTab === 'prediction' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-blue-500" />
                <h2 className="text-2xl font-bold">Dự Báo Xu Hướng</h2>
              </div>
              <button
                onClick={fetchPrediction}
                disabled={predicting}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
              >
                {predicting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Tạo dự báo mới
                  </>
                )}
              </button>
            </div>
            {prediction ? (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {prediction}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nhấn "Tạo dự báo mới" để xem dự báo xu hướng</p>
              </div>
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-purple-500" />
                <h2 className="text-2xl font-bold">Khuyến Nghị Cải Thiện</h2>
              </div>
              <button
                onClick={fetchRecommendations}
                disabled={recommending}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2"
              >
                {recommending ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Tạo khuyến nghị mới
                  </>
                )}
              </button>
            </div>
            {recommendations ? (
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {recommendations}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nhấn "Tạo khuyến nghị mới" để xem các khuyến nghị cải thiện</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, change, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-2">{change}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default AIAnalytics;

