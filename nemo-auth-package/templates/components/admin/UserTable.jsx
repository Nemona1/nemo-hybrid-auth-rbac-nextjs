'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Clock, UserCheck, UserX, Eye, History, Mail, Shield, Calendar, AlertCircle } from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function UserTable({ users, onRoleUpdate, onApplicationReview }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedRejections, setSelectedRejections] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [reviewReason, setReviewReason] = useState('');
  const [loadingRejections, setLoadingRejections] = useState(false);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-success bg-success/10 rounded-full">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-warning bg-warning/10 rounded-full">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-error bg-error/10 rounded-full">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-medium text-muted bg-muted/10 rounded-full">
            {status}
          </span>
        );
    }
  };

  const fetchRejectionHistory = async (userId) => {
    setLoadingRejections(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/admin/users/${userId}/rejections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedRejections(data);
        setShowRejectionModal(true);
      } else {
        toast.error('Failed to load rejection history');
      }
    } catch (error) {
      console.error('Failed to fetch rejections:', error);
      toast.error('Failed to load rejection history');
    } finally {
      setLoadingRejections(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Application</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/5 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-sm">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-muted">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                      <Shield className="h-3 w-3" />
                      {user.role?.name || 'No Role'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(user.applicationStatus)}
                  </td>
                  <td className="px-6 py-4">
                    {user.roleApplication && user.roleApplication.status === 'PENDING' && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-warning">Requested: {user.roleApplication.requestedRole?.name}</span>
                        <TooltipWrapper content="Review Application">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowReviewModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </TooltipWrapper>
                      </div>
                    )}
                    {user.roleApplication && user.roleApplication.status !== 'PENDING' && (
                      <span className="text-sm text-muted">
                        {user.roleApplication.status}: {user.roleApplication.requestedRole?.name}
                      </span>
                    )}
                    {!user.roleApplication && (
                      <span className="text-sm text-muted/50">No application</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <TooltipWrapper content="Change Role">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setSelectedRole(user.roleId || '');
                            setShowRoleModal(true);
                          }}
                          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          <UserCheck className="h-4 w-4" />
                        </button>
                      </TooltipWrapper>
                      <TooltipWrapper content="View Rejection History">
                        <button
                          onClick={() => fetchRejectionHistory(user.id)}
                          className="p-1.5 rounded-lg bg-muted/10 text-muted hover:bg-muted/20 transition-colors"
                        >
                          <History className="h-4 w-4" />
                        </button>
                      </TooltipWrapper>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-border">
            <h3 className="text-xl font-semibold text-foreground mb-2">Change Role</h3>
            <p className="text-muted text-sm mb-4">
              Update role for <span className="font-medium text-foreground">{selectedUser.firstName} {selectedUser.lastName}</span>
            </p>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="input-field mb-6"
            >
              <option value="">Select Role</option>
              {users.find(u => u.id === selectedUser.id)?.roleApplication?.requestedRole && (
                <option value={users.find(u => u.id === selectedUser.id).roleApplication.requestedRole.id}>
                  {users.find(u => u.id === selectedUser.id).roleApplication.requestedRole.name} (Requested)
                </option>
              )}
            </select>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowRoleModal(false)}>Cancel</Button>
              <Button onClick={() => {
                onRoleUpdate(selectedUser.id, selectedRole);
                setShowRoleModal(false);
              }}>Update Role</Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Review Application Modal */}
      {showReviewModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-border">
            <h3 className="text-xl font-semibold text-foreground mb-2">Review Application</h3>
            <div className="space-y-3 mb-4">
              <div className="bg-muted/5 rounded-lg p-3">
                <p className="text-sm text-muted">User</p>
                <p className="font-medium text-foreground">{selectedUser.firstName} {selectedUser.lastName}</p>
              </div>
              <div className="bg-muted/5 rounded-lg p-3">
                <p className="text-sm text-muted">Requested Role</p>
                <p className="font-medium text-primary">{selectedUser.roleApplication?.requestedRole?.name}</p>
              </div>
              <div className="bg-muted/5 rounded-lg p-3">
                <p className="text-sm text-muted">Justification</p>
                <p className="text-sm text-foreground">{selectedUser.roleApplication?.justification || 'None provided'}</p>
              </div>
            </div>
            <textarea
              placeholder="Review reason (optional)"
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              className="input-field mb-6"
              rows="3"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="danger" onClick={() => {
                onApplicationReview(selectedUser.roleApplication.id, selectedUser.id, 'REJECTED', reviewReason);
                setShowReviewModal(false);
                setReviewReason('');
              }}>Reject</Button>
              <Button onClick={() => {
                onApplicationReview(selectedUser.roleApplication.id, selectedUser.id, 'APPROVED', reviewReason);
                setShowReviewModal(false);
                setReviewReason('');
              }}>Approve</Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection History Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-auto border border-border">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-error" />
              <h3 className="text-xl font-semibold text-foreground">Rejection History</h3>
            </div>
            {loadingRejections ? (
              <div className="flex justify-center py-8">
                <div className="spinner"></div>
              </div>
            ) : selectedRejections.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-2" />
                <p className="text-muted">No rejection history</p>
                <p className="text-sm text-muted/70 mt-1">This user has no previous rejections</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedRejections.map((rejection, idx) => (
                  <div key={rejection.id} className="border-l-4 border-error/50 bg-muted/5 rounded-r-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted">Attempt #{idx + 1}</span>
                      <span className="text-xs text-muted">{new Date(rejection.rejectedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{rejection.requestedRole?.name}</p>
                    {rejection.reason && (
                      <div className="mt-2 p-2 bg-error/5 rounded text-sm text-error">
                        <strong>Reason:</strong> {rejection.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowRejectionModal(false)}
              className="mt-6 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}