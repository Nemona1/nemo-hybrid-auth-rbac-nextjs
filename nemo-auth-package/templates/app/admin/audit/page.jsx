'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useSidebar } from '@/context/SidebarContext';
import { 
  FileText, Shield, Search, Filter, Download, 
  Calendar, User, Activity, CheckCircle, XCircle,
  Eye, Clock, RefreshCw, AlertTriangle, ChevronLeft,
  ChevronRight, Loader2, Trash2, FileJson, X,
  Info, Server, Database, Lock, LogIn, UserPlus,
  Key, Mail, Settings, Globe
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminAuditPage() {
  const router = useRouter();
  const { collapsed } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' or 'security'
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    startDate: '',
    endDate: ''
  });
  const [availableFilters, setAvailableFilters] = useState({
    actions: { audit: [], security: [] },
    users: []
  });
  const [totals, setTotals] = useState({
    audit: 0,
    security: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20
  });
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkPermission();
  }, []);

  useEffect(() => {
    fetchTotals();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [activeTab, filters, pagination.page, searchTerm]);

  const checkPermission = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const user = await res.json();
        if (user.role?.name !== 'ADMIN') {
          toast.error('Access denied. Admin privileges required.');
          router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Permission check error:', error);
      router.push('/login');
    }
  };

  const fetchTotals = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const [auditTotalRes, securityTotalRes] = await Promise.all([
        fetch('/api/admin/audit-logs/count', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/security-logs/count', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      const auditTotalData = await auditTotalRes.json();
      const securityTotalData = await securityTotalRes.json();
      
      if (auditTotalData.success) {
        setTotals(prev => ({ ...prev, audit: auditTotalData.count || 0 }));
      }
      if (securityTotalData.success) {
        setTotals(prev => ({ ...prev, security: securityTotalData.count || 0 }));
      }
    } catch (error) {
      console.error('Fetch totals error:', error);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const endpoint = activeTab === 'audit' ? '/api/admin/audit-logs' : '/api/admin/security-logs';
      
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: ((pagination.page - 1) * pagination.limit).toString()
      });
      
      if (filters.action) params.append('action', filters.action);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (searchTerm) params.append('search', searchTerm);
      
      const res = await fetch(`${endpoint}?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        if (activeTab === 'audit') {
          setAuditLogs(data.data?.logs || []);
          setAvailableFilters(prev => ({
            ...prev,
            actions: { ...prev.actions, audit: data.data?.filters?.actions || [] },
            users: data.data?.filters?.users || prev.users
          }));
        } else {
          setSecurityLogs(data.data?.logs || []);
          setAvailableFilters(prev => ({
            ...prev,
            actions: { ...prev.actions, security: data.data?.filters?.actions || [] },
            users: data.data?.filters?.users || prev.users
          }));
        }
      }
    } catch (error) {
      console.error('Fetch logs error:', error);
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async (format = 'csv') => {
    setExporting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const params = new URLSearchParams({
        type: activeTab,
        format,
        ...(filters.action && { action: filters.action }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(searchTerm && { search: searchTerm })
      });
      
      const res = await fetch(`/api/admin/audit-logs/export?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.headers.get('Content-Disposition')?.split('filename=')[1] || `${activeTab}_logs_${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Logs exported successfully');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to export logs');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export logs');
    } finally {
      setExporting(false);
    }
  };

  const getActionIcon = (action) => {
    const iconMap = {
      'LOGIN_SUCCESS': LogIn,
      'LOGIN_FAILED': XCircle,
      'USER_REGISTERED': UserPlus,
      'EMAIL_VERIFIED': Mail,
      'PASSWORD_RESET_REQUESTED': Key,
      'ROLE_CREATED': Shield,
      'ROLE_ASSIGNED': Shield,
      'PERMISSION_GRANTED': Lock,
      'PERMISSION_REVOKED': Lock,
      'AUDIT_LOG_ACCESS': Eye,
      'SECURITY_LOG_ACCESS': Shield,
      'PROFILE_UPDATED': User,
      'CONTENT_CREATED': FileText,
      'CONTENT_UPDATED': FileText,
      'CONTENT_DELETED': Trash2,
      '2FA_ENABLED': Shield,
      '2FA_DISABLED': Shield,
      'SESSION_REVOKED': Trash2,
      'LOGOUT': LogIn
    };
    const IconComponent = iconMap[action] || Activity;
    return <IconComponent className="h-4 w-4" />;
  };

  const getActionBadge = (action, success = true) => {
    const isSuccess = success !== false;
    
    const badges = {
      'LOGIN_SUCCESS': { icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
      'LOGIN_ATTEMPT': { icon: Activity, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
      'LOGIN_FAILED': { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
      'USER_REGISTERED': { icon: UserPlus, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
      'EMAIL_VERIFIED': { icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
      'ROLE_APPLICATION_SUBMITTED': { icon: FileText, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
      'ROLE_APPLICATION_APPROVED': { icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
      'ROLE_APPLICATION_REJECTED': { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
      'PERMISSION_GRANTED': { icon: Shield, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
      'PERMISSION_REVOKED': { icon: Shield, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
      'SESSION_EXPIRED_INACTIVITY': { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
      'SESSION_REVOKED': { icon: Trash2, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
      'PASSWORD_RESET_REQUESTED': { icon: RefreshCw, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
      'PASSWORD_CHANGED_SUCCESSFULLY': { icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
      'AUDIT_LOG_ACCESS': { icon: Eye, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
      'SECURITY_LOG_ACCESS': { icon: Shield, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
      'AUDIT_EXPORT': { icon: Download, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
      '2FA_ENABLED': { icon: Shield, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
      '2FA_DISABLED': { icon: Shield, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
      '2FA_VERIFICATION_SUCCESS': { icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
      '2FA_VERIFICATION_FAILED': { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
      'ROLE_CREATED': { icon: Shield, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
      'ROLE_UPDATED': { icon: Shield, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
      'ROLE_DELETED': { icon: Trash2, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
      'PROFILE_UPDATED': { icon: User, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
      'CONTENT_CREATED': { icon: FileText, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' },
      'CONTENT_UPDATED': { icon: FileText, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
      'CONTENT_DELETED': { icon: Trash2, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' }
    };
    
    const badge = badges[action] || { icon: Activity, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-500/10' };
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.color}`}>
        <Icon className="h-3 w-3" />
        {action?.replace(/_/g, ' ')}
      </span>
    );
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLog(null);
  };

  const handleModalBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const displayedLogs = activeTab === 'audit' ? auditLogs : securityLogs;
  const totalCount = activeTab === 'audit' ? totals.audit : totals.security;
  const currentActions = availableFilters.actions[activeTab] || [];

  const tabs = [
    { id: 'audit', label: 'Audit Logs', icon: FileText, count: totals.audit, description: 'General user actions and system events' },
    { id: 'security', label: 'Security Logs', icon: Shield, count: totals.security, description: 'Authentication and security-critical events' }
  ];

  const resetFilters = () => {
    setFilters({
      action: '',
      userId: '',
      startDate: '',
      endDate: ''
    });
    setSearchTerm('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 p-8 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                  Audit & Security
                </h1>
                <p className="text-muted mt-2">
                  Monitor system activity and security events in real-time
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    fetchTotals();
                    fetchLogs();
                  }}
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                <Button
                  variant="primary"
                  onClick={() => exportLogs('csv')}
                  disabled={exporting}
                  className="gap-2"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Export CSV
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all relative ${
                    isActive 
                      ? 'text-primary' 
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <div className="text-left">
                    <div>{tab.label}</div>
                    <div className="text-xs opacity-70">{tab.description}</div>
                  </div>
                  <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-muted/20 text-muted'
                  }`}>
                    {tab.count.toLocaleString()}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Filters Bar */}
          <Card className="p-6 mb-6 border border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Filters
              </h2>
              {(filters.action || filters.userId || filters.startDate || filters.endDate || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear all filters
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field pl-9"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Action Type</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  className="input-field"
                >
                  <option value="">All Actions</option>
                  {currentActions.map((action) => (
                    <option key={action.action} value={action.action}>
                      {action.action?.replace(/_/g, ' ')} ({action._count})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">User</label>
                <select
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  className="input-field"
                >
                  <option value="">All Users</option>
                  {availableFilters.users?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} ({user.firstName} {user.lastName})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          </Card>

          {/* Logs Table */}
          <Card className="overflow-hidden border border-border/50 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Action</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">IP Address</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <p className="text-muted mt-2">Loading logs...</p>
                      </td>
                    </tr>
                  ) : displayedLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <AlertTriangle className="h-12 w-12 text-muted mx-auto mb-3" />
                        <p className="text-muted">No logs found</p>
                        <p className="text-sm text-muted/70 mt-1">Try adjusting your filters</p>
                      </td>
                    </tr>
                  ) : (
                    displayedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/5 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">
                            {formatTimestamp(log.timestamp || log.createdAt)}
                          </div>
                          <div className="text-xs text-muted">
                            {new Date(log.timestamp || log.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {log.user?.firstName} {log.user?.lastName}
                              </div>
                              <div className="text-xs text-muted">{log.user?.email || 'System'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getActionBadge(log.action, log.success)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="text-xs text-muted bg-muted/20 px-2 py-1 rounded">
                            {log.ipAddress || 'Unknown'}
                          </code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.success !== undefined ? (
                            log.success ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                <CheckCircle className="h-3 w-3" />
                                Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                <XCircle className="h-3 w-3" />
                                Failed
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted">
                              <Activity className="h-3 w-3" />
                              Info
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(log)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {!loading && displayedLogs.length > 0 && (
              <div className="px-6 py-4 border-t border-border flex justify-between items-center">
                <p className="text-sm text-muted">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, totalCount)} of {totalCount.toLocaleString()} logs
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page * pagination.limit >= totalCount}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </main>
      </div>

      {/* Modal for Log Details */}
      {showModal && selectedLog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all"
          onClick={handleModalBackdropClick}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  {getActionIcon(selectedLog.action)}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Log Details</h3>
                  <p className="text-sm text-muted">Detailed information about this event</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg hover:bg-muted/20 transition-colors"
              >
                <X className="h-5 w-5 text-muted" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {/* Event Summary */}
              <div className="mb-6 p-4 rounded-lg bg-muted/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted">Event Summary</span>
                  {getActionBadge(selectedLog.action, selectedLog.success)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted mb-1">Timestamp</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(selectedLog.timestamp || selectedLog.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">IP Address</p>
                    <code className="text-sm bg-muted/20 px-2 py-1 rounded">
                      {selectedLog.ipAddress || 'Unknown'}
                    </code>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">User Agent</p>
                    <p className="text-sm text-foreground break-words">
                      {selectedLog.userAgent || 'Not recorded'}
                    </p>
                  </div>
                  {selectedLog.resourceType && (
                    <div>
                      <p className="text-xs text-muted mb-1">Resource Type</p>
                      <p className="text-sm text-foreground">{selectedLog.resourceType}</p>
                    </div>
                  )}
                  {selectedLog.resourceId && (
                    <div>
                      <p className="text-xs text-muted mb-1">Resource ID</p>
                      <code className="text-xs bg-muted/20 px-2 py-1 rounded">
                        {selectedLog.resourceId}
                      </code>
                    </div>
                  )}
                </div>
              </div>

              {/* User Info */}
              {selectedLog.user && (
                <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-transparent">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    User Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted">Name</p>
                      <p className="text-sm text-foreground">
                        {selectedLog.user.firstName} {selectedLog.user.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Email</p>
                      <p className="text-sm text-foreground">{selectedLog.user.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">User ID</p>
                      <code className="text-xs bg-muted/20 px-2 py-1 rounded">
                        {selectedLog.user.id}
                      </code>
                    </div>
                  </div>
                </div>
              )}

              {/* Details */}
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-primary" />
                    Additional Details
                  </h4>
                  <pre className="p-4 bg-muted/5 rounded-lg text-xs overflow-auto max-h-96 font-mono">
                    {typeof selectedLog.details === 'string' 
                      ? (() => {
                          try {
                            return JSON.stringify(JSON.parse(selectedLog.details), null, 2);
                          } catch {
                            return selectedLog.details;
                          }
                        })()
                      : JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <Button
                variant="outline"
                onClick={closeModal}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={closeModal}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}