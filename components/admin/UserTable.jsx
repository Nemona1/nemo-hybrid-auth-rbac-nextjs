'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Clock, UserCheck, UserX, Eye } from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function UserTable({ users, onRoleUpdate, onApplicationReview }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [reviewReason, setReviewReason] = useState('');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">Approved</span>;
      case 'PENDING':
        return <span className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">Pending</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">{status}</span>;
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-900">{user.role?.name || 'No Role'}</span>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(user.applicationStatus)}
                </td>
                <td className="px-6 py-4">
                  {user.roleApplication && user.roleApplication.status === 'PENDING' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-yellow-600">Requested: {user.roleApplication.requestedRole?.name}</span>
                      <TooltipWrapper content="Review Application">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowReviewModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </TooltipWrapper>
                    </div>
                  )}
                  {user.roleApplication && user.roleApplication.status !== 'PENDING' && (
                    <span className="text-sm text-gray-500">
                      {user.roleApplication.status}: {user.roleApplication.requestedRole?.name}
                    </span>
                  )}
                  {!user.roleApplication && (
                    <span className="text-sm text-gray-400">No application</span>
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
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        <UserCheck className="h-4 w-4" />
                      </button>
                    </TooltipWrapper>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Change Role for {selectedUser.firstName}</h3>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="input-field mb-4"
            >
              <option value="">Select Role</option>
              {users.find(u => u.id === selectedUser.id)?.roleApplication?.requestedRole && (
                <option value={users.find(u => u.id === selectedUser.id).roleApplication.requestedRole.id}>
                  {users.find(u => u.id === selectedUser.id).roleApplication.requestedRole.name} (Requested)
                </option>
              )}
            </select>
            <div className="flex gap-2 justify-end">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Review Application</h3>
            <p className="text-sm text-gray-600 mb-2">
              User: {selectedUser.firstName} {selectedUser.lastName}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Requested Role: {selectedUser.roleApplication?.requestedRole?.name}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Justification: {selectedUser.roleApplication?.justification || 'None provided'}
            </p>
            <textarea
              placeholder="Review reason (optional)"
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
              className="input-field mb-4"
              rows="3"
            />
            <div className="flex gap-2 justify-end">
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
    </Card>
  );
}