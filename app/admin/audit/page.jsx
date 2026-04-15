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
  ChevronRight, Loader2, Trash2, FileJson
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminAuditPage() {
  const router = useRouter();
  const { collapsed } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [logType, setLogType] = useState('all'); // 'all', 'audit', 'security'
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
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalAudit: 0,
    totalSecurity: 0
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [logType, filters, pagination.page]);

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

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      if (logType === 'security' || logType === 'all') {
        const securityRes = await fetch(`/api/admin/security-logs?limit=${pagination.limit}&offset=${(pagination.page-1)*pagination.limit}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const securityData = await securityRes.json();
        if (securityData.success) {
          setSecurityLogs(securityData.data?.logs || []);
          setPagination(prev => ({ ...prev, totalSecurity: securityData.data?.total || 0 }));
        }
      }
      
      if (logType === 'audit' || logType === 'all') {
        const auditRes = await fetch(`/api/admin/audit-logs?limit=${pagination.limit}&offset=${(pagination.page-1)*pagination.limit}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const auditData = await auditRes.json();
        if (auditData.success) {
          setAuditLogs(auditData.data?.logs || []);
          setPagination(prev => ({ ...prev, totalAudit: auditData.data?.total || 0 }));
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
        type: logType,
        format,
        ...(filters.action && { action: filters.action }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });
      
      const res = await fetch(`/api/admin/audit/export?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.headers.get('Content-Disposition')?.split('filename=')[1] || `logs_${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Logs exported successfully');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export logs');
    } finally {
      setExporting(false);
    }
  };

  const getActionBadge = (action, success = true) => {
    const isSuccess = success !== false;
    
    const badges = {
      'LOGIN_SUCCESS': { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
      'LOGIN_ATTEMPT': { icon: Activity, color: 'text-warning', bg: 'bg-warning/10' },
      'LOGIN_FAILED': { icon: XCircle, color: 'text-error', bg: 'bg-error/10' },
      'USER_REGISTERED': { icon: User, color: 'text-primary', bg: 'bg-primary/10' },
      'EMAIL_VERIFIED': { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
      'ROLE_APPLICATION_SUBMITTED': { icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
      'ROLE_APPLICATION_APPROVED': { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
      'ROLE_APPLICATION_REJECTED': { icon: XCircle, color: 'text-error', bg: 'bg-error/10' },
      'PERMISSION_GRANTED': { icon: Shield, color: 'text-success', bg: 'bg-success/10' },
      'PERMISSION_REVOKED': { icon: Shield, color: 'text-warning', bg: 'bg-warning/10' },
      'SESSION_EXPIRED_INACTIVITY': { icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
      'SESSION_REVOKED': { icon: Trash2, color: 'text-error', bg: 'bg-error/10' },
      'PASSWORD_RESET_REQUEST': { icon: RefreshCw, color: 'text-primary', bg: 'bg-primary/10' },
      'PASSWORD_RESET_COMPLETE': { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' }
    };
    
    const badge = badges[action] || { icon: Activity, color: 'text-muted', bg: 'bg-muted/10' };
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.color}`}>
        <Icon className="h-3 w-3" />
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getTotalLogs = () => {
    if (logType === 'audit') return pagination.totalAudit;
    if (logType === 'security') return pagination.totalSecurity;
    return pagination.totalAudit + pagination.totalSecurity;
  };

  const displayedLogs = logType === 'audit' ? auditLogs : logType === 'security' ? securityLogs : [...auditLogs, ...securityLogs];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        {/* Main content with dynamic margin based on sidebar state */}
        <main className={`flex-1 p-8 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Audit & Security Logs</h1>
                <p className="text-muted mt-2">
                  Monitor system activity and security events
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={fetchLogs}
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Total Audit Logs</p>
                  <p className="text-2xl font-bold text-foreground">{pagination.totalAudit}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Total Security Logs</p>
                  <p className="text-2xl font-bold text-foreground">{pagination.totalSecurity}</p>
                </div>
                <Shield className="h-8 w-8 text-success" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Total Events</p>
                  <p className="text-2xl font-bold text-foreground">{getTotalLogs()}</p>
                </div>
                <Activity className="h-8 w-8 text-warning" />
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Filters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Log Type</label>
                <select
                  value={logType}
                  onChange={(e) => setLogType(e.target.value)}
                  className="input-field"
                >
                  <option value="all">All Logs</option>
                  <option value="audit">Audit Logs Only</option>
                  <option value="security">Security Logs Only</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Action</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  className="input-field"
                >
                  <option value="">All Actions</option>
                  {availableFilters.actions?.audit?.map(action => (
                    <option key={action.action} value={action.action}>{action.action.replace(/_/g, ' ')} ({action._count})</option>
                  ))}
                  {availableFilters.actions?.security?.map(action => (
                    <option key={action.action} value={action.action}>{action.action.replace(/_/g, ' ')} ({action._count})</option>
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
                  {availableFilters.users?.map(user => (
                    <option key={user.id} value={user.id}>{user.email}</option>
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
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Details</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">IP Address</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
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
                      <tr key={log.id} className="hover:bg-muted/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                          {formatTimestamp(log.timestamp || log.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">
                            {log.user?.firstName} {log.user?.lastName}
                          </div>
                          <div className="text-xs text-muted">{log.user?.email || 'System'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getActionBadge(log.action, log.success)}
                        </td>
                        <td className="px-6 py-4">
                          <details className="text-sm text-muted">
                            <summary className="cursor-pointer hover:text-primary">View Details</summary>
                            <pre className="mt-2 p-2 bg-muted/5 rounded text-xs overflow-auto max-w-md">
                              {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                          {log.ipAddress || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.success !== undefined ? (
                            log.success ? (
                              <span className="inline-flex items-center gap-1 text-xs text-success">
                                <CheckCircle className="h-3 w-3" />
                                Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-error">
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
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, getTotalLogs())} of {getTotalLogs()} logs
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
                    disabled={pagination.page * pagination.limit >= getTotalLogs()}
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
    </div>
  );
}